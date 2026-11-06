<?php
/* امور مالی: درخواست پرداخت، بودجه، حسابداری دوطرفه (کدینگ، دوره، سند، برگشت)، فاکتور، اسناد ارسالی واحدها */
if (!defined('KT')) exit;
$OPS = &$GLOBALS['OPS'];

const V_DRAFT = 'پیش‌نویس', V_POSTED = 'قطعی', V_REVERSED = 'برگشت‌خورده';
const INV_DRAFT = 'پیش‌نویس', INV_ISSUED = 'صادرشده', INV_VOID = 'باطل‌شده';

function accByCode($c) { foreach (D()->accounts as $a) if ($a->code === (string)$c) return $a; return null; }
function accIsLeaf($c) { foreach (D()->accounts as $a) if (($a->parent ?? '') === (string)$c) return false; return true; }
function accLabel($c) { $a = accByCode($c); return $a ? fa($a->code) . ' ' . $a->name : (string)$c; }
function periodOfDate($d) { foreach (D()->periods as $p) if ($d >= $p->from && $d <= $p->to) return $p; return null; }
function openPeriodFor($d) { $p = periodOfDate($d); need($p, 'برای تاریخ ' . jd($d) . ' دوره مالی تعریف نشده است.'); need($p->status === 'باز', 'دوره مالی «' . $p->title . '» بسته است.'); return $p; }
function amt($v, $what) { $n = num($v); need($n !== null && is_numeric($n) && !is_nan($n) && $n >= 0 && $n < 1e16, $what . ' باید عدد مثبت باشد.'); return round($n); }

/* سند متوازن: هر ردیف فقط بدهکار یا فقط بستانکار؛ جمع بدهکار = جمع بستانکار */
function cleanLines($lines) {
  $out = []; $dr = 0; $cr = 0;
  foreach (arr($lines) as $i => $l) {
    $l = obj($l); $n = fa($i + 1);
    $a = accByCode($l->acc ?? ''); need($a, "حساب ردیف $n را انتخاب کنید.");
    need(accIsLeaf($a->code), "حساب ردیف $n («{$a->name}») حساب کل است؛ حساب معین را انتخاب کنید.");
    need(!empty($a->active), "حساب ردیف $n غیرفعال است.");
    $d = amt($l->dr ?? 0, "مبلغ بدهکار ردیف $n"); $c = amt($l->cr ?? 0, "مبلغ بستانکار ردیف $n");
    need(($d > 0) !== ($c > 0), "ردیف $n باید فقط بدهکار یا فقط بستانکار داشته باشد.");
    $u = ($l->unitId ?? '') === '' ? null : (int)$l->unitId;
    if ($u !== null) need($u === 0 || unitExists($u), "مرکز هزینه ردیف $n معتبر نیست.");
    $out[] = (object)['acc' => $a->code, 'unitId' => $u, 'desc' => str($l->desc ?? '', 300), 'dr' => $d, 'cr' => $c];
    $dr += $d; $cr += $c;
  }
  need(count($out) >= 2, 'سند دست‌کم دو ردیف لازم دارد.');
  need($dr > 0 && $dr === $cr, 'سند تراز نیست: جمع بدهکار ' . money($dr) . ' و جمع بستانکار ' . money($cr) . ' است.');
  return [$out, $dr];
}
function newVoucher($date, $desc, $lines, $status, $extra = []) {
  $p = openPeriodFor($date);
  [$ls, $total] = cleanLines($lines);
  $k = 'v-' . $p->id; $no = (D()->seq->{$k} ?? 0) + 1; D()->seq->{$k} = $no;
  $v = (object)array_merge(['id' => 'v' . uid(), 'no' => $no, 'periodId' => $p->id, 'date' => $date, 'desc' => str($desc, 1000), 'ref' => '', 'lines' => $ls, 'total' => $total, 'status' => $status,
    'by' => meUser()->id, 'byName' => actorName(), 'created' => stamp(), 'src' => null], $extra);
  if ($status === V_POSTED) { $v->postedBy = actorName(); $v->postedAt = stamp(); }
  hist($v, $status === V_POSTED ? 'ثبت و قطعی‌شدن سند' : 'ثبت پیش‌نویس سند', $v->desc);
  D()->vouchers[] = $v;
  audit('ثبت سند حسابداری', 'voucher', $v->id, 'سند ' . $no . ' · ' . $p->title);
  return $v;
}
function refDup($ref, $periodId, $exceptId = '') {
  if ($ref === '') return null;
  foreach (D()->vouchers as $x) if ($x->id !== $exceptId && $x->periodId === $periodId && ($x->ref ?? '') === $ref && $x->status !== V_REVERSED && empty($x->reverseOf)) return $x;
  return null;
}

