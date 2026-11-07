<?php
/* بارگذاری پیکربندی و همه بخش‌های سامانه */
define('KT', 1);
define('KT_VERSION', '3.0.0');
define('KT_ROOT', dirname(__DIR__));
error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
ini_set('display_errors', '0');
date_default_timezone_set('UTC');
mb_internal_encoding('UTF-8');
if (PHP_VERSION_ID < 70400) { http_response_code(500); exit('نسخه PHP باید ۷٫۴ یا بالاتر باشد.'); }
foreach (['util', 'db', 'core', 'rules', 'ops_work', 'ops_fin', 'ops_tools', 'ops_admin', 'view', 'seed', 'auth', 'maint'] as $f) require_once __DIR__ . '/' . $f . '.php';

function kt_config() {
  $f = KT_ROOT . '/config.php';
  if (!is_file($f)) return null;
  $c = require $f;
  return is_array($c) ? $c : null;
}
function kt_boot() {
  $c = kt_config(); if (!$c) return false;
  define('KT_DATA', rtrim($c['dataDir'] ?? (KT_ROOT . '/data'), '/'));
  define('KT_DB_NAME', $c['db']['name'] ?? ($c['db']['path'] ?? ''));
  define('KT_MAX_UPLOAD', (int)($c['maxUploadMB'] ?? 20) * 1024 * 1024);
  if (($c['db']['driver'] ?? '') === 'sqlite' && empty($c['db']['path'])) $c['db']['path'] = KT_DATA . '/kartabl.sqlite';
  KDB::connect($c['db']);
  return true;
}
