<?php
/**
 * Every stock change goes through this file. Each change writes exactly one row in `transactions`
 * (never deleted) and updates the cached quantities on items / batches in the same DB transaction.
 */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_reasons()
{
    return [
        'purchase' => ['in', 'خرید'],
        'receive' => ['in', 'دریافت'],
        'return' => ['in', 'بازگشت امانت'],
        'transfer_in' => ['in', 'دریافت انتقال'],
        'consume' => ['out', 'مصرف'],
        'loan' => ['out', 'امانت'],
        'damage' => ['out', 'خرابی'],
        'transfer_out' => ['out', 'ارسال انتقال'],
        'transfer_back' => ['in', 'برگشت انتقال'],
        'adjust' => ['adj', 'اصلاح موجودی'],
    ];
}

function anbar_load_item($id, $lock = false)
{
    $item = anbar_get('SELECT * FROM {items} WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), (int) $id);
    if (!$item) {
        throw anbar_not_found('کالا پیدا نشد.');
    }
    foreach (['qty', 'min_qty', 'loaned_qty'] as $k) {
        $item[$k] = (float) $item[$k];
    }
    foreach (['id', 'warehouse_id', 'batch_tracked', 'archived'] as $k) {
        $item[$k] = (int) $item[$k];
    }
    return $item;
}

function anbar_write_tx($item, $in, $user)
{
    $in += ['op_date' => null, 'party' => null, 'note' => null, 'batch_alloc' => null, 'loan_id' => null, 'transfer_id' => null,
        'request_id' => null, 'corrects_id' => null];
    $r = anbar_run('INSERT INTO {transactions} (item_id, warehouse_id, direction, reason, qty, delta, qty_after, op_date, party, note,
                      batch_alloc, loan_id, transfer_id, request_id, corrects_id, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        $item['id'], $item['warehouse_id'], anbar_reasons()[$in['reason']][0], $in['reason'], (float) $in['qty'], (float) $in['delta'],
        (float) $item['qty'], $in['op_date'] ?: anbar_today(), $in['party'], $in['note'],
        $in['batch_alloc'] ? wp_json_encode($in['batch_alloc'], JSON_UNESCAPED_UNICODE) : null,
        $in['loan_id'], $in['transfer_id'], $in['request_id'], $in['corrects_id'], $user['id']);
    return $r['id'];
}

function anbar_set_qty(&$item, $new)
{
    $item['qty'] = anbar_r3($new);
    anbar_run('UPDATE {items} SET qty = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $item['qty'], $item['id']);
}

/** First-expiry-first-out allocation across batches. `$batch_id` forces a single batch. */
function anbar_allocate_batches($item, $amount, $batch_id = null)
{
    $batches = $batch_id
        ? anbar_all('SELECT * FROM {batches} WHERE id = ? AND item_id = ? AND qty > 0 FOR UPDATE', (int) $batch_id, $item['id'])
        : anbar_all('SELECT * FROM {batches} WHERE item_id = ? AND qty > 0 ORDER BY expiry IS NULL, expiry, created_at, id FOR UPDATE', $item['id']);
    $alloc = [];
    $left = $amount;
    foreach ($batches as $b) {
        if ($left <= 0) {
            break;
        }
        $take = anbar_r3(min((float) $b['qty'], $left));
        $alloc[] = ['batch_id' => (int) $b['id'], 'batch_no' => $b['batch_no'], 'expiry' => $b['expiry'], 'qty' => $take];
        $left = anbar_r3($left - $take);
    }
    if ($left > 0) {
        throw anbar_bad($batch_id ? 'موجودی این سری کافی نیست.' : 'موجودی سری‌ها کافی نیست.');
    }
    return $alloc;
}

function anbar_apply_batch_alloc($alloc, $sign)
{
    foreach ($alloc as $a) {
        anbar_run('UPDATE {batches} SET qty = ROUND(qty + ?, 3) WHERE id = ?', $sign * (float) $a['qty'], (int) $a['batch_id']);
    }
}

function anbar_add_to_batch($item, $batch_no, $expiry, $amount)
{
    $ex = anbar_get('SELECT * FROM {batches} WHERE item_id = ? AND batch_no = ?', $item['id'], $batch_no);
    if ($ex) {
        if ($expiry && $ex['expiry'] && $ex['expiry'] !== $expiry) {
            throw anbar_bad("سری «{$batch_no}» قبلاً با تاریخ انقضای دیگری ثبت شده است.");
        }
        anbar_run('UPDATE {batches} SET qty = ROUND(qty + ?, 3), expiry = COALESCE(expiry, ?) WHERE id = ?', $amount, $expiry, (int) $ex['id']);
        return ['batch_id' => (int) $ex['id'], 'batch_no' => $batch_no, 'expiry' => $ex['expiry'] ?: $expiry, 'qty' => $amount];
    }
    $r = anbar_run('INSERT INTO {batches} (item_id, batch_no, expiry, qty, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
        $item['id'], $batch_no, $expiry, $amount);
    return ['batch_id' => $r['id'], 'batch_no' => $batch_no, 'expiry' => $expiry, 'qty' => $amount];
}

/** Stock entry (purchase / receive). */
function anbar_stock_in($item_id, $in, $user)
{
    return anbar_tx(function () use ($item_id, $in, $user) {
        $item = anbar_load_item($item_id, true);
        if ($item['archived']) {
            throw anbar_bad('این کالا بایگانی شده است.');
        }
        if (!in_array($in['reason'], ['purchase', 'receive'], true)) {
            throw anbar_bad('علت ورود نامعتبر است.');
        }
        $alloc = null;
        if ($item['batch_tracked']) {
            if (empty($in['batch_no'])) {
                throw anbar_bad('برای این کالا شماره سری را وارد کنید.');
            }
            if (empty($in['expiry'])) {
                throw anbar_bad('برای این کالا تاریخ انقضا را وارد کنید.');
            }
            $alloc = [anbar_add_to_batch($item, $in['batch_no'], $in['expiry'], $in['qty'])];
        }
        anbar_set_qty($item, $item['qty'] + $in['qty']);
        return anbar_write_tx($item, ['delta' => $in['qty'], 'batch_alloc' => $alloc] + $in, $user);
    });
}

/** Shared exit path: refuses to go below available stock, takes batches FEFO, fires low-stock alerts. */
function anbar_remove_stock(&$item, $in, $user)
{
    if ($in['qty'] > $item['qty']) {
        throw anbar_bad('مقدار خروجی (' . anbar_fmt($in['qty']) . " {$item['unit']}) بیشتر از موجودی قابل‌استفاده ("
            . anbar_fmt($item['qty']) . " {$item['unit']}) است.");
    }
    $alloc = null;
    if ($item['batch_tracked']) {
        $alloc = anbar_allocate_batches($item, $in['qty'], $in['batch_id'] ?? null);
        anbar_apply_batch_alloc($alloc, -1);
    }
    $before = $item['qty'];
    anbar_set_qty($item, $item['qty'] - $in['qty']);
    $id = anbar_write_tx($item, ['delta' => -$in['qty'], 'batch_alloc' => $alloc] + $in, $user);
    anbar_check_stock_level($item, $before);
    return $id;
}

/** Stock exit (consume / damage). Loans and transfers have their own functions. */
function anbar_stock_out($item_id, $in, $user)
{
    return anbar_tx(function () use ($item_id, $in, $user) {
        $item = anbar_load_item($item_id, true);
        if (!in_array($in['reason'], ['consume', 'damage'], true)) {
            throw anbar_bad('علت خروج نامعتبر است.');
        }
        $id = anbar_remove_stock($item, $in, $user);
        if (!empty($in['request_id'])) {
            anbar_mark_request_delivered($in['request_id'], $item, $user);
        }
        if ($in['reason'] === 'damage') {
            anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $user['id']), [
                'kind' => 'damage', 'title' => "ثبت خرابی «{$item['name']}»",
                'body' => anbar_fmt($in['qty']) . " {$item['unit']} به‌علت خرابی از موجودی کسر شد." . ($in['note'] ? ' ' . $in['note'] : ''),
                'link' => '#/items/' . $item['id'], 'warehouse_id' => $item['warehouse_id'],
            ]);
        }
        return $id;
    });
}

