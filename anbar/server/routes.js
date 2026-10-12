'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, all, get, run, tx, UPLOAD_DIR, BACKUP_DIR } = require('./db');
const U = require('./util');
const A = require('./auth');
const S = require('./stock');
const { notify, warehouseAudience, allActiveUsers } = require('./notify');
const { buildXlsx } = require('./xlsx');
const { bad, notFound, forbidden, str, required, qty, date, r3, today, addDays, jalali } = U;

const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
  routes.push({ method, re, keys, handler, ...opts });
};

function audit(user, action, entity, entityId, details) {
  run('INSERT INTO audit (user_id, action, entity, entity_id, details) VALUES (?, ?, ?, ?, ?)',
    user?.id, action, entity, entityId, details ? JSON.stringify(details) : null);
}

const UNITS = ['عدد', 'متر', 'کیلوگرم', 'گرم', 'لیتر', 'بسته', 'جلد', 'جعبه', 'دست', 'کارتن', 'حلقه', 'ورق', 'شیشه', 'ورق قرص'];
const CONDITIONS = { ok: 'سالم', broken: 'خراب', repair: 'نیازمند تعمیر' };

/* ---------------------------------------------------------------- auth */

route('POST', '/api/login', ({ body, req, setCookie }) => {
  const username = String(body.username || '').trim();
  const key = `${req.socket.remoteAddress}|${username.toLowerCase()}`;
  if (!A.loginAllowed(key)) throw new U.HttpError(429, 'تعداد تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه دیگر دوباره امتحان کنید.');
  const u = get('SELECT * FROM users WHERE username = ?', username);
  if (!u || !A.verifyPassword(body.password || '', u.password_hash)) {
    A.loginFailed(key);
    throw new U.HttpError(401, 'نام کاربری یا رمز عبور درست نیست.');
  }
  if (!u.active) throw new U.HttpError(403, 'حساب شما غیرفعال شده است. با مدیر کل تماس بگیرید.');
  A.loginSucceeded(key);
  setCookie(A.createSession(u.id));
  audit(u, 'login', 'user', u.id);
  return { ok: true };
}, { public: true });

route('POST', '/api/logout', ({ token, setCookie }) => {
  A.destroySession(token);
  setCookie('', 0);
  return { ok: true };
});

route('GET', '/api/me', ({ user }) => ({
  user: A.publicUser(user),
  unread: get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', user.id).n,
}));

route('POST', '/api/me/password', ({ user, body }) => {
  if (!A.verifyPassword(body.current || '', user.password_hash)) throw bad('رمز فعلی درست نیست.');
  A.checkNewPassword(body.password);
  run('UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?', A.hashPassword(body.password), user.id);
  run('DELETE FROM sessions WHERE user_id = ? AND token <> ?', user.id, user.token);
  audit(user, 'change_password', 'user', user.id);
  return { ok: true };
});

