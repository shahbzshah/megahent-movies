/**
 * CLI: node scan-deep.js <tmdbId> <movie|tv> [season episode]
 * Prints { vidlink, vidsrc, multiembed } verdicts as JSON.
 */
const { deepScan } = require('./scan-core')

;(async () => {
  const [, , idArg, typeArg, sArg, eArg] = process.argv
  const id = parseInt(idArg, 10)
  if (!id) {
    console.error('usage: node scan-deep.js <tmdbId> <movie|tv> [season episode]')
    process.exit(1)
  }
  console.log(JSON.stringify(await deepScan(id, typeArg === 'tv' ? 'tv' : 'movie', parseInt(sArg || '1', 10) || 1, parseInt(eArg || '1', 10) || 1)))
})()
