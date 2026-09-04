<?php
/**
 * Production Entry Router for BKI Pontianak (Hostinger Git Deployment)
 * 
 * Melayani aplikasi React Single Page Application (SPA) dari direktori dist/
 * secara otomatis tanpa loop rewrite LiteSpeed.
 */

// 1. Jika request menuju API, serahkan ke api/api.php
$uri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($uri, PHP_URL_PATH) ?: '/';

if (str_starts_with($path, '/api')) {
    $apiScript = __DIR__ . '/api/api.php';
    if (file_exists($apiScript)) {
        require $apiScript;
        exit;
    }
}

// 2. Jika request menargetkan file aset statis yang ada di dist/ (misal: /assets/..., /signatures/...)
$distFile = __DIR__ . '/dist' . $path;
if ($path !== '/' && file_exists($distFile) && !is_dir($distFile)) {
    $ext = strtolower(pathinfo($distFile, PATHINFO_EXTENSION));
    $mimes = [
        'js'   => 'application/javascript',
        'css'  => 'text/css',
        'json' => 'application/json',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif'  => 'image/gif',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'webp' => 'image/webp',
        'woff' => 'font/woff',
        'woff2'=> 'font/woff2',
        'ttf'  => 'font/ttf',
        'pdf'  => 'application/pdf'
    ];
    $contentType = $mimes[$ext] ?? 'application/octet-stream';
    header("Content-Type: {$contentType}; charset=utf-8");
    header("Cache-Control: public, max-age=31536000, immutable");
    readfile($distFile);
    exit;
}

// 3. Untuk semua rute frontend SPA lainnya, sajikan dist/index.html
$distIndex = __DIR__ . '/dist/index.html';
if (file_exists($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Pragma: no-cache');
    header('Expires: 0');
    readfile($distIndex);
    exit;
}

// 4. Fallback jika dist belum ter-build
http_response_code(503);
header('Content-Type: text/html; charset=utf-8');
echo '<h1>Aplikasi sedang dipersiapkan...</h1><p>File dist/index.html belum ditemukan. Harap tunggu beberapa saat.</p>';
exit;
