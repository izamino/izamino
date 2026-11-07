<?php
/* عملیات گردش کار: نامه، پیش‌نویس، دستور، وظیفه، درخواست، رزرو، جلسه، اموال، مرخصی، پیام، اعلان */
if (!defined('KT')) exit;
$OPS = &$GLOBALS['OPS'];

/* ================= دبیرخانه ================= */
function letterSnap($l) {
  $sg = !empty($l->signer) ? holderOf($l->signer) : null;
  return (object)['org' => D()->settings->orgName ?? '', 'unitName' => unitName($l->unitId), 'byName' => actorName(), 'byPos' => posLabel(mePos()->id),
    'signerName' => $sg ? $sg->name : '', 'signerPos' => !empty($l->signer) ? posLabel($l->signer) : '', 'issued' => $l->date, 'no' => $l->no, 'ts' => stamp()];
}
function letterFields($v, $type) {
  $o = [];
  $o['subject'] = str($v->subject ?? '', 300); need($o['subject'] !== '', 'موضوع نامه را بنویسید.');
  $o['cat'] = in_array($v->cat ?? '', letterCats()) ? $v->cat : 'اداری';
  $pr = ($v->priority ?? '') ?: 'عادی'; $cf = ($v->conf ?? '') ?: 'عادی';
  $o['priority'] = in_array($pr, ORG('PRIORITIES')) ? $pr : null; need($o['priority'], 'درجه اهمیت معتبر نیست.');
  $o['conf'] = in_array($cf, ORG('CONF')) ? $cf : null; need($o['conf'], 'سطح محرمانگی معتبر نیست.');
  $o['date'] = ($v->date ?? '') === '' ? todayISO() : needDate($v->date, 'تاریخ نامه');
  $o['due'] = needDate($v->due ?? '', 'مهلت اقدام', false);
  if ($o['due']) need($o['due'] >= $o['date'], 'مهلت اقدام نمی‌تواند پیش از تاریخ نامه باشد.');
  $o['body'] = sanitizeHtml($v->body ?? '');
  $o['sender'] = str($v->sender ?? '', 300); $o['receiver'] = str($v->receiver ?? '', 300);
  if ($type === 'in') need($o['sender'] !== '', 'فرستنده نامه وارده را بنویسید.');
  if ($type === 'out') need($o['receiver'] !== '', 'گیرنده نامه صادره را بنویسید.');
  $o['needReply'] = !empty($v->needReply);
  $o['files'] = files($v->files ?? []);
  return $o;
}
function lstate($lid, $pos, $create = false) {
  foreach (D()->lstate as $s) if ($s->l === $lid && $s->pos === $pos) return $s;
  if (!$create) return null;
  $s = (object)['id' => $lid . '|' . $pos, 'l' => $lid, 'pos' => $pos, 'seen' => '', 'arch' => ''];
  D()->lstate[] = $s; return $s;
}
$OPS['sendLetter'] = function ($v) {
  $v = obj($v);
  need(can('letters.create'), 'ثبت و ارسال نامه برای جایگاه شما مجاز نیست.');
  $type = $v->type ?? ''; need(isset(LETTER_TYPES[$type]), 'نوع نامه را انتخاب کنید.');
  $unit = isImam() ? 0 : myUnit();
  $f = letterFields($v, $type);
  $toUnit = null;
  if ($type === 'internal') {
    need(isset($v->toUnit) && $v->toUnit !== '' && ((int)$v->toUnit === 0 || unitExists($v->toUnit)), 'مدیریت گیرنده را انتخاب کنید.');
    $toUnit = (int)$v->toUnit; need($toUnit !== $unit, 'گیرنده مکاتبه داخلی نمی‌تواند همان مدیریت فرستنده باشد.');
    $f['sender'] = unitName($unit); $f['receiver'] = unitName($toUnit);
  }
  if ($type === 'out' && $f['sender'] === '') $f['sender'] = unitName($unit);
  if ($type === 'in' && $f['receiver'] === '') $f['receiver'] = unitName($unit);
  $signer = $v->signer ?? '';
  if ($signer !== '') { $sp = posById($signer); need($sp && ((int)$sp->unitId === $unit || $sp->role === 'imam'), 'امضاکننده باید از همان مدیریت باشد.'); }
  if (!empty($v->draftId)) { $dr = findRec('drafts', $v->draftId); need($dr && $dr->pos === mePos()->id, 'پیش‌نویس یافت نشد.'); }
  $l = (object)array_merge(['id' => uid(), 'no' => nextNo($type), 'type' => $type], $f, ['unitId' => $unit, 'toUnit' => $toUnit, 'signer' => $signer, 'refs' => [], 'replies' => [],
    'status' => 'ثبت‌شده', 'created' => stamp(), 'by' => meUser()->id, 'byPos' => mePos()->id, 'byName' => actorName()]);
  $l->snap = letterSnap($l);
  hist($l, 'ثبت نامه ' . LETTER_TYPES[$type], 'شماره ' . fa($l->no));
  D()->letters[] = $l;
  lstate($l->id, mePos()->id, true)->seen = stamp();
  audit('ثبت نامه', 'letter', $l->id, fa($l->no));
  if ($type === 'internal') referTo($l, $toUnit, 'ارسال مکاتبه داخلی', $f['due']);
  if (!empty($v->draftId)) D()->drafts = array_values(array_filter(D()->drafts, fn($d) => $d->id !== $v->draftId));
  return $l;
};
function referTo($l, $unitId, $note, $due = '', $toPos = '') {
  $l->refs[] = (object)['unitId' => $unitId, 'toPos' => $toPos, 'ts' => stamp(), 'by' => meUser()->id, 'nm' => actorName(), 'pos' => mePos()->id, 'note' => $note, 'due' => $due];
  $l->status = 'ارجاع‌شده';
  if ($due) $l->due = $due;
  hist($l, 'ارجاع به ' . unitName($unitId) . ($toPos ? ' — ' . posLabel($toPos) : ''), $note);
  audit('ارجاع نامه', 'letter', $l->id, unitShort($unitId));
  $t = $toPos ? [$toPos] : ($unitId === 0 ? [imamPos()] : unitAll($unitId));
  notify($t, 'letter', 'نامه ' . fa($l->no) . ' با موضوع «' . ($l->conf === 'عادی' ? $l->subject : 'محرمانه') . '» به ' . unitShort($unitId) . ' ارجاع شد.', 'letters', $l->no, ['k' => 'letter', 'id' => $l->id]);
}
$OPS['referLetter'] = function ($id, $unitId, $note = '', $due = '', $toPos = '') {
  $l = rec('letters', $id);
  need(canHandleLetter($l), 'ارجاع این نامه برای جایگاه شما مجاز نیست.');
  need($unitId !== '' && $unitId !== null && ((int)$unitId === 0 || unitExists($unitId)), 'مدیریت مقصد را انتخاب کنید.');
  $due = needDate($due, 'مهلت اقدام', false);
  if ($toPos) { $p = posById($toPos); need($p && ((int)$p->unitId === (int)$unitId), 'جایگاه گیرنده باید از همان مدیریت باشد.'); }
  referTo($l, (int)$unitId, str($note, 1000), $due, $toPos);
  return $l;
};
$OPS['replyLetter'] = function ($id, $text) {
  $l = rec('letters', $id);
  need(canHandleLetter($l), 'ثبت پاسخ برای جایگاه شما مجاز نیست.');
  $html = sanitizeHtml($text); need(htmlText($html) !== '', 'متن پاسخ را بنویسید.');
  $l->replies[] = (object)['ts' => stamp(), 'by' => meUser()->id, 'nm' => actorName(), 'pos' => mePos()->id, 'unit' => myUnit(), 'text' => $html];
  $l->status = 'پاسخ داده‌شده';
  hist($l, 'ثبت پاسخ', mb_substr(htmlText($html), 0, 80));
  audit('پاسخ نامه', 'letter', $l->id, $l->no);
  $t = [$l->byPos ?? '']; foreach ($l->refs as $r) $t[] = $r->pos ?? '';
  notify(array_merge($t, unitHeads($l->unitId)), 'letter', 'برای نامه ' . fa($l->no) . ' پاسخ ثبت شد.', 'letters', $l->no, ['k' => 'letter', 'id' => $l->id]);
  return $l;
};
$OPS['closeLetter'] = function ($id, $note = '') {
  $l = rec('letters', $id);
  need(canCloseLetter($l), 'مختومه‌کردن پرونده نامه برای جایگاه شما مجاز نیست.');
  need($l->status !== 'مختومه', 'این نامه قبلاً مختومه شده است.');
  $l->status = 'مختومه'; $l->closedAt = stamp();
  hist($l, 'مختومه شد', str($note, 500)); audit('مختومه‌کردن نامه', 'letter', $l->id, $l->no); return $l;
};
$OPS['reopenLetter'] = function ($id, $note) {
  $l = rec('letters', $id);
  need(canCloseLetter($l), 'بازگشایی پرونده نامه برای جایگاه شما مجاز نیست.'); need($l->status === 'مختومه', 'این نامه مختومه نیست.');
  need(str($note) !== '', 'علت بازگشایی را بنویسید.');
  $l->status = count($l->replies) ? 'پاسخ داده‌شده' : (count($l->refs) ? 'ارجاع‌شده' : 'ثبت‌شده');
  hist($l, 'بازگشایی پرونده', str($note, 500)); audit('بازگشایی نامه', 'letter', $l->id, $l->no); return $l;
};
/* وضعیت شخصی: دیده‌شدن و بایگانی شخصی هر جایگاه (روی وضعیت مشترک نامه اثری ندارد) */
$OPS['markSeen'] = function ($id) { $l = rec('letters', $id); need(canSeeLetter($l), 'دسترسی به این نامه مجاز نیست.'); lstate($l->id, mePos()->id, true)->seen = stamp(); if ($l->conf !== 'عادی') audit('مشاهده نامه ' . $l->conf, 'letter', $l->id, $l->no); return ['ok' => 1]; };
$OPS['archiveMine'] = function ($id, $on = true) { $l = rec('letters', $id); need(canSeeLetter($l), 'دسترسی به این نامه مجاز نیست.'); $s = lstate($l->id, mePos()->id, true); $s->arch = $on ? stamp() : ''; if ($on) $s->seen = stamp(); return ['ok' => 1]; };
/* پیش‌نویس نامه (ذخیره خودکار) */
$OPS['saveDraft'] = function ($id, $data) {
  $data = obj($data);
  $clean = ['type' => isset(LETTER_TYPES[$data->type ?? '']) ? $data->type : 'internal'];
  foreach (['subject' => 300, 'sender' => 300, 'receiver' => 300, 'cat' => 60, 'priority' => 30, 'conf' => 30, 'signer' => 40, 'toUnit' => 10, 'date' => 10, 'due' => 10] as $k => $max) $clean[$k] = str($data->$k ?? '', $max);
  $clean['needReply'] = !empty($data->needReply);
  $clean['body'] = sanitizeHtml($data->body ?? '');
  $clean['files'] = files($data->files ?? []);
  if ($id) { $d = findRec('drafts', $id); need($d && $d->pos === mePos()->id, 'پیش‌نویس یافت نشد.'); }
  else {
    need(count(array_filter(D()->drafts, fn($x) => $x->pos === mePos()->id)) < 60, 'تعداد پیش‌نویس‌ها زیاد است؛ پیش‌نویس‌های قدیمی را حذف کنید.');
    $d = (object)['id' => 'd' . uid(), 'uid' => meUser()->id, 'pos' => mePos()->id, 'created' => stamp()]; D()->drafts[] = $d;
  }
  $d->data = (object)$clean; $d->updated = stamp();
  return ['id' => $d->id, 'updated' => $d->updated];
};
$OPS['deleteDraft'] = function ($id) { $d = rec('drafts', $id); need($d->pos === mePos()->id, 'پیش‌نویس متعلق به شما نیست.'); D()->drafts = array_values(array_filter(D()->drafts, fn($x) => $x->id !== $id)); return ['ok' => 1]; };

