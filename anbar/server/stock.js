'use strict';
/**
 * Every stock change goes through this module. Each change writes exactly one row in `transactions`
 * (never deleted) and updates the cached quantities on `items` / `batches` in the same DB transaction.
 */
const { all, get, run, tx } = require('./db');
const { bad, notFound, r3, today } = require('./util');
const { notify, warehouseAudience, checkStockLevel } = require('./notify');

const REASONS = {
  purchase: { dir: 'in', label: 'خرید' },
  receive: { dir: 'in', label: 'دریافت' },
  return: { dir: 'in', label: 'بازگشت امانت' },
  transfer_in: { dir: 'in', label: 'دریافت انتقال' },
  consume: { dir: 'out', label: 'مصرف' },
  loan: { dir: 'out', label: 'امانت' },
  damage: { dir: 'out', label: 'خرابی' },
  transfer_out: { dir: 'out', label: 'ارسال انتقال' },
  transfer_back: { dir: 'in', label: 'برگشت انتقال' },
  adjust: { dir: 'adj', label: 'اصلاح موجودی' },
};

function loadItem(id) {
  const item = get('SELECT * FROM items WHERE id = ?', id);
  if (!item) throw notFound('کالا پیدا نشد.');
  return item;
}

function writeTx(item, { reason, qty, delta, op_date, party, note, batch_alloc, loan_id, transfer_id, request_id, corrects_id }, user) {
  const r = run(`INSERT INTO transactions (item_id, warehouse_id, direction, reason, qty, delta, qty_after, op_date, party, note,
                   batch_alloc, loan_id, transfer_id, request_id, corrects_id, user_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  item.id, item.warehouse_id, REASONS[reason].dir, reason, qty, delta, item.qty, op_date || today(), party, note,
  batch_alloc ? JSON.stringify(batch_alloc) : null, loan_id, transfer_id, request_id, corrects_id, user.id);
  return Number(r.lastInsertRowid);
}

function setQty(item, newQty) {
  item.qty = r3(newQty);
  run(`UPDATE items SET qty = ?, updated_at = datetime('now') WHERE id = ?`, item.qty, item.id);
}

/** First-expiry-first-out allocation across batches. `batchId` forces a single batch. */
function allocateBatches(item, amount, batchId) {
  const batches = batchId
    ? all('SELECT * FROM batches WHERE id = ? AND item_id = ? AND qty > 0', batchId, item.id)
    : all(`SELECT * FROM batches WHERE item_id = ? AND qty > 0
           ORDER BY expiry IS NULL, expiry, created_at`, item.id);
  const alloc = [];
  let left = amount;
  for (const b of batches) {
    if (left <= 0) break;
    const take = r3(Math.min(b.qty, left));
    alloc.push({ batch_id: b.id, batch_no: b.batch_no, expiry: b.expiry, qty: take });
    left = r3(left - take);
  }
  if (left > 0) throw bad(batchId ? 'موجودی این سری کافی نیست.' : 'موجودی سری‌ها کافی نیست.');
  return alloc;
}
function applyBatchAlloc(alloc, sign) {
  for (const a of alloc) run('UPDATE batches SET qty = round(qty + ?, 3) WHERE id = ?', sign * a.qty, a.batch_id);
}
function addToBatch(item, batchNo, expiry, amount) {
  const existing = get('SELECT * FROM batches WHERE item_id = ? AND batch_no = ?', item.id, batchNo);
  if (existing) {
    if (expiry && existing.expiry && existing.expiry !== expiry) {
      throw bad(`سری «${batchNo}» قبلاً با تاریخ انقضای دیگری ثبت شده است.`);
    }
    run('UPDATE batches SET qty = round(qty + ?, 3), expiry = COALESCE(expiry, ?) WHERE id = ?', amount, expiry, existing.id);
    return { batch_id: existing.id, batch_no: batchNo, expiry: existing.expiry || expiry, qty: amount };
  }
  const r = run('INSERT INTO batches (item_id, batch_no, expiry, qty) VALUES (?, ?, ?, ?)', item.id, batchNo, expiry, amount);
  return { batch_id: Number(r.lastInsertRowid), batch_no: batchNo, expiry, qty: amount };
}

/** Stock entry (purchase / receive). */
function stockIn(itemId, input, user) {
  return tx(() => {
    const item = loadItem(itemId);
    if (item.archived) throw bad('این کالا بایگانی شده است.');
    if (!['purchase', 'receive'].includes(input.reason)) throw bad('علت ورود نامعتبر است.');
    let alloc = null;
    if (item.batch_tracked) {
      if (!input.batch_no) throw bad('برای این کالا شماره سری را وارد کنید.');
      if (!input.expiry) throw bad('برای این کالا تاریخ انقضا را وارد کنید.');
      alloc = [addToBatch(item, input.batch_no, input.expiry, input.qty)];
    }
    setQty(item, item.qty + input.qty);
    return writeTx(item, { ...input, delta: input.qty, batch_alloc: alloc }, user);
  });
}

/** Stock exit (consume / damage). Loans and transfers have their own functions. */
function stockOut(itemId, input, user) {
  return tx(() => {
    const item = loadItem(itemId);
    if (!['consume', 'damage'].includes(input.reason)) throw bad('علت خروج نامعتبر است.');
    const id = removeStock(item, input, user);
    if (input.request_id) markRequestDelivered(input.request_id, item, user);
    if (input.reason === 'damage') {
      notify(warehouseAudience(item.warehouse_id).filter((u) => u !== user.id), {
        kind: 'damage', title: `ثبت خرابی «${item.name}»`,
        body: `${input.qty} ${item.unit} به‌علت خرابی از موجودی کسر شد.${input.note ? ' ' + input.note : ''}`,
        link: `#/items/${item.id}`, warehouse_id: item.warehouse_id,
      });
    }
    return id;
  });
}

