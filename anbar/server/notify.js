'use strict';
const { all, get, run } = require('./db');
const { today, addDays, jalali, r3 } = require('./util');

/**
 * Optional external delivery. Configure with environment variables:
 *   BALE_BOT_TOKEN      – bot token for Bale messenger (Telegram-compatible API); user.chat_id is the target
 *   TELEGRAM_BOT_TOKEN  – same, for Telegram
 *   KAVENEGAR_API_KEY   – SMS through Kavenegar; user.phone is the target (KAVENEGAR_SENDER optional)
 * Failures are logged and never block the in-app notification.
 */
async function sendExternal(user, text) {
  const jobs = [];
  if (user.chat_id && process.env.BALE_BOT_TOKEN) {
    jobs.push(postJson(`https://tapi.bale.ai/bot${process.env.BALE_BOT_TOKEN}/sendMessage`, { chat_id: user.chat_id, text }));
  }
  if (user.chat_id && process.env.TELEGRAM_BOT_TOKEN) {
    jobs.push(postJson(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: user.chat_id, text }));
  }
  if (user.phone && process.env.KAVENEGAR_API_KEY) {
    const params = new URLSearchParams({ receptor: user.phone, message: text });
    if (process.env.KAVENEGAR_SENDER) params.set('sender', process.env.KAVENEGAR_SENDER);
    jobs.push(fetch(`https://api.kavenegar.com/v1/${process.env.KAVENEGAR_API_KEY}/sms/send.json`, { method: 'POST', body: params }));
  }
  const results = await Promise.allSettled(jobs);
  for (const r of results) if (r.status === 'rejected') console.error('external notify failed:', r.reason?.message);
}
const postJson = (url, body) =>
  fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

/** Kinds that are also pushed to SMS/messenger when configured. */
const EXTERNAL_KINDS = new Set(['out_of_stock', 'low_stock', 'request_new', 'request_result', 'transfer_in',
  'loan_overdue', 'damage', 'expiry', 'announcement']);

/** Insert one notification per user. `dedupe` stops repeated reminders for the same event. */
function notify(userIds, { kind, title, body = null, link = null, warehouse_id = null, dedupe = null }) {
  const ids = [...new Set(userIds)].filter(Boolean);
  for (const uid of ids) {
    const r = run(`INSERT OR IGNORE INTO notifications (user_id, kind, title, body, link, warehouse_id, dedupe)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`, uid, kind, title, body, link, warehouse_id, dedupe);
    if (r.changes && EXTERNAL_KINDS.has(kind)) {
      const u = get('SELECT phone, chat_id FROM users WHERE id = ?', uid);
      if (u && (u.phone || u.chat_id)) sendExternal(u, `${title}${body ? '\n' + body : ''}`).catch(() => {});
    }
  }
}

/** Managers of the warehouse plus every active general admin. */
function warehouseAudience(warehouseId) {
  return all(`SELECT id FROM users WHERE active = 1 AND (role = 'admin' OR id IN
                (SELECT user_id FROM warehouse_managers WHERE warehouse_id = ?))`, warehouseId).map((r) => r.id);
}
const allActiveUsers = () => all('SELECT id FROM users WHERE active = 1').map((r) => r.id);

/** Called after any stock decrease; fires on crossing the minimum or reaching zero. */
function checkStockLevel(item, before) {
  const wh = get('SELECT name FROM warehouses WHERE id = ?', item.warehouse_id);
  const link = `#/items/${item.id}`;
  if (item.qty <= 0 && before > 0) {
    notify(warehouseAudience(item.warehouse_id), {
      kind: 'out_of_stock', title: `«${item.name}» تمام شد`, body: `${wh.name} — موجودی به صفر رسید.`,
      link, warehouse_id: item.warehouse_id,
    });
  } else if (item.min_qty > 0 && item.qty <= item.min_qty && before > item.min_qty) {
    notify(warehouseAudience(item.warehouse_id), {
      kind: 'low_stock', title: `کمبود «${item.name}»`,
      body: `${wh.name} — موجودی ${item.qty} ${item.unit}، حداقل لازم ${item.min_qty} ${item.unit}.`,
      link, warehouse_id: item.warehouse_id,
    });
  }
}

/** Periodic reminders: loan due dates and batch expiry. Safe to run repeatedly thanks to dedupe keys. */
function runScheduledChecks() {
  const t = today();
  const soon = addDays(t, 2);
  for (const l of all(`SELECT l.*, i.name AS item_name, i.unit FROM loans l JOIN items i ON i.id = l.item_id
                       WHERE l.status = 'open' AND l.due_date IS NOT NULL AND l.due_date <= ?`, soon)) {
    const overdue = l.due_date < t;
    notify(warehouseAudience(l.warehouse_id), {
      kind: overdue ? 'loan_overdue' : 'loan_due',
      title: overdue ? `تأخیر در بازگشت «${l.item_name}»` : `موعد بازگشت «${l.item_name}» نزدیک است`,
      body: `امانت‌گیرنده: ${l.borrower} — موعد: ${jalali(l.due_date)} — باقی‌مانده: ${r3(l.qty - l.returned_qty)} ${l.unit}`,
      link: '#/loans', warehouse_id: l.warehouse_id, dedupe: `loan-${overdue ? 'late' : 'due'}-${l.id}`,
    });
  }
  const horizon = addDays(t, 30);
  for (const b of all(`SELECT b.*, i.name AS item_name, i.unit, i.warehouse_id, i.id AS item_id FROM batches b
                       JOIN items i ON i.id = b.item_id
                       WHERE b.qty > 0 AND i.archived = 0 AND b.expiry IS NOT NULL AND b.expiry <= ?`, horizon)) {
    const stage = b.expiry < t ? 'expired' : b.expiry <= addDays(t, 7) ? 'week' : 'month';
    const title = stage === 'expired' ? `«${b.item_name}» منقضی شده است` : `انقضای نزدیک «${b.item_name}»`;
    notify(warehouseAudience(b.warehouse_id), {
      kind: 'expiry', title,
      body: `سری ${b.batch_no} — ${b.qty} ${b.unit} — تاریخ انقضا ${jalali(b.expiry)}`,
      link: `#/items/${b.item_id}`, warehouse_id: b.warehouse_id, dedupe: `exp-${stage}-${b.id}`,
    });
  }
}

module.exports = { notify, warehouseAudience, allActiveUsers, checkStockLevel, runScheduledChecks };
