<?php
/**
 * REST API Backend — Sistem Surat Tugas BKI Pontianak
 * Hostinger MySQL Database Bridge
 * 
 * Endpoint tunggal: api.php?action=<action>
 * 
 * Actions:
 *   GET  ?action=ping              → Test koneksi
 *   GET  ?action=getAllData         → Ambil semua data tabel
 *   POST ?action=saveItem          → Simpan/update satu item
 *   POST ?action=deleteItem        → Hapus satu item
 *   POST ?action=syncAll           → Sinkronisasi bulk data
 */

require_once __DIR__ . '/config.php';

// ── CORS Headers ─────────────────────────────────────────────────────────
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
if (ALLOWED_ORIGINS === '*') {
    header('Access-Control-Allow-Origin: *');
} else {
    $allowed = array_map('trim', explode(',', ALLOWED_ORIGINS));
    if (in_array($origin, $allowed)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } elseif (
        preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/', $origin) ||
        preg_match('/^https?:\/\/([a-z0-9-]+\.)?pkadminclass\.com$/', $origin)
    ) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Token');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── API Token Authentication ─────────────────────────────────────────────
// Semua request (kecuali 'ping') WAJIB menyertakan token autentikasi
function verifyApiToken() {
    $action = isset($_GET['action']) ? $_GET['action'] : '';
    
    // Ping diperbolehkan tanpa token (untuk health check koneksi)
    if ($action === 'ping') return;
    
    // Ambil token dari berbagai kemungkinan header & parameter
    $token = '';
    if (!empty($_SERVER['HTTP_X_API_TOKEN'])) {
        $token = $_SERVER['HTTP_X_API_TOKEN'];
    } elseif (!empty($_SERVER['REDIRECT_HTTP_X_API_TOKEN'])) {
        $token = $_SERVER['REDIRECT_HTTP_X_API_TOKEN'];
    } elseif (!empty($_SERVER['HTTP_AUTHORIZATION'])) {
        $token = str_replace('Bearer ', '', $_SERVER['HTTP_AUTHORIZATION']);
    } elseif (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $token = str_replace('Bearer ', '', $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            $lower = strtolower($k);
            if ($lower === 'x-api-token') {
                $token = $v;
                break;
            } elseif ($lower === 'authorization') {
                $token = str_replace('Bearer ', '', $v);
                break;
            }
        }
    }
    
    if (empty($token) && !empty($_GET['token'])) {
        $token = $_GET['token'];
    }
    if (empty($token) && !empty($_POST['token'])) {
        $token = $_POST['token'];
    }
    if (empty($token)) {
        $raw = file_get_contents('php://input');
        if ($raw) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed) && !empty($parsed['token'])) {
                $token = $parsed['token'];
            }
        }
    }

    $token = trim((string)$token);

    // Daftar token yang diakui sah (mendukung backward & forward compatibility)
    $validTokens = [
        'bki_secret_token_2026_pontianak_secure',
        'bki-pontianak-2026-secret-token'
    ];
    if (defined('API_TOKEN') && API_TOKEN !== '') {
        $validTokens[] = API_TOKEN;
    }

    // Validasi token
    if (!in_array($token, $validTokens, true)) {
        // PENTING: Gunakan status 403 Forbidden (bukan 401).
        // LiteSpeed / CDN Hostinger mengonversi status 401 tanpa WWW-Authenticate menjadi halaman error 408 Request Time-out!
        http_response_code(403);
        echo json_encode([
            'success'      => false,
            'unauthorized' => true,
            'message'      => 'Akses ditolak: API Token tidak valid atau tidak ditemukan. Sertakan header X-API-Token.'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}
verifyApiToken();


// ── Database Connection ──────────────────────────────────────────────────
function getDb() {
    static $pdo = null;
    if ($pdo === null) {
        $host    = defined('DB_HOST') ? DB_HOST : 'localhost';
        $dbname  = defined('DB_NAME') ? DB_NAME : '';
        $user    = defined('DB_USER') ? DB_USER : '';
        $pass    = defined('DB_PASS') ? DB_PASS : '';
        $charset = defined('DB_CHARSET') ? DB_CHARSET : 'utf8mb4';

        $pdo = new PDO(
            "mysql:host={$host};dbname={$dbname};charset={$charset}",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::ATTR_TIMEOUT            => 5
            ]
        );
    }
    return $pdo;
}

// ── Valid Tables ─────────────────────────────────────────────────────────
$VALID_TABLES = [
    'users', 'surat_tugas', 'kwitansi_honor', 'laporan_survei',
    'tariffs', 'grade_tariffs', 'master_kapal', 'admin_settings', 'visit_survei'
];

// ── Helper: JSON Response ────────────────────────────────────────────────
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

// ── Helper: Read Request Body ────────────────────────────────────────────
function getRequestBody() {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ── Helper: Read All Rows from Table ─────────────────────────────────────
function readTable($tableName) {
    global $VALID_TABLES;
    if (!in_array($tableName, $VALID_TABLES)) return [];

    $pdo = getDb();
    $stmt = $pdo->query("SELECT `id`, `raw_data`, `created_at`, `updated_at` FROM `{$tableName}` ORDER BY `created_at` ASC");
    $rows = $stmt->fetchAll();

    $result = [];
    foreach ($rows as $row) {
        $item = ['id' => $row['id'], 'created_at' => $row['created_at'], 'updated_at' => $row['updated_at']];
        if ($row['raw_data']) {
            $rawDecoded = json_decode($row['raw_data'], true);
            if (is_array($rawDecoded)) {
                $item = array_merge($item, $rawDecoded);
                $item['raw_data'] = $rawDecoded;
            } else {
                $item['raw_data'] = $row['raw_data'];
            }
        }
        $result[] = $item;
    }
    return $result;
}

// ── Helper: Upsert Item ──────────────────────────────────────────────────
function upsertItem($tableName, $item) {
    global $VALID_TABLES;
    if (!in_array($tableName, $VALID_TABLES)) {
        return ['success' => false, 'message' => "Tabel '{$tableName}' tidak valid"];
    }

    $id = isset($item['id']) ? $item['id'] : null;
    if (!$id) {
        return ['success' => false, 'message' => 'ID item tidak ditemukan'];
    }

    $rawData = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    $pdo = getDb();
    $sql = "INSERT INTO `{$tableName}` (`id`, `raw_data`) VALUES (:id, :raw_data) 
            ON DUPLICATE KEY UPDATE `raw_data` = :raw_data2, `updated_at` = CURRENT_TIMESTAMP";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':id'        => $id,
        ':raw_data'  => $rawData,
        ':raw_data2' => $rawData
    ]);

    return ['success' => true, 'id' => $id, 'table' => $tableName];
}

