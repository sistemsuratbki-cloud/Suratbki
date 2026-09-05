<?php
/**
 * Production Entry Router — BKI Pontianak (Hostinger LiteSpeed)
 * Semua request masuk ke sini. PHP routing ke file statis atau SPA.
 */

ini_set('display_errors', '0');
error_reporting(0);

// Matikan output buffering bawaan PHP agar readfile tidak tertahan
if (ob_get_level()) {
    ob_end_clean();
}

$uri  = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!$path) $path = '/';

// ── 1. API requests → forward ke api/api.php ──
if (strncmp($path, '/api', 4) === 0) {
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

// ── 2. File statis di dist/ ──
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
        'html'  => 'text/html; charset=utf-8',
        'txt'   => 'text/plain',
        'xml'   => 'application/xml',
        'map'   => 'application/json'
    ];
    $ct = isset($mimes[$ext]) ? $mimes[$ext] : 'application/octet-stream';

    // Cache headers
    if ($ext === 'html') {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    } elseif (in_array($ext, ['js', 'mjs', 'css', 'woff', 'woff2', 'ttf', 'ico', 'png', 'svg', 'webp'])) {
        header('Cache-Control: public, max-age=31536000, immutable');
    } else {
        header('Cache-Control: public, max-age=2592000');
    }

    $fileSize = filesize($distFile);
    header('Content-Type: ' . $ct);
    header('Content-Length: ' . $fileSize);
    header('Connection: close');

    // Kirim file langsung — tanpa buffering
    readfile($distFile);
    exit;
}

// ── 3. SPA fallback → dist/index.html ──
$distIndex = __DIR__ . '/dist/index.html';
if (file_exists($distIndex)) {
    $fileSize = filesize($distIndex);
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    header('Content-Length: ' . $fileSize);
    header('Connection: close');
    readfile($distIndex);
    exit;
}

// ── 4. Fallback jika belum build ──
http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>Aplikasi sedang dipersiapkan...</h1><p>File dist/index.html tidak ditemukan.</p>';
exit;
