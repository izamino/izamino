<?php
/* ابزارهای اختصاصی مدیریت‌ها و ویرایش رکوردها با ثبت مقدار قبل و بعد */
if (!defined('KT')) exit;
$OPS = &$GLOBALS['OPS'];

function fieldVal($f, $raw) {
  [$k, $lb] = $f; $t = $f[2] ?? 'text'; $o = $f[3] ?? null; $req = substr($k, -1) === '*';
  $empty = $raw === null || $raw === '' || (is_array($raw) && !$raw);
  if ($empty) { need(!$req, '«' . $lb . '» لازم است.'); return ''; }
  switch ($t) {
    case 'area': return str($raw, 8000);
    case 'int': {
      $n = num($raw); need(is_int($n), '«' . $lb . '» باید عدد صحیح باشد.');
      $min = is_array($o) ? ($o['min'] ?? 0) : 0; need($n >= $min, '«' . $lb . '» نباید کمتر از ' . fa($min) . ' باشد.');
      if (is_array($o) && isset($o['max'])) need($n <= $o['max'], '«' . $lb . '» نباید بیشتر از ' . fa($o['max']) . ' باشد.');
      return $n;
    }
    case 'dec': {
      $s = str_replace(['٫', '/'], '.', en((string)$raw)); $n = num($s); need(is_numeric($n) && !is_nan($n), '«' . $lb . '» باید عدد باشد.');
      $min = is_array($o) ? ($o['min'] ?? 0) : 0; need($n >= $min, '«' . $lb . '» نباید کمتر از ' . fa($min) . ' باشد.');
      if (is_array($o) && isset($o['max'])) need($n <= $o['max'], '«' . $lb . '» نباید بیشتر از ' . fa($o['max']) . ' باشد.');
      $dp = (is_array($o) && isset($o['step'])) ? max(0, strlen(substr(strrchr((string)$o['step'], '.') ?: '', 1))) : 2;
      return round($n, $dp);
    }
    case 'money': { $n = num($raw); need(is_numeric($n) && !is_nan($n) && $n >= 0, '«' . $lb . '» باید مبلغ مثبت باشد.'); return round($n); }
    case 'date': return needDate($raw, '«' . $lb . '»');
    case 'time': need(isTime($raw), '«' . $lb . '» معتبر نیست.'); return $raw;
    case 'phone': { $p = cleanPhone($raw); need(phoneOk($p), '«' . $lb . '» معتبر نیست.'); return $p; }
    case 'sel': need(in_array($raw, $o, true), 'مقدار «' . $lb . '» از فهرست انتخاب نشده است.'); return $raw;
    case 'unit': need(unitExists($raw), '«' . $lb . '» معتبر نیست.'); return (int)$raw;
    case 'space': { foreach (spaces() as $s) if ($s['id'] === $raw) return $raw; need(false, '«' . $lb . '» معتبر نیست.'); }
  }
  return str($raw, 300);
}
function fieldShow($f, $v) {
  $t = $f[2] ?? 'text';
  if ($v === '' || $v === null) return '—';
  if ($t === 'date') return jd($v);
  if ($t === 'money') return money($v);
  if ($t === 'unit') return unitShort($v);
  if ($t === 'space') return spaceOf($v)['name'];
  if (in_array($t, ['int', 'dec'])) return fa($v);
  return mb_substr((string)$v, 0, 120);
}
function toolRecOrFail($id) { $r = rec('toolrecs', $id); need(empty($r->deleted), 'این مورد حذف شده است.'); return $r; }
function toolLowStatus($t, $data) {
  if (empty($t['low'])) return null;
  [$q, $m] = $t['low']; $qty = (float)($data[$q] ?? 0); $min = (float)($data[$m] ?? 0);
  return $qty <= 0 ? 'ناموجود' : ($qty < $min ? 'رو به اتمام' : 'موجود');
}
$OPS['toolSave'] = function ($unit, $key, $id, $v) {
  $unit = (int)$unit; $t = toolDef($unit, $key); need($t, 'ابزار یافت نشد.'); $v = obj($v);
  $lv = toolLevel($unit, $key);
  $data = []; foreach ($t['f'] as $f) { $k = rtrim($f[0], '*'); $data[$k] = fieldVal($f, $v->$k ?? null); }
  if (isset($data['from'], $data['to']) && $data['from'] && $data['to']) need($data['to'] >= $data['from'], 'تاریخ پایان نمی‌تواند پیش از تاریخ شروع باشد.');
  $assignee = ''; if (!empty($t['as']) && !empty($v->assignee)) { $p = posById($v->assignee); need($p && (int)$p->unitId === $unit, 'مسئول پیگیری باید از همین مدیریت باشد.'); $assignee = $p->id; }
  $due = !empty($t['due']) ? needDate($v->due ?? '', 'مهلت', false) : '';
  $low = toolLowStatus($t, $data);
  if ($id) {
    $r = toolRecOrFail($id); need($r->unitId === $unit && $r->tool === $key, 'مورد نامعتبر است.');
    need(canEditToolRec($r), 'ویرایش این مورد برای جایگاه شما مجاز نیست.');
    need(!in_array($r->status, $t['fin']), 'این مورد نهایی و قفل شده است؛ ویرایش پس از بازگشایی توسط مدیر ممکن است.');
    $diff = [];
    foreach ($t['f'] as $f) { $k = rtrim($f[0], '*'); $a = $r->data->$k ?? ''; $b = $data[$k]; if ((string)$a !== (string)$b) $diff[] = ['f' => $k, 'l' => $f[1], 'a' => fieldShow($f, $a), 'b' => fieldShow($f, $b)]; }
    if (($r->assignee ?? '') !== $assignee) $diff[] = ['f' => 'assignee', 'l' => 'مسئول پیگیری', 'a' => $r->assignee ? posLabel($r->assignee) : '—', 'b' => $assignee ? posLabel($assignee) : '—'];
    if (($r->due ?? '') !== $due) $diff[] = ['f' => 'due', 'l' => 'مهلت', 'a' => jd($r->due ?? ''), 'b' => jd($due)];
    if (!$diff) return $r;
    $r->data = (object)$data; $r->assignee = $assignee; $r->due = $due;
    if ($low && $low !== $r->status) { $diff[] = ['f' => 'status', 'l' => 'وضعیت', 'a' => $r->status, 'b' => $low]; $r->status = $low; }
    hist($r, 'ویرایش', str($v->_note ?? '', 500), $diff); audit('ویرایش ابزار ' . $t['t'], 'tool', $r->id, $r->no);
    if ($assignee && $assignee !== mePos()->id && in_array('assignee', array_column($diff, 'f'))) notify([$assignee], 'request', 'مورد «' . ($data['title'] ?? $t['t']) . '» در ' . $t['t'] . ' به شما سپرده شد.', 'unit-' . $unit, $r->no, ['k' => 'tool', 'id' => $r->id]);
    return $r;
  }
  need(in_array($lv, ['own', 'all']), 'ثبت در «' . $t['t'] . '» برای جایگاه شما مجاز نیست.');
  $r = (object)['id' => uid(), 'no' => nextNo('tool'), 'unitId' => $unit, 'tool' => $key, 'data' => (object)$data, 'status' => $low ?: $t['st'][0], 'pending' => '', 'assignee' => $assignee, 'due' => $due,
    'files' => files($v->files ?? []), 'by' => meUser()->id, 'byName' => actorName(), 'byPos' => mePos()->id, 'created' => stamp()];
  hist($r, 'ثبت در ' . $t['t']); D()->toolrecs[] = $r; audit('ثبت در ابزار ' . $t['t'], 'tool', $r->id, $r->no);
  if ($assignee && $assignee !== mePos()->id) notify([$assignee], 'request', 'مورد «' . ($data['title'] ?? $t['t']) . '» در ' . $t['t'] . ' به شما سپرده شد.', 'unit-' . $unit, $r->no, ['k' => 'tool', 'id' => $r->id]);
  return $r;
};
$OPS['toolStatus'] = function ($id, $status, $note = '') {
  $r = toolRecOrFail($id); $t = toolOf($r); need($t, 'ابزار یافت نشد.');
  need(canEditToolRec($r), 'تغییر وضعیت این مورد برای جایگاه شما مجاز نیست.');
  need(in_array($status, $t['st']), 'وضعیت نامعتبر است.');
  need(!in_array($r->status, $t['fin']), 'این مورد نهایی و قفل شده است؛ فقط مدیر می‌تواند با ثبت علت آن را بازگشایی کند.');
  need($status !== $r->status, 'وضعیت تغییری نکرده است.');
  $note = str($note, 2000);
  if (in_array($status, $t['fin']) && !empty($t['ap']) && !canApproveTool($r->unitId)) {
    $r->pending = $status;
    hist($r, 'درخواست تأیید مدیر برای «' . $status . '»', $note);
    notify([unitPosId($r->unitId, 'manager')], 'request', $t['t'] . ': «' . ($r->data->title ?? $r->no) . '» منتظر تأیید شماست.', 'unit-' . $r->unitId, $r->no, ['k' => 'tool', 'id' => $r->id]);
  } else {
    $old = $r->status; $r->status = $status; $r->pending = '';
    if (in_array($status, $t['fin'])) { $r->doneAt = stamp(); $r->approvedBy = actorName(); }
    hist($r, 'تغییر وضعیت', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $status]]);
  }
  audit('تغییر وضعیت ابزار', 'tool', $r->id, $r->no . ' · ' . $status);
  return $r;
};
$OPS['toolApprove'] = function ($id, $ok, $note = '') {
  $r = toolRecOrFail($id); $t = toolOf($r);
  need(canApproveTool($r->unitId), 'تأیید با مدیر همین مدیریت است.'); need(!empty($r->pending), 'این مورد منتظر تأیید نیست.');
  $note = str($note, 2000);
  if ($ok) { $old = $r->status; $r->status = $r->pending; $r->doneAt = stamp(); $r->approvedBy = actorName(); hist($r, 'تأیید مدیر', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $r->status]]); }
  else { need($note !== '', 'علت رد را بنویسید.'); hist($r, 'رد درخواست «' . $r->pending . '»', $note); }
  $r->pending = '';
  audit($ok ? 'تأیید ابزار' : 'رد تأیید ابزار', 'tool', $r->id, $r->no);
  notify([$r->byPos, $r->assignee ?? ''], 'decision', $t['t'] . ': «' . ($r->data->title ?? $r->no) . '» ' . ($ok ? 'تأیید شد' : 'تأیید نشد') . '.', 'unit-' . $r->unitId, $r->no, ['k' => 'tool', 'id' => $r->id]);
  return $r;
};
$OPS['toolReopen'] = function ($id, $note) {
  $r = toolRecOrFail($id); $t = toolOf($r);
  need(canApproveTool($r->unitId), 'بازگشایی فقط با مدیر همین مدیریت است.'); need(in_array($r->status, $t['fin']), 'این مورد قفل نیست.');
  $note = str($note, 2000); need($note !== '', 'علت بازگشایی را بنویسید.');
  $open = array_values(array_diff($t['st'], $t['fin']));
  $old = $r->status; $r->status = $open ? $open[count($open) > 1 ? 1 : 0] : $t['st'][0]; unset($r->doneAt);
  hist($r, 'بازگشایی', $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $r->status]]); audit('بازگشایی ابزار', 'tool', $r->id, $r->no);
  return $r;
};
$OPS['toolDelete'] = function ($id, $note) {
  $r = toolRecOrFail($id); need(canApproveTool($r->unitId), 'حذف فقط با مدیر همین مدیریت است.');
  $note = str($note, 1000); need($note !== '', 'علت حذف را بنویسید.');
  $r->deleted = true; hist($r, 'حذف', $note); audit('حذف مورد ابزار', 'tool', $r->id, $r->no . ' — ' . $note); return ['ok' => 1];
};
$OPS['toolNote'] = function ($id, $note) {
  $r = toolRecOrFail($id); need(canEditToolRec($r) || canApproveTool($r->unitId), 'ثبت یادداشت برای جایگاه شما مجاز نیست.');
  $note = str($note, 3000); need($note !== '', 'متن یادداشت را بنویسید.'); hist($r, 'یادداشت پیگیری', $note); return $r;
};

