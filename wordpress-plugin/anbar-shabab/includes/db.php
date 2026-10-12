<?php
if (!defined('ABSPATH')) {
    exit;
}

/** Expand {table} tokens to prefixed table names; {users} is the WordPress users table. */
function anbar_sql($sql)
{
    global $wpdb;
    return preg_replace_callback('/\{(\w+)\}/', function ($m) use ($wpdb) {
        return $m[1] === 'users' ? $wpdb->users : $wpdb->prefix . 'anbar_' . $m[1];
    }, $sql);
}

/**
 * Bind `?` placeholders. null → NULL, numbers stay numbers, strings are escaped.
 * (wpdb::prepare turns null into '' which would break nullable columns.)
 */
function anbar_bind($sql, array $args)
{
    $sql = anbar_sql($sql);
    if (!$args) {
        return $sql;
    }
    $i = 0;
    return preg_replace_callback('/\?/', function () use (&$i, $args) {
        $v = $args[$i++] ?? null;
        if ($v === null) {
            return 'NULL';
        }
        if (is_bool($v)) {
            return $v ? '1' : '0';
        }
        if (is_int($v)) {
            return (string) $v;
        }
        if (is_float($v)) {
            return rtrim(rtrim(number_format($v, 6, '.', ''), '0'), '.') ?: '0';
        }
        return "'" . esc_sql((string) $v) . "'";
    }, $sql);
}

function anbar_all($sql, ...$args)
{
    global $wpdb;
    $rows = $wpdb->get_results(anbar_bind($sql, $args), ARRAY_A);
    anbar_db_check();
    return $rows ?: [];
}
function anbar_get($sql, ...$args)
{
    global $wpdb;
    $row = $wpdb->get_row(anbar_bind($sql, $args), ARRAY_A);
    anbar_db_check();
    return $row ?: null;
}
function anbar_var($sql, ...$args)
{
    global $wpdb;
    $v = $wpdb->get_var(anbar_bind($sql, $args));
    anbar_db_check();
    return $v;
}
/** Run a write; returns ['changes' => n, 'id' => insert id]. */
function anbar_run($sql, ...$args)
{
    global $wpdb;
    $n = $wpdb->query(anbar_bind($sql, $args));
    anbar_db_check();
    return ['changes' => (int) $n, 'id' => (int) $wpdb->insert_id];
}
function anbar_db_check()
{
    global $wpdb;
    if ($wpdb->last_error) {
        $err = $wpdb->last_error;
        $wpdb->last_error = '';
        if (stripos($err, 'Duplicate') !== false) {
            throw anbar_bad('این مورد تکراری است.');
        }
        throw new Exception('DB error: ' . $err);
    }
}

/** Run fn inside a DB transaction; rolls back on any thrown error. */
function anbar_tx(callable $fn)
{
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    try {
        $out = $fn();
        $wpdb->query('COMMIT');
        return $out;
    } catch (Throwable $e) {
        $wpdb->query('ROLLBACK');
        throw $e;
    }
}

