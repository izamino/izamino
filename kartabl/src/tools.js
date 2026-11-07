/* =====================================================================
   ابزارهای اختصاصی مدیریت‌ها: ثبت، مسئول پیگیری، مهلت، وضعیت، تأیید مدیر،
   قفل پس از نهایی‌شدن، سابقه تغییرات، گزارش و خروجی
   ===================================================================== */
const fKey = f => f[0].replace('*', '');
const fReq = f => f[0].endsWith('*');
const toolFields = t => t.f.map(f => { const [k0, l, ty = 'text', o] = f; const k = fKey(f); const base = { k, l, req: fReq(f) };
  switch (ty) {
    case 'area': return { ...base, t: 'textarea' };
    case 'int': return { ...base, t: 'number', hint: o && (o.min != null || o.max != null) ? `عدد صحیح${o.min != null ? ' از ' + fa(o.min) : ''}${o.max != null ? ' تا ' + fa(o.max) : ''}` : '' };
    case 'dec': return { ...base, t: 'dec', hint: o && o.max != null ? `بین ${fa(o.min || 0)} تا ${fa(o.max)}؛ اعشار مجاز (مثلاً ۳۲٫۳۶)` : 'اعشار مجاز' };
    case 'money': return { ...base, t: 'money' };
    case 'date': return { ...base, t: 'date' };
    case 'time': return { ...base, t: 'time' };
    case 'phone': return { ...base, t: 'tel' };
    case 'sel': return { ...base, t: 'select', o };
    case 'unit': return { ...base, t: 'select', o: unitOpts() };
    case 'space': return { ...base, t: 'select', o: spaceOpts() };
  }
  return base; });
const fShow = (f, v) => { const ty = f[2] || 'text'; if (v === '' || v == null) return '—'; if (ty === 'date') return jd(v); if (ty === 'money') return money(v); if (ty === 'unit') return esc(unitShort(v)); if (ty === 'space') return esc(spaceOf(v).name); if (ty === 'int' || ty === 'dec') return fa(v) + (fKey(f) === 'progress' ? '٪' : ''); if (ty === 'phone') return `<span class="code">${fa(v)}</span>`; return esc(String(v)); };
const recTitle = (t, r) => r.data.title || r.data.person || r.data.dish || (r.data.date ? jd(r.data.date) : '') || r.no;
const lowAlert = (t, r) => { if (!t.low) return ''; const [q, m] = t.low; const qty = +r.data[q] || 0, min = +r.data[m] || 0; const exp = r.data.expiry && daysBetween(todayISO(), r.data.expiry); return (qty < min ? pill('کمتر از حداقل', 'bad') : '') + (exp != null && exp <= 30 ? ' ' + pill(exp < 0 ? 'منقضی' : 'انقضا ' + fa(exp) + ' روز دیگر', exp < 0 ? 'bad' : 'warn') : ''); };