route('PUT', '/api/me', ({ user, body }) => {
  run('UPDATE users SET phone = ?, chat_id = ? WHERE id = ?', str(body.phone, 20), str(body.chat_id, 40), user.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- lookups */

function warehouseList(includeArchived) {
  const whs = all(`SELECT w.*,
      (SELECT COUNT(*) FROM items i WHERE i.warehouse_id = w.id AND i.archived = 0) AS item_count,
      (SELECT COUNT(*) FROM items i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.qty <= 0) AS out_count,
      (SELECT COUNT(*) FROM items i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.min_qty > 0 AND i.qty > 0 AND i.qty <= i.min_qty) AS low_count,
      (SELECT COUNT(*) FROM loans l WHERE l.warehouse_id = w.id AND l.status = 'open') AS loan_count,
      (SELECT COUNT(*) FROM transfers t WHERE t.to_wh = w.id AND t.status = 'pending') AS incoming_count
    FROM warehouses w ${includeArchived ? '' : 'WHERE w.archived = 0'} ORDER BY w.sort, w.id`);
  const mgr = all(`SELECT m.warehouse_id, u.id, u.full_name FROM warehouse_managers m JOIN users u ON u.id = m.user_id
                   WHERE u.active = 1`);
  for (const w of whs) w.managers = mgr.filter((m) => m.warehouse_id === w.id).map(({ id, full_name }) => ({ id, full_name }));
  return whs;
}

route('GET', '/api/bootstrap', ({ user }) => ({
  user: A.publicUser(user),
  warehouses: warehouseList(A.isAdmin(user)),
  units: [...new Set([...UNITS, ...all('SELECT DISTINCT unit FROM items').map((r) => r.unit)])],
  categories: all("SELECT DISTINCT category FROM items WHERE category IS NOT NULL AND category <> '' ORDER BY category").map((r) => r.category),
  locations: all("SELECT DISTINCT location FROM items WHERE location IS NOT NULL AND location <> '' ORDER BY location").map((r) => r.location),
  people: all('SELECT id, full_name FROM users WHERE active = 1 ORDER BY full_name'),
  reasons: Object.fromEntries(Object.entries(S.REASONS).map(([k, v]) => [k, v.label])),
  conditions: CONDITIONS,
  unread: get('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0', user.id).n,
}));

/* ---------------------------------------------------------------- dashboard */

route('GET', '/api/dashboard', ({ user }) => {
  const t = today();
  const mine = A.isAdmin(user) ? null : user.managed;
  const scope = (col) => (mine ? (mine.length ? `AND ${col} IN (${mine.join(',')})` : 'AND 0') : '');
  return {
    warehouses: warehouseList(false),
    shortages: all(`SELECT i.id, i.name, i.qty, i.min_qty, i.unit, w.name AS warehouse FROM items i
                    JOIN warehouses w ON w.id = i.warehouse_id
                    WHERE i.archived = 0 AND w.archived = 0 AND (i.qty <= 0 OR (i.min_qty > 0 AND i.qty <= i.min_qty))
                    ORDER BY (i.qty <= 0) DESC, i.qty / NULLIF(i.min_qty, 0) LIMIT 30`),
    requests: all(`SELECT r.*, w.name AS warehouse, u.full_name AS requester FROM requests r
                   JOIN warehouses w ON w.id = r.warehouse_id JOIN users u ON u.id = r.requester_id
                   WHERE r.status IN ('pending', 'approved') AND (r.requester_id = ? ${mine ? scope('r.warehouse_id').replace('AND', 'OR') : 'OR 1'})
                   ORDER BY r.status = 'pending' DESC, r.created_at DESC LIMIT 20`, user.id),
    loans: all(`SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse FROM loans l
                JOIN items i ON i.id = l.item_id JOIN warehouses w ON w.id = l.warehouse_id
                WHERE l.status = 'open' ORDER BY l.due_date IS NULL, l.due_date LIMIT 20`),
    expiring: all(`SELECT b.*, i.id AS item_id, i.name AS item_name, i.unit, w.name AS warehouse FROM batches b
                   JOIN items i ON i.id = b.item_id JOIN warehouses w ON w.id = i.warehouse_id
                   WHERE b.qty > 0 AND i.archived = 0 AND b.expiry IS NOT NULL AND b.expiry <= ?
                   ORDER BY b.expiry LIMIT 20`, addDays(t, 60)),
    transfers: all(`SELECT tr.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name FROM transfers tr
                    JOIN items i ON i.id = tr.item_id JOIN warehouses fw ON fw.id = tr.from_wh JOIN warehouses tw ON tw.id = tr.to_wh
                    WHERE tr.status = 'pending' ORDER BY tr.sent_at`),
    announcements: all(`SELECT a.*, u.full_name AS author FROM announcements a JOIN users u ON u.id = a.user_id
                        WHERE a.archived = 0 ORDER BY a.pinned DESC, a.created_at DESC LIMIT 3`),
    recent: txQuery({ limit: 8 }),
    today: t,
  };
});

/* ---------------------------------------------------------------- items */

function decorateItem(i, user) {
  i.can_edit = A.canEdit(user, i.warehouse_id);
  i.image_url = i.image ? `/uploads/${i.image}` : null;
  return i;
}

route('GET', '/api/items', ({ user, query }) => {
  const where = ['1 = 1'];
  const p = [];
  if (query.q) {
    const like = `%${U.toLatin(query.q).trim()}%`;
    where.push(`(i.name LIKE ? OR i.code LIKE ? OR i.category LIKE ? OR i.brand LIKE ? OR i.model LIKE ? OR i.serial LIKE ? OR i.location LIKE ?
                 OR i.name LIKE ?)`);
    p.push(like, like, like, like, like, like, like, `%${String(query.q).trim()}%`);
  }
  if (query.warehouse) { where.push('i.warehouse_id = ?'); p.push(Number(query.warehouse)); }
  if (query.condition) { where.push('i.condition = ?'); p.push(query.condition); }
  if (query.category) { where.push('i.category = ?'); p.push(query.category); }
  if (query.location) { where.push('i.location LIKE ?'); p.push(`%${query.location}%`); }
  where.push(query.archived === '1' ? 'i.archived = 1' : 'i.archived = 0');
  if (query.status === 'low') where.push('i.min_qty > 0 AND i.qty > 0 AND i.qty <= i.min_qty');
  if (query.status === 'out') where.push('i.qty <= 0');
  if (query.status === 'loaned') where.push('i.loaned_qty > 0');
  if (query.status === 'expiring') {
    where.push('EXISTS (SELECT 1 FROM batches b WHERE b.item_id = i.id AND b.qty > 0 AND b.expiry <= ?)');
    p.push(addDays(today(), 60));
  }
  const rows = all(`SELECT i.*, w.name AS warehouse,
      (SELECT MIN(b.expiry) FROM batches b WHERE b.item_id = i.id AND b.qty > 0) AS next_expiry,
      (SELECT COALESCE(SUM(t.qty), 0) FROM transfers t WHERE t.item_id = i.id AND t.status = 'pending') AS transit_qty
    FROM items i JOIN warehouses w ON w.id = i.warehouse_id
    WHERE ${where.join(' AND ')} ORDER BY w.sort, i.name LIMIT 1000`, ...p);
  return rows.map((i) => decorateItem(i, user));
});

function saveImage(dataUrl) {
  const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUrl || '');
  if (!m) throw bad('فرمت تصویر پشتیبانی نمی‌شود.');
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > 3 * 1024 * 1024) throw bad('حجم تصویر بیشتر از ۳ مگابایت است.');
  const name = `${crypto.randomBytes(12).toString('hex')}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
  return name;
}

function itemFields(body) {
  const condition = body.condition || 'ok';
  if (!CONDITIONS[condition]) throw bad('وضعیت نامعتبر است.');
  return {
    name: required(body.name, 'نام کالا', 150),
    code: required(U.toLatin(body.code), 'کد کالا', 50),
    category: str(body.category, 80),
    location: str(body.location, 150),
    unit: required(body.unit, 'واحد', 30),
    min_qty: qty(body.min_qty || 0, 'حداقل موجودی', { allowZero: true }),
    condition,
    brand: str(body.brand, 80), model: str(body.model, 80), serial: str(U.toLatin(body.serial), 120),
    notes: str(body.notes, 2000),
  };
}

function nextCode(warehouseId) {
  const n = get('SELECT COUNT(*) AS n FROM items WHERE warehouse_id = ?', warehouseId).n;
  for (let i = n + 1; ; i++) {
    const code = `${warehouseId}-${String(i).padStart(4, '0')}`;
    if (!get('SELECT 1 FROM items WHERE warehouse_id = ? AND code = ?', warehouseId, code)) return code;
  }
}
route('GET', '/api/items/next-code', ({ query }) => ({ code: nextCode(Number(query.warehouse)) }));

route('POST', '/api/items', ({ user, body }) => {
  const wh = get('SELECT * FROM warehouses WHERE id = ? AND archived = 0', body.warehouse_id);
  if (!wh) throw bad('انبار را انتخاب کنید.');
  A.requireEdit(user, wh.id);
  const f = itemFields({ ...body, code: body.code || nextCode(wh.id) });
  if (get('SELECT 1 FROM items WHERE warehouse_id = ? AND code = ?', wh.id, f.code)) throw bad(`کد «${f.code}» در این انبار تکراری است.`);
  const batchTracked = body.batch_tracked == null ? wh.tracks_expiry : body.batch_tracked ? 1 : 0;
  const image = body.image_data ? saveImage(body.image_data) : null;
  const id = tx(() => {
    const r = run(`INSERT INTO items (warehouse_id, name, code, category, location, unit, min_qty, condition, brand, model, serial,
                     notes, image, batch_tracked, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    wh.id, f.name, f.code, f.category, f.location, f.unit, f.min_qty, f.condition, f.brand, f.model, f.serial, f.notes, image, batchTracked, user.id);
    const itemId = Number(r.lastInsertRowid);
    audit(user, 'item_create', 'item', itemId, f);
    return itemId;
  });
  // Opening stock is recorded as a normal entry so it appears in history.
  const opening = body.opening_qty ? qty(body.opening_qty, 'موجودی اولیه') : 0;
  if (opening > 0) {
    S.stockIn(id, { reason: 'receive', qty: opening, note: 'موجودی اولیه', batch_no: str(body.batch_no, 60),
      expiry: date(body.expiry, 'تاریخ انقضا') }, user);
  }
  return { id };
});

