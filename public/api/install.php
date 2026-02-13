<?php
header('Content-Type: text/plain; charset=utf-8');

$config = require __DIR__ . '/config.php';
$cfg = $config['db'];
$dsn = "pgsql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']}";

try {
  $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);

  $sql = file_get_contents(__DIR__ . '/schema.sql');
  if (!$sql) throw new Exception('schema.sql not found');

  $pdo->exec($sql);
  echo "OK: schema installed\n";
  echo "Please delete /api/install.php now.\n";
} catch (Exception $e) {
  http_response_code(500);
  echo "ERROR: " . $e->getMessage() . "\n";
}
