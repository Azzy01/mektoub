<?php
header('Content-Type: application/json; charset=utf-8');

$config = require __DIR__ . '/config.php';

function json_input() {
  $raw = file_get_contents('php://input');
  return $raw ? json_decode($raw, true) : [];
}

function respond($data, $code = 200) {
  http_response_code($code);
  echo json_encode($data);
  exit;
}

function db() {
  static $pdo = null;
  if ($pdo) return $pdo;
  $cfg = $GLOBALS['config']['db'];
  $dsn = "pgsql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']}";
  $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);
  return $pdo;
}

function token_valid($token) {
  if (!$token) return false;
  $pdo = db();
  $stmt = $pdo->prepare("SELECT token FROM auth_tokens WHERE token = :t LIMIT 1");
  $stmt->execute([':t' => $token]);
  $row = $stmt->fetch(PDO::FETCH_ASSOC);
  if ($row) {
    $pdo->prepare("UPDATE auth_tokens SET last_used_at = NOW() WHERE token = :t")->execute([':t' => $token]);
    return true;
  }
  return false;
}

$path = $_SERVER['REQUEST_URI'];
$base = '/api';
if (str_starts_with($path, $base)) {
  $path = substr($path, strlen($base));
}
$path = strtok($path, '?') ?: '/';

if ($path === '/auth') {
  $in = json_input();
  $login = $in['login'] ?? '';
  $pass = $in['password'] ?? '';
  if ($login !== $config['auth']['login'] || $pass !== $config['auth']['password']) {
    respond(['ok' => false, 'error' => 'invalid_credentials'], 401);
  }
  $token = bin2hex(random_bytes(16));
  $pdo = db();
  $pdo->prepare("INSERT INTO auth_tokens (token, created_at, last_used_at) VALUES (:t, NOW(), NOW())")
      ->execute([':t' => $token]);
  respond(['ok' => true, 'token' => $token]);
}

if ($path === '/sync') {
  $token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  $token = str_replace('Bearer ', '', $token);
  if (!token_valid($token)) respond(['ok' => false, 'error' => 'unauthorized'], 401);

  $in = json_input();
  $payload = $in['data'] ?? [];
  $pdo = db();

  $tables = [
    'notes',
    'list_items',
    'files',
    'notebooks',
    'project_nodes',
    'blog_categories',
    'blog_posts',
    'blog_files',
  ];

  foreach ($tables as $table) {
    $rows = $payload[$table] ?? [];
    if (!is_array($rows) || count($rows) === 0) continue;
    foreach ($rows as $r) {
      $cols = array_keys($r);
      $place = array_map(fn($c) => ':' . $c, $cols);
      $updates = array_map(fn($c) => "$c = EXCLUDED.$c", $cols);
      $sql = "INSERT INTO {$table} (" . implode(',', $cols) . ") VALUES (" . implode(',', $place) . ")
              ON CONFLICT (id) DO UPDATE SET " . implode(',', $updates);
      $stmt = $pdo->prepare($sql);
      foreach ($r as $k => $v) {
        $stmt->bindValue(':' . $k, $v);
      }
      $stmt->execute();
    }
  }

  // return full snapshot
  $out = [];
  foreach ($tables as $table) {
    $stmt = $pdo->query("SELECT * FROM {$table}");
    $out[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
  }
  respond(['ok' => true, 'data' => $out]);
}

respond(['ok' => false, 'error' => 'not_found'], 404);
