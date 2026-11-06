<?php
/* کارهای دوره‌ای: اعلان مهلت‌ها، پاک‌سازی، پشتیبان روزانه، ارسال پیامک
   با «زمان‌بندی کارها» (Cron) هاست هر چند دقیقه یک بار اجرا می‌شود؛ اگر زمان‌بندی تنظیم نشده باشد، با بازدید کاربران اجرا می‌شود */
if (!defined('KT')) exit;

function sweepDeadlines() {
  $t = todayISO(); $F = D()->flags; $me = $GLOBALS['ME']; $GLOBALS['ME'] = null;
  $chk = function ($kind, $x, $due, $done, $targets, $label, $link, $open) use ($t, $F) {
    if (!$due || $done) return;
    $d = daysBetween($t, $due);
    if ($d < 0 && empty($F->{$kind . $x->id . 'o'})) { $F->{$kind . $x->id . 'o'} = 1; notify($targets, 'overdue', $label . ' «' . ($x->title ?? $x->subject ?? $x->no) . '» معوق شد.', $link, $x->no ?? '', $open); }
    elseif ($d >= 0 && $d <= 2 && empty($F->{$kind . $x->id . 'd'})) { $F->{$kind . $x->id . 'd'} = 1; notify($targets, 'due', 'مهلت ' . $label . ' «' . ($x->title ?? $x->subject ?? $x->no) . '» نزدیک است (' . jd($due) . ').', $link, $x->no ?? '', $open); }
  };
  foreach (D()->tasks as $k) $chk('t', $k, $k->due ?? '', $k->status === 'تکمیل‌شده', array_merge([$k->assignee], unitHeads($k->unitId)), 'وظیفه', 'tasks', ['k' => 'task', 'id' => $k->id]);
  foreach (D()->orders as $o) { $tg = [$o->respPos, imamPos()]; foreach ($o->units as $u) $tg = array_merge($tg, unitHeads($u)); $chk('o', $o, $o->due ?? '', $o->status === 'تکمیل‌شده', $tg, 'دستور', 'orders', ['k' => 'order', 'id' => $o->id]); }
  foreach (D()->toolrecs as $r) { $tl = toolOf($r); if (!$tl || !empty($r->deleted)) continue; $r->title = $r->data->title ?? $tl['t']; $chk('k', $r, $r->due ?? '', in_array($r->status, $tl['fin']), array_filter([$r->assignee ?? '', unitPosId($r->unitId, 'manager')]), $tl['t'], 'unit-' . $r->unitId, ['k' => 'tool', 'id' => $r->id]); unset($r->title); }
  foreach (D()->letters as $l) { if (empty($l->due) || !$l->refs) continue; $last = end($l->refs); $chk('l', $l, $l->due, in_array($l->status, ['پاسخ داده‌شده', 'مختومه']), $last->unitId === 0 ? [imamPos()] : unitHeads($last->unitId), 'اقدام نامه', 'letters', ['k' => 'letter', 'id' => $l->id]); }
  $GLOBALS['ME'] = $me;
}
function pruneData() {
  $D = D();
  /* اعلان‌ها: خوانده‌شده‌های قدیمی‌تر از ۹۰ روز حذف؛ حداکثر ۱۵۰۰ اعلان برای هر جایگاه */
  $cut = gmdate('Y-m-d', time() - 90 * 86400); $per = []; $keep = [];
  foreach (array_reverse($D->notifs) as $n) { if (!empty($n->read) && $n->ts < $cut) continue; $per[$n->pos] = ($per[$n->pos] ?? 0) + 1; if ($per[$n->pos] <= 1500) $keep[] = $n; }
  $D->notifs = array_reverse($keep);
  if (count($D->sms) > 3000) $D->sms = array_slice($D->sms, -2000);
  KDB::q("DELETE FROM " . KDB::t('idem') . " WHERE ts < ?", [(time() - 2 * 86400) * 1000]);
  KDB::q("DELETE FROM " . KDB::t('throttle') . " WHERE reset < ?", [time()]);
  KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE active = 1 AND last < ?", [stamp(), 'پایان مهلت بی‌فعالیتی', gmdate('Y-m-d\TH:i:s', time() - (int)(D()->settings->security->sessionMin ?? 120) * 60)]);
}

