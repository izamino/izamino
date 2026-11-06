/* =====================================================================
   امور مالی و حسابداری: خلاصه و بودجه، اسناد حسابداری دوطرفه، فاکتورنویسی،
   درخواست پرداخت، اسناد و گزارش‌های ارسالی واحدها، دفاتر و گزارش‌ها، کدینگ و دوره‌ها
   ===================================================================== */
const V_ST = { draft: 'پیش‌نویس', posted: 'قطعی', rev: 'برگشت‌خورده' };
const ACC_T = ORG.ACC_TYPES;
const accBy = c => (DB.accounts || []).find(a => a.code === String(c));
const accName = c => { const a = accBy(c); return a ? `${fa(a.code)} — ${a.name}` : fa(c); };
const isLeaf = c => !(DB.accounts || []).some(a => a.parent === String(c));
const leafOpts = (types) => (DB.accounts || []).filter(a => a.active && isLeaf(a.code) && (!types || types.includes(a.type))).sort(by('code')).map(a => [a.code, `${fa(a.code)} — ${a.name}`]);
const debitNormal = t => t === 'asset' || t === 'expense';
const periodOf = id => (DB.periods || []).find(p => p.id === id);
const curPeriod = () => (DB.periods || []).find(p => todayISO() >= p.from && todayISO() <= p.to) || (DB.periods || []).slice(-1)[0];
/* ردیف‌های اسناد اثرگذار (قطعی و برگشت‌خورده؛ سند برگشت هم قطعی است و اثر را خنثی می‌کند) */
const postedLines = () => (DB.vouchers || []).filter(v => v.status !== V_ST.draft).flatMap(v => v.lines.map(l => ({ ...l, date: v.date, vno: v.no, vid: v.id, vdesc: v.desc })));
function balances(from, to) {
  const L = postedLines(); const out = {};
  (DB.accounts || []).forEach(a => (out[a.code] = { open: 0, dr: 0, cr: 0 }));
  L.forEach(l => (DB.accounts || []).forEach(a => {
    if (!String(l.acc).startsWith(a.code)) return;
    const o = out[a.code];
    if (from && l.date < from) o.open += l.dr - l.cr;
    else if (!to || l.date <= to) { o.dr += l.dr; o.cr += l.cr; }
  }));
  return out;
}
const sideBal = (code, n) => (debitNormal((accBy(code) || {}).type) ? n : -n);
const mny = n => (n < 0 ? '(' + money(-n) + ')' : money(n));

