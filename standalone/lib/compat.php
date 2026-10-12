<?php
/**
 * Minimal stand-ins for the WordPress functions the app's core uses, so the same tested code
 * (includes/*.php) runs on any PHP + MySQL host without WordPress.
 *
 * Accounts live in {prefix}users / {prefix}usermeta, sessions in {prefix}sessions (hashed tokens,
 * HttpOnly cookie), settings and rate-limit counters in {prefix}options.
 */
if (!defined('ABSPATH')) {
    exit;
}

const ARRAY_A = 'ARRAY_A';
const MINUTE_IN_SECONDS = 60;
const HOUR_IN_SECONDS = 3600;
const DAY_IN_SECONDS = 86400;
const ANBAR_COOKIE = 'anbar_sid';
const ANBAR_SESSION_DAYS = 30;

/* ================================================================ database */

class wpdb
{
    public $prefix;
    public $users;
    public $last_error = '';
    public $insert_id = 0;
    /** @var mysqli */
    private $db;

    public function __construct($host, $user, $pass, $name, $prefix)
    {
        mysqli_report(MYSQLI_REPORT_OFF);
        $port = null;
        if (strpos($host, ':') !== false) {
            [$host, $port] = explode(':', $host, 2);
        }
        $this->db = @new mysqli($host, $user, $pass, $name, $port ? (int) $port : null);
        if ($this->db->connect_errno) {
            throw new RuntimeException('اتصال به پایگاه داده برقرار نشد: ' . $this->db->connect_error);
        }
        $this->db->set_charset('utf8mb4');
        $this->db->query("SET time_zone = '+00:00'");
        $this->prefix = $prefix;
        $this->users = $prefix . 'users';
    }

    public function query($sql)
    {
        $this->last_error = '';
        $r = $this->db->query($sql);
        if ($r === false) {
            $this->last_error = $this->db->error;
            return false;
        }
        $this->insert_id = (int) $this->db->insert_id;
        if ($r instanceof mysqli_result) {
            $n = $r->num_rows;
            $r->free();
            return $n;
        }
        return $this->db->affected_rows;
    }

    public function get_results($sql, $output = ARRAY_A)
    {
        $this->last_error = '';
        $r = $this->db->query($sql);
        if ($r === false) {
            $this->last_error = $this->db->error;
            return null;
        }
        if (!($r instanceof mysqli_result)) {
            return [];
        }
        $rows = $r->fetch_all(MYSQLI_ASSOC);
        $r->free();
        return $rows;
    }

    public function get_row($sql, $output = ARRAY_A)
    {
        $rows = $this->get_results($sql);
        return $rows ? $rows[0] : null;
    }

    public function get_var($sql)
    {
        $row = $this->get_row($sql);
        return $row ? array_values($row)[0] : null;
    }

    public function esc_like($s)
    {
        return addcslashes((string) $s, '_%\\');
    }

    public function escape($s)
    {
        return $this->db->real_escape_string((string) $s);
    }

    public function get_charset_collate()
    {
        return 'DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci';
    }
}

function esc_sql($s)
{
    global $wpdb;
    return $wpdb->escape($s);
}

/** Create tables from CREATE TABLE statements (fresh installs; existing tables are kept). */
function dbDelta($sql)
{
    global $wpdb;
    foreach (preg_split('/;\s*(?=CREATE TABLE|$)/', trim($sql)) as $stmt) {
        $stmt = trim($stmt);
        if ($stmt === '') {
            continue;
        }
        $stmt = preg_replace('/^CREATE TABLE (?!IF NOT EXISTS)/', 'CREATE TABLE IF NOT EXISTS ', $stmt);
        if ($wpdb->query($stmt) === false) {
            throw new RuntimeException('ساخت جدول ناموفق بود: ' . $wpdb->last_error);
        }
        anbar_compat_add_missing_columns($stmt);
    }
}