function removeStock(item, input, user) {
  if (input.qty > item.qty) {
    throw bad(`مقدار خروجی (${input.qty} ${item.unit}) بیشتر از موجودی قابل‌استفاده (${item.qty} ${item.unit}) است.`);
  }
  let alloc = null;
  if (item.batch_tracked) {
    alloc = allocateBatches(item, input.qty, input.batch_id);
    applyBatchAlloc(alloc, -1);
  }
  const before = item.qty;
  setQty(item, item.qty - input.qty);
  const id = writeTx(item, { ...input, delta: -input.qty, batch_alloc: alloc }, user);
  checkStockLevel(item, before);
  return id;
}

/** Counted-stock correction: sets the quantity to `new_qty` and records the difference with a mandatory reason. */
function adjust(itemId, { new_qty, batch_id, note, corrects_id, op_date }, user) {
  if (!note) throw bad('برای اصلاح موجودی، علت را بنویسید.');
  return tx(() => {
    const item = loadItem(itemId);
    let delta;
    let alloc = null;
    if (item.batch_tracked) {
      const b = get('SELECT * FROM batches WHERE id = ? AND item_id = ?', batch_id, item.id);
      if (!b) throw bad('سری موردنظر را انتخاب کنید.');
      delta = r3(new_qty - b.qty);
      run('UPDATE batches SET qty = ? WHERE id = ?', new_qty, b.id);
      alloc = [{ batch_id: b.id, batch_no: b.batch_no, expiry: b.expiry, qty: Math.abs(delta) }];
    } else {
      delta = r3(new_qty - item.qty);
    }
    if (delta === 0) throw bad('مقدار جدید با موجودی فعلی یکسان است.');
    const before = item.qty;
    setQty(item, item.qty + delta);
    const id = writeTx(item, { reason: 'adjust', qty: Math.abs(delta), delta, note, corrects_id, op_date, batch_alloc: alloc }, user);
    if (delta < 0) checkStockLevel(item, before);
    return id;
  });
}

