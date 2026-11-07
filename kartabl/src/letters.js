/* =====================================================================
   دبیرخانه و مکاتبات: پوشه‌ها، نوشتن نامه با ویرایشگر، پیش‌نویس خودکار،
   سربرگ سیاه‌وسفید برای چاپ، ارجاع، پاسخ، مختومه و بایگانی شخصی
   ===================================================================== */
const letterTo = l => (l.type === 'in' ? 'از: ' + l.sender : 'به: ' + l.receiver);
const showSubject = l => (l.conf === 'سری' && !isImam() && !can('letters.secret') ? 'محرمانه' : l.subject);
function letterTable(rows, key = 'letters') {
  const p = paged(key, rows.slice().sort(by('updated', -1)));
  return table([
    ['', l => (isUnseen(l) ? '<span class="dotnew" title="دیده‌نشده"></span>' : '')],
    ['شماره', l => `<span class="lno">${fa(l.no)}</span><span class="sub">${LETTER_TYPES[l.type]}</span>`],
    ['موضوع', l => `<b>${esc(showSubject(l))}</b><span class="sub">${esc(letterTo(l))}</span>`],
    ['تاریخ', l => jd(l.date)], ['مدیریت', l => esc(unitShort(l.unitId))],
    ['اهمیت', l => `${prio(l.priority)} ${l.conf !== 'عادی' ? pill(l.conf) : ''}${l.files.length ? ' ' + ic('clip') : ''}`],
    ['وضعیت', l => pill(l.status) + (l.due && !['مختومه', 'پاسخ داده‌شده'].includes(l.status) ? `<span class="sub">مهلت ${jd(l.due)}</span>` : '')]
  ], p.rows, { click: 'letter', empty: 'نامه‌ای در این پوشه نیست.' }) + p.more;
}
const myInbox = l => { const mu = myUnit(); return (l.toUnit === mu || l.refs.some(r => r.unitId === mu)) && l.unitId !== mu || (l.type === 'in' && l.unitId === mu); };
PAGES.letters = () => {
  if (!can('letters.view') && !isImam()) return denied('مشاهده مکاتبات برای جایگاه شما فعال نشده است؛ مدیر بخش می‌تواند آن را فعال کند.');
  const v = vs('letters', { tab: 'unseen' });
  const all = DB.letters;
  const F = {
    unseen: l => !isArchivedMine(l) && isUnseen(l),
    inbox: l => !isArchivedMine(l) && myInbox(l) && l.status !== 'مختومه',
    sent: l => l.unitId === myUnit() && l.type !== 'in',
    seen: l => !isArchivedMine(l) && !isUnseen(l) && l.status !== 'مختومه',
    archive: l => isArchivedMine(l),
    closed: l => l.status === 'مختومه',
    all: () => true
  };
  const cnt = k => all.filter(F[k]).length;
  const drafts = (DB.drafts || []).slice().sort(by('updated', -1));
  let rows = v.tab === 'drafts' ? [] : all.filter(F[v.tab] || F.all);
  rows = rows.filter(l => textMatch(v.q, l.no, fa(l.no), l.subject, l.sender, l.receiver, htmlToText(l.body)) && (!v.ty || l.type === v.ty) && (!v.cat || l.cat === v.cat) && (!v.pr || l.priority === v.pr) && (!v.conf || l.conf === v.conf) && (v.u === undefined || v.u === '' || l.unitId === +v.u) && inRange(l.date, v.f, v.t));
  const T = [['unseen', `دیده‌نشده (${fa(cnt('unseen'))})`], ['inbox', `واردشده (${fa(cnt('inbox'))})`], ['seen', 'دیده‌شده'], ['sent', 'ارسالی'], ['drafts', `پیش‌نویس‌ها (${fa(drafts.length)})`], ['archive', `بایگانی من (${fa(cnt('archive'))})`], ['closed', 'مختومه'], ['all', 'همه']];
  const body = v.tab === 'drafts'
    ? (drafts.length ? `<div class="list">${drafts.map(d => `<a class="li" data-a="openDraft" data-id="${d.id}"><div class="k">${ic('edit')}</div><div class="t"><b>${esc(d.data.subject || 'بدون موضوع')}</b><small>${LETTER_TYPES[d.data.type] || ''} · آخرین ذخیره ${jdt(d.updated)}${d.data.due ? ' · مهلت اقدام ' + jd(d.data.due) : ''}</small></div>${pill('پیش‌نویس')}</a>`).join('')}</div>` : empty('پیش‌نویسی ندارید. متن نامه‌ها هنگام نوشتن خودکار در اینجا ذخیره می‌شود.'))
    : letterTable(rows, 'letters');
  return `${head('دبیرخانه و مکاتبات', 'نامه‌های داخلی، صادره و وارده با شماره‌گذاری خودکار، سربرگ رسمی، ارجاع، پاسخ و بایگانی', can('letters.create') ? btn('نوشتن نامه', 'newLetter', {}, '', 'edit') + btn('ثبت نامه وارده', 'newLetter', { type: 'in' }, 'ghost', 'inbox') : '')}
  ${tabs('letters', T, v.tab)}
  <section class="card">${v.tab === 'drafts' ? '' : filterBar('letters', [{ k: 'q', t: 'search', l: 'جست‌وجو در شماره، موضوع، فرستنده، متن…' }, { k: 'ty', l: 'نوع', o: Object.entries(LETTER_TYPES) }, { k: 'cat', l: 'طبقه‌بندی', o: LETTER_CATS }, { k: 'pr', l: 'اهمیت', o: PRIORITIES }, { k: 'conf', l: 'محرمانگی', o: CONF }, ...(isAll() ? [{ k: 'u', l: 'مدیریت', o: unitOpts(true) }] : []), { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
  <div class="cb flush">${body}</div></section>
  <div class="notice">«دیده‌شده» و «بایگانی من» برای هر پنل جداگانه است و روی وضعیت مشترک نامه اثری ندارد؛ پایان رسیدگی به پرونده با «مختومه» انجام می‌شود که مجوز جداگانه دارد.</div>`;
};
A.letter = d => showLetter(d.id);

