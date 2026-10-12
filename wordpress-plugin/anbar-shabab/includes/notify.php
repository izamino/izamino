<?php
if (!defined('ABSPATH')) {
    exit;
}

/** Kinds that are also pushed to SMS/messenger when configured in Settings → انبار شباب. */
const ANBAR_EXTERNAL_KINDS = ['out_of_stock', 'low_stock', 'ticket_new', 'exit_pending', 'exit_result', 'exit_ready', 'transfer_in',
    'loan_overdue', 'damage', 'expiry', 'announcement'];

/** Fire-and-forget delivery to Bale / Telegram bots and Kavenegar SMS. Never blocks the in-app notification. */
function anbar_send_external($user_id, $text)
{
    $chat = get_user_meta($user_id, 'anbar_chat_id', true);
    $phone = get_user_meta($user_id, 'anbar_phone', true);
    $opt = get_option('anbar_settings', []);
    $async = ['blocking' => false, 'timeout' => 5];
    if ($chat && !empty($opt['bale_token'])) {
        wp_remote_post('https://tapi.bale.ai/bot' . $opt['bale_token'] . '/sendMessage',
            $async + ['headers' => ['content-type' => 'application/json'], 'body' => wp_json_encode(['chat_id' => $chat, 'text' => $text])]);
    }
    if ($chat && !empty($opt['telegram_token'])) {
        wp_remote_post('https://api.telegram.org/bot' . $opt['telegram_token'] . '/sendMessage',
            $async + ['headers' => ['content-type' => 'application/json'], 'body' => wp_json_encode(['chat_id' => $chat, 'text' => $text])]);
    }
    if ($phone && !empty($opt['kavenegar_key'])) {
        $body = ['receptor' => $phone, 'message' => $text];
        if (!empty($opt['kavenegar_sender'])) {
            $body['sender'] = $opt['kavenegar_sender'];
        }
        wp_remote_post('https://api.kavenegar.com/v1/' . rawurlencode($opt['kavenegar_key']) . '/sms/send.json', $async + ['body' => $body]);
    }
}

/** One notification per user. `dedupe` stops repeated reminders for the same event. */
function anbar_notify($user_ids, $n)
{
    $n += ['body' => null, 'link' => null, 'warehouse_id' => null, 'dedupe' => null];
    foreach (array_unique(array_filter(array_map('intval', (array) $user_ids))) as $uid) {
        $r = anbar_run('INSERT IGNORE INTO {notifications} (user_id, kind, title, body, link, warehouse_id, dedupe, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            $uid, $n['kind'], $n['title'], $n['body'], $n['link'], $n['warehouse_id'], $n['dedupe']);
        if ($r['changes'] && in_array($n['kind'], ANBAR_EXTERNAL_KINDS, true)) {
            anbar_send_external($uid, $n['title'] . ($n['body'] ? "\n" . $n['body'] : ''));
        }
    }
}

/** People who work in a warehouse (any operational permission there). */
function anbar_warehouse_audience($warehouse_id, $except = 0)
{
    $ids = [];
    foreach (['edit', 'stock_in', 'deliver', 'approve'] as $perm) {
        $ids = array_merge($ids, anbar_users_with($perm, $warehouse_id, $except));
    }
    return array_values(array_unique($ids));
}

function anbar_all_active_users($except = 0)
{
    $out = [];
    foreach (anbar_app_users() as $u) {
        if ((int) $u->ID !== (int) $except && anbar_is_active($u->ID)) {
            $out[] = (int) $u->ID;
        }
    }
    return $out;
}

function anbar_fmt($n)
{
    return rtrim(rtrim(number_format((float) $n, 3, '.', ''), '0'), '.');
}

/** Called after any stock decrease; fires on crossing the minimum or reaching zero. */
function anbar_check_stock_level($item, $before)
{
    $wh = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $item['warehouse_id']);
    $link = '#/items/' . $item['id'];
    $qty = (float) $item['qty'];
    $min = (float) $item['min_qty'];
    if ($qty <= 0 && $before > 0) {
        anbar_notify(anbar_warehouse_audience($item['warehouse_id']), [
            'kind' => 'out_of_stock', 'title' => "«{$item['name']}» تمام شد", 'body' => "{$wh} — موجودی به صفر رسید.",
            'link' => $link, 'warehouse_id' => (int) $item['warehouse_id'],
        ]);
    } elseif ($min > 0 && $qty <= $min && $before > $min) {
        anbar_notify(anbar_warehouse_audience($item['warehouse_id']), [
            'kind' => 'low_stock', 'title' => "کمبود «{$item['name']}»",
            'body' => "{$wh} — موجودی " . anbar_fmt($qty) . " {$item['unit']}، حداقل لازم " . anbar_fmt($min) . " {$item['unit']}.",
            'link' => $link, 'warehouse_id' => (int) $item['warehouse_id'],
        ]);
    }
}