/* ================= دستورات امام جماعت ================= */
function validOrder($v) {
  need(str($v->title ?? '') !== '', 'عنوان دستور را بنویسید.');
  $issued = ($v->issued ?? '') === '' ? todayISO() : needDate($v->issued, 'تاریخ صدور');
  $due = needDate($v->due ?? '', 'مهلت', false);
  if ($due) need($due >= $issued, 'مهلت نمی‌تواند پیش از تاریخ صدور باشد.');
  need(in_array($v->priority ?? 'عادی', ORG('PRIORITIES')), 'اهمیت معتبر نیست.');
  return [$issued, $due];
}
$OPS['createOrder'] = function ($v) {
  $v = obj($v);
  need(isImam() || can('orders.issue'), 'صدور دستور فقط برای امام جماعت یا جایگاه دارای مجوز است.');
  [$issued, $due] = validOrder($v);
  $units = array_values(array_unique(array_map('intval', arr($v->units ?? []))));
  need(count($units) && count(array_filter($units, 'unitExists')) === count($units), 'دست‌کم یک مدیریت مسئول انتخاب کنید.');
  $resp = $v->respPos ?? ''; $rp = posById($resp);
  if (!$rp) $resp = unitPosId($units[0], 'manager'); elseif (!in_array((int)$rp->unitId, $units, true)) $units[] = (int)$rp->unitId;
  $o = (object)['id' => uid(), 'no' => nextNo('order'), 'title' => str($v->title, 300), 'desc' => str($v->desc ?? '', 20000), 'units' => $units, 'respPos' => $resp,
    'priority' => $v->priority ?? 'عادی', 'issued' => $issued, 'due' => $due, 'files' => files($v->files ?? []), 'needReport' => !empty($v->needReport),
    'status' => 'جدید', 'progress' => 0, 'reports' => [], 'created' => stamp()];
  hist($o, 'صدور دستور', 'مدیریت‌های مسئول: ' . implode('، ', array_map('unitShort', $units)));
  D()->orders[] = $o; audit('صدور دستور', 'order', $o->id, $o->no);
  $t = [$resp]; foreach ($units as $u) $t = array_merge($t, unitHeads($u));
  notify($t, 'order', 'دستور جدید امام جماعت: «' . $o->title . '»', 'orders', $o->no, ['k' => 'order', 'id' => $o->id]);
  return $o;
};
$OPS['orderReport'] = function ($id, $v) {
  $o = rec('orders', $id); $v = obj($v);
  $ok = false; foreach ($o->units as $u) if (isMgrOrOffice($u) && !isImam()) $ok = true;
  need($ok, 'ثبت گزارش پیشرفت برای مدیر و مسئول دفتر مدیریت مسئول مجاز است.');
  need(!in_array($o->status, ['تکمیل‌شده', 'منتظر تأیید']), 'این دستور در انتظار تأیید یا تکمیل‌شده است.');
  $st = $v->status ?? $o->status;
  need(in_array($st, ['در حال بررسی', 'در حال انجام', 'منتظر تأیید']), 'وضعیت نامعتبر است.');
  $note = str($v->note ?? '', 5000);
  if ($st === 'منتظر تأیید' && $o->needReport) need($note !== '', 'این دستور نیازمند گزارش نهایی است؛ متن گزارش را بنویسید.');
  $pg = num($v->progress ?? $o->progress); need(is_numeric($pg) && !is_nan($pg) && $pg >= 0 && $pg <= 100, 'درصد پیشرفت باید بین ۰ تا ۱۰۰ باشد.');
  $o->status = $st; $o->progress = $st === 'منتظر تأیید' ? 100 : round($pg, 2);
  $o->reports[] = (object)['ts' => stamp(), 'by' => meUser()->id, 'nm' => actorName(), 'pos' => mePos()->id, 'note' => $note, 'progress' => $o->progress, 'files' => files($v->files ?? [])];
  hist($o, 'گزارش پیشرفت: ' . $st . ' (' . fa($o->progress) . '٪)', $note);
  audit('گزارش دستور', 'order', $o->id, $o->no);
  if ($st === 'منتظر تأیید') notify([imamPos()], 'order', 'دستور «' . $o->title . '» برای تأیید نهایی ارسال شد.', 'orders', $o->no, ['k' => 'order', 'id' => $o->id]);
  return $o;
};
$OPS['orderDecide'] = function ($id, $ok, $note = '') {
  $o = rec('orders', $id);
  need(isImam(), 'تأیید نهایی دستور با امام جماعت است.');
  need($o->status === 'منتظر تأیید', 'این دستور در انتظار تأیید نیست.');
  if (!$ok) need(str($note) !== '', 'علت بازگشت را بنویسید.');
  $o->status = $ok ? 'تکمیل‌شده' : 'در حال انجام';
  if ($ok) $o->doneAt = stamp(); else $o->progress = min($o->progress, 80);
  hist($o, $ok ? 'تأیید و تکمیل دستور' : 'بازگشت برای اصلاح', str($note, 2000));
  audit($ok ? 'تأیید دستور' : 'بازگشت دستور', 'order', $o->id, $o->no);
  $t = [$o->respPos]; foreach ($o->units as $u) $t = array_merge($t, unitHeads($u));
  notify($t, 'decision', 'دستور «' . $o->title . '» ' . ($ok ? 'تأیید شد' : 'برای اصلاح بازگشت') . '.', 'orders', $o->no, ['k' => 'order', 'id' => $o->id]);
  return $o;
};

