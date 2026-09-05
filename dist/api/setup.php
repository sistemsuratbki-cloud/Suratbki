<?php
/**
 * Setup Script — Membuat tabel-tabel database MySQL
 * Sistem Surat Tugas BKI Pontianak
 * 
 * =========================================================================
 * CARA PENGGUNAAN:
 * =========================================================================
 * 1. Upload file ini bersama config.php ke public_html/api/ di Hostinger
 * 2. Buka browser: https://domain-anda.com/api/setup.php
 * 3. Tabel akan dibuat secara otomatis
 * 4. HAPUS FILE INI SETELAH SETUP SELESAI (untuk keamanan)
 * =========================================================================
 */

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// ── Keamanan: Cek apakah setup sudah pernah dijalankan ────────────────────
$lockFile = __DIR__ . '/setup.lock';
if (file_exists($lockFile)) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Setup telah dikunci karena database sudah pernah diinisialisasi. Untuk menjalankan ulang, hapus file setup.lock di server.'
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    $tables = [
        'users' => "
            CREATE TABLE IF NOT EXISTS `users` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'surat_tugas' => "
            CREATE TABLE IF NOT EXISTS `surat_tugas` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'kwitansi_honor' => "
            CREATE TABLE IF NOT EXISTS `kwitansi_honor` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'laporan_survei' => "
            CREATE TABLE IF NOT EXISTS `laporan_survei` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'tariffs' => "
            CREATE TABLE IF NOT EXISTS `tariffs` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'grade_tariffs' => "
            CREATE TABLE IF NOT EXISTS `grade_tariffs` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'master_kapal' => "
            CREATE TABLE IF NOT EXISTS `master_kapal` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'admin_settings' => "
            CREATE TABLE IF NOT EXISTS `admin_settings` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ",
        'visit_survei' => "
            CREATE TABLE IF NOT EXISTS `visit_survei` (
                `id` VARCHAR(255) NOT NULL PRIMARY KEY,
                `raw_data` LONGTEXT,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        "
    ];

    $results = [];
    foreach ($tables as $name => $sql) {
        $pdo->exec($sql);
        $results[] = "✅ Tabel `{$name}` berhasil dibuat/sudah ada";
    }

    // Kunci setup script secara otomatis
    @file_put_contents($lockFile, date('Y-m-d H:i:s') . " - Database setup completed successfully.\n");

    echo json_encode([
        'success' => true,
        'message' => 'Setup database berhasil! File setup.lock telah dibuat untuk keamanan.',
        'tables' => $results,
        'database' => DB_NAME,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal setup database: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
