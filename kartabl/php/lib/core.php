<?php
/* هسته: ساختار سازمانی، جایگاه‌ها، مجوزها، سابقه، رویدادنگاری و اعلان */
if (!defined('KT')) exit;

$GLOBALS['ORG'] = json_decode(file_get_contents(__DIR__ . '/org.json'), true);
function ORG($k) { return $GLOBALS['ORG'][$k]; }
$GLOBALS['ME'] = null;      // ['user' => obj, 'pos' => obj, 'sid' => …]
$GLOBALS['AUDIT_BUF'] = []; // رویدادها فقط پس از موفقیت عملیات ثبت می‌شوند

function ME() { return $GLOBALS['ME']; }
function meUser() { return $GLOBALS['ME']['user'] ?? null; }
function mePos() { return $GLOBALS['ME']['pos'] ?? null; }

/* ---------- مدیریت‌ها (با اعمال تغییرات پنل مدیریت) ---------- */
function units($withOff = false) {
  static $cache = null, $key = null;
  $s = D()->settings; $k = json_encode([$s->units ?? null, $s->unitsOff ?? null, $s->extraUnits ?? null]);
  if ($cache === null || $key !== $k) {
    $cache = [];
    foreach (array_merge(ORG('UNITS'), json_decode(json_encode($s->extraUnits ?? []), true)) as $u) {
      $o = $s->units->{$u['id']} ?? null;
      if ($o) { $u['name'] = $o->name ?? $u['name']; $u['short'] = $o->short ?? $u['short']; }
      $u['off'] = in_array($u['id'], $s->unitsOff ?? []);
      $cache[$u['id']] = $u;
    }
    $key = $k;
  }
  return $withOff ? $cache : array_filter($cache, fn($u) => !$u['off']);
}
function unitById($id) { return units(true)[(int)$id] ?? null; }
function unitName($id) { if ((int)$id === 0) return 'دفتر امام جماعت'; $u = unitById($id); return $u ? $u['name'] : '—'; }
function unitShort($id) { if ((int)$id === 0) return 'دفتر امام جماعت'; $u = unitById($id); return $u ? $u['short'] : '—'; }
function unitExists($id) { $u = unitById($id); return $u && !$u['off']; }
function services($u) { $s = D()->settings->services->{$u} ?? null; return $s ?: (ORG('SERVICES')[$u] ?? ['امور عمومی']); }
function spaces() { $s = D()->settings->spaces ?? null; return $s ? json_decode(json_encode($s), true) : ORG('SPACES'); }
function spaceOf($id) { foreach (spaces() as $s) if ($s['id'] === $id) return $s; return ['id' => '', 'name' => 'خارج از مجتمع', 'unit' => 0, 'cap' => 0, 'excl' => false]; }
function programOf($id) { foreach (ORG('PROGRAMS') as $p) if ($p['id'] === $id) return $p; return null; }
function letterCats() { return D()->settings->letterCats ?? ORG('LETTER_CATS'); }
function leaveTypes() { return D()->settings->leaveTypes ?? ORG('LEAVE_TYPES'); }
const U_INTERNAL = 1, U_CULTURE = 2, U_PR = 3, U_ADMIN = 14, U_FIN = 15, U_IT = 16, U_CEREMONY = 18;