function loanOut(itemId, input, user) {
  return tx(() => {
    const item = loadItem(itemId);
    if (item.batch_tracked) throw bad('اقلام تاریخ‌دار را نمی‌توان امانت داد؛ از «خروج» استفاده کنید.');
    const r = run(`INSERT INTO loans (item_id, warehouse_id, borrower, program, qty, due_date, note, user_id)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    item.id, item.warehouse_id, input.borrower, input.program, input.qty, input.due_date, input.note, user.id);
    const loanId = Number(r.lastInsertRowid);
    const txId = removeStock(item, { ...input, reason: 'loan', party: input.borrower, loan_id: loanId }, user);
    run('UPDATE items SET loaned_qty = round(loaned_qty + ?, 3) WHERE id = ?', input.qty, item.id);
    if (input.request_id) markRequestDelivered(input.request_id, item, user);
    return { loan_id: loanId, tx_id: txId };
  });
}

function loanReturn(loanId, { qty, note, op_date }, user, assertEdit) {
  return tx(() => {
    const loan = get('SELECT * FROM loans WHERE id = ?', loanId);
    if (!loan) throw notFound('امانت پیدا نشد.');
    assertEdit(loan.warehouse_id);
    if (loan.status !== 'open') throw bad('این امانت قبلاً بسته شده است.');
    const remaining = r3(loan.qty - loan.returned_qty);
    if (qty > remaining) throw bad(`حداکثر مقدار قابل بازگشت ${remaining} است.`);
    const item = loadItem(loan.item_id);
    setQty(item, item.qty + qty);
    run('UPDATE items SET loaned_qty = max(0, round(loaned_qty - ?, 3)) WHERE id = ?', qty, item.id);
    const returned = r3(loan.returned_qty + qty);
    run(`UPDATE loans SET returned_qty = ?, status = ?, closed_at = CASE WHEN ? THEN datetime('now') END WHERE id = ?`,
      returned, returned >= loan.qty ? 'closed' : 'open', returned >= loan.qty ? 1 : 0, loan.id);
    return writeTx(item, { reason: 'return', qty, delta: qty, party: loan.borrower, note, op_date, loan_id: loan.id }, user);
  });
}

function transferSend(itemId, { to_wh, qty, note, op_date }, user) {
  return tx(() => {
    const item = loadItem(itemId);
    const dest = get('SELECT * FROM warehouses WHERE id = ? AND archived = 0', to_wh);
    if (!dest) throw bad('انبار مقصد را انتخاب کنید.');
    if (dest.id === item.warehouse_id) throw bad('انبار مقصد با انبار مبدأ یکسان است.');
    const r = run('INSERT INTO transfers (item_id, from_wh, to_wh, qty, note, sent_by) VALUES (?, ?, ?, ?, ?, ?)',
      item.id, item.warehouse_id, dest.id, qty, note, user.id);
    const transferId = Number(r.lastInsertRowid);
    const txId = removeStock(item, { reason: 'transfer_out', qty, note, op_date, party: dest.name, transfer_id: transferId }, user);
    const alloc = get('SELECT batch_alloc FROM transactions WHERE id = ?', txId).batch_alloc;
    run('UPDATE transfers SET batch_alloc = ? WHERE id = ?', alloc, transferId);
    const from = get('SELECT name FROM warehouses WHERE id = ?', item.warehouse_id);
    notify(warehouseAudience(dest.id).filter((u) => u !== user.id), {
      kind: 'transfer_in', title: `انتقال «${item.name}» به ${dest.name}`,
      body: `${qty} ${item.unit} از ${from.name} ارسال شد و منتظر تأیید دریافت است.`,
      link: '#/transfers', warehouse_id: dest.id,
    });
    return { transfer_id: transferId, tx_id: txId };
  });
}

/** Destination manager confirms receipt; the stock lands in a matching item (same code) or a new copy. */
function transferReceive(transferId, { note }, user, assertEdit) {
  return tx(() => {
    const t = get('SELECT * FROM transfers WHERE id = ?', transferId);
    if (!t) throw notFound('انتقال پیدا نشد.');
    assertEdit(t.to_wh);
    if (t.status !== 'pending') throw bad('این انتقال قبلاً بررسی شده است.');
    const src = loadItem(t.item_id);
    let dest = get('SELECT * FROM items WHERE warehouse_id = ? AND code = ?', t.to_wh, src.code);
    if (!dest) {
      const r = run(`INSERT INTO items (warehouse_id, name, code, category, unit, min_qty, condition, brand, model, serial, image,
                       notes, batch_tracked, created_by) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
      t.to_wh, src.name, src.code, src.category, src.unit, src.condition, src.brand, src.model, src.serial, src.image,
      src.notes, src.batch_tracked, user.id);
      dest = loadItem(Number(r.lastInsertRowid));
    } else if (dest.unit !== src.unit) {
      throw bad(`کالای «${dest.name}» در انبار مقصد با واحد «${dest.unit}» ثبت شده و با واحد ارسالی (${src.unit}) فرق دارد.`);
    }
    if (dest.archived) run('UPDATE items SET archived = 0 WHERE id = ?', dest.id);
    let alloc = null;
    const srcAlloc = t.batch_alloc ? JSON.parse(t.batch_alloc) : null;
    if (srcAlloc && dest.batch_tracked) {
      alloc = srcAlloc.map((a) => addToBatch(dest, a.batch_no, a.expiry, a.qty));
    }
    setQty(dest, dest.qty + t.qty);
    const from = get('SELECT name FROM warehouses WHERE id = ?', t.from_wh);
    const txId = writeTx(dest, { reason: 'transfer_in', qty: t.qty, delta: t.qty, party: from.name, note, transfer_id: t.id, batch_alloc: alloc }, user);
    run(`UPDATE transfers SET status = 'received', handled_by = ?, handled_at = datetime('now'), handle_note = ?, dest_item_id = ?
         WHERE id = ?`, user.id, note, dest.id, t.id);
    notify(warehouseAudience(t.from_wh).filter((u) => u !== user.id), {
      kind: 'transfer_done', title: `دریافت «${src.name}» تأیید شد`, body: `${t.qty} ${src.unit} در انبار مقصد ثبت شد.`,
      link: '#/transfers', warehouse_id: t.from_wh,
    });
    return txId;
  });
}

