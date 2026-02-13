<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

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
  $authorized = token_valid($token);

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

  try {
    foreach ($tables as $table) {
      $rows = $payload[$table] ?? [];
      if (!is_array($rows) || count($rows) === 0) continue;
      foreach ($rows as $r) {
        if (!$authorized) {
          if ($table === 'notes' && ((int)($r['is_private'] ?? 0) === 1)) continue;
          if ($table === 'blog_posts' && ((string)($r['status'] ?? '') === 'draft')) continue;
        }
        $cols = array_keys($r);
        if (!in_array('id', $cols)) continue;

        $incomingUpdated = isset($r['updated_at']) ? strtotime($r['updated_at']) : 0;

        // Prefer newer updates (prevents stale clients overwriting newer server data)
        $stmtCheck = $pdo->prepare("SELECT id, updated_at FROM {$table} WHERE id = :id");
        $stmtCheck->execute([':id' => $r['id']]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
          $existingUpdated = $existing['updated_at'] ? strtotime($existing['updated_at']) : 0;
          if ($incomingUpdated && $existingUpdated && $existingUpdated > $incomingUpdated) {
            continue;
          }

          $updates = array_filter($cols, fn($c) => $c !== 'id');
          if (in_array('updated_at', $updates)) {
            $updates = array_filter($updates, fn($c) => $c !== 'updated_at');
          }
          if (count($updates) > 0) {
            $setParts = array_map(fn($c) => "$c = :$c", $updates);
            $setParts[] = "updated_at = NOW()";
            $set = implode(',', $setParts);
            $sqlUp = "UPDATE {$table} SET {$set} WHERE id = :id";
            $stmtUp = $pdo->prepare($sqlUp);
            foreach ($r as $k => $v) {
              if ($k === 'updated_at') continue;
              $stmtUp->bindValue(':' . $k, $v);
            }
            $stmtUp->execute();
          }
          continue;
        }

        if ($table === 'blog_categories' && in_array('name', $cols)) {
          $stmtByName = $pdo->prepare("SELECT id, updated_at FROM blog_categories WHERE name = :name LIMIT 1");
          $stmtByName->execute([':name' => $r['name']]);
          $existingByName = $stmtByName->fetch(PDO::FETCH_ASSOC);
          if ($existingByName) {
            $existingUpdated = $existingByName['updated_at'] ? strtotime($existingByName['updated_at']) : 0;
            if ($incomingUpdated && $existingUpdated && $existingUpdated > $incomingUpdated) {
              continue;
            }
            $updates = array_filter($cols, fn($c) => $c !== 'id');
            if (in_array('updated_at', $updates)) {
              $updates = array_filter($updates, fn($c) => $c !== 'updated_at');
            }
            if (count($updates) > 0) {
              $setParts = array_map(fn($c) => "$c = :$c", $updates);
              $setParts[] = "updated_at = NOW()";
              $set = implode(',', $setParts);
              $sqlUp = "UPDATE {$table} SET {$set} WHERE name = :name";
              $stmtUp = $pdo->prepare($sqlUp);
              foreach ($r as $k => $v) {
                if ($k === 'id' || $k === 'updated_at') continue;
                $stmtUp->bindValue(':' . $k, $v);
              }
              $stmtUp->execute();
            }
            continue;
          }
        }

        // INSERT if not existing
        $colsForInsert = $cols;
        $place = array_map(fn($c) => ':' . $c, $colsForInsert);
        if (in_array('updated_at', $colsForInsert)) {
          $idx = array_search('updated_at', $colsForInsert);
          array_splice($colsForInsert, $idx, 1);
          array_splice($place, $idx, 1);
          $colsForInsert[] = 'updated_at';
          $place[] = 'NOW()';
        }
        $sqlIn = "INSERT INTO {$table} (" . implode(',', $colsForInsert) . ") VALUES (" . implode(',', $place) . ")";
        $stmtIn = $pdo->prepare($sqlIn);
        foreach ($r as $k => $v) {
          if ($k === 'updated_at') continue;
          $stmtIn->bindValue(':' . $k, $v);
        }
        $stmtIn->execute();
      }
    }
  } catch (Exception $e) {
    respond(['ok' => false, 'error' => $e->getMessage()], 500);
  }

  // return full snapshot
  $out = [];
  foreach ($tables as $table) {
    if ($authorized) {
      $stmt = $pdo->query("SELECT * FROM {$table}");
      $out[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } else {
      if ($table === 'notes') {
        $stmt = $pdo->query("SELECT * FROM notes WHERE is_private = 0");
        $out[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } elseif ($table === 'blog_posts') {
        $stmt = $pdo->query("SELECT * FROM blog_posts WHERE status = 'published'");
        $out[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
      } else {
        $stmt = $pdo->query("SELECT * FROM {$table}");
        $out[$table] = $stmt->fetchAll(PDO::FETCH_ASSOC);
      }
    }
  }
  respond(['ok' => true, 'data' => $out]);
}

respond(['ok' => false, 'error' => 'not_found'], 404);
