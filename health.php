<?php
/**
 * Diagnostic page for BKI Pontianak deployment
 * Access via: https://pkadminclass.com/health.php
 * DELETE THIS FILE after confirming everything works!
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$checks = [];

// PHP Version
$checks['php_version'] = PHP_VERSION;
$checks['php_major'] = PHP_MAJOR_VERSION;
$checks['str_starts_with_available'] = function_exists('str_starts_with');

// Check files exist
$checks['index_php_exists'] = file_exists(__DIR__ . '/index.php');
$checks['dist_index_exists'] = file_exists(__DIR__ . '/dist/index.html');
$checks['api_exists'] = file_exists(__DIR__ . '/api/api.php');
$checks['api_config_exists'] = file_exists(__DIR__ . '/api/config.php');
$checks['htaccess_root_exists'] = file_exists(__DIR__ . '/.htaccess');
$checks['htaccess_dist_exists'] = file_exists(__DIR__ . '/dist/.htaccess');
$checks['htaccess_api_exists'] = file_exists(__DIR__ . '/api/.htaccess');

// Check dist/.htaccess content (is it the minimal no-op version?)
if ($checks['htaccess_dist_exists']) {
    $distHtaccess = file_get_contents(__DIR__ . '/dist/.htaccess');
    $checks['dist_htaccess_size'] = strlen($distHtaccess);
    $checks['dist_htaccess_has_rewrite'] = (strpos($distHtaccess, 'RewriteRule') !== false);
    $checks['dist_htaccess_content'] = $distHtaccess;
}

// Check root .htaccess
if ($checks['htaccess_root_exists']) {
    $rootHtaccess = file_get_contents(__DIR__ . '/.htaccess');
    $checks['root_htaccess_size'] = strlen($rootHtaccess);
    $checks['root_htaccess_first_line'] = strtok($rootHtaccess, "\n");
}

// List dist/ directory
$distDir = __DIR__ . '/dist';
if (is_dir($distDir)) {
    $distFiles = scandir($distDir);
    $checks['dist_files'] = $distFiles;
}

// List api/ directory
$apiDir = __DIR__ . '/api';
if (is_dir($apiDir)) {
    $apiFiles = scandir($apiDir);
    $checks['api_files'] = $apiFiles;
}

// Server info
$checks['server_software'] = isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : 'unknown';
$checks['document_root'] = isset($_SERVER['DOCUMENT_ROOT']) ? $_SERVER['DOCUMENT_ROOT'] : 'unknown';
$checks['script_filename'] = isset($_SERVER['SCRIPT_FILENAME']) ? $_SERVER['SCRIPT_FILENAME'] : 'unknown';
$checks['request_uri'] = isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'unknown';

// Timestamp
$checks['timestamp'] = date('c');
$checks['timezone'] = date_default_timezone_get();

echo json_encode($checks, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
