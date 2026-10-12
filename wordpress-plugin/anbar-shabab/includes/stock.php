<?php
/**
 * Every stock change goes through this file. Each change writes exactly one row in `transactions`
 * (never deleted) and updates the cached quantities on items / batches in the same DB transaction.
 *
 * Quantities on an item:
 *   qty         physically in the warehouse (includes broken and reserved units)
 *   broken_qty  part of qty that is broken / awaiting repair
 *   loaned_qty  out on loan (not part of qty)
 *   reserved    computed: lines of APPROVED exit requests not yet delivered
 *   usable      qty − broken − reserved(usable)
 */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_reasons()
{
    return [
        'purchase' => ['in', 'خرید'],
        'gift' => ['in', 'هدیه'],
        'opening' => ['in', 'موجودی اولیه'],
        'return_in' => ['in', 'بازگشت'],
        'loan_return' => ['in', 'بازگشت امانت'],
        'transfer_in' => ['in', 'دریافت انتقال'],
        'transfer_back' => ['in', 'برگشت انتقال'],
        'consume' => ['out', 'مصرف'],
        'permanent' => ['out', 'خروج دائم'],
        'loan' => ['out', 'امانت'],
        'transfer_out' => ['out', 'ارسال انتقال'],
        'damage' => ['st', 'ثبت خرابی'],
        'repair' => ['st', 'ثبت تعمیر'],
        'adjust' => ['adj', 'اصلاح موجودی'],
    ];
}

function anbar_exit_types()
{
    return ['consume' => 'مصرف', 'loan' => 'امانت', 'transfer' => 'انتقال به انبار دیگر', 'permanent' => 'خروج دائم'];
}

function anbar_exit_statuses()
{
    return ['draft' => 'پیش‌نویس', 'pending' => 'در انتظار تأیید', 'needs_changes' => 'نیازمند اصلاح', 'rejected' => 'ردشده',
        'approved' => 'تأییدشده — آماده تحویل', 'delivered' => 'تحویل‌شده', 'cancelled' => 'لغوشده'];
}

function anbar_exit_code($id)
{
    return 'E-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
}

