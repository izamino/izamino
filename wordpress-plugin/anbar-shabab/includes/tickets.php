<?php
/**
 * Public equipment requests ("tickets"). Anyone can file one without an account; they only write text
 * and never see items, stock, photos or warehouses. Staff review tickets inside the app, pick the real
 * items themselves and turn a ticket into one or more exit requests. A ticket alone reserves nothing,
 * creates no voucher and never changes stock.
 */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_ticket_statuses()
{
    return ['new' => 'جدید', 'reviewing' => 'در حال بررسی', 'needs_info' => 'نیازمند اطلاعات', 'referred' => 'ارجاع‌شده',
        'accepted' => 'پذیرفته‌شده', 'ready' => 'آماده هماهنگی و تحویل', 'delivered' => 'تحویل‌شده', 'rejected' => 'ردشده', 'closed' => 'بسته‌شده'];
}

/** Iranian national ID checksum. */
function anbar_valid_national_id($s)
{
    if (!preg_match('/^\d{10}$/', $s) || preg_match('/^(\d)\1{9}$/', $s)) {
        return false;
    }
    $sum = 0;
    for ($i = 0; $i < 9; $i++) {
        $sum += (int) $s[$i] * (10 - $i);
    }
    $r = $sum % 11;
    $check = (int) $s[9];
    return ($r < 2 && $check === $r) || ($r >= 2 && $check === 11 - $r);
}

