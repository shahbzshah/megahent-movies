<?php
/**
 * Public endpoint — curated content rows managed in the admin panel.
 * Items reference TMDB ids; the webapp resolves them to full cards.
 */
require_once __DIR__ . '/../config.php';

$collections = db()
  ->query('SELECT id, title FROM collections ORDER BY sort_order ASC, id ASC')
  ->fetchAll();

$itemsStmt = db()->prepare(
  'SELECT tmdb_id, media_type FROM collection_items WHERE collection_id = ? ORDER BY sort_order ASC, id ASC'
);

$out = [];
foreach ($collections as $c) {
  $itemsStmt->execute([$c['id']]);
  $out[] = [
    'id'    => (int)$c['id'],
    'title' => $c['title'],
    'items' => array_map(
      fn($i) => ['tmdbId' => (int)$i['tmdb_id'], 'type' => $i['media_type']],
      $itemsStmt->fetchAll()
    ),
  ];
}

json_out(['collections' => $out]);