function toolView(u, key) {
  const t = toolDef(u, key); if (!t) return denied('ابزار یافت نشد.');
  const lv = toolLevel(u, key);
  if (lv === 'none') return denied('دسترسی به این ابزار برای جایگاه شما تعیین نشده است؛ مدیر بخش می‌تواند آن را فعال کند.');
  const v = vs('tool' + u + key, { st: '', mine: '' });
  const all = (DB.toolrecs || []).filter(r => r.unitId === u && r.tool === key);
  const rows = all.filter(r => (!v.st || r.status === v.st || (v.st === '__pend' && r.pending)) && (!v.mine || r.assignee === ME.pos.id || r.byPos === ME.pos.id) && textMatch(v.q, r.no, ...Object.values(r.data).map(String)) && (!v.f && !v.t || inRange(r.data.date || r.data.from || r.data.start || isoOfStamp(r.created), v.f, v.t))).sort(by('created', -1));
  const p = paged('tool' + u + key, rows);
  const shown = t.f.filter(f => !['area'].includes(f[2])).slice(0, 4);
  const sums = (t.sum || []).map(k => { const f = t.f.find(x => fKey(x) === k); return f ? tile(f[1], f[2] === 'money' ? money(sum(rows, r => r.data[k])) : numFa(sum(rows, r => r.data[k]))) : ''; }).join('');
  const lvTxt = { view: 'فقط مشاهده', own: 'ثبت و پیگیری کارهای خود و ارجاع‌شده', all: 'ثبت و ویرایش همه موارد' }[lv];
  return `<div class="toolhead"><div class="k">${ic(t.ic || 'tool')}</div><div><h2>${esc(t.t)}</h2><small>سطح دسترسی شما: ${lvTxt}${t.ap ? ' · نهایی‌شدن با تأیید مدیر' : ''}${t.conf ? ' · محرمانه' : ''}</small></div>
    <div class="row">${['own', 'all'].includes(lv) ? btn('ثبت مورد جدید', 'toolNew', { u, k: key }, '', 'plus') : ''}${btn('گزارش و چاپ', 'toolReport', { u, k: key }, 'ghost', 'chart')}${btn('خروجی اکسل (CSV)', 'toolCsv', { u, k: key }, 'ghost', 'file')}</div></div>
  <div class="chips">${['', ...t.st].map(s => `<button class="chip ${(v.st || '') === s ? 'on' : ''}" data-a="toolSt" data-key="tool${u}${key}" data-v="${esc(s)}">${s || 'همه'} <b>${fa(s ? all.filter(r => r.status === s).length : all.length)}</b></button>`).join('')}${t.ap ? `<button class="chip ${v.st === '__pend' ? 'on' : ''}" data-a="toolSt" data-key="tool${u}${key}" data-v="__pend">منتظر تأیید مدیر <b>${fa(all.filter(r => r.pending).length)}</b></button>` : ''}</div>
  ${sums ? `<div class="tiles">${sums}</div>` : ''}
  <section class="card">${filterBar('tool' + u + key, [{ k: 'q', t: 'search', l: 'جست‌وجو…' }, { k: 'mine', l: 'همه موارد', o: [['1', 'فقط کارهای من']] }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
  <div class="cb flush">${table([['شماره', r => `<span class="code">${esc(r.no)}</span>`], ...shown.map(f => [f[1], r => fShow(f, r.data[fKey(f)])]),
    ...(t.as ? [['مسئول پیگیری', r => (r.assignee ? esc(posLabel(r.assignee)) : '—')]] : []), ...(t.due ? [['مهلت', r => dueTxt(t.fin.includes(r.status) ? '' : r.due)]] : []),
    ['وضعیت', r => pill(r.status) + (r.pending ? ' ' + pill('منتظر تأیید: ' + r.pending, 'warn') : '') + (t.fin.includes(r.status) ? ' ' + ic('lock') : '') + lowAlert(t, r)]], p.rows, { click: 'toolRec', empty: 'هنوز موردی ثبت نشده است.' }) + p.more}</div></section>`;
}
A.toolSt = d => { vs(d.key).st = d.v; vs(d.key).page = 0; route(); };
A.toolRec = d => showToolRec(d.id);
A.toolNew = d => { const t = toolDef(+d.u, d.k); const F = [...toolFields(t), ...(t.as ? [{ k: 'assignee', l: 'مسئول پیگیری', t: 'select', o: posOpts(+d.u) }] : []), ...(t.due ? [{ k: 'due', l: 'مهلت', t: 'date' }] : []), { k: 'files', l: 'پیوست', t: 'file' }];
  const init = {}; t.f.forEach(f => { if (f[2] === 'date' && fReq(f)) init[fKey(f)] = todayISO(); if (fKey(f) === 'year') init.year = jYearNow(); });
  formModal('ثبت در «' + t.t + '»', F, init, v => run('toolSave', +d.u, d.k, '', v), { wide: true, done: 'ثبت شد.', reopen: r => showToolRec(r.id) }); };