/* ---------- ویرایشگر متن نامه ---------- */
const EDITOR_TOOLS = [['bold', 'bold', 'درشت'], ['italic', 'italic', 'کج'], ['underline', 'underline', 'زیرخط'], ['h3', 'file', 'عنوان'], ['insertUnorderedList', 'ul', 'فهرست'], ['insertOrderedList', 'ol', 'فهرست شماره‌دار'],
  ['al-r', 'alr', 'راست‌چین'], ['al-c', 'alc', 'وسط‌چین'], ['al-l', 'all', 'چپ‌چین'], ['al-j', 'alj', 'تراز دوطرفه'], ['table', 'table', 'جدول'], ['hr', 'menu', 'خط جداکننده'], ['undo', 'undo', 'برگرداندن'], ['clear', 'x', 'حذف قالب']];
function editorHTML(id, html, ph = 'متن نامه را اینجا بنویسید…') {
  return `<div class="editor"><div class="etb" role="toolbar" aria-label="ابزار ویرایش">${EDITOR_TOOLS.map(([c, i, l]) => `<button type="button" data-ed="${c}" data-for="${id}" title="${l}" aria-label="${l}">${ic(i)}</button>`).join('')}</div>
  <div class="ebody lbody" id="${id}" contenteditable="true" role="textbox" aria-multiline="true" data-ph="${esc(ph)}">${html || ''}</div></div>`;
}
document.addEventListener('mousedown', e => { if (e.target.closest('[data-ed]')) e.preventDefault(); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-ed]'); if (!b) return;
  const el = document.getElementById(b.dataset.for); if (!el) return; el.focus();
  const c = b.dataset.ed;
  const block = () => { const s = getSelection(); let n = s.anchorNode; while (n && n !== el && !(n.nodeType === 1 && /^(P|DIV|H3|H4|LI|TD|TH|BLOCKQUOTE)$/.test(n.tagName))) n = n.parentNode; if (!n || n === el) { document.execCommand('formatBlock', false, 'p'); n = getSelection().anchorNode; while (n && n.nodeType !== 1) n = n.parentNode; } return n; };
  if (c.startsWith('al-')) { const n = block(); if (n && n !== el) { n.classList.remove('al-r', 'al-c', 'al-l', 'al-j'); n.classList.add(c); } }
  else if (c === 'h3') document.execCommand('formatBlock', false, 'h3');
  else if (c === 'table') document.execCommand('insertHTML', false, '<table><tbody><tr><th>ردیف</th><th>شرح</th><th>توضیح</th></tr><tr><td>۱</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>۲</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>');
  else if (c === 'hr') document.execCommand('insertHorizontalRule');
  else if (c === 'clear') { document.execCommand('removeFormat'); document.execCommand('formatBlock', false, 'p'); }
  else document.execCommand(c);
  el.dispatchEvent(new Event('input', { bubbles: true }));
});
/* چسباندن از ورد و سایت‌ها: فقط متن و پاراگراف حفظ می‌شود */
document.addEventListener('paste', e => {
  const el = e.target.closest && e.target.closest('.ebody'); if (!el) return;
  e.preventDefault();
  const t = (e.clipboardData || window.clipboardData).getData('text/plain');
  document.execCommand('insertHTML', false, t.split(/\r?\n/).map(x => `<p>${esc(x) || '<br>'}</p>`).join(''));
});
const editorVal = id => { const el = document.getElementById(id); if (!el) return ''; const h = el.innerHTML.trim(); return htmlToText(h).trim() || /<table/i.test(h) ? h : ''; };
const textToHtml = t => String(t || '').split(/\r?\n/).map(x => `<p>${esc(x) || '<br>'}</p>`).join('');

