<?php
/**
 * Konfigurasi Database MySQL Hostinger
 * Sistem Surat Tugas BKI Pontianak
 * 
 * =========================================================================
 * PANDUAN KONFIGURASI:
 * =========================================================================
 * 1. Login ke hPanel Hostinger → Database → MySQL Databases
 * 2. Buat database baru (misal: u123456789_suratbki)
 * 3. Catat: Host, Database Name, Username, Password
 * 4. Isi variabel di bawah ini sesuai data dari Hostinger
 * 5. Upload file ini ke folder public_html/api/ di Hostinger
 * =========================================================================
 */

// ── Keamanan: Cegah akses langsung via browser ────────────────────────────
if (basename($_SERVER['PHP_SELF'] ?? '') === 'config.php' || basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'config.php') {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => '403 Forbidden', 'message' => 'Akses langsung ke file konfigurasi dilarang.']);
    exit;
}

// ── Koneksi Database MySQL Hostinger ──────────────────────────────────────
define('DB_HOST',     'localhost');              // Biasanya 'localhost' di Hostinger
define('DB_NAME',     'u123456789_suratbki');    // Nama database Anda
define('DB_USER',     'u123456789_suratbki');    // Username database
define('DB_PASS',     'Password_Anda_Disini');   // Password database
define('DB_CHARSET',  'utf8mb4');

// ── API Security ─────────────────────────────────────────────────────────
// Ganti dengan token rahasia Anda sendiri untuk keamanan API
define('API_TOKEN',   'bki-pontianak-2026-secret-token');

// ── CORS Settings ────────────────────────────────────────────────────────
// Domain yang diizinkan mengakses API (pisahkan dengan koma)
// Gunakan '*' untuk mengizinkan semua domain (development only)
define('ALLOWED_ORIGINS', '*');

// ── Timezone ─────────────────────────────────────────────────────────────
date_default_timezone_set('Asia/Pontianak');