/** Counted-stock correction: sets the quantity to new_qty and records the difference with a mandatory reason. */
function anbar_adjust($item_id, $in, $user)
{
    if (empty($in['note'])) {
        throw anbar_bad('برای اصلاح موجودی، علت را بنویسید.');
    }
    return anbar_tx(function () use ($item_id, $in, $user) {
        $item = anbar_load_item($item_id, true);
        $alloc = null;
        if ($item['batch_tracked']) {
            $b = anbar_get('SELECT * FROM {batches} WHERE id = ? AND item_id = ? FOR UPDATE', (int) ($in['batch_id'] ?? 0), $item['id']);
            if (!$b) {
                throw anbar_bad('سری موردنظر را انتخاب کنید.');
            }
            $delta = anbar_r3($in['new_qty'] - (float) $b['qty']);
            anbar_run('UPDATE {batches} SET qty = ? WHERE id = ?', $in['new_qty'], (int) $b['id']);
            $alloc = [['batch_id' => (int) $b['id'], 'batch_no' => $b['batch_no'], 'expiry' => $b['expiry'], 'qty' => abs($delta)]];
        } else {
            $delta = anbar_r3($in['new_qty'] - $item['qty']);
        }
        if ($delta == 0) {
            throw anbar_bad('مقدار جدید با موجودی فعلی یکسان است.');
        }
        $before = $item['qty'];
        anbar_set_qty($item, $item['qty'] + $delta);
        $id = anbar_write_tx($item, ['reason' => 'adjust', 'qty' => abs($delta), 'delta' => $delta, 'note' => $in['note'],
            'corrects_id' => $in['corrects_id'] ?? null, 'op_date' => $in['op_date'] ?? null, 'batch_alloc' => $alloc], $user);
        if ($delta < 0) {
            anbar_check_stock_level($item, $before);
        }
        return $id;
    });
}