function showToolRec(id) {
  const r = (DB.toolrecs || []).find(x => x.id === id); if (!r) return toast('این مورد در دسترس نیست.');
  const t = toolOf(r); const ed = canEditToolRec(r); const mg = canApproveTool(r.unitId); const lock = t.fin.includes(r.status);
  if (!$('#main') || !location.hash.startsWith('#unit-' + r.unitId)) { vs('unit' + r.unitId).tab = 'tool:' + r.tool; }
  modal({ title: t.t + ' — ' + r.no, wide: true,
    body: `<div class="row">${pill(r.status)}${r.pending ? ' ' + pill('منتظر تأیید مدیر برای «' + r.pending + '»', 'warn') : ''}${lock ? ' ' + pill('نهایی و قفل', 'mute') : ''}${lowAlert(t, r)}</div>
    ${lock ? `<div class="notice">این مورد نهایی شده و قفل است${r.approvedBy ? ' (تأیید: ' + esc(r.approvedBy) + ')' : ''}. ویرایش یا تغییر وضعیت فقط پس از بازگشایی توسط مدیر و با ثبت علت ممکن است.</div>` : ''}
    ${steps(t.st.filter(s => !['لغوشده', 'ردشده', 'انصراف', 'غیبت', 'انجام‌نشده'].includes(s)), Math.max(0, t.st.indexOf(r.status)), lock)}
    ${kv([...t.f.map(f => [f[1], f[2] === 'area' ? `<div style="white-space:pre-wrap">${esc(r.data[fKey(f)] || '—')}</div>` : fShow(f, r.data[fKey(f)])]), t.as && ['مسئول پیگیری', r.assignee ? esc(posWho(r.assignee)) : '—'], t.due && ['مهلت', dueTxt(lock ? '' : r.due)], ['ثبت‌کننده', esc(who(r.by, r.byName)) + ' — ' + esc(posLabel(r.byPos)) + ' · ' + jdt(r.created)], r.files && r.files.length && ['پیوست', files(r.files)]])}
    <div><h3>سابقه تغییرات (قبل و بعد)</h3>${histHTML(r.history)}</div>`,
    foot: `${ed && !lock ? btn('ویرایش', 'toolEdit', { id }, 'ghost', 'edit') + (r.pending ? '' : btn('تغییر وضعیت', 'toolStatus', { id }, '', 'check')) : ''}${mg && r.pending ? btn('تأیید «' + r.pending + '»', 'toolAppr', { id, ok: 1 }) + btn('رد', 'toolAppr', { id, ok: 0 }, 'danger') : ''}${mg && lock ? btn('بازگشایی', 'toolReopen', { id }, 'ghost', 'unlock') : ''}${ed || mg ? btn('یادداشت پیگیری', 'toolNote', { id }, 'ghost') : ''}${mg ? btn('حذف', 'toolDel', { id }, 'danger', 'trash') : ''}${btn('چاپ', 'print', {}, 'ghost', 'print')}` });
}
A.toolEdit = d => { const r = DB.toolrecs.find(x => x.id === d.id); const t = toolOf(r);
  const F = [...toolFields(t), ...(t.as ? [{ k: 'assignee', l: 'مسئول پیگیری', t: 'select', o: posOpts(r.unitId) }] : []), ...(t.due ? [{ k: 'due', l: 'مهلت', t: 'date' }] : []), { k: '_note', l: 'علت یا توضیح تغییر', t: 'textarea' }];
  formModal('ویرایش — ' + r.no, F, { ...r.data, assignee: r.assignee, due: r.due }, v => run('toolSave', r.unitId, r.tool, r.id, v), { wide: true, noDraft: true, done: 'تغییرات با مقدار قبل و بعد در سابقه ثبت شد.', reopen: () => showToolRec(r.id) }); };
A.toolStatus = d => { const r = DB.toolrecs.find(x => x.id === d.id); const t = toolOf(r);
  actModal('تغییر وضعیت — ' + r.no, v => run('toolStatus', r.id, v.status, v.note), { fields: [{ k: 'status', l: 'وضعیت جدید', t: 'select', o: t.st.filter(s => s !== r.status), blank: false, hint: t.ap && !canApproveTool(r.unitId) ? 'وضعیت‌های نهایی (' + t.fin.join('، ') + ') پس از تأیید مدیر اعمال می‌شوند.' : '' }], reopen: () => showToolRec(r.id) }); };
