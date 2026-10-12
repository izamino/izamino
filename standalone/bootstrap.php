<?php
/** Loads configuration, the WordPress stand-ins and the shared app core. */
foreach (['ABSPATH' => __DIR__ . '/', 'ANBAR_VERSION' => '2.1.0', 'ANBAR_DB_VERSION' => '3', 'ANBAR_CONFIG' => __DIR__ . '/config.php'] as $__k => $__v) {
    if (!defined($__k)) {
        define($__k, $__v);
    }
}

if (!is_file(ANBAR_CONFIG)) {
    if (PHP_SAPI !== 'cli' && basename($_SERVER['SCRIPT_NAME'] ?? '') !== 'install.php') {
        header('Location: install.php');
        exit;
    }
    return;
}
require_once ANBAR_CONFIG;
if (!defined('ANBAR_DATA_DIR')) {
    define('ANBAR_DATA_DIR', __DIR__ . '/data');
}
if (!defined('ANBAR_BASE_URL')) {
    define('ANBAR_BASE_URL', '');
}
require_once __DIR__ . '/lib/compat.php';
$GLOBALS['wpdb'] = new wpdb(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, TABLE_PREFIX);

foreach (['util', 'db', 'users', 'notify', 'stock', 'tickets', 'catalog', 'xlsx', 'rest'] as $f) {
    require_once __DIR__ . "/includes/{$f}.php";
}
require_once __DIR__ . '/lib/app.php';

anbar_compat_load_session();
// Schema upgrades after replacing files with a newer version.
if (get_option('anbar_db_version') !== false && get_option('anbar_db_version') !== ANBAR_DB_VERSION) {
    anbar_install_schema();
}
