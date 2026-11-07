<?php
/* قواعد دیدن و اقدام — هم برای فیلتر داده هر کاربر و هم برای کنترل هر عملیات */
if (!defined('KT')) exit;

const LETTER_TYPES = ['in' => 'وارده', 'out' => 'صادره', 'internal' => 'داخلی'];
const LETTER_ST = ['ثبت‌شده', 'ارجاع‌شده', 'پاسخ داده‌شده', 'مختومه'];
const ORDER_ST = ['جدید', 'در حال بررسی', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const TASK_ST = ['جدید', 'در حال انجام', 'منتظر تأیید', 'تکمیل‌شده'];
const REQ_STAGES = ['ثبت درخواست', 'ارجاع به مدیریت مسئول', 'بررسی و هماهنگی', 'تأیید', 'اجرا', 'گزارش نهایی', 'بایگانی'];
const RES_ST = ['در انتظار تأیید', 'تأییدشده', 'ردشده', 'لغوشده'];
const ASSET_HEALTH = ['سالم', 'نیازمند تعمیر', 'خراب', 'اسقاط'];
const MOVE_TYPES = ['ورود', 'خروج', 'امانت', 'عودت', 'جابه‌جایی'];
const PAY_ST = ['ثبت درخواست', 'تأیید مدیر واحد', 'بررسی امور مالی', 'تصویب امام جماعت', 'پرداخت'];

/* ---------- نامه ---------- */
function letterUnits($l) { $u = [(int)$l->unitId]; if (isset($l->toUnit) && $l->toUnit !== null) $u[] = (int)$l->toUnit; foreach (arr($l->refs ?? []) as $r) $u[] = (int)$r->unitId; return array_unique($u); }
function canSeeLetter($l) {
  if (isImam()) return true;
  if (isAll() && $l->conf !== 'سری') return true;
  if (!can('letters.view')) return false;
  if (!in_array(myUnit(), letterUnits($l), true)) return false;
  if ($l->conf === 'سری') return can('letters.secret');
  if ($l->conf === 'محرمانه') return in_array(myRole(), ['manager', 'office']) || can('letters.secret');
  return true;
}
function canHandleLetter($l) { return canSeeLetter($l) && (isImam() || can('letters.refer')) && $l->status !== 'مختومه'; }
function canCloseLetter($l) { return canSeeLetter($l) && (isImam() || (can('letters.close') && in_array(myUnit(), letterUnits($l), true))); }

/* ---------- دستورات ---------- */
function orderStatus($o) { return ($o->status !== 'تکمیل‌شده' && !empty($o->due) && $o->due < todayISO()) ? 'معوق' : $o->status; }
function canSeeOrder($o) { return isAll() || in_array(myUnit(), array_map('intval', $o->units), true); }

/* ---------- وظایف ---------- */
function canSeeTask($t) { return isAll() || (inUnit($t->unitId) && ($t->assignee === mePos()->id || can('tasks.view'))); }
function taskActions($t) {
  $a = []; $me = mePos()->id;
  $mine = $t->assignee === $me;
  $head = isImam() || (inUnit($t->unitId) && can('tasks.create'));
  $appr = isImam() || (inUnit($t->unitId) && can('tasks.approve'));
  if ($t->status === 'تکمیل‌شده') { if ($appr) $a['reopen'] = 'بازگشایی (با ثبت علت)'; return $a; }
  if ($t->status === 'جدید' && ($mine || $head)) $a['start'] = 'شروع انجام';
  if ($t->status === 'در حال انجام' && ($mine || $head)) $a['submit'] = 'اعلام انجام و ارسال برای تأیید';
  if ($t->status === 'منتظر تأیید' && $appr && (!$mine || myRole() === 'manager' || isImam())) { $a['approve'] = 'تأیید انجام'; $a['return'] = 'بازگشت برای اصلاح'; }
  if ($head) $a['reassign'] = 'ارجاع به فرد دیگر';
  if ($mine || $head) $a['note'] = 'ثبت یادداشت پیشرفت';
  return $a;
}

/* ---------- درخواست‌ها ---------- */
function reqLabel($r) { return in_array($r->status, ['ردشده', 'لغوشده']) ? $r->status : REQ_STAGES[$r->stage]; }
function canSeeReq($r) {
  if (isAll() || $r->by === meUser()->id) return true;
  if (!can('requests.view')) return false;
  $u = myUnit();
  return (int)$r->fromUnit === $u || (int)$r->toUnit === $u || in_array($u, array_map('intval', $r->coops), true);
}
function reqActions($r) {
  $a = [];
  if ($r->status !== 'جاری') return $a;
  $h = isImam() || (inUnit($r->toUnit) && can('requests.handle'));
  if ($r->stage === 1 && $h) $a['review'] = 'شروع بررسی';
  if ($r->stage === 2 && $h) { $a['coop'] = 'درخواست همکاری از مدیریت دیگر'; $a['send'] = 'ارسال برای تأیید'; }
  if ($r->stage === 2 && !isImam() && in_array(myUnit(), array_map('intval', $r->coops), true) && can('requests.handle')) $a['coopnote'] = 'ثبت نظر یا اقدام همکاری';
  if ($r->stage === 3 && ($r->needsImam ? isImam() : (isImam() || (inUnit($r->toUnit) && myRole() === 'manager')))) { $a['approve'] = 'تأیید'; $a['reject'] = 'رد درخواست'; }
  if ($r->stage === 4 && $h) $a['exec'] = 'ثبت اجرا';
  if ($r->stage === 5 && $h) $a['final'] = 'ثبت گزارش نهایی و بایگانی';
  if ($r->stage <= 2 && $r->by === meUser()->id) $a['cancel'] = 'لغو درخواست';
  return $a;
}

/* ---------- رزرو ---------- */
function resUnit($r) { if (!empty($r->space)) return (int)spaceOf($r->space)['unit']; $p = programOf($r->program); return ($p && $p['unit']) ? (int)$p['unit'] : U_CEREMONY; }
function resCap($r) { if (!empty($r->space)) return (int)spaceOf($r->space)['cap']; $p = programOf($r->program); return (int)($p['cap'] ?? 0); }
function resPlace($r) { return !empty($r->space) ? spaceOf($r->space)['name'] : 'خارج از مجتمع'; }
function canDecideRes($r) { return isImam() || (inUnit(resUnit($r)) && can('reservations.decide')); }
function resConflicts($r) {
  if (empty($r->space) || empty(spaceOf($r->space)['excl'])) return [];
  return array_values(array_filter(D()->reservations, fn($x) => $x->id !== ($r->id ?? '') && $x->space === $r->space && $x->status === 'تأییدشده' && $x->date === $r->date && $x->start < $r->end && $r->start < $x->end));
}

/* ---------- جلسات ---------- */
function canSeeMeeting($m) { $me = mePos()->id; return isAll() || in_array($me, $m->invitees) || $m->byPos === $me || ((int)$m->unitId === myUnit() && in_array(myRole(), ['manager', 'office'])); }
function canEditMeeting($m) { return isImam() || $m->byPos === mePos()->id || ((int)$m->unitId === myUnit() && can('meetings.create') && myRole() !== 'secretary'); }

/* ---------- اموال ---------- */
function canSeeAsset($a) { return isAll() || (can('assets.view') && (inUnit($a->unitId) || inUnit(U_INTERNAL))); }
function canManageAsset($a) { return isImam() || (can('assets.manage') && (inUnit($a->unitId) || inUnit(U_INTERNAL))); }
function canApproveMove($a) { return isImam() || (myRole() === 'manager' && (inUnit($a->unitId) || inUnit(U_INTERNAL))); }

/* ---------- مالی ---------- */
function canFinance() { return can('finance.view'); }
function nextPayStage($p) { return ($p->stage === 2 && empty($p->needImam)) ? 4 : $p->stage + 1; }
function canSeePay($p) { return canFinance() || isAll() || (inUnit($p->unitId) && (can('finance.request') || myRole() === 'manager')); }
function payCanAct($p) {
  if ($p->status !== 'جاری') return false;
  $s = nextPayStage($p);
  if ($s === 1) return isImam() ? false : (inUnit($p->unitId) && myRole() === 'manager');
  if ($s === 2) return inUnit(U_FIN) && can('finance.post');
  if ($s === 3) return isImam();
  if ($s === 4) return inUnit(U_FIN) && can('finance.approve');
  return false;
}
function canSeeFindoc($d) { return isImam() || canFinance() || (inUnit($d->unitId) && (can('finance.docs') || myRole() === 'manager')); }

/* ---------- منابع انسانی ---------- */
function canHR() { return can('hr.view'); }
function leaveCanAct($l) {
  if ($l->status === 'در انتظار تأیید مدیر') {
    $p = posById($l->pos);
    return ($p && $p->role === 'manager') ? isImam() : (inUnit($l->unitId) && myRole() === 'manager' && $l->uid !== meUser()->id);
  }
  if ($l->status === 'در انتظار ثبت امور اداری') return inUnit(U_ADMIN) && can('hr.view');
  return false;
}

/* ---------- ابزارهای اختصاصی ---------- */
function toolOf($r) { return toolDef($r->unitId, $r->tool); }
function canSeeToolRec($r) {
  $lv = toolLevel($r->unitId, $r->tool);
  if ($lv === 'all' || $lv === 'view') return true;
  if ($lv === 'own') { $me = mePos()->id; return $r->byPos === $me || ($r->assignee ?? '') === $me; }
  return false;
}
function canEditToolRec($r) {
  $lv = toolLevel($r->unitId, $r->tool);
  if ($lv === 'all') return true;
  if ($lv === 'own') { $me = mePos()->id; return $r->byPos === $me || ($r->assignee ?? '') === $me; }
  return false;
}
