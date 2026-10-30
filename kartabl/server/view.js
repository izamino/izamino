/* =====================================================================
   این فایل روی سرور و داخل همان محیط قواعد کسب‌وکار اجرا می‌شود.
   viewFor: فقط داده‌هایی که جایگاه کاربر اجازه دیدنشان را دارد (هرگز هش رمز، توکن نشست یا کلید پیامک).
   ===================================================================== */
const clone = o => JSON.parse(JSON.stringify(o));
const pickKeys = (o, keys) => { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };

function viewFor() {
  const all = isAll();
  const me = ME.user, mu = myUnit();
  const fin = canFinance() || all;
  const hr = canHR() || all;
  const adminU = can('admin.users'), adminL = can('admin.logs'), adminP = can('admin.perms');
  const V = { ver: DB.ver, seq: {}, flags: {}, registry: {} };

  V.users = DB.users.map(u => {
    if (u.id === me.id) { const c = clone(u); delete c.pass; return c; }
    const b = pickKeys(u, ['id', 'name', 'posId', 'active', 'deleted']);
    if (adminU) Object.assign(b, pickKeys(u, ['username', 'phone', 'nid', 'hired', 'lastLogin', 'lockedUntil', 'mustChange', 'passChanged', 'created', 'fails']));
    else if (hr) Object.assign(b, pickKeys(u, ['username', 'phone', 'hired']));
    return b;
  });
  V.positions = DB.positions.map(p => (adminP || adminU || p.id === ME.pos.id ? clone(p) : pickKeys(p, ['id', 'unitId', 'role', 'title'])));
  V.posHistory = adminU || hr ? clone(DB.posHistory) : DB.posHistory.filter(h => h.userId === me.id).map(clone);

  V.letters = DB.letters.filter(canSeeLetter).map(clone);
  V.orders = DB.orders.filter(canSeeOrder).map(clone);
  V.tasks = DB.tasks.filter(canSeeTask).map(clone);
  V.requests = DB.requests.filter(canSeeReq).map(clone);
  V.meetings = DB.meetings.filter(canSeeMeeting).map(clone);
  /* رزروها: اشغال فضا برای همه؛ مشخصات متقاضی فقط برای متولی، ثبت‌کننده و ناظر */
  V.reservations = DB.reservations.map(r => (canDecideRes(r) || r.by === me.id || all ? clone(r) : pickKeys(r, ['id', '_v', 'no', 'program', 'space', 'kind', 'date', 'start', 'end', 'people', 'status', 'fromUnit', 'by', 'byPos', 'created'])));
  V.warehouses = clone(DB.warehouses);
  V.assets = DB.assets.filter(canSeeAsset).map(clone);
  const seenAssets = new Set(V.assets.map(a => a.id));
  V.movements = DB.movements.filter(m => seenAssets.has(m.assetId)).map(clone);

  V.tx = fin ? clone(DB.tx) : isMgrOrOffice(mu) ? DB.tx.filter(t => t.unitId === mu).map(clone) : [];
  V.payreqs = DB.payreqs.filter(canSeePay).map(clone);
  V.budgets = fin ? clone(DB.budgets) : DB.budgets.filter(b => b.unitId === mu).map(clone);
  V.commitments = fin ? clone(DB.commitments) : DB.commitments.filter(c => c.unitId === mu && isMgrOrOffice(mu)).map(clone);

  V.leaves = DB.leaves.filter(l => hr || l.uid === me.id || (isMgr(l.unitId) && inUnit(l.unitId))).map(clone);
  ['decrees', 'missions', 'contracts'].forEach(k => { V[k] = DB[k].filter(x => hr || x.uid === me.id).map(clone); });

  Object.keys(DB.registry).forEach(u => { if (canSeeUnit(+u)) V.registry[u] = clone(DB.registry[u]); });
  V.notifs = DB.notifs.filter(n => n.pos === ME.pos.id).slice(-500).map(clone);
  V.sms = can('admin.settings') ? DB.sms.slice(-300).map(clone) : [];
  V.signups = can('admin.signups') ? DB.signups.map(s => { const c = clone(s); delete c.passHash; return c; }) : [];
  V.logins = adminL ? DB.logins.slice(-1000).map(clone) : DB.logins.filter(l => l.uid === me.id).slice(-30).map(clone);
  V.sessions = (adminL || adminU ? DB.sessions : DB.sessions.filter(s => s.uid === me.id)).slice(-300).map(s => { const c = clone(s); delete c.th; delete c.csrf; return c; });
  V.audit = (all || adminL ? DB.audit : DB.audit.filter(a => a.unit === mu)).slice(-3000).map(clone);

  V.settings = clone(DB.settings);
  if (V.settings.sms) { const k = V.settings.sms.apiKey || ''; V.settings.sms.apiKey = ''; V.settings.sms.apiKeySet = !!k; V.settings.sms.apiKeyHint = k ? '••••' + k.slice(-4) : ''; }
  if (!can('admin.backup')) V.settings.backups = [];
  return V;
}

/* صفحه ورود: فقط تنظیمات عمومی و ساختار سازمانی (بدون هیچ داده کاربر) */
function publicView() {
  const s = DB.settings;
  return {
    ver: DB.ver, users: [], publicActive: DB.users.filter(u => u.active && !u.deleted).length,
    positions: DB.positions.map(p => pickKeys(p, ['id', 'unitId', 'role', 'title'])),
    settings: { ...pickKeys(s, ['orgName', 'subtitle', 'loginTitle', 'loginText', 'theme', 'clock', 'maintenance', 'units', 'unitsOff', 'extraUnits', 'services', 'spaces', 'letterCats', 'leaveTypes']), security: { minLen: s.security.minLen, sessionMin: s.security.sessionMin }, showDemo: false, announcement: { on: false }, sms: { events: {}, roles: [] }, rolePerms: {}, backups: [] }
  };
}

/* اجازه دریافت پیوست: کاربر باید رکورد صاحب پیوست را ببیند */
const FILE_SEE = {
  letters: canSeeLetter, orders: canSeeOrder, tasks: canSeeTask, requests: canSeeReq, meetings: canSeeMeeting,
  payreqs: canSeePay, tx: () => canFinance() || isAll(), leaves: l => canHR() || isAll() || l.uid === ME.user.id
};
function fileVisible(f) {
  if (!f.ref) return f.owner === ME.user.id;
  const see = FILE_SEE[f.ref.col]; if (!see) return isAll();
  const r = (DB[f.ref.col] || []).find(x => x.id === f.ref.id);
  return !!r && see(r);
}
/* پیوست‌های تازه به رکوردی که در همان عملیات ذخیره شده‌اند گره می‌خورند */
function fileRefsIn(col, rec) {
  const out = [];
  const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk); if (typeof o.url === 'string' && o.url.startsWith('/api/files/') && o.id) out.push(o.id); else Object.values(o).forEach(walk); };
  walk(rec);
  return out;
}
globalThis.__srv = {
  getDB: () => DB, setDB: d => { DB = d; }, getME: () => ME, setME: m => { ME = m; },
  setHash: fn => { hash = fn; }, setPw: (h, c) => { pwHash = h; pwCheck = c; },
  OPS, PUBLIC_OPS, OpError, viewFor, publicView, fileVisible, fileRefsIn, migrate, applySettings, baseDB, seed, validateBackup, verifyAudit, sweepDeadlines,
  posById, userById, permOf, can, isSensitivePos, COLS, todayISO, stamp, uid, audit, notify, fa, unitShort
};