/* ---------- جایگاه‌ها و حساب‌ها ---------- */
function posById($id) { foreach (D()->positions as $p) if ($p->id === $id) return $p; return null; }
function userById($id) { foreach (D()->users as $u) if ($u->id === $id) return $u; return null; }
function accountOf($posId) { foreach (D()->users as $u) if (($u->posId ?? '') === $posId && empty($u->deleted)) return $u; return null; }
function holderOf($posId) { $u = accountOf($posId); return $u && !empty($u->active) ? $u : null; }
function unitPos($unit, $role) { foreach (D()->positions as $p) if ((int)$p->unitId === (int)$unit && $p->role === $role) return $p; return null; }
function unitPosId($unit, $role) { $p = unitPos($unit, $role); return $p ? $p->id : null; }
function imamPos() { foreach (D()->positions as $p) if ($p->role === 'imam') return $p->id; return 'P0'; }
function unitHeads($u) { return array_values(array_filter([unitPosId($u, 'manager'), unitPosId($u, 'office')])); }
function unitAll($u) { return array_values(array_filter([unitPosId($u, 'manager'), unitPosId($u, 'office'), unitPosId($u, 'secretary')])); }
function posLabel($id) { $p = posById($id); if (!$p) return '—'; return $p->role === 'imam' ? 'امام جماعت' : $p->title . ' ' . unitShort($p->unitId); }
function posWho($id) { $h = holderOf($id); return $h ? $h->name . ' (' . posLabel($id) . ')' : posLabel($id) . ' (بدون متصدی)'; }
function panelName($p) {
  if (!$p) return '';
  if ($p->role === 'imam') return 'پنل امام جماعت';
  $un = unitName($p->unitId);
  return ['manager' => 'پنل ', 'office' => 'پنل مسئول دفتر ', 'secretary' => 'پنل منشی '][$p->role] . $un;
}
function posUsername($p) {
  if ($p->role === 'imam') return 'imam';
  $u = unitById($p->unitId);
  return ($u['slug'] ?? ('unit' . $p->unitId)) . '.' . $p->role;
}
function isImam() { $p = mePos(); return $p && $p->role === 'imam'; }
function myUnit() { $p = mePos(); return $p ? (int)$p->unitId : -1; }
function myRole() { $p = mePos(); return $p ? $p->role : ''; }
function inUnit($u) { return myUnit() === (int)$u; }
function isMgr($u) { return isImam() || (inUnit($u) && myRole() === 'manager'); }
function isMgrOrOffice($u) { return isImam() || (inUnit($u) && in_array(myRole(), ['manager', 'office'])); }
function isClerk($u) { return isImam() || inUnit($u); }

/* ---------- مجوزها ----------
   ترتیب: پیش‌فرض نقش ← ماتریس نقش‌ها (پنل مدیریت) ← استثنای جایگاه (امام/فناوری اطلاعات)
   ← برای مسئول دفتر و منشی: تعیین مدیر همان بخش، فقط تا سقف اختیار خود مدیر ← وابستگی به مجوز پایه */
function permDef($k) { static $m = null; if ($m === null) { $m = []; foreach (ORG('PERMS') as $p) $m[$p['k']] = $p; } return $m[$k] ?? null; }
function permLabel($k) { $p = permDef($k); return $p ? $p['l'] : $k; }
function permDefault($pos, $k) {
  $d = ORG('PERM_DEFAULTS')[$k] ?? null;
  if (!$d) return false;
  if (isset($d['u'])) return (int)$pos->unitId === $d['u'] && in_array($pos->role, $d['r']);
  return in_array($pos->role, $d);
}
function permBase($pos, $k) {
  $o = $pos->perms->{$k} ?? null;
  if ($o === 'allow') return true;
  if ($o === 'deny') return false;
  $rp = D()->settings->rolePerms->{$pos->role}->{$k} ?? null;
  if ($rp === 'allow') return true;
  if ($rp === 'deny') return false;
  return permDefault($pos, $k);
}
function permOf($pos, $k, $depth = 0) {
  if (!$pos) return false;
  if ($pos->role === 'imam') return true;
  $P = permDef($k); if (!$P) return false;
  if (!empty($P['p']) && $depth < 4 && !permOf($pos, $P['p'], $depth + 1)) return false;
  $v = permBase($pos, $k);
  if (in_array($pos->role, ['office', 'secretary']) && !empty($P['d'])) {
    $m = $pos->mgr->{$k} ?? null;
    if ($m === 'allow') $v = true; elseif ($m === 'deny') $v = false;
    if ($v) { $mgr = unitPos($pos->unitId, 'manager'); if (!$mgr || !permOf($mgr, $k, $depth + 1)) return false; }
  }
  return $v;
}
function can($k) { return (bool)ME() && permOf(mePos(), $k); }
function isAll() { return isImam() || can('view.all'); }
function canSeeUnit($u) { return isAll() || inUnit($u); }
const SENSITIVE_POS_KEYS = ['view.all', 'orders.issue', 'admin.users', 'admin.passwords', 'admin.perms', 'admin.settings', 'admin.backup', 'admin.approve'];
function isSensitivePos($p) { if (!$p) return false; if ($p->role === 'imam') return true; foreach (SENSITIVE_POS_KEYS as $k) if (permOf($p, $k)) return true; return false; }