/* ---------- نوشتن نامه (با ذخیره خودکار پیش‌نویس روی سرور) ---------- */
A.newLetter = d => composeLetter({ type: (d && d.type) || 'internal' });
A.openDraft = d => { const dr = (DB.drafts || []).find(x => x.id === d.id); if (dr) composeLetter({ ...dr.data }, dr.id); };
function composeLetter(init, draftId = '') {
  if (!can('letters.create')) return toast('نوشتن نامه برای جایگاه شما فعال نشده است.');
  const u = myUnit();
  const st = { id: draftId, dirty: false, saving: false, sent: false, files: (init.files || []).slice() };
  const val = (k, def = '') => (init[k] != null && init[k] !== '' ? init[k] : def);
  const signers = isImam() ? [[imamPos(), posWho(imamPos())]] : unitPositions(u).map(p => [p.id, posWho(p.id)]);
  const F = [
    { k: 'type', l: 'نوع نامه', t: 'select', o: Object.entries(LETTER_TYPES).map(([k, l]) => [k, k === 'in' ? 'وارده (ثبت نامه دریافتی)' : k === 'out' ? 'صادره (به بیرون از مجتمع)' : 'داخلی (به مدیریت دیگر)']), blank: false },
    { k: 'toUnit', l: 'مدیریت گیرنده', t: 'select', o: unitOpts(true).filter(x => x[0] !== u) },
    { k: 'receiver', l: 'گیرنده', ph: 'مثلاً: ریاست محترم اداره …' }, { k: 'sender', l: 'فرستنده', ph: 'نام سازمان یا شخص فرستنده' },
    { k: 'subject', l: 'موضوع', req: true, full: true },
    { k: 'date', l: 'تاریخ نامه', t: 'date', req: true }, { k: 'due', l: 'مهلت اقدام گیرنده', t: 'date', hint: 'اختیاری؛ برای پیگیری و اعلان نزدیک‌شدن موعد' },
    { k: 'priority', l: 'درجه اهمیت', t: 'select', o: PRIORITIES, blank: false }, { k: 'conf', l: 'سطح محرمانگی', t: 'select', o: CONF, blank: false },
    { k: 'cat', l: 'طبقه‌بندی', t: 'select', o: LETTER_CATS, blank: false }, { k: 'signer', l: 'امضاکننده', t: 'select', o: signers, blank: 'بدون امضا' },
    { k: 'needReply', l: 'پیگیری', t: 'check', cl: 'این نامه نیازمند پاسخ است' }
  ];
  const vals = { type: val('type', 'internal'), toUnit: val('toUnit'), receiver: val('receiver'), sender: val('sender'), subject: val('subject'), date: val('date', todayISO()), due: val('due'), priority: val('priority', 'عادی'), conf: val('conf', 'عادی'), cat: val('cat', 'اداری'), signer: val('signer', (unitPos(u, 'manager') || {}).id || ''), needReply: !!init.needReply };
  const bg = modal({
    title: draftId ? 'ادامه نوشتن نامه (پیش‌نویس)' : 'نوشتن نامه', wide: true,
    body: `<form class="form compose" id="lform" novalidate>${F.map(f => fieldHTML(f, vals[f.k])).join('')}
      <div class="fld full"><label>متن نامه</label>${editorHTML('lbody', init.body || '')}</div>
      <div class="fld full"><label for="f_files">پیوست‌ها</label><div id="lfiles">${files(st.files)}</div><input type="file" id="f_files" multiple><div class="hint">${fileLimitHint()}</div></div>
    </form><div class="err" id="merr" role="alert"></div>`,
    foot: `<button class="btn" type="button" id="lsend">${ic('send')}ثبت و ارسال</button><button class="btn ghost" type="button" id="lprev">${ic('eye')}پیش‌نمایش روی سربرگ</button><button class="btn ghost" type="button" id="lsave">${ic('archive')}ذخیره پیش‌نویس</button><span class="savest" id="savest" aria-live="polite">${draftId ? 'پیش‌نویس بازگشایی شد' : ''}</span>`
  });
  bg.querySelector('.modal').classList.add('full');
  const form = $('#lform', bg);
  const show = () => {
    const t = form.elements.type.value;
    const fld = k => form.elements[k].closest('.fld');
    fld('toUnit').hidden = t !== 'internal'; fld('receiver').hidden = t === 'internal'; fld('sender').hidden = t !== 'in';
    fld('signer').hidden = t === 'in'; fld('due').hidden = t === 'out';
    form.elements.receiver.closest('.fld').querySelector('label').firstChild.textContent = t === 'in' ? 'گیرنده (در مجتمع)' : 'گیرنده';
  };
  show(); form.elements.type.addEventListener('change', show);
  const collect = () => {
    const o = {}; ['type', 'toUnit', 'receiver', 'sender', 'subject', 'priority', 'conf', 'cat', 'signer'].forEach(k => (o[k] = form.elements[k].value.trim()));
    ['date', 'due'].forEach(k => { const s = form.elements[k].value.trim(); o[k] = s ? jToIso(s) || '' : ''; });
    o.needReply = form.elements.needReply.checked; o.body = editorVal('lbody'); o.files = st.files;
    return o;
  };
  const stamp_ = m => { const e = $('#savest'); if (e) e.textContent = m; };
  const save = async (manual) => {
    if (st.sent || st.saving || (!st.dirty && !manual)) return;
    const o = collect();
    if (!st.id && !o.subject && !htmlToText(o.body).trim() && !st.files.length) return;
    st.saving = true; st.dirty = false; stamp_('در حال ذخیره…');
    const r = await run('saveDraft', st.id, o);
    st.saving = false;
    if (r.error) { st.dirty = true; stamp_(r.offline ? 'ذخیره نشد (اتصال)؛ دوباره تلاش می‌شود' : r.error); return; }
    st.id = r.id; stamp_('پیش‌نویس ذخیره شد ' + fa(nowHM()));
  };
  form.addEventListener('input', () => { st.dirty = true; stamp_('تغییرات ذخیره‌نشده'); });
  form.addEventListener('change', () => { st.dirty = true; });
  const timer = setInterval(() => { if (!document.contains(form)) return clearInterval(timer); save(); }, 5000);
  /* بستن پنجره، رفتن به صفحه دیگر یا پایان نشست: پیش‌نویس ذخیره می‌شود */
  MODAL_BEFORE_CLOSE = () => { clearInterval(timer); if (!st.sent && st.dirty) { save(); toast('متن نامه در «پیش‌نویس‌ها» ذخیره شد.'); } };
  window.onbeforeunload = () => (st.dirty && !st.sent && document.contains(form) ? 'متن نامه ذخیره نشده است.' : undefined);
  $('#f_files', bg).addEventListener('change', async e => {
    for (const f of [...e.target.files]) { try { stamp_('بارگذاری ' + f.name + '…'); st.files.push(await readFile(f)); } catch (x) { $('#merr').textContent = x.message; } }
    e.target.value = ''; $('#lfiles').innerHTML = files(st.files); st.dirty = true; save();
  });
  $('#lsave', bg).addEventListener('click', () => { st.dirty = true; save(true); });
  $('#lprev', bg).addEventListener('click', () => {
    const o = collect();
    const fake = { ...o, no: '— (پس از ثبت)', unitId: u, refs: [], replies: [], status: 'پیش‌نویس', files: st.files, sender: o.type === 'internal' ? unitName(u) : o.sender || unitName(u), receiver: o.type === 'internal' ? unitName(+o.toUnit) : o.receiver, snap: { signerName: (holderOf(o.signer) || {}).name || '', signerPos: o.signer ? posLabel(o.signer) : '', unitName: unitName(u), issued: o.date } };
    const w = document.createElement('div'); w.className = 'prevwrap'; w.innerHTML = `<div class="prevbar"><b>پیش‌نمایش چاپ</b><button class="btn sm" type="button">بستن پیش‌نمایش</button></div>${letterSheet(fake)}`;
    w.querySelector('button').addEventListener('click', () => w.remove()); $('.modal', bg).appendChild(w);
  });
  $('#lsend', bg).addEventListener('click', async e => {
    const b = e.currentTarget; if (b.disabled) return;
    const o = collect(); $('#merr').textContent = '';
    if (!o.subject) { $('#merr').textContent = 'موضوع نامه را بنویسید.'; return; }
    if (form.elements.date.value && !o.date) { $('#merr').textContent = 'تاریخ نامه معتبر نیست (نمونه: ۱۴۰۵/۰۸/۱۵).'; return; }
    if (o.type === 'internal' && o.toUnit === '') { $('#merr').textContent = 'مدیریت گیرنده را انتخاب کنید.'; return; }
    b.disabled = true; b.setAttribute('aria-busy', 'true');
    clearInterval(timer);
    if (st.saving) await new Promise(r => setTimeout(r, 600));
    const r = await run('sendLetter', { ...o, draftId: st.id });
    b.disabled = false; b.removeAttribute('aria-busy');
    if (r.error) { $('#merr').textContent = r.error; return; }
    st.sent = true; MODAL_BEFORE_CLOSE = null; window.onbeforeunload = null;
    closeModal(); toast('نامه ثبت و شماره‌گذاری شد: ' + fa(r.no)); refresh(); showLetter(r.id);
  });
}