function anbar_client_ip()
{
    return substr(preg_replace('/[^0-9a-fA-F:.]/', '', $_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function anbar_ticket_create_public($b)
{
    if (!empty($b['website'])) { // honeypot field, invisible to people
        throw anbar_bad('درخواست نامعتبر است.');
    }
    $ip = anbar_client_ip();
    $key = 'anbar_pub_' . md5($ip);
    $count = (int) get_transient($key);
    if ($count >= 5) {
        throw new Anbar_Error(429, 'از این دستگاه درخواست‌های زیادی ثبت شده است. یک ساعت دیگر دوباره تلاش کنید.');
    }
    $nid = preg_replace('/\D/', '', anbar_to_latin($b['national_id'] ?? ''));
    if (!anbar_valid_national_id($nid)) {
        throw anbar_bad('کد ملی درست نیست.');
    }
    $phone = preg_replace('/\D/', '', anbar_to_latin($b['phone'] ?? ''));
    if (preg_match('/^989\d{9}$/', $phone)) {
        $phone = '0' . substr($phone, 2);
    }
    if (!preg_match('/^09\d{9}$/', $phone)) {
        throw anbar_bad('شماره همراه را به‌شکل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.');
    }
    $f = [
        'first_name' => anbar_required($b['first_name'] ?? '', 'نام', 80),
        'last_name' => anbar_required($b['last_name'] ?? '', 'نام خانوادگی', 80),
        'national_id' => $nid,
        'phone' => $phone,
        'referral' => anbar_required($b['referral'] ?? '', 'نحوه آشنایی یا مراجعه', 300),
        'item_text' => anbar_required($b['item_text'] ?? '', 'وسیله موردنیاز', 300),
        'qty_text' => anbar_str($b['qty_text'] ?? '', 100),
        'need_time' => anbar_str($b['need_time'] ?? '', 200),
        'description' => anbar_required($b['description'] ?? '', 'شرح درخواست', 3000),
    ];
    do {
        $code = (string) random_int(10000000, 99999999);
    } while (anbar_get('SELECT id FROM {tickets} WHERE code = ?', $code));
    $r = anbar_run('INSERT INTO {tickets} (code, first_name, last_name, national_id, phone, referral, item_text, qty_text, need_time, description,
                      status, ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
        $code, $f['first_name'], $f['last_name'], $f['national_id'], $f['phone'], $f['referral'], $f['item_text'], $f['qty_text'],
        $f['need_time'], $f['description'], 'new', $ip);
    set_transient($key, $count + 1, HOUR_IN_SECONDS);
    anbar_ticket_event($r['id'], null, 'status', 'درخواست از فرم عمومی ثبت شد.');
    anbar_notify(array_unique(array_merge(anbar_users_with('tickets_all'), anbar_users_with('tickets_review'))), [
        'kind' => 'ticket_new', 'title' => "درخواست وسیله جدید: {$f['item_text']}",
        'body' => "{$f['first_name']} {$f['last_name']} — پیگیری {$code}", 'link' => '#/tickets/' . $r['id'],
    ]);
    return ['code' => $code];
}

/** Public status lookup needs both the tracking code and the national ID; it reveals only the status. */
function anbar_ticket_track_public($b)
{
    $ip = anbar_client_ip();
    $key = 'anbar_trk_' . md5($ip);
    $count = (int) get_transient($key);
    if ($count >= 20) {
        throw new Anbar_Error(429, 'تعداد تلاش‌ها زیاد بود. کمی بعد دوباره امتحان کنید.');
    }
    set_transient($key, $count + 1, HOUR_IN_SECONDS);
    $code = preg_replace('/\D/', '', anbar_to_latin($b['code'] ?? ''));
    $nid = preg_replace('/\D/', '', anbar_to_latin($b['national_id'] ?? ''));
    $t = anbar_get('SELECT status, created_at, updated_at FROM {tickets} WHERE code = ? AND national_id = ?', $code, $nid);
    if (!$t) {
        throw anbar_not_found('درخواستی با این شماره پیگیری و کد ملی پیدا نشد.');
    }
    $public = ['new' => 'ثبت شده و در نوبت بررسی است', 'reviewing' => 'در حال بررسی است', 'needs_info' => 'برای تکمیل اطلاعات با شما تماس گرفته می‌شود',
        'referred' => 'در حال بررسی است', 'accepted' => 'پذیرفته شده است', 'ready' => 'آماده تحویل است؛ برای هماهنگی با شما تماس گرفته می‌شود',
        'delivered' => 'تحویل شده است', 'rejected' => 'امکان انجام این درخواست وجود ندارد', 'closed' => 'بسته شده است'];
    return ['status' => $public[$t['status']] ?? '', 'created_at' => $t['created_at'], 'updated_at' => $t['updated_at']];
}

function anbar_ticket_event($ticket_id, $user_id, $kind, $text, $appointment = null)
{
    anbar_run('INSERT INTO {ticket_events} (ticket_id, user_id, kind, text, appointment, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        (int) $ticket_id, $user_id, $kind, $text, $appointment);
    anbar_run('UPDATE {tickets} SET updated_at = UTC_TIMESTAMP() WHERE id = ?', (int) $ticket_id);
}

/** Staff who follow all tickets, or whose warehouse the ticket was referred to. */
function anbar_ticket_for_user($id, $user)
{
    $t = anbar_get('SELECT * FROM {tickets} WHERE id = ?', (int) $id);
    if (!$t) {
        throw anbar_not_found('تیکت پیدا نشد.');
    }
    if (!anbar_ticket_visible($t, $user)) {
        throw anbar_forbidden('این تیکت به بخش شما ارجاع نشده است.');
    }
    return $t;
}
function anbar_ticket_visible($t, $user)
{
    return anbar_can($user, 'tickets_all') || anbar_can($user, 'tickets_review')
        || ($t['referred_wh'] && anbar_can_see($user, $t['referred_wh']));
}
function anbar_ticket_scope_sql($user)
{
    if (anbar_can($user, 'tickets_all') || anbar_can($user, 'tickets_review')) {
        return '';
    }
    $s = anbar_scope($user);
    if ($s === null) {
        return ' AND t.referred_wh IS NOT NULL';
    }
    return $s ? ' AND t.referred_wh IN (' . implode(',', array_map('intval', $s)) . ')' : ' AND 1 = 0';
}

/**
 * Status changes. tickets_review decides (accept / reject / close / anything);
 * tickets_all follows up (reviewing, needs_info). Rejection needs a reason.
 */
function anbar_ticket_set_status($user, $id, $status, $note)
{
    $t = anbar_ticket_for_user($id, $user);
    $all = anbar_ticket_statuses();
    if (!isset($all[$status]) || in_array($status, ['ready', 'delivered', 'referred'], true)) {
        throw anbar_bad('وضعیت نامعتبر است.');
    }
    $follow = ['reviewing', 'needs_info'];
    if (!anbar_can($user, 'tickets_review') && !(anbar_can($user, 'tickets_all') && in_array($status, $follow, true))) {
        throw anbar_forbidden('تغییر این وضعیت فقط در اختیار بررسی‌کنندگان تیکت است.');
    }
    if ($status === 'rejected' && !$note) {
        throw anbar_bad('علت رد را بنویسید.');
    }
    anbar_run('UPDATE {tickets} SET status = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $status, (int) $t['id']);
    anbar_ticket_event($t['id'], $user['id'], 'status', "وضعیت: {$all[$status]}" . ($note ? " — {$note}" : ''));
    return true;
}

function anbar_ticket_refer($user, $id, $warehouse_id, $note)
{
    $t = anbar_ticket_for_user($id, $user);
    if (!anbar_can($user, 'tickets_all') && !anbar_can($user, 'tickets_review')) {
        throw anbar_forbidden('ارجاع تیکت در اختیار پیگیری‌کنندگان تیکت است.');
    }
    $wh = anbar_get('SELECT * FROM {warehouses} WHERE id = ? AND archived = 0', (int) $warehouse_id);
    if (!$wh) {
        throw anbar_bad('انبار را انتخاب کنید.');
    }
    anbar_run("UPDATE {tickets} SET referred_wh = ?, status = IF(status IN ('new', 'reviewing', 'needs_info'), 'referred', status), updated_at = UTC_TIMESTAMP() WHERE id = ?",
        (int) $wh['id'], (int) $t['id']);
    anbar_ticket_event($t['id'], $user['id'], 'refer', "ارجاع به {$wh['name']}" . ($note ? " — {$note}" : ''));
    anbar_notify(anbar_users_with('request_out', $wh['id'], $user['id']), [
        'kind' => 'ticket_new', 'title' => "تیکت {$t['code']} به {$wh['name']} ارجاع شد", 'body' => $t['item_text'],
        'link' => '#/tickets/' . $t['id'], 'warehouse_id' => (int) $wh['id'],
    ]);
    return true;
}

/** Internal note or phone-call log, optionally with the agreed visit time. */
function anbar_ticket_note($user, $id, $kind, $text, $appointment)
{
    $t = anbar_ticket_for_user($id, $user);
    if (!$text) {
        throw anbar_bad('متن یادداشت را بنویسید.');
    }
    $kind = $kind === 'call' ? 'call' : 'note';
    anbar_ticket_event($t['id'], $user['id'], $kind, $text, $appointment ?: null);
    if ($appointment) {
        anbar_run('UPDATE {tickets} SET appointment = ? WHERE id = ?', $appointment, (int) $t['id']);
    }
    if ($t['status'] === 'new') {
        anbar_run("UPDATE {tickets} SET status = 'reviewing' WHERE id = ?", (int) $t['id']);
    }
    return true;
}