route('GET', '/api/items/:id', ({ user, params }) => {
  const item = get(`SELECT i.*, w.name AS warehouse, u.full_name AS creator FROM items i
                    JOIN warehouses w ON w.id = i.warehouse_id LEFT JOIN users u ON u.id = i.created_by WHERE i.id = ?`, params.id);
  if (!item) throw notFound('کالا پیدا نشد.');
  decorateItem(item, user);
  item.batches = all('SELECT * FROM batches WHERE item_id = ? AND qty > 0 ORDER BY expiry IS NULL, expiry', item.id);
  item.loans = all(`SELECT l.*, u.full_name AS recorder FROM loans l JOIN users u ON u.id = l.user_id
                    WHERE l.item_id = ? ORDER BY l.status = 'open' DESC, l.created_at DESC LIMIT 30`, item.id);
  item.transfers = all(`SELECT t.*, fw.name AS from_name, tw.name AS to_name FROM transfers t
                        JOIN warehouses fw ON fw.id = t.from_wh JOIN warehouses tw ON tw.id = t.to_wh
                        WHERE t.item_id = ? OR t.dest_item_id = ? ORDER BY t.sent_at DESC LIMIT 20`, item.id, item.id);
  item.transit_qty = r3(item.transfers.filter((t) => t.status === 'pending' && t.item_id === item.id).reduce((s, t) => s + t.qty, 0));
  item.history = txQuery({ item: item.id, limit: 200 });
  item.open_requests = all(`SELECT r.*, u.full_name AS requester FROM requests r JOIN users u ON u.id = r.requester_id
                            WHERE r.item_id = ? AND r.status IN ('pending','approved')`, item.id);
  return item;
});

route('PUT', '/api/items/:id', ({ user, params, body }) => {
  const item = S.loadItem(params.id);
  A.requireEdit(user, item.warehouse_id);
  const f = itemFields(body);
  if (f.code !== item.code && get('SELECT 1 FROM items WHERE warehouse_id = ? AND code = ? AND id <> ?', item.warehouse_id, f.code, item.id)) {
    throw bad(`کد «${f.code}» در این انبار تکراری است.`);
  }
  let image = item.image;
  if (body.image_data) image = saveImage(body.image_data);
  if (body.remove_image) image = null;
  const batchTracked = body.batch_tracked == null ? item.batch_tracked : body.batch_tracked ? 1 : 0;
  if (batchTracked && !item.batch_tracked && item.qty > 0) {
    throw bad('برای فعال‌کردن ثبت سری، ابتدا موجودی را صفر کنید یا کالای جدید بسازید.');
  }
  if (!batchTracked && item.batch_tracked && get('SELECT 1 FROM batches WHERE item_id = ? AND qty > 0', item.id)) {
    throw bad('این کالا سری دارای موجودی دارد و نمی‌توان ثبت سری را خاموش کرد.');
  }
  run(`UPDATE items SET name = ?, code = ?, category = ?, location = ?, unit = ?, min_qty = ?, condition = ?, brand = ?, model = ?,
         serial = ?, notes = ?, image = ?, batch_tracked = ?, updated_at = datetime('now') WHERE id = ?`,
  f.name, f.code, f.category, f.location, f.unit, f.min_qty, f.condition, f.brand, f.model, f.serial, f.notes, image, batchTracked, item.id);
  const changes = Object.fromEntries(Object.entries(f).filter(([k, v]) => (item[k] ?? null) !== v).map(([k, v]) => [k, [item[k], v]]));
  if (image !== item.image) changes.image = ['قبلی', image ? 'جدید' : 'حذف'];
  if (Object.keys(changes).length) audit(user, 'item_update', 'item', item.id, changes);
  if (f.condition !== item.condition && f.condition !== 'ok') {
    notify(warehouseAudience(item.warehouse_id).filter((u) => u !== user.id), {
      kind: 'damage', title: `«${f.name}»: ${CONDITIONS[f.condition]}`,
      body: `وضعیت این کالا توسط ${user.full_name} به «${CONDITIONS[f.condition]}» تغییر کرد.`,
      link: `#/items/${item.id}`, warehouse_id: item.warehouse_id,
    });
  }
  return { ok: true };
});