/* ---------- سربرگ رسمی سیاه‌وسفید (تصویر سربرگ مسجد پس از ارسال، از پنل مدیریت قابل جایگزینی است) ---------- */
const EMBLEM = `<svg viewBox="0 0 64 64" class="emb" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="32" cy="32" r="30"/><circle cx="32" cy="32" r="26.5" stroke-width=".8"/><path d="M14 46h36M18 46V36a14 14 0 0128 0v10M32 14v6M29.5 17h5M26 46v-6a6 6 0 0112 0v6M48 46V24M50 46V22M46 24h6M16 46V24M14 22h4M14 24h4"/></g></svg>`;
function letterSheet(l) {
  const s = DB.settings || {}; const lh = s.letterhead || {};
  const sn = l.snap || {};
  const imgHead = lh.mode === 'image' && lh.image && lh.image.url;
  const issued = sn.issued || l.date;
  return `<div class="lsheet print-target">
    ${imgHead ? `<img class="lh-img" src="${esc(lh.image.url)}" alt="سربرگ">` : `<header class="lh2">
      <div class="lh-r"><div class="org">${esc(s.orgName || '')}</div><div class="lunit">${esc(sn.unitName || unitName(l.unitId))}</div></div>
      <div class="lh-c"><div class="bsm">بسمه تعالی</div>${EMBLEM}${lh.motto ? `<div class="motto">${esc(lh.motto)}</div>` : ''}</div>
      <div class="lh-l"><div><span>شماره:</span> <b>${fa(l.no)}</b></div><div><span>تاریخ:</span> <b>${jd(issued)}</b></div><div><span>پیوست:</span> <b>${l.files && l.files.length ? fa(l.files.length) + ' برگ' : 'ندارد'}</b></div></div>
    </header>`}
    ${imgHead ? `<div class="lh-meta"><span>شماره: <b>${fa(l.no)}</b></span><span>تاریخ: <b>${jd(issued)}</b></span><span>پیوست: <b>${l.files && l.files.length ? fa(l.files.length) + ' برگ' : 'ندارد'}</b></span></div>` : ''}
    ${l.conf !== 'عادی' ? `<div class="lstamp">${esc(l.conf)}</div>` : ''}
    ${l.type === 'in' ? `<div class="lnote">رونوشت ثبت نامه وارده در دبیرخانه</div>` : ''}
    <div class="laddr">
      ${l.type === 'in' ? `<div><b>فرستنده:</b> ${esc(l.sender)}</div><div><b>گیرنده:</b> ${esc(l.receiver)}</div>` : `<div><b>${l.type === 'internal' ? 'به:' : 'به:'}</b> ${esc(l.receiver)}</div><div><b>از:</b> ${esc(l.sender)}</div>`}
      <div><b>موضوع:</b> ${esc(l.subject)}</div>
    </div>
    <div class="lbody">${l.body || '<p>—</p>'}</div>
    ${l.type !== 'in' && sn.signerName ? `<div class="lsign"><b>${esc(sn.signerName)}</b><span>${esc(sn.signerPos)}</span></div>` : ''}
    ${!imgHead ? `<footer class="lfoot">${[lh.address && 'نشانی: ' + lh.address, lh.phone && 'تلفن: ' + fa(lh.phone), lh.site, lh.footer].filter(Boolean).map(esc).join(' · ')}</footer>` : ''}
  </div>`;
}