/* ---------- سطح دسترسی ابزارهای اختصاصی ---------- */
const TOOL_LEVELS = ['none' => 0, 'view' => 1, 'own' => 2, 'all' => 3];
function toolDef($unit, $key) { foreach (ORG('TOOLS')[$unit] ?? [] as $t) if ($t['k'] === $key) return $t; return null; }
function toolLevelOf($pos, $unit, $key) {
  $t = toolDef($unit, $key); if (!$t || !$pos) return 'none';
  if ($pos->role === 'imam') return 'all';
  if ((int)$pos->unitId !== (int)$unit) return (permOf($pos, 'view.all') && empty($t['conf'])) ? 'view' : 'none';
  if ($pos->role === 'manager') return 'all';
  $def = $pos->role === 'office' ? 'all' : (empty($t['conf']) ? 'own' : 'none');
  $lv = $pos->tools->{$key} ?? $def;
  return isset(TOOL_LEVELS[$lv]) ? $lv : $def;
}
function toolLevel($unit, $key) { return toolLevelOf(mePos(), $unit, $key); }
function canApproveTool($unit) { return isImam() || (inUnit($unit) && myRole() === 'manager'); }

/* ---------- سابقه رکورد و رویدادنگاری ---------- */
function actorName() { $u = meUser(); return $u ? $u->name : 'سامانه'; }
function hist($obj, $action, $note = '', $diff = null) {
  if (!isset($obj->history) || !is_array($obj->history)) $obj->history = [];
  $me = ME();
  if ($me && !empty($me['override'])) $note = ($note ? $note . ' — ' : '') . 'اقدام مدیریتی به‌جای ' . posLabel($me['pos']->id);
  $h = (object)['ts' => stamp(), 'uid' => $me ? $me['user']->id : 'system', 'nm' => actorName(), 'pos' => $me ? ($me['realPos'] ?? $me['pos']->id) : '', 'action' => $action, 'note' => mb_substr((string)$note, 0, 1000)];
  if ($diff) $h->diff = $diff;
  $obj->history[] = $h;
  $obj->updated = $h->ts;
}
function audit($act, $ent, $id, $note = '') {
  $me = ME();
  $GLOBALS['AUDIT_BUF'][] = ['ts' => stamp(), 'uid' => $me ? $me['user']->id : 'system', 'nm' => actorName(), 'pos' => $me ? ($me['realPos'] ?? $me['pos']->id) : '',
    'unit' => $me ? (int)$me['pos']->unitId : -1, 'act' => ($me && !empty($me['override']) ? $act . ' (مدیریتی)' : $act), 'ent' => $ent, 'rid' => (string)$id, 'note' => mb_substr((string)$note, 0, 1000)];
}
function flushAudit() {
  if (!$GLOBALS['AUDIT_BUF']) return;
  $prev = KDB::one("SELECT h FROM " . KDB::t('audit') . " ORDER BY id DESC LIMIT 1");
  $prev = $prev ? $prev['h'] : str_repeat('0', 64);
  foreach ($GLOBALS['AUDIT_BUF'] as $e) {
    $h = hash('sha256', $prev . json_encode($e, JSON_UNESCAPED_UNICODE));
    KDB::q("INSERT INTO " . KDB::t('audit') . " (ts, uid, nm, pos, unit, act, ent, rid, note, h) VALUES (?,?,?,?,?,?,?,?,?,?)", [$e['ts'], $e['uid'], $e['nm'], $e['pos'], $e['unit'], $e['act'], $e['ent'], $e['rid'], $e['note'], $h]);
    $prev = $h;
  }
  $GLOBALS['AUDIT_BUF'] = [];
}
function verifyAudit() {
  $prev = str_repeat('0', 64); $n = 0;
  foreach (KDB::q("SELECT * FROM " . KDB::t('audit') . " ORDER BY id")->fetchAll() as $r) {
    $e = ['ts' => $r['ts'], 'uid' => $r['uid'], 'nm' => $r['nm'], 'pos' => $r['pos'], 'unit' => (int)$r['unit'], 'act' => $r['act'], 'ent' => $r['ent'], 'rid' => $r['rid'], 'note' => $r['note']];
    if (hash('sha256', $prev . json_encode($e, JSON_UNESCAPED_UNICODE)) !== $r['h']) return ['ok' => false, 'at' => (int)$r['id'], 'n' => $n];
    $prev = $r['h']; $n++;
  }
  return ['ok' => true, 'n' => $n];
}