/** Reject (by destination) or cancel (by origin): the quantity goes back to the origin item. */
function transferBack(transferId, { note }, user, assertEdit, mode) {
  return tx(() => {
    const t = get('SELECT * FROM transfers WHERE id = ?', transferId);
    if (!t) throw notFound('انتقال پیدا نشد.');
    assertEdit(mode === 'reject' ? t.to_wh : t.from_wh);
    if (t.status !== 'pending') throw bad('این انتقال قبلاً بررسی شده است.');
    if (mode === 'reject' && !note) throw bad('علت رد انتقال را بنویسید.');
    const item = loadItem(t.item_id);
    const alloc = t.batch_alloc ? JSON.parse(t.batch_alloc) : null;
    if (alloc) applyBatchAlloc(alloc, +1);
    setQty(item, item.qty + t.qty);
    const txId = writeTx(item, { reason: 'transfer_back', qty: t.qty, delta: t.qty, note: note || 'لغو انتقال', transfer_id: t.id, batch_alloc: alloc }, user);
    run(`UPDATE transfers SET status = ?, handled_by = ?, handled_at = datetime('now'), handle_note = ? WHERE id = ?`,
      mode === 'reject' ? 'rejected' : 'cancelled', user.id, note, t.id);
    if (mode === 'reject') {
      notify(warehouseAudience(t.from_wh).filter((u) => u !== user.id), {
        kind: 'transfer_done', title: `انتقال «${item.name}» رد شد`, body: `علت: ${note}. موجودی به انبار مبدأ برگشت.`,
        link: '#/transfers', warehouse_id: t.from_wh,
      });
    }
    return txId;
  });
}

function markRequestDelivered(requestId, item, user) {
  const r = get('SELECT * FROM requests WHERE id = ?', requestId);
  if (!r || r.warehouse_id !== item.warehouse_id || !['approved', 'pending'].includes(r.status)) return;
  run(`UPDATE requests SET status = 'delivered', reviewer_id = COALESCE(reviewer_id, ?), reviewed_at = COALESCE(reviewed_at, datetime('now'))
       WHERE id = ?`, user.id, r.id);
  notify([r.requester_id].filter((u) => u !== user.id), {
    kind: 'request_result', title: `درخواست «${r.item_name}» تحویل شد`, link: '#/requests', warehouse_id: r.warehouse_id,
  });
}

module.exports = { REASONS, stockIn, stockOut, adjust, loanOut, loanReturn, transferSend, transferReceive, transferBack, loadItem };
