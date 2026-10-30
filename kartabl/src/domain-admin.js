/* =====================================================================
   قواعد مدیریت سامانه: کاربران، رمزها، دسترسی‌ها، عضویت، تأیید مدیریتی، تنظیمات
   (مشترک بین مرورگر و سرور)
   ===================================================================== */
const DEFAULTS = JSON.parse(JSON.stringify({ units: UNITS, services: SERVICES, spaces: SPACES, letterCats: LETTER_CATS, leaveTypes: LEAVE_TYPES }));

/* ---------- مهاجرت داده و اعمال تنظیمات ---------- */
function migrate(D) {
  D.logins = D.logins || []; D.sessions = D.sessions || []; D.signups = D.signups || [];
  const s = D.settings;
  const def = {
    loginTitle: 'کارتابل اداری', subtitle: 'مجتمع مسجدمحور', loginText: 'سامانه یکپارچه مکاتبات، دستورات، ارجاع وظایف، درخواست‌ها، رزروها، اموال، امور مالی و منابع انسانی ۱۷ مدیریت مستقل زیر نظر امام جماعت.',
    announcement: { on: false, text: '', tone: 'info' }, maintenance: false, showDemo: true,
    theme: { palette: 'zomorrod', scale: 14 }, security: { minLen: 6, maxFails: 5, lockMin: 15, sessionMin: 60 },
    clock: { city: 'آبادان', lat: 30.3392, lng: 48.3043, prayer: true }, rolePerms: {}, units: {}, unitsOff: [], extraUnits: []
  };
  for (const k in def) if (s[k] === undefined) s[k] = def[k];
  for (const k in def.security) if (s.security[k] === undefined) s.security[k] = def.security[k];
  if (!s.clock.v2) { if (s.clock.city === 'تهران' && Math.abs(s.clock.lat - 35.6892) < 0.01) Object.assign(s.clock, def.clock); s.clock.v2 = true; }
  /* مدل جدید رزرو: نوع برنامه جدا از سالن فیزیکی */
  const OLD = { fateheh: 'hosseinieh', religious: 'hosseinieh', rahian: '', ziarat: '' };
  (D.reservations || []).forEach(r => { if (r.program === undefined) { if (r.space in OLD) { r.program = r.space; r.space = OLD[r.space]; } else r.program = r.space === 'zaersara' || r.space === 'guest' ? 'lodging' : 'general'; } });
  if (s.spaces) s.spaces = s.spaces.filter(x => !(x.id in OLD));
  /* پاک‌سازی نام‌های ساختاری قدیمی از نویسه‌های نشانه‌گذاری */
  const cl = t => (typeof t === 'string' ? t.replace(/[<>"'`&]/g, '') : t);
  (D.positions || []).forEach(p => (p.title = cl(p.title)));
  (D.users || []).forEach(u => (u.name = cl(u.name)));
  (D.warehouses || []).forEach(w => (w.name = cl(w.name)));
  Object.values(s.units || {}).forEach(u => { u.name = cl(u.name); u.short = cl(u.short); });
  (s.extraUnits || []).forEach(u => { u.name = cl(u.name); u.short = cl(u.short); });
  Object.keys(s.services || {}).forEach(k => (s.services[k] = s.services[k].map(cl)));
  (s.spaces || []).forEach(x => (x.name = cl(x.name)));
  ['letterCats', 'leaveTypes'].forEach(k => { if (s[k]) s[k] = s[k].map(cl); });
  return D;
}
function applySettings() {
  const s = DB.settings;
  UNITS.splice(0, UNITS.length, ...DEFAULTS.units.map(x => ({ ...x })), ...(s.extraUnits || []).map(x => ({ ...x })));
  UNITS.forEach(u => { Object.assign(u, s.units[u.id] || {}); u.off = (s.unitsOff || []).includes(u.id); if (!SERVICES[u.id]) SERVICES[u.id] = ['امور عمومی']; });
  Object.keys(SERVICES).forEach(k => { SERVICES[k] = (s.services && s.services[k]) || (DEFAULTS.services[k] || ['امور عمومی']).slice(); });
  SPACES.splice(0, SPACES.length, ...(s.spaces || DEFAULTS.spaces).map(x => ({ ...x })));
  LETTER_CATS.splice(0, LETTER_CATS.length, ...(s.letterCats || DEFAULTS.letterCats));
  LEAVE_TYPES.splice(0, LEAVE_TYPES.length, ...(s.leaveTypes || DEFAULTS.leaveTypes));
  applyTheme();
}
const PALETTES = {
  zomorrod: { name: 'زمردی', l: ['#0f4b3a', '#0f4b3a', '#0d3a2e', '#12493a', '#2f8f88', '#e1f1ef', '#8fd9c6'], d: ['#6cc9ad', '#3c9e82', '#07110e', '#10241e', '#62c3ba', '#163532', '#6cc9ad'] },
  firouzeh: { name: 'فیروزه‌ای', l: ['#0b5e66', '#0b6670', '#0a3f45', '#0f525a', '#1f9aa3', '#dff2f3', '#8fe0e4'], d: ['#6fd0d6', '#3aa9b1', '#061214', '#0d2628', '#5ccad2', '#12333a', '#6fd0d6'] },
  lajvard: { name: 'لاجوردی', l: ['#1d3f7a', '#1f4688', '#142b55', '#1c3a6e', '#3a78c2', '#e3ecf8', '#a9c6f2'], d: ['#8fb4ee', '#5585cf', '#070d18', '#101d33', '#7aa6e8', '#15243d', '#8fb4ee'] },
  kahroba: { name: 'کهربایی', l: ['#6b4a12', '#7a5414', '#3d2c10', '#523b16', '#b07d2a', '#f6ecd9', '#f0cf8e'], d: ['#e7c27a', '#c49a4a', '#120d05', '#251b0c', '#d9b067', '#33270f', '#e7c27a'] },
  anar: { name: 'اناری', l: ['#7a1f2b', '#86222f', '#4a131b', '#621a24', '#b8434f', '#f8e4e6', '#f2a7af'], d: ['#ef9aa3', '#c55a66', '#14070a', '#2a1014', '#e3808b', '#3a171c', '#ef9aa3'] }
};
function applyTheme() {
  if (typeof document === 'undefined') return;
  const t = DB.settings.theme; const p = PALETTES[t.palette] || PALETTES.zomorrod;
  const v = a => `--accent:${a[0]};--btn:${a[1]};--side:${a[2]};--side-2:${a[3]};--teal:${a[4]};--teal-soft:${a[5]};--glow:${a[6]};`;
  let el = document.getElementById('theme-vars');
  if (!el) { el = document.createElement('style'); el.id = 'theme-vars'; document.head.appendChild(el); }
  el.textContent = `:root{${v(p.l)}font-size:${t.scale}px}
  @media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${v(p.d)}}}
  :root[data-theme="dark"]{${v(p.d)}}`;
}

/* ---------- کاربران، رمزها و عضویت ---------- */
const adminPositions = () => DB.positions.filter(p => p.role !== 'imam' && permOf(p, 'admin.signups')).map(p => p.id);
const adminAlerts = () => (can('admin.signups') ? DB.signups.filter(x => x.status === 'در انتظار بررسی').length : 0) + (can('admin.users') ? lockedUsers().length : 0);
const lockedUsers = () => DB.users.filter(u => !u.deleted && u.lockedUntil && new Date(u.lockedUntil) > new Date());
const USERNAME_RE = /^[a-z0-9._-]{3,24}$/i;
function setPassword(u, pass, mustChange, self) {
  if (!self && !can('admin.passwords')) return fail('تعیین رمز کاربران فقط برای مدیر سامانه مجاز است.');
  if (!self && u.id === ME.user.id) return fail('رمز خودتان را از «حساب کاربری من» تغییر دهید.');
  if (!self && u.posId && isSensitivePos(posById(u.posId)) && !isImam()) return fail('تعیین رمز متصدی جایگاه حساس فقط با امام جماعت است.');
  pass = en(pass || '');
  if (pass.length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  if (self && pwCheck(u.pass, pass)) return fail('رمز جدید باید با رمز فعلی متفاوت باشد.');
  u.pass = pwHash(pass); u.mustChange = !!mustChange; u.passChanged = stamp(); u.fails = 0; u.lockedUntil = '';
  audit(self ? 'تغییر رمز توسط کاربر' : 'تعیین رمز توسط مدیر', 'user', u.id, u.username + (mustChange ? ' · تغییر در ورود بعدی الزامی' : ''));
  return u;
}
const genPass = () => { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
function createUser2(v) {
  if (!can('admin.users')) return fail('افزودن کاربر مجاز نیست.');
  if (!v.name) return fail('نام کاربر را بنویسید.');
  if (!USERNAME_RE.test(v.username || '')) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted)) return fail('این نام کاربری قبلاً ثبت شده است.');
  if (en(v.pass || '').length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  const u = { id: 'u' + uid(), name: v.name, username: v.username, pass: pwHash(v.pass), posId: '', active: true, phone: en(v.phone || ''), nid: en(v.nid || ''), hired: v.hired || todayISO(), mustChange: !!v.mustChange, created: stamp() };
  DB.users.push(u);
  audit('ایجاد کاربر', 'user', u.id, u.username);
  if (v.posId) { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  return u;
}
function updateUser(u, v) {
  if (!can('admin.users')) return fail('ویرایش کاربر مجاز نیست.');
  if (u.deleted) return fail('این حساب حذف شده است.');
  if (u.posId && isSensitivePos(posById(u.posId)) && !isImam() && u.id !== ME.user.id) return fail('ویرایش حساب متصدی جایگاه حساس فقط با امام جماعت است.');
  if (!v.name) return fail('نام را بنویسید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری معتبر نیست.');
  if (DB.users.some(x => x.id !== u.id && x.username === v.username && !x.deleted)) return fail('این نام کاربری متعلق به کاربر دیگری است.');
  const ch = ['name', 'username', 'phone', 'nid'].filter(k => String(u[k] || '') !== String(v[k] || ''));
  Object.assign(u, { name: v.name, username: v.username, phone: en(v.phone || ''), nid: en(v.nid || '') });
  if (v.posId !== (u.posId || '')) {
    if (!v.posId) { const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO(); u.posId = ''; audit('برداشتن جایگاه کاربر', 'user', u.id, u.username); }
    else { const r = assignHolder(v.posId, u.id); if (r && r.error) return r; }
  }
  if (ch.length) audit('ویرایش کاربر', 'user', u.id, u.username + ' · ' + ch.join('، '));
  return u;
}
function deleteUser(u) {
  if (!can('admin.users')) return fail('حذف کاربر مجاز نیست.');
  if (u.id === ME.user.id) return fail('حساب خودتان را نمی‌توانید حذف کنید.');
  if (u.posId && isSensitivePos(posById(u.posId)) && !isImam()) return fail('حذف متصدی جایگاه حساس فقط با امام جماعت است.');
  const h = DB.posHistory.find(x => x.userId === u.id && !x.to); if (h) h.to = todayISO();
  u.deleted = true; u.active = false; u.posId = '';
  DB.sessions.filter(s => s.uid === u.id && s.active).forEach(s => { s.active = false; s.end = stamp(); });
  audit('حذف کاربر', 'user', u.id, u.username + ' (سوابق اقدامات حفظ شد)');
  return u;
}
function setPosPerm(pos, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  if (!PERMS.some(p => p[0] === k) || !['', 'allow', 'deny'].includes(val || '')) return fail('مجوز نامعتبر است.');
  if (pos.id === ME.pos.id) return fail('تغییر دسترسی جایگاه خودتان مجاز نیست؛ این کار با امام جماعت است.');
  if (pos.role === 'imam') return fail('دسترسی امام جماعت قابل تغییر نیست.');
  if (isSensitivePerm(k) && val === 'allow' && !isImam()) return fail(`اعطای «${permLabel(k)}» مجوز حساس است و فقط با امام جماعت انجام می‌شود.`);
  pos.perms = pos.perms || {};
  if (!val) delete pos.perms[k]; else pos.perms[k] = val;
  audit(val === 'allow' ? 'اعطای دسترسی' : val === 'deny' ? 'سلب دسترسی' : 'بازگشت دسترسی به پیش‌فرض', 'perm', pos.id, posLabel(pos.id) + ' · ' + permLabel(k));
  notify([pos.id], 'decision', `سطح دسترسی «${permLabel(k)}» برای جایگاه شما ${val === 'allow' ? 'اعطا' : val === 'deny' ? 'سلب' : 'به حالت پیش‌فرض بازگردانده'} شد.`, 'profile');
  return pos;
}
function setRolePerm(role, k, val) {
  if (!can('admin.perms')) return fail('تعیین دسترسی مجاز نیست.');
  if (!ROLES[role] || role === 'imam') return fail('نقش نامعتبر است.');
  if (!PERMS.some(p => p[0] === k) || !['', 'allow', 'deny'].includes(val || '')) return fail('مجوز نامعتبر است.');
  if (isSensitivePerm(k) && val === 'allow' && !isImam()) return fail(`اعطای «${permLabel(k)}» به یک نقش، مجوز حساس است و فقط با امام جماعت انجام می‌شود.`);
  if (role === myRole() && !isImam()) return fail('تغییر دسترسی نقش خودتان مجاز نیست.');
  const rp = DB.settings.rolePerms; rp[role] = rp[role] || {};
  if (!val) delete rp[role][k]; else rp[role][k] = val;
  audit('تغییر ماتریس دسترسی نقش', 'perm', role, ROLES[role] + ' · ' + permLabel(k) + ' · ' + (val || 'پیش‌فرض'));
  return rp;
}
function createSignup(v) {
  if (!v.name || !v.username || !v.phone || !v.unitId || !v.title || !v.pass) return fail('همه بخش‌های ستاره‌دار را تکمیل کنید.');
  if (!USERNAME_RE.test(v.username)) return fail('نام کاربری باید ۳ تا ۲۴ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  if (DB.users.some(u => u.username === v.username && !u.deleted) || DB.signups.some(s => s.username === v.username && s.status === 'در انتظار بررسی')) return fail('این نام کاربری قبلاً گرفته شده است.');
  if (!/^0?9\d{9}$/.test(en(v.phone).replace(/\D/g, ''))) return fail('شماره همراه معتبر نیست.');
  if (en(v.pass).length < DB.settings.security.minLen) return fail(`رمز عبور باید دست‌کم ${fa(DB.settings.security.minLen)} نویسه باشد.`);
  DB.seq.signup = (DB.seq.signup || 0) + 1;
  const s = { id: uid(), no: 'S-' + pad(DB.seq.signup, 4), name: v.name, username: v.username, phone: en(v.phone), unitId: +v.unitId, title: v.title, note: v.note || '', passHash: pwHash(v.pass), status: 'در انتظار بررسی', created: stamp() };
  DB.signups.push(s);
  audit('درخواست عضویت', 'signup', s.id, s.username);
  notify(adminPositions(), 'request', `درخواست عضویت جدید: ${s.name} (${unitShort(s.unitId)})`, 'admin', s.no);
  return s;
}
function decideSignup(sg, ok, v) {
  if (!can('admin.signups')) return fail('بررسی درخواست عضویت مجاز نیست.');
  if (sg.status !== 'در انتظار بررسی') return fail('این درخواست قبلاً بررسی شده است.');
  if (!ok) { if (!v.note) return fail('علت رد را بنویسید.'); sg.status = 'ردشده'; sg.reason = v.note; audit('رد درخواست عضویت', 'signup', sg.id, sg.username); return sg; }
  let posId = v.posId;
  if (!posId) return fail('جایگاه سازمانی را انتخاب کنید.');
  if (posId === 'new') { const p = addPosition({ unitId: sg.unitId, title: sg.title }); if (p.error) return p; posId = p.id; }
  if (DB.users.some(u => u.username === sg.username && !u.deleted)) return fail('این نام کاربری در این فاصله توسط کاربر دیگری گرفته شده است.');
  const u = { id: 'u' + uid(), name: sg.name, username: sg.username, pass: sg.passHash, posId: '', active: true, phone: sg.phone, hired: todayISO(), created: stamp() };
  DB.users.push(u);
  const r = assignHolder(posId, u.id); if (r && r.error) return r;
  sg.status = 'تأییدشده'; sg.userId = u.id;
  audit('تأیید درخواست عضویت', 'signup', sg.id, sg.username + ' ← ' + posLabel(posId));
  return sg;
}

/* ---------- تأیید و رد مدیریتی همه موارد معلق ---------- */
function overrideAs(posId, fn) {
  const real = ME;
  ME = { user: real.user, pos: posById(posId), override: true, realPos: real.pos.id };
  try { return fn(); } finally { ME = real; }
}
function pendingAll() {
  const out = [];
  const age = t => daysBetween(isoOfStamp(t), todayISO());
  DB.requests.filter(r => r.status === 'جاری' && r.stage === 3).forEach(r => out.push({ k: 'req', id: r.id, no: r.no, type: 'درخواست', title: r.title, unit: r.toUnit, wait: r.needsImam ? 'P0' : unitPos(r.toUnit, 'manager')?.id, age: age(r.created),
    ok: n => reqAct(r, 'approve', n), no_: n => reqAct(r, 'reject', n) }));
  DB.orders.filter(o => o.status === 'منتظر تأیید').forEach(o => out.push({ k: 'order', id: o.id, no: o.no, type: 'دستور', title: o.title, unit: o.units[0], wait: 'P0', age: age(o.created), ok: n => orderDecide(o, true, n), no_: n => orderDecide(o, false, n) }));
  DB.payreqs.filter(p => p.status === 'جاری').forEach(p => { const s = nextPayStage(p); out.push({ k: 'pay', id: p.id, no: p.no, type: 'پرداخت · ' + PAY_ST[s], title: p.title + ' — ' + money(p.amount), unit: p.unitId, wait: s === 1 ? unitPos(p.unitId, 'manager').id : s === 2 ? unitPos(U_FIN, 'office').id : s === 3 ? 'P0' : unitPos(U_FIN, 'manager').id, age: age(p.created), needDoc: s === 4, ok: (n, doc) => payAct(p, true, n, doc), no_: n => payAct(p, false, n) }); });
  DB.reservations.filter(r => r.status === 'در انتظار تأیید').forEach(r => out.push({ k: 'res', id: r.id, no: r.no, type: 'رزرو', title: resPlace(r) + ' — ' + r.kind + ' (' + jd(r.date) + ')', unit: resUnit(r), wait: unitPos(resUnit(r), 'manager')?.id, age: age(r.created), ok: n => resDecide(r, 'تأییدشده', n), no_: n => resDecide(r, 'ردشده', n) }));
  DB.leaves.filter(l => l.status.startsWith('در انتظار')).forEach(l => out.push({ k: 'leave', id: l.id, no: l.no, type: 'مرخصی', title: (userById(l.uid) || {}).name + ' — ' + l.type, unit: l.unitId, wait: l.status === 'در انتظار تأیید مدیر' ? ((posById(l.pos) || {}).role === 'manager' ? 'P0' : unitPos(l.unitId, 'manager')?.id) : unitPos(U_ADMIN, 'manager')?.id, age: age(l.created), ok: n => leaveAct(l, true, n), no_: n => leaveAct(l, false, n) }));
  DB.movements.filter(m => m.status === 'در انتظار تأیید').forEach(m => { const a = DB.assets.find(x => x.id === m.assetId); out.push({ k: 'asset', id: a.id, no: m.no, type: 'گردش کالا · ' + m.type, title: a.name + ' (' + a.code + ')', unit: a.unitId, wait: unitPos(a.unitId, 'manager')?.id, age: age(m.created), ok: n => decideMovement(m, true, n), no_: n => decideMovement(m, false, n) }); });
  DB.tasks.filter(t => t.status === 'منتظر تأیید').forEach(t => out.push({ k: 'task', id: t.id, no: t.no, type: 'وظیفه', title: t.title, unit: t.unitId, wait: t.assignee === unitPos(t.unitId, 'manager').id ? t.assignee : unitPos(t.unitId, 'manager').id, age: age(t.created), ok: n => taskAct(t, 'approve', n), no_: n => taskAct(t, 'return', n) }));
  return out.filter(x => x.wait).sort((a, b) => b.age - a.age);
}

/* ---------- اوقات شرعی (روش ژئوفیزیک دانشگاه تهران) ---------- */
function prayerTimes(iso, lat, lng, tz = 3.5) {
  const rad = d => (d * Math.PI) / 180, deg = r => (r * 180) / Math.PI;
  const fix = (a, b) => a - b * Math.floor(a / b);
  let [y, m, d] = iso.split('-').map(Number);
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jdate = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5 - lng / (15 * 24);
  const sun = t => {
    const D = jdate + t - 2451545, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
    const L = fix(q + 1.915 * Math.sin(rad(g)) + 0.02 * Math.sin(rad(2 * g)), 360), e = 23.439 - 0.00000036 * D;
    const RA = deg(Math.atan2(Math.cos(rad(e)) * Math.sin(rad(L)), Math.cos(rad(L)))) / 15;
    return { decl: deg(Math.asin(Math.sin(rad(e)) * Math.sin(rad(L)))), eqt: q / 15 - fix(RA, 24) };
  };
  const mid = t => fix(12 - sun(t).eqt, 24);
  const angT = (ang, t, ccw) => { const dc = sun(t).decl, n = mid(t); const T = deg(Math.acos((-Math.sin(rad(ang)) - Math.sin(rad(dc)) * Math.sin(rad(lat))) / (Math.cos(rad(dc)) * Math.cos(rad(lat))))) / 15; return n + (ccw ? -T : T); };
  const adj = h => h + tz - lng / 15;
  const t = { fajr: adj(angT(17.7, 5 / 24, true)), sunrise: adj(angT(0.833, 6 / 24, true)), dhuhr: adj(mid(0.5)), sunset: adj(angT(0.833, 0.75)), maghrib: adj(angT(4.5, 0.75)), isha: adj(angT(14, 0.75)) };
  t.midnight = t.sunset + (t.fajr + 24 - t.sunset) / 2;
  return t;
}
const PRAYER_NAMES = [['fajr', 'اذان صبح'], ['sunrise', 'طلوع آفتاب'], ['dhuhr', 'اذان ظهر'], ['sunset', 'غروب آفتاب'], ['maghrib', 'اذان مغرب'], ['midnight', 'نیمه‌شب شرعی']];
const hToHM = h => { h = ((h % 24) + 24) % 24; let H = Math.floor(h), M = Math.round((h - H) * 60); if (M === 60) { H = (H + 1) % 24; M = 0; } return pad(H) + ':' + pad(M); };
const hmToMin = s => { const [a, b] = s.split(':').map(Number); return a * 60 + b; };
function todayPrayers() {
  const c = DB.settings.clock;
  const t = prayerTimes(todayISO(), +c.lat, +c.lng);
  return PRAYER_NAMES.map(([k, l]) => ({ k, l, t: hToHM(t[k]) }));
}
const hijri = () => { try { return new Intl.DateTimeFormat('fa-IR-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); } catch (e) { return ''; } };
const greg = () => new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

