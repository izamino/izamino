<?php
/* لایه پایگاه داده: MySQL/MariaDB یا SQLite با PDO
   داده‌های کاری هر بخش (نامه‌ها، وظایف، …) یک ردیف JSON در جدول kv است و هر تغییر در یک قفل سراسری و یک تراکنش انجام می‌شود */
if (!defined('KT')) exit;

class KDB {
  public static $pdo; public static $driver; public static $p = 'kt_';
  static function connect($cfg) {
    self::$driver = $cfg['driver'];
    self::$p = $cfg['prefix'] ?? 'kt_';
    if (self::$driver === 'sqlite') {
      self::$pdo = new PDO('sqlite:' . $cfg['path']);
      self::$pdo->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=15000; PRAGMA foreign_keys=ON');
    } else {
      self::$pdo = new PDO('mysql:host=' . $cfg['host'] . ';port=' . ($cfg['port'] ?? 3306) . ';dbname=' . $cfg['name'] . ';charset=utf8mb4', $cfg['user'], $cfg['pass'], [PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4, time_zone = '+00:00'"]);
    }
    self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  }
  static function t($n) { return self::$p . $n; }
  static function q($sql, $args = []) { $s = self::$pdo->prepare($sql); $s->execute($args); return $s; }
  static function one($sql, $args = []) { $r = self::q($sql, $args)->fetch(); return $r === false ? null : $r; }
  static function all($sql, $args = []) { return self::q($sql, $args)->fetchAll(); }
  static function schema() {
    $my = self::$driver !== 'sqlite';
    $txt = $my ? 'LONGTEXT' : 'TEXT'; $ai = $my ? 'BIGINT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $eng = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin' : '';
    $t = fn($n) => self::t($n);
    $sql = [
      "CREATE TABLE IF NOT EXISTS {$t('kv')} (k VARCHAR(64) PRIMARY KEY, v $txt NOT NULL)$eng",
      "CREATE TABLE IF NOT EXISTS {$t('meta')} (k VARCHAR(64) PRIMARY KEY, v TEXT)$eng",
      "CREATE TABLE IF NOT EXISTS {$t('audit')} (id $ai, ts VARCHAR(30), uid VARCHAR(40), nm VARCHAR(200), pos VARCHAR(40), unit INT, act VARCHAR(200), ent VARCHAR(40), rid VARCHAR(80), note TEXT, h CHAR(64))$eng",
      "CREATE TABLE IF NOT EXISTS {$t('sessions')} (id VARCHAR(32) PRIMARY KEY, th CHAR(64), uid VARCHAR(40), csrf VARCHAR(64), start VARCHAR(30), last VARCHAR(30), active INT, endts VARCHAR(30), reason VARCHAR(200), ip VARCHAR(64), agent VARCHAR(120))$eng",
      "CREATE TABLE IF NOT EXISTS {$t('logins')} (id $ai, ts VARCHAR(30), username VARCHAR(80), uid VARCHAR(40), ok INT, reason VARCHAR(120), ip VARCHAR(64), agent VARCHAR(120))$eng",
      "CREATE TABLE IF NOT EXISTS {$t('throttle')} (k VARCHAR(190) PRIMARY KEY, n INT, reset BIGINT)$eng",
      "CREATE TABLE IF NOT EXISTS {$t('files')} (id CHAR(24) PRIMARY KEY, name VARCHAR(200), type VARCHAR(100), size BIGINT, owner VARCHAR(40), ref_col VARCHAR(40), ref_id VARCHAR(60), created VARCHAR(30))$eng",
      "CREATE TABLE IF NOT EXISTS {$t('idem')} (k VARCHAR(80) PRIMARY KEY, uid VARCHAR(40), result $txt, ts BIGINT)$eng"
    ];
    foreach ($sql as $s) self::$pdo->exec($s);
    foreach (['sessions' => 'th', 'audit' => 'unit', 'logins' => 'ts'] as $tb => $col) {
      try { self::$pdo->exec("CREATE INDEX " . self::t($tb . '_' . $col) . " ON " . self::t($tb) . " ($col)"); } catch (Exception $e) { /* موجود است */ }
    }
  }
  static function upsert($table, $k, $v) {
    if (self::$driver === 'sqlite') self::q("INSERT OR REPLACE INTO " . self::t($table) . " (k, v) VALUES (?, ?)", [$k, $v]);
    else self::q("INSERT INTO " . self::t($table) . " (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", [$k, $v]);
  }
  static function meta($k, $d = null) { $r = self::one("SELECT v FROM " . self::t('meta') . " WHERE k = ?", [$k]); return $r ? $r['v'] : $d; }
  static function setMeta($k, $v) { self::upsert('meta', $k, (string)$v); }
  /* قفل سراسری برای اجرای پشت‌سرهم تغییرات */
  static function lock() {
    if (self::$driver === 'sqlite') { self::$pdo->exec('BEGIN IMMEDIATE'); return; }
    $r = self::one("SELECT GET_LOCK(?, 20) AS l", [self::lockName()]);
    if (!$r || (int)$r['l'] !== 1) throw new OpError('سامانه مشغول است؛ چند لحظه بعد دوباره تلاش کنید.');
    self::$pdo->beginTransaction();
  }
  static function unlock($commit) {
    if (self::$driver === 'sqlite') { self::$pdo->exec($commit ? 'COMMIT' : 'ROLLBACK'); return; }
    if (self::$pdo->inTransaction()) { if ($commit) self::$pdo->commit(); else self::$pdo->rollBack(); }
    self::q("SELECT RELEASE_LOCK(?)", [self::lockName()]);
  }
  static function lockName() { return 'kartabl_' . substr(sha1(self::$p . (defined('KT_DB_NAME') ? KT_DB_NAME : '')), 0, 16); }
}

/* ---------- انبار داده کاری ---------- */
const COLLECTIONS = ['positions', 'users', 'posHistory', 'letters', 'lstate', 'drafts', 'orders', 'tasks', 'requests', 'reservations', 'meetings', 'warehouses', 'assets', 'movements',
  'payreqs', 'budgets', 'commitments', 'accounts', 'periods', 'vouchers', 'invoices', 'findocs', 'leaves', 'missions', 'decrees', 'contracts', 'toolrecs', 'messages', 'notifs', 'sms'];
const OBJECTS = ['settings', 'seq', 'flags'];
class Store {
  public static $D; public static $orig = []; public static $ver = 0;
  static function load() {
    $D = new stdClass();
    foreach (COLLECTIONS as $c) $D->$c = [];
    foreach (OBJECTS as $c) $D->$c = new stdClass();
    self::$orig = [];
    foreach (KDB::all("SELECT k, v FROM " . KDB::t('kv')) as $r) { self::$orig[$r['k']] = $r['v']; $D->{$r['k']} = json_decode($r['v']); }
    self::$ver = (int)KDB::meta('ver', 0);
    self::$D = $D;
    return $D;
  }
  static function enc($v) { return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); }
  /* فقط بخش‌های تغییرکرده نوشته می‌شوند؛ شماره نسخه رکوردهای تغییرکرده بالا می‌رود */
  static function save() {
    $D = self::$D; $changed = [];
    foreach (array_merge(COLLECTIONS, OBJECTS) as $c) {
      if (!isset($D->$c)) continue;
      if (is_array($D->$c)) $D->$c = array_values($D->$c);
      $js = self::enc($D->$c);
      if ((self::$orig[$c] ?? null) === $js) continue;
      if (is_array($D->$c) && isset(self::$orig[$c])) {
        $old = []; foreach (json_decode(self::$orig[$c]) ?: [] as $o) if (is_object($o) && isset($o->id)) $old[$o->id] = self::enc($o);
        foreach ($D->$c as $o) if (is_object($o) && isset($o->id) && ($old[$o->id] ?? '') !== self::enc($o)) $o->_v = ($o->_v ?? 0) + 1;
        $js = self::enc($D->$c);
      }
      KDB::upsert('kv', $c, $js);
      self::$orig[$c] = $js; $changed[] = $c;
    }
    if ($changed) { self::$ver++; KDB::setMeta('ver', self::$ver); }
    return $changed;
  }
}
function D() { return Store::$D; }
