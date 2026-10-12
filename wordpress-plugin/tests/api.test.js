'use strict';
/**
 * End-to-end tests against a running WordPress with the plugin active, one per acceptance criterion.
 * Prepare a throwaway site first (this wipes app data and recreates the 15 initial accounts
 * with test passwords "test-<username>"):
 *   ANBAR_TEST_RESET=yes wp eval-file wordpress-plugin/tests/reset.php
 * Then: WP_URL=http://127.0.0.1:8080 node --test wordpress-plugin/tests/api.test.js
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');

const SITE = process.env.WP_URL || 'http://127.0.0.1:8080';

class Client {
  constructor() { this.jar = {}; this.nonce = ''; }
  get cookie() { return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join('; '); }
  store(res) {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      this.jar[kv.slice(0, i)] = kv.slice(i + 1);
    }
  }
  async refreshNonce() {
    const html = await (await fetch(SITE + '/anbar/', { headers: { cookie: this.cookie } })).text();
    this.nonce = /"nonce":"(\w+)"/.exec(html)[1];
  }
  async req(method, url, body) {
    const res = await fetch(SITE + '/wp-json/anbar/v1' + url, {
      method, redirect: 'manual',
      headers: { ...(this.nonce ? { 'X-WP-Nonce': this.nonce } : {}), cookie: this.cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    this.store(res);
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data };
  }
  async ok(method, url, body) {
    const r = await this.req(method, url, body);
    assert.equal(r.status, 200, `${method} ${url} → ${r.status} ${JSON.stringify(r.data?.message || r.data)}`);
    return r.data;
  }
  async status(method, url, body) { return (await this.req(method, url, body)).status; }
  static async as(username) {
    const c = new Client();
    await c.ok('POST', '/login', { username, password: `test-${username}` });
    await c.refreshNonce();
    return c;
  }
}

const U = {};
const W = {};
const ids = {};
const item = (c, id) => c.ok('GET', `/items/${id}`);

test('only defined accounts log in; WordPress admin and wrong passwords are refused', async () => {
  for (const name of ['mohammadali', 'mehdi', 'mostafa', 'amin', 'gholamreza', 'morteza', 'yahya', 'abbasali', 'amirhossein', 'ali',
    'reserve01', 'reserve02', 'reserve03', 'reserve04', 'reserve05']) {
    U[name] = await Client.as(name);
  }
  assert.equal(await new Client().status('GET', '/bootstrap'), 401);
  assert.equal(await new Client().status('POST', '/login', { username: 'ali', password: 'wrong-pass' }), 401);
  assert.equal(await new Client().status('POST', '/login', { username: 'farani', password: 'whatever1' }), 401);
  const boot = await U.mohammadali.ok('GET', '/bootstrap');
  assert.equal(boot.warehouses.length, 10);
  for (const w of boot.warehouses) W[w.name] = w.id;
});

test('permissions follow the table; restricted users only see their warehouse', async () => {
  const p = (u) => u.ok('GET', '/me').then((r) => r.user.perms);
  const gm = await p(U.mehdi);
  assert.ok(gm.scope_all && gm.approve && gm.manage_users);
  const ali = await p(U.ali);
  assert.ok(ali.scope_all && ali.approve && ali.deliver && !ali.manage_users);
  const res = await p(U.reserve03);
  assert.ok(res.scope_all && res.edit && res.deliver && !res.approve && !res.manage_users);
  const mo = await p(U.morteza);
  assert.ok(!mo.scope_all && !mo.approve && mo.warehouses.length === 1 && mo.warehouses[0] === W['انبار صوت مسجد']);
  assert.ok(mo.steward && gm.steward && ali.steward && res.steward, 'everyone completes cards within their scope');
  assert.equal((await U.morteza.ok('GET', '/bootstrap')).warehouses.length, 1);
  assert.equal((await U.abbasali.ok('GET', '/bootstrap')).warehouses[0].name, 'اموال و انبار کتابخانه');
  assert.equal(await U.ali.status('GET', '/users'), 403);
  assert.equal(await U.reserve01.status('GET', '/users'), 403);
});

test('asset cards: restricted user records in own warehouse only; partial cards are allowed', async () => {
  const r = await U.morteza.ok('POST', '/items', {
    warehouse_id: W['انبار صوت مسجد'], name: 'باند اکتیو JBL EON712', item_type: 'audio', unit: 'عدد', opening_qty: '۴', brand: 'JBL', model: 'EON712',
    condition_notes: 'خروجی دوم صدا ندارد', details: { specs: { power: '1300W', active: 'اکتیو' }, custom: [{ label: 'رنگ بدنه', value: 'مشکی' }] },
    purchase_price: '', current_value: '۴۵۰۰۰۰۰۰',
  });
  ids.speaker = r.id;
  const it = await item(U.morteza, r.id);
  assert.equal(it.qty, 4);
  assert.equal(it.details.specs.power, '1300W');
  assert.equal(it.card_status, 'draft');
  assert.ok(it.missing.includes('عکس'));
  assert.equal(it.purchase_price, null, 'card completers see the price fields; unknown stays empty');
  const gmView = await item(U.mehdi, r.id);
  assert.equal(gmView.purchase_price, null, 'unknown price stays empty, not 0');
  assert.equal(String(gmView.current_value), '45000000');
  assert.equal(await U.morteza.status('POST', '/items', { warehouse_id: W['انبار رسانه'], name: 'x', unit: 'عدد' }), 403);
  assert.equal(await U.amirhossein.status('GET', `/items/${r.id}`), 403);
  assert.equal(await U.amirhossein.status('POST', `/items/${r.id}/review`, { status: 'reviewed' }), 403, 'steward only within own scope');
  await U.morteza.ok('POST', `/items/${r.id}/review`, { status: 'incomplete', note: 'عکس لازم است' });
  assert.equal((await U.amirhossein.ok('GET', '/items?q=JBL')).length, 0);
  const minimal = await U.abbasali.ok('POST', '/items', { warehouse_id: W['اموال و انبار کتابخانه'], name: 'نهج‌البلاغه', unit: 'جلد', item_type: 'book', opening_qty: 3 });
  ids.book = minimal.id;
});

test('exit: request → approval by an authorised approver → delivery; stock drops only at delivery', async () => {
  const ex = await U.morteza.ok('POST', '/exits', { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'هیئت جوانان', reason: 'مراسم',
    lines: [{ item_id: ids.speaker, qty: 2 }], submit: 1 });
  ids.exit1 = ex.id;
  let e = await U.morteza.ok('GET', `/exits/${ex.id}`);
  assert.equal(e.status, 'pending');
  assert.equal((await item(U.morteza, ids.speaker)).qty, 4);
  assert.equal(await U.morteza.status('POST', `/exits/${ex.id}/decide`, { decision: 'approve' }), 403);
  assert.equal(await U.reserve01.status('POST', `/exits/${ex.id}/decide`, { decision: 'approve' }), 403);
  assert.equal(await U.morteza.status('POST', `/exits/${ex.id}/deliver`, {}), 400, 'cannot deliver before approval');
  await U.ali.ok('POST', `/exits/${ex.id}/decide`, { decision: 'approve' });
  let it = await item(U.morteza, ids.speaker);
  assert.equal(it.qty, 4, 'approval does not reduce stock');
  assert.equal(it.reserved_qty, 2);
  assert.equal(it.usable_qty, 2);
  // Reserved quantity cannot be promised twice.
  const ex2 = await U.yahya.ok('POST', '/exits', { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'x', lines: [{ item_id: ids.speaker, qty: 3 }], submit: 1 });
  assert.equal(await U.mehdi.status('POST', `/exits/${ex2.id}/decide`, { decision: 'approve' }), 400);
  await U.mehdi.ok('POST', `/exits/${ex2.id}/decide`, { decision: 'reject', note: 'موجودی کافی نیست' });
  assert.equal(await U.mehdi.status('POST', `/exits/${ex2.id}/decide`, { decision: 'reject' }), 400, 'already decided');
  await U.morteza.ok('POST', `/exits/${ex.id}/deliver`, { note: 'تحویل شد' });
  it = await item(U.morteza, ids.speaker);
  assert.equal(it.qty, 2);
  assert.equal(it.reserved_qty, 0);
  assert.equal(await U.morteza.status('POST', `/exits/${ex.id}/deliver`, {}), 400, 'no duplicate delivery');
  e = await U.morteza.ok('GET', `/exits/${ex.id}`);
  assert.equal(e.status, 'delivered');
  assert.ok(e.approver && e.deliverer && e.requester);
  assert.ok(e.lines[0].tx_id, 'voucher line linked to its stock transaction');
});

test('approver approving their own request is recorded; changes after approval void it', async () => {
  const ex = await U.mehdi.ok('POST', '/exits', { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'مسجد', lines: [{ item_id: ids.speaker, qty: 1 }], submit: 1 });
  await U.mehdi.ok('POST', `/exits/${ex.id}/decide`, { decision: 'approve' });
  let e = await U.mehdi.ok('GET', `/exits/${ex.id}`);
  assert.equal(e.requester_id, e.approver_id);
  await U.morteza.ok('PUT', `/exits/${ex.id}`, { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'مسجد', lines: [{ item_id: ids.speaker, qty: 2 }] });
  e = await U.morteza.ok('GET', `/exits/${ex.id}`);
  assert.equal(e.status, 'pending');
  assert.equal(e.approver_id, null);
  await U.morteza.ok('POST', `/exits/${ex.id}/cancel`, { note: 'لازم نشد' });
});

test('loan with partial, damaged return; broken stock is separate from usable', async () => {
  const cam = await U.amirhossein.ok('POST', '/items', { warehouse_id: W['انبار رسانه'], name: 'دوربین کانن 90D', unit: 'دستگاه', item_type: 'camera', opening_qty: 3, serial: 'CN-1' });
  const ex = await U.amirhossein.ok('POST', '/exits', { from_wh: W['انبار رسانه'], type: 'loan', recipient: 'سید محمد', recipient_phone: '09121234567', due_date: '2026-10-20',
    lines: [{ item_id: cam.id, qty: 2 }], submit: 1 });
  await U.ali.ok('POST', `/exits/${ex.id}/decide`, { decision: 'approve' });
  await U.amirhossein.ok('POST', `/exits/${ex.id}/deliver`, {});
  let it = await item(U.amirhossein, cam.id);
  assert.equal(it.qty, 1);
  assert.equal(it.loaned_qty, 2);
  const loan = it.loans[0];
  await U.amirhossein.ok('POST', `/loans/${loan.id}/return`, { qty: 1, broken: 1, note: 'لنز ترک دارد' });
  it = await item(U.amirhossein, cam.id);
  assert.equal(it.qty, 2);
  assert.equal(it.broken_qty, 1);
  assert.equal(it.usable_qty, 1);
  assert.equal(it.loaned_qty, 1);
  await U.amirhossein.ok('POST', `/items/${cam.id}/repair`, { qty: 1, note: 'لنز تعویض شد' });
  assert.equal((await item(U.amirhossein, cam.id)).usable_qty, 2);
});

test('transfers need approval and stay in transit until the destination receives', async () => {
  const ex = await U.reserve01.ok('POST', '/exits', { from_wh: W['انبار صوت مسجد'], to_wh: W['انبار مسجد'], type: 'transfer', lines: [{ item_id: ids.speaker, qty: 1 }], submit: 1 });
  assert.equal(await U.reserve01.status('POST', `/exits/${ex.id}/decide`, { decision: 'approve' }), 403);
  await U.gholamreza.ok('POST', `/exits/${ex.id}/decide`, { decision: 'approve' });
  await U.reserve01.ok('POST', `/exits/${ex.id}/deliver`, {});
  const it = await item(U.reserve01, ids.speaker);
  assert.equal(it.transit_qty, 1);
  const tr = it.transfers[0];
  assert.equal(await U.morteza.status('POST', `/transfers/${tr.id}/receive`), 403, 'origin-only user cannot receive at destination');
  await U.reserve02.ok('POST', `/transfers/${tr.id}/receive`, {});
  const dest = await U.mehdi.ok('GET', `/items?warehouse=${W['انبار مسجد']}`);
  assert.equal(dest[0].qty, 1);
});

test('no exit without approval: decreasing correction needs approver; duplicate submissions blocked', async () => {
  assert.equal(await U.morteza.status('POST', `/items/${ids.speaker}/adjust`, { new_qty: 0, note: 'شمارش' }), 403);
  assert.equal(await U.reserve01.status('POST', `/items/${ids.speaker}/adjust`, { new_qty: 0, note: 'شمارش' }), 403);
  await U.morteza.ok('POST', `/items/${ids.speaker}/adjust`, { new_qty: 2, note: 'یک عدد پیدا شد' });
  const key = 'k-' + Date.now();
  await U.morteza.ok('POST', `/items/${ids.speaker}/in`, { qty: 1, reason: 'gift', op_key: key });
  assert.equal(await U.morteza.status('POST', `/items/${ids.speaker}/in`, { qty: 1, reason: 'gift', op_key: key }), 400);
  assert.equal((await item(U.morteza, ids.speaker)).qty, 3);
  assert.equal(await U.morteza.status('POST', '/exits', { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'x', lines: [{ item_id: ids.speaker, qty: 0 }] }), 400);
  assert.equal(await U.morteza.status('POST', '/exits', { from_wh: W['انبار صوت مسجد'], type: 'consume', recipient: 'x', lines: [{ item_id: ids.speaker, qty: -1 }] }), 400);
});

test('public ticket → referral → staff picks items → approval → ready → call note → delivery', async () => {
  const anon = new Client();
  assert.equal(await anon.status('POST', '/public/tickets', { first_name: 'رضا', last_name: 'احمدی', national_id: '1234567890', phone: '09121234567',
    referral: 'معرفی', item_text: 'کتاب', description: 'برای کلاس' }), 400, 'invalid national id');
  const pub = await anon.ok('POST', '/public/tickets', { first_name: 'رضا', last_name: 'احمدی', national_id: '0084575948', phone: '۰۹۱۲۱۲۳۴۵۶۷',
    referral: 'معرفی آقای کریمی', item_text: 'دو جلد نهج‌البلاغه', qty_text: '۲ جلد', description: 'برای کلاس قرآن' });
  assert.match(pub.code, /^\d{8}$/);
  assert.equal(await anon.status('GET', '/items'), 401, 'public cannot list stock');
  const tickets = await U.reserve01.ok('GET', '/tickets?status=new');
  const t = tickets.find((x) => x.code === pub.code);
  assert.ok(t);
  assert.equal(await U.abbasali.status('GET', `/tickets/${t.id}`), 403, 'not referred yet');
  await U.reserve01.ok('POST', `/tickets/${t.id}/refer`, { warehouse_id: W['اموال و انبار کتابخانه'] });
  const seen = await U.abbasali.ok('GET', `/tickets/${t.id}`);
  assert.equal(seen.phone, '09121234567');
  assert.equal(await U.reserve01.status('POST', `/tickets/${t.id}/status`, { status: 'accepted' }), 403, 'reserves follow up but do not decide');
  await U.ali.ok('POST', `/tickets/${t.id}/status`, { status: 'accepted' });
  const ex = await U.abbasali.ok('POST', '/exits', { from_wh: W['اموال و انبار کتابخانه'], type: 'loan', ticket_id: t.id, recipient: 'رضا احمدی',
    recipient_phone: '09121234567', due_date: '2026-11-01', delivery_place: 'کتابخانه', lines: [{ item_id: ids.book, qty: 2 }], submit: 1 });
  assert.equal((await U.ali.ok('GET', `/tickets/${t.id}`)).status, 'accepted', 'a ticket alone reserves nothing');
  assert.equal((await item(U.abbasali, ids.book)).qty, 3);
  await U.ali.ok('POST', `/exits/${ex.id}/decide`, { decision: 'approve' });
  assert.equal((await U.ali.ok('GET', `/tickets/${t.id}`)).status, 'ready');
  await U.abbasali.ok('POST', `/tickets/${t.id}/note`, { kind: 'call', text: 'تماس گرفته شد؛ فردا ساعت ۱۷ مراجعه می‌کند.', appointment: 'فردا ساعت ۱۷' });
  await U.abbasali.ok('POST', `/exits/${ex.id}/deliver`, {});
  const final = await U.ali.ok('GET', `/tickets/${t.id}`);
  assert.equal(final.status, 'delivered');
  assert.equal(final.appointment, 'فردا ساعت ۱۷');
  assert.equal(final.exits[0].status, 'delivered');
  const track = await anon.ok('POST', '/public/track', { code: pub.code, national_id: '0084575948' });
  assert.match(track.status, /تحویل/);
  assert.equal(await anon.status('POST', '/public/track', { code: pub.code, national_id: '0000000000' }), 404);
});

test('user management: only manage_users holders; nobody grants themselves approval', async () => {
  const users = await U.mohammadali.ok('GET', '/users');
  const r1 = users.find((u) => u.username === 'reserve01');
  assert.equal(await U.reserve01.status('PUT', `/users/${r1.id}`, { full_name: r1.full_name, active: true, perms: { ...r1.perms, approve: true } }), 403);
  assert.equal(await U.ali.status('POST', '/users', { username: 'x1', full_name: 'x', password: '12345678' }), 403);
  const me = users.find((u) => u.username === 'mohammadali');
  assert.equal(await U.mohammadali.status('PUT', `/users/${me.id}`, { full_name: me.full_name, active: true, perms: { ...me.perms, manage_users: false } }), 400);
  await U.mohammadali.ok('PUT', `/users/${r1.id}`, { full_name: r1.full_name, title: r1.title, active: true, perms: { ...r1.perms, steward: true } });
  assert.ok((await U.reserve01.ok('GET', '/me')).user.perms.steward);
});

test('reports are scoped and export to Excel; backups for user managers', async () => {
  const mine = await U.morteza.ok('GET', '/reports/inventory');
  assert.ok(mine.rows.every((r) => r[0] === 'انبار صوت مسجد'));
  assert.equal(await U.morteza.status('GET', `/reports/inventory?warehouse=${W['انبار رسانه']}`), 403);
  const ex = await U.ali.ok('GET', '/reports/exits?from=2000-01-01&to=2100-01-01');
  assert.ok(ex.rows.length >= 5);
  const x = await U.ali.req('GET', `/reports/cards?format=xlsx&_wpnonce=${U.ali.nonce}`);
  assert.equal(x.status, 200);
  assert.equal(x.data.subarray(0, 2).toString(), 'PK');
  assert.equal(await U.morteza.status('GET', '/reports/tickets'), 404, 'ticket report only for ticket staff');
  assert.equal(await U.ali.status('POST', '/backups'), 403);
  assert.match((await U.mehdi.ok('POST', '/backups')).name, /^anbar-/);
});
