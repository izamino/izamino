/* =====================================================================
   همگام‌سازی با پایگاه داده مشترک
   هر بخش پایگاه داده (کاربران، نامه‌ها، رویدادها…) یک سند جدا در مجموعه «kartabl» است؛
   سندهای بزرگ به قطعه‌های کوچک‌تر شکسته می‌شوند. اگر پایگاه مشترک در دسترس نباشد
   (نسخه مستقل یا کاربر واردنشده)، داده فقط در همین مرورگر می‌ماند.
   ===================================================================== */
const Sync = {
  db: null, col: null, mode: 'local', busy: false, readonly: false,
  last: {}, base: {}, baseJs: {}, mine: {}, counts: {}, timer: null, pending: null, queued: false,
  CHUNK: 60000,
  label() {
    if (this.mode === 'local') return 'ذخیره فقط در همین مرورگر';
    if (this.readonly) return 'دسترسی فقط مشاهده؛ تغییرات ذخیره نمی‌شود';
    return this.busy ? 'در حال ذخیره در پایگاه داده مشترک…' : 'همگام با پایگاه داده مشترک';
  },
  async init() {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    let db = null;
    try { db = await window.claude.use('db'); } catch (e) { db = null; }
    if (!db) return;
    try { this.assets = await window.claude.use('assets'); } catch (e) { this.assets = null; }
    this.db = db; this.col = db.collection('kartabl');
    let snap;
    try { snap = await this.col.get(); } catch (e) { return this.fail(e); }
    const remote = this.assemble(snap.docs);
    this.mode = 'shared';
    if (!Object.keys(remote).length) await this.pushAll();
    else this.apply(remote);
    this.col.onSnapshot(s => { const r = this.assemble(s.docs); if ($('.modal-bg')) this.pending = r; else this.apply(r); }, e => this.fail(e));
    showSync();
  },
  assemble(docs) {
    const g = {};
    docs.forEach(d => { const x = d.data(); if (!x || typeof x.k !== 'string') return; (g[x.k] = g[x.k] || []).push(x); });
    const out = {};
    for (const k in g) {
      const parts = g[k];
      const head = parts.find(p => p.i === 0); if (!head) continue;
      const set = parts.filter(p => p.rev === head.rev).sort((a, b) => a.i - b.i);
      if (set.length !== head.n) continue; // نوشتن هنوز کامل نشده است
      this.counts[k] = Math.max(this.counts[k] || 0, parts.length);
      out[k] = set.map(p => p.s).join('');
    }
    return out;
  },
  /* دفتر تغییرات محلی: هر مورد افزوده، ویرایش یا حذف‌شده تا زمانی که نسخه مشترک دقیقاً همان را
     داشته باشد دوباره اعمال می‌شود؛ بنابراین تغییرات هم‌زمان چند کاربر از بین نمی‌رود */
  key(k, x) {
    if (!x || typeof x !== 'object') return JSON.stringify(x);
    if (k === 'audit') return x.ts + '|' + x.uid + '|' + x.act + '|' + x.id;
    return x.id || (x.posId && x.userId ? x.posId + '|' + x.userId + '|' + x.from : x.unitId != null && x.year ? x.unitId + '|' + x.year : JSON.stringify(x));
  },
  norm(k, x) { if (k === 'audit' && x) { const { h, ...r } = x; return JSON.stringify(r); } return JSON.stringify(x); },
  record(k) {
    const base = this.base[k], cur = DB[k];
    if (base === undefined) return;
    const M = (this.mine[k] = this.mine[k] || new Map());
    if (Array.isArray(cur) && Array.isArray(base)) {
      const B = new Map(base.map(x => [this.key(k, x), x]));
      const C = new Map(cur.map(x => [this.key(k, x), x]));
      C.forEach((x, kx) => { if (!B.has(kx) || this.norm(k, B.get(kx)) !== this.norm(k, x)) M.set(kx, x); });
      B.forEach((x, kx) => { if (!C.has(kx)) M.set(kx, null); });
    } else if (cur && base && typeof cur === 'object' && typeof base === 'object' && !Array.isArray(cur)) {
      Object.keys(cur).forEach(f => { if (JSON.stringify(cur[f]) !== JSON.stringify(base[f])) M.set(f, cur[f]); });
      Object.keys(base).forEach(f => { if (!(f in cur)) M.set(f, undefined); });
    } else if (JSON.stringify(cur) !== JSON.stringify(base)) M.set('$', cur);
  },
  rebase(k, r) {
    const M = this.mine[k];
    if (!M || !M.size) return r;
    if (Array.isArray(r)) {
      const out = r.slice(); const idx = new Map(out.map((x, i) => [this.key(k, x), i]));
      const appended = [];
      M.forEach((v, kx) => {
        const i = idx.get(kx);
        if (v === null) { if (i === undefined) M.delete(kx); else out[i] = undefined; return; }
        if (i !== undefined && this.norm(k, out[i]) === this.norm(k, v)) { M.delete(kx); return; }
        if (i !== undefined) out[i] = v; else appended.push(v);
      });
      const res = out.filter(x => x !== undefined);
      /* شماره پیگیری تکراری (ثبت هم‌زمان در دو دستگاه): مورد محلی شماره آزاد بعدی را می‌گیرد */
      const nos = new Set(r.map(x => x && x.no).filter(Boolean));
      appended.forEach(v => {
        if (!v || !v.no || !nos.has(v.no)) return;
        const m = String(v.no).match(/^(.*[\/-])(\d+)$/); if (!m) return;
        let max = 0; res.concat(appended).forEach(x => { const mm = x && String(x.no || '').match(/^(.*[\/-])(\d+)$/); if (mm && mm[1] === m[1]) max = Math.max(max, +mm[2]); });
        const old = v.no; v.no = m[1] + pad(max + 1, m[2].length); nos.add(v.no);
        Object.keys(DB.seq).forEach(sk => { if (DB.seq[sk] < max + 1 && old.includes(sk.split('-').pop())) DB.seq[sk] = Math.max(DB.seq[sk], max + 1); });
        (v.history = v.history || []).push({ ts: stamp(), uid: 'system', pos: '', action: 'اصلاح شماره', note: `شماره ${fa(old)} هم‌زمان در دستگاه دیگری ثبت شده بود؛ شماره جدید ${fa(v.no)}` });
      });
      if (k === 'audit') {
        let prev = res.length ? res[res.length - 1].h : '00000000';
        appended.sort((x, y) => (x.ts > y.ts ? 1 : -1)).forEach(e => { const { h, ...rest } = e; const ne = { ...rest }; ne.h = hash(prev + JSON.stringify(rest)); prev = ne.h; res.push(ne); });
        return res;
      }
      return res.concat(appended);
    }
    if (r && typeof r === 'object') {
      const out = { ...r };
      M.forEach((v, f) => { if (JSON.stringify(r[f]) === JSON.stringify(v)) M.delete(f); else if (v === undefined) delete out[f]; else out[f] = v; });
      return out;
    }
    const v = M.get('$'); if (JSON.stringify(v) === JSON.stringify(r)) { M.delete('$'); return r; } return v;
  },
  apply(remote) {
    let changed = false, ahead = false;
    for (const k in remote) {
      if (remote[k] === this.baseJs[k]) continue;
      let r; try { r = JSON.parse(remote[k]); } catch (e) { continue; } // قطعه ناقص؛ در دریافت بعدی کامل می‌شود
      if (DB[k] !== undefined && JSON.stringify(DB[k]) !== this.last[k]) this.record(k); // تغییر محلیِ هنوز ارسال‌نشده
      const merged = this.rebase(k, r);
      DB[k] = merged; this.base[k] = r; this.baseJs[k] = remote[k];
      this.last[k] = remote[k];
      if (JSON.stringify(merged) !== remote[k]) ahead = true;
      changed = true;
    }
    if (ahead) this.schedule();
    if (!changed) return;
    migrate(DB); applySettings();
    try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); } catch (e) {}
    if (ME) {
      const u = userById(ME.user.id);
      if (u && u.posId) setMe(u);
      if (!$('.modal-bg')) route();
    }
  },
  flushPending() { if (this.pending) { const r = this.pending; this.pending = null; this.apply(r); } },
  schedule() {
    if (this.mode !== 'shared' || this.readonly) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), 350);
  },
  async push() {
    if (this.busy) { this.queued = true; return; }
    this.busy = true; showSync();
    try {
      for (const k of Object.keys(DB)) {
        const js = JSON.stringify(DB[k]);
        if (js === this.last[k]) continue;
        this.record(k);
        await this.write(k, js);
      }
    } catch (e) { this.fail(e); }
    this.busy = false; showSync();
    if (this.queued) { this.queued = false; this.push(); }
  },
  async pushAll() { this.last = {}; await this.push(); Object.keys(DB).forEach(k => { this.base[k] = JSON.parse(JSON.stringify(DB[k])); this.baseJs[k] = JSON.stringify(DB[k]); }); this.mine = {}; },
  async write(k, js) {
    const rev = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const n = Math.max(1, Math.ceil(js.length / this.CHUNK));
    for (let i = n - 1; i >= 0; i--) {
      const body = { k, i, n, rev, s: js.slice(i * this.CHUNK, (i + 1) * this.CHUNK) };
      try { await this.col.doc(`${k}~${i}`).set(body); }
      catch (e) { if (e && e.code === 'unavailable') { await new Promise(r => setTimeout(r, 400 + Math.random() * 600)); await this.col.doc(`${k}~${i}`).set(body); } else throw e; }
    }
    for (let i = n; i < (this.counts[k] || 0); i++) { try { await this.col.doc(`${k}~${i}`).delete(); } catch (e) {} }
    this.counts[k] = n;
    this.last[k] = js;
  },
  fail(e) {
    const c = e && e.code;
    if (c === 'not_granted' || c === 'revoked' || c === 'capability_disabled' || c === 'capability_removed') { this.readonly = this.mode === 'shared'; if (!this.readonly) this.mode = 'local'; }
    if (c === 'quota_exceeded') toast('ظرفیت پایگاه داده پر شده است؛ مدیر سامانه باید سوابق قدیمی را بایگانی کند.');
    else if (this.readonly) toast('شما دسترسی ویرایش این سامانه را ندارید؛ تغییرات ذخیره نمی‌شود.');
    showSync();
  }
};
function showSync() {
  const el = $('#syncst'); if (!el) return;
  el.textContent = Sync.label();
  el.className = 'syncst ' + (Sync.mode === 'local' ? 'local' : Sync.readonly ? 'ro' : Sync.busy ? 'busy' : 'ok');
}