PAGES.finance = () => {
  const full = canFinance() || isImam();
  if (!full && !can('finance.request') && !can('finance.docs')) return denied('امور مالی برای جایگاه شما فعال نشده است.');
  const T = full ? [['sum', 'خلاصه و بودجه'], ['vouchers', 'اسناد حسابداری'], ['invoices', 'فاکتورها'], ['pay', 'درخواست‌های پرداخت'], ['docs', 'اسناد ارسالی واحدها'], ['reports', 'دفاتر و گزارش‌ها'], ['chart', 'کدینگ حساب‌ها'], ['periods', 'دوره‌های مالی']]
    : [['pay', 'درخواست‌های پرداخت'], ['docs', 'ارسال اسناد و گزارش‌ها'], ['budget', 'بودجه واحد']];
  const v = vs('fin', { tab: T[0][0] });
  if (!T.some(t => t[0] === v.tab)) v.tab = T[0][0];
  const body = (FIN_VIEWS[v.tab] || FIN_VIEWS.sum)(v);
  const acts = [can('finance.post') ? btn('سند حسابداری', 'newVoucher', {}, '', 'calc') + btn('فاکتور', 'newInvoice', {}, 'ghost', 'receipt') : '', can('finance.request') && !isImam() ? btn('درخواست پرداخت', 'newPay', {}, 'ghost', 'wallet') : '', can('finance.docs') && !inUnit(U_FIN) ? btn('ارسال سند به امور مالی', 'newFindoc', {}, 'ghost', 'send') : ''].join('');
  return `${head(full ? 'امور مالی و حسابداری' : 'امور مالی واحد', full ? 'حسابداری دوطرفه با کدینگ حساب، دوره مالی، سند قطعی و برگشت، فاکتور، درخواست پرداخت و گزارش‌های دوره‌ای' : 'درخواست پرداخت، ارسال فاکتور و گزارش هزینه‌کرد به امور مالی و پیگیری وضعیت آن‌ها', acts)}${tabs('fin', T, v.tab)}${body}`;
};
const FIN_VIEWS = {
  sum() {
    const p = curPeriod(); const b = p ? balances(p.from, p.to) : {};
    const cash = (b['11'] ? b['11'].open + b['11'].dr - b['11'].cr : 0);
    const inc = b['4'] ? b['4'].cr - b['4'].dr : 0, exp = b['5'] ? b['5'].dr - b['5'].cr : 0;
    const y = jYearNow();
    const spent = u => postedLines().filter(l => l.unitId === u && (accBy(l.acc) || {}).type === 'expense' && p && l.date >= p.from && l.date <= p.to).reduce((s, l) => s + l.dr - l.cr, 0);
    const budgets = (DB.budgets || []).filter(x => x.year === y);
    return `<div class="tiles">${tile('موجودی نقد و بانک', mny(cash), p ? esc(p.title) : '', cash < 0 ? 'bad' : 'ok')}${tile('درآمد دوره', money(inc), '', 'ok')}${tile('هزینه دوره', money(exp), '', 'warn')}${tile('مازاد / کسری', mny(inc - exp), '', inc - exp < 0 ? 'bad' : 'ok')}${tile('اسناد پیش‌نویس', (DB.vouchers || []).filter(x => x.status === V_ST.draft).length, 'منتظر قطعی‌شدن', '', '')}${tile('پرداخت‌های در جریان', DB.payreqs.filter(x => x.status === 'جاری').length)}${tile('اسناد ارسالی منتظر بررسی', (DB.findocs || []).filter(d => ['ارسال‌شده', 'در حال بررسی'].includes(d.status)).length, '', (DB.findocs || []).some(d => d.status === 'ارسال‌شده') ? 'warn' : '')}</div>
    ${card('بودجه و هزینه مدیریت‌ها — ' + (p ? esc(p.title) : 'سال ' + fa(y)), table([['مدیریت', x => esc(unitName(x.unitId))], ['بودجه مصوب', x => money(x.amount)], ['هزینه ثبت‌شده', x => money(spent(x.unitId))], ['مصرف', x => { const q = x.amount ? (spent(x.unitId) / x.amount) * 100 : 0; return `<div class="row" style="flex-wrap:nowrap">${bar(q, q > 90 ? 'bad' : q > 70 ? 'warn' : '')}<span class="num">${fa(Math.round(q))}٪</span></div>`; }], ['مانده', x => mny(x.amount - spent(x.unitId))]], budgets.map(x => ({ ...x, id: x.unitId })), { click: isImam() || isMgr(U_FIN) ? 'budget' : '' }), isImam() || isMgr(U_FIN) ? '<small>برای اصلاح بودجه روی ردیف بزنید</small>' : '', { flush: true })}
    ${card('تعهدات مالی', table([['عنوان', c => esc(c.title)], ['مدیریت', c => esc(unitShort(c.unitId))], ['مبلغ', c => money(c.amount)], ['سررسید', c => dueTxt(c.status === 'جاری' ? c.due : '')]], DB.commitments || []), can('finance.post') ? btn('ثبت تعهد', 'newCom', {}, 'sm', 'plus') : '', { flush: true })}`;
  },
  budget() {
    const y = jYearNow(); const b = (DB.budgets || []).find(x => x.unitId === myUnit() && x.year === y);
    const paid = sum(DB.payreqs.filter(p => p.unitId === myUnit() && p.status === 'پرداخت‌شده'), p => p.amount);
    const pend = sum(DB.payreqs.filter(p => p.unitId === myUnit() && p.status === 'جاری'), p => p.amount);
    return `<div class="tiles">${tile('بودجه مصوب ' + fa(y), money(b ? b.amount : 0))}${tile('پرداخت‌شده', money(paid), '', 'warn')}${tile('در جریان', money(pend))}${tile('مانده تقریبی', mny((b ? b.amount : 0) - paid - pend), '', 'ok')}</div><div class="notice">ریز اسناد حسابداری فقط برای امور مالی و امام جماعت نمایش داده می‌شود.</div>`;
  },
  vouchers(v) {
    const rows = (DB.vouchers || []).filter(x => (!v.pr || x.periodId === v.pr) && (!v.st || x.status === v.st) && textMatch(v.q, String(x.no), fa(x.no), x.desc, x.ref, ...x.lines.map(l => accName(l.acc))) && inRange(x.date, v.f, v.t)).sort((a, b) => (a.date === b.date ? b.no - a.no : a.date < b.date ? 1 : -1));
    const p = paged('finv', rows);
    return `<section class="card">${filterBar('fin', [{ k: 'q', t: 'search', l: 'جست‌وجو در شرح، شماره، مرجع یا حساب…' }, { k: 'pr', l: 'همه دوره‌ها', o: (DB.periods || []).map(x => [x.id, x.title]) }, { k: 'st', l: 'همه وضعیت‌ها', o: Object.values(V_ST) }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['شماره', x => `<b class="num">${fa(x.no)}</b><span class="sub">${esc((periodOf(x.periodId) || {}).title || '')}</span>`], ['تاریخ', x => jd(x.date)], ['شرح', x => `<b>${esc(x.desc)}</b>${x.ref ? `<span class="sub">مرجع: ${esc(fa(x.ref))}</span>` : ''}${x.src ? `<span class="sub">از ${esc(x.src.no || '')}</span>` : ''}`], ['مبلغ', x => money(x.total)], ['وضعیت', x => pill(x.status) + (x.reverseOf ? '<span class="sub">سند برگشت</span>' : '') + (x.reverseNo ? `<span class="sub">برگشت با سند ${fa(x.reverseNo)}</span>` : '')]], p.rows, { click: 'voucher', empty: 'سندی ثبت نشده است.' }) + p.more}</div>
    <div class="cb"><b>جمع:</b> ${money(sum(rows.filter(x => x.status !== V_ST.draft), x => x.total))} در ${fa(rows.length)} سند</div></section>`;
  },
  invoices(v) {
    const rows = (DB.invoices || []).filter(x => (!v.k || x.kind === v.k) && (!v.st || x.status === v.st) && textMatch(v.q, x.no, x.party, x.phone) && inRange(x.date, v.f, v.t)).sort(by('date', -1));
    const p = paged('fini', rows);
    return `<section class="card">${filterBar('fin', [{ k: 'q', t: 'search', l: 'جست‌وجو در شماره یا طرف حساب…' }, { k: 'k', l: 'همه انواع', o: ['فروش', 'خرید'] }, { k: 'st', l: 'همه وضعیت‌ها', o: ['پیش‌نویس', 'صادرشده', 'باطل‌شده'] }, { k: 'f', t: 'date', l: 'از تاریخ' }, { k: 't', t: 'date', l: 'تا تاریخ' }])}
    <div class="cb flush">${table([['شماره', x => `<span class="code">${esc(x.no)}</span><span class="sub">${esc(x.kind)}</span>`], ['طرف حساب', x => `<b>${esc(x.party)}</b><span class="sub">${esc(unitShort(x.unitId))}</span>`], ['تاریخ', x => jd(x.date)], ['مبلغ کل', x => money(x.total)], ['وضعیت', x => pill(x.status) + (x.status === 'باطل‌شده' ? `<span class="sub">علت: ${esc(x.voidReason || '')}</span>` : x.voucherNo ? `<span class="sub">سند ${fa(x.voucherNo)}</span>` : '')]], p.rows, { click: 'invoice', empty: 'فاکتوری ثبت نشده است.' }) + p.more}</div></section>`;
  },
  pay() {
    const rows = DB.payreqs.slice().sort(by('created', -1));
    return `${card('مراحل تأیید پرداخت', steps(PAY_ST, -1) + `<div class="hint">درخواست‌های بالاتر از ${money(DB.settings.payThreshold || 0)} به تصویب امام جماعت نیاز دارند. پرداخت نهایی خودکار یک سند حسابداری قطعی (بدهکار هزینه با مرکز هزینه همان مدیریت، بستانکار صندوق یا بانک) ثبت می‌کند.</div>`)}
    ${card('درخواست‌های پرداخت', payTable(rows), can('finance.request') && !isImam() ? btn('درخواست پرداخت', 'newPay', {}, 'sm', 'plus') : '', { flush: true })}`;
  },
  docs() {
    const rows = (DB.findocs || []).slice().sort(by('created', -1));
    return `<div class="notice">واحدها فاکتور خرید، رسید، گزارش هزینه‌کرد و گزارش مالی ماهانه را با تصویر سند برای امور مالی می‌فرستند؛ امور مالی بررسی و «پذیرفته» یا «برگشت برای اصلاح» ثبت می‌کند.</div>
    ${card('اسناد و گزارش‌های ارسالی', table([['شماره', d => `<span class="code">${esc(d.no)}</span>`], ['نوع', d => pill(d.kind, 'mute')], ['عنوان', d => `<b>${esc(d.title)}</b><span class="sub">${esc(unitShort(d.unitId))} · ${esc(who(d.by, d.byName))}</span>`], ['تاریخ', d => jd(d.date)], ['مبلغ', d => (d.amount ? money(d.amount) : '—')], ['وضعیت', d => pill(d.status)]], rows, { click: 'findoc', empty: 'سندی ارسال نشده است.' }), can('finance.docs') && !inUnit(U_FIN) ? btn('ارسال سند', 'newFindoc', {}, 'sm', 'plus') : '', { flush: true })}`;
  },
  reports(v) {
    const per = periodOf(v.rp) || curPeriod();
    if (!per) return empty('دوره مالی تعریف نشده است.');
    const from = v.rf ? jToIso(v.rf) || per.from : per.from, to = v.rt ? jToIso(v.rt) || per.to : per.to;
    const mode = v.rm || 'tb';
    const b = balances(from, to);
    const accs = (DB.accounts || []).slice().sort(by('code'));
    let out = '';
    if (mode === 'tb') {
      const rows = accs.filter(a => { const o = b[a.code]; return o && (o.open || o.dr || o.cr) && (v.lv === 'all' || isLeaf(a.code) || a.code.length <= 2); });
      const leafs = accs.filter(a => isLeaf(a.code)).map(a => b[a.code]);
      const T = k => sum(leafs, o => o[k]);
      out = card('تراز آزمایشی', table([['کد', a => `<span class="num">${fa(a.code)}</span>`], ['حساب', a => (isLeaf(a.code) ? '' : '<b>') + esc(a.name) + (isLeaf(a.code) ? '' : '</b>')], ['مانده ابتدای بازه', a => mny(sideBal(a.code, b[a.code].open))], ['گردش بدهکار', a => money(b[a.code].dr)], ['گردش بستانکار', a => money(b[a.code].cr)], ['مانده پایان بازه', a => mny(sideBal(a.code, b[a.code].open + b[a.code].dr - b[a.code].cr))]], rows.map(a => ({ ...a, id: a.code })), { click: 'accLedger', empty: 'در این بازه سندی ثبت نشده است.' })
        + `<div class="cb"><b>جمع گردش:</b> بدهکار ${money(T('dr'))} · بستانکار ${money(T('cr'))} ${T('dr') === T('cr') ? pill('تراز', 'ok') : pill('ناتراز', 'bad')}</div>`, '', { flush: true });
    }
    if (mode === 'pl') {
      const inc = accs.filter(a => a.type === 'income' && isLeaf(a.code)), exp = accs.filter(a => a.type === 'expense' && isLeaf(a.code));
      const amt = a => (a.type === 'income' ? b[a.code].cr - b[a.code].dr : b[a.code].dr - b[a.code].cr);
      const ti = sum(inc, amt), te = sum(exp, amt);
      out = `<div class="grid g2">${card('درآمدها', table([['حساب', a => esc(a.name)], ['مبلغ', a => money(amt(a))]], inc.filter(a => amt(a)).map(a => ({ ...a, id: a.code }))) + `<div class="cb"><b>جمع درآمد: ${money(ti)}</b></div>`, '', { flush: true })}${card('هزینه‌ها', table([['حساب', a => esc(a.name)], ['مبلغ', a => money(amt(a))]], exp.filter(a => amt(a)).map(a => ({ ...a, id: a.code }))) + `<div class="cb"><b>جمع هزینه: ${money(te)}</b></div>`, '', { flush: true })}</div>
      <div class="notice ${ti - te < 0 ? 'warn' : ''}"><b>${ti - te >= 0 ? 'مازاد درآمد بر هزینه' : 'کسری'}:</b> ${money(Math.abs(ti - te))}</div>`;
    }
    if (mode === 'cc') {
      const L = postedLines().filter(l => l.date >= from && l.date <= to && (accBy(l.acc) || {}).type === 'expense');
      const rows = UNITS.map(u => ({ id: u.id, u, e: sum(L.filter(l => l.unitId === u.id), l => l.dr - l.cr), b: ((DB.budgets || []).find(x => x.unitId === u.id && x.year === jYearNow()) || {}).amount || 0 })).filter(r => r.e || r.b);
      out = card('هزینه به تفکیک مدیریت (مرکز هزینه)', table([['مدیریت', r => esc(r.u.name)], ['هزینه در بازه', r => money(r.e)], ['بودجه سالانه', r => money(r.b)], ['درصد', r => (r.b ? fa(Math.round((r.e / r.b) * 100)) + '٪' : '—')]], rows) + `<div class="cb"><b>بدون مرکز هزینه:</b> ${money(sum(L.filter(l => l.unitId == null), l => l.dr - l.cr))}</div>`, '', { flush: true });
    }
    if (mode === 'gl') {
      const code = v.ra || (leafOpts()[0] || [''])[0];
      const L = postedLines().filter(l => l.acc === code && l.date <= to).sort((a, b2) => (a.date === b2.date ? a.vno - b2.vno : a.date < b2.date ? -1 : 1));
      const open = sum(L.filter(l => l.date < from), l => l.dr - l.cr);
      let run_ = open;
      const rows = L.filter(l => l.date >= from).map((l, i) => { run_ += l.dr - l.cr; return { ...l, id: l.vid, bal: run_, i }; });
      out = `<section class="card"><div class="filters"><select data-f="fin:ra" id="flt-fin-ra" aria-label="حساب">${leafOpts().map(([c, l]) => `<option value="${c}" ${c === code ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      <div class="cb"><b>مانده ابتدای بازه:</b> ${mny(sideBal(code, open))}</div>
      <div class="cb flush">${table([['تاریخ', l => jd(l.date)], ['سند', l => fa(l.vno)], ['شرح', l => esc(l.desc || l.vdesc)], ['مرکز هزینه', l => (l.unitId == null ? '—' : esc(unitShort(l.unitId)))], ['بدهکار', l => (l.dr ? money(l.dr) : '')], ['بستانکار', l => (l.cr ? money(l.cr) : '')], ['مانده', l => mny(sideBal(code, l.bal))]], rows, { click: 'voucher', empty: 'گردشی در این بازه نیست.' })}</div>
      <div class="cb"><b>مانده پایان بازه:</b> ${mny(sideBal(code, run_))}</div></section>`;
    }
    return `<section class="card"><div class="filters open"><select data-f="fin:rm" id="flt-fin-rm" aria-label="نوع گزارش">${[['tb', 'تراز آزمایشی'], ['gl', 'دفتر حساب (گردش و مانده)'], ['pl', 'صورت درآمد و هزینه'], ['cc', 'هزینه به تفکیک مدیریت']].map(([k, l]) => `<option value="${k}" ${k === mode ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <select data-f="fin:rp" id="flt-fin-rp" aria-label="دوره">${(DB.periods || []).map(x => `<option value="${x.id}" ${x.id === per.id ? 'selected' : ''}>${esc(x.title)}${x.status === 'بسته' ? ' (بسته)' : ''}</option>`).join('')}</select>
      <input type="text" data-f="fin:rf" id="flt-fin-rf" placeholder="از تاریخ (اختیاری)" value="${esc(v.rf || '')}" size="11"><input type="text" data-f="fin:rt" id="flt-fin-rt" placeholder="تا تاریخ (اختیاری)" value="${esc(v.rt || '')}" size="11">
      ${mode === 'tb' ? `<select data-f="fin:lv" id="flt-fin-lv"><option value="">حساب‌های کل و معین</option><option value="all" ${v.lv === 'all' ? 'selected' : ''}>همه سطح‌ها</option></select>` : ''}
      ${btn('چاپ', 'print', {}, 'sm ghost', 'print')}</div><div class="cb hint">بازه: ${jd(from)} تا ${jd(to)} · فقط اسناد قطعی و برگشتی محاسبه می‌شوند؛ مانده ابتدای بازه از اسناد پیش از شروع بازه به دست می‌آید.</div></section><div class="print-target">${out}</div>`;
  },
  chart() {
    const accs = (DB.accounts || []).slice().sort(by('code'));
    return card('کدینگ حساب‌ها (کل / معین)', table([['کد', a => `<span class="num" style="padding-inline-start:${(a.code.length - 1) * 8}px">${fa(a.code)}</span>`], ['نام حساب', a => (isLeaf(a.code) ? esc(a.name) : `<b>${esc(a.name)}</b>`)], ['ماهیت', a => pill(ACC_T[a.type], 'mute')], ['سطح', a => (isLeaf(a.code) ? 'معین (قابل ثبت)' : 'کل / گروه')], ['وضعیت', a => (a.active ? pill('فعال', 'ok') : pill('غیرفعال', 'mute'))], ['', a => (can('finance.approve') ? btn('ویرایش', 'accEdit', { c: a.code }, 'sm ghost') + ' ' + btn('زیرحساب', 'accNew', { p: a.code }, 'sm soft') : '')]], accs.map(a => ({ ...a, id: a.code }))), '', { flush: true });
  },
  periods() {
    return card('دوره‌های مالی', table([['عنوان', p => `<b>${esc(p.title)}</b>`], ['از', p => jd(p.from)], ['تا', p => jd(p.to)], ['اسناد', p => fa((DB.vouchers || []).filter(x => x.periodId === p.id).length)], ['وضعیت', p => pill(p.status === 'باز' ? 'باز' : 'بسته', p.status === 'باز' ? 'ok' : 'mute')], ['', p => (can('finance.approve') ? (p.status === 'باز' ? btn('بستن دوره', 'perClose', { id: p.id, c: 1 }, 'sm ghost') : btn('بازکردن', 'perClose', { id: p.id, c: 0 }, 'sm ghost')) : '')]], (DB.periods || []).slice().reverse()), can('finance.approve') ? btn('تعریف دوره', 'perNew', {}, 'sm', 'plus') : '', { flush: true })
      + '<div class="notice">در دوره بسته هیچ سندی ثبت یا ویرایش نمی‌شود. پیش از بستن، همه اسناد پیش‌نویس باید قطعی یا حذف شوند.</div>';
  }
};
A.accLedger = d => { const v = vs('fin'); v.rm = 'gl'; v.ra = isLeaf(d.id) ? d.id : (leafOpts().find(([c]) => c.startsWith(d.id)) || [d.id])[0]; route(); };

/* ---------- سند حسابداری ---------- */
A.newVoucher = () => voucherForm(null);
function voucherForm(x) {
  if (!can('finance.post')) return toast('ثبت سند برای جایگاه شما مجاز نیست.');
  const lines = x ? x.lines.map(l => ({ ...l })) : [{ acc: '', unitId: '', desc: '', dr: '', cr: '' }, { acc: '', unitId: '', desc: '', dr: '', cr: '' }];
  const accO = leafOpts(); const ccO = [['', 'بدون مرکز هزینه'], [0, 'دفتر امام جماعت'], ...unitOpts()];
  const row = (l, i) => `<tr><td>${fa(i + 1)}</td><td><select data-l="acc" aria-label="حساب"><option value="">انتخاب حساب…</option>${accO.map(([c, t]) => `<option value="${c}" ${String(l.acc) === c ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></td>
    <td><select data-l="unitId" aria-label="مرکز هزینه">${ccO.map(([c, t]) => `<option value="${c}" ${String(l.unitId ?? '') === String(c) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></td>
    <td><input data-l="desc" value="${esc(l.desc || '')}" aria-label="شرح ردیف"></td><td><input data-l="dr" inputmode="numeric" data-money="1" value="${l.dr ? numFa(l.dr) : ''}" aria-label="بدهکار"></td><td><input data-l="cr" inputmode="numeric" data-money="1" value="${l.cr ? numFa(l.cr) : ''}" aria-label="بستانکار"></td><td><button type="button" class="ibtn sm" data-del="${i}" aria-label="حذف ردیف">${ic('x')}</button></td></tr>`;
  const bg = modal({ title: x ? 'ویرایش پیش‌نویس سند ' + fa(x.no) : 'ثبت سند حسابداری', wide: true,
    body: `<form class="form" id="vform" novalidate>${fieldHTML({ k: 'date', l: 'تاریخ سند', t: 'date', req: true }, x ? x.date : todayISO())}${fieldHTML({ k: 'ref', l: 'شماره مرجع (فاکتور، رسید، چک)', hint: 'در هر دوره تکراری پذیرفته نمی‌شود' }, x ? x.ref : '')}${fieldHTML({ k: 'desc', l: 'شرح سند', req: true, full: true }, x ? x.desc : '')}</form>
    <div class="tbl-wrap"><table class="lines"><thead><tr><th>#</th><th>حساب معین</th><th>مرکز هزینه</th><th>شرح ردیف</th><th>بدهکار (ریال)</th><th>بستانکار (ریال)</th><th></th></tr></thead><tbody id="vlines">${lines.map(row).join('')}</tbody></table></div>
    <div class="row mt">${btn('افزودن ردیف', 'noop', {}, 'sm ghost', 'plus').replace('data-a="noop"', 'id="vadd" type="button"')}<span id="vtot" class="vtot"></span></div><div class="err" id="merr" role="alert"></div>`,
    foot: `<button class="btn" id="vsave">${ic('check')}ذخیره ${x ? 'تغییرات' : 'پیش‌نویس'}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  const read = () => $$('#vlines tr', bg).map(tr => { const g = k => $(`[data-l="${k}"]`, tr).value; return { acc: g('acc'), unitId: g('unitId'), desc: g('desc'), dr: +en(g('dr')).replace(/\D/g, '') || 0, cr: +en(g('cr')).replace(/\D/g, '') || 0 }; });
  const tot = () => { const L = read(); const d = sum(L, l => l.dr), c = sum(L, l => l.cr); $('#vtot', bg).innerHTML = `جمع بدهکار <b>${money(d)}</b> · جمع بستانکار <b>${money(c)}</b> ${d && d === c ? pill('تراز', 'ok') : pill(d - c ? 'اختلاف ' + money(Math.abs(d - c)) : 'خالی', 'bad')}`; };
  const redraw = L => { $('#vlines', bg).innerHTML = L.map(row).join(''); tot(); };
  bg.addEventListener('input', tot); bg.addEventListener('change', tot); tot();
  $('#vadd', bg).addEventListener('click', () => { const L = read(); L.push({ acc: '', unitId: '', desc: '', dr: '', cr: '' }); redraw(L); });
  bg.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; const L = read(); if (L.length <= 2) return; L.splice(+b.dataset.del, 1); redraw(L); });
  $('#vsave', bg).addEventListener('click', async e => {
    const b = e.currentTarget; if (b.disabled) return;
    const f = $('#vform', bg); const ds = f.elements.date.value.trim(); const date = jToIso(ds);
    if (!date) { $('#merr').textContent = 'تاریخ سند معتبر نیست (نمونه: ۱۴۰۵/۰۸/۱۵).'; return; }
    const L = read().filter(l => l.acc || l.dr || l.cr);
    b.disabled = true; b.setAttribute('aria-busy', 'true');
    const r = await run('voucherSave', x ? x.id : '', { date, ref: f.elements.ref.value.trim(), desc: f.elements.desc.value.trim(), lines: L });
    b.disabled = false; b.removeAttribute('aria-busy');
    if (r.error) { $('#merr').textContent = r.error; return; }
    closeModal(); refresh(); toast('سند ذخیره شد.'); showVoucher(r.id);
  });
}
function showVoucher(id) {
  const x = (DB.vouchers || []).find(v => v.id === id); if (!x) return toast('این سند در دسترس نیست.');
  const rev = x.reverseOf ? (DB.vouchers || []).find(v => v.id === x.reverseOf) : null;
  modal({ title: 'سند حسابداری شماره ' + fa(x.no), wide: true,
    body: `<div class="print-target vsheet"><div class="vh"><b>${esc(DB.settings.orgName)}</b><span>سند حسابداری</span></div>
    <div class="row">${pill(x.status)} ${pill((periodOf(x.periodId) || {}).title || '', 'mute')}${x.reverseOf ? pill('سند برگشت سند ' + fa(rev ? rev.no : ''), 'info') : ''}</div>
    ${x.status === V_ST.rev ? `<div class="notice warn">این سند با سند شماره ${fa(x.reverseNo)} برگشت خورده است. علت: ${esc(x.reverseReason || '')}</div>` : ''}
    ${kv([['شماره سند', fa(x.no)], ['تاریخ', jd(x.date)], ['شرح', esc(x.desc)], x.ref && ['شماره مرجع', esc(fa(x.ref))], x.src && ['منشأ', esc(x.src.no || '')], ['ثبت‌کننده', esc(x.byName || '')], x.postedBy && ['قطعی‌کننده', esc(x.postedBy) + ' · ' + jdt(x.postedAt)]])}
    ${table([['حساب', l => esc(accName(l.acc))], ['مرکز هزینه', l => (l.unitId == null || l.unitId === '' ? '—' : esc(unitShort(l.unitId)))], ['شرح', l => esc(l.desc || '')], ['بدهکار', l => (l.dr ? money(l.dr) : '')], ['بستانکار', l => (l.cr ? money(l.cr) : '')]], x.lines.map((l, i) => ({ ...l, id: i })))}
    <div class="cb"><b>جمع:</b> ${money(x.total)}</div>${files(x.files || [])}
    <div class="vsign"><span>تنظیم‌کننده</span><span>رسیدگی‌کننده</span><span>تأییدکننده</span></div></div>
    <div><h3>سابقه</h3>${histHTML(x.history)}</div>`,
    foot: `${x.status === V_ST.draft && can('finance.post') ? btn('ویرایش', 'vEdit', { id }, 'ghost', 'edit') : ''}${x.status === V_ST.draft && can('finance.approve') ? btn('قطعی‌کردن سند', 'vPost', { id }, '', 'check') : ''}${x.status === V_ST.draft && can('finance.post') ? btn('حذف پیش‌نویس', 'vDel', { id }, 'danger', 'trash') : ''}${x.status === V_ST.posted && !x.reverseOf && can('finance.approve') ? btn('سند برگشت (اصلاح)', 'vRev', { id }, 'ghost', 'undo') : ''}${btn('چاپ', 'print', {}, 'ghost', 'print')}` });
}
A.voucher = d => showVoucher(d.id);
A.vEdit = d => voucherForm((DB.vouchers || []).find(v => v.id === d.id));
A.vPost = async d => { const r = await run('voucherPost', d.id); if (r.error) return toast(r.error); closeModal(); refresh(); showVoucher(d.id); toast('سند قطعی شد.'); };
A.vDel = d => confirmBox('حذف پیش‌نویس سند', 'این پیش‌نویس حذف شود؟', 'حذف', () => run('voucherDelete', d.id), 'پیش‌نویس حذف شد.');
A.vRev = d => actModal('ثبت سند برگشت', v => run('voucherReverse', d.id, v.note, v.date), { fields: [{ k: 'date', l: 'تاریخ سند برگشت', t: 'date', req: true }], init: { date: todayISO() }, noteReq: true, noteLabel: 'علت برگشت و اصلاح', done: 'سند برگشت ثبت شد؛ اکنون سند درست را ثبت کنید.' });

/* ---------- فاکتور ---------- */
A.newInvoice = () => invoiceForm(null);
function invoiceForm(x) {
  if (!can('finance.post')) return toast('فاکتورنویسی برای جایگاه شما مجاز نیست.');
  const items = x ? x.items.map(i => ({ ...i })) : [{ desc: '', qty: 1, unit: 'عدد', price: '', disc: '' }];
  const row = (it, i) => `<tr><td>${fa(i + 1)}</td><td><input data-i="desc" value="${esc(it.desc || '')}" aria-label="شرح کالا یا خدمت"></td><td><input data-i="qty" inputmode="decimal" value="${it.qty !== '' ? fa(it.qty) : ''}" size="5" aria-label="تعداد"></td><td><input data-i="unit" value="${esc(it.unit || '')}" size="6" aria-label="واحد"></td><td><input data-i="price" inputmode="numeric" data-money="1" value="${it.price ? numFa(it.price) : ''}" aria-label="قیمت واحد"></td><td><input data-i="disc" inputmode="numeric" data-money="1" value="${it.disc ? numFa(it.disc) : ''}" aria-label="تخفیف"></td><td class="isum"></td><td><button type="button" class="ibtn sm" data-del="${i}" aria-label="حذف ردیف">${ic('x')}</button></td></tr>`;
  const bg = modal({ title: x ? 'ویرایش فاکتور ' + x.no : 'صدور فاکتور', wide: true,
    body: `<form class="form" id="iform" novalidate>${fieldHTML({ k: 'kind', l: 'نوع فاکتور', t: 'select', o: [['فروش', 'فروش / ارائه خدمت'], ['خرید', 'خرید']], blank: false }, x ? x.kind : 'فروش')}${fieldHTML({ k: 'date', l: 'تاریخ', t: 'date', req: true }, x ? x.date : todayISO())}
      ${fieldHTML({ k: 'party', l: 'طرف حساب (خریدار / فروشنده)', req: true }, x ? x.party : '')}${fieldHTML({ k: 'phone', l: 'تلفن', t: 'tel' }, x ? x.phone : '')}${fieldHTML({ k: 'address', l: 'نشانی', full: true }, x ? x.address : '')}
      ${fieldHTML({ k: 'unitId', l: 'مدیریت مرتبط (مرکز درآمد یا هزینه)', t: 'select', o: unitOpts(), blank: false }, x ? x.unitId : U_FIN)}${fieldHTML({ k: 'taxPct', l: 'مالیات بر ارزش افزوده (٪)', t: 'dec' }, x ? x.taxPct : 0)}${fieldHTML({ k: 'note', l: 'توضیحات', full: true }, x ? x.note : '')}</form>
    <div class="tbl-wrap"><table class="lines"><thead><tr><th>#</th><th>شرح کالا یا خدمت</th><th>تعداد</th><th>واحد</th><th>قیمت واحد</th><th>تخفیف</th><th>مبلغ</th><th></th></tr></thead><tbody id="ilines">${items.map(row).join('')}</tbody></table></div>
    <div class="row mt"><button type="button" class="btn sm ghost" id="iadd">${ic('plus')}افزودن ردیف</button><span id="itot" class="vtot"></span></div><div class="err" id="merr" role="alert"></div>`,
    foot: `<button class="btn" id="isave">${ic('check')}ذخیره ${x ? 'تغییرات' : 'پیش‌نویس فاکتور'}</button>${btn('انصراف', 'close', {}, 'ghost')}` });
  const num_ = s => +en(String(s || '')).replace(/[^\d.]/g, '') || 0;
  const read = () => $$('#ilines tr', bg).map(tr => { const g = k => $(`[data-i="${k}"]`, tr).value; return { desc: g('desc').trim(), qty: en(g('qty')).replace('٫', '.').trim(), unit: g('unit').trim(), price: num_(g('price')), disc: num_(g('disc')) }; });
  const tot = () => { const L = read(); let s = 0; $$('#ilines tr', bg).forEach((tr, i) => { const it = L[i]; const v = Math.round((+it.qty || 0) * it.price) - it.disc; s += v; $('.isum', tr).textContent = numFa(v); }); const tp = +en($('#iform', bg).elements.taxPct.value).replace('٫', '.') || 0; const t = Math.round((s * tp) / 100); $('#itot', bg).innerHTML = `جمع: <b>${money(s)}</b> · مالیات: <b>${money(t)}</b> · قابل پرداخت: <b>${money(s + t)}</b>`; };
  bg.addEventListener('input', tot); tot();
  $('#iadd', bg).addEventListener('click', () => { const L = read(); L.push({ desc: '', qty: 1, unit: 'عدد', price: '', disc: '' }); $('#ilines', bg).innerHTML = L.map(row).join(''); tot(); });
  bg.addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (!b) return; const L = read(); if (L.length <= 1) return; L.splice(+b.dataset.del, 1); $('#ilines', bg).innerHTML = L.map(row).join(''); tot(); });
  $('#isave', bg).addEventListener('click', async e => {
    const b = e.currentTarget; if (b.disabled) return; const f = $('#iform', bg);
    const date = jToIso(f.elements.date.value.trim()); if (!date) { $('#merr').textContent = 'تاریخ فاکتور معتبر نیست.'; return; }
    b.disabled = true;
    const r = await run('invoiceSave', x ? x.id : '', { kind: f.elements.kind.value, date, party: f.elements.party.value.trim(), phone: f.elements.phone.value.trim(), address: f.elements.address.value.trim(), unitId: f.elements.unitId.value, taxPct: en(f.elements.taxPct.value).replace('٫', '.') || 0, note: f.elements.note.value.trim(), items: read() });
    b.disabled = false;
    if (r.error) { $('#merr').textContent = r.error; return; }
    closeModal(); refresh(); toast('فاکتور ذخیره شد.'); showInvoice(r.id);
  });
}
function invoiceSheet(x) {
  const s = DB.settings || {}; const lh = s.letterhead || {};
  return `<div class="isheet print-target">${x.status === 'باطل‌شده' ? '<div class="lstamp">باطل شد</div>' : x.status === 'پیش‌نویس' ? '<div class="lstamp">پیش‌نویس</div>' : ''}
    <header class="ih">${EMBLEM}<div><b>${esc(s.orgName)}</b><small>${esc(unitName(x.unitId))}</small></div><div class="im"><div>فاکتور ${esc(x.kind)}</div><div>شماره: <b>${esc(x.no)}</b></div><div>تاریخ: <b>${jd(x.date)}</b></div></div></header>
    <div class="ip"><div><b>${x.kind === 'فروش' ? 'خریدار' : 'فروشنده'}:</b> ${esc(x.party)}</div>${x.phone ? `<div><b>تلفن:</b> ${fa(x.phone)}</div>` : ''}${x.address ? `<div><b>نشانی:</b> ${esc(x.address)}</div>` : ''}</div>
    <table class="itbl"><thead><tr><th>ردیف</th><th>شرح</th><th>تعداد</th><th>واحد</th><th>قیمت واحد (ریال)</th><th>تخفیف</th><th>مبلغ (ریال)</th></tr></thead><tbody>${x.items.map((i, n) => `<tr><td>${fa(n + 1)}</td><td>${esc(i.desc)}</td><td>${fa(i.qty)}</td><td>${esc(i.unit || '')}</td><td>${numFa(i.price)}</td><td>${i.disc ? numFa(i.disc) : '—'}</td><td>${numFa(i.sum)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><td colspan="6">جمع</td><td>${numFa(x.sub)}</td></tr>${x.tax ? `<tr><td colspan="6">مالیات بر ارزش افزوده (${fa(x.taxPct)}٪)</td><td>${numFa(x.tax)}</td></tr>` : ''}<tr class="tt"><td colspan="6">مبلغ قابل پرداخت</td><td>${numFa(x.total)}</td></tr></tfoot></table>
    ${x.note ? `<div class="ip">${esc(x.note)}</div>` : ''}
    <div class="vsign"><span>مهر و امضای ${x.kind === 'فروش' ? 'فروشنده' : 'خریدار'}</span><span>مهر و امضای ${x.kind === 'فروش' ? 'خریدار' : 'فروشنده'}</span></div>
    <footer class="lfoot">${[lh.address && 'نشانی: ' + lh.address, lh.phone && 'تلفن: ' + fa(lh.phone)].filter(Boolean).map(esc).join(' · ')}</footer></div>`;
}
function showInvoice(id) {
  const x = (DB.invoices || []).find(v => v.id === id); if (!x) return toast('این فاکتور در دسترس نیست.');
  modal({ title: 'فاکتور ' + x.no, wide: true,
    body: `<div class="row">${pill(x.status)}${x.voucherNo ? ' ' + pill('سند حسابداری ' + fa(x.voucherNo), 'info') : ''}${x.reverseNo ? ' ' + pill('سند برگشت ' + fa(x.reverseNo), 'warn') : ''}</div>
    ${x.status === 'باطل‌شده' ? `<div class="notice warn">این فاکتور در ${jdt(x.voidAt)} توسط ${esc(x.voidBy || '')} باطل شد. علت: ${esc(x.voidReason)}</div>` : ''}
    ${invoiceSheet(x)}<div><h3>سابقه</h3>${histHTML(x.history)}</div>`,
    foot: `${x.status === 'پیش‌نویس' && can('finance.post') ? btn('ویرایش', 'invEdit', { id }, 'ghost', 'edit') : ''}${x.status === 'پیش‌نویس' && can('finance.approve') ? btn('صدور قطعی', 'invIssue', { id }, '', 'check') : ''}${x.status !== 'باطل‌شده' && can('finance.approve') ? btn('ابطال فاکتور', 'invVoid', { id }, 'danger') : ''}${btn('چاپ', 'print', {}, 'ghost', 'print')}` });
}
A.invoice = d => showInvoice(d.id);
A.invEdit = d => invoiceForm((DB.invoices || []).find(v => v.id === d.id));
A.invIssue = d => { const x = (DB.invoices || []).find(v => v.id === d.id);
  actModal('صدور قطعی فاکتور ' + x.no, v => run('invoiceIssue', x.id, { post: v.post, acc: v.acc, cash: v.cash }), { fields: [{ k: 'post', l: 'ثبت در حسابداری', t: 'check', cl: 'سند حسابداری قطعی همزمان ثبت شود' }, { k: 'acc', l: x.kind === 'فروش' ? 'حساب درآمد' : 'حساب هزینه', t: 'select', o: leafOpts([x.kind === 'فروش' ? 'income' : 'expense']), blank: false }, { k: 'cash', l: x.kind === 'فروش' ? 'دریافت در (صندوق، بانک، دریافتنی)' : 'پرداخت از (صندوق، بانک، پرداختنی)', t: 'select', o: leafOpts(['asset', 'liability']), blank: false }],
    init: { post: true, acc: x.kind === 'فروش' ? '4901' : '5203', cash: '1102' }, noteLabel: 'توضیح', done: 'فاکتور صادر شد.', reopen: () => showInvoice(x.id) }); };
A.invVoid = d => actModal('ابطال فاکتور', v => run('invoiceVoid', d.id, v.note), { noteReq: true, noteLabel: 'علت ابطال (روی فاکتور و سابقه درج می‌شود)', done: 'فاکتور باطل شد؛ سند مرتبط برگشت خورد.', reopen: () => showInvoice(d.id) });

/* ---------- درخواست پرداخت ---------- */
const payTable = rows => { const p = paged('finp', rows); return table([
  ['شماره', p => `<span class="code">${esc(p.no)}</span>`], ['عنوان', p => `<b>${esc(p.title)}</b><span class="sub">${esc(p.payee)}</span>`],
  ['واحد', p => esc(unitShort(p.unitId))], ['مبلغ', p => money(p.amount)], ['ثبت', p => jd(isoOfStamp(p.created))],
  ['وضعیت', p => pill(payLabel(p)) + (p.needImam ? '<span class="sub">نیازمند تصویب امام</span>' : '') + (p.docNo ? `<span class="sub">${esc(fa(p.docNo))}</span>` : '')]
], p.rows, { click: 'pay', empty: 'درخواست پرداختی ثبت نشده است.' }) + p.more; };
A.pay = d => showPay(d.id);
A.newPay = () => formModal('درخواست پرداخت', [{ k: 'title', l: 'بابت', req: true, full: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'money', req: true }, { k: 'payee', l: 'دریافت‌کننده', req: true }, { k: 'desc', l: 'توضیح', t: 'textarea' }, { k: 'files', l: 'فاکتور / مستندات', t: 'file' }], {}, v => run('createPay', v), { done: 'درخواست پرداخت ثبت شد.', reopen: p => showPay(p.id) });
A.newCom = () => formModal('ثبت تعهد مالی', [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'unitId', l: 'واحد', t: 'select', o: unitOpts(), req: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'money', req: true }, { k: 'due', l: 'سررسید', t: 'date', req: true }], {}, v => run('addCommitment', v));
A.budget = d => { if (!(isImam() || isMgr(U_FIN))) return; const b = DB.budgets.find(x => x.unitId === +d.id && x.year === jYearNow()); formModal('بودجه ' + unitShort(+d.id), [{ k: 'amount', l: 'بودجه مصوب سال (ریال)', t: 'money', req: true }], { amount: b ? b.amount : 0 }, v => run('setBudget', +d.id, v.amount)); };
function showPay(id) {
  const p = DB.payreqs.find(x => x.id === id);
  if (!p) return toast('دسترسی به این درخواست مالی مجاز نیست.');
  const names = PAY_ST.map((n, i) => (i === 3 && !p.needImam ? n + ' (لازم نیست)' : n));
  modal({
    title: 'درخواست پرداخت ' + p.no, wide: true,
    body: `<div><h2>${esc(p.title)}</h2>${pill(payLabel(p))}</div>${steps(names, p.status === 'جاری' ? nextPayStage(p) : p.stage, p.stage === 4)}
    ${kv([['مبلغ', `<b>${money(p.amount)}</b>`], ['دریافت‌کننده', esc(p.payee)], ['واحد درخواست‌کننده', esc(unitName(p.unitId))], ['ثبت‌کننده', esc(who(p.by, p.byName)) + ' — ' + esc(posLabel(p.byPos))], ['تصویب امام جماعت', p.needImam ? 'لازم است (بالاتر از سقف)' : 'لازم نیست'], p.docNo && ['سند حسابداری', p.voucherId && (DB.vouchers || []).some(v => v.id === p.voucherId) ? `<a href="#" data-a="open" data-k="voucher" data-id="${p.voucherId}">${esc(fa(p.docNo))}</a>` : esc(fa(p.docNo))], p.desc && ['توضیح', esc(p.desc)], p.files.length && ['مستندات', files(p.files)]])}
    <div><h3>سابقه تأییدها</h3>${histHTML(p.history)}</div>`,
    foot: payCanAct(p) ? btn(nextPayStage(p) === 4 ? 'ثبت پرداخت و سند' : 'تأیید: ' + PAY_ST[nextPayStage(p)], 'payDo', { id, ok: 1 }) + btn('رد', 'payDo', { id, ok: 0 }, 'danger') : ''
  });
}
A.payDo = d => {
  const p = DB.payreqs.find(x => x.id === d.id); const s = nextPayStage(p); const fin = +d.ok && s === 4;
  actModal(+d.ok ? PAY_ST[s] : 'رد درخواست پرداخت', v => run('payAct', p.id, !!+d.ok, v.note, fin ? { exp: v.exp, cash: v.cash, date: v.date, ref: v.ref } : null), {
    fields: fin ? [{ k: 'exp', l: 'حساب هزینه', t: 'select', o: leafOpts(['expense']), blank: false }, { k: 'cash', l: 'پرداخت از', t: 'select', o: leafOpts(['asset', 'liability']), blank: false }, { k: 'date', l: 'تاریخ پرداخت', t: 'date', req: true }, { k: 'ref', l: 'شماره چک / پیگیری بانکی' }] : [],
    init: { exp: '5901', cash: '1102', date: todayISO() }, noteReq: !+d.ok, reopen: () => showPay(p.id), done: fin ? 'پرداخت و سند حسابداری ثبت شد.' : 'اقدام ثبت شد.'
  });
};

/* ---------- اسناد و گزارش‌های ارسالی واحدها ---------- */
A.newFindoc = d => { const x = d && d.id ? (DB.findocs || []).find(f => f.id === d.id) : null;
  formModal(x ? 'ارسال دوباره پس از اصلاح' : 'ارسال سند یا گزارش به امور مالی', [{ k: 'kind', l: 'نوع', t: 'select', o: ORG.FINDOC_KINDS, req: true }, { k: 'title', l: 'عنوان', req: true, full: true }, { k: 'amount', l: 'مبلغ (ریال)', t: 'money' }, { k: 'date', l: 'تاریخ سند', t: 'date', req: true }, { k: 'period', l: 'دوره گزارش', ph: 'مثلاً: آبان ۱۴۰۵' }, { k: 'desc', l: 'شرح', t: 'textarea' }, { k: 'files', l: 'تصویر یا فایل سند', t: 'file' }],
    x || { date: todayISO() }, v => run('findocSubmit', v, x ? x.id : ''), { done: 'برای امور مالی ارسال شد.', reopen: r => showFindoc(r.id), wide: true }); };
function showFindoc(id) {
  const x = (DB.findocs || []).find(f => f.id === id); if (!x) return toast('این سند در دسترس نیست.');
  const fin = (inUnit(U_FIN) && can('finance.post')) || isImam();
  modal({ title: x.kind + ' ' + x.no, wide: true,
    body: `<div class="row">${pill(x.status)} ${pill(x.kind, 'mute')}</div>${kv([['عنوان', `<b>${esc(x.title)}</b>`], ['مدیریت', esc(unitName(x.unitId))], ['ارسال‌کننده', esc(who(x.by, x.byName)) + ' — ' + esc(posLabel(x.byPos))], ['تاریخ', jd(x.date)], ['مبلغ', x.amount ? money(x.amount) : '—'], x.period && ['دوره', esc(x.period)], x.desc && ['شرح', esc(x.desc)], x.files.length && ['پیوست', files(x.files)]])}
    <div><h3>سابقه</h3>${histHTML(x.history)}</div>`,
    foot: `${fin && x.status === 'ارسال‌شده' ? btn('شروع بررسی', 'fdAct', { id, a: 'review' }, 'ghost') : ''}${fin && ['ارسال‌شده', 'در حال بررسی'].includes(x.status) ? btn('پذیرش', 'fdAct', { id, a: 'accept' }) + btn('برگشت برای اصلاح', 'fdAct', { id, a: 'return' }, 'danger') : ''}${x.status === 'برگشت برای اصلاح' && inUnit(x.unitId) && can('finance.docs') ? btn('اصلاح و ارسال دوباره', 'newFindoc', { id }, '', 'send') : ''}${fin && x.status === 'پذیرفته‌شده' && can('finance.post') ? btn('ثبت سند حسابداری', 'newVoucher', {}, 'ghost', 'calc') : ''}` });
}
A.findoc = d => showFindoc(d.id);
A.fdAct = d => actModal({ review: 'شروع بررسی', accept: 'پذیرش سند', return: 'برگشت برای اصلاح' }[d.a], v => run('findocAct', d.id, d.a, v.note), { noteReq: d.a === 'return', noteLabel: d.a === 'return' ? 'علت برگشت' : 'توضیح', reopen: () => showFindoc(d.id) });

/* ---------- کدینگ و دوره ---------- */
A.accNew = d => formModal('زیرحساب جدید زیر ' + accName(d.p), [{ k: 'code', l: 'کد حساب', req: true, hint: 'باید با ' + fa(d.p) + ' شروع شود' }, { k: 'name', l: 'نام حساب', req: true }], { code: d.p }, v => run('accSave', '', { ...v, parent: d.p }), { done: 'حساب تعریف شد.' });
A.accEdit = d => { const a = accBy(d.c); formModal('ویرایش حساب ' + fa(a.code), [{ k: 'name', l: 'نام حساب', req: true }, { k: 'active', l: 'وضعیت', t: 'check', cl: 'فعال (قابل ثبت)' }], a, v => run('accSave', a.code, v), { done: 'حساب ذخیره شد.' }); };
A.perNew = () => { const y = jYearNow() + 1; formModal('تعریف دوره مالی', [{ k: 'title', l: 'عنوان', req: true }, { k: 'from', l: 'شروع', t: 'date', req: true }, { k: 'to', l: 'پایان', t: 'date', req: true }], { title: 'سال مالی ' + fa(y), from: jToIsoN(y, 1, 1), to: jToIsoN(y, 12, jMonthLen(y, 12)) }, v => run('periodSave', v), { done: 'دوره تعریف شد.' }); };
A.perClose = d => actModal(+d.c ? 'بستن دوره مالی' : 'بازکردن دوره مالی', v => run('periodClose', d.id, !!+d.c, v.note), { noteReq: !+d.c, noteLabel: +d.c ? 'توضیح' : 'علت بازکردن دوره بسته' });
