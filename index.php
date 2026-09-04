<?php
/**
 * Production Entry Router — BKI Pontianak (Hostinger)
 * 
 * Semua request (kecuali file statis & API) masuk ke sini.
 * PHP membaca dist/index.html dan mengirimkannya ke browser.
 * TANPA rewrite internal = TANPA loop 408.
 * 
 * Kompatibel PHP 7.0+ (tidak pakai str_starts_with)
 */

// Matikan display errors
ini_set('display_errors', '0');
error_reporting(E_ALL);

// Ambil path request
$uri  = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!$path) $path = '/';

// ── 1. API requests → forward ke api/api.php ──
if (substr($path, 0, 4) === '/api') {
    $apiFile = __DIR__ . '/api/api.php';
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    }
    http_response_code(404);
    header('Content-Type: application/json');
    echo '{"success":false,"message":"API not found"}';
    exit;
}

// ── 2. File statis di dist/ (JS, CSS, images, fonts, dll.) ──
$distFile = __DIR__ . '/dist' . $path;
if ($path !== '/' && is_file($distFile)) {
    $ext = strtolower(pathinfo($distFile, PATHINFO_EXTENSION));
    $mimes = [
        'js'    => 'application/javascript',
        'mjs'   => 'application/javascript',
        'css'   => 'text/css',
        'json'  => 'application/json',
        'png'   => 'image/png',
        'jpg'   => 'image/jpeg',
        'jpeg'  => 'image/jpeg',
        'gif'   => 'image/gif',
        'svg'   => 'image/svg+xml',
        'ico'   => 'image/x-icon',
        'webp'  => 'image/webp',
        'woff'  => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf'   => 'font/ttf',
        'eot'   => 'application/vnd.ms-fontobject',
        'pdf'   => 'application/pdf',
        'html'  => 'text/html',
        'txt'   => 'text/plain',
        'xml'   => 'application/xml',
        'map'   => 'application/json'
    ];
    $ct = isset($mimes[$ext]) ? $mimes[$ext] : 'application/octet-stream';

    if ($ext === 'html') {
        header('Cache-Control: no-cache, no-store, must-revalidate');
    } else {
        header('Cache-Control: public, max-age=31536000, immutable');
    }
    header('Content-Type: ' . $ct);
    header('Content-Length: ' . filesize($distFile));
    readfile($distFile);
    exit;
}

// ── 3. SPA Fallback: serve dist/index.html untuk semua rute ──
$distIndex = __DIR__ . '/dist/index.html';
if (file_exists($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Content-Length: ' . filesize($distIndex));
    readfile($distIndex);
    exit;
}

// ── 4. Fallback jika dist belum build ──
http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>Aplikasi sedang dipersiapkan...</h1>';
echo '<p>File dist/index.html belum ditemukan.</p>';
exit;