// ── Helper: Delete Item ──────────────────────────────────────────────────
function deleteItem($tableName, $id) {
    global $VALID_TABLES;
    if (!in_array($tableName, $VALID_TABLES)) {
        return ['success' => false, 'message' => "Tabel '{$tableName}' tidak valid"];
    }
    if (!$id) {
        return ['success' => false, 'message' => 'ID item tidak ditemukan'];
    }

    $pdo = getDb();
    $stmt = $pdo->prepare("DELETE FROM `{$tableName}` WHERE `id` = :id");
    $stmt->execute([':id' => $id]);

    return ['success' => true, 'deleted' => $stmt->rowCount(), 'table' => $tableName, 'id' => $id];
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTING
// ══════════════════════════════════════════════════════════════════════════

$action = isset($_GET['action']) ? $_GET['action'] : '';

// Jika POST tanpa action di URL, coba baca dari body
if (!$action && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getRequestBody();
    $action = isset($body['action']) ? $body['action'] : '';
} else if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = getRequestBody();
}

try {
    switch ($action) {

        // ── PING ─────────────────────────────────────────────────────
        case 'ping':
            $pdo = getDb();
            $stmt = $pdo->query("SELECT 1");
            $rootDir = dirname(__DIR__);
            $gitHead = @file_get_contents($rootDir . '/.git/refs/heads/main');
            $rootHtaccess = @file_get_contents($rootDir . '/.htaccess');
            $distHtaccess = @file_get_contents($rootDir . '/dist/.htaccess');
            jsonResponse([
                'success'       => true,
                'message'       => 'Koneksi ke Database MySQL Hostinger aktif!',
                'database'      => DB_NAME,
                'server'        => 'Hostinger MySQL',
                'timestamp'     => date('c'),
                'git_head'      => $gitHead ? trim($gitHead) : 'unknown',
                'root_htaccess_size' => strlen($rootHtaccess ?: ''),
                'dist_htaccess' => trim($distHtaccess ?: ''),
                'dist_index_size' => @filesize($rootDir . '/dist/index.html'),
                'root_index_size' => @filesize($rootDir . '/index.html')
            ]);
            break;

        // ── GET ALL DATA ─────────────────────────────────────────────
        case 'getAllData':
        case 'readAll':
            $allData = [];
            foreach ($VALID_TABLES as $tbl) {
                if ($tbl === 'admin_settings') {
                    $pdo = getDb();
                    $stmt = $pdo->query("SELECT `id`, `raw_data`, `created_at`, `updated_at` FROM `admin_settings` ORDER BY (CASE WHEN `id` = 'default' THEN 0 ELSE 1 END), `updated_at` DESC LIMIT 1");
                    $row = $stmt->fetch();
                    if ($row) {
                        $item = ['id' => $row['id'], 'created_at' => $row['created_at'], 'updated_at' => $row['updated_at']];
                        if ($row['raw_data']) {
                            $rawDecoded = json_decode($row['raw_data'], true);
                            if (is_array($rawDecoded)) $item = array_merge($item, $rawDecoded);
                        }
                        $allData[$tbl] = $item;
                    } else {
                        $allData[$tbl] = null;
                    }
                } else {
                    $allData[$tbl] = readTable($tbl);
                }
            }
            jsonResponse([
                'success'   => true,
                'data'      => $allData,
                'source'    => 'hostinger_mysql',
                'timestamp' => date('c')
            ]);
            break;

        // ── SAVE ITEM ────────────────────────────────────────────────
        case 'saveItem':
            if (!isset($body)) $body = getRequestBody();
            $table = isset($body['table']) ? $body['table'] : '';
            $data  = isset($body['data'])  ? $body['data']  : [];

            if (!$table || !$data) {
                jsonResponse(['success' => false, 'message' => 'Parameter table dan data diperlukan'], 400);
            }

            $result = upsertItem($table, $data);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;

        // ── DELETE ITEM ──────────────────────────────────────────────
        case 'deleteItem':
            if (!isset($body)) $body = getRequestBody();
            $table = isset($body['table']) ? $body['table'] : '';
            $id    = isset($body['id'])    ? $body['id']    : '';

            if (!$table || !$id) {
                jsonResponse(['success' => false, 'message' => 'Parameter table dan id diperlukan'], 400);
            }

            $result = deleteItem($table, $id);
            jsonResponse($result, $result['success'] ? 200 : 400);
            break;

        // ── SYNC ALL (Bulk Import) ───────────────────────────────────
        case 'syncAll':
            if (!isset($body)) $body = getRequestBody();
            $data = isset($body['data']) ? $body['data'] : [];

            if (!$data || !is_array($data)) {
                jsonResponse(['success' => false, 'message' => 'Data untuk sinkronisasi diperlukan'], 400);
            }

            $pdo = getDb();
            $pdo->beginTransaction();

            $syncResults = [];
            $totalSaved  = 0;
            $errors      = [];

            try {
                foreach ($data as $tableName => $items) {
                    if (!in_array($tableName, $VALID_TABLES)) continue;

                    // admin_settings diperlakukan khusus (single object, bukan array)
                    if ($tableName === 'admin_settings') {
                        if (is_array($items)) {
                            $itemWithId = isset($items[0]) && is_array($items[0]) ? $items[0] : $items;
                            if (!isset($itemWithId['id'])) $itemWithId['id'] = 'default';
                            // Bersihkan duplikasi pengaturan lama
                            $pdo->exec("DELETE FROM `admin_settings` WHERE `id` != 'default'");
                            $result = upsertItem($tableName, $itemWithId);
                            if ($result['success']) $totalSaved++;
                            $syncResults[$tableName] = 1;
                        }
                        continue;
                    }

                    if (!is_array($items)) continue;

                    // Hapus data lama sebelum import (full replace)
                    $pdo->exec("DELETE FROM `{$tableName}`");

                    $count = 0;
                    foreach ($items as $item) {
                        if (!$item || !isset($item['id'])) continue;
                        $rawData = json_encode($item, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        $stmt = $pdo->prepare("INSERT INTO `{$tableName}` (`id`, `raw_data`) VALUES (:id, :raw_data)");
                        $stmt->execute([':id' => $item['id'], ':raw_data' => $rawData]);
                        $count++;
                        $totalSaved++;
                    }
                    $syncResults[$tableName] = $count;
                }

                $pdo->commit();

                jsonResponse([
                    'success'      => true,
                    'message'      => "Sinkronisasi berhasil! Total {$totalSaved} record disimpan.",
                    'totalSaved'   => $totalSaved,
                    'tables'       => $syncResults,
                    'source'       => 'hostinger_mysql',
                    'timestamp'    => date('c')
                ]);
            } catch (Exception $e) {
                $pdo->rollBack();
                jsonResponse([
                    'success' => false,
                    'message' => 'Gagal sinkronisasi: ' . $e->getMessage()
                ], 500);
            }
            break;

        // ── READ TABLE (single) ──────────────────────────────────────
        case 'readTable':
            $table = isset($_GET['table']) ? $_GET['table'] : '';
            if (!$table) {
                if (!isset($body)) $body = getRequestBody();
                $table = isset($body['table']) ? $body['table'] : '';
            }

            if (!$table) {
                jsonResponse(['success' => false, 'message' => 'Parameter table diperlukan'], 400);
            }

            $rows = readTable($table);
            jsonResponse([
                'success' => true,
                'table'   => $table,
                'data'    => $rows,
                'count'   => count($rows),
                'timestamp' => date('c')
            ]);
            break;

        // ── TABLE COUNT (stats) ──────────────────────────────────────
        case 'stats':
            $pdo = getDb();
            $stats = [];
            foreach ($VALID_TABLES as $tbl) {
                $stmt = $pdo->query("SELECT COUNT(*) as cnt FROM `{$tbl}`");
                $row = $stmt->fetch();
                $stats[$tbl] = (int)$row['cnt'];
            }
            jsonResponse([
                'success' => true,
                'stats'   => $stats,
                'total'   => array_sum($stats),
                'timestamp' => date('c')
            ]);
            break;

        // ── DEFAULT ──────────────────────────────────────────────────
        default:
            jsonResponse([
                'success' => false,
                'message' => "Action '{$action}' tidak dikenal. Gunakan: ping, getAllData, saveItem, deleteItem, syncAll, readTable, stats"
            ], 400);
    }

} catch (PDOException $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ], 500);
} catch (Exception $e) {
    jsonResponse([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ], 500);
}
