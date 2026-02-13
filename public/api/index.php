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

function table_has_column($table, $column) {
  static $cache = [];
  $key = $table . '.' . $column;
  if (array_key_exists($key, $cache)) return $cache[$key];
  $pdo = db();
  $stmt = $pdo->prepare("
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = :table AND column_name = :column
    LIMIT 1
  ");
  $stmt->execute([
    ':table' => $table,
    ':column' => $column,
  ]);
  $cache[$key] = (bool)$stmt->fetchColumn();
  return $cache[$key];
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
    'deleted_rows',
  ];

  try {
    foreach ($tables as $table) {
      $rows = $payload[$table] ?? [];
      if (!is_array($rows) || count($rows) === 0) continue;
      $hasUpdatedAt = table_has_column($table, 'updated_at');

      foreach ($rows as $r) {
        if (!is_array($r)) continue;
        if (!$authorized) {
          if ($table === 'notes' && ((int)($r['is_private'] ?? 0) === 1)) continue;
          if ($table === 'blog_posts' && ((string)($r['status'] ?? '') === 'draft')) continue;
        }
        $cols = array_keys($r);
        if (!in_array('id', $cols, true)) continue;

        $incomingUpdated = 0;
        if ($hasUpdatedAt && isset($r['updated_at'])) {
          $incomingUpdated = strtotime((string)$r['updated_at']) ?: 0;
        }

        // Prefer newer updates (prevents stale clients overwriting newer server data)
        $sqlCheck = $hasUpdatedAt
          ? "SELECT id, updated_at FROM {$table} WHERE id = :id"
          : "SELECT id FROM {$table} WHERE id = :id";
        $stmtCheck = $pdo->prepare($sqlCheck);
        $stmtCheck->execute([':id' => $r['id']]);
        $existing = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if ($existing) {
          $existingUpdated = 0;
          if ($hasUpdatedAt && !empty($existing['updated_at'])) {
            $existingUpdated = strtotime((string)$existing['updated_at']) ?: 0;
          }
          if ($incomingUpdated && $existingUpdated && $existingUpdated >= $incomingUpdated) {
            continue;
          }

          $updates = array_values(array_filter(
            $cols,
            fn($c) => $c !== 'id' && ($hasUpdatedAt || $c !== 'updated_at')
          ));
          if (in_array('updated_at', $updates, true)) {
            $updates = array_values(array_filter($updates, fn($c) => $c !== 'updated_at'));
          }

          $setParts = [];
          $params = [':id' => $r['id']];
          foreach ($updates as $c) {
            $setParts[] = "{$c} = :set_{$c}";
            $params[':set_' . $c] = $r[$c] ?? null;
          }
          if ($hasUpdatedAt) {
            $setParts[] = "updated_at = NOW()";
          }
          if (count($setParts) > 0) {
            $sqlUp = "UPDATE {$table} SET " . implode(',', $setParts) . " WHERE id = :id";
            $stmtUp = $pdo->prepare($sqlUp);
            $stmtUp->execute($params);
          }
          continue;
        }

        if ($table === 'blog_categories' && in_array('name', $cols, true)) {
          $sqlByName = $hasUpdatedAt
            ? "SELECT id, updated_at FROM blog_categories WHERE name = :name LIMIT 1"
            : "SELECT id FROM blog_categories WHERE name = :name LIMIT 1";
          $stmtByName = $pdo->prepare($sqlByName);
          $stmtByName->execute([':name' => $r['name']]);
          $existingByName = $stmtByName->fetch(PDO::FETCH_ASSOC);
          if ($existingByName) {
            $existingUpdated = 0;
            if ($hasUpdatedAt && !empty($existingByName['updated_at'])) {
              $existingUpdated = strtotime((string)$existingByName['updated_at']) ?: 0;
            }
            if ($incomingUpdated && $existingUpdated && $existingUpdated >= $incomingUpdated) {
              continue;
            }

            $updates = array_values(array_filter(
              $cols,
              fn($c) => $c !== 'id' && ($hasUpdatedAt || $c !== 'updated_at')
            ));
            if (in_array('updated_at', $updates, true)) {
              $updates = array_values(array_filter($updates, fn($c) => $c !== 'updated_at'));
            }

            $setParts = [];
            $params = [':where_name' => $r['name']];
            foreach ($updates as $c) {
              $setParts[] = "{$c} = :set_{$c}";
              $params[':set_' . $c] = $r[$c] ?? null;
            }
            if ($hasUpdatedAt) {
              $setParts[] = "updated_at = NOW()";
            }
            if (count($setParts) > 0) {
              $sqlUp = "UPDATE {$table} SET " . implode(',', $setParts) . " WHERE name = :where_name";
              $stmtUp = $pdo->prepare($sqlUp);
              $stmtUp->execute($params);
            }
            continue;
          }
        }

        // INSERT if not existing
        $colsForInsert = array_values(array_filter(
          $cols,
          fn($c) => $hasUpdatedAt || $c !== 'updated_at'
        ));
        $place = [];
        $params = [];
        foreach ($colsForInsert as $c) {
          if ($hasUpdatedAt && $c === 'updated_at') {
            $place[] = 'NOW()';
            continue;
          }
          $ph = ':ins_' . $c;
          $place[] = $ph;
          $params[$ph] = $r[$c] ?? null;
        }
        if ($hasUpdatedAt && !in_array('updated_at', $colsForInsert, true)) {
          $colsForInsert[] = 'updated_at';
          $place[] = 'NOW()';
        }
        if (count($colsForInsert) === 0) continue;
        $sqlIn = "INSERT INTO {$table} (" . implode(',', $colsForInsert) . ") VALUES (" . implode(',', $place) . ")";
        $stmtIn = $pdo->prepare($sqlIn);
        $stmtIn->execute($params);
      }
    }
  } catch (Exception $e) {
    respond(['ok' => false, 'error' => $e->getMessage()], 500);
  }

  // Apply tombstones globally (idempotent) so deleted rows stay deleted across devices.
  $deletableTables = [
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
    $tombRows = $pdo->query("SELECT table_name, row_id FROM deleted_rows")->fetchAll(PDO::FETCH_ASSOC);
    foreach ($tombRows as $tr) {
      $target = (string)($tr['table_name'] ?? '');
      $rowId = (string)($tr['row_id'] ?? '');
      if (!$rowId || !in_array($target, $deletableTables, true)) continue;
      $stmtDel = $pdo->prepare("DELETE FROM {$target} WHERE id = :id");
      $stmtDel->execute([':id' => $rowId]);
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
