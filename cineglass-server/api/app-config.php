<?php
/**
 * Public endpoint — read by the Vercel webapp AND the desktop shell.
 * Returns site status (kill-switch), offline message, active announcement,
 * and the remote shell config. No auth: it contains nothing sensitive.
 */
require_once __DIR__ . '/../config.php';

$settings = [];
foreach (db()->query('SELECT skey, svalue FROM settings') as $row) {
  $settings[$row['skey']] = $row['svalue'];
}

$ann = db()
  ->query('SELECT id, message, icon FROM announcements WHERE enabled = 1 ORDER BY id DESC LIMIT 1')
  ->fetch();

json_out([
  'status'         => ($settings['site_status'] ?? 'online') === 'offline' ? 'offline' : 'online',
  'offlineMessage' => $settings['offline_message'] ?? 'MegahEnt is temporarily unavailable. Please check back soon.',
  'announcement'   => $ann ?: null,
  'scannerToasts'  => ($settings['scanner_toasts'] ?? '0') === '1',
  'liveTv'         => ($settings['livetv_enabled'] ?? '1') === '1',
  'shellConfig'    => json_decode($settings['shell_config'] ?? '{}', true) ?: new stdClass(),
]);