/* ---------- درخواست پرداخت ---------- */
$OPS['createPay'] = function ($v) {
  $v = obj($v);
  need(can('finance.request'), 'ثبت درخواست پرداخت برای جایگاه شما مجاز نیست.');
  $title = str($v->title ?? '', 300); need($title !== '', 'عنوان درخواست را بنویسید.');
  $a = amt($v->amount ?? '', 'مبلغ'); need($a > 0, 'مبلغ معتبر لازم است.');
  $u = isImam() ? U_FIN : myUnit();
  $th = (float)(D()->settings->payThreshold ?? 50000000);
  $p = (object)['id' => uid(), 'no' => nextNo('pay'), 'unitId' => $u, 'title' => $title, 'amount' => $a, 'payee' => str($v->payee ?? '', 200), 'desc' => str($v->desc ?? '', 4000), 'files' => files($v->files ?? []),
    'stage' => myRole() === 'manager' ? 1 : 0, 'status' => 'جاری', 'needImam' => $a > $th, 'byPos' => mePos()->id, 'by' => meUser()->id, 'byName' => actorName(), 'created' => stamp()];
  hist($p, 'ثبت درخواست پرداخت', money($a) . ($p->needImam ? ' — بالاتر از سقف؛ نیازمند تصویب امام جماعت' : ''));
  if ($p->stage === 1) hist($p, 'تأیید مدیر واحد', 'ثبت توسط خود مدیر');
  D()->payreqs[] = $p; audit('ثبت درخواست پرداخت', 'pay', $p->id, $p->no);
  $next = nextPayStage($p);
  notify($next === 1 ? [unitPosId($u, 'manager')] : unitHeads(U_FIN), 'request', 'درخواست پرداخت «' . $title . '» منتظر اقدام شماست.', 'finance', $p->no, ['k' => 'pay', 'id' => $p->id]);
  return $p;
};
$OPS['payAct'] = function ($id, $ok, $note = '', $acc = null) {
  $p = rec('payreqs', $id); need(payCanAct($p), 'این مرحله از تأیید با جایگاه شما نیست.');
  $s = nextPayStage($p); $note = str($note, 2000); $open = ['k' => 'pay', 'id' => $p->id];
  if (!$ok) {
    need($note !== '', 'علت رد را بنویسید.');
    $p->status = 'ردشده'; hist($p, 'رد در مرحله «' . PAY_ST[$s] . '»', $note);
    notify([$p->byPos], 'decision', 'درخواست پرداخت «' . $p->title . '» رد شد.', 'finance', $p->no, $open);
  } else {
    if ($s === 4) {
      /* پرداخت نهایی: سند دوطرفه خودکار (بدهکار هزینه با مرکز هزینه واحد / بستانکار صندوق یا بانک) */
      $acc = obj($acc);
      $date = ($acc->date ?? '') ? needDate($acc->date, 'تاریخ پرداخت') : todayISO();
      $v = newVoucher($date, 'پرداخت: ' . $p->title . ($p->payee ? ' — ' . $p->payee : ''), [
        ['acc' => $acc->exp ?? '5901', 'unitId' => $p->unitId, 'dr' => $p->amount, 'cr' => 0, 'desc' => $p->title],
        ['acc' => $acc->cash ?? '1102', 'unitId' => null, 'dr' => 0, 'cr' => $p->amount, 'desc' => $p->payee]
      ], V_POSTED, ['src' => (object)['k' => 'pay', 'id' => $p->id, 'no' => $p->no], 'ref' => str($acc->ref ?? '', 60)]);
      $p->stage = 4; $p->status = 'پرداخت‌شده'; $p->voucherId = $v->id; $p->docNo = 'سند ' . $v->no; $p->paidAt = stamp();
      hist($p, 'پرداخت — سند حسابداری ' . fa($v->no), $note);
      notify([$p->byPos, unitPosId($p->unitId, 'manager')], 'decision', 'درخواست پرداخت «' . $p->title . '» پرداخت شد.', 'finance', $p->no, $open);
    } else {
      $p->stage = $s; hist($p, PAY_ST[$s], $note);
      $ns = nextPayStage($p);
      notify($ns === 2 ? unitHeads(U_FIN) : ($ns === 3 ? [imamPos()] : [unitPosId(U_FIN, 'manager')]), 'request', 'درخواست پرداخت «' . $p->title . '» در مرحله «' . PAY_ST[$ns] . '» است.', 'finance', $p->no, $open);
    }
  }
  audit('اقدام پرداخت', 'pay', $p->id, $p->no . ' · ' . ($ok ? PAY_ST[$s] : 'رد'));
  return $p;
};
$OPS['setBudget'] = function ($unitId, $amount) {
  need(isImam() || (inUnit(U_FIN) && myRole() === 'manager'), 'اصلاح بودجه با امام جماعت یا مدیر امور مالی است.');
  $n = amt($amount, 'مبلغ بودجه'); $y = jYearNow(); $b = null;
  foreach (D()->budgets as $x) if ((int)$x->unitId === (int)$unitId && (int)$x->year === $y) $b = $x;
  need(unitExists($unitId) || (int)$unitId === 0, 'مدیریت یافت نشد.');
  if (!$b) { $b = (object)['unitId' => (int)$unitId, 'year' => $y, 'amount' => 0]; D()->budgets[] = $b; }
  audit('اصلاح بودجه', 'budget', $unitId, money($b->amount) . ' ← ' . money($n)); $b->amount = $n; return $b;
};
$OPS['addCommitment'] = function ($v) {
  $v = obj($v); need(isImam() || (inUnit(U_FIN) && can('finance.post')), 'ثبت تعهد با مدیریت امور مالی است.');
  $t = str($v->title ?? '', 300); $a = amt($v->amount ?? '', 'مبلغ'); $due = needDate($v->due ?? '', 'سررسید');
  need($t !== '' && $a > 0, 'عنوان و مبلغ معتبر لازم است.');
  $c = (object)['id' => uid(), 'title' => $t, 'unitId' => (int)($v->unitId ?? U_FIN), 'amount' => $a, 'due' => $due, 'status' => 'جاری']; D()->commitments[] = $c; audit('ثبت تعهد', 'commitment', $c->id, $t); return $c;
};

