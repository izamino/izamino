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
    if (!function_exists('dbDelta')) {
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    }
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
CREATE TABLE {$p}items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NOT NULL,
  item_type VARCHAR(20) NOT NULL DEFAULT 'other',
  category VARCHAR(80) NULL,
  location VARCHAR(200) NULL,
  custodian VARCHAR(150) NULL,
  unit VARCHAR(30) NOT NULL,
  min_qty $q NOT NULL DEFAULT 0,
  qty $q NOT NULL DEFAULT 0,
  broken_qty $q NOT NULL DEFAULT 0,
  loaned_qty $q NOT NULL DEFAULT 0,
  `condition` VARCHAR(10) NOT NULL DEFAULT 'ok',
  condition_notes TEXT NULL,
  brand VARCHAR(120) NULL,
  model VARCHAR(160) NULL,
  serial VARCHAR(160) NULL,
  purchase_price DECIMAL(20,0) NULL,
  current_value DECIMAL(20,0) NULL,
  currency VARCHAR(10) NULL,
  purchase_date DATE NULL,
  valuation_date DATE NULL,
  source VARCHAR(20) NULL,
  vendor VARCHAR(200) NULL,
  details LONGTEXT NULL,
  card_status VARCHAR(12) NOT NULL DEFAULT 'draft',
  image VARCHAR(60) NULL,
  notes TEXT NULL,
  batch_tracked TINYINT(1) NOT NULL DEFAULT 0,
  archived TINYINT(1) NOT NULL DEFAULT 0,
  created_by BIGINT UNSIGNED NULL,
  reviewed_by BIGINT UNSIGNED NULL,
  last_review_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY wh_code (warehouse_id,code),
  KEY warehouse_id (warehouse_id),
  KEY card_status (card_status)
) $c;
CREATE TABLE {$p}item_photos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  file VARCHAR(60) NOT NULL,
  caption VARCHAR(200) NULL,
  sort INT NOT NULL DEFAULT 0,
  user_id BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY item_id (item_id)
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
  exit_id BIGINT UNSIGNED NULL,
  corrects_id BIGINT UNSIGNED NULL,
  op_key VARCHAR(64) NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY op_key (op_key),
  KEY item_id (item_id),
  KEY exit_id (exit_id),
  KEY op_date (op_date)
) $c;
CREATE TABLE {$p}loans (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_id BIGINT UNSIGNED NOT NULL,
  warehouse_id BIGINT UNSIGNED NOT NULL,
  exit_id BIGINT UNSIGNED NULL,
  borrower VARCHAR(150) NOT NULL,
  borrower_phone VARCHAR(20) NULL,
  program VARCHAR(200) NULL,
  qty $q NOT NULL,
  returned_qty $q NOT NULL DEFAULT 0,
  returned_broken $q NOT NULL DEFAULT 0,
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
  exit_id BIGINT UNSIGNED NULL,
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
CREATE TABLE {$p}exits (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NULL,
  from_wh BIGINT UNSIGNED NOT NULL,
  to_wh BIGINT UNSIGNED NULL,
  type VARCHAR(12) NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'draft',
  requester_id BIGINT UNSIGNED NOT NULL,
  recipient VARCHAR(150) NULL,
  recipient_phone VARCHAR(20) NULL,
  reason TEXT NULL,
  program VARCHAR(200) NULL,
  delivery_place VARCHAR(200) NULL,
  needed_by DATE NULL,
  due_date DATE NULL,
  note TEXT NULL,
  submitted_at DATETIME NULL,
  approver_id BIGINT UNSIGNED NULL,
  approved_at DATETIME NULL,
  decision_note TEXT NULL,
  deliverer_id BIGINT UNSIGNED NULL,
  delivered_at DATETIME NULL,
  delivery_note TEXT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY status (status),
  KEY from_wh (from_wh),
  KEY ticket_id (ticket_id)
) $c;
CREATE TABLE {$p}exit_lines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  exit_id BIGINT UNSIGNED NOT NULL,
  item_id BIGINT UNSIGNED NOT NULL,
  qty $q NOT NULL,
  from_broken TINYINT(1) NOT NULL DEFAULT 0,
  tx_id BIGINT UNSIGNED NULL,
  PRIMARY KEY  (id),
  KEY exit_id (exit_id),
  KEY item_id (item_id)
) $c;
CREATE TABLE {$p}tickets (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(12) NOT NULL,
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  national_id VARCHAR(10) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  referral VARCHAR(300) NULL,
  item_text VARCHAR(300) NOT NULL,
  qty_text VARCHAR(100) NULL,
  need_time VARCHAR(200) NULL,
  description TEXT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'new',
  referred_wh BIGINT UNSIGNED NULL,
  appointment VARCHAR(200) NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY code (code),
  KEY status (status)
) $c;
CREATE TABLE {$p}ticket_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  kind VARCHAR(12) NOT NULL,
  text TEXT NULL,
  appointment VARCHAR(200) NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY  (id),
  KEY ticket_id (ticket_id)
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

    $defaults = [
        ['انبار کارگاه', 0], ['انبار مسجد', 0], ['انبار رسانه', 0], ['انبار صوت مسجد', 0],
        ['انبار پایگاه حاج احمد یلالی', 0], ['انبار مدرسه', 0], ['انبار داروخانه', 1], ['انبار آشپزخانه', 1],
        ['اموال و انبار کتابخانه', 0], ['اموال و انبار نمازخانه', 0],
    ];
    foreach ($defaults as $i => [$name, $exp]) {
        if (!anbar_get('SELECT id FROM {warehouses} WHERE name = ?', $name)) {
            anbar_run('INSERT INTO {warehouses} (name, tracks_expiry, sort, created_at) VALUES (?, ?, ?, UTC_TIMESTAMP())', $name, $exp, $i + 1);
        }
    }
    // Version 1 stored warehouse managers in a table; carry them over as restricted scopes.
    if ($wpdb->get_var("SHOW TABLES LIKE '{$p}warehouse_managers'")) {
        foreach ($wpdb->get_results("SELECT user_id, GROUP_CONCAT(warehouse_id) AS whs FROM {$p}warehouse_managers GROUP BY user_id", ARRAY_A) as $r) {
            if (!get_user_meta($r['user_id'], 'anbar_perms', true)) {
                anbar_save_perms($r['user_id'], ['warehouses' => explode(',', $r['whs']), 'edit' => true, 'stock_in' => true,
                    'request_out' => true, 'deliver' => true]);
            }
        }
    }
    if ((int) get_option('anbar_db_version') < 3) {
        anbar_grant_steward_to_initial_accounts();
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
    $tables = ['warehouses', 'items', 'item_photos', 'batches', 'transactions', 'loans', 'transfers', 'exits', 'exit_lines',
        'tickets', 'ticket_events', 'notifications', 'announcements', 'audit'];
    $dump = ['plugin' => 'anbar-shabab', 'version' => ANBAR_VERSION, 'created_at' => gmdate('c'), 'tables' => []];
    foreach ($tables as $t) {
        $dump['tables'][$t] = $wpdb->get_results('SELECT * FROM ' . $wpdb->prefix . 'anbar_' . $t, ARRAY_A);
    }
    $dump['users'] = array_map('anbar_user_public', anbar_app_users());
    $dir = anbar_private_dir('backups');
    // Random suffix: backups stay unguessable even where the web server ignores .htaccess.
    $name = 'anbar-' . gmdate('Y-m-d-His') . '-' . bin2hex(random_bytes(6)) . '.json.gz';
    file_put_contents($dir . '/' . $name, gzencode(wp_json_encode($dump, JSON_UNESCAPED_UNICODE), 6));
    $files = glob($dir . '/anbar-*.json.gz');
    sort($files);
    $keep = (int) apply_filters('anbar_backup_keep', 30);
    foreach (array_slice($files, 0, max(0, count($files) - $keep)) as $f) {
        @unlink($f);
    }
    return $name;
}
