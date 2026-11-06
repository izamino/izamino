<?php
/* داده‌ای که هر کاربر دریافت می‌کند: فقط آنچه جایگاهش اجازه دیدن دارد (هرگز هش رمز، توکن نشست یا کلید پیامک) */
if (!defined('KT')) exit;

function pick($o, $keys) { $r = new stdClass(); foreach ($keys as $k) if (isset($o->$k)) $r->$k = $o->$k; return $r; }
function effPerms($p) { $e = new stdClass(); foreach (ORG('PERMS') as $P) if (permOf($p, $P['k'])) $e->{$P['k']} = 1; return $e; }
function effTools($p) { $o = new stdClass(); foreach (ORG('TOOLS')[(int)$p->unitId] ?? [] as $t) $o->{$t['k']} = toolLevelOf($p, $p->unitId, $t['k']); return $o; }

function viewFor() {
  $D = D(); $me = meUser(); $mp = mePos(); $mu = myUnit(); $all = isAll(); $imam = isImam();
  $adminU = can('admin.users'); $adminL = can('admin.logs'); $adminP = can('admin.perms'); $fin = canFinance(); $hr = canHR();
  $V = new stdClass();
  $V->ver = Store::$ver; $V->me = $me->id; $V->today = todayISO(); $V->now = stamp();
  $V->users = [];
  foreach ($D->users as $u) {
    if ($u->id === $me->id) { $c = clone $u; unset($c->pass); $V->users[] = $c; continue; }
    $b = pick($u, ['id', 'name', 'first', 'last', 'posId', 'active', 'deleted', 'named', 'title', 'start']);
    if ($adminU) { foreach (['username', 'phone', 'lastLogin', 'lockedUntil', 'passChanged', 'created', 'fails'] as $k) { if (isset($u->$k)) $b->$k = $u->$k; } }
    elseif ($hr || ($mp->role === 'manager' && ($p = posById($u->posId)) && (int)$p->unitId === $mu)) { if (isset($u->phone)) $b->phone = $u->phone; }
    $V->users[] = $b;
  }
  $V->positions = [];
  foreach ($D->positions as $p) {
    $full = $imam || $adminP || $adminU || (int)$p->unitId === $mu;
    $c = $full ? clone $p : pick($p, ['id', 'unitId', 'role', 'title']);
    if ($p->id === $mp->id || $imam || $adminP || ($mp->role === 'manager' && (int)$p->unitId === $mu)) { $c->eff = effPerms($p); $c->toolLv = effTools($p); }
    $V->positions[] = $c;
  }
  $V->posHistory = array_values(array_filter($D->posHistory, function ($h) use ($adminU, $hr, $imam, $mp, $mu, $me) {
    if ($adminU || $hr || $imam) return true;
    $p = posById($h->posId); if ($mp->role === 'manager' && $p && (int)$p->unitId === $mu) return true;
    return $h->userId === $me->id;
  }));
  $V->letters = array_values(array_filter($D->letters, 'canSeeLetter'));
  $V->lstate = array_values(array_filter($D->lstate, fn($s) => $s->pos === $mp->id));
  $V->drafts = array_values(array_filter($D->drafts, fn($d) => $d->pos === $mp->id));
  $V->orders = array_values(array_filter($D->orders, 'canSeeOrder'));
  $V->tasks = array_values(array_filter($D->tasks, 'canSeeTask'));
  $V->requests = array_values(array_filter($D->requests, 'canSeeReq'));
  $V->meetings = array_values(array_filter($D->meetings, 'canSeeMeeting'));
  $V->reservations = array_map(fn($r) => (canDecideRes($r) || $r->by === $me->id || $all) ? $r : pick($r, ['id', '_v', 'no', 'program', 'space', 'kind', 'date', 'start', 'end', 'people', 'status', 'fromUnit', 'by', 'byPos', 'created']), $D->reservations);
  $V->warehouses = $D->warehouses;
  $V->assets = array_values(array_filter($D->assets, 'canSeeAsset'));
  $seen = array_flip(array_map(fn($a) => $a->id, $V->assets));
  $V->movements = array_values(array_filter($D->movements, fn($m) => isset($seen[$m->assetId])));
  $V->payreqs = array_values(array_filter($D->payreqs, 'canSeePay'));
  $V->budgets = ($fin || $all) ? $D->budgets : array_values(array_filter($D->budgets, fn($b) => (int)$b->unitId === $mu));
  $V->commitments = ($fin || $all) ? $D->commitments : [];
  $acc = $fin || $imam;
  $V->accounts = $acc || can('finance.request') ? $D->accounts : [];
  $V->periods = $acc ? $D->periods : [];
  $V->vouchers = $acc ? $D->vouchers : [];
  $V->invoices = $acc ? $D->invoices : [];
  $V->findocs = array_values(array_filter($D->findocs, 'canSeeFindoc'));
  $V->leaves = array_values(array_filter($D->leaves, fn($l) => $hr || $all || $l->uid === $me->id || leaveCanAct($l) || ($mp->role === 'manager' && (int)$l->unitId === $mu)));
  foreach (['decrees', 'missions', 'contracts'] as $k) $V->$k = array_values(array_filter($D->$k, fn($x) => $hr || $x->uid === $me->id));
  $V->toolrecs = array_values(array_filter($D->toolrecs, fn($r) => empty($r->deleted) && canSeeToolRec($r)));
  $msgs = array_values(array_filter($D->messages, fn($m) => $m->from === $mp->id || $m->to === $mp->id));
  $V->messages = array_slice($msgs, -3000);
  $V->notifs = array_slice(array_values(array_filter($D->notifs, fn($n) => $n->pos === $mp->id)), -1500);
  $V->sms = can('admin.settings') ? array_slice($D->sms, -300) : [];
  $s = json_decode(json_encode($D->settings));
  if (isset($s->sms)) { $k = $s->sms->apiKey ?? ''; $s->sms->apiKey = ''; $s->sms->apiKeySet = $k !== ''; $s->sms->apiKeyHint = $k ? '••••' . substr($k, -4) : ''; }
  if (!can('admin.backup')) unset($s->backups);
  unset($s->cronKey);
  $V->settings = $s;
  $V->logins = $adminL ? KDB::all("SELECT ts, username, uid, ok, reason, ip, agent FROM " . KDB::t('logins') . " ORDER BY id DESC LIMIT 600") : KDB::all("SELECT ts, username, uid, ok, reason, agent FROM " . KDB::t('logins') . " WHERE uid = ? ORDER BY id DESC LIMIT 30", [$me->id]);
  $V->sessions = ($adminL || $adminU) ? KDB::all("SELECT id, uid, start, last, active, endts, reason, ip, agent FROM " . KDB::t('sessions') . " WHERE active = 1 OR last > ? ORDER BY last DESC LIMIT 400", [gmdate('Y-m-d', time() - 7 * 86400)])
    : KDB::all("SELECT id, uid, start, last, active, endts, reason, agent FROM " . KDB::t('sessions') . " WHERE uid = ? ORDER BY last DESC LIMIT 20", [$me->id]);
  foreach ($V->sessions as &$x) { $x['active'] = (int)$x['active'] === 1; $x['end'] = $x['endts']; } unset($x);
  foreach ($V->logins as &$x) $x['ok'] = (int)$x['ok'] === 1; unset($x);
  $V->audit = ($all || $adminL) ? KDB::all("SELECT ts, uid, nm, pos, unit, act, ent, rid AS id, note FROM " . KDB::t('audit') . " ORDER BY id DESC LIMIT 2500")
    : KDB::all("SELECT ts, uid, nm, pos, unit, act, ent, rid AS id, note FROM " . KDB::t('audit') . " WHERE unit = ? ORDER BY id DESC LIMIT 600", [$mu]);
  $V->audit = array_reverse($V->audit);
  return $V;
}

