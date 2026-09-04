<?php
/**
 * Production Entry Router for BKI Pontianak (Hostinger Git Deployment)
 * 
 * Melayani aplikasi React Single Page Application (SPA) dari direktori dist/
 * TANPA bergantung pada .htaccess SPA rewrite (mencegah loop LiteSpeed 408).
 * 
 * Kompatibel PHP 7.0+ (TIDAK menggunakan str_starts_with / str_contains)
 */

// Error handling — jangan tampilkan error PHP ke browser
ini_set('display_errors', '0');
error_reporting(E_ALL);

// 1. Ambil path dari URI
$uri = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '/';
$path = parse_url($uri, PHP_URL_PATH);
if (!$path) $path = '/';

// 2. Jika request menuju API, serahkan ke api/api.php
if (substr($path, 0, 4) === '/api') {
    $apiScript = __DIR__ . '/api/api.php';
    if (file_exists($apiScript)) {
        require $apiScript;
        exit;
    }
    // Fallback: coba hostinger-api
    $altApi = __DIR__ . '/hostinger-api/api.php';
    if (file_exists($altApi)) {
        require $altApi;
        exit;
    }
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'API file not found']);
    exit;
}

// 3. Jika request menargetkan file statis yang ada di dist/
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
    $contentType = isset($mimes[$ext]) ? $mimes[$ext] : 'application/octet-stream';

    // Untuk HTML, jangan cache. Untuk yang lain, cache agresif.
    if ($ext === 'html') {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    } else {
        header('Cache-Control: public, max-age=31536000, immutable');
    }
    
    header('Content-Type: ' . $contentType);
    header('Content-Length: ' . filesize($distFile));
    readfile($distFile);
    exit;
}

// 4. Untuk semua rute frontend SPA lainnya, sajikan dist/index.html
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

// 5. Fallback jika dist belum ter-build
http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>Aplikasi sedang dipersiapkan...</h1><p>File dist/index.html belum ditemukan. Harap tunggu beberapa saat.</p>';
exit;