function anbar_load_item($id, $lock = false)
{
    $item = anbar_get('SELECT * FROM {items} WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), (int) $id);
    if (!$item) {
        throw anbar_not_found('کالا پیدا نشد.');
    }
    foreach (['qty', 'min_qty', 'loaned_qty', 'broken_qty'] as $k) {
        $item[$k] = (float) $item[$k];
    }
    foreach (['id', 'warehouse_id', 'batch_tracked', 'archived'] as $k) {
        $item[$k] = (int) $item[$k];
    }
    return $item;
}

/** Quantity held by approved, undelivered exit requests. */
function anbar_reserved($item_id, $from_broken = 0, $exclude_exit = 0)
{
    return anbar_r3(anbar_var("SELECT COALESCE(SUM(l.qty), 0) FROM {exit_lines} l JOIN {exits} e ON e.id = l.exit_id
        WHERE e.status = 'approved' AND l.item_id = ? AND l.from_broken = ? AND e.id <> ?", (int) $item_id, (int) $from_broken, (int) $exclude_exit));
}
function anbar_usable($item, $exclude_exit = 0)
{
    return anbar_r3($item['qty'] - $item['broken_qty'] - anbar_reserved($item['id'], 0, $exclude_exit));
}
function anbar_broken_free($item, $exclude_exit = 0)
{
    return anbar_r3($item['broken_qty'] - anbar_reserved($item['id'], 1, $exclude_exit));
}

/** Stop the same form being submitted twice (double tap, retry after a slow network). */
function anbar_check_op_key($key)
{
    if ($key && anbar_get('SELECT id FROM {transactions} WHERE op_key = ?', $key)) {
        throw anbar_bad('این عملیات قبلاً ثبت شده است.');
    }
}

function anbar_write_tx($item, $in, $user)
{
    $in += ['op_date' => null, 'party' => null, 'note' => null, 'batch_alloc' => null, 'loan_id' => null, 'transfer_id' => null,
        'exit_id' => null, 'corrects_id' => null, 'op_key' => null];
    $r = anbar_run('INSERT INTO {transactions} (item_id, warehouse_id, direction, reason, qty, delta, qty_after, op_date, party, note,
                      batch_alloc, loan_id, transfer_id, exit_id, corrects_id, op_key, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        $item['id'], $item['warehouse_id'], anbar_reasons()[$in['reason']][0], $in['reason'], (float) $in['qty'], (float) $in['delta'],
        (float) $item['qty'], $in['op_date'] ?: anbar_today(), $in['party'], $in['note'],
        $in['batch_alloc'] ? wp_json_encode($in['batch_alloc'], JSON_UNESCAPED_UNICODE) : null,
        $in['loan_id'], $in['transfer_id'], $in['exit_id'], $in['corrects_id'], $in['op_key'] ?: null, $user['id']);
    return $r['id'];
}

function anbar_set_qty(&$item, $new)
{
    $item['qty'] = anbar_r3($new);
    anbar_run('UPDATE {items} SET qty = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $item['qty'], $item['id']);
}
function anbar_set_broken(&$item, $new)
{
    $item['broken_qty'] = max(0, anbar_r3($new));
    anbar_run('UPDATE {items} SET broken_qty = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $item['broken_qty'], $item['id']);
}

/** First-expiry-first-out allocation across batches. */
function anbar_allocate_batches($item, $amount)
{
    $batches = anbar_all('SELECT * FROM {batches} WHERE item_id = ? AND qty > 0 ORDER BY expiry IS NULL, expiry, created_at, id FOR UPDATE', $item['id']);
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
        throw anbar_bad("موجودی سری‌های «{$item['name']}» کافی نیست.");
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

/* ================================================================ entries, corrections, damage */

/** Stock entry: purchase / gift / opening stock / return. */
function anbar_stock_in($item_id, $in, $user)
{
    return anbar_tx(function () use ($item_id, $in, $user) {
        anbar_check_op_key($in['op_key'] ?? null);
        $item = anbar_load_item($item_id, true);
        if ($item['archived']) {
            throw anbar_bad('این کالا بایگانی شده است.');
        }
        if (!in_array($in['reason'], ['purchase', 'gift', 'opening', 'return_in'], true)) {
            throw anbar_bad('علت ورود را انتخاب کنید.');
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
        $id = anbar_write_tx($item, ['delta' => $in['qty'], 'batch_alloc' => $alloc] + $in, $user);
        anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $user['id']), [
            'kind' => 'stock_in', 'title' => "ورود «{$item['name']}»",
            'body' => anbar_fmt($in['qty']) . " {$item['unit']} — " . anbar_reasons()[$in['reason']][1] . " — {$user['full_name']}",
            'link' => '#/receipt/' . $id, 'warehouse_id' => $item['warehouse_id'],
        ]);
        return $id;
    });
}

/**
 * Counted-stock correction with a mandatory reason. Callers check permissions:
 * increases need stock_in, decreases need approve (a decrease is effectively an exit).
 */
function anbar_adjust($item_id, $in, $user)
{
    if (empty($in['note'])) {
        throw anbar_bad('برای اصلاح موجودی، علت را بنویسید.');
    }
    return anbar_tx(function () use ($item_id, $in, $user) {
        anbar_check_op_key($in['op_key'] ?? null);
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
        if ($delta < 0 && anbar_usable($item) + $delta < 0) {
            throw anbar_bad('این اصلاح موجودی قابل‌استفاده را منفی می‌کند (بخشی از موجودی خراب یا رزرو است).');
        }
        $before = $item['qty'];
        anbar_set_qty($item, $item['qty'] + $delta);
        $id = anbar_write_tx($item, ['reason' => 'adjust', 'qty' => abs($delta), 'delta' => $delta, 'note' => $in['note'],
            'corrects_id' => $in['corrects_id'] ?? null, 'op_date' => $in['op_date'] ?? null, 'batch_alloc' => $alloc, 'op_key' => $in['op_key'] ?? null], $user);
        if ($delta < 0) {
            anbar_check_stock_level($item, $before);
        }
        return $id;
    });
}

/** Move units between usable and broken. `$mode` = damage (usable → broken) or repair (broken → usable). */
function anbar_damage_repair($item_id, $mode, $in, $user)
{
    return anbar_tx(function () use ($item_id, $mode, $in, $user) {
        anbar_check_op_key($in['op_key'] ?? null);
        $item = anbar_load_item($item_id, true);
        if ($mode === 'damage') {
            $free = anbar_usable($item);
            if ($in['qty'] > $free) {
                throw anbar_bad('حداکثر ' . anbar_fmt($free) . " {$item['unit']} سالم و آزاد موجود است.");
            }
            anbar_set_broken($item, $item['broken_qty'] + $in['qty']);
        } else {
            $free = anbar_broken_free($item);
            if ($in['qty'] > $free) {
                throw anbar_bad('حداکثر ' . anbar_fmt($free) . " {$item['unit']} خراب ثبت شده است.");
            }
            anbar_set_broken($item, $item['broken_qty'] - $in['qty']);
        }
        $id = anbar_write_tx($item, ['reason' => $mode, 'qty' => $in['qty'], 'delta' => 0, 'note' => $in['note'],
            'op_date' => $in['op_date'] ?? null, 'op_key' => $in['op_key'] ?? null], $user);
        anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $user['id']), [
            'kind' => 'damage', 'title' => ($mode === 'damage' ? 'ثبت خرابی' : 'ثبت تعمیر') . " «{$item['name']}»",
            'body' => anbar_fmt($in['qty']) . " {$item['unit']}" . ($in['note'] ? ' — ' . $in['note'] : ''),
            'link' => '#/items/' . $item['id'], 'warehouse_id' => $item['warehouse_id'],
        ]);
        return $id;
    });
}

/* ================================================================ exit requests */

function anbar_exit_load($id, $lock = false)
{
    $e = anbar_get('SELECT * FROM {exits} WHERE id = ?' . ($lock ? ' FOR UPDATE' : ''), (int) $id);
    if (!$e) {
        throw anbar_not_found('درخواست خروج پیدا نشد.');
    }
    $e['lines'] = anbar_all('SELECT l.*, i.name AS item_name, i.code, i.unit, i.batch_tracked FROM {exit_lines} l
        JOIN {items} i ON i.id = l.item_id WHERE l.exit_id = ? ORDER BY l.id', (int) $id);
    return $e;
}

/** Validate and store a draft/edited exit request. Returns the id. */
function anbar_exit_save($user, $b, $id = null)
{
    $types = anbar_exit_types();
    $type = $b['type'] ?? '';
    if (!isset($types[$type])) {
        throw anbar_bad('نوع خروج را انتخاب کنید.');
    }
    $from = (int) ($b['from_wh'] ?? 0);
    if (!anbar_get('SELECT id FROM {warehouses} WHERE id = ? AND archived = 0', $from)) {
        throw anbar_bad('انبار مبدأ را انتخاب کنید.');
    }
    anbar_require($user, 'request_out', $from, 'شما اجازه ثبت درخواست خروج از این انبار را ندارید.');
    $to = null;
    if ($type === 'transfer') {
        $to = (int) ($b['to_wh'] ?? 0);
        if (!$to || $to === $from || !anbar_get('SELECT id FROM {warehouses} WHERE id = ? AND archived = 0', $to)) {
            throw anbar_bad('انبار مقصد را درست انتخاب کنید.');
        }
    }
    $recipient = anbar_str($b['recipient'] ?? '', 150);
    if ($type !== 'transfer' && !$recipient) {
        throw anbar_bad('نام تحویل‌گیرنده را وارد کنید.');
    }
    $due = anbar_date($b['due_date'] ?? null, 'موعد بازگشت');
    if ($type === 'loan' && !$due) {
        throw anbar_bad('برای امانت، موعد بازگشت را مشخص کنید.');
    }
    $lines = [];
    $seen = [];
    foreach ((array) ($b['lines'] ?? []) as $ln) {
        $item = anbar_load_item($ln['item_id'] ?? 0);
        if ($item['warehouse_id'] !== $from) {
            throw anbar_bad("«{$item['name']}» در انبار مبدأ این درخواست نیست.");
        }
        if ($item['archived']) {
            throw anbar_bad("«{$item['name']}» بایگانی شده است.");
        }
        if ($type === 'loan' && $item['batch_tracked']) {
            throw anbar_bad("«{$item['name']}» تاریخ‌دار است و امانت داده نمی‌شود.");
        }
        $broken = $type === 'permanent' && !empty($ln['from_broken']) ? 1 : 0;
        $key = $item['id'] . '-' . $broken;
        if (isset($seen[$key])) {
            throw anbar_bad("«{$item['name']}» دو بار در فهرست آمده است.");
        }
        $seen[$key] = true;
        $lines[] = ['item_id' => $item['id'], 'qty' => anbar_qty($ln['qty'] ?? '', "مقدار «{$item['name']}»"), 'from_broken' => $broken];
    }
    if (!$lines) {
        throw anbar_bad('حداقل یک کالا انتخاب کنید.');
    }
    $fields = [
        'ticket_id' => !empty($b['ticket_id']) ? (int) $b['ticket_id'] : null,
        'from_wh' => $from, 'to_wh' => $to, 'type' => $type, 'recipient' => $recipient,
        'recipient_phone' => anbar_str(anbar_to_latin($b['recipient_phone'] ?? ''), 20),
        'reason' => anbar_str($b['reason'] ?? '', 2000), 'program' => anbar_str($b['program'] ?? '', 200),
        'delivery_place' => anbar_str($b['delivery_place'] ?? '', 200), 'needed_by' => anbar_date($b['needed_by'] ?? null, 'تاریخ موردنیاز'),
        'due_date' => $type === 'loan' ? $due : null, 'note' => anbar_str($b['note'] ?? '', 2000),
    ];
    if ($fields['ticket_id']) {
        anbar_ticket_for_user($fields['ticket_id'], $user); // must be able to see the ticket
    }
    return anbar_tx(function () use ($user, $fields, $lines, $id) {
        if ($id) {
            $old = anbar_exit_load($id, true);
            if (!in_array($old['status'], ['draft', 'pending', 'needs_changes', 'approved'], true)) {
                throw anbar_bad('این درخواست دیگر قابل ویرایش نیست.');
            }
            if ((int) $old['requester_id'] !== $user['id'] && !anbar_can($user, 'request_out', $old['from_wh'])) {
                throw anbar_forbidden();
            }
            $material = $old['from_wh'] != $fields['from_wh'] || $old['type'] !== $fields['type'] || (string) $old['to_wh'] !== (string) $fields['to_wh']
                || (string) $old['recipient'] !== (string) $fields['recipient'] || anbar_lines_sig($old['lines']) !== anbar_lines_sig($lines);
            $sets = [];
            $args = [];
            foreach ($fields as $k => $v) {
                $sets[] = "{$k} = ?";
                $args[] = $v;
            }
            anbar_run('UPDATE {exits} SET ' . implode(', ', $sets) . ', updated_at = UTC_TIMESTAMP() WHERE id = ?', ...array_merge($args, [(int) $id]));
            anbar_run('DELETE FROM {exit_lines} WHERE exit_id = ?', (int) $id);
            if ($old['status'] === 'approved' && $material) {
                // Changing what leaves, from where, or to whom voids the approval.
                anbar_run("UPDATE {exits} SET status = 'pending', approver_id = NULL, approved_at = NULL, decision_note = NULL WHERE id = ?", (int) $id);
                anbar_audit($user['id'], 'exit_reapproval', 'exit', $id, ['reason' => 'changed after approval']);
                anbar_notify(anbar_users_with('approve', $fields['from_wh'], $user['id']), [
                    'kind' => 'exit_pending', 'title' => 'درخواست ' . anbar_exit_code($id) . ' پس از تأیید تغییر کرد و دوباره منتظر تأیید است',
                    'link' => '#/exits/' . $id, 'warehouse_id' => $fields['from_wh'],
                ]);
            }
            anbar_audit($user['id'], 'exit_update', 'exit', $id);
        } else {
            $cols = array_keys($fields);
            $r = anbar_run('INSERT INTO {exits} (' . implode(', ', $cols) . ", status, requester_id, created_at, updated_at)
                            VALUES (" . implode(', ', array_fill(0, count($cols), '?')) . ", 'draft', ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())",
                ...array_merge(array_values($fields), [$user['id']]));
            $id = $r['id'];
            anbar_audit($user['id'], 'exit_create', 'exit', $id);
            if ($fields['ticket_id']) {
                anbar_ticket_event($fields['ticket_id'], $user['id'], 'link', 'درخواست خروج ' . anbar_exit_code($id) . ' ساخته شد.');
            }
        }
        foreach ($lines as $l) {
            anbar_run('INSERT INTO {exit_lines} (exit_id, item_id, qty, from_broken) VALUES (?, ?, ?, ?)', (int) $id, $l['item_id'], $l['qty'], $l['from_broken']);
        }
        return (int) $id;
    });
}

function anbar_lines_sig($lines)
{
    $s = array_map(function ($l) {
        return (int) $l['item_id'] . ':' . anbar_fmt($l['qty']) . ':' . (int) $l['from_broken'];
    }, $lines);
    sort($s);
    return implode('|', $s);
}

function anbar_exit_submit($user, $id)
{
    return anbar_tx(function () use ($user, $id) {
        $e = anbar_exit_load($id, true);
        if ((int) $e['requester_id'] !== $user['id'] && !anbar_can($user, 'request_out', $e['from_wh'])) {
            throw anbar_forbidden();
        }
        if (!in_array($e['status'], ['draft', 'needs_changes'], true)) {
            throw anbar_bad('این درخواست قبلاً ارسال شده است.');
        }
        anbar_run("UPDATE {exits} SET status = 'pending', submitted_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP() WHERE id = ?", (int) $id);
        anbar_audit($user['id'], 'exit_submit', 'exit', $id);
        $wh = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $e['from_wh']);
        anbar_notify(anbar_users_with('approve', $e['from_wh'], $user['id']), [
            'kind' => 'exit_pending', 'title' => 'درخواست خروج ' . anbar_exit_code($id) . ' منتظر تأیید است',
            'body' => "{$wh} — " . anbar_exit_types()[$e['type']] . ' — ' . count($e['lines']) . " قلم — {$user['full_name']}",
            'link' => '#/exits/' . $id, 'warehouse_id' => (int) $e['from_wh'],
        ]);
        return true;
    });
}

/** Approver's decision: approve (reserves stock), reject, or send back for changes. */
function anbar_exit_decide($user, $id, $decision, $note)
{
    return anbar_tx(function () use ($user, $id, $decision, $note) {
        $e = anbar_exit_load($id, true);
        anbar_require($user, 'approve', $e['from_wh'], 'شما اختیار تأیید خروج از این انبار را ندارید.');
        if ($e['status'] !== 'pending') {
            throw anbar_bad('این درخواست در انتظار تأیید نیست.');
        }
        if ($decision !== 'approve' && !$note) {
            throw anbar_bad($decision === 'reject' ? 'علت رد را بنویسید.' : 'بنویسید چه چیزی باید اصلاح شود.');
        }
        if ($decision === 'approve') {
            foreach ($e['lines'] as $l) {
                $item = anbar_load_item($l['item_id'], true);
                $free = $l['from_broken'] ? anbar_broken_free($item) : anbar_usable($item);
                if ((float) $l['qty'] > $free) {
                    throw anbar_bad("موجودی آزاد «{$item['name']}» " . anbar_fmt($free) . " {$item['unit']} است و برای این درخواست کافی نیست.");
                }
            }
        }
        $status = ['approve' => 'approved', 'reject' => 'rejected', 'changes' => 'needs_changes'][$decision] ?? null;
        if (!$status) {
            throw anbar_bad('تصمیم نامعتبر است.');
        }
        anbar_run('UPDATE {exits} SET status = ?, approver_id = ?, approved_at = UTC_TIMESTAMP(), decision_note = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
            $status, $user['id'], $note, (int) $id);
        anbar_audit($user['id'], 'exit_' . $decision, 'exit', $id, ['note' => $note, 'requester' => (int) $e['requester_id']]);
        $code = anbar_exit_code($id);
        $label = ['approved' => 'تأیید شد', 'rejected' => 'رد شد', 'needs_changes' => 'نیازمند اصلاح است'][$status];
        if ((int) $e['requester_id'] !== $user['id']) {
            anbar_notify([(int) $e['requester_id']], [
                'kind' => 'exit_result', 'title' => "درخواست خروج {$code} {$label}",
                'body' => $note ? "{$user['full_name']}: {$note}" : "تأییدکننده: {$user['full_name']}", 'link' => '#/exits/' . $id,
                'warehouse_id' => (int) $e['from_wh'],
            ]);
        }
        if ($status === 'approved') {
            anbar_notify(anbar_users_with('deliver', $e['from_wh'], $user['id']), [
                'kind' => 'exit_ready', 'title' => "حواله {$code} آماده تحویل است",
                'body' => ($e['recipient'] ? "تحویل‌گیرنده: {$e['recipient']}" : '') . ($e['delivery_place'] ? " — محل: {$e['delivery_place']}" : ''),
                'link' => '#/exits/' . $id, 'warehouse_id' => (int) $e['from_wh'],
            ]);
            if ($e['ticket_id']) {
                anbar_run("UPDATE {tickets} SET status = 'ready', updated_at = UTC_TIMESTAMP() WHERE id = ? AND status NOT IN ('delivered', 'closed', 'rejected')", (int) $e['ticket_id']);
                anbar_ticket_event($e['ticket_id'], $user['id'], 'status', "درخواست خروج {$code} تأیید شد؛ آماده هماهنگی و تحویل.");
            }
        }
        return true;
    });
}

/** Record the real hand-over. Only here does stock go down. */
function anbar_exit_deliver($user, $id, $in)
{
    return anbar_tx(function () use ($user, $id, $in) {
        $e = anbar_exit_load($id, true);
        anbar_require($user, 'deliver', $e['from_wh'], 'شما اجازه ثبت تحویل از این انبار را ندارید.');
        if ($e['status'] !== 'approved') {
            throw anbar_bad($e['status'] === 'delivered' ? 'این حواله قبلاً تحویل شده است.' : 'فقط درخواست تأییدشده قابل تحویل است.');
        }
        $code = anbar_exit_code($id);
        $op_date = $in['op_date'] ?? anbar_today();
        $note = $in['note'] ?? null;
        $party = $e['type'] === 'transfer' ? anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $e['to_wh']) : $e['recipient'];
        foreach ($e['lines'] as $l) {
            $item = anbar_load_item($l['item_id'], true);
            $qty = (float) $l['qty'];
            $free = $l['from_broken'] ? anbar_broken_free($item, $id) : anbar_usable($item, $id);
            if ($qty > $free) {
                throw anbar_bad("موجودی «{$item['name']}» برای تحویل کافی نیست (آزاد: " . anbar_fmt($free) . " {$item['unit']}).");
            }
            $alloc = null;
            if ($item['batch_tracked']) {
                $alloc = anbar_allocate_batches($item, $qty);
                anbar_apply_batch_alloc($alloc, -1);
            }
            $before = $item['qty'];
            anbar_set_qty($item, $item['qty'] - $qty);
            if ($l['from_broken']) {
                anbar_set_broken($item, $item['broken_qty'] - $qty);
            }
            $tx = ['qty' => $qty, 'delta' => -$qty, 'op_date' => $op_date, 'party' => $party, 'note' => $note, 'batch_alloc' => $alloc,
                'exit_id' => (int) $id, 'op_key' => null];
            if ($e['type'] === 'loan') {
                $r = anbar_run('INSERT INTO {loans} (item_id, warehouse_id, exit_id, borrower, borrower_phone, program, qty, due_date, note, user_id, created_at)
                                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
                    $item['id'], $item['warehouse_id'], (int) $id, $e['recipient'], $e['recipient_phone'], $e['program'], $qty, $e['due_date'], $note, $user['id']);
                anbar_run('UPDATE {items} SET loaned_qty = ROUND(loaned_qty + ?, 3) WHERE id = ?', $qty, $item['id']);
                $tx_id = anbar_write_tx($item, ['reason' => 'loan', 'loan_id' => $r['id']] + $tx, $user);
            } elseif ($e['type'] === 'transfer') {
                $r = anbar_run('INSERT INTO {transfers} (item_id, from_wh, to_wh, exit_id, qty, batch_alloc, note, sent_by, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
                    $item['id'], $item['warehouse_id'], (int) $e['to_wh'], (int) $id, $qty, $alloc ? wp_json_encode($alloc, JSON_UNESCAPED_UNICODE) : null, $note, $user['id']);
                $tx_id = anbar_write_tx($item, ['reason' => 'transfer_out', 'transfer_id' => $r['id']] + $tx, $user);
            } else {
                $tx_id = anbar_write_tx($item, ['reason' => $e['type'] === 'permanent' ? 'permanent' : 'consume'] + $tx, $user);
            }
            anbar_run('UPDATE {exit_lines} SET tx_id = ? WHERE id = ?', $tx_id, (int) $l['id']);
            if (!$l['from_broken']) {
                anbar_check_stock_level($item, $before);
            }
        }
        anbar_run("UPDATE {exits} SET status = 'delivered', deliverer_id = ?, delivered_at = UTC_TIMESTAMP(), delivery_note = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?",
            $user['id'], $note, (int) $id);
        anbar_audit($user['id'], 'exit_deliver', 'exit', $id);
        if ($e['type'] === 'transfer') {
            $from = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $e['from_wh']);
            anbar_notify(anbar_users_with('stock_in', $e['to_wh'], $user['id']), [
                'kind' => 'transfer_in', 'title' => "انتقال {$code} از {$from} منتظر تأیید دریافت است",
                'link' => '#/transfers', 'warehouse_id' => (int) $e['to_wh'],
            ]);
        }
        if ((int) $e['requester_id'] !== $user['id']) {
            anbar_notify([(int) $e['requester_id']], ['kind' => 'exit_result', 'title' => "حواله {$code} تحویل شد", 'link' => '#/exits/' . $id]);
        }
        if ($e['ticket_id']) {
            anbar_ticket_event($e['ticket_id'], $user['id'], 'status', "حواله {$code} تحویل شد.");
            $open = (int) anbar_var("SELECT COUNT(*) FROM {exits} WHERE ticket_id = ? AND status NOT IN ('delivered', 'cancelled', 'rejected')", (int) $e['ticket_id']);
            if (!$open) {
                anbar_run("UPDATE {tickets} SET status = 'delivered', updated_at = UTC_TIMESTAMP() WHERE id = ?", (int) $e['ticket_id']);
            }
        }
        return true;
    });
}

function anbar_exit_cancel($user, $id, $note)
{
    return anbar_tx(function () use ($user, $id, $note) {
        $e = anbar_exit_load($id, true);
        $mine = (int) $e['requester_id'] === $user['id'];
        if (!$mine && !anbar_can($user, 'request_out', $e['from_wh']) && !anbar_can($user, 'approve', $e['from_wh'])) {
            throw anbar_forbidden();
        }
        if (in_array($e['status'], ['delivered', 'cancelled', 'rejected'], true)) {
            throw anbar_bad('این درخواست بسته شده است.');
        }
        anbar_run("UPDATE {exits} SET status = 'cancelled', decision_note = COALESCE(?, decision_note), updated_at = UTC_TIMESTAMP() WHERE id = ?", $note, (int) $id);
        anbar_audit($user['id'], 'exit_cancel', 'exit', $id, ['note' => $note]);
        if ($e['ticket_id']) {
            anbar_ticket_event($e['ticket_id'], $user['id'], 'status', 'درخواست خروج ' . anbar_exit_code($id) . ' لغو شد.' . ($note ? " ({$note})" : ''));
        }
        return true;
    });
}

/* ================================================================ loans & transfers */

/** Full or partial return; `broken` of the returned units come back damaged. */
function anbar_loan_return($loan_id, $in, $user)
{
    return anbar_tx(function () use ($loan_id, $in, $user) {
        anbar_check_op_key($in['op_key'] ?? null);
        $loan = anbar_get('SELECT * FROM {loans} WHERE id = ? FOR UPDATE', (int) $loan_id);
        if (!$loan) {
            throw anbar_not_found('امانت پیدا نشد.');
        }
        if (!anbar_can($user, 'stock_in', $loan['warehouse_id']) && !anbar_can($user, 'deliver', $loan['warehouse_id'])) {
            throw anbar_forbidden('شما اجازه ثبت بازگشت در این انبار را ندارید.');
        }
        if ($loan['status'] !== 'open') {
            throw anbar_bad('این امانت قبلاً بسته شده است.');
        }
        $qty = $in['qty'];
        $broken = min($qty, $in['broken'] ?? 0);
        $remaining = anbar_r3($loan['qty'] - $loan['returned_qty']);
        if ($qty > $remaining) {
            throw anbar_bad('حداکثر مقدار قابل بازگشت ' . anbar_fmt($remaining) . ' است.');
        }
        $item = anbar_load_item($loan['item_id'], true);
        anbar_set_qty($item, $item['qty'] + $qty);
        if ($broken > 0) {
            anbar_set_broken($item, $item['broken_qty'] + $broken);
        }
        anbar_run('UPDATE {items} SET loaned_qty = GREATEST(0, ROUND(loaned_qty - ?, 3)) WHERE id = ?', $qty, $item['id']);
        $returned = anbar_r3($loan['returned_qty'] + $qty);
        $closed = $returned >= (float) $loan['qty'];
        anbar_run('UPDATE {loans} SET returned_qty = ?, returned_broken = ROUND(returned_broken + ?, 3), status = ?, closed_at = '
            . ($closed ? 'UTC_TIMESTAMP()' : 'NULL') . ' WHERE id = ?', $returned, $broken, $closed ? 'closed' : 'open', (int) $loan['id']);
        $note = trim(($broken > 0 ? anbar_fmt($broken) . ' مورد خراب برگشت. ' : 'سالم برگشت. ') . ($in['note'] ?? ''));
        $id = anbar_write_tx($item, ['reason' => 'loan_return', 'qty' => $qty, 'delta' => $qty, 'party' => $loan['borrower'], 'note' => $note,
            'op_date' => $in['op_date'] ?? null, 'loan_id' => (int) $loan['id'], 'exit_id' => $loan['exit_id'], 'op_key' => $in['op_key'] ?? null], $user);
        if ($broken > 0) {
            anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $user['id']), [
                'kind' => 'damage', 'title' => "«{$item['name']}» خراب از امانت برگشت",
                'body' => anbar_fmt($broken) . " {$item['unit']} — امانت‌گیرنده: {$loan['borrower']}", 'link' => '#/items/' . $item['id'],
                'warehouse_id' => $item['warehouse_id'],
            ]);
        }
        return $id;
    });
}

