/**
 * Background worker: drains availability_jobs, deep-scans each title with a
 * real browser, and writes the final verdict (any provider plays = available).
 * Started detached by availability.php; exits when the queue is empty.
 */
const { deepScan } = require('./scan-core')

// Node has no mysql client installed — talk to PHP for DB access.
const { execFileSync } = require('child_process')
const path = require('path')
const PHP = 'C:\\xampp\\php\\php.exe'
const CONFIG = path.join(__dirname, '..', 'config.php').replace(/\\/g, '/')
const SERVER_DIR = path.dirname(CONFIG)

function phpEval(code) {
  return execFileSync(PHP, ['-r', code], { encoding: 'utf8', timeout: 60000 })
}

function nextJob() {
  const out = phpEval(
    `require '${CONFIG}'; $pdo = db(); ` +
    `$st = $pdo->query('SELECT * FROM availability_jobs ORDER BY queued_at LIMIT 1'); ` +
    `$j = $st->fetch(); echo $j ? json_encode($j) : '';`,
  )
  return out.trim() ? JSON.parse(out) : null
}

function finishJob(job, available) {
  phpEval(
    `require '${CONFIG}'; $pdo = db(); ` +
    `$pdo->prepare('INSERT INTO availability (tmdb_id, type, available, deep_done, checked_at) VALUES (?, ?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE available = VALUES(available), deep_done = 1, checked_at = NOW()')` +
    `->execute([${job.tmdb_id}, '${job.type}', ${available ? 1 : 0}]); ` +
    `$pdo->prepare('DELETE FROM availability_jobs WHERE tmdb_id = ? AND type = ?')->execute([${job.tmdb_id}, '${job.type}']); `,
  )
}

;(async () => {
  for (let cycle = 0; cycle < 200; cycle++) {
    const job = nextJob()
    if (!job) break
    let verdicts = { vidlink: null, vidsrc: null, multiembed: null }
    try {
      verdicts = await deepScan(job.tmdb_id, job.type, job.season, job.episode)
    } catch (e) {
      // provider-side trouble; leave pending so it can retry later
      await new Promise((r) => setTimeout(r, 5000))
      continue
    }
    const known = Object.values(verdicts).filter((v) => v !== null)
    const allNo = known.length > 0 && known.every((v) => v === false)
    // Any provider plays -> available. Every answering provider says missing
    // -> dead. All unknown (challenges/downtime) -> fail open, stay visible.
    finishJob(job, !allNo)
  }
})()