/* ================= وظایف ================= */
function validTask($v) {
  need(str($v->title ?? '') !== '', 'عنوان وظیفه را بنویسید.');
  $start = ($v->start ?? '') === '' ? todayISO() : needDate($v->start, 'تاریخ شروع');
  $due = needDate($v->due ?? '', 'مهلت', false);
  if ($due) need($due >= $start, 'مهلت نمی‌تواند پیش از تاریخ شروع باشد.');
  need(in_array($v->priority ?? 'عادی', ORG('PRIORITIES')), 'اولویت معتبر نیست.');
  return [$start, $due];
}
$OPS['createTask'] = function ($v) {
  $v = obj($v); $u = (int)($v->unitId ?? -1);
  need(isImam() ? unitExists($u) : (inUnit($u) && can('tasks.create')), 'تعریف وظیفه برای جایگاه شما در این مدیریت مجاز نیست.');
  [$start, $due] = validTask($v);
  $a = posById($v->assignee ?? ''); need($a && (int)$a->unitId === $u, 'مسئول انجام باید از همین مدیریت باشد.');
  $t = (object)['id' => uid(), 'no' => nextNo('task'), 'unitId' => $u, 'title' => str($v->title, 300), 'desc' => str($v->desc ?? '', 20000), 'assignee' => $a->id, 'start' => $start, 'due' => $due,
    'priority' => $v->priority ?? 'عادی', 'files' => files($v->files ?? []), 'status' => 'جدید', 'created' => stamp(), 'by' => meUser()->id, 'byName' => actorName(), 'byPos' => mePos()->id];
  hist($t, 'تعریف وظیفه', 'مسئول: ' . posWho($a->id));
  D()->tasks[] = $t; audit('تعریف وظیفه', 'task', $t->id, $t->no);
  notify([$a->id], 'request', 'وظیفه جدید به شما ارجاع شد: «' . $t->title . '»', 'tasks', $t->no, ['k' => 'task', 'id' => $t->id]);
  return $t;
};
$OPS['taskAct'] = function ($id, $act, $note = '', $extra = '') {
  $t = rec('tasks', $id); $acts = taskActions($t);
  need(isset($acts[$act]), 'این اقدام برای جایگاه شما مجاز نیست.');
  $note = str($note, 5000); $open = ['k' => 'task', 'id' => $t->id];
  if ($act === 'reassign') {
    $p = posById($extra); need($p && (int)$p->unitId === (int)$t->unitId, 'فرد جدید را از همین مدیریت انتخاب کنید.');
    $old = $t->assignee; $t->assignee = $p->id;
    hist($t, 'ارجاع مجدد', 'از ' . posWho($old) . ' به ' . posWho($p->id) . ($note ? ' — ' . $note : ''), [['f' => 'assignee', 'l' => 'مسئول انجام', 'a' => posLabel($old), 'b' => posLabel($p->id)]]);
    notify([$p->id], 'request', 'وظیفه «' . $t->title . '» به شما ارجاع شد.', 'tasks', $t->no, $open);
  } elseif ($act === 'note') { need($note !== '', 'متن یادداشت را بنویسید.'); hist($t, 'یادداشت پیشرفت', $note); }
  elseif ($act === 'reopen') {
    need($note !== '', 'علت بازگشایی را بنویسید.');
    $t->status = 'در حال انجام'; unset($t->doneAt);
    hist($t, 'بازگشایی وظیفه تأییدشده', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => 'تکمیل‌شده', 'b' => 'در حال انجام']]);
    notify([$t->assignee], 'decision', 'وظیفه «' . $t->title . '» بازگشایی شد.', 'tasks', $t->no, $open);
  } else {
    $map = ['start' => 'در حال انجام', 'submit' => 'منتظر تأیید', 'approve' => 'تکمیل‌شده', 'return' => 'در حال انجام'];
    if ($act === 'return') need($note !== '', 'علت بازگشت را بنویسید.');
    $old = $t->status; $t->status = $map[$act];
    if ($act === 'approve') { $t->doneAt = stamp(); $t->approvedBy = actorName(); }
    hist($t, 'تغییر وضعیت به «' . $t->status . '»', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $t->status]]);
    if ($act === 'submit') notify(unitHeads($t->unitId), 'request', 'وظیفه «' . $t->title . '» برای تأیید ارسال شد.', 'tasks', $t->no, $open);
    if ($act === 'approve' || $act === 'return') notify([$t->assignee], 'decision', 'وظیفه «' . $t->title . '» ' . ($act === 'approve' ? 'تأیید شد' : 'برای اصلاح بازگشت') . '.', 'tasks', $t->no, $open);
  }
  audit('اقدام روی وظیفه', 'task', $t->id, $t->no . ' · ' . $act);
  return $t;
};