/* ---------- پشتیبان‌گیری ---------- */
function backupDir() { $d = KT_DATA . '/backups'; if (!is_dir($d)) @mkdir($d, 0700, true); return $d; }
const BK_RE = '/^kartabl-\d{8}-\d{6}-(auto|manual|pre-restore|cron)\.json\.gz$/';
function backupPayload() {
  $kv = []; foreach (KDB::all("SELECT k, v FROM " . KDB::t('kv')) as $r) $kv[$r['k']] = json_decode($r['v']);
  return ['kartabl' => 3, 'ts' => stamp(), 'data' => $kv,
    'audit' => KDB::all("SELECT ts, uid, nm, pos, unit, act, ent, rid, note, h FROM " . KDB::t('audit') . " ORDER BY id"),
    'files' => KDB::all("SELECT * FROM " . KDB::t('files'))];
}
function createBackup($kind, $by = 'سامانه (خودکار)') {
  $name = 'kartabl-' . gmdate('Ymd-His') . '-' . $kind . '.json.gz';
  $entry = ['ts' => stamp(), 'name' => $name, 'kind' => $kind, 'by' => $by, 'ok' => false, 'size' => 0, 'error' => ''];
  try {
    $js = json_encode(backupPayload(), JSON_UNESCAPED_UNICODE);
    $gz = gzencode($js, 6);
    if ($gz === false || file_put_contents(backupDir() . '/' . $name . '.tmp', $gz) === false) throw new Exception('نوشتن فایل پشتیبان ممکن نشد (دسترسی پوشه data را بررسی کنید).');
    rename(backupDir() . '/' . $name . '.tmp', backupDir() . '/' . $name);
    $entry['ok'] = true; $entry['size'] = strlen($gz);
    $all = array_values(array_filter(scandir(backupDir()), fn($f) => preg_match(BK_RE, $f))); sort($all);
    foreach (array_slice($all, 0, max(0, count($all) - 45)) as $f) @unlink(backupDir() . '/' . $f);
  } catch (Throwable $e) { $entry['error'] = $e->getMessage(); }
  $b = arr(D()->settings->backups ?? []); $b[] = (object)$entry; D()->settings->backups = array_slice($b, -60);
  return (object)$entry;
}
function lastAutoBackup() { $t = ''; foreach (arr(D()->settings->backups ?? []) as $b) if (!empty($b->ok) && in_array($b->kind, ['auto', 'cron'])) $t = $b->ts; return $t; }
/* بررسی کامل یک نسخه پشتیبان بدون جایگزینی (آزمون بازیابی) */
function checkBackup($p) {
  $errs = [];
  if (!is_array($p) || ($p['kartabl'] ?? 0) !== 3 || !isset($p['data'])) return ['فایل، نسخه پشتیبان این سامانه نیست.'];
  $d = $p['data'];
  foreach (COLLECTIONS as $c) if (isset($d[$c]) && !is_array($d[$c])) $errs[] = 'بخش «' . $c . '» باید فهرست باشد.';
  if (empty($d['positions']) || empty($d['users']) || empty($d['settings'])) $errs[] = 'بخش‌های ضروری (جایگاه‌ها، حساب‌ها، تنظیمات) ناقص است.';
  $hasImam = false; foreach ($d['positions'] ?? [] as $x) if (($x['role'] ?? '') === 'imam') $hasImam = true;
  if (!$hasImam) $errs[] = 'جایگاه امام جماعت در نسخه پشتیبان نیست.';
  $names = [];
  foreach ($d['users'] ?? [] as $u) { if (empty($u['username']) || empty($u['pass'])) { $errs[] = 'حساب ناقص در نسخه پشتیبان.'; break; } if (empty($u['deleted'])) { if (isset($names[$u['username']])) $errs[] = 'نام کاربری تکراری: ' . $u['username']; $names[$u['username']] = 1; } }
  foreach (['letters', 'tasks', 'requests', 'orders'] as $c) foreach ($d[$c] ?? [] as $r) if (empty($r['id'])) { $errs[] = 'رکورد بدون شناسه در «' . $c . '».'; break; }
  return array_slice($errs, 0, 20);
}
function backupSummary($p) { $d = $p['data']; $n = fn($c) => fa(count($d[$c] ?? [])); return 'نامه: ' . $n('letters') . ' · وظیفه: ' . $n('tasks') . ' · درخواست: ' . $n('requests') . ' · سند: ' . $n('vouchers') . ' · حساب: ' . $n('users') . ' · رویداد: ' . fa(count($p['audit'] ?? [])); }
function readBackupFile($path) { $raw = @file_get_contents($path); if ($raw === false) return null; $js = substr($raw, 0, 2) === "\x1f\x8b" ? @gzdecode($raw) : $raw; return $js === false ? null : json_decode($js, true); }