/* ---------- کدینگ حساب‌ها ---------- */
$OPS['accSave'] = function ($code, $v) {
  $v = obj($v); need(can('finance.approve'), 'تعریف و اصلاح حساب‌ها با مسئول مجاز امور مالی است.');
  $name = label($v->name ?? '', 'نام حساب', 120);
  if ($code) {
    $a = accByCode($code); need($a, 'حساب یافت نشد.');
    $diff = [];
    if ($a->name !== $name) $diff[] = ['f' => 'name', 'l' => 'نام', 'a' => $a->name, 'b' => $name];
    $act = !isset($v->active) || !empty($v->active);
    if ((bool)$a->active !== $act) $diff[] = ['f' => 'active', 'l' => 'وضعیت', 'a' => $a->active ? 'فعال' : 'غیرفعال', 'b' => $act ? 'فعال' : 'غیرفعال'];
    $a->name = $name; $a->active = $act;
    audit('اصلاح حساب', 'account', $a->code, $a->code . ' ' . $name); return $a;
  }
  $c = en(str($v->code ?? '', 12)); need(preg_match('/^\d{1,10}$/', $c), 'کد حساب باید عدد باشد.');
  need(!accByCode($c), 'این کد حساب قبلاً تعریف شده است.');
  $par = accByCode($v->parent ?? ''); need($par, 'حساب کل (والد) را انتخاب کنید.');
  need(strpos($c, $par->code) === 0 && strlen($c) > strlen($par->code), 'کد حساب باید با کد حساب والد (' . fa($par->code) . ') شروع شود.');
  foreach (D()->vouchers as $x) foreach ($x->lines as $l) need($l->acc !== $par->code, 'روی حساب والد سند ثبت شده است؛ زیرحساب جدید ممکن نیست.');
  $a = (object)['id' => $c, 'code' => $c, 'name' => $name, 'type' => $par->type, 'parent' => $par->code, 'active' => true];
  D()->accounts[] = $a; audit('تعریف حساب', 'account', $c, $c . ' ' . $name); return $a;
};
/* ---------- دوره‌های مالی ---------- */
$OPS['periodSave'] = function ($v) {
  $v = obj($v); need(can('finance.approve'), 'تعریف دوره مالی با مسئول مجاز امور مالی است.');
  $t = label($v->title ?? '', 'عنوان دوره', 80); $f = needDate($v->from ?? '', 'تاریخ شروع دوره'); $to = needDate($v->to ?? '', 'تاریخ پایان دوره');
  need($to > $f, 'پایان دوره باید بعد از شروع باشد.');
  foreach (D()->periods as $p) need($to < $p->from || $f > $p->to, 'این بازه با دوره «' . $p->title . '» هم‌پوشانی دارد.');
  $p = (object)['id' => 'p' . substr(uid(), 0, 8), 'title' => $t, 'from' => $f, 'to' => $to, 'status' => 'باز', 'created' => stamp()];
  D()->periods[] = $p; audit('تعریف دوره مالی', 'period', $p->id, $t); return $p;
};
$OPS['periodClose'] = function ($id, $close, $note = '') {
  $p = rec('periods', $id); need(can('finance.approve'), 'بستن یا بازکردن دوره مالی با مسئول مجاز امور مالی است.');
  if ($close) {
    need($p->status === 'باز', 'این دوره قبلاً بسته شده است.');
    foreach (D()->vouchers as $x) need(!($x->periodId === $p->id && $x->status === V_DRAFT), 'در این دوره سند پیش‌نویس وجود دارد؛ ابتدا آن را قطعی یا حذف کنید.');
    $p->status = 'بسته'; $p->closedAt = stamp(); $p->closedBy = actorName();
  } else {
    need($p->status === 'بسته', 'این دوره باز است.'); need(isImam() || myRole() === 'manager', 'بازکردن دوره بسته فقط با مدیر امور مالی یا امام جماعت است.');
    need(str($note) !== '', 'علت بازکردن دوره را بنویسید.'); $p->status = 'باز';
  }
  hist($p, $close ? 'بستن دوره' : 'بازکردن دوره', str($note, 500));
  audit($close ? 'بستن دوره مالی' : 'بازکردن دوره مالی', 'period', $p->id, $p->title); return $p;
};
/* ---------- اسناد حسابداری ---------- */
$OPS['voucherSave'] = function ($id, $v) {
  $v = obj($v); need(can('finance.post'), 'ثبت سند حسابداری برای جایگاه شما مجاز نیست.');
  $date = needDate($v->date ?? '', 'تاریخ سند'); $desc = str($v->desc ?? '', 1000); need($desc !== '', 'شرح سند را بنویسید.');
  $ref = str($v->ref ?? '', 60);
  if ($id) {
    $x = rec('vouchers', $id); need($x->status === V_DRAFT, 'فقط سند پیش‌نویس قابل ویرایش است؛ سند قطعی با «سند برگشت» اصلاح می‌شود.');
    $p = openPeriodFor($date); need($p->id === $x->periodId, 'تاریخ سند باید در همان دوره مالی بماند.');
    [$ls, $total] = cleanLines($v->lines ?? []);
    $d = refDup($ref, $p->id, $x->id); need(!$d, 'شماره مرجع ' . fa($ref) . ' قبلاً در سند ' . fa($d->no ?? '') . ' همین دوره ثبت شده است.');
    $diff = [];
    if ($x->date !== $date) $diff[] = ['f' => 'date', 'l' => 'تاریخ', 'a' => jd($x->date), 'b' => jd($date)];
    if ($x->desc !== $desc) $diff[] = ['f' => 'desc', 'l' => 'شرح', 'a' => $x->desc, 'b' => $desc];
    if ($x->total != $total) $diff[] = ['f' => 'total', 'l' => 'جمع', 'a' => money($x->total), 'b' => money($total)];
    if (json_encode($x->lines) !== json_encode($ls)) $diff[] = ['f' => 'lines', 'l' => 'ردیف‌ها', 'a' => fa(count($x->lines)) . ' ردیف', 'b' => fa(count($ls)) . ' ردیف'];
    $x->date = $date; $x->desc = $desc; $x->ref = $ref; $x->lines = $ls; $x->total = $total;
    hist($x, 'ویرایش پیش‌نویس سند', '', $diff); audit('ویرایش سند', 'voucher', $x->id, 'سند ' . $x->no); return $x;
  }
  $p = openPeriodFor($date);
  $d = refDup($ref, $p->id); need(!$d, 'شماره مرجع ' . fa($ref) . ' قبلاً در سند ' . fa($d->no ?? '') . ' همین دوره ثبت شده است.');
  return newVoucher($date, $desc, $v->lines ?? [], V_DRAFT, ['ref' => $ref, 'files' => files($v->files ?? [])]);
};
$OPS['voucherPost'] = function ($id) {
  $x = rec('vouchers', $id); need(can('finance.approve'), 'قطعی‌کردن سند با مسئول مجاز امور مالی است.');
  need($x->status === V_DRAFT, 'این سند پیش‌نویس نیست.'); openPeriodFor($x->date); cleanLines($x->lines);
  $x->status = V_POSTED; $x->postedBy = actorName(); $x->postedAt = stamp();
  hist($x, 'قطعی‌شدن سند'); audit('قطعی‌کردن سند', 'voucher', $x->id, 'سند ' . $x->no); return $x;
};
$OPS['voucherDelete'] = function ($id) {
  $x = rec('vouchers', $id); need(can('finance.post'), 'حذف سند مجاز نیست.'); need($x->status === V_DRAFT, 'سند قطعی حذف نمی‌شود؛ از «سند برگشت» استفاده کنید.');
  need($x->by === meUser()->id || can('finance.approve'), 'حذف پیش‌نویس با ثبت‌کننده یا مسئول تأیید است.');
  D()->vouchers = array_values(array_filter(D()->vouchers, fn($y) => $y->id !== $id)); audit('حذف پیش‌نویس سند', 'voucher', $id, 'سند ' . $x->no); return ['ok' => 1];
};
function reverseVoucher($x, $reason, $date = '') {
  need($x->status === V_POSTED, 'فقط سند قطعی قابل برگشت است.');
  need(empty($x->reverseOf), 'سند برگشت را نمی‌توان دوباره برگشت زد.');
  $date = $date ? needDate($date, 'تاریخ سند برگشت') : todayISO();
  $lines = array_map(fn($l) => ['acc' => $l->acc, 'unitId' => $l->unitId, 'desc' => $l->desc, 'dr' => $l->cr, 'cr' => $l->dr], $x->lines);
  $r = newVoucher($date, 'برگشت سند ' . $x->no . ': ' . $reason, $lines, V_POSTED, ['reverseOf' => $x->id, 'src' => $x->src]);
  $x->status = V_REVERSED; $x->reversedBy = $r->id; $x->reverseNo = $r->no; $x->reverseReason = $reason;
  hist($x, 'برگشت سند با سند شماره ' . fa($r->no), $reason);
  return $r;
}
$OPS['voucherReverse'] = function ($id, $reason, $date = '') {
  $x = rec('vouchers', $id); need(can('finance.approve'), 'برگشت سند با مسئول مجاز امور مالی است.');
  $reason = str($reason, 500); need($reason !== '', 'علت برگشت سند را بنویسید.');
  $r = reverseVoucher($x, $reason, $date); audit('برگشت سند', 'voucher', $x->id, 'سند ' . $x->no . ' ← ' . $r->no); return $r;
};