/** Destination confirms receipt; stock lands in a matching item (same code) or a new copy. */
function anbar_transfer_receive($transfer_id, $in, $user)
{
    return anbar_tx(function () use ($transfer_id, $in, $user) {
        $t = anbar_get('SELECT * FROM {transfers} WHERE id = ? FOR UPDATE', (int) $transfer_id);
        if (!$t) {
            throw anbar_not_found('انتقال پیدا نشد.');
        }
        anbar_require($user, 'stock_in', $t['to_wh'], 'شما اجازه ثبت دریافت در انبار مقصد را ندارید.');
        if ($t['status'] !== 'pending') {
            throw anbar_bad('این انتقال قبلاً بررسی شده است.');
        }
        $src = anbar_load_item($t['item_id']);
        $dest_row = anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ?', (int) $t['to_wh'], $src['code']);
        if (!$dest_row) {
            $r = anbar_run('INSERT INTO {items} (warehouse_id, name, code, item_type, category, unit, min_qty, `condition`, condition_notes, brand, model, serial,
                              purchase_price, current_value, currency, purchase_date, valuation_date, source, vendor, details, card_status, image, notes,
                              batch_tracked, created_by, created_at, updated_at)
                            VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
                (int) $t['to_wh'], $src['name'], $src['code'], $src['item_type'], $src['category'], $src['unit'], $src['condition'], $src['condition_notes'],
                $src['brand'], $src['model'], $src['serial'], $src['purchase_price'], $src['current_value'], $src['currency'], $src['purchase_date'],
                $src['valuation_date'], 'transfer', $src['vendor'], $src['details'], $src['card_status'], $src['image'], $src['notes'], $src['batch_tracked'], $user['id']);
            foreach (anbar_all('SELECT file, caption, sort FROM {item_photos} WHERE item_id = ?', $src['id']) as $ph) {
                anbar_run('INSERT INTO {item_photos} (item_id, file, caption, sort, user_id, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
                    $r['id'], $ph['file'], $ph['caption'], (int) $ph['sort'], $user['id']);
            }
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
            'note' => $in['note'], 'transfer_id' => (int) $t['id'], 'exit_id' => $t['exit_id'], 'batch_alloc' => $alloc], $user);
        anbar_run("UPDATE {transfers} SET status = 'received', handled_by = ?, handled_at = UTC_TIMESTAMP(), handle_note = ?, dest_item_id = ? WHERE id = ?",
            $user['id'], $in['note'], $dest['id'], (int) $t['id']);
        anbar_notify(anbar_warehouse_audience($t['from_wh'], $user['id']), [
            'kind' => 'transfer_done', 'title' => "دریافت «{$src['name']}» در انبار مقصد تأیید شد",
            'body' => anbar_fmt($t['qty']) . " {$src['unit']}", 'link' => '#/transfers', 'warehouse_id' => (int) $t['from_wh'],
        ]);
        return $tx;
    });
}

