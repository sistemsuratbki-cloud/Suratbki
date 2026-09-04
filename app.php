<?php
// Simple redirect to dist/index.html — bypass CDN 408 cache
$distIndex = __DIR__ . '/dist/index.html';
if (file_exists($distIndex)) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-cache, no-store, must-revalidate');
    header('Content-Length: ' . filesize($distIndex));
    readfile($distIndex);
} else {
    echo '<h1>Loading...</h1><script>location.href="/dist/index.html";</script>';
}