/* ---------- فاکتور ---------- */
function invCalc($v) {
  $items = [];
  foreach (arr($v->items ?? []) as $i => $it) {
    $it = obj($it); $n = fa($i + 1);
    $d = str($it->desc ?? '', 300); if ($d === '' && empty($it->qty) && empty($it->price)) continue;
    need($d !== '', "شرح ردیف $n را بنویسید.");
    $q = num($it->qty ?? ''); need(is_numeric($q) && !is_nan($q) && $q > 0, "تعداد ردیف $n معتبر نیست.");
    $pr = amt($it->price ?? '', "قیمت واحد ردیف $n"); $ds = amt($it->disc ?? 0, "تخفیف ردیف $n");
    need($ds <= round($q * $pr), "تخفیف ردیف $n از مبلغ آن بیشتر است.");
    $items[] = (object)['desc' => $d, 'qty' => round($q, 3), 'unit' => str($it->unit ?? '', 30), 'price' => $pr, 'disc' => $ds, 'sum' => round($q * $pr) - $ds];
  }
  need($items, 'دست‌کم یک ردیف کالا یا خدمت لازم است.');
  $sub = array_sum(array_map(fn($x) => $x->sum, $items));
  $tp = num($v->taxPct ?? 0); need(is_numeric($tp) && !is_nan($tp) && $tp >= 0 && $tp <= 30, 'درصد مالیات باید بین ۰ تا ۳۰ باشد.');
  $tax = round($sub * $tp / 100);
  return [$items, $sub, $tp, $tax, $sub + $tax];
}
$OPS['invoiceSave'] = function ($id, $v) {
  $v = obj($v); need(can('finance.post'), 'فاکتورنویسی برای جایگاه شما مجاز نیست.');
  $kind = in_array($v->kind ?? '', ['فروش', 'خرید']) ? $v->kind : null; need($kind, 'نوع فاکتور را انتخاب کنید.');
  $party = str($v->party ?? '', 200); need($party !== '', $kind === 'فروش' ? 'نام خریدار را بنویسید.' : 'نام فروشنده را بنویسید.');
  $date = needDate($v->date ?? '', 'تاریخ فاکتور');
  [$items, $sub, $tp, $tax, $total] = invCalc($v);
  $u = ($v->unitId ?? '') === '' ? U_FIN : (int)$v->unitId; need(unitExists($u), 'مدیریت مرتبط معتبر نیست.');
  $f = ['kind' => $kind, 'party' => $party, 'phone' => cleanPhone($v->phone ?? ''), 'address' => str($v->address ?? '', 300), 'date' => $date, 'items' => $items, 'sub' => $sub, 'taxPct' => $tp, 'tax' => $tax, 'total' => $total, 'unitId' => $u, 'note' => str($v->note ?? '', 1000)];
  if ($id) {
    $x = rec('invoices', $id); need($x->status === INV_DRAFT, 'فقط فاکتور پیش‌نویس قابل ویرایش است.');
    $diff = []; foreach (['party' => 'طرف حساب', 'date' => 'تاریخ', 'total' => 'جمع کل'] as $k => $lb) if ($x->$k != $f[$k]) $diff[] = ['f' => $k, 'l' => $lb, 'a' => $k === 'total' ? money($x->$k) : ($k === 'date' ? jd($x->$k) : $x->$k), 'b' => $k === 'total' ? money($f[$k]) : ($k === 'date' ? jd($f[$k]) : $f[$k])];
    foreach ($f as $k => $val) $x->$k = $val;
    hist($x, 'ویرایش فاکتور', '', $diff); audit('ویرایش فاکتور', 'invoice', $x->id, $x->no); return $x;
  }
  $x = (object)array_merge(['id' => 'f' . uid(), 'no' => nextNo('inv')], $f, ['status' => INV_DRAFT, 'by' => meUser()->id, 'byName' => actorName(), 'created' => stamp()]);
  hist($x, 'ثبت پیش‌نویس فاکتور ' . $kind, money($total)); D()->invoices[] = $x; audit('ثبت فاکتور', 'invoice', $x->id, $x->no); return $x;
};
$OPS['invoiceIssue'] = function ($id, $v) {
  $x = rec('invoices', $id); $v = obj($v); need(can('finance.approve'), 'صدور قطعی فاکتور با مسئول مجاز امور مالی است.');
  need($x->status === INV_DRAFT, 'این فاکتور پیش‌نویس نیست.');
  if (!empty($v->post)) {
    $main = $v->acc ?? ($x->kind === 'فروش' ? '4901' : '5203'); $side = $v->cash ?? '1102';
    $lines = $x->kind === 'فروش'
      ? [['acc' => $side, 'unitId' => null, 'dr' => $x->total, 'cr' => 0, 'desc' => $x->party], ['acc' => $main, 'unitId' => $x->unitId, 'dr' => 0, 'cr' => $x->total, 'desc' => 'فاکتور ' . $x->no]]
      : [['acc' => $main, 'unitId' => $x->unitId, 'dr' => $x->total, 'cr' => 0, 'desc' => 'فاکتور ' . $x->no], ['acc' => $side, 'unitId' => null, 'dr' => 0, 'cr' => $x->total, 'desc' => $x->party]];
    $vch = newVoucher($x->date, 'فاکتور ' . $x->kind . ' ' . $x->no . ' — ' . $x->party, $lines, V_POSTED, ['src' => (object)['k' => 'inv', 'id' => $x->id, 'no' => $x->no], 'ref' => $x->no]);
    $x->voucherId = $vch->id; $x->voucherNo = $vch->no;
  }
  $x->status = INV_ISSUED; $x->issuedAt = stamp(); $x->issuedBy = actorName();
  hist($x, 'صدور فاکتور' . (!empty($x->voucherNo) ? ' و ثبت سند ' . fa($x->voucherNo) : '')); audit('صدور فاکتور', 'invoice', $x->id, $x->no); return $x;
};
$OPS['invoiceVoid'] = function ($id, $reason) {
  $x = rec('invoices', $id); need(can('finance.approve'), 'ابطال فاکتور با مسئول مجاز امور مالی است.');
  need($x->status !== INV_VOID, 'این فاکتور قبلاً باطل شده است.');
  $reason = str($reason, 500); need($reason !== '', 'علت ابطال را بنویسید.');
  if (!empty($x->voucherId)) { $vc = findRec('vouchers', $x->voucherId); if ($vc && $vc->status === V_POSTED) { $r = reverseVoucher($vc, 'ابطال فاکتور ' . $x->no . ': ' . $reason); $x->reverseNo = $r->no; } }
  $x->status = INV_VOID; $x->voidReason = $reason; $x->voidAt = stamp(); $x->voidBy = actorName();
  hist($x, 'ابطال فاکتور' . (!empty($x->reverseNo) ? ' و برگشت سند با سند ' . fa($x->reverseNo) : ''), $reason); audit('ابطال فاکتور', 'invoice', $x->id, $x->no); return $x;
};