/** Hourly reminders: loan due dates and batch expiry. Safe to repeat thanks to dedupe keys. */
function anbar_run_scheduled_checks()
{
    $t = anbar_today();
    $soon = anbar_add_days($t, 2);
    $loans = anbar_all("SELECT l.*, i.name AS item_name, i.unit FROM {loans} l JOIN {items} i ON i.id = l.item_id
                        WHERE l.status = 'open' AND l.due_date IS NOT NULL AND l.due_date <= ?", $soon);
    foreach ($loans as $l) {
        $overdue = $l['due_date'] < $t;
        anbar_notify(anbar_warehouse_audience($l['warehouse_id']), [
            'kind' => $overdue ? 'loan_overdue' : 'loan_due',
            'title' => $overdue ? "تأخیر در بازگشت «{$l['item_name']}»" : "موعد بازگشت «{$l['item_name']}» نزدیک است",
            'body' => "امانت‌گیرنده: {$l['borrower']} — موعد: " . anbar_jalali($l['due_date']) . ' — باقی‌مانده: '
                . anbar_fmt($l['qty'] - $l['returned_qty']) . " {$l['unit']}",
            'link' => '#/loans', 'warehouse_id' => (int) $l['warehouse_id'], 'dedupe' => 'loan-' . ($overdue ? 'late' : 'due') . '-' . $l['id'],
        ]);
    }
    $batches = anbar_all('SELECT b.*, i.name AS item_name, i.unit, i.warehouse_id, i.id AS item_id FROM {batches} b
                          JOIN {items} i ON i.id = b.item_id
                          WHERE b.qty > 0 AND i.archived = 0 AND b.expiry IS NOT NULL AND b.expiry <= ?', anbar_add_days($t, 30));
    foreach ($batches as $b) {
        $stage = $b['expiry'] < $t ? 'expired' : ($b['expiry'] <= anbar_add_days($t, 7) ? 'week' : 'month');
        anbar_notify(anbar_warehouse_audience($b['warehouse_id']), [
            'kind' => 'expiry',
            'title' => $stage === 'expired' ? "«{$b['item_name']}» منقضی شده است" : "انقضای نزدیک «{$b['item_name']}»",
            'body' => "سری {$b['batch_no']} — " . anbar_fmt($b['qty']) . " {$b['unit']} — تاریخ انقضا " . anbar_jalali($b['expiry']),
            'link' => '#/items/' . $b['item_id'], 'warehouse_id' => (int) $b['warehouse_id'], 'dedupe' => "exp-{$stage}-{$b['id']}",
        ]);
    }
    foreach (anbar_users_with('steward') as $uid) {
        $who = anbar_user_public(get_userdata($uid));
        $n = (int) anbar_var("SELECT COUNT(*) FROM {items} WHERE archived = 0 AND card_status <> 'reviewed'" . anbar_scope_sql($who, 'warehouse_id'));
        if ($n > 0) {
            anbar_notify([$uid], ['kind' => 'card_incomplete', 'title' => "{$n} شناسنامه اموال نیازمند تکمیل یا بررسی است",
                'link' => '#/items?card=incomplete', 'dedupe' => 'cards-' . $t]);
        }
    }
}