/* ---------- ویرایش رکوردها: فیلدهای مجاز، قفل پس از نهایی‌شدن و ثبت قبل/بعد ---------- */
function editRules() {
  return [
    'task' => ['tasks', fn($r) => (isImam() || (inUnit($r->unitId) && can('tasks.create'))) && $r->status !== 'تکمیل‌شده', ['title' => 'عنوان', 'desc' => 'شرح', 'priority' => 'اولویت', 'start' => 'شروع', 'due' => 'مهلت'],
      function ($r, $v) { validTask($v); }],
    'letter' => ['letters', fn($r) => canSeeLetter($r) && (isImam() || (inUnit($r->unitId) && can('letters.create'))) && $r->status !== 'مختومه',
      ['subject' => 'موضوع', 'sender' => 'فرستنده', 'receiver' => 'گیرنده', 'cat' => 'طبقه‌بندی', 'priority' => 'اهمیت', 'conf' => 'محرمانگی', 'date' => 'تاریخ', 'due' => 'مهلت اقدام', 'body' => 'متن'],
      function ($r, $v) { $f = letterFields($v, $r->type); foreach (['body', 'date', 'due'] as $k) $v->$k = $f[$k]; }],
    'order' => ['orders', fn($r) => isImam() && $r->status !== 'تکمیل‌شده', ['title' => 'عنوان', 'desc' => 'شرح', 'priority' => 'اهمیت', 'due' => 'مهلت'], function ($r, $v) { $v->issued = $r->issued; validOrder($v); }],
    'meet' => ['meetings', fn($r) => canEditMeeting($r), ['title' => 'عنوان', 'date' => 'تاریخ', 'place' => 'محل', 'start' => 'شروع', 'end' => 'پایان', 'agenda' => 'دستور جلسه'], function ($r, $v) { validMeeting($v); }],
    'asset' => ['assets', fn($r) => canManageAsset($r), ['name' => 'نام', 'cat' => 'دسته', 'serial' => 'سریال', 'value' => 'ارزش', 'specs' => 'مشخصات', 'location' => 'محل'],
      function ($r, $v) { need(str($v->name ?? '') !== '', 'نام کالا را بنویسید.'); $n = num($v->value ?? 0); need(is_numeric($n) && !is_nan($n) && $n >= 0, 'ارزش باید عدد مثبت باشد.'); $v->value = $n; }]
  ];
}
$OPS['editRecord'] = function ($kind, $id, $v) {
  $R = editRules()[$kind] ?? null; need($R, 'نوع رکورد نامعتبر است.');
  [$col, $ok, $fields, $check] = $R;
  $r = rec($col, $id); need($ok($r), 'ویرایش این مورد برای جایگاه شما مجاز نیست (یا مورد نهایی و قفل شده است).');
  $v = obj($v); $nv = new stdClass();
  foreach ($fields as $k => $lb) $nv->$k = property_exists($v, $k) ? (is_string($v->$k) ? mb_substr($v->$k, 0, 30000) : $v->$k) : ($r->$k ?? '');
  $check($r, $nv);
  $diff = [];
  foreach ($fields as $k => $lb) {
    $a = $r->$k ?? ''; $b = $nv->$k ?? '';
    if ((string)$a === (string)$b) continue;
    $show = fn($x) => in_array($k, ['date', 'start', 'due']) && isDate((string)$x) ? jd($x) : mb_substr(htmlText((string)$x), 0, 120);
    $diff[] = ['f' => $k, 'l' => $lb, 'a' => $show($a), 'b' => $show($b)];
    $r->$k = $b;
  }
  if (!$diff) return $r;
  if ($kind === 'letter' && isset($r->snap)) $r->snap->issued = $r->date;
  hist($r, 'ویرایش', str($v->_note ?? '', 500), $diff);
  audit('ویرایش ' . $col, $col, $r->id, $r->no ?? $r->code ?? '');
  return $r;
};