function anbar_loan_out($item_id, $in, $user)
{
    return anbar_tx(function () use ($item_id, $in, $user) {
        $item = anbar_load_item($item_id, true);
        if ($item['batch_tracked']) {
            throw anbar_bad('اقلام تاریخ‌دار را نمی‌توان امانت داد؛ از «خروج» استفاده کنید.');
        }
        $r = anbar_run('INSERT INTO {loans} (item_id, warehouse_id, borrower, program, qty, due_date, note, user_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            $item['id'], $item['warehouse_id'], $in['borrower'], $in['program'], $in['qty'], $in['due_date'], $in['note'], $user['id']);
        $tx = anbar_remove_stock($item, ['reason' => 'loan', 'party' => $in['borrower'], 'loan_id' => $r['id']] + $in, $user);
        anbar_run('UPDATE {items} SET loaned_qty = ROUND(loaned_qty + ?, 3) WHERE id = ?', $in['qty'], $item['id']);
        if (!empty($in['request_id'])) {
            anbar_mark_request_delivered($in['request_id'], $item, $user);
        }
        return ['loan_id' => $r['id'], 'tx_id' => $tx];
    });
}

function anbar_loan_return($loan_id, $in, $user)
{
    return anbar_tx(function () use ($loan_id, $in, $user) {
        $loan = anbar_get('SELECT * FROM {loans} WHERE id = ? FOR UPDATE', (int) $loan_id);
        if (!$loan) {
            throw anbar_not_found('امانت پیدا نشد.');
        }
        anbar_require_edit($user, $loan['warehouse_id']);
        if ($loan['status'] !== 'open') {
            throw anbar_bad('این امانت قبلاً بسته شده است.');
        }
        $remaining = anbar_r3($loan['qty'] - $loan['returned_qty']);
        if ($in['qty'] > $remaining) {
            throw anbar_bad('حداکثر مقدار قابل بازگشت ' . anbar_fmt($remaining) . ' است.');
        }
        $item = anbar_load_item($loan['item_id'], true);
        anbar_set_qty($item, $item['qty'] + $in['qty']);
        anbar_run('UPDATE {items} SET loaned_qty = GREATEST(0, ROUND(loaned_qty - ?, 3)) WHERE id = ?', $in['qty'], $item['id']);
        $returned = anbar_r3($loan['returned_qty'] + $in['qty']);
        $closed = $returned >= (float) $loan['qty'];
        anbar_run('UPDATE {loans} SET returned_qty = ?, status = ?, closed_at = ' . ($closed ? 'UTC_TIMESTAMP()' : 'NULL') . ' WHERE id = ?',
            $returned, $closed ? 'closed' : 'open', (int) $loan['id']);
        return anbar_write_tx($item, ['reason' => 'return', 'qty' => $in['qty'], 'delta' => $in['qty'], 'party' => $loan['borrower'],
            'note' => $in['note'], 'op_date' => $in['op_date'], 'loan_id' => (int) $loan['id']], $user);
    });
}

function anbar_transfer_send($item_id, $in, $user)
{
    return anbar_tx(function () use ($item_id, $in, $user) {
        $item = anbar_load_item($item_id, true);
        $dest = anbar_get('SELECT * FROM {warehouses} WHERE id = ? AND archived = 0', (int) $in['to_wh']);
        if (!$dest) {
            throw anbar_bad('انبار مقصد را انتخاب کنید.');
        }
        if ((int) $dest['id'] === $item['warehouse_id']) {
            throw anbar_bad('انبار مقصد با انبار مبدأ یکسان است.');
        }
        $r = anbar_run('INSERT INTO {transfers} (item_id, from_wh, to_wh, qty, note, sent_by, sent_at) VALUES (?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            $item['id'], $item['warehouse_id'], (int) $dest['id'], $in['qty'], $in['note'], $user['id']);
        $tx = anbar_remove_stock($item, ['reason' => 'transfer_out', 'qty' => $in['qty'], 'note' => $in['note'], 'op_date' => $in['op_date'],
            'party' => $dest['name'], 'transfer_id' => $r['id']], $user);
        $alloc = anbar_var('SELECT batch_alloc FROM {transactions} WHERE id = ?', $tx);
        anbar_run('UPDATE {transfers} SET batch_alloc = ? WHERE id = ?', $alloc, $r['id']);
        $from = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', $item['warehouse_id']);
        anbar_notify(anbar_warehouse_audience($dest['id'], $user['id']), [
            'kind' => 'transfer_in', 'title' => "انتقال «{$item['name']}» به {$dest['name']}",
            'body' => anbar_fmt($in['qty']) . " {$item['unit']} از {$from} ارسال شد و منتظر تأیید دریافت است.",
            'link' => '#/transfers', 'warehouse_id' => (int) $dest['id'],
        ]);
        return ['transfer_id' => $r['id'], 'tx_id' => $tx];
    });
}

/** Destination manager confirms receipt; stock lands in a matching item (same code) or a new copy. */
function anbar_transfer_receive($transfer_id, $in, $user)
{
    return anbar_tx(function () use ($transfer_id, $in, $user) {
        $t = anbar_get('SELECT * FROM {transfers} WHERE id = ? FOR UPDATE', (int) $transfer_id);
        if (!$t) {
            throw anbar_not_found('انتقال پیدا نشد.');
        }
        anbar_require_edit($user, $t['to_wh']);
        if ($t['status'] !== 'pending') {
            throw anbar_bad('این انتقال قبلاً بررسی شده است.');
        }
        $src = anbar_load_item($t['item_id']);
        $dest_row = anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ?', (int) $t['to_wh'], $src['code']);
        if (!$dest_row) {
            $r = anbar_run('INSERT INTO {items} (warehouse_id, name, code, category, unit, min_qty, `condition`, brand, model, serial, image,
                              notes, batch_tracked, created_by, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                (int) $t['to_wh'], $src['name'], $src['code'], $src['category'], $src['unit'], $src['condition'], $src['brand'],
                $src['model'], $src['serial'], $src['image'], $src['notes'], $src['batch_tracked'], $user['id']);
            $dest = anbar_load_item($r['id'], true);
        } else {
            $dest = anbar_load_item($dest_row['id'], true);
            if ($dest['unit'] !== $src['unit']) {
                throw anbar_bad("کالای «{$dest['name']}» در انبار مقصد با واحد «{$dest['unit']}» ثبت شده و با واحد ارسالی ({$src['unit']}) فرق دارد.");
            }
        }
        if ($dest['archived']) {
            anbar_run('UPDATE {items} SET archived = 0 WHERE id = ?', $dest['id']);
        }
        $alloc = null;
        $src_alloc = $t['batch_alloc'] ? json_decode($t['batch_alloc'], true) : null;
        if ($src_alloc && $dest['batch_tracked']) {
            $alloc = array_map(function ($a) use ($dest) {
                return anbar_add_to_batch($dest, $a['batch_no'], $a['expiry'], $a['qty']);
            }, $src_alloc);
        }
        anbar_set_qty($dest, $dest['qty'] + (float) $t['qty']);
        $from = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $t['from_wh']);
        $tx = anbar_write_tx($dest, ['reason' => 'transfer_in', 'qty' => (float) $t['qty'], 'delta' => (float) $t['qty'], 'party' => $from,
            'note' => $in['note'], 'transfer_id' => (int) $t['id'], 'batch_alloc' => $alloc], $user);
        anbar_run("UPDATE {transfers} SET status = 'received', handled_by = ?, handled_at = UTC_TIMESTAMP(), handle_note = ?, dest_item_id = ? WHERE id = ?",
            $user['id'], $in['note'], $dest['id'], (int) $t['id']);
        anbar_notify(anbar_warehouse_audience($t['from_wh'], $user['id']), [
            'kind' => 'transfer_done', 'title' => "دریافت «{$src['name']}» تأیید شد",
            'body' => anbar_fmt($t['qty']) . " {$src['unit']} در انبار مقصد ثبت شد.", 'link' => '#/transfers', 'warehouse_id' => (int) $t['from_wh'],
        ]);
        return $tx;
    });
}

/** Reject (by destination) or cancel (by origin): the quantity goes back to the origin item. */
function anbar_transfer_back($transfer_id, $in, $user, $mode)
{
    return anbar_tx(function () use ($transfer_id, $in, $user, $mode) {
        $t = anbar_get('SELECT * FROM {transfers} WHERE id = ? FOR UPDATE', (int) $transfer_id);
        if (!$t) {
            throw anbar_not_found('انتقال پیدا نشد.');
        }
        anbar_require_edit($user, $mode === 'reject' ? $t['to_wh'] : $t['from_wh']);
        if ($t['status'] !== 'pending') {
            throw anbar_bad('این انتقال قبلاً بررسی شده است.');
        }
        if ($mode === 'reject' && empty($in['note'])) {
            throw anbar_bad('علت رد انتقال را بنویسید.');
        }
        $item = anbar_load_item($t['item_id'], true);
        $alloc = $t['batch_alloc'] ? json_decode($t['batch_alloc'], true) : null;
        if ($alloc) {
            anbar_apply_batch_alloc($alloc, +1);
        }
        anbar_set_qty($item, $item['qty'] + (float) $t['qty']);
        $tx = anbar_write_tx($item, ['reason' => 'transfer_back', 'qty' => (float) $t['qty'], 'delta' => (float) $t['qty'],
            'note' => $in['note'] ?: 'لغو انتقال', 'transfer_id' => (int) $t['id'], 'batch_alloc' => $alloc], $user);
        anbar_run('UPDATE {transfers} SET status = ?, handled_by = ?, handled_at = UTC_TIMESTAMP(), handle_note = ? WHERE id = ?',
            $mode === 'reject' ? 'rejected' : 'cancelled', $user['id'], $in['note'], (int) $t['id']);
        if ($mode === 'reject') {
            anbar_notify(anbar_warehouse_audience($t['from_wh'], $user['id']), [
                'kind' => 'transfer_done', 'title' => "انتقال «{$item['name']}» رد شد", 'body' => "علت: {$in['note']}. موجودی به انبار مبدأ برگشت.",
                'link' => '#/transfers', 'warehouse_id' => (int) $t['from_wh'],
            ]);
        }
        return $tx;
    });
}

function anbar_mark_request_delivered($request_id, $item, $user)
{
    $r = anbar_get('SELECT * FROM {requests} WHERE id = ?', (int) $request_id);
    if (!$r || (int) $r['warehouse_id'] !== $item['warehouse_id'] || !in_array($r['status'], ['approved', 'pending'], true)) {
        return;
    }
    anbar_run("UPDATE {requests} SET status = 'delivered', reviewer_id = COALESCE(reviewer_id, ?), reviewed_at = COALESCE(reviewed_at, UTC_TIMESTAMP())
               WHERE id = ?", $user['id'], (int) $r['id']);
    if ((int) $r['requester_id'] !== $user['id']) {
        anbar_notify([(int) $r['requester_id']], [
            'kind' => 'request_result', 'title' => "درخواست «{$r['item_name']}» تحویل شد", 'link' => '#/requests', 'warehouse_id' => (int) $r['warehouse_id'],
        ]);
    }
}