/* ================= درخواست‌ها ================= */
$OPS['createRequest'] = function ($v) {
  $v = obj($v);
  need(can('requests.create') || isImam(), 'ثبت درخواست برای جایگاه شما محدود شده است.');
  need(str($v->title ?? '') !== '', 'عنوان درخواست را بنویسید.');
  need(isset($v->toUnit) && unitExists($v->toUnit), 'مدیریت مسئول را انتخاب کنید.');
  need((int)$v->toUnit !== myUnit(), 'درخواست برای مدیریت خودتان از مسیر «وظایف» ثبت می‌شود.');
  $cat = str($v->cat ?? '', 120);
  need($cat === '' || $cat === 'همکاری میان‌بخشی' || in_array($cat, services((int)$v->toUnit)), 'نوع خدمت معتبر نیست.');
  need(in_array($v->priority ?? 'عادی', ORG('PRIORITIES')), 'اولویت معتبر نیست.');
  $due = needDate($v->due ?? '', 'مهلت', false);
  $r = (object)['id' => uid(), 'no' => nextNo('req'), 'title' => str($v->title, 300), 'desc' => str($v->desc ?? '', 20000), 'cat' => $cat, 'fromUnit' => myUnit(), 'toUnit' => (int)$v->toUnit,
    'priority' => $v->priority ?? 'عادی', 'needsImam' => !empty($v->needsImam), 'due' => $due, 'files' => files($v->files ?? []), 'coops' => [], 'coopNotes' => [],
    'stage' => 1, 'status' => 'جاری', 'by' => meUser()->id, 'byName' => actorName(), 'byPos' => mePos()->id, 'created' => stamp(), 'report' => ''];
  hist($r, 'ثبت درخواست', 'کد پیگیری ' . $r->no); hist($r, 'ارجاع به ' . unitName($r->toUnit));
  D()->requests[] = $r; audit('ثبت درخواست', 'request', $r->id, $r->no);
  notify(unitHeads($r->toUnit), 'request', 'درخواست جدید از ' . unitShort($r->fromUnit) . ': «' . $r->title . '»', 'requests', $r->no, ['k' => 'req', 'id' => $r->id]);
  return $r;
};
$OPS['reqAct'] = function ($id, $act, $note = '', $extra = '') {
  $r = rec('requests', $id); $acts = reqActions($r);
  need(isset($acts[$act]), 'این اقدام در این مرحله برای جایگاه شما مجاز نیست.');
  $note = str($note, 5000); $open = ['k' => 'req', 'id' => $r->id]; $toReq = [$r->byPos];
  switch ($act) {
    case 'review': $r->stage = 2; hist($r, 'شروع بررسی و هماهنگی', $note); break;
    case 'coop':
      $u = (int)$extra; need(unitExists($u) && $u !== (int)$r->toUnit, 'مدیریت همکار را انتخاب کنید.');
      if (!in_array($u, $r->coops, true)) $r->coops[] = $u;
      hist($r, 'درخواست همکاری از ' . unitName($u), $note);
      notify(unitHeads($u), 'request', 'درخواست همکاری از ' . unitShort($r->toUnit) . ' برای «' . $r->title . '»', 'requests', $r->no, $open); break;
    case 'coopnote':
      need($note !== '', 'متن نظر یا اقدام را بنویسید.');
      $r->coopNotes[] = (object)['ts' => stamp(), 'unit' => myUnit(), 'by' => meUser()->id, 'nm' => actorName(), 'note' => $note];
      hist($r, 'نظر همکاری ' . unitShort(myUnit()), $note);
      notify(unitHeads($r->toUnit), 'request', unitShort(myUnit()) . ' برای «' . $r->title . '» اقدام همکاری ثبت کرد.', 'requests', $r->no, $open); break;
    case 'send':
      $r->stage = 3; hist($r, 'ارسال برای تأیید ' . ($r->needsImam ? 'امام جماعت' : 'مدیر ' . unitShort($r->toUnit)), $note);
      notify($r->needsImam ? [imamPos()] : [unitPosId($r->toUnit, 'manager')], 'request', 'درخواست «' . $r->title . '» منتظر تأیید شماست.', 'requests', $r->no, $open); break;
    case 'approve': $r->stage = 4; $r->approvedBy = actorName(); hist($r, 'تأیید درخواست', $note); notify(array_merge($toReq, unitHeads($r->toUnit)), 'decision', 'درخواست «' . $r->title . '» تأیید شد.', 'requests', $r->no, $open); break;
    case 'reject': need($note !== '', 'علت رد را بنویسید.'); $r->status = 'ردشده'; hist($r, 'رد درخواست', $note); notify($toReq, 'decision', 'درخواست «' . $r->title . '» رد شد.', 'requests', $r->no, $open); break;
    case 'exec': need($note !== '', 'شرح اقدام اجرایی را بنویسید.'); $r->stage = 5; hist($r, 'ثبت اجرا', $note); break;
    case 'final':
      need($note !== '', 'متن گزارش نهایی را بنویسید.');
      $r->report = $note; $r->stage = 6; $r->status = 'بایگانی'; $r->doneAt = stamp();
      hist($r, 'ثبت گزارش نهایی و بایگانی', $note);
      notify($toReq, 'decision', 'درخواست «' . $r->title . '» انجام و بایگانی شد.', 'requests', $r->no, $open); break;
    case 'cancel': $r->status = 'لغوشده'; hist($r, 'لغو توسط درخواست‌کننده', $note); break;
  }
  audit('اقدام درخواست', 'request', $r->id, $r->no . ' · ' . $act);
  return $r;
};

