'use strict';
// End-to-end tests against a running WordPress with the plugin active.
// Usage: WP_URL=http://127.0.0.1:8080 WP_ADMIN_PASS=admin123 node --test wordpress-plugin/tests/api.test.js
// Uses a fresh install: the test creates users ali / reza / hasan.
const { test } = require('node:test');
const assert = require('node:assert/strict');

const SITE = process.env.WP_URL || 'http://127.0.0.1:8080';
const ADMIN_PASS = process.env.WP_ADMIN_PASS || 'admin123';

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
    const res = await fetch(SITE + '/anbar/', { headers: { cookie: this.cookie } });
    const html = await res.text();
    this.nonce = /"nonce":"(\w+)"/.exec(html)[1];
  }
  async req(method, url, body) {
    const u = SITE + '/wp-json/anbar/v1' + url.replace(/^\/api/, '');
    const res = await fetch(u, {
      method, redirect: 'manual',
      headers: { ...(this.nonce ? { 'X-WP-Nonce': this.nonce } : {}), cookie: this.cookie, ...(body ? { 'content-type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    this.store(res);
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    if (data && data.message && !data.error) data.error = data.message;
    return { status: res.status, data };
  }
  async ok(method, url, body) {
    const r = await this.req(method, url, body);
    assert.equal(r.status, 200, `${method} ${url} → ${r.status} ${JSON.stringify(r.data)}`);
    return r.data;
  }
  async login(username, password) {
    this.jar = {}; this.nonce = '';
    const r = await this.ok('POST', '/api/login', { username, password });
    await this.refreshNonce();
    return r;
  }
}
const admin = new Client();
const kitchenMgr = new Client();
const mediaMgr = new Client();
const plain = new Client();
const ids = {};

test('login is required and wrong passwords are refused', async () => {
  assert.equal((await new Client().req('GET', '/api/bootstrap')).status, 401);
  assert.equal((await new Client().req('POST', '/api/login', { username: 'admin', password: 'nope' })).status, 401);
  await admin.login('admin', ADMIN_PASS);
  const boot = await admin.ok('GET', '/api/bootstrap');
  assert.equal(boot.user.role, 'admin');
  assert.equal(boot.warehouses.length, 8);
  ids.wh = Object.fromEntries(boot.warehouses.map((w) => [w.name, w.id]));
  assert.ok(boot.warehouses.find((w) => w.name === 'انبار داروخانه').tracks_expiry);
});

test('admin creates users and assigns warehouses (one user can manage several)', async () => {
  const k = await admin.ok('POST', '/api/users', { full_name: 'علی آشپزخانه', username: 'ali', password: 'secret1', managed: [ids.wh['انبار آشپزخانه'], ids.wh['انبار داروخانه']] });
  const m = await admin.ok('POST', '/api/users', { full_name: 'رضا رسانه', username: 'reza', password: 'secret2', managed: [ids.wh['انبار رسانه']] });
  await admin.ok('POST', '/api/users', { full_name: 'حسن', username: 'hasan', password: 'secret3' });
  ids.ali = k.id; ids.reza = m.id;
  await kitchenMgr.login('ali', 'secret1');
  await mediaMgr.login('reza', 'secret2');
  await plain.login('hasan', 'secret3');
  const me = await kitchenMgr.ok('GET', '/api/me');
  assert.equal(me.user.must_change_pw, true);
  assert.deepEqual(me.user.managed.sort(), [ids.wh['انبار آشپزخانه'], ids.wh['انبار داروخانه']].sort());
});

test('items: decimals, permissions, and refusing to issue more than stock', async () => {
  const cable = await mediaMgr.ok('POST', '/api/items', {
    warehouse_id: ids.wh['انبار رسانه'], name: 'کابل صوت', unit: 'متر', min_qty: '۱۰', opening_qty: '۱۲٫۵', location: 'قفسه ۲',
  });
  ids.cable = cable.id;
  let item = await mediaMgr.ok('GET', `/api/items/${cable.id}`);
  assert.equal(item.qty, 12.5);
  assert.equal(item.history.length, 1);
  // A manager of another warehouse and a plain user can see but not change it.
  assert.equal((await kitchenMgr.req('POST', `/api/items/${cable.id}/out`, { qty: 1, reason: 'consume' })).status, 403);
  assert.equal((await plain.req('PUT', `/api/items/${cable.id}`, { ...item, name: 'x' })).status, 403);
  assert.equal((await plain.ok('GET', '/api/items?q=کابل')).length, 1);
  const tooMuch = await mediaMgr.req('POST', `/api/items/${cable.id}/out`, { qty: 13, reason: 'consume' });
  assert.equal(tooMuch.status, 400);
  assert.match(tooMuch.data.error, /بیشتر از موجودی/);
  await mediaMgr.ok('POST', `/api/items/${cable.id}/out`, { qty: '3.2', reason: 'consume', party: 'مراسم' });
  item = await mediaMgr.ok('GET', `/api/items/${cable.id}`);
  assert.equal(item.qty, 9.3);
  // Crossing the minimum notified the warehouse manager and admins.
  const notes = await admin.ok('GET', '/api/notifications');
  assert.ok(notes.some((n) => n.kind === 'low_stock'));
});

test('adjustment needs a reason and keeps history', async () => {
  const r = await mediaMgr.req('POST', `/api/items/${ids.cable}/adjust`, { new_qty: 9 });
  assert.equal(r.status, 400);
  await mediaMgr.ok('POST', `/api/items/${ids.cable}/adjust`, { new_qty: 9, note: 'شمارش ماهانه' });
  const item = await mediaMgr.ok('GET', `/api/items/${ids.cable}`);
  assert.equal(item.qty, 9);
  assert.equal(item.history[0].reason, 'adjust');
  assert.equal(item.history[0].delta, -0.3);
});

test('loans: separate on-loan quantity and partial returns', async () => {
  const cam = await mediaMgr.ok('POST', '/api/items', { warehouse_id: ids.wh['انبار رسانه'], name: 'دوربین', unit: 'عدد', opening_qty: 3, serial: 'SN-1' });
  const loan = await mediaMgr.ok('POST', `/api/items/${cam.id}/loan`, { qty: 2, borrower: 'محمد', program: 'اردو', due_date: '2020-01-01' });
  let item = await mediaMgr.ok('GET', `/api/items/${cam.id}`);
  assert.equal(item.qty, 1);
  assert.equal(item.loaned_qty, 2);
  await mediaMgr.ok('POST', `/api/loans/${loan.loan_id}/return`, { qty: 1 });
  item = await mediaMgr.ok('GET', `/api/items/${cam.id}`);
  assert.equal(item.qty, 2);
  assert.equal(item.loaned_qty, 1);
  assert.equal(item.loans[0].status, 'open');
  assert.equal((await mediaMgr.req('POST', `/api/loans/${loan.loan_id}/return`, { qty: 2 })).status, 400);
  await mediaMgr.ok('POST', `/api/loans/${loan.loan_id}/return`, { qty: 1 });
  item = await mediaMgr.ok('GET', `/api/items/${cam.id}`);
  assert.equal(item.loans[0].status, 'closed');
  assert.equal(item.loaned_qty, 0);
});

test('expiry batches: first-expiring batch is issued first', async () => {
  const rice = await kitchenMgr.ok('POST', '/api/items', { warehouse_id: ids.wh['انبار آشپزخانه'], name: 'برنج', unit: 'کیلوگرم', opening_qty: 10, batch_no: 'B-LATE', expiry: '2030-01-01' });
  ids.rice = rice.id;
  await kitchenMgr.ok('POST', `/api/items/${rice.id}/in`, { qty: 5, reason: 'purchase', batch_no: 'B-EARLY', expiry: '2027-01-01' });
  assert.equal((await kitchenMgr.req('POST', `/api/items/${rice.id}/in`, { qty: 5, reason: 'purchase' })).status, 400);
  const out = await kitchenMgr.ok('POST', `/api/items/${rice.id}/out`, { qty: 7, reason: 'consume' });
  const receipt = await kitchenMgr.ok('GET', `/api/transactions/${out.tx_id}`);
  const alloc = JSON.parse(receipt.batch_alloc);
  assert.deepEqual(alloc.map((a) => [a.batch_no, a.qty]), [['B-EARLY', 5], ['B-LATE', 2]]);
  const item = await kitchenMgr.ok('GET', `/api/items/${rice.id}`);
  assert.equal(item.qty, 8);
  assert.deepEqual(item.batches.map((b) => b.qty), [8]);
});

test('transfers stay in transit until the destination confirms', async () => {
  const sent = await kitchenMgr.ok('POST', `/api/items/${ids.rice}/transfer`, { to_wh: ids.wh['انبار مسجد'], qty: 3 });
  let src = await kitchenMgr.ok('GET', `/api/items/${ids.rice}`);
  assert.equal(src.qty, 5);
  assert.equal(src.transit_qty, 3);
  // Origin manager cannot confirm on behalf of the destination.
  assert.equal((await kitchenMgr.req('POST', `/api/transfers/${sent.transfer_id}/receive`)).status, 403);
  await admin.ok('POST', `/api/transfers/${sent.transfer_id}/receive`, {});
  src = await kitchenMgr.ok('GET', `/api/items/${ids.rice}`);
  assert.equal(src.transit_qty, 0);
  const dest = await admin.ok('GET', `/api/items?warehouse=${ids.wh['انبار مسجد']}&q=برنج`);
  assert.equal(dest[0].qty, 3);
  // Rejected transfer returns stock to origin.
  const t2 = await kitchenMgr.ok('POST', `/api/items/${ids.rice}/transfer`, { to_wh: ids.wh['انبار مسجد'], qty: 1 });
  assert.equal((await admin.req('POST', `/api/transfers/${t2.transfer_id}/reject`, {})).status, 400);
  await admin.ok('POST', `/api/transfers/${t2.transfer_id}/reject`, { note: 'لازم نیست' });
  src = await kitchenMgr.ok('GET', `/api/items/${ids.rice}`);
  assert.equal(src.qty, 5);
});

test('requests do not change stock; review notifies the requester', async () => {
  const before = (await plain.ok('GET', `/api/items/${ids.cable}`)).qty;
  const r = await plain.ok('POST', '/api/requests', { warehouse_id: ids.wh['انبار رسانه'], item_id: ids.cable, qty: 2, reason: 'جلسه', kind: 'use' });
  assert.equal((await plain.ok('GET', `/api/items/${ids.cable}`)).qty, before);
  assert.ok((await mediaMgr.ok('GET', '/api/notifications')).some((n) => n.kind === 'request_new'));
  assert.equal((await plain.req('POST', `/api/requests/${r.id}/review`, { decision: 'approve' })).status, 403);
  await mediaMgr.ok('POST', `/api/requests/${r.id}/review`, { decision: 'approve' });
  assert.ok((await plain.ok('GET', '/api/notifications')).some((n) => n.kind === 'request_result'));
  await mediaMgr.ok('POST', `/api/items/${ids.cable}/out`, { qty: 2, reason: 'consume', request_id: r.id });
  const mine = await plain.ok('GET', '/api/requests?scope=mine');
  assert.equal(mine[0].status, 'delivered');
});

test('archiving keeps history; reports export to xlsx; backups', async () => {
  await mediaMgr.ok('POST', `/api/items/${ids.cable}/archive`, { archived: true });
  assert.equal((await admin.ok('GET', '/api/items?q=کابل')).length, 0);
  assert.equal((await admin.ok('GET', '/api/items?q=کابل&archived=1')).length, 1);
  const rep = await admin.ok('GET', '/api/reports/transactions?from=2000-01-01&to=2100-01-01');
  assert.ok(rep.rows.length >= 8);
  const x = await admin.req('GET', '/api/reports/inventory?format=xlsx');
  assert.equal(x.status, 200);
  assert.equal(x.data.subarray(0, 2).toString(), 'PK');
  assert.equal((await plain.req('POST', '/api/backups')).status, 403);
  const b = await admin.ok('POST', '/api/backups');
  assert.match(b.name, /^anbar-/);
});

test('deactivated users are logged out', async () => {
  const users = await admin.ok('GET', '/api/users');
  const hasan = users.find((u) => u.username === 'hasan');
  await admin.ok('PUT', `/api/users/${hasan.id}`, { full_name: hasan.full_name, role: 'user', active: false, managed: [] });
  assert.ok([401, 403].includes((await plain.req('GET', '/api/me')).status));
  assert.equal((await new Client().req('POST', '/api/login', { username: 'hasan', password: 'secret3' })).status, 403);
});