/* ---------- نمایش نامه ---------- */
function showLetter(id) {
  const l = DB.letters.find(x => x.id === id);
  if (!l) return toast('این نامه در محدوده دسترسی شما نیست.');
  if (isUnseen(l)) { run('markSeen', l.id).then(() => { if (!$('.modal-bg')) route(); else renderChrome(); }); }
  const h = canHandleLetter(l), cl = canCloseLetter(l), arch = isArchivedMine(l);
  const last = l.refs[l.refs.length - 1];
  modal({
    title: `نامه ${LETTER_TYPES[l.type]} ${fa(l.no)}`, wide: true,
    body: `<div class="row">${pill(l.status)} ${prio(l.priority)} ${l.conf !== 'عادی' ? pill(l.conf) : ''} ${pill(l.cat, 'mute')} ${l.needReply && !l.replies.length ? pill('نیازمند پاسخ', 'warn') : ''} ${l.due ? pill('مهلت اقدام ' + jd(l.due), l.due < todayISO() && l.status !== 'مختومه' ? 'bad' : 'info') : ''} ${arch ? pill('در بایگانی من', 'mute') : ''}</div>
    ${letterSheet(l)}
    ${l.files.length ? `<div><h3>پیوست‌ها</h3>${files(l.files)}</div>` : ''}
    <div class="grid g2"><div><h3>ارجاعات</h3>${l.refs.length ? `<div class="list">${l.refs.map(r => `<div class="li" style="padding:6px 0"><div class="t"><b>${esc(unitName(r.unitId))}${r.toPos ? ' — ' + esc(posLabel(r.toPos)) : ''}</b><small>${jdt(r.ts)} · ${esc(who(r.by, r.nm))}${r.note ? ' — ' + esc(r.note) : ''}${r.due ? ' · مهلت ' + jd(r.due) : ''}</small></div></div>`).join('')}</div>` : empty('ارجاع نشده است.')}</div>
    <div><h3>پاسخ‌ها</h3>${l.replies.length ? l.replies.map(r => `<div class="box lbody" style="margin-bottom:6px">${r.text}<div class="hint">${esc(who(r.by, r.nm))} · ${esc(posLabel(r.pos))} · ${jdt(r.ts)}</div></div>`).join('') : empty(l.needReply ? 'در انتظار پاسخ' : 'پاسخی ثبت نشده است.')}</div></div>
    <div><h3>سابقه اقدامات</h3>${histHTML(l.history)}</div>`,
    foot: `${h ? btn('ارجاع', 'letterRefer', { id }, '', 'send') + btn('ثبت پاسخ', 'letterReply', { id }, 'ghost', 'mail') : ''}${editBtn('letter', l)}${cl ? (l.status === 'مختومه' ? btn('بازگشایی پرونده', 'letterReopen', { id }, 'ghost') : btn('مختومه', 'letterClose', { id }, 'ghost', 'check')) : ''}${btn(arch ? 'خروج از بایگانی من' : 'بایگانی من', 'letterArch', { id, on: arch ? 0 : 1 }, 'ghost', 'archive')}${btn('چاپ / PDF', 'print', {}, 'ghost', 'print')}`
  });
}
A.letterRefer = d => {
  const l = DB.letters.find(x => x.id === d.id);
  actModal('ارجاع نامه ' + fa(l.no), v => run('referLetter', l.id, v.unit, v.note, v.due, v.pos || ''), {
    fields: [{ k: 'unit', l: 'ارجاع به مدیریت', t: 'select', o: unitOpts(true), req: true }, { k: 'pos', l: 'پنل گیرنده (اختیاری)', t: 'select', o: allPosOpts(), blank: 'همه پنل‌های همان مدیریت', hint: 'اگر انتخاب نکنید، مدیر، مسئول دفتر و منشی آن مدیریت اعلان می‌گیرند.' }, { k: 'due', l: 'مهلت اقدام', t: 'date' }],
    noteLabel: 'دستور ارجاع', reopen: () => showLetter(l.id), done: 'نامه ارجاع شد و گیرنده اعلان گرفت.'
  });
};
A.letterReply = d => {
  const l = DB.letters.find(x => x.id === d.id);
  const bg = modal({ title: 'ثبت پاسخ نامه ' + fa(l.no), wide: true, body: `${editorHTML('rbody', '', 'متن پاسخ…')}<div class="err" id="merr" role="alert"></div>`, foot: `<button class="btn" id="rsend">${ic('send')}ثبت پاسخ</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  $('#rsend', bg).addEventListener('click', async e => {
    const b = e.currentTarget; if (b.disabled) return; const t = editorVal('rbody'); if (!t) { $('#merr').textContent = 'متن پاسخ را بنویسید.'; return; }
    b.disabled = true; const r = await run('replyLetter', l.id, t); b.disabled = false;
    if (r.error) { $('#merr').textContent = r.error; return; }
    closeModal(); refresh(); showLetter(l.id); toast('پاسخ ثبت شد.');
  });
};
A.letterClose = d => actModal('مختومه‌کردن پرونده نامه', v => run('closeLetter', d.id, v.note), { noteLabel: 'خلاصه نتیجه (اختیاری)', reopen: () => showLetter(d.id), done: 'پرونده نامه مختومه شد.' });
A.letterReopen = d => actModal('بازگشایی پرونده نامه', v => run('reopenLetter', d.id, v.note), { noteReq: true, noteLabel: 'علت بازگشایی', reopen: () => showLetter(d.id) });
A.letterArch = async d => { const r = await run('archiveMine', d.id, !!+d.on); if (r.error) return toast(r.error); closeModal(); refresh(); toast(+d.on ? 'به بایگانی شخصی شما منتقل شد.' : 'از بایگانی شخصی خارج شد.'); };
A.print = () => { document.body.classList.add('printing'); document.body.classList.toggle('pmodal', !!$('.modal-bg')); window.print(); setTimeout(() => document.body.classList.remove('printing', 'pmodal'), 500); };