/* ================= رزرو فضاها ================= */
function validRes($v) {
  $prog = programOf($v->program ?? ''); need($prog, 'نوع برنامه را انتخاب کنید.');
  if (!empty($prog['offsite'])) need(empty($v->space), 'برنامه بیرون از مجتمع به فضای داخلی نیاز ندارد.');
  else { $ok = false; foreach (spaces() as $s) if ($s['id'] === ($v->space ?? '')) $ok = true; need($ok, 'فضای برگزاری را انتخاب کنید.'); }
  need(str($v->kind ?? '') !== '', 'عنوان برنامه را بنویسید.');
  need(str($v->applicant ?? '') !== '', 'نام متقاضی را بنویسید.');
  need(phoneOk(cleanPhone($v->phone ?? '')), 'شماره تماس معتبر نیست (نمونه: ۰۹۱۲۳۴۵۶۷۸۹).');
  needDate($v->date ?? '', 'تاریخ');
  need(isTime($v->start ?? '') && isTime($v->end ?? ''), 'ساعت شروع و پایان را وارد کنید.');
  need($v->end > $v->start, 'ساعت پایان باید بعد از ساعت شروع باشد.');
  $n = num($v->people ?? ''); need(is_int($n) && $n >= 1, 'تعداد افراد باید عدد صحیح و دست‌کم یک نفر باشد.');
  $cap = resCap($v); if ($cap) need($n <= $cap, 'ظرفیت ' . (!empty($v->space) ? resPlace($v) : $prog['name']) . ' ' . fa($cap) . ' نفر است.');
}
$OPS['createReservation'] = function ($v) {
  $v = obj($v);
  need(can('reservations.create') || isImam(), 'ثبت رزرو برای جایگاه شما محدود شده است.');
  validRes($v);
  $r = (object)['id' => uid(), 'no' => nextNo('res'), 'program' => $v->program, 'space' => $v->space ?? '', 'applicant' => str($v->applicant, 200), 'phone' => cleanPhone($v->phone), 'kind' => str($v->kind, 300),
    'date' => $v->date, 'start' => $v->start, 'end' => $v->end, 'people' => (int)num($v->people), 'equip' => str($v->equip ?? '', 1000), 'desc' => str($v->desc ?? '', 4000),
    'status' => 'در انتظار تأیید', 'by' => meUser()->id, 'byPos' => mePos()->id, 'fromUnit' => myUnit(), 'created' => stamp()];
  $c = resConflicts($r);
  hist($r, 'ثبت درخواست رزرو', $c ? 'هشدار: با ' . fa(count($c)) . ' رزرو تأییدشده هم‌زمان است' : '');
  D()->reservations[] = $r; audit('ثبت رزرو', 'reservation', $r->id, $r->no);
  notify(unitHeads(resUnit($r)), 'reservation', 'درخواست رزرو ' . resPlace($r) . ' برای ' . jd($r->date), 'reservations', $r->no, ['k' => 'res', 'id' => $r->id]);
  return $r;
};
$OPS['resDecide'] = function ($id, $status, $note = '') {
  $r = rec('reservations', $id); $note = str($note, 2000);
  need(in_array($status, ['تأییدشده', 'ردشده', 'لغوشده']), 'وضعیت نامعتبر است.');
  if ($status === 'لغوشده') {
    need($r->by === meUser()->id || canDecideRes($r), 'اجازه لغو این رزرو را ندارید.');
    need(in_array($r->status, ['در انتظار تأیید', 'تأییدشده']), 'این رزرو قابل لغو نیست.');
    if ($r->status === 'تأییدشده') need($note !== '', 'علت لغو رزرو تأییدشده را بنویسید.');
  } else {
    need(canDecideRes($r), 'تأیید رزرو ' . resPlace($r) . ' با ' . unitName(resUnit($r)) . ' است.');
    need($r->status === 'در انتظار تأیید', 'این رزرو قبلاً تعیین تکلیف شده است.');
  }
  if ($status === 'تأییدشده') { validRes($r); $c = resConflicts($r); need(!$c, 'تداخل زمانی با رزرو تأییدشده ' . fa($c[0]->no ?? '') . ' (' . fa($c[0]->start ?? '') . ' تا ' . fa($c[0]->end ?? '') . '). ابتدا آن را جابه‌جا یا لغو کنید.'); }
  if ($status === 'ردشده') need($note !== '', 'علت رد را بنویسید.');
  $old = $r->status; $r->status = $status;
  hist($r, 'تغییر وضعیت به «' . $status . '»', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $status]]);
  audit('تصمیم رزرو', 'reservation', $r->id, $r->no . ' · ' . $status);
  notify([$r->byPos], 'reservation', 'رزرو ' . resPlace($r) . ' (' . jd($r->date) . ') ' . $status . ' شد.', 'reservations', $r->no, ['k' => 'res', 'id' => $r->id]);
  return $r;
};
/* جابه‌جایی زمان: با بررسی دوباره تداخل؛ اگر متولی جابه‌جا کند تأیید می‌ماند، وگرنه دوباره منتظر تأیید می‌شود */
$OPS['resReschedule'] = function ($id, $v) {
  $r = rec('reservations', $id); $v = obj($v);
  need($r->by === meUser()->id || canDecideRes($r), 'جابه‌جایی این رزرو برای جایگاه شما مجاز نیست.');
  need(in_array($r->status, ['در انتظار تأیید', 'تأییدشده']), 'فقط رزرو جاری قابل جابه‌جایی است.');
  $note = str($v->note ?? '', 1000); need($note !== '', 'علت جابه‌جایی را بنویسید.');
  $n = clone $r; $n->date = $v->date ?? ''; $n->start = $v->start ?? ''; $n->end = $v->end ?? '';
  if (!empty($v->space)) $n->space = $v->space;
  validRes($n);
  $keep = $r->status === 'تأییدشده' && canDecideRes($r);
  if ($keep) { $c = resConflicts($n); need(!$c, 'زمان جدید با رزرو تأییدشده ' . fa($c[0]->no ?? '') . ' تداخل دارد.'); }
  $diff = [];
  foreach (['date' => 'تاریخ', 'start' => 'شروع', 'end' => 'پایان', 'space' => 'فضا'] as $k => $lb) if ($r->$k !== $n->$k) $diff[] = ['f' => $k, 'l' => $lb, 'a' => $k === 'date' ? jd($r->$k) : ($k === 'space' ? resPlace($r) : $r->$k), 'b' => $k === 'date' ? jd($n->$k) : ($k === 'space' ? resPlace($n) : $n->$k)];
  need($diff, 'زمان یا مکان تغییری نکرده است.');
  $r->date = $n->date; $r->start = $n->start; $r->end = $n->end; $r->space = $n->space;
  if (!$keep) $r->status = 'در انتظار تأیید';
  hist($r, 'جابه‌جایی زمان رزرو', $note . ($keep ? '' : ' — نیازمند تأیید دوباره'), $diff);
  audit('جابه‌جایی رزرو', 'reservation', $r->id, $r->no);
  notify(array_merge([$r->byPos], unitHeads(resUnit($r))), 'reservation', 'زمان رزرو ' . $r->no . ' به ' . jd($r->date) . ' ساعت ' . fa($r->start) . ' تغییر کرد.', 'reservations', $r->no, ['k' => 'res', 'id' => $r->id]);
  return $r;
};