/** Destination rejects: the quantity goes back to the origin item. */
function anbar_transfer_reject($transfer_id, $in, $user)
{
    return anbar_tx(function () use ($transfer_id, $in, $user) {
        $t = anbar_get('SELECT * FROM {transfers} WHERE id = ? FOR UPDATE', (int) $transfer_id);
        if (!$t) {
            throw anbar_not_found('انتقال پیدا نشد.');
        }
        anbar_require($user, 'stock_in', $t['to_wh'], 'شما اجازه بررسی دریافت در انبار مقصد را ندارید.');
        if ($t['status'] !== 'pending') {
            throw anbar_bad('این انتقال قبلاً بررسی شده است.');
        }
        if (empty($in['note'])) {
            throw anbar_bad('علت رد انتقال را بنویسید.');
        }
        $item = anbar_load_item($t['item_id'], true);
        $alloc = $t['batch_alloc'] ? json_decode($t['batch_alloc'], true) : null;
        if ($alloc) {
            anbar_apply_batch_alloc($alloc, +1);
        }
        anbar_set_qty($item, $item['qty'] + (float) $t['qty']);
        $tx = anbar_write_tx($item, ['reason' => 'transfer_back', 'qty' => (float) $t['qty'], 'delta' => (float) $t['qty'],
            'note' => $in['note'], 'transfer_id' => (int) $t['id'], 'exit_id' => $t['exit_id'], 'batch_alloc' => $alloc], $user);
        anbar_run("UPDATE {transfers} SET status = 'rejected', handled_by = ?, handled_at = UTC_TIMESTAMP(), handle_note = ? WHERE id = ?",
            $user['id'], $in['note'], (int) $t['id']);
        anbar_notify(anbar_warehouse_audience($t['from_wh'], $user['id']), [
            'kind' => 'transfer_done', 'title' => "انتقال «{$item['name']}» رد شد", 'body' => "علت: {$in['note']}. موجودی به انبار مبدأ برگشت.",
            'link' => '#/transfers', 'warehouse_id' => (int) $t['from_wh'],
        ]);
        return $tx;
    });
}
