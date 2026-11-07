/* =====================================================================
   اتصال به سرور: هر کاربر فقط داده‌های مجاز خود را از سرور می‌گیرد و هر تغییر
   به‌صورت یک «عملیات» به سرور فرستاده و آنجا بررسی و ثبت می‌شود.
   ===================================================================== */
const API = r => 'api.php?r=' + r;
const Remote = {
  session: null, csrf: '', stale: false, timer: null, ver: -1, busy: 0,
  async req(method, r, body, opts = {}) {
    let res;
    const headers = { 'X-Kartabl': '1', 'X-CSRF': this.csrf };
    if (!(body instanceof Blob) && body !== undefined) headers['Content-Type'] = 'application/json';
    for (let attempt = 0; attempt < (opts.retry ? 2 : 1); attempt++) {
      try { res = await fetch(API(r) + (opts.q || ''), { method, credentials: 'same-origin', headers, body: body === undefined ? undefined : body instanceof Blob ? body : JSON.stringify(body), cache: 'no-store' }); break; }
      catch (e) { if (attempt === (opts.retry ? 1 : 0)) return { error: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید؛ اطلاعات واردشده حفظ شده است.', offline: true }; await new Promise(x => setTimeout(x, 1200)); }
    }
    let data = {};
    try { data = await res.json(); } catch (e) { data = { error: 'پاسخ نامعتبر از سرور (' + res.status + ').' }; }
    /* پایان نشست (غیرفعال‌شدن حساب، تغییر رمز، بی‌فعالیتی): بازگشت به صفحه ورود، نه پیام قطعی ارتباط */
    if (res.status === 401 || data.ended) { this.endLocal(data.error || data.ended || 'نشست شما پایان یافته است؛ دوباره وارد شوید.'); return { error: data.error || 'نشست پایان یافته است.', ended: true }; }
    if (res.status === 403 && data.csrf && !opts.noCsrfRetry) { await this.refresh(true); return this.req(method, r, body, { ...opts, noCsrfRetry: true }); }
    if (!res.ok && !data.error) data.error = 'خطای سرور (' + res.status + ').';
    return data;
  },
  apply(r) {
    if (r.public) { DB = { settings: r.public.settings, positions: [], users: [], notifs: [], counts: r.public.counts, public: true }; applySettings(); return; }
    if (!r.state) return;
    DB = r.state; this.session = r.session; this.csrf = r.csrf || this.csrf; this.ver = DB.ver;
    applySettings();
    const u = DB.users.find(x => x.id === DB.me);
    if (u) setMe(u);
  },
  endLocal(msg) {
    const wasIn = !!ME;
    ME = null; this.csrf = ''; this.session = null; this.stop();
    saveOpenDraft();
    closeModal(true);
    if (wasIn || !$('#loginf')) this.req('GET', 'state').then(r => { this.apply(r); renderLogin(msg); });
  },
  async boot() {
    const r = await this.req('GET', 'state');
    if (r.error && !r.public && !r.state) { $('#root').innerHTML = `<div class="boot">${esc(r.error)}<br><button class="btn mt" onclick="location.reload()">تلاش دوباره</button></div>`; return; }
    this.apply(r);
    if (r.state && ME) { afterLogin(); } else renderLogin(r.message || '');
  },
  async login(username, password) {
    const r = await this.req('POST', 'login', { username, password });
    if (r.error) { if (r.public) this.apply({ public: r.public }); return r; }
    this.apply(r); return r;
  },
  async logout() { this.stop(); const r = await this.req('POST', 'logout', {}); this.session = null; this.csrf = ''; if (r.public) this.apply(r); },
  ping() { if (ME) this.req('POST', 'ping', {}); },
  /* هر عملیات همراه نسخه رکوردی که کاربر دیده و یک شناسه یکتا فرستاده می‌شود:
     - تغییر هم‌زمان دیگران بازنویسی نمی‌شود
     - تکرار ارسال (دوبار زدن یا قطع و وصل اینترنت) دوباره ثبت نمی‌شود */
  async cmd(name, args) {
    let ver = null;
    if (typeof args[0] === 'string') for (const c of ['letters', 'orders', 'tasks', 'requests', 'reservations', 'meetings', 'assets', 'movements', 'payreqs', 'vouchers', 'invoices', 'findocs', 'toolrecs', 'leaves']) { const r = (DB[c] || []).find(x => x.id === args[0]); if (r) { ver = { col: c, id: r.id, v: r._v || 0 }; break; } }
    this.busy++;
    try {
      const r = await this.req('POST', 'cmd', { name, args, ver, idem: rid() }, { retry: true });
      if (r.state) this.apply(r);
      if (r.conflict) { if (!$('.modal-bg')) route(); return { error: r.error }; }
      if (r.error) return { error: r.error, offline: r.offline };
      return r.result || {};
    } finally { this.busy--; }
  },
  async post(r, body, q) { const x = await this.req('POST', r, body, { q }); if (x.state) this.apply(x); return x; },
  async refresh(force) {
    /* هنگام تایپ در صفحه (مثلاً پیام یا فرم درون صفحه) نمایش دوباره به بعد موکول می‌شود تا متن از بین نرود */
    const ae = document.activeElement;
    if (!force && ae && ae.closest && ae.closest('#main') && (/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) || ae.isContentEditable) && !(ae.id || '').startsWith('flt-')) { this.stale = true; return; }
    const r = await this.req('GET', 'state');
    if (r.state) { this.apply(r); if (!$('.modal-bg') || force) { if (ME) route(); } else this.stale = true; }
  },
  async upload(file) {
    const r = await this.req('POST', 'upload', file, { q: '&name=' + encodeURIComponent(file.name) });
    return r.error ? r : { id: r.id, name: r.name, size: r.size, type: r.type, url: r.url };
  },
  /* بررسی تغییرات هر چند ثانیه (روی هاست اشتراکی اتصال دائمی ممکن نیست) */
  listen() {
    this.stop();
    this.timer = setInterval(async () => {
      if (!ME || this.busy || document.hidden) return;
      const r = await this.req('GET', 'ver');
      if (r.auth === false) return this.endLocal(r.message || 'نشست شما پایان یافت؛ دوباره وارد شوید.');
      if (r.ver != null && r.ver !== this.ver) { if ($('.modal-bg')) this.stale = true; else this.refresh(); }
    }, 9000);
  },
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; },
  flush() { if (this.stale && !$('.modal-bg')) { this.stale = false; this.refresh(); } }
};
document.addEventListener('focusout', () => setTimeout(() => { const ae = document.activeElement; if (Remote.stale && !(ae && ae.closest && ae.closest('#main') && /^(INPUT|TEXTAREA)$/.test(ae.tagName))) Remote.flush(); }, 300));