/* ================= جلسات ================= */
function validMeeting($v) {
  need(str($v->title ?? '') !== '', 'عنوان جلسه را بنویسید.');
  needDate($v->date ?? '', 'تاریخ جلسه');
  need(isTime($v->start ?? ''), 'ساعت شروع را وارد کنید.');
  if (($v->end ?? '') !== '') { need(isTime($v->end), 'ساعت پایان معتبر نیست.'); need($v->end > $v->start, 'ساعت پایان باید بعد از شروع باشد.'); }
}
$OPS['createMeeting'] = function ($v) {
  $v = obj($v);
  need(can('meetings.create') || isImam(), 'ثبت جلسه برای جایگاه شما مجاز نیست.');
  validMeeting($v);
  $inv = array_values(array_unique(arr($v->invitees ?? [])));
  foreach ($inv as $p) need(posById($p), 'مدعوین معتبر نیستند.');
  $m = (object)['id' => uid(), 'no' => nextNo('meet'), 'title' => str($v->title, 300), 'date' => $v->date, 'start' => $v->start, 'end' => $v->end ?? '', 'place' => str($v->place ?? '', 200),
    'invitees' => $inv, 'agenda' => str($v->agenda ?? '', 10000), 'minutes' => '', 'attendees' => [], 'minutesFiles' => [], 'resolutions' => [],
    'kind' => in_array($v->kind ?? '', ['جلسه', 'ملاقات']) ? $v->kind : 'جلسه', 'unitId' => myUnit(), 'byPos' => mePos()->id, 'created' => stamp()];
  hist($m, 'ثبت ' . $m->kind);
  D()->meetings[] = $m; audit('ثبت جلسه', 'meeting', $m->id, $m->no);
  notify($inv, 'meeting', 'دعوت به ' . $m->kind . ' «' . $m->title . '» — ' . jd($m->date) . ' ساعت ' . fa($m->start), 'calendar', $m->no, ['k' => 'meet', 'id' => $m->id]);
  return $m;
};
$OPS['meetingMinutes'] = function ($id, $text, $attendees = [], $fl = []) {
  $m = rec('meetings', $id);
  need(canEditMeeting($m), 'ثبت صورت‌جلسه با برگزارکننده جلسه است.');
  $t = str($text, 30000); need($t !== '', 'متن صورت‌جلسه را بنویسید.');
  $att = array_values(array_filter(arr($attendees), fn($p) => in_array($p, $m->invitees) || $p === $m->byPos));
  $m->minutes = $t; $m->attendees = $att; $m->minutesFiles = array_merge($m->minutesFiles, files($fl));
  hist($m, 'ثبت صورت‌جلسه', 'حاضران: ' . fa(count($att)) . ' نفر'); audit('ثبت صورت‌جلسه', 'meeting', $m->id, $m->no);
  return $m;
};
$OPS['addResolution'] = function ($id, $v) {
  $m = rec('meetings', $id); $v = obj($v);
  need(canEditMeeting($m), 'ثبت مصوبه با برگزارکننده جلسه است.');
  $text = str($v->text ?? '', 2000); need($text !== '' && posById($v->owner ?? ''), 'متن مصوبه و مسئول اجرا لازم است.');
  $due = needDate($v->due ?? '', 'مهلت مصوبه', false);
  $x = (object)['id' => uid(), 'text' => $text, 'owner' => $v->owner, 'due' => $due, 'status' => 'در حال پیگیری', 'log' => []];
  $m->resolutions[] = $x;
  hist($m, 'ثبت مصوبه', mb_substr($text, 0, 60) . ' — مسئول: ' . posWho($v->owner)); audit('ثبت مصوبه', 'meeting', $m->id, $m->no);
  notify([$v->owner], 'meeting', 'مصوبه جلسه «' . $m->title . '» به شما سپرده شد.', 'calendar', $m->no, ['k' => 'meet', 'id' => $m->id]);
  return $x;
};
$OPS['resolutionUpdate'] = function ($id, $xid, $status, $note = '') {
  $m = rec('meetings', $id); $x = null; foreach ($m->resolutions as $r) if ($r->id === $xid) $x = $r;
  need($x, 'مصوبه یافت نشد.'); need(in_array($status, ['در حال پیگیری', 'انجام‌شده']), 'وضعیت نامعتبر است.');
  need($x->owner === mePos()->id || canEditMeeting($m), 'به‌روزرسانی مصوبه با مسئول اجرا یا برگزارکننده است.');
  $x->status = $status; $x->log[] = (object)['ts' => stamp(), 'by' => meUser()->id, 'nm' => actorName(), 'note' => str($note, 2000), 'status' => $status];
  hist($m, 'پیگیری مصوبه: ' . $status, mb_substr($x->text, 0, 50) . ($note ? ' — ' . $note : '')); audit('پیگیری مصوبه', 'meeting', $m->id, $m->no);
  return $x;
};