/** Upgrades: add columns that a newer CREATE TABLE has but the existing table lacks. */
function anbar_compat_add_missing_columns($stmt)
{
    global $wpdb;
    if (!preg_match('/CREATE TABLE IF NOT EXISTS (\w+) \((.*)\)[^)]*$/s', $stmt, $m)) {
        return;
    }
    $table = $m[1];
    $have = array_column($wpdb->get_results("SHOW COLUMNS FROM `{$table}`") ?: [], 'Field');
    foreach (preg_split('/,\n/', $m[2]) as $line) {
        $line = trim($line);
        if (!preg_match('/^`?(\w+)`?\s+[A-Z]/', $line, $c) || in_array(strtoupper($c[1]), ['PRIMARY', 'UNIQUE', 'KEY', 'INDEX'], true)) {
            continue;
        }
        if (!in_array($c[1], $have, true)) {
            $wpdb->query("ALTER TABLE `{$table}` ADD COLUMN {$line}");
        }
    }
}

function anbar_compat_install_core()
{
    global $wpdb;
    $p = $wpdb->prefix;
    $c = $wpdb->get_charset_collate();
    dbDelta("CREATE TABLE {$p}users (
  ID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_login VARCHAR(60) NOT NULL,
  user_pass VARCHAR(255) NOT NULL,
  display_name VARCHAR(250) NOT NULL DEFAULT '',
  user_registered DATETIME NOT NULL,
  PRIMARY KEY  (ID),
  UNIQUE KEY user_login (user_login)
) $c;
CREATE TABLE {$p}usermeta (
  umeta_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  meta_key VARCHAR(191) NOT NULL,
  meta_value LONGTEXT NULL,
  PRIMARY KEY  (umeta_id),
  KEY user_key (user_id,meta_key)
) $c;
CREATE TABLE {$p}sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires DATETIME NOT NULL,
  PRIMARY KEY  (token_hash),
  KEY user_id (user_id)
) $c;
CREATE TABLE {$p}options (
  option_name VARCHAR(191) NOT NULL,
  option_value LONGTEXT NULL,
  expires INT UNSIGNED NULL,
  PRIMARY KEY  (option_name)
) $c;");
}

/* ================================================================ hooks, errors, responses */

$GLOBALS['anbar_hooks'] = [];
function add_filter($tag, $cb, $priority = 10, $args = 1)
{
    $GLOBALS['anbar_hooks'][$tag][] = [$cb, $args];
    return true;
}
function add_action($tag, $cb, $priority = 10, $args = 1)
{
    return add_filter($tag, $cb, $priority, $args);
}
function apply_filters($tag, $value, ...$more)
{
    foreach ($GLOBALS['anbar_hooks'][$tag] ?? [] as [$cb, $n]) {
        $value = $cb(...array_slice(array_merge([$value], $more), 0, max(1, $n)));
    }
    return $value;
}
function do_action($tag, ...$args)
{
    foreach ($GLOBALS['anbar_hooks'][$tag] ?? [] as [$cb]) {
        $cb(...$args);
    }
}

class WP_Error
{
    private $code;
    private $message;
    private $data;

    public function __construct($code = '', $message = '', $data = null)
    {
        $this->code = $code;
        $this->message = $message;
        $this->data = $data;
    }
    public function get_error_code()
    {
        return $this->code;
    }
    public function get_error_message()
    {
        return $this->message;
    }
    public function get_error_data()
    {
        return $this->data;
    }
}
function __return_true()
{
    return true;
}
function __return_false()
{
    return false;
}
function is_wp_error($x)
{
    return $x instanceof WP_Error;
}

class WP_REST_Response
{
    public $data;
    public $status = 200;
    public $headers = [];

    public function __construct($data = null, $status = 200)
    {
        $this->data = $data;
        $this->status = $status;
    }
    public function header($k, $v)
    {
        $this->headers[$k] = $v;
    }
}
function rest_ensure_response($x)
{
    return ($x instanceof WP_REST_Response || $x instanceof WP_Error) ? $x : new WP_REST_Response($x);
}

class WP_REST_Request
{
    private $url_params;
    private $query;
    private $json;

    public function __construct($url_params, $query, $json)
    {
        $this->url_params = $url_params;
        $this->query = $query;
        $this->json = $json;
    }
    public function get_url_params()
    {
        return $this->url_params;
    }
    public function get_query_params()
    {
        return $this->query;
    }
    public function get_json_params()
    {
        return $this->json;
    }
}

$GLOBALS['anbar_routes'] = [];
function register_rest_route($ns, $path, $args)
{
    $GLOBALS['anbar_routes'][] = ['path' => $path] + $args;
    return true;
}

function wp_json_encode($data, $flags = 0)
{
    return json_encode($data, $flags | JSON_UNESCAPED_UNICODE);
}