/* ---------- پیامک ---------- */
function smsSend($cfg, $m) {
  if (!function_exists('curl_init')) return ['ok' => false, 'error' => 'افزونه curl روی هاست فعال نیست', 'fatal' => true];
  $ch = curl_init();
  if ($cfg->provider === 'kavenegar') {
    curl_setopt_array($ch, [CURLOPT_URL => 'https://api.kavenegar.com/v1/' . rawurlencode($cfg->apiKey) . '/sms/send.json', CURLOPT_POST => true,
      CURLOPT_POSTFIELDS => http_build_query(array_filter(['receptor' => $m->to, 'message' => $m->text, 'sender' => $cfg->sender ?: null]))]);
  } elseif ($cfg->provider === 'webhook') {
    curl_setopt_array($ch, [CURLOPT_URL => $cfg->webhook, CURLOPT_POST => true, CURLOPT_HTTPHEADER => ['Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode(['to' => $m->to, 'text' => $m->text, 'id' => $m->id])]);
  } else return ['ok' => false, 'error' => 'سرویس پیامک تنظیم نشده است', 'fatal' => true];
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 12]);
  $res = curl_exec($ch); $code = curl_getinfo($ch, CURLINFO_HTTP_CODE); $err = curl_error($ch); curl_close($ch);
  if ($res === false) return ['ok' => false, 'error' => 'خطای شبکه: ' . $err];
  if ($cfg->provider === 'kavenegar') { $j = json_decode($res, true); return ($code === 200 && ($j['return']['status'] ?? 0) === 200) ? ['ok' => true, 'pid' => (string)($j['entries'][0]['messageid'] ?? '')] : ['ok' => false, 'error' => $j['return']['message'] ?? ('پاسخ ' . $code)]; }
  return $code >= 200 && $code < 300 ? ['ok' => true, 'pid' => ''] : ['ok' => false, 'error' => 'پاسخ ' . $code];
}
function smsTick() {
  $cfg = D()->settings->sms ?? null;
  $ready = $cfg && !empty($cfg->enabled) && (($cfg->provider === 'kavenegar' && !empty($cfg->apiKey)) || ($cfg->provider === 'webhook' && !empty($cfg->webhook)));
  $n = 0;
  foreach (D()->sms as $m) {
    if ($m->status !== 'در صف ارسال' || (!empty($m->next) && $m->next > time())) continue;
    if (++$n > 20) break;
    $r = $ready ? smsSend($cfg, $m) : ['ok' => false, 'error' => 'سرویس پیامک فعال یا تنظیم نشده است', 'fatal' => true];
    $m->tries = ($m->tries ?? 0) + 1; $m->lastTry = stamp();
    if ($r['ok']) { $m->status = 'ارسال‌شده'; $m->pid = $r['pid']; $m->sentAt = stamp(); $m->lastError = ''; }
    elseif (!empty($r['fatal']) || $m->tries >= 3) { $m->status = 'ناموفق'; $m->lastError = $r['error']; }
    else { $m->next = time() + 60 * $m->tries; $m->lastError = $r['error']; }
  }
}
/* اجرای کارهای دوره‌ای در قفل (حداکثر هر ۵ دقیقه یک بار مگر از مسیر زمان‌بندی) */
function runMaintenance($force = false, $kind = 'auto') {
  $last = (int)KDB::meta('maint', 0);
  if (!$force && time() - $last < 300) return null;
  KDB::lock(); $ok = false; $out = [];
  try {
    $last = (int)KDB::meta('maint', 0);
    if (!$force && time() - $last < 300) { $ok = true; return null; }
    KDB::setMeta('maint', time());
    Store::load();
    sweepDeadlines(); pruneData(); smsTick();
    $lb = lastAutoBackup();
    if (!$lb || time() - strtotime($lb) > 20 * 3600) $out['backup'] = createBackup($kind);
    Store::save(); flushAudit(); $ok = true;
    return $out;
  } finally { KDB::unlock($ok); }
}