/* ================= اموال و انبار ================= */
$OPS['createAsset'] = function ($v) {
  $v = obj($v); $u = (int)($v->unitId ?? -1);
  need(unitExists($u), 'واحد مالک را انتخاب کنید.');
  need(isImam() || (can('assets.manage') && (inUnit($u) || inUnit(U_INTERNAL))), 'ثبت اموال برای مسئولان همان واحد یا مدیریت داخلی مجاز است.');
  $name = str($v->name ?? '', 200); need($name !== '', 'نام کالا را بنویسید.');
  $val = num($v->value ?? 0); need(is_numeric($val) && !is_nan($val) && $val >= 0, 'ارزش باید عدد مثبت باشد.');
  need(in_array($v->health ?? 'سالم', ASSET_HEALTH), 'وضعیت نامعتبر است.');
  $n = (D()->seq->{'asset-' . $u} ?? 0) + 1; D()->seq->{'asset-' . $u} = $n;
  $a = (object)['id' => uid(), 'code' => 'AM-' . pad($u) . '-' . pad($n, 4), 'name' => $name, 'cat' => str($v->cat ?? '', 100), 'unitId' => $u, 'whId' => str($v->whId ?? '', 20), 'health' => $v->health ?? 'سالم',
    'location' => str($v->location ?? '', 200), 'serial' => str($v->serial ?? '', 100), 'specs' => str($v->specs ?? '', 2000), 'value' => $val, 'holder' => '', 'loaned' => false, 'created' => stamp()];
  hist($a, 'ثبت در فهرست اموال', $a->code); D()->assets[] = $a; audit('ثبت مال', 'asset', $a->id, $a->code);
  return $a;
};
function whName($id) { foreach (D()->warehouses as $w) if ($w->id === $id) return $w->name; return '—'; }
function applyMovement($a, $m) {
  if ($m->type === 'خروج') { $a->location = 'خارج از مجتمع'; $a->out = true; }
  if ($m->type === 'امانت') { $a->loaned = true; $a->holder = $m->person; }
  if ($m->type === 'عودت') { $a->loaned = false; $a->holder = ''; }
  if ($m->type === 'جابه‌جایی') $a->whId = $m->toWh;
  if ($m->type === 'ورود') $a->out = false;
  hist($a, $m->type . ($m->person ? ' — ' . $m->person : '') . ($m->toWh ? ' به ' . whName($m->toWh) : ''), $m->note);
}
$OPS['createMovement'] = function ($id, $v) {
  $a = rec('assets', $id); $v = obj($v);
  need(canManageAsset($a), 'ثبت گردش این کالا برای جایگاه شما مجاز نیست.');
  $type = $v->type ?? ''; need(in_array($type, MOVE_TYPES), 'نوع عملیات را انتخاب کنید.');
  if ($type === 'جابه‌جایی') need(findRec('warehouses', $v->toWh ?? ''), 'انبار مقصد را انتخاب کنید.');
  if ($type === 'امانت') need(str($v->person ?? '') !== '', 'نام امانت‌گیرنده لازم است.');
  if ($type === 'عودت') need(!empty($a->loaned), 'این کالا در امانت نیست.');
  if ($a->health === 'اسقاط') need($type === 'خروج', 'کالای اسقاط فقط قابل خروج است.');
  $needs = in_array($type, ['خروج', 'امانت', 'جابه‌جایی']);
  $m = (object)['id' => uid(), 'no' => nextNo('mov'), 'assetId' => $a->id, 'type' => $type, 'toWh' => $v->toWh ?? '', 'person' => str($v->person ?? '', 200), 'date' => ($v->date ?? '') ? needDate($v->date, 'تاریخ') : todayISO(),
    'note' => str($v->note ?? '', 2000), 'status' => $needs ? 'در انتظار تأیید' : 'تأییدشده', 'byPos' => mePos()->id, 'created' => stamp()];
  hist($m, 'ثبت ' . $type, $needs ? 'نیازمند تأیید مسئول مجاز' : '');
  D()->movements[] = $m; audit('ثبت گردش کالا', 'movement', $m->id, $a->code . ' · ' . $type);
  if (!$needs) applyMovement($a, $m);
  else notify([unitPosId($a->unitId, 'manager'), unitPosId(U_INTERNAL, 'manager')], 'request', 'درخواست ' . $type . ' کالای ' . $a->code . ' (' . $a->name . ')', 'assets', $m->no, ['k' => 'move', 'id' => $m->id]);
  return $m;
};
$OPS['decideMovement'] = function ($id, $ok, $note = '') {
  $m = rec('movements', $id); $a = rec('assets', $m->assetId);
  need(canApproveMove($a), 'تأیید خروج و جابه‌جایی با مدیر واحد مالک یا مدیر داخلی است.');
  need($m->status === 'در انتظار تأیید', 'این مورد قبلاً تعیین تکلیف شده است.');
  if (!$ok) need(str($note) !== '', 'علت رد را بنویسید.');
  $m->status = $ok ? 'تأییدشده' : 'ردشده'; $m->approver = actorName();
  hist($m, $ok ? 'تأیید' : 'رد', str($note, 1000));
  if ($ok) applyMovement($a, $m);
  audit($ok ? 'تأیید گردش کالا' : 'رد گردش کالا', 'movement', $m->id, $a->code);
  notify([$m->byPos], 'decision', $m->type . ' کالای ' . $a->code . ' ' . ($ok ? 'تأیید' : 'رد') . ' شد.', 'assets', $m->no, ['k' => 'move', 'id' => $m->id]);
  return $m;
};
$OPS['assetHealth'] = function ($id, $health, $note = '') {
  $a = rec('assets', $id); need(canManageAsset($a), 'تغییر وضعیت این کالا برای جایگاه شما مجاز نیست.'); need(in_array($health, ASSET_HEALTH), 'وضعیت نامعتبر است.');
  $old = $a->health; $a->health = $health;
  hist($a, 'تغییر وضعیت سلامت', str($note, 1000), [['f' => 'health', 'l' => 'وضعیت', 'a' => $old, 'b' => $health]]); audit('تغییر وضعیت کالا', 'asset', $a->id, $a->code);
  return $a;
};
$OPS['addWarehouse'] = function ($v) {
  $v = obj($v); need(isImam() || (inUnit(U_INTERNAL) && can('assets.manage')), 'تعریف انبار با مدیریت داخلی است.');
  $name = label($v->name ?? '', 'نام انبار'); need(unitExists($v->unitId ?? 0), 'واحد را انتخاب کنید.');
  $w = (object)['id' => 'w' . substr(uid(), 0, 6), 'name' => $name, 'unitId' => (int)$v->unitId]; D()->warehouses[] = $w; audit('تعریف انبار', 'warehouse', $w->id, $name); return $w;
};