/* ================================================================ URLs & files */

function anbar_base_url()
{
    if (defined('ANBAR_BASE_URL') && ANBAR_BASE_URL) {
        return rtrim(ANBAR_BASE_URL, '/') . '/';
    }
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return (is_ssl() ? 'https' : 'http') . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost') . $dir . '/';
}
function rest_url($path = '')
{
    return anbar_base_url() . 'index.php?api=/' . preg_replace('#^anbar/v1/?#', '', ltrim($path, '/'));
}
function add_query_arg($key, $value, $url)
{
    return $url . (strpos($url, '?') === false ? '?' : '&') . rawurlencode($key) . '=' . rawurlencode($value);
}
function is_ssl()
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443);
}
function nocache_headers()
{
    if (!headers_sent()) {
        header('Cache-Control: no-cache, must-revalidate, max-age=0, no-store, private');
        header('Expires: Wed, 11 Jan 1984 05:00:00 GMT');
    }
}
function trailingslashit($s)
{
    return rtrim($s, '/\\') . '/';
}
function wp_mkdir_p($dir)
{
    return is_dir($dir) || @mkdir($dir, 0755, true);
}
function wp_upload_dir($time = null, $create = true)
{
    $dir = ANBAR_DATA_DIR;
    if (!is_dir($dir)) {
        wp_mkdir_p($dir);
        @file_put_contents($dir . '/.htaccess', "Require all denied\nDeny from all\n");
        @file_put_contents($dir . '/index.php', "<?php // Silence.\n");
    }
    return ['basedir' => $dir];
}
function sanitize_text_field($s)
{
    return trim(preg_replace('/[\r\n\t ]+/', ' ', strip_tags((string) $s)));
}

/** Outgoing HTTP for SMS / messenger bots (short timeout so pages stay fast). */
function wp_remote_post($url, $args = [])
{
    if (!function_exists('curl_init')) {
        return false;
    }
    $ch = curl_init($url);
    $body = $args['body'] ?? '';
    curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_POSTFIELDS => is_array($body) ? http_build_query($body) : $body,
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => empty($args['blocking']) ? 3 : 10, CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER => array_map(function ($k, $v) {
            return "$k: $v";
        }, array_keys($args['headers'] ?? []), $args['headers'] ?? [])]);
    $out = curl_exec($ch);
    curl_close($ch);
    return $out;
}

/* ================================================================ options & transients */

function get_option($name, $default = false)
{
    global $wpdb;
    $v = $wpdb->get_var("SELECT option_value FROM {$wpdb->prefix}options WHERE option_name = '" . esc_sql($name) . "' AND expires IS NULL");
    return $v === null ? $default : json_decode($v, true);
}
function update_option($name, $value)
{
    global $wpdb;
    $wpdb->query("REPLACE INTO {$wpdb->prefix}options (option_name, option_value, expires) VALUES ('" . esc_sql($name) . "', '"
        . esc_sql(wp_json_encode($value)) . "', NULL)");
    return true;
}
function delete_option($name)
{
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->prefix}options WHERE option_name = '" . esc_sql($name) . "'");
    return true;
}
function get_transient($key)
{
    global $wpdb;
    $row = $wpdb->get_row("SELECT option_value, expires FROM {$wpdb->prefix}options WHERE option_name = '" . esc_sql('_t_' . $key) . "'");
    if (!$row || ($row['expires'] && (int) $row['expires'] < time())) {
        return false;
    }
    return json_decode($row['option_value'], true);
}
function set_transient($key, $value, $ttl = 0)
{
    global $wpdb;
    $wpdb->query("REPLACE INTO {$wpdb->prefix}options (option_name, option_value, expires) VALUES ('" . esc_sql('_t_' . $key) . "', '"
        . esc_sql(wp_json_encode($value)) . "', " . (time() + max(1, (int) $ttl)) . ')');
    return true;
}
function delete_transient($key)
{
    return delete_option('_t_' . $key);
}

/* ================================================================ users */

class WP_User
{
    public $ID;
    public $user_login;
    public $user_pass;
    public $display_name;

    public function __construct($row)
    {
        $this->ID = (int) $row['ID'];
        $this->user_login = $row['user_login'];
        $this->user_pass = $row['user_pass'];
        $this->display_name = $row['display_name'];
    }
    public function set_role($role)
    {
    }
}