/* صفحه ورود: فقط تنظیمات عمومی (بدون هیچ داده کاربر) */
function publicView() {
  $s = D()->settings;
  return ['ver' => Store::$ver, 'today' => todayISO(), 'now' => stamp(),
    'settings' => ['orgName' => $s->orgName ?? '', 'subtitle' => $s->subtitle ?? '', 'loginTitle' => $s->loginTitle ?? '', 'loginText' => $s->loginText ?? '', 'theme' => $s->theme ?? null, 'clock' => $s->clock ?? null,
      'maintenance' => !empty($s->maintenance), 'units' => $s->units ?? new stdClass(), 'unitsOff' => $s->unitsOff ?? [], 'extraUnits' => $s->extraUnits ?? [], 'security' => ['minLen' => $s->security->minLen ?? 6, 'sessionMin' => $s->security->sessionMin ?? 120]],
    'counts' => ['units' => count(units()), 'positions' => count(D()->positions), 'active' => count(array_filter(D()->users, fn($u) => !empty($u->active) && empty($u->deleted)))]];
}

/* اجازه دریافت پیوست: کاربر باید رکورد صاحب پیوست را ببیند */
function fileVisible($f) {
  if ($f['owner'] === meUser()->id) return true;
  if (!$f['ref_col']) return false;
  $col = $f['ref_col'];
  if ($col === 'settings') return true; /* تصویر سربرگ */
  $r = findRec($col, $f['ref_id']); if (!$r) return false;
  if (!isAll() && !can('files.view') && $col !== 'messages') return false;
  switch ($col) {
    case 'letters': return canSeeLetter($r);
    case 'orders': return canSeeOrder($r);
    case 'tasks': return canSeeTask($r);
    case 'requests': return canSeeReq($r);
    case 'meetings': return canSeeMeeting($r);
    case 'payreqs': return canSeePay($r);
    case 'findocs': return canSeeFindoc($r);
    case 'vouchers': case 'invoices': return canFinance() || isImam();
    case 'toolrecs': return empty($r->deleted) && canSeeToolRec($r);
    case 'messages': return $r->from === mePos()->id || $r->to === mePos()->id;
    case 'drafts': return $r->pos === mePos()->id;
    case 'leaves': return canHR() || $r->uid === meUser()->id;
  }
  return isImam();
}
/* پیوست‌های تازه به رکوردی که در همان عملیات ذخیره شده‌اند گره می‌خورند */
function bindFiles($changed) {
  $owner = meUser()->id;
  $ids = array_column(KDB::all("SELECT id FROM " . KDB::t('files') . " WHERE ref_col IS NULL AND owner = ?", [$owner]), 'id');
  if (!$ids) return;
  $ids = array_flip($ids);
  $walk = function ($o, $col, $rid) use (&$walk, &$ids, $owner) {
    if (is_array($o)) { foreach ($o as $x) $walk($x, $col, $rid); return; }
    if (!is_object($o)) return;
    if (isset($o->url, $o->id) && is_string($o->url) && strpos($o->url, 'api.php?r=file') === 0 && isset($ids[$o->id])) { KDB::q("UPDATE " . KDB::t('files') . " SET ref_col = ?, ref_id = ? WHERE id = ? AND ref_col IS NULL AND owner = ?", [$col, $rid, $o->id, $owner]); unset($ids[$o->id]); return; }
    foreach (get_object_vars($o) as $v) if (is_array($v) || is_object($v)) $walk($v, $col, $rid);
  };
  foreach ($changed as $col) {
    if (!$ids) break;
    if ($col === 'settings') { $walk(D()->settings->letterhead ?? null, 'settings', 'letterhead'); continue; }
    if (!is_array(D()->$col ?? null)) continue;
    foreach (D()->$col as $r) if (is_object($r) && isset($r->id)) $walk($r, $col, $r->id);
  }
}