/* ---------- اسناد و گزارش‌های مالی ارسالی واحدها ---------- */
$OPS['findocSubmit'] = function ($v, $id = '') {
  $v = obj($v); need(can('finance.docs') || isImam(), 'ارسال اسناد مالی برای جایگاه شما مجاز نیست.');
  $kind = in_array($v->kind ?? '', ORG('FINDOC_KINDS')) ? $v->kind : null; need($kind, 'نوع سند را انتخاب کنید.');
  $title = str($v->title ?? '', 300); need($title !== '', 'عنوان را بنویسید.');
  $a = ($v->amount ?? '') === '' ? 0 : amt($v->amount, 'مبلغ');
  $date = needDate($v->date ?? '', 'تاریخ');
  $fl = files($v->files ?? []);
  need($fl || str($v->desc ?? '') !== '', 'تصویر سند را پیوست کنید یا شرح گزارش را بنویسید.');
  if ($id) {
    $d = rec('findocs', $id); need((int)$d->unitId === myUnit() && $d->status === 'برگشت برای اصلاح', 'فقط سند برگشت‌خورده همین مدیریت قابل ارسال دوباره است.');
    foreach (['kind' => $kind, 'title' => $title, 'amount' => $a, 'date' => $date, 'period' => str($v->period ?? '', 60), 'desc' => str($v->desc ?? '', 5000)] as $k => $x) $d->$k = $x;
    $d->files = array_merge($d->files, $fl); $d->status = 'ارسال‌شده';
    hist($d, 'ارسال دوباره پس از اصلاح'); audit('ارسال دوباره سند مالی', 'findoc', $d->id, $d->no);
  } else {
    $d = (object)['id' => uid(), 'no' => nextNo('doc'), 'unitId' => myUnit(), 'kind' => $kind, 'title' => $title, 'amount' => $a, 'date' => $date, 'period' => str($v->period ?? '', 60), 'desc' => str($v->desc ?? '', 5000),
      'files' => $fl, 'status' => 'ارسال‌شده', 'by' => meUser()->id, 'byName' => actorName(), 'byPos' => mePos()->id, 'created' => stamp()];
    hist($d, 'ارسال به امور مالی'); D()->findocs[] = $d; audit('ارسال سند مالی', 'findoc', $d->id, $d->no);
  }
  notify(unitHeads(U_FIN), 'request', $kind . ' از ' . unitShort($d->unitId) . ': «' . $title . '»', 'finance', $d->no, ['k' => 'findoc', 'id' => $d->id]);
  return $d;
};
$OPS['findocAct'] = function ($id, $act, $note = '') {
  $d = rec('findocs', $id); need(inUnit(U_FIN) && can('finance.post') || isImam(), 'بررسی اسناد ارسالی با امور مالی است.');
  $map = ['review' => 'در حال بررسی', 'accept' => 'پذیرفته‌شده', 'return' => 'برگشت برای اصلاح'];
  need(isset($map[$act]), 'اقدام نامعتبر است.'); need(in_array($d->status, ['ارسال‌شده', 'در حال بررسی']), 'این سند قبلاً تعیین تکلیف شده است.');
  $note = str($note, 2000); if ($act === 'return') need($note !== '', 'علت برگشت را بنویسید.');
  $old = $d->status; $d->status = $map[$act];
  hist($d, $map[$act], $note, [['f' => 'status', 'l' => 'وضعیت', 'a' => $old, 'b' => $d->status]]); audit('بررسی سند مالی', 'findoc', $d->id, $d->no . ' · ' . $d->status);
  if ($act !== 'review') notify([$d->byPos, unitPosId($d->unitId, 'manager')], 'decision', 'سند «' . $d->title . '» ' . $d->status . '.', 'finance', $d->no, ['k' => 'findoc', 'id' => $d->id]);
  return $d;
};