function get_userdata($id)
{
    global $wpdb;
    $row = $wpdb->get_row("SELECT * FROM {$wpdb->users} WHERE ID = " . (int) $id);
    return $row ? new WP_User($row) : false;
}
function get_user_by($field, $value)
{
    global $wpdb;
    if ($field === 'id' || $field === 'ID') {
        return get_userdata($value);
    }
    $row = $wpdb->get_row("SELECT * FROM {$wpdb->users} WHERE user_login = '" . esc_sql($value) . "'");
    return $row ? new WP_User($row) : false;
}
function username_exists($login)
{
    $u = get_user_by('login', $login);
    return $u ? $u->ID : false;
}
/** Every stored account is an app account; WordPress-only capabilities never apply. */
function user_can($user, $cap)
{
    $u = $user instanceof WP_User ? $user : get_userdata($user);
    return $u && $cap === 'anbar_access';
}
function current_user_can($cap)
{
    return get_current_user_id() ? user_can(get_current_user_id(), $cap) : false;
}
function get_users($args = [])
{
    global $wpdb;
    if (isset($args['capability']) && $args['capability'] !== 'anbar_access') {
        return [];
    }
    $rows = $wpdb->get_results("SELECT * FROM {$wpdb->users} ORDER BY display_name") ?: [];
    if (($args['fields'] ?? '') === 'ID') {
        return array_map(function ($r) {
            return (int) $r['ID'];
        }, $rows);
    }
    return array_map(function ($r) {
        return new WP_User($r);
    }, $rows);
}
function wp_insert_user($data)
{
    global $wpdb;
    $login = trim((string) ($data['user_login'] ?? ''));
    if ($login === '' || username_exists($login)) {
        return new WP_Error('existing_user_login', 'این نام کاربری قبلاً ثبت شده است.');
    }
    $ok = $wpdb->query("INSERT INTO {$wpdb->users} (user_login, user_pass, display_name, user_registered) VALUES ('" . esc_sql($login) . "', '"
        . esc_sql(password_hash((string) $data['user_pass'], PASSWORD_DEFAULT)) . "', '" . esc_sql($data['display_name'] ?? $login) . "', UTC_TIMESTAMP())");
    return $ok === false ? new WP_Error('db', $wpdb->last_error) : $wpdb->insert_id;
}
function wp_update_user($data)
{
    global $wpdb;
    if (isset($data['display_name'])) {
        $wpdb->query("UPDATE {$wpdb->users} SET display_name = '" . esc_sql($data['display_name']) . "' WHERE ID = " . (int) $data['ID']);
    }
    return (int) $data['ID'];
}
function wp_delete_user($id)
{
    global $wpdb;
    $id = (int) $id;
    $wpdb->query("DELETE FROM {$wpdb->users} WHERE ID = $id");
    $wpdb->query("DELETE FROM {$wpdb->prefix}usermeta WHERE user_id = $id");
    $wpdb->query("DELETE FROM {$wpdb->prefix}sessions WHERE user_id = $id");
    return true;
}
function get_user_meta($id, $key, $single = true)
{
    global $wpdb;
    $v = $wpdb->get_var("SELECT meta_value FROM {$wpdb->prefix}usermeta WHERE user_id = " . (int) $id . " AND meta_key = '" . esc_sql($key) . "' LIMIT 1");
    return $v === null ? '' : $v;
}
function update_user_meta($id, $key, $value)
{
    global $wpdb;
    delete_user_meta($id, $key);
    $wpdb->query("INSERT INTO {$wpdb->prefix}usermeta (user_id, meta_key, meta_value) VALUES (" . (int) $id . ", '" . esc_sql($key) . "', '"
        . esc_sql(is_scalar($value) ? (string) $value : wp_json_encode($value)) . "')");
    return true;
}
function delete_user_meta($id, $key)
{
    global $wpdb;
    $wpdb->query("DELETE FROM {$wpdb->prefix}usermeta WHERE user_id = " . (int) $id . " AND meta_key = '" . esc_sql($key) . "'");
    return true;
}
function add_role($role, $name, $caps = [])
{
}
function get_role($role)
{
    return null;
}
function remove_role($role)
{
}

/* ================================================================ sessions, passwords, nonces */

