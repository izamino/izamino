<?php
/* درگاه برنامه: همه درخواست‌های رابط کاربری از اینجا عبور می‌کنند */
require __DIR__ . '/lib/boot.php';

function out($code, $body, $extraHeaders = []) {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  header('X-Content-Type-Options: nosniff');
  header('Referrer-Policy: same-origin');
  header('X-Frame-Options: DENY');
  foreach ($extraHeaders as $h) header($h);
  echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}
if (!kt_boot()) out(503, ['error' => 'سامانه هنوز نصب نشده است.', 'install' => true]);

$r = $_GET['r'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$mutating = $method !== 'GET';
if ($mutating) {
  if (($_SERVER['HTTP_X_KARTABL'] ?? '') !== '1') out(403, ['error' => 'درخواست نامعتبر است.']);
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if ($origin && parse_url($origin, PHP_URL_HOST) !== parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) out(403, ['error' => 'درخواست از مبدأ دیگر پذیرفته نمی‌شود.']);
}
function body($limit = 2097152) {
  $raw = file_get_contents('php://input', false, null, 0, $limit + 1);
  if (strlen($raw) > $limit) out(413, ['error' => 'حجم درخواست بیش از حد مجاز است.']);
  if ($raw === '') return [];
  $j = json_decode($raw);
  if ($j === null && json_last_error() !== JSON_ERROR_NONE) out(400, ['error' => 'بدنه درخواست معتبر نیست.']);
  return $j;
}
function stateFor($a) { setMeFrom($a); return ['state' => viewFor(), 'csrf' => $a['s']['csrf'], 'session' => ['id' => $a['s']['id'], 'start' => $a['s']['start']]]; }
function publicOut($msg = '', $clear = false) { Store::load(); out(200, ['public' => publicView(), 'message' => $msg], $clear ? [] : []); }

/* کارهای دوره‌ای در نبود زمان‌بندی هاست */
try { runMaintenance(false); } catch (Throwable $e) { /* در درخواست بعدی دوباره */ }

if ($r === 'login' && $method === 'POST') {
  $b = body(); $res = doLogin($b->username ?? '', $b->password ?? '');
  if (!empty($res['error'])) { Store::load(); out($res['code'] ?? 400, ['error' => $res['error'], 'public' => publicView()]); }
  Store::load();
  $a = ['s' => KDB::one("SELECT * FROM " . KDB::t('sessions') . " WHERE id = ?", [$res['sid']])]; $a['user'] = userById($a['s']['uid']); $a['pos'] = posById($a['user']->posId);
  out(200, stateFor($a));
}
/* خروج همیشه موفق است؛ حتی اگر نشست قبلاً تمام شده باشد */
if ($r === 'logout' && $method === 'POST') {
  Store::load(); $a = authSession();
  if ($a && empty($a['ended'])) { KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE id = ?", [stamp(), 'خروج کاربر', $a['s']['id']]); }
  setSessionCookie('', true);
  out(200, ['ok' => true, 'public' => publicView()]);
}
if ($r === 'cron') {
  $c = kt_config(); Store::load();
  $key = D()->settings->cronKey ?? ''; if (!$key || !hash_equals($key, (string)($_GET['key'] ?? ''))) out(403, ['error' => 'کلید زمان‌بندی نادرست است.']);
  $res = runMaintenance(true, 'cron');
  out(200, ['ok' => true, 'backup' => $res['backup'] ?? null]);
}

Store::load();
$a = authSession();
if ($r === 'state' && $method === 'GET') {
  if (!$a || !empty($a['ended'])) { if ($a) setSessionCookie('', true); out(200, ['public' => publicView(), 'message' => $a['ended'] ?? '']); }
  touchSession($a);
  out(200, stateFor($a));
}
if ($r === 'ver' && $method === 'GET') {
  if (!$a || !empty($a['ended'])) out(200, ['auth' => false, 'message' => $a['ended'] ?? '']);
  $unread = 0; foreach (D()->notifs as $n) if ($n->pos === $a['pos']->id && empty($n->read)) $unread++;
  out(200, ['auth' => true, 'ver' => Store::$ver, 'unread' => $unread]);
}
if (!$a || !empty($a['ended'])) { setSessionCookie('', true); out(401, ['error' => $a['ended'] ?? 'نشست شما پایان یافته است؛ دوباره وارد شوید.', 'ended' => true]); }
if ($mutating && !hash_equals($a['s']['csrf'], (string)($_SERVER['HTTP_X_CSRF'] ?? ''))) out(403, ['error' => 'نشانه امنیتی درخواست کهنه است؛ صفحه به‌روز شد، دوباره تلاش کنید.', 'csrf' => true]);
if ($mutating && throttleHit('u:' . $a['user']->id, 60) > 400) out(429, ['error' => 'تعداد درخواست‌ها زیاد است؛ چند لحظه صبر کنید.']);
setMeFrom($a);

if ($r === 'ping' && $method === 'POST') { touchSession($a, true); out(200, ['ok' => true]); }

if ($r === 'cmd' && $method === 'POST') {
  $b = body();
  $name = (string)($b->name ?? ''); $args = is_array($b->args ?? null) ? $b->args : null;
  $OPS = $GLOBALS['OPS'];
  if (!isset($OPS[$name]) || $args === null) out(400, ['error' => 'عملیات ناشناخته است.']);
  $idem = preg_match('/^[a-z0-9]{8,40}$/i', (string)($b->idem ?? '')) ? $a['user']->id . ':' . $b->idem : '';
  KDB::lock(); $commit = false; $resp = null;
  try {
    Store::load(); $GLOBALS['AUDIT_BUF'] = [];
    $a['user'] = userById($a['user']->id); $a['pos'] = posById($a['user']->posId); setMeFrom($a);
    /* جلوگیری از ثبت تکراری (دوبار زدن دکمه یا تلاش دوباره در اینترنت کند) */
    if ($idem && ($prev = KDB::one("SELECT result FROM " . KDB::t('idem') . " WHERE k = ?", [$idem]))) { $commit = true; $resp = [200, ['result' => json_decode($prev['result']), 'repeat' => true]]; }
    else {
      /* کنترل تعارض: اگر رکوردی که کاربر دیده در این فاصله تغییر کرده باشد، عملیات اجرا نمی‌شود */
      if (isset($b->ver->col, $b->ver->id) && in_array($b->ver->col, COLLECTIONS, true)) {
        $cur = findRec($b->ver->col, (string)$b->ver->id);
        if ($cur && (int)($cur->_v ?? 0) !== (int)$b->ver->v) { $commit = true; $resp = [409, ['conflict' => true, 'error' => 'این مورد در این فاصله توسط کاربر دیگری تغییر کرده است. آخرین نسخه نمایش داده شد؛ دوباره بررسی و اقدام کنید.']]; }
      }
      if (!$resp) {
        try {
          $res = $OPS[$name](...$args);
          $changed = Store::save(); bindFiles($changed); flushAudit();
          if ($idem) KDB::q("INSERT INTO " . KDB::t('idem') . " (k, uid, result, ts) VALUES (?,?,?,?)", [$idem, $a['user']->id, json_encode($res, JSON_UNESCAPED_UNICODE), (int)(microtime(true) * 1000)]);
          $commit = true; $resp = [200, ['result' => $res]];
        } catch (OpError $e) { $resp = [400, ['error' => $e->getMessage()]]; }
        catch (ArgumentCountError $e) { $resp = [400, ['error' => 'ورودی عملیات ناقص است.']]; }
        catch (TypeError $e) { $resp = [400, ['error' => 'ورودی عملیات نامعتبر است.']]; }
      }
    }
  } catch (Throwable $e) { error_log('kartabl: ' . $e->getMessage() . ' @' . $e->getFile() . ':' . $e->getLine()); $resp = [500, ['error' => 'خطای داخلی سرور؛ عملیات انجام نشد.']]; }
  finally { KDB::unlock($commit); }
  if ($resp[0] !== 200) Store::load();
  touchSession($a, true);
  $a2 = authSession();
  if (!$a2 || !empty($a2['ended'])) { setSessionCookie('', true); $resp[1]['ended'] = $a2['ended'] ?? 'نشست شما پایان یافت.'; out($resp[0] === 200 ? 200 : $resp[0], $resp[1]); }
  out($resp[0], array_merge($resp[1], stateFor($a2)));
}

/* ---------- فایل‌ها ---------- */
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'txt', 'csv', 'zip', 'rar', '7z', 'mp3', 'm4a', 'mp4'];
const INLINE = ['pdf' => 'application/pdf', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'webp' => 'image/webp'];
if ($r === 'upload' && $method === 'POST') {
  $name = mb_substr(preg_replace('/[\\\\\/\x00-\x1f<>"]/u', '_', (string)($_GET['name'] ?? '')), 0, 180);
  $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
  if (!$name || !in_array($ext, ALLOWED_EXT)) out(415, ['error' => 'نوع فایل «' . ($ext ?: 'نامشخص') . '» مجاز نیست. انواع مجاز: ' . implode('، ', ALLOWED_EXT)]);
  $len = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
  if ($len > KT_MAX_UPLOAD) out(413, ['error' => 'حجم فایل بیشتر از ' . fa(KT_MAX_UPLOAD / 1048576) . ' مگابایت است.']);
  $dir = KT_DATA . '/files'; if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $id = bin2hex(random_bytes(12));
  $in = fopen('php://input', 'rb'); $outf = fopen($dir . '/' . $id, 'wb'); $size = 0;
  while (!feof($in)) { $chunk = fread($in, 65536); if ($chunk === false) break; $size += strlen($chunk); if ($size > KT_MAX_UPLOAD) { fclose($outf); @unlink($dir . '/' . $id); out(413, ['error' => 'حجم فایل بیش از حد مجاز است.']); } fwrite($outf, $chunk); }
  fclose($in); fclose($outf);
  if (!$size) { @unlink($dir . '/' . $id); out(400, ['error' => 'فایل خالی است یا هاست اجازه بارگذاری این حجم را نمی‌دهد (post_max_size).']); }
  $type = INLINE[$ext] ?? 'application/octet-stream';
  if (isset(INLINE[$ext]) && function_exists('finfo_open')) { $fi = finfo_open(FILEINFO_MIME_TYPE); $real = finfo_file($fi, $dir . '/' . $id); finfo_close($fi); if ($real !== $type && !($type === 'image/jpeg' && $real === 'image/pjpeg')) $type = 'application/octet-stream'; }
  KDB::q("INSERT INTO " . KDB::t('files') . " (id, name, type, size, owner, ref_col, ref_id, created) VALUES (?,?,?,?,?,NULL,NULL,?)", [$id, $name, $type, $size, $a['user']->id, stamp()]);
  out(200, ['id' => $id, 'name' => $name, 'size' => $size, 'type' => $type, 'url' => 'api.php?r=file&id=' . $id]);
}
if ($r === 'file' && $method === 'GET') {
  $id = (string)($_GET['id'] ?? ''); if (!preg_match('/^[a-f0-9]{24}$/', $id)) out(404, ['error' => 'فایل یافت نشد.']);
  $f = KDB::one("SELECT * FROM " . KDB::t('files') . " WHERE id = ?", [$id]);
  if (!$f || !is_file(KT_DATA . '/files/' . $id)) out(404, ['error' => 'فایل یافت نشد.']);
  if (!fileVisible($f)) out(403, ['error' => 'اجازه مشاهده این فایل را ندارید.']);
  $inline = $f['type'] !== 'application/octet-stream';
  header('Content-Type: ' . $f['type']); header('Content-Length: ' . $f['size']); header('Cache-Control: private, no-store');
  header("Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox"); header('X-Content-Type-Options: nosniff');
  header('Content-Disposition: ' . ($inline ? 'inline' : 'attachment') . "; filename*=UTF-8''" . rawurlencode($f['name']));
  readfile(KT_DATA . '/files/' . $id); exit;
}

/* ---------- پشتیبان‌گیری ---------- */
if (in_array($r, ['backups', 'backup', 'backupdl', 'backupcheck', 'restore'])) {
  if (!can('admin.backup')) out(403, ['error' => 'پشتیبان‌گیری برای جایگاه شما مجاز نیست.']);
  if ($r === 'backups') { $l = []; foreach (scandir(backupDir()) as $f) if (preg_match(BK_RE, $f)) $l[] = ['name' => $f, 'size' => filesize(backupDir() . '/' . $f)]; rsort($l); out(200, ['list' => $l, 'cron' => D()->settings->cronKey ?? '']); }
  if ($r === 'backupdl') {
    $n = (string)($_GET['name'] ?? ''); if (!preg_match(BK_RE, $n) || !is_file(backupDir() . '/' . $n)) out(404, ['error' => 'فایل یافت نشد.']);
    KDB::lock(); try { audit('دریافت نسخه پشتیبان', 'backup', $n, ''); flushAudit(); } finally { KDB::unlock(true); }
    header('Content-Type: application/gzip'); header('Content-Disposition: attachment; filename="' . $n . '"'); header('Cache-Control: no-store'); readfile(backupDir() . '/' . $n); exit;
  }
  if ($r === 'backup' && $method === 'POST') {
    KDB::lock(); $ok = false;
    try { Store::load(); $e = createBackup('manual', $a['user']->name); audit('تهیه نسخه پشتیبان', 'backup', $e->name, $e->ok ? 'موفق' : $e->error); Store::save(); flushAudit(); $ok = true; } finally { KDB::unlock($ok); }
    if (!$e->ok) out(500, ['error' => 'پشتیبان‌گیری ناموفق بود: ' . $e->error] + stateFor($a));
    out(200, ['entry' => $e] + stateFor($a));
  }
  if (($r === 'backupcheck' || $r === 'restore') && $method === 'POST') {
    $n = (string)($_GET['name'] ?? '');
    if ($n !== '') { if (!preg_match(BK_RE, $n)) out(400, ['error' => 'نام فایل نامعتبر است.']); $p = readBackupFile(backupDir() . '/' . $n); }
    else { $raw = file_get_contents('php://input', false, null, 0, 300 * 1048576); $js = substr($raw, 0, 2) === "\x1f\x8b" ? @gzdecode($raw) : $raw; $p = $js ? json_decode($js, true) : null; }
    if (!$p) out(400, ['error' => 'فایل پشتیبان خوانده نشد.']);
    $errs = checkBackup($p);
    if ($r === 'backupcheck') {
      KDB::lock(); $ok = false;
      try { Store::load(); D()->settings->lastCheck = (object)['ts' => stamp(), 'ok' => !$errs, 'msg' => $errs ? implode(' | ', $errs) : backupSummary($p), 'name' => $n ?: 'فایل بارگذاری‌شده']; audit('آزمون بازیابی پشتیبان', 'backup', $n, $errs ? 'ناموفق' : 'موفق'); Store::save(); flushAudit(); $ok = true; } finally { KDB::unlock($ok); }
      out(200, ['ok' => !$errs, 'errors' => $errs, 'summary' => $errs ? '' : backupSummary($p)] + stateFor($a));
    }
    if ($errs) out(400, ['error' => 'نسخه پشتیبان معتبر نیست: ' . implode(' | ', $errs)]);
    KDB::lock(); $ok = false;
    try {
      Store::load(); createBackup('pre-restore', $a['user']->name); Store::save();
      KDB::q("DELETE FROM " . KDB::t('kv'));
      foreach ($p['data'] as $k => $v) if (in_array($k, COLLECTIONS, true) || in_array($k, OBJECTS, true)) KDB::upsert('kv', $k, json_encode($v, JSON_UNESCAPED_UNICODE));
      Store::load(); $GLOBALS['ME'] = null; setMeFrom($a);
      KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE active = 1 AND id <> ?", [stamp(), 'بازیابی نسخه پشتیبان', $a['s']['id']]);
      audit('بازیابی نسخه پشتیبان', 'backup', $n, backupSummary($p)); flushAudit();
      Store::$ver++; KDB::setMeta('ver', Store::$ver); $ok = true;
    } finally { KDB::unlock($ok); }
    $a2 = authSession(); if (!$a2 || !empty($a2['ended'])) out(200, ['ok' => true, 'ended' => 'پس از بازیابی دوباره وارد شوید.']);
    out(200, ['ok' => true] + stateFor($a2));
  }
}
if ($r === 'smstest' && $method === 'POST') {
  if (!can('admin.settings')) out(403, ['error' => 'مجاز نیست.']);
  $b = body(); $to = cleanPhone($b->to ?? ''); if (!preg_match('/^0?9\d{9}$/', $to)) out(400, ['error' => 'شماره همراه معتبر نیست.']);
  KDB::lock(); $ok = false;
  try { Store::load(); $m = (object)['id' => uid(), 'to' => $to, 'name' => 'آزمایش', 'text' => (D()->settings->orgName ?? '') . ': پیامک آزمایشی کارتابل', 'ts' => stamp(), 'status' => 'در صف ارسال']; D()->sms[] = $m; smsTick(); audit('ارسال پیامک آزمایشی', 'sms', $m->id, ''); Store::save(); flushAudit(); $ok = true; } finally { KDB::unlock($ok); }
  out(200, ['status' => $m->status, 'error' => $m->lastError ?? ''] + stateFor($a));
}
out(404, ['error' => 'یافت نشد.']);
