<?php
/**
 * Render health check: answers 200 only when the database answers.
 * The old healthCheckPath (/) said "healthy" with a dead database.
 * No auth: it reveals nothing but up/down.
 */
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
try {
  db()->query('SELECT 1');
  echo json_encode(['ok' => true, 'db' => 'up']);
} catch (Throwable $e) {
  http_response_code(503);
  echo json_encode(['ok' => false, 'db' => 'down']);
}