/* ================= مرخصی و سوابق اداری ================= */
$OPS['createLeave'] = function ($v) {
  $v = obj($v);
  need(in_array($v->type ?? '', leaveTypes()), 'نوع مرخصی را انتخاب کنید.');
  $from = needDate($v->from ?? '', 'تاریخ شروع مرخصی'); $to = needDate($v->to ?? '', 'تاریخ پایان مرخصی'); need($to >= $from, 'بازه تاریخ مرخصی معتبر نیست.');
  $imam = isImam();
  $l = (object)['id' => uid(), 'no' => nextNo('leave'), 'uid' => meUser()->id, 'nm' => actorName(), 'pos' => mePos()->id, 'unitId' => myUnit(), 'type' => $v->type, 'from' => $from, 'to' => $to, 'reason' => str($v->reason ?? '', 2000),
    'status' => $imam ? 'در انتظار ثبت امور اداری' : 'در انتظار تأیید مدیر', 'created' => stamp()];
  hist($l, 'ثبت درخواست مرخصی', jd($from) . ' تا ' . jd($to));
  D()->leaves[] = $l; audit('درخواست مرخصی', 'leave', $l->id, $l->no);
  $ap = $imam ? unitHeads(U_ADMIN) : [myRole() === 'manager' ? imamPos() : unitPosId(myUnit(), 'manager')];
  notify($ap, 'request', 'درخواست مرخصی ' . actorName(), 'hr', $l->no, ['k' => 'leave', 'id' => $l->id]);
  return $l;
};
$OPS['leaveAct'] = function ($id, $ok, $note = '') {
  $l = rec('leaves', $id); need(leaveCanAct($l), 'تأیید این مرحله با جایگاه شما نیست.'); $note = str($note, 1000);
  $open = ['k' => 'leave', 'id' => $l->id];
  if (!$ok) { need($note !== '', 'علت رد را بنویسید.'); $l->status = 'ردشده'; hist($l, 'رد', $note); }
  elseif ($l->status === 'در انتظار تأیید مدیر') { $l->status = 'در انتظار ثبت امور اداری'; hist($l, 'تأیید مدیر', $note); notify(unitHeads(U_ADMIN), 'request', 'مرخصی ' . $l->nm . ' برای ثبت ارسال شد.', 'hr', $l->no, $open); }
  else { $l->status = 'تأییدشده'; hist($l, 'ثبت در امور اداری', $note); }
  audit('اقدام مرخصی', 'leave', $l->id, $l->no . ' · ' . $l->status);
  if (in_array($l->status, ['تأییدشده', 'ردشده'])) notify([$l->pos], 'decision', 'درخواست مرخصی شما ' . $l->status . ' شد.', 'hr', $l->no, $open);
  return $l;
};
$OPS['addHR'] = function ($kind, $v) {
  $v = obj($v);
  need(in_array($kind, ['missions', 'decrees', 'contracts']), 'نوع سابقه نامعتبر است.');
  need(canHR(), 'ثبت سوابق اداری فقط برای مدیریت امور اداری مجاز است.');
  $u = userById($v->uid ?? ''); need($u, 'کارمند را انتخاب کنید.');
  $r = (object)['id' => uid(), 'uid' => $u->id, 'nm' => $u->name, 'created' => stamp(), 'by' => meUser()->id, 'status' => 'تأییدشده'];
  foreach (['title' => 300, 'dest' => 300, 'type' => 100, 'note' => 2000] as $k => $mx) if (isset($v->$k)) $r->$k = str($v->$k, $mx);
  foreach (['date', 'from', 'to', 'start', 'end'] as $k) if (!empty($v->$k)) $r->$k = needDate($v->$k, 'تاریخ');
  if (isset($v->amount)) { $a = num($v->amount); need(is_numeric($a) && !is_nan($a) && $a >= 0, 'مبلغ معتبر نیست.'); $r->amount = $a; }
  D()->$kind[] = $r; audit('ثبت سابقه اداری', $kind, $r->id, $r->title ?? $r->dest ?? $r->type ?? ''); return $r;
};

/* ================= پیام‌های مستقیم ================= */
$OPS['sendMessage'] = function ($to, $text, $fl = []) {
  need(can('messages.use') || isImam(), 'ارسال پیام برای جایگاه شما محدود شده است.');
  $p = posById($to); need($p, 'گیرنده را انتخاب کنید.'); need($p->id !== mePos()->id, 'پیام به خودتان قابل ارسال نیست.');
  $t = str($text, 5000); $f = files($fl); need($t !== '' || $f, 'متن پیام را بنویسید.');
  $m = (object)['id' => uid(), 'from' => mePos()->id, 'fromName' => actorName(), 'to' => $p->id, 'text' => $t, 'files' => $f, 'ts' => stamp(), 'read' => false];
  D()->messages[] = $m;
  $prev = array_filter(D()->messages, fn($x) => $x->from === $m->from && $x->to === $m->to && !$x->read && $x->id !== $m->id);
  if (!$prev) notify([$p->id], 'message', 'پیام جدید از ' . panelName(mePos()) . ' (' . actorName() . ')', 'messages', '', ['k' => 'msg', 'id' => mePos()->id]);
  return $m;
};
$OPS['readThread'] = function ($other) { $me = mePos()->id; $n = 0; foreach (D()->messages as $m) if ($m->to === $me && $m->from === $other && !$m->read) { $m->read = stamp(); $n++; } return ['n' => $n]; };

/* ================= اعلان‌ها ================= */
$OPS['readNotif'] = function ($id) { $n = rec('notifs', $id); need($n->pos === mePos()->id, 'این اعلان متعلق به شما نیست.'); $n->read = true; return ['ok' => 1]; };
$OPS['readAllNotifs'] = function () { foreach (D()->notifs as $n) if ($n->pos === mePos()->id) $n->read = true; return ['ok' => 1]; };