A.toolAppr = d => actModal(+d.ok ? 'تأیید مدیر' : 'رد درخواست تأیید', v => run('toolApprove', d.id, !!+d.ok, v.note), { noteReq: !+d.ok, reopen: () => showToolRec(d.id) });
A.toolReopen = d => actModal('بازگشایی مورد نهایی‌شده', v => run('toolReopen', d.id, v.note), { noteReq: true, noteLabel: 'علت بازگشایی', reopen: () => showToolRec(d.id) });
A.toolNote = d => actModal('یادداشت پیگیری', v => run('toolNote', d.id, v.note), { noteReq: true, reopen: () => showToolRec(d.id) });
A.toolDel = d => actModal('حذف مورد', v => run('toolDelete', d.id, v.note), { noteReq: true, noteLabel: 'علت حذف (در رویدادها ثبت می‌شود)', done: 'حذف شد.' });
A.toolReport = d => {
  const u = +d.u, t = toolDef(u, d.k); const v = vs('tool' + u + d.k);
  const rows = (DB.toolrecs || []).filter(r => r.unitId === u && r.tool === d.k && (!v.f && !v.t || inRange(r.data.date || r.data.from || r.data.start || isoOfStamp(r.created), v.f, v.t)));
  const late = rows.filter(r => r.due && r.due < todayISO() && !t.fin.includes(r.status));
  const byMonth = {}; rows.forEach(r => { const j = isoToJ(isoOfStamp(r.created)); const k = J_MONTHS[j[1] - 1] + ' ' + fa(j[0]); byMonth[k] = (byMonth[k] || 0) + 1; });
  modal({ title: 'گزارش ' + t.t, wide: true, body: `<div class="print-target"><h2>${esc(unitName(u))} — ${esc(t.t)}</h2><div class="hint">بازه: ${esc(v.f || 'ابتدا')} تا ${esc(v.t || 'امروز')} · تهیه: ${jdt(stamp())} · ${esc(ME.user.name)}</div>
    <div class="tiles mt">${tile('کل موارد', rows.length)}${t.st.map(s => tile(s, rows.filter(r => r.status === s).length)).join('')}${t.due ? tile('معوق', late.length, '', late.length ? 'bad' : 'ok') : ''}${(t.sum || []).map(k => { const f = t.f.find(x => fKey(x) === k); return tile('جمع ' + f[1], f[2] === 'money' ? money(sum(rows, r => r.data[k])) : numFa(sum(rows, r => r.data[k]))); }).join('')}</div>
    ${table([['ماه', x => esc(x.m)], ['تعداد', x => fa(x.n)]], Object.entries(byMonth).map(([m, n], i) => ({ id: i, m, n })), { empty: '—' })}
    ${table([['شماره', r => esc(r.no)], ...t.f.filter(f => f[2] !== 'area').slice(0, 5).map(f => [f[1], r => fShow(f, r.data[fKey(f)])]), ['وضعیت', r => esc(r.status)]], rows)}</div>`, foot: btn('چاپ', 'print', {}, '', 'print') });
};
A.toolCsv = d => {
  const u = +d.u, t = toolDef(u, d.k);
  const rows = (DB.toolrecs || []).filter(r => r.unitId === u && r.tool === d.k);
  const q = s => '"' + String(s ?? '').replace(/"/g, '""') + '"';
  const head_ = ['شماره', ...t.f.map(f => f[1]), 'وضعیت', 'مسئول پیگیری', 'مهلت', 'ثبت‌کننده', 'زمان ثبت'];
  const lines = rows.map(r => [r.no, ...t.f.map(f => { const x = r.data[fKey(f)]; return f[2] === 'date' && x ? jd(x) : f[2] === 'unit' ? unitShort(x) : x; }), r.status, r.assignee ? posLabel(r.assignee) : '', r.due ? jd(r.due) : '', who(r.by, r.byName), jdt(r.created)]);
  const csv = '﻿' + [head_, ...lines].map(l => l.map(q).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = `${t.t}-${todayISO()}.csv`; document.body.appendChild(a); a.click(); a.remove();
};
