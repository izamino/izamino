/* =====================================================================
   اتصال به سرور (نسخه عملیاتی)
   مرورگر هیچ داده‌ای ذخیره نمی‌کند؛ هر کاربر فقط داده‌های مجاز خود را از سرور می‌گیرد
   و هر تغییر به‌صورت یک درخواست به سرور فرستاده و آنجا بررسی می‌شود.
   ===================================================================== */
const Remote = {
  session: null, es: null, stale: false, csrf: '',
  async req(method, url, body, headers = {}) {
    let res;
    try {
      res = await fetch(url, { method, credentials: 'same-origin', headers: { 'X-Kartabl': '1', 'X-CSRF': this.csrf, ...(body instanceof Blob ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body) });
    } catch (e) { return { error: 'ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.' }; }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'پاسخ نامعتبر از سرور (' + res.status + ').' }; }
    if (res.status === 401 && ME) { ME = null; closeModal(); renderLogin(data.error || 'نشست شما پایان یافته است؛ دوباره وارد شوید.'); return { error: data.error || 'نشست پایان یافته است.' }; }
    if (!res.ok && !data.error) data.error = 'خطای سرور (' + res.status + ').';
    return data;
  },
  apply(r) {
    if (r.public) { DB = r.public; DB.users = DB.users || []; applySettings(); return; }
    if (!r.state) return;
    DB = r.state; this.session = r.session; this.csrf = r.csrf || this.csrf;
    applySettings();
    const u = DB.users.find(x => x.id === r.me);
    if (u) setMe(u);
  },
  async boot() {
    const r = await this.req('GET', '/api/state');
    this.apply(r);
    if (r.state && ME) { renderShell(); if (ME.user.mustChange) forcePassChange(); } else renderLogin(r.message || '');
    this.listen();
  },
  async login(username, password) {
    const r = await this.req('POST', '/api/login', { username, password });
    if (r.error) { if (r.public) this.apply({ public: r.public }); return r; }
    this.apply(r); this.listen(); return r;
  },
  async logout(msg) { await this.req('POST', '/api/logout', { msg: msg || '' }); this.session = null; if (this.es) { this.es.close(); this.es = null; } const r = await this.req('GET', '/api/state'); this.apply(r); },
  ping() { this.req('POST', '/api/ping', {}); },
  /* هر عملیات همراه نسخه رکوردی که کاربر دیده فرستاده می‌شود تا تغییر هم‌زمان دیگران بازنویسی نشود */
  async cmd(name, args) {
    let ver = null;
    if (typeof args[0] === 'string') for (const c of Object.values(COLS)) { const r = (DB[c] || []).find(x => x.id === args[0]); if (r) { ver = { col: c, id: r.id, v: r._v || 0 }; break; } }
    const r = await this.req('POST', '/api/cmd', { name, args, ver });
    if (r.state) this.apply(r);
    if (r.conflict) { if (!$('.modal-bg')) route(); return { error: r.error }; }
    if (r.error) return { error: r.error };
    return r.result || {};
  },
  async signup(v) { const r = await this.req('POST', '/api/signup', { v }); return r.error ? { error: r.error } : r.result || {}; },
  async post(url, body) { const r = await this.req('POST', url, body); if (r.state) this.apply(r); return r; },
  async refresh() { const r = await this.req('GET', '/api/state'); if (r.state) { this.apply(r); if (!$('.modal-bg')) route(); else this.stale = true; } },
  async upload(file) {
    const r = await this.req('PUT', '/api/files?name=' + encodeURIComponent(file.name), file, { 'Content-Type': file.type || 'application/octet-stream' });
    return r.error ? r : { id: r.id, name: r.name, size: r.size, type: r.type, url: '/api/files/' + r.id };
  },
  /* تغییرات دیگران: سرور فقط خبر می‌دهد که چیزی تغییر کرده و هر کاربر نسخه مجاز خودش را دوباره می‌گیرد */
  listen() {
    if (this.es || typeof EventSource === 'undefined' || !ME) return;
    this.es = new EventSource('/api/events');
    this.es.addEventListener('changed', () => { if ($('.modal-bg')) this.stale = true; else this.refresh(); });
    this.es.addEventListener('ended', e => { const m = (() => { try { return JSON.parse(e.data).msg; } catch (x) { return ''; } })(); if (this.es) { this.es.close(); this.es = null; } ME = null; closeModal(); this.req('GET', '/api/state').then(r => { this.apply(r); renderLogin(m || 'نشست شما پایان یافت.'); }); });
    this.es.onerror = () => {};
  },
  flush() { if (this.stale && !$('.modal-bg')) { this.stale = false; this.refresh(); } }
};