/* ---------- اعلان و پیامک ----------
   open: {k, id} برای باز شدن مستقیم همان مورد از روی اعلان */
const SMS_EVENTS = ['request' => 'ثبت درخواست جدید', 'letter' => 'ارجاع نامه', 'order' => 'صدور دستور', 'decision' => 'تأیید یا رد', 'due' => 'نزدیک‌شدن مهلت', 'overdue' => 'معوق‌شدن کار', 'meeting' => 'دعوت به جلسه', 'reservation' => 'تغییر وضعیت رزرو', 'message' => 'پیام جدید'];
function notify($posIds, $ev, $text, $link, $ref = '', $open = null) {
  $me = mePos();
  $ids = array_unique(array_filter($posIds));
  foreach ($ids as $p) {
    if ($me && $p === $me->id) continue;
    D()->notifs[] = (object)['id' => uid(), 'pos' => $p, 'ev' => $ev, 'text' => mb_substr($text, 0, 400), 'link' => $link, 'open' => $open, 'ts' => stamp(), 'read' => false];
    $s = D()->settings->sms ?? null; $u = holderOf($p); $pp = posById($p);
    if ($s && !empty($s->enabled) && !empty($s->events->{$ev}) && $u && !empty($u->phone) && $pp && in_array($pp->role, $s->roles ?? []))
      D()->sms[] = (object)['id' => uid(), 'to' => $u->phone, 'name' => $u->name, 'text' => (D()->settings->orgName ?? 'مجتمع') . ': ' . (SMS_EVENTS[$ev] ?? 'اعلان') . ($ref ? ' — کد ' . $ref : '') . '. جزئیات در کارتابل.', 'ts' => stamp(), 'status' => 'در صف ارسال'];
  }
}
function nextNo($kind) {
  $y = jYearNow(); $key = $kind . '-' . $y;
  $n = (D()->seq->{$key} ?? 0) + 1; D()->seq->{$key} = $n;
  $P = ['in' => 'و', 'out' => 'ص', 'internal' => 'د'];
  if (isset($P[$kind])) return $y . '/' . $P[$kind] . '/' . pad($n, 4);
  $L = ['task' => 'T', 'req' => 'R', 'order' => 'D', 'pay' => 'P', 'res' => 'B', 'meet' => 'M', 'mov' => 'A', 'leave' => 'L', 'inv' => 'F', 'doc' => 'S', 'tool' => 'K'];
  return ($L[$kind] ?? 'X') . '-' . $y . '-' . pad($n, 4);
}
function findRec($col, $id) { foreach (D()->$col as $r) if (($r->id ?? null) === $id) return $r; return null; }
function rec($col, $id) { $r = is_string($id) ? findRec($col, $id) : null; need($r, 'این مورد یافت نشد یا حذف شده است.'); return $r; }
function arr($v) { return is_array($v) ? $v : []; }
function obj($v) { return is_object($v) ? $v : (is_array($v) ? (object)$v : (object)[]); }
function files($v) {
  $out = [];
  foreach (arr($v) as $f) { $f = (object)$f; if (!empty($f->id) && preg_match('/^[a-f0-9]{24}$/', $f->id)) $out[] = (object)['id' => $f->id, 'name' => mb_substr((string)($f->name ?? 'فایل'), 0, 180), 'size' => (int)($f->size ?? 0), 'type' => mb_substr((string)($f->type ?? ''), 0, 80), 'url' => 'api.php?r=file&id=' . $f->id]; }
  return array_slice($out, 0, 30);
}