$GLOBALS['anbar_uid'] = 0;
$GLOBALS['anbar_session'] = null;

function get_current_user_id()
{
    return (int) $GLOBALS['anbar_uid'];
}
function is_user_logged_in()
{
    return get_current_user_id() > 0;
}
function wp_check_password($password, $hash, $id = 0)
{
    return password_verify((string) $password, (string) $hash);
}
/** Changing the password signs the account out everywhere (as WordPress does). */
function wp_set_password($password, $id)
{
    global $wpdb;
    $wpdb->query("UPDATE {$wpdb->users} SET user_pass = '" . esc_sql(password_hash((string) $password, PASSWORD_DEFAULT)) . "' WHERE ID = " . (int) $id);
    WP_Session_Tokens::get_instance($id)->destroy_all();
}

function anbar_set_session_cookie($token, $expires)
{
    if (headers_sent()) {
        return;
    }
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/') . '/';
    setcookie(ANBAR_COOKIE, $token, ['expires' => $expires, 'path' => $dir, 'secure' => is_ssl(), 'httponly' => true, 'samesite' => 'Lax']);
}

function wp_set_auth_cookie($id, $remember = true, $secure = false)
{
    global $wpdb;
    $token = bin2hex(random_bytes(32));
    $expires = time() + ANBAR_SESSION_DAYS * DAY_IN_SECONDS;
    $wpdb->query("INSERT INTO {$wpdb->prefix}sessions (token_hash, user_id, expires) VALUES ('" . hash('sha256', $token) . "', " . (int) $id
        . ", FROM_UNIXTIME($expires))");
    anbar_set_session_cookie($token, $expires);
    $GLOBALS['anbar_uid'] = (int) $id;
    $GLOBALS['anbar_session'] = $token;
}

function wp_signon($creds, $secure = false)
{
    $u = get_user_by('login', $creds['user_login'] ?? '');
    if (!$u || !wp_check_password($creds['user_password'] ?? '', $u->user_pass)) {
        return new WP_Error('invalid_credentials', 'نام کاربری یا رمز عبور درست نیست.');
    }
    $u = apply_filters('wp_authenticate_user', $u, $creds['user_password'] ?? '');
    if (is_wp_error($u)) {
        return $u;
    }
    wp_set_auth_cookie($u->ID);
    return $u;
}

function wp_logout()
{
    global $wpdb;
    if ($GLOBALS['anbar_session']) {
        $wpdb->query("DELETE FROM {$wpdb->prefix}sessions WHERE token_hash = '" . hash('sha256', $GLOBALS['anbar_session']) . "'");
    }
    anbar_set_session_cookie('', time() - 3600);
    $GLOBALS['anbar_uid'] = 0;
    $GLOBALS['anbar_session'] = null;
}

class WP_Session_Tokens
{
    private $id;

    public static function get_instance($id)
    {
        $o = new self();
        $o->id = (int) $id;
        return $o;
    }
    public function destroy_all()
    {
        global $wpdb;
        $wpdb->query("DELETE FROM {$wpdb->prefix}sessions WHERE user_id = " . $this->id);
        if ($this->id === get_current_user_id()) {
            $GLOBALS['anbar_uid'] = 0;
            $GLOBALS['anbar_session'] = null;
        }
    }
}

/** Resolve the signed-in account from the session cookie. */
function anbar_compat_load_session()
{
    global $wpdb;
    $token = $_COOKIE[ANBAR_COOKIE] ?? '';
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
        return;
    }
    $uid = $wpdb->get_var("SELECT user_id FROM {$wpdb->prefix}sessions WHERE token_hash = '" . hash('sha256', $token) . "' AND expires > UTC_TIMESTAMP()");
    if ($uid) {
        $GLOBALS['anbar_uid'] = (int) $uid;
        $GLOBALS['anbar_session'] = $token;
    }
}

/** Per-session token that every state-changing API call must carry (protects against cross-site requests). */
function wp_create_nonce($action = 'wp_rest')
{
    return substr(hash_hmac('sha256', $action . '|' . get_current_user_id() . '|' . ($GLOBALS['anbar_session'] ?? ''), ANBAR_SECRET), 0, 16);
}
function wp_verify_nonce($nonce, $action = 'wp_rest')
{
    return is_string($nonce) && hash_equals(wp_create_nonce($action), $nonce);
}