route('POST', '/api/items/:id/archive', ({ user, params, body }) => {
  const item = S.loadItem(params.id);
  A.requireEdit(user, item.warehouse_id);
  const archived = body.archived ? 1 : 0;
  if (archived && item.loaned_qty > 0) throw bad('این کالا امانت باز دارد؛ ابتدا امانت‌ها را ببندید.');
  if (archived && get("SELECT 1 FROM transfers WHERE item_id = ? AND status = 'pending'", item.id)) throw bad('این کالا انتقال در جریان دارد.');
  run(`UPDATE items SET archived = ?, updated_at = datetime('now') WHERE id = ?`, archived, item.id);
  audit(user, archived ? 'item_archive' : 'item_unarchive', 'item', item.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- stock operations */

function opInput(body) {
  return {
    qty: qty(body.qty), reason: body.reason, op_date: date(body.op_date) || today(),
    party: str(body.party, 150), note: str(body.note, 1000),
    batch_no: str(U.toLatin(body.batch_no), 60), expiry: date(body.expiry, 'تاریخ انقضا'),
    batch_id: body.batch_id ? Number(body.batch_id) : null,
    request_id: body.request_id ? Number(body.request_id) : null,
  };
}
const editGuard = (user) => (whId) => A.requireEdit(user, whId);

route('POST', '/api/items/:id/in', ({ user, params, body }) => {
  A.requireEdit(user, S.loadItem(params.id).warehouse_id);
  return { tx_id: S.stockIn(Number(params.id), opInput(body), user) };
});
route('POST', '/api/items/:id/out', ({ user, params, body }) => {
  A.requireEdit(user, S.loadItem(params.id).warehouse_id);
  return { tx_id: S.stockOut(Number(params.id), opInput(body), user) };
});
route('POST', '/api/items/:id/adjust', ({ user, params, body }) => {
  A.requireEdit(user, S.loadItem(params.id).warehouse_id);
  return {
    tx_id: S.adjust(Number(params.id), {
      new_qty: qty(body.new_qty, 'مقدار شمارش‌شده', { allowZero: true }), batch_id: body.batch_id ? Number(body.batch_id) : null,
      note: str(body.note, 1000), corrects_id: body.corrects_id ? Number(body.corrects_id) : null, op_date: date(body.op_date) || today(),
    }, user),
  };
});
route('POST', '/api/items/:id/loan', ({ user, params, body }) => {
  A.requireEdit(user, S.loadItem(params.id).warehouse_id);
  return S.loanOut(Number(params.id), {
    ...opInput(body), borrower: required(body.borrower, 'نام تحویل‌گیرنده', 150), program: str(body.program, 150),
    due_date: date(body.due_date, 'موعد بازگشت'),
  }, user);
});
route('POST', '/api/items/:id/transfer', ({ user, params, body }) => {
  A.requireEdit(user, S.loadItem(params.id).warehouse_id);
  return S.transferSend(Number(params.id), { to_wh: Number(body.to_wh), qty: qty(body.qty), note: str(body.note, 1000), op_date: date(body.op_date) || today() }, user);
});

/* ---------------------------------------------------------------- loans */

route('GET', '/api/loans', ({ user, query }) => {
  const rows = all(`SELECT l.*, i.name AS item_name, i.unit, i.code, w.name AS warehouse, u.full_name AS recorder FROM loans l
                    JOIN items i ON i.id = l.item_id JOIN warehouses w ON w.id = l.warehouse_id JOIN users u ON u.id = l.user_id
                    WHERE (? = 'all' OR l.status = ?) AND (? = 0 OR l.warehouse_id = ?)
                    ORDER BY l.status = 'open' DESC, l.due_date IS NULL, l.due_date, l.created_at DESC LIMIT 500`,
  query.status || 'open', query.status || 'open', Number(query.warehouse || 0), Number(query.warehouse || 0));
  return rows.map((l) => ({ ...l, can_edit: A.canEdit(user, l.warehouse_id) }));
});
route('POST', '/api/loans/:id/return', ({ user, params, body }) => ({
  tx_id: S.loanReturn(Number(params.id), { qty: qty(body.qty), note: str(body.note, 1000), op_date: date(body.op_date) || today() }, user, editGuard(user)),
}));

/* ---------------------------------------------------------------- transfers */

route('GET', '/api/transfers', ({ user, query }) => {
  const rows = all(`SELECT t.*, i.name AS item_name, i.unit, i.code, fw.name AS from_name, tw.name AS to_name,
                      su.full_name AS sender, hu.full_name AS handler FROM transfers t
                    JOIN items i ON i.id = t.item_id JOIN warehouses fw ON fw.id = t.from_wh JOIN warehouses tw ON tw.id = t.to_wh
                    JOIN users su ON su.id = t.sent_by LEFT JOIN users hu ON hu.id = t.handled_by
                    WHERE (? = 'all' OR t.status = ?) ORDER BY t.status = 'pending' DESC, t.sent_at DESC LIMIT 300`,
  query.status || 'all', query.status || 'all');
  return rows.map((t) => ({ ...t, can_receive: A.canEdit(user, t.to_wh), can_cancel: A.canEdit(user, t.from_wh) }));
});
route('POST', '/api/transfers/:id/receive', ({ user, params, body }) => ({
  tx_id: S.transferReceive(Number(params.id), { note: str(body.note, 1000) }, user, editGuard(user)),
}));
route('POST', '/api/transfers/:id/reject', ({ user, params, body }) => ({
  tx_id: S.transferBack(Number(params.id), { note: str(body.note, 1000) }, user, editGuard(user), 'reject'),
}));
route('POST', '/api/transfers/:id/cancel', ({ user, params, body }) => ({
  tx_id: S.transferBack(Number(params.id), { note: str(body.note, 1000) }, user, editGuard(user), 'cancel'),
}));

/* ---------------------------------------------------------------- transactions & receipts */

function txQuery({ item, warehouse, from, to, reason, direction, user: userId, limit = 500 } = {}) {
  const where = ['1 = 1'];
  const p = [];
  if (item) { where.push('t.item_id = ?'); p.push(Number(item)); }
  if (warehouse) { where.push('t.warehouse_id = ?'); p.push(Number(warehouse)); }
  if (from) { where.push('t.op_date >= ?'); p.push(from); }
  if (to) { where.push('t.op_date <= ?'); p.push(to); }
  if (reason) { where.push('t.reason = ?'); p.push(reason); }
  if (direction) { where.push('t.direction = ?'); p.push(direction); }
  if (userId) { where.push('t.user_id = ?'); p.push(Number(userId)); }
  return all(`SELECT t.*, i.name AS item_name, i.code, i.unit, w.name AS warehouse, u.full_name AS recorder FROM transactions t
              JOIN items i ON i.id = t.item_id JOIN warehouses w ON w.id = t.warehouse_id JOIN users u ON u.id = t.user_id
              WHERE ${where.join(' AND ')} ORDER BY t.id DESC LIMIT ${Math.min(Number(limit) || 500, 5000)}`, ...p);
}

route('GET', '/api/transactions', ({ query }) => txQuery({
  ...query, from: date(query.from), to: date(query.to),
}));
route('GET', '/api/transactions/:id', ({ params }) => {
  const t = get(`SELECT t.*, i.name AS item_name, i.code, i.unit, i.brand, i.model, i.serial,
      w.name AS warehouse, u.full_name AS recorder, l.program, l.due_date
    FROM transactions t JOIN items i ON i.id = t.item_id JOIN warehouses w ON w.id = t.warehouse_id
    JOIN users u ON u.id = t.user_id LEFT JOIN loans l ON l.id = t.loan_id WHERE t.id = ?`, params.id);
  if (!t) throw notFound('رسید پیدا نشد.');
  t.corrections = all('SELECT id, delta, note, created_at FROM transactions WHERE corrects_id = ?', t.id);
  return t;
});

/* ---------------------------------------------------------------- requests */

route('GET', '/api/requests', ({ user, query }) => {
  const scope = query.scope || 'all';
  const where = [];
  const p = [];
  if (scope === 'mine') { where.push('r.requester_id = ?'); p.push(user.id); }
  if (scope === 'review') {
    if (A.isAdmin(user)) where.push('1 = 1');
    else where.push(user.managed.length ? `r.warehouse_id IN (${user.managed.join(',')})` : '0');
  }
  if (query.status) { where.push('r.status = ?'); p.push(query.status); }
  const rows = all(`SELECT r.*, w.name AS warehouse, u.full_name AS requester, ru.full_name AS reviewer, i.qty AS item_qty,
                      i.unit AS item_unit FROM requests r
                    JOIN warehouses w ON w.id = r.warehouse_id JOIN users u ON u.id = r.requester_id
                    LEFT JOIN users ru ON ru.id = r.reviewer_id LEFT JOIN items i ON i.id = r.item_id
                    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
                    ORDER BY r.status = 'pending' DESC, r.status = 'approved' DESC, r.created_at DESC LIMIT 300`, ...p);
  return rows.map((r) => ({ ...r, can_review: A.canEdit(user, r.warehouse_id), is_mine: r.requester_id === user.id }));
});

route('POST', '/api/requests', ({ user, body }) => {
  const wh = get('SELECT * FROM warehouses WHERE id = ? AND archived = 0', body.warehouse_id);
  if (!wh) throw bad('انبار را انتخاب کنید.');
  const kind = ['use', 'loan', 'supply'].includes(body.kind) ? body.kind : 'use';
  let item = null;
  if (body.item_id) {
    item = get('SELECT * FROM items WHERE id = ? AND warehouse_id = ?', body.item_id, wh.id);
    if (!item) throw bad('کالای انتخاب‌شده در این انبار نیست.');
  }
  const name = item ? item.name : required(body.item_name, 'نام کالا', 150);
  const r = run(`INSERT INTO requests (warehouse_id, item_id, item_name, qty, unit, kind, reason, needed_by, requester_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  wh.id, item?.id, name, qty(body.qty), item ? item.unit : str(body.unit, 30), kind,
  required(body.reason, 'علت نیاز', 1000), date(body.needed_by, 'زمان موردنیاز'), user.id);
  const kindLabel = { use: 'دریافت وسیله', loan: 'امانت', supply: 'تأمین کالا' }[kind];
  notify(warehouseAudience(wh.id).filter((u) => u !== user.id), {
    kind: 'request_new', title: `درخواست ${kindLabel}: «${name}»`,
    body: `${user.full_name} — ${U.toLatin(body.qty)} ${item ? item.unit : body.unit || ''} — ${wh.name}`,
    link: '#/requests', warehouse_id: wh.id,
  });
  return { id: Number(r.lastInsertRowid) };
});

route('POST', '/api/requests/:id/review', ({ user, params, body }) => {
  const r = get('SELECT * FROM requests WHERE id = ?', params.id);
  if (!r) throw notFound('درخواست پیدا نشد.');
  A.requireEdit(user, r.warehouse_id);
  const decision = { approve: 'approved', reject: 'rejected', deliver: 'delivered' }[body.decision];
  if (!decision) throw bad('تصمیم نامعتبر است.');
  if (decision === 'rejected' && !str(body.note)) throw bad('علت رد درخواست را بنویسید.');
  if (decision === 'delivered' && r.item_id && r.kind !== 'supply') {
    throw bad('برای تحویل این درخواست، خروج یا امانت را از صفحه کالا ثبت کنید تا موجودی کم شود.');
  }
  if (!['pending', 'approved'].includes(r.status)) throw bad('این درخواست قبلاً بسته شده است.');
  run(`UPDATE requests SET status = ?, reviewer_id = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?`,
    decision, user.id, str(body.note, 1000), r.id);
  const label = { approved: 'تأیید شد', rejected: 'رد شد', delivered: 'انجام شد' }[decision];
  notify([r.requester_id].filter((u) => u !== user.id), {
    kind: 'request_result', title: `درخواست «${r.item_name}» ${label}`,
    body: body.note ? `توضیح ${user.full_name}: ${body.note}` : `بررسی‌کننده: ${user.full_name}`,
    link: '#/requests', warehouse_id: r.warehouse_id,
  });
  return { ok: true };
});

route('POST', '/api/requests/:id/cancel', ({ user, params }) => {
  const r = get('SELECT * FROM requests WHERE id = ?', params.id);
  if (!r) throw notFound('درخواست پیدا نشد.');
  if (r.requester_id !== user.id) throw forbidden('فقط ثبت‌کننده می‌تواند درخواست را لغو کند.');
  if (r.status !== 'pending') throw bad('فقط درخواست‌های در انتظار بررسی قابل لغو هستند.');
  run("UPDATE requests SET status = 'cancelled' WHERE id = ?", r.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- notifications & announcements */

route('GET', '/api/notifications', ({ user }) =>
  all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 200', user.id));
route('POST', '/api/notifications/read', ({ user, body }) => {
  if (body.all) run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', user.id);
  else for (const id of body.ids || []) run('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND id = ?', user.id, Number(id));
  return { ok: true };
});

route('GET', '/api/announcements', () => all(`SELECT a.*, u.full_name AS author FROM announcements a JOIN users u ON u.id = a.user_id
  WHERE a.archived = 0 ORDER BY a.pinned DESC, a.created_at DESC LIMIT 100`));
route('POST', '/api/announcements', ({ user, body }) => {
  if (!A.isAdmin(user) && !user.managed.length) throw forbidden('فقط مدیران می‌توانند اطلاعیه منتشر کنند.');
  const title = required(body.title, 'عنوان', 150);
  const text = required(body.body, 'متن اطلاعیه', 4000);
  const r = run('INSERT INTO announcements (title, body, pinned, user_id) VALUES (?, ?, ?, ?)', title, text, body.pinned ? 1 : 0, user.id);
  notify(allActiveUsers().filter((u) => u !== user.id), { kind: 'announcement', title: `اطلاعیه: ${title}`, body: text.slice(0, 200), link: '#/announcements' });
  return { id: Number(r.lastInsertRowid) };
});
route('POST', '/api/announcements/:id/archive', ({ user, params }) => {
  const a = get('SELECT * FROM announcements WHERE id = ?', params.id);
  if (!a) throw notFound();
  if (a.user_id !== user.id) A.requireAdmin(user);
  run('UPDATE announcements SET archived = 1 WHERE id = ?', a.id);
  return { ok: true };
});

/* ---------------------------------------------------------------- admin: users & warehouses */

route('GET', '/api/users', ({ user }) => {
  A.requireAdmin(user);
  const mgr = all('SELECT * FROM warehouse_managers');
  return all('SELECT * FROM users ORDER BY active DESC, role, full_name').map((u) => A.publicUser({
    ...u, managed: mgr.filter((m) => m.user_id === u.id).map((m) => m.warehouse_id),
  }));
});

function setManaged(userId, warehouseIds) {
  run('DELETE FROM warehouse_managers WHERE user_id = ?', userId);
  for (const w of new Set((warehouseIds || []).map(Number))) {
    if (get('SELECT 1 FROM warehouses WHERE id = ?', w)) run('INSERT INTO warehouse_managers (warehouse_id, user_id) VALUES (?, ?)', w, userId);
  }
}

route('POST', '/api/users', ({ user, body }) => {
  A.requireAdmin(user);
  const username = required(U.toLatin(body.username), 'نام کاربری', 40);
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) throw bad('نام کاربری فقط با حروف انگلیسی، عدد، نقطه یا خط تیره و حداقل ۳ حرف باشد.');
  if (get('SELECT 1 FROM users WHERE username = ?', username)) throw bad('این نام کاربری قبلاً ثبت شده است.');
  A.checkNewPassword(body.password);
  const role = body.role === 'admin' ? 'admin' : 'user';
  return tx(() => {
    const r = run(`INSERT INTO users (username, full_name, phone, chat_id, password_hash, role, must_change_pw)
                   VALUES (?, ?, ?, ?, ?, ?, 1)`,
    username, required(body.full_name, 'نام و نام خانوادگی', 100), str(U.toLatin(body.phone), 20), str(body.chat_id, 40),
    A.hashPassword(body.password), role);
    const id = Number(r.lastInsertRowid);
    setManaged(id, body.managed);
    audit(user, 'user_create', 'user', id, { username, role, managed: body.managed });
    return { id };
  });
});

route('PUT', '/api/users/:id', ({ user, params, body }) => {
  A.requireAdmin(user);
  const target = get('SELECT * FROM users WHERE id = ?', params.id);
  if (!target) throw notFound('کاربر پیدا نشد.');
  const role = body.role === 'admin' ? 'admin' : 'user';
  const active = body.active ? 1 : 0;
  if (target.id === user.id && (role !== 'admin' || !active)) throw bad('نمی‌توانید نقش مدیر کل یا فعال‌بودن حساب خودتان را بردارید.');
  return tx(() => {
    run('UPDATE users SET full_name = ?, phone = ?, chat_id = ?, role = ?, active = ? WHERE id = ?',
      required(body.full_name, 'نام و نام خانوادگی', 100), str(U.toLatin(body.phone), 20), str(body.chat_id, 40), role, active, target.id);
    setManaged(target.id, body.managed);
    if (!active) run('DELETE FROM sessions WHERE user_id = ?', target.id);
    audit(user, 'user_update', 'user', target.id, { role, active, managed: body.managed });
    return { ok: true };
  });
});

route('POST', '/api/users/:id/reset-password', ({ user, params, body }) => {
  A.requireAdmin(user);
  const target = get('SELECT * FROM users WHERE id = ?', params.id);
  if (!target) throw notFound('کاربر پیدا نشد.');
  A.checkNewPassword(body.password);
  run('UPDATE users SET password_hash = ?, must_change_pw = 1 WHERE id = ?', A.hashPassword(body.password), target.id);
  run('DELETE FROM sessions WHERE user_id = ?', target.id);
  audit(user, 'password_reset', 'user', target.id);
  return { ok: true };
});

route('POST', '/api/warehouses', ({ user, body }) => {
  A.requireAdmin(user);
  const name = required(body.name, 'نام انبار', 100);
  if (get('SELECT 1 FROM warehouses WHERE name = ?', name)) throw bad('انباری با این نام وجود دارد.');
  return tx(() => {
    const sort = get('SELECT COALESCE(MAX(sort), 0) + 1 AS s FROM warehouses').s;
    const r = run('INSERT INTO warehouses (name, description, tracks_expiry, sort) VALUES (?, ?, ?, ?)',
      name, str(body.description, 500), body.tracks_expiry ? 1 : 0, sort);
    const id = Number(r.lastInsertRowid);
    for (const m of new Set((body.managers || []).map(Number))) run('INSERT INTO warehouse_managers VALUES (?, ?)', id, m);
    audit(user, 'warehouse_create', 'warehouse', id, { name, managers: body.managers });
    return { id };
  });
});

route('PUT', '/api/warehouses/:id', ({ user, params, body }) => {
  A.requireAdmin(user);
  const w = get('SELECT * FROM warehouses WHERE id = ?', params.id);
  if (!w) throw notFound('انبار پیدا نشد.');
  const name = required(body.name, 'نام انبار', 100);
  if (get('SELECT 1 FROM warehouses WHERE name = ? AND id <> ?', name, w.id)) throw bad('انباری با این نام وجود دارد.');
  return tx(() => {
    run('UPDATE warehouses SET name = ?, description = ?, tracks_expiry = ?, archived = ? WHERE id = ?',
      name, str(body.description, 500), body.tracks_expiry ? 1 : 0, body.archived ? 1 : 0, w.id);
    run('DELETE FROM warehouse_managers WHERE warehouse_id = ?', w.id);
    for (const m of new Set((body.managers || []).map(Number))) run('INSERT INTO warehouse_managers VALUES (?, ?)', w.id, m);
    audit(user, 'warehouse_update', 'warehouse', w.id, { name, archived: !!body.archived, managers: body.managers });
    return { ok: true };
  });
});

route('GET', '/api/audit', ({ user, query }) => {
  A.requireAdmin(user);
  return all(`SELECT a.*, u.full_name AS actor FROM audit a LEFT JOIN users u ON u.id = a.user_id
              WHERE (? = '' OR a.entity = ?) AND (? = 0 OR a.entity_id = ?) ORDER BY a.id DESC LIMIT 300`,
  query.entity || '', query.entity || '', Number(query.entity_id || 0), Number(query.entity_id || 0));
});

/* ---------------------------------------------------------------- backups */

function backupNow() {
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const file = path.join(BACKUP_DIR, `anbar-${stamp}.db`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const keep = Number(process.env.ANBAR_BACKUP_KEEP || 30);
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort();
  for (const f of files.slice(0, Math.max(0, files.length - keep))) fs.unlinkSync(path.join(BACKUP_DIR, f));
  return path.basename(file);
}
route('GET', '/api/backups', ({ user }) => {
  A.requireAdmin(user);
  return fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.db')).sort().reverse()
    .map((f) => ({ name: f, size: fs.statSync(path.join(BACKUP_DIR, f)).size, created_at: fs.statSync(path.join(BACKUP_DIR, f)).mtime }));
});
route('POST', '/api/backups', ({ user }) => {
  A.requireAdmin(user);
  const name = backupNow();
  audit(user, 'backup', null, null, { name });
  return { name };
});
route('GET', '/api/backups/:name', ({ user, params }) => {
  A.requireAdmin(user);
  if (!/^anbar-[\d-]+\.db$/.test(params.name)) throw notFound();
  const file = path.join(BACKUP_DIR, params.name);
  if (!fs.existsSync(file)) throw notFound();
  return { $file: { body: fs.readFileSync(file), type: 'application/octet-stream', name: params.name } };
});

/* ---------------------------------------------------------------- reports */

const n = (v) => (v == null ? '' : r3(v));
const REPORTS = {
  inventory: {
    title: 'گزارش موجودی',
    headers: ['انبار', 'کد', 'نام کالا', 'دسته‌بندی', 'محل نگهداری', 'موجودی در انبار', 'در امانت', 'در حال انتقال', 'واحد', 'حداقل', 'وضعیت', 'برند', 'مدل', 'سریال', 'نزدیک‌ترین انقضا'],
    rows: (q) => all(`SELECT i.*, w.name AS warehouse,
        (SELECT MIN(b.expiry) FROM batches b WHERE b.item_id = i.id AND b.qty > 0) AS next_expiry,
        (SELECT COALESCE(SUM(t.qty), 0) FROM transfers t WHERE t.item_id = i.id AND t.status = 'pending') AS transit
      FROM items i JOIN warehouses w ON w.id = i.warehouse_id
      WHERE i.archived = 0 AND (? = 0 OR i.warehouse_id = ?) ORDER BY w.sort, i.name`, q.wh, q.wh)
      .map((i) => [i.warehouse, i.code, i.name, i.category, i.location, n(i.qty), n(i.loaned_qty), n(i.transit), i.unit, n(i.min_qty),
        CONDITIONS[i.condition], i.brand, i.model, i.serial, jalali(i.next_expiry)]),
  },
  transactions: {
    title: 'گزارش ورود و خروج',
    headers: ['شماره رسید', 'تاریخ', 'انبار', 'کد', 'کالا', 'نوع', 'علت', 'مقدار', 'واحد', 'موجودی پس از عملیات', 'طرف تحویل', 'ثبت‌کننده', 'توضیحات'],
    rows: (q) => txQuery({ warehouse: q.wh || null, from: q.from, to: q.to, limit: 5000 }).reverse()
      .map((t) => [t.id, jalali(t.op_date), t.warehouse, t.code, t.item_name, { in: 'ورود', out: 'خروج', adj: 'اصلاح' }[t.direction],
        S.REASONS[t.reason]?.label, n(t.delta), t.unit, n(t.qty_after), t.party, t.recorder, t.note]),
  },
  loans: {
    title: 'گزارش امانت‌ها',
    headers: ['انبار', 'کالا', 'تحویل‌گیرنده', 'برنامه', 'مقدار', 'برگشت‌داده', 'باقی‌مانده', 'واحد', 'تاریخ تحویل', 'موعد بازگشت', 'وضعیت', 'ثبت‌کننده'],
    rows: (q) => all(`SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse, u.full_name AS recorder FROM loans l
        JOIN items i ON i.id = l.item_id JOIN warehouses w ON w.id = l.warehouse_id JOIN users u ON u.id = l.user_id
        WHERE (? = 0 OR l.warehouse_id = ?) AND (? IS NULL OR date(l.created_at) >= ?) AND (? IS NULL OR date(l.created_at) <= ?)
        ORDER BY l.created_at`, q.wh, q.wh, q.from, q.from, q.to, q.to)
      .map((l) => [l.warehouse, l.item_name, l.borrower, l.program, n(l.qty), n(l.returned_qty), n(l.qty - l.returned_qty), l.unit,
        jalali(l.created_at), jalali(l.due_date),
        l.status === 'closed' ? 'بسته' : l.due_date && l.due_date < today() ? 'دارای تأخیر' : 'باز', l.recorder]),
  },
  transfers: {
    title: 'گزارش انتقال‌ها',
    headers: ['شماره', 'تاریخ ارسال', 'کالا', 'مقدار', 'واحد', 'از انبار', 'به انبار', 'وضعیت', 'ارسال‌کننده', 'بررسی‌کننده', 'تاریخ بررسی', 'توضیحات'],
    rows: (q) => all(`SELECT t.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name, su.full_name AS sender,
          hu.full_name AS handler FROM transfers t JOIN items i ON i.id = t.item_id JOIN warehouses fw ON fw.id = t.from_wh
        JOIN warehouses tw ON tw.id = t.to_wh JOIN users su ON su.id = t.sent_by LEFT JOIN users hu ON hu.id = t.handled_by
        WHERE (? = 0 OR t.from_wh = ? OR t.to_wh = ?) AND (? IS NULL OR date(t.sent_at) >= ?) AND (? IS NULL OR date(t.sent_at) <= ?)
        ORDER BY t.sent_at`, q.wh, q.wh, q.wh, q.from, q.from, q.to, q.to)
      .map((t) => [t.id, jalali(t.sent_at), t.item_name, n(t.qty), t.unit, t.from_name, t.to_name,
        { pending: 'در حال انتقال', received: 'دریافت شد', rejected: 'رد شد', cancelled: 'لغو شد' }[t.status],
        t.sender, t.handler, jalali(t.handled_at), [t.note, t.handle_note].filter(Boolean).join(' / ')]),
  },
};

route('GET', '/api/reports/:kind', ({ params, query }) => {
  const rep = REPORTS[params.kind];
  if (!rep) throw notFound('گزارش پیدا نشد.');
  const q = { wh: Number(query.warehouse || 0), from: date(query.from, 'از تاریخ'), to: date(query.to, 'تا تاریخ') };
  const rows = rep.rows(q);
  if (query.format === 'xlsx') {
    const fileName = `${params.kind}-${today()}.xlsx`;
    return { $file: { body: buildXlsx(rep.title, rep.headers, rows), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', name: fileName } };
  }
  return { title: rep.title, headers: rep.headers, rows };
});

module.exports = { routes, backupNow };
