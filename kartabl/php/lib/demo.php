<?php
/* داده نمونه برای نسخه آزمایشی (فقط با دستور خط فرمان demo؛ در نصب واقعی استفاده نمی‌شود) */
if (!defined('KT')) exit;

function asUser($username, $fn) {
  foreach (D()->users as $u) if ($u->username === $username) { $GLOBALS['ME'] = ['user' => $u, 'pos' => posById($u->posId), 'sid' => '']; try { return $fn($GLOBALS['OPS']); } finally { $GLOBALS['ME'] = null; } }
  throw new Exception('no user ' . $username);
}
function buildDemo() {
  $D = baseDB('مجتمع مسجدمحور شباب اهل‌الجنه'); Store::$D = $D; Store::$orig = []; Store::$ver = 0;
  $rows = []; foreach ($D->positions as $p) $rows[$p->id] = ['username' => defaultUsername($p), 'pass' => '1234'];
  seedAccounts($D, $rows);
  $F = ['محمد', 'علی', 'حسین', 'مهدی', 'رضا', 'زهرا', 'فاطمه', 'مریم', 'سید جواد', 'امیرحسین', 'محمدرضا', 'سکینه', 'طاهره', 'حمید', 'سعید', 'مجید', 'نرگس', 'معصومه', 'کاظم', 'یوسف'];
  $L = ['حسینی', 'موسوی', 'کریمی', 'رضایی', 'جعفری', 'نجفی', 'امینی', 'صالحی', 'محمدی', 'احمدی', 'بهبهانی', 'دشتی', 'عباسی', 'نوری', 'ساعدی', 'کعبی', 'زارعی', 'فرجی', 'منصوری', 'طاهری', 'شریفی', 'قاسمی', 'رحیمی'];
  $i = 0;
  foreach ($D->users as $u) {
    $p = posById($u->posId);
    $first = $p->role === 'imam' ? 'حجت‌الاسلام محمد' : $F[($i * 7) % count($F)]; $last = $p->role === 'imam' ? 'موسوی' : $L[($i * 5 + 3) % count($L)];
    $u->first = $first; $u->last = $last; $u->name = $first . ' ' . $last; $u->named = true; $u->phone = '0916' . pad(1000000 + $i * 7919 % 9000000, 7);
    foreach ($D->posHistory as $h) if ($h->userId === $u->id) { $h->name = $u->name; $h->from = addDays(todayISO(), -200 - $i); }
    $u->start = addDays(todayISO(), -200 - $i); $i++;
  }
  /* سابقه متصدی قبلی برای نمایش تحویل جایگاه */
  $D->posHistory[] = (object)['posId' => 'P2-m', 'userId' => 'old1', 'name' => 'رسول کاظمی', 'phone' => '', 'from' => addDays(todayISO(), -900), 'to' => addDays(todayISO(), -230), 'by' => 'امام جماعت', 'handedTo' => 'متصدی فعلی', 'closeNote' => 'تحویل کامل پرونده‌ها و اموال'];
  $T = todayISO();
  foreach ($D->budgets as $b) $b->amount = [1 => 900, 2 => 650, 3 => 300, 4 => 280, 5 => 220, 12 => 800, 13 => 350, 15 => 400, 16 => 260, 17 => 1500, 18 => 700, 19 => 600][$b->unitId] ?? 150;
  foreach ($D->budgets as $b) $b->amount *= 1000000;
  $html = '<p>با سلام و احترام،</p><p>احتراماً به استحضار می‌رساند برنامه هفتگی واحد برای هفته آینده تنظیم و پیوست شده است. خواهشمند است دستور فرمایید هماهنگی‌های لازم انجام شود.</p><p class="al-l">با تشکر</p>';
  asUser('culture.manager', fn($O) => $O['sendLetter']((object)['type' => 'internal', 'toUnit' => 18, 'subject' => 'هماهنگی برگزاری مراسم دهه فاطمیه', 'body' => $html, 'priority' => 'فوری', 'signer' => 'P2-m', 'due' => addDays($T, 3)]));
  asUser('pr.secretary', fn($O) => $O['sendLetter']((object)['type' => 'in', 'subject' => 'اعلام قطعی برنامه‌ریزی‌شده آب در محدوده مجتمع', 'sender' => 'شرکت آب و فاضلاب آبادان', 'body' => '<p>به اطلاع می‌رساند روز پنجشنبه از ساعت ۸ تا ۱۴ آب منطقه قطع خواهد بود.</p>', 'needReply' => true]));
  $l3 = asUser('finance.office', fn($O) => $O['sendLetter']((object)['type' => 'out', 'subject' => 'درخواست صورت‌حساب خرید تجهیزات صوتی', 'receiver' => 'فروشگاه صوت پارس', 'body' => '<p>خواهشمند است پیش‌فاکتور اقلام فهرست پیوست ارسال شود.</p>', 'signer' => 'P15-m']));
  asUser('imam', fn($O) => $O['createOrder']((object)['title' => 'برگزاری مراسم دهه فاطمیه با محوریت خانواده', 'desc' => 'برنامه کامل مراسم شامل سخنرانی، پذیرایی و پوشش رسانه‌ای تهیه و اجرا شود.', 'units' => [18, 19, 4], 'respPos' => 'P18-m', 'priority' => 'فوری', 'issued' => addDays($T, -6), 'due' => addDays($T, 14), 'needReport' => true]));
  asUser('imam', fn($O) => $O['createOrder']((object)['title' => 'تکمیل مستندسازی اموال مجتمع و الصاق برچسب کد', 'desc' => 'تمامی اموال کدگذاری و برچسب QR الصاق شود.', 'units' => [1], 'respPos' => 'P1-o', 'issued' => addDays($T, -20), 'due' => addDays($T, -2), 'needReport' => true]));
  $t1 = asUser('internal.manager', fn($O) => $O['createTask']((object)['unitId' => 1, 'title' => 'سرویس دوره‌ای موتورخانه و دیگ‌های بخار', 'assignee' => 'P1-o', 'start' => addDays($T, -10), 'due' => addDays($T, -1), 'priority' => 'فوری']));
  asUser('internal.office', fn($O) => $O['taskAct']($t1->id, 'start', 'هماهنگی با پیمانکار انجام شد'));
  asUser('media.manager', fn($O) => $O['createTask']((object)['unitId' => 4, 'title' => 'تدوین کلیپ گزارش اردوی زیارتی', 'assignee' => 'P4-s', 'start' => addDays($T, -4), 'due' => addDays($T, 2)]));
  $rq = asUser('culture.office', fn($O) => $O['createRequest']((object)['title' => 'پوشش تصویری کلاس‌های قرآنی تابستان', 'toUnit' => 4, 'cat' => 'فیلم‌برداری', 'due' => addDays($T, 5), 'desc' => 'عکاسی و فیلم‌برداری از جلسات اختتامیه']));
  asUser('media.office', fn($O) => $O['reqAct']($rq->id, 'review', 'بررسی برنامه تیم'));
  asUser('it.secretary', fn($O) => $O['createRequest']((object)['title' => 'تعمیر کولر اتاق سرور', 'toUnit' => 1, 'cat' => 'تأسیسات', 'priority' => 'خیلی فوری']));
  asUser('ceremony.secretary', fn($O) => $O['createReservation']((object)['program' => 'fateheh', 'space' => 'hosseinieh', 'kind' => 'مراسم ترحیم', 'applicant' => 'خانواده مرحوم حاج حسن کریمی', 'phone' => '09161234567', 'date' => $T, 'start' => '14:00', 'end' => '16:00', 'people' => 250]));
  $rs = asUser('culture.secretary', fn($O) => $O['createReservation']((object)['program' => 'general', 'space' => 'amphi', 'kind' => 'جشنواره سرود نوجوانان', 'applicant' => 'مدیریت فرهنگی', 'phone' => '09161112233', 'date' => addDays($T, 4), 'start' => '16:00', 'end' => '19:00', 'people' => 120]));
  asUser('pr.manager', fn($O) => $O['resDecide']($rs->id, 'تأییدشده', 'هماهنگ شد'));
  asUser('ceremony.office', fn($O) => $O['createMeeting']((object)['title' => 'جلسه ستاد برگزاری دهه فاطمیه', 'date' => $T, 'start' => '17:00', 'end' => '18:30', 'place' => 'دفتر مدیریت مراسمات', 'invitees' => ['P18-m', 'P19-m', 'P4-m', 'P0'], 'agenda' => 'تقسیم کار مراسم']));
  asUser('finance.manager', fn($O) => $O['voucherSave']('', (object)['date' => addDays($T, -15), 'desc' => 'دریافت نذورات نقدی هفته', 'ref' => 'R-120', 'lines' => [['acc' => '1102', 'dr' => 185000000, 'cr' => 0], ['acc' => '4101', 'dr' => 0, 'cr' => 185000000, 'unitId' => 0]]]));
  foreach (D()->vouchers as $v) asUser('finance.manager', fn($O) => $O['voucherPost']($v->id));
  asUser('finance.office', fn($O) => $O['voucherSave']('', (object)['date' => addDays($T, -3), 'desc' => 'خرید ملزومات پذیرایی مراسم', 'ref' => 'F-88', 'lines' => [['acc' => '5301', 'dr' => 42000000, 'cr' => 0, 'unitId' => 18], ['acc' => '1101', 'dr' => 0, 'cr' => 42000000]]]));
  $inv = asUser('finance.office', fn($O) => $O['invoiceSave']('', (object)['kind' => 'فروش', 'party' => 'هیئت جوانان محله', 'phone' => '09163334455', 'date' => addDays($T, -2), 'unitId' => 19, 'items' => [['desc' => 'پذیرایی ناهار مراسم', 'qty' => 80, 'price' => 950000, 'disc' => 0], ['desc' => 'اجاره سالن رستوران (۴ ساعت)', 'qty' => 1, 'price' => 12000000, 'disc' => 2000000]], 'taxPct' => 0]));
  asUser('finance.manager', fn($O) => $O['invoiceIssue']($inv->id, (object)['post' => true, 'acc' => '4201', 'cash' => '1102']));
  $p1 = asUser('ceremony.manager', fn($O) => $O['createPay']((object)['title' => 'اجاره سیستم صوت مراسم', 'amount' => 28000000, 'payee' => 'صوت پارس']));
  asUser('finance.office', fn($O) => $O['payAct']($p1->id, true, 'مستندات کامل است'));
  asUser('restaurant.secretary', fn($O) => $O['findocSubmit']((object)['kind' => 'گزارش هزینه‌کرد', 'title' => 'هزینه‌کرد مواد اولیه هفته دوم', 'amount' => 63500000, 'date' => addDays($T, -1), 'period' => 'هفته دوم ماه', 'desc' => 'فاکتورهای خرید برنج، گوشت و روغن']));
  asUser('internal.office', fn($O) => $O['toolSave'](1, 'maint', '', (object)['title' => 'نشتی لوله آب سرویس بهداشتی طبقه اول', 'place' => 'ساختمان اصلی', 'kind' => 'لوله‌کشی', 'cost' => 3500000, 'assignee' => 'P1-s', 'due' => addDays($T, 1)]));
  asUser('restaurant.office', fn($O) => $O['toolSave'](19, 'catering', '', (object)['title' => 'پذیرایی جلسه اولیا', 'forUnit' => 7, 'date' => addDays($T, 2), 'time' => '10:00', 'count' => 60, 'menu' => 'کیک و چای', 'amount' => 9000000]));
  asUser('restaurant.office', fn($O) => $O['toolSave'](19, 'pantry', '', (object)['title' => 'برنج ایرانی', 'qty' => '45.5', 'unitName' => 'کیلوگرم', 'min' => 60, 'supplier' => 'بنکداری کریمی']));
  asUser('planning.manager', fn($O) => $O['toolSave'](17, 'projects', '', (object)['title' => 'احداث سایبان حیاط', 'contractor' => 'شرکت بنای نوین', 'start' => addDays($T, -40), 'due' => addDays($T, 30), 'progress' => '32.36', 'budget' => 900000000, 'spent' => 290000000]));
  asUser('it.office', fn($O) => $O['toolSave'](16, 'helpdesk', '', (object)['title' => 'چاپگر دفتر امور مالی کار نمی‌کند', 'forUnit' => 15, 'kind' => 'چاپگر', 'priority' => 'فوری', 'assignee' => 'P16-s', 'due' => addDays($T, 1)]));
  asUser('ceremony.office', fn($O) => $O['toolSave'](18, 'events', '', (object)['title' => 'مراسم شهادت حضرت زهرا (س)', 'kind' => 'مراسم مذهبی', 'date' => addDays($T, 9), 'time' => '19:00', 'place' => 'hosseinieh', 'speaker' => 'حجت‌الاسلام رضایی', 'count' => 500, 'assignee' => 'P18-o']));
  asUser('culture.manager', fn($O) => $O['sendMessage']('P18-m', 'سلام؛ برنامه سخنرانی شب اول را نهایی کردید؟'));
  asUser('ceremony.manager', fn($O) => $O['sendMessage']('P2-m', 'سلام، بله؛ متن نهایی را از طریق نامه داخلی ارسال کردم.'));
  asUser('internal.manager', fn($O) => $O['createAsset']((object)['unitId' => 1, 'name' => 'دستگاه آبسردکن', 'cat' => 'تأسیسات', 'serial' => 'WC-2231', 'value' => 85000000, 'whId' => 'w1']));
  asUser('media.secretary', fn($O) => $O['createLeave']((object)['type' => 'استحقاقی', 'from' => addDays($T, 3), 'to' => addDays($T, 4), 'reason' => 'امور شخصی']));
  KDB::lock(); try { Store::save(); flushAudit(); } finally { KDB::unlock(true); }
}
