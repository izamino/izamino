<?php
/* ورود، نشست، نشانه امنیتی (CSRF) و محدودیت تلاش */
if (!defined('KT')) exit;

function clientIp() { return substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 64); }
function agent() { return mb_substr(preg_replace('/\(.*?\)/', '', (string)($_SERVER['HTTP_USER_AGENT'] ?? '')), 0, 110); }
function isHttps() { return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https') || (int)($_SERVER['SERVER_PORT'] ?? 0) === 443; }
function cookiePath() { $d = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/'); return $d === '' ? '/' : $d . '/'; }
function setSessionCookie($tok, $clear = false) {
  setcookie('kt', $clear ? '' : $tok, ['expires' => $clear ? time() - 3600 : 0, 'path' => cookiePath(), 'httponly' => true, 'samesite' => 'Strict', 'secure' => isHttps()]);
}
/* شمارنده محدودیت: فقط تلاش‌های ناموفق شمرده می‌شوند */
function throttleHit($key, $windowSec) {
  $now = time(); $r = KDB::one("SELECT n, reset FROM " . KDB::t('throttle') . " WHERE k = ?", [$key]);
  if (!$r || $r['reset'] < $now) { $n = 1; $reset = $now + $windowSec; } else { $n = $r['n'] + 1; $reset = $r['reset']; }
  if (KDB::$driver === 'sqlite') KDB::q("INSERT OR REPLACE INTO " . KDB::t('throttle') . " (k, n, reset) VALUES (?,?,?)", [$key, $n, $reset]);
  else KDB::q("INSERT INTO " . KDB::t('throttle') . " (k, n, reset) VALUES (?,?,?) ON DUPLICATE KEY UPDATE n = VALUES(n), reset = VALUES(reset)", [$key, $n, $reset]);
  return $n;
}
function throttleCount($key) { $r = KDB::one("SELECT n, reset FROM " . KDB::t('throttle') . " WHERE k = ?", [$key]); return ($r && $r['reset'] >= time()) ? (int)$r['n'] : 0; }
function throttleClear($key) { KDB::q("DELETE FROM " . KDB::t('throttle') . " WHERE k = ?", [$key]); }

function canEnter($u) {
  if (!$u || !empty($u->deleted)) return 'نام کاربری یا رمز عبور درست نیست.';
  if (empty($u->active)) return 'این حساب کاربری غیرفعال شده است. با مدیریت فناوری اطلاعات تماس بگیرید.';
  $p = posById($u->posId ?? ''); if (!$p) return 'برای این حساب جایگاه سازمانی تعریف نشده است.';
  if (!empty(D()->settings->maintenance) && !permOf($p, 'admin.settings')) return 'سامانه در حالت به‌روزرسانی است و فعلاً فقط مدیر سامانه وارد می‌شود.';
  return '';
}
function logLogin($username, $u, $ok, $reason) {
  KDB::q("INSERT INTO " . KDB::t('logins') . " (ts, username, uid, ok, reason, ip, agent) VALUES (?,?,?,?,?,?,?)", [stamp(), mb_substr($username, 0, 80), $u ? $u->id : '', $ok ? 1 : 0, $reason, clientIp(), agent()]);
}
/* نشست جاری از روی کوکی؛ پایان مهلت بی‌فعالیتی یا غیرفعال‌شدن حساب = پایان نشست */
function authSession() {
  $tok = $_COOKIE['kt'] ?? ''; if (!$tok || strlen($tok) !== 64 || !ctype_xdigit($tok)) return null;
  $s = KDB::one("SELECT * FROM " . KDB::t('sessions') . " WHERE th = ?", [hash('sha256', $tok)]);
  if (!$s) return null;
  if ((int)$s['active'] !== 1) return ['ended' => $s['reason'] ?: 'نشست شما پایان یافته است؛ دوباره وارد شوید.'];
  $u = userById($s['uid']); $why = canEnter($u);
  $idleMin = (int)(D()->settings->security->sessionMin ?? 120);
  $idle = time() - strtotime($s['last']) > $idleMin * 60;
  if ($why || $idle) {
    $msg = $idle ? 'به دلیل ' . fa($idleMin) . ' دقیقه بی‌فعالیتی، از سامانه خارج شدید.' : $why;
    KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE id = ?", [stamp(), $msg, $s['id']]);
    return ['ended' => $msg];
  }
  return ['s' => $s, 'user' => $u, 'pos' => posById($u->posId)];
}
function touchSession($a, $force = false) {
  if (!$force && time() - strtotime($a['s']['last']) < 30) return;
  KDB::q("UPDATE " . KDB::t('sessions') . " SET last = ? WHERE id = ?", [stamp(), $a['s']['id']]);
}
function setMeFrom($a) { $GLOBALS['ME'] = ['user' => $a['user'], 'pos' => $a['pos'], 'sid' => $a['s']['id']]; }

function doLogin($username, $password) {
  $username = strtolower(trim(en((string)$username))); $password = en((string)$password);
  $ip = clientIp();
  if (throttleCount('ip:' . $ip) >= 60) return ['error' => 'تلاش‌های ناموفق از این شبکه زیاد بوده است؛ ۱۵ دقیقه دیگر دوباره تلاش کنید.', 'code' => 429];
  KDB::lock(); $ok = false;
  try {
    Store::load();
    $u = null; foreach (D()->users as $x) if (strtolower($x->username ?? '') === $username && empty($x->deleted)) $u = $x;
    $sec = D()->settings->security;
    if (!$u) { throttleHit('ip:' . $ip, 900); logLogin($username, null, false, 'نام کاربری ناموجود'); $ok = true; return ['error' => 'نام کاربری یا رمز عبور درست نیست.']; }
    if (!empty($u->lockedUntil) && strtotime($u->lockedUntil) > time()) { logLogin($username, $u, false, 'حساب قفل'); $ok = true; return ['error' => 'حساب به دلیل تلاش‌های ناموفق تا ساعت ' . fa((new DateTime($u->lockedUntil))->setTimezone(new DateTimeZone('Asia/Tehran'))->format('H:i')) . ' قفل است. مدیر فناوری اطلاعات می‌تواند قفل را زودتر باز کند.']; }
    if (!password_verify($password, $u->pass ?? '')) {
      throttleHit('ip:' . $ip, 900);
      $u->fails = ($u->fails ?? 0) + 1;
      if ($u->fails >= $sec->maxFails) {
        $u->lockedUntil = gmdate('Y-m-d\TH:i:s\Z', time() + $sec->lockMin * 60); $u->fails = 0;
        notify([unitPosId(U_IT, 'manager')], 'request', 'حساب ' . $u->username . ' پس از ' . fa($sec->maxFails) . ' تلاش ناموفق قفل شد.', 'admin', $u->username);
        Store::save(); logLogin($username, $u, false, 'قفل‌شدن حساب'); $ok = true;
        return ['error' => 'به دلیل ' . fa($sec->maxFails) . ' تلاش ناموفق، حساب برای ' . fa($sec->lockMin) . ' دقیقه قفل شد.'];
      }
      Store::save(); logLogin($username, $u, false, 'رمز نادرست'); $ok = true;
      return ['error' => 'نام کاربری یا رمز عبور درست نیست. (' . fa($sec->maxFails - $u->fails) . ' تلاش دیگر تا قفل‌شدن حساب)'];
    }
    $why = canEnter($u);
    if ($why) { logLogin($username, $u, false, $why); $ok = true; return ['error' => $why]; }
    if (password_needs_rehash($u->pass, PASSWORD_DEFAULT)) $u->pass = password_hash($password, PASSWORD_DEFAULT);
    $u->fails = 0; $u->lockedUntil = ''; $u->lastLogin = stamp();
    $tok = bin2hex(random_bytes(32)); $sid = bin2hex(random_bytes(12)); $csrf = bin2hex(random_bytes(20));
    KDB::q("INSERT INTO " . KDB::t('sessions') . " (id, th, uid, csrf, start, last, active, endts, reason, ip, agent) VALUES (?,?,?,?,?,?,1,'','',?,?)", [$sid, hash('sha256', $tok), $u->id, $csrf, stamp(), stamp(), $ip, agent()]);
    $GLOBALS['ME'] = ['user' => $u, 'pos' => posById($u->posId), 'sid' => $sid];
    audit('ورود به سامانه', 'session', $u->id, '');
    Store::save(); flushAudit(); logLogin($username, $u, true, 'ورود موفق'); $ok = true;
    setSessionCookie($tok);
    return ['ok' => true, 'csrf' => $csrf, 'sid' => $sid];
  } finally { KDB::unlock($ok); }
}