function anbar_install_schema()
{
    global $wpdb;
    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    $c = $wpdb->get_charset_collate();
    $p = $wpdb->prefix . 'anbar_';
    $q = 'DECIMAL(16,3)';
    dbDelta("CREATE TABLE {$p}warehouses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(500) NULL,
  tracks_expiry TINYINT(1) NOT NULL DEFAULT 0,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  sort INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY name (name)
) $c;
CREATE TABLE {$p}warehouse_managers (
  warehouse_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY  (warehouse_id,user_id),
  KEY user_id (user_id)
) $c;
CREATE TABLE {$p}items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(50) NOT NULL,
  category VARCHAR(80) NULL,
  location VARCHAR(150) NULL,
  unit VARCHAR(30) NOT NULL,
  min_qty $q NOT NULL DEFAULT 0,
  qty $q NOT NULL DEFAULT 0,
  loaned_qty $q NOT NULL DEFAULT 0,
  `condition` VARCHAR(10) NOT NULL DEFAULT 'ok',
  brand VARCHAR(80) NULL,
  model VARCHAR(80) NULL,
  serial VARCHAR(120) NULL,
  image VARCHAR(60) NULL,
  notes TEXT NULL,
  batch_tracked TINYINT(1) NOT NULL DEFAULT 0,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY wh_code (warehouse_id,code),
  KEY warehouse_id (warehouse_id)
) $c;
CREATE TABLE {$p}batches (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  batch_no VARCHAR(60) NOT NULL,
  expiry DATE NULL,
  qty $q NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY item_batch (item_id,batch_no)
) $c;
CREATE TABLE {$p}transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  direction VARCHAR(3) NOT NULL,
  reason VARCHAR(20) NOT NULL,
  qty $q NOT NULL,
  delta $q NOT NULL,
  qty_after $q NOT NULL,
  op_date DATE NOT NULL,
  party VARCHAR(150) NULL,
  note TEXT NULL,
  batch_alloc TEXT NULL,
  loan_id BIGINT UNSIGNED NULL,
  transfer_id BIGINT UNSIGNED NULL,
  request_id BIGINT UNSIGNED NULL,
  corrects_id BIGINT UNSIGNED NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY item_id (item_id),
  KEY op_date (op_date)
) $c;
CREATE TABLE {$p}loans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  borrower VARCHAR(150) NOT NULL,
  program VARCHAR(150) NULL,
  qty $q NOT NULL,
  returned_qty $q NOT NULL DEFAULT 0,
  due_date DATE NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'open',
  note TEXT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  closed_at DATETIME NULL,
  PRIMARY KEY  (id),
  KEY item_id (item_id)
) $c;
CREATE TABLE {$p}transfers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  from_wh BIGINT UNSIGNED NOT NULL,
  to_wh BIGINT UNSIGNED NOT NULL,
  qty $q NOT NULL,
  batch_alloc TEXT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  note TEXT NULL,
  sent_by BIGINT UNSIGNED NOT NULL,
  sent_at DATETIME NOT NULL,
  handled_by BIGINT UNSIGNED NULL,
  handled_at DATETIME NULL,
  handle_note TEXT NULL,
  dest_item_id BIGINT UNSIGNED NULL,
  PRIMARY KEY  (id),
  KEY item_id (item_id)
) $c;
CREATE TABLE {$p}requests (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NULL,
  item_name VARCHAR(150) NOT NULL,
  qty $q NOT NULL,
  unit VARCHAR(30) NULL,
  kind VARCHAR(10) NOT NULL DEFAULT 'use',
  reason TEXT NOT NULL,
  needed_by DATE NULL,
  requester_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'pending',
  reviewer_id BIGINT UNSIGNED NULL,
  review_note TEXT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY warehouse_id (warehouse_id)
) $c;
CREATE TABLE {$p}notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  kind VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  link VARCHAR(255) NULL,
  warehouse_id BIGINT UNSIGNED NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  dedupe VARCHAR(100) NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY user_dedupe (user_id,dedupe),
  KEY user_read (user_id,is_read)
) $c;
CREATE TABLE {$p}announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(150) NOT NULL,
  body TEXT NOT NULL,
  pinned TINYINT(1) NOT NULL DEFAULT 0,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id)
) $c;
CREATE TABLE {$p}audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  entity VARCHAR(20) NULL,
  entity_id BIGINT UNSIGNED NULL,
  details TEXT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY entity (entity,entity_id)
) $c;");

    if ((int) anbar_var('SELECT COUNT(*) FROM {warehouses}') === 0) {
        $defaults = [
            ['انبار کارگاه', 0], ['انبار مسجد', 0], ['انبار رسانه', 0], ['انبار صوت مسجد', 0],
            ['انبار پایگاه حاج احمد یلالی', 0], ['انبار مدرسه', 0], ['انبار داروخانه', 1], ['انبار آشپزخانه', 1],
        ];
        foreach ($defaults as $i => [$name, $exp]) {
            anbar_run('INSERT INTO {warehouses} (name, tracks_expiry, sort, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())', $name, $exp, $i + 1);
        }
    }
    update_option('anbar_db_version', ANBAR_DB_VERSION);
}

/** Private storage for item photos and backups (not browsable; served through the REST API). */
function anbar_private_dir($sub = '')
{
    $up = wp_upload_dir(null, false);
    $dir = trailingslashit($up['basedir']) . 'anbar-private';
    if (!is_dir($dir)) {
        wp_mkdir_p($dir);
        file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
        file_put_contents($dir . '/index.php', "<?php // Silence.\n");
    }
    if ($sub) {
        $dir .= '/' . $sub;
        if (!is_dir($dir)) {
            wp_mkdir_p($dir);
            file_put_contents($dir . '/index.php', "<?php // Silence.\n");
        }
    }
    return $dir;
}

function anbar_audit($user_id, $action, $entity = null, $entity_id = null, $details = null)
{
    anbar_run('INSERT INTO {audit} (user_id, action, entity, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        $user_id, $action, $entity, $entity_id, $details === null ? null : wp_json_encode($details, JSON_UNESCAPED_UNICODE));
}

/** Export all plugin tables as gzipped JSON into the private backups folder; keeps the newest 30. */
function anbar_backup_now()
{
    global $wpdb;
    $tables = ['warehouses', 'warehouse_managers', 'items', 'batches', 'transactions', 'loans', 'transfers', 'requests',
        'notifications', 'announcements', 'audit'];
    $dump = ['plugin' => 'anbar-shabab', 'version' => ANBAR_VERSION, 'created_at' => gmdate('c'), 'tables' => []];
    foreach ($tables as $t) {
        $dump['tables'][$t] = $wpdb->get_results('SELECT * FROM ' . $wpdb->prefix . 'anbar_' . $t, ARRAY_A);
    }
    $dump['users'] = array_map('anbar_user_public', anbar_app_users());
    $dir = anbar_private_dir('backups');
    $name = 'anbar-' . gmdate('Y-m-d-His') . '.json.gz';
    file_put_contents($dir . '/' . $name, gzencode(wp_json_encode($dump, JSON_UNESCAPED_UNICODE), 6));
    $files = glob($dir . '/anbar-*.json.gz');
    sort($files);
    $keep = (int) apply_filters('anbar_backup_keep', 30);
    foreach (array_slice($files, 0, max(0, count($files) - $keep)) as $f) {
        @unlink($f);
    }
    return $name;
}
