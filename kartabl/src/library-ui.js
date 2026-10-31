/* =====================================================================
   کتابخانه و رزرو کتاب: بخش عمومی برای مردم (جدا از کارتابل اداری) و بخش خدمات عمومی کتابدار
   ===================================================================== */
const LIB_STEPS = ['انتخاب کتاب', 'ورود یا عضویت', 'ثبت درخواست', 'بررسی کتابدار', 'تأیید و اعلام مراجعه', 'تحویل و موعد بازگشت', 'بازگشت کتاب'];
const loanTone = s => (s === LOAN.ready ? 'ok' : s === LOAN.out ? 'info' : s === LOAN.pending ? 'warn' : s === LOAN.returned ? 'mute' : 'bad');

/* لایه داده عضو: سرور (نسخه عملیاتی) یا همین مرورگر (نسخه نمایشی) */
const Lib = {
  mem: null, loans: [], books: [], csrf: '',
  apply(r) { this.books = r.books || []; this.mem = r.member || null; this.loans = r.loans || []; if (r.csrf) this.csrf = r.csrf; },
  localMember() { let id = null; try { id = sessionStorage.getItem('shabab-member'); } catch (e) {} const m = id && DB.members.find(x => x.id === id); return m && m.active ? m : null; },
  localApply() { this.books = publicBooks(); const m = this.localMember(); if (m) { const v = memberView(m); this.mem = v.member; this.loans = v.loans; } else { this.mem = null; this.loans = []; } },
  async load() {
    if (!SERVER) return this.localApply();
    try { const r = await fetch('/api/lib/me', { credentials: 'same-origin' }).then(x => x.json()); this.apply(r); } catch (e) { this.books = []; }
  },
  async post(path, body) {
    if (SERVER) {
      let r; try { r = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Kartabl': '1', 'X-CSRF': this.csrf }, body: JSON.stringify(body || {}) }).then(x => x.json()); } catch (e) { return { error: 'ارتباط با سرور برقرار نشد.' }; }
      if (!r.error && (r.books || r.member !== undefined)) this.apply(r);
      return r;
    }
    /* نسخه نمایشی: همان قواعد، در مرورگر؛ خطا هیچ تغییر ناقصی باقی نمی‌گذارد */
    const snap = JSON.stringify(DB); let r;
    try {
      const m = this.localMember();
      if (path.endsWith('/signup')) { r = libSignup(body); if (!r.error) r = { ok: true, no: r.no }; }
      else if (path.endsWith('/login')) { const x = DB.members.find(y => y.username === String(body.username || '').trim().toLowerCase()); if (!x || !pwCheck(x.pass, body.pass)) r = fail('نام کاربری یا رمز عبور درست نیست.'); else if (!x.active) r = fail('عضویت شما غیرفعال شده است.'); else { try { sessionStorage.setItem('shabab-member', x.id); } catch (e) {} r = {}; } }
      else if (path.endsWith('/logout')) { try { sessionStorage.removeItem('shabab-member'); } catch (e) {} r = {}; }
      else if (!m) r = fail('برای ادامه وارد حساب عضویت شوید.');
      else if (path.endsWith('/request')) r = libRequest(m, body.bookId, body.type, body.note);
      else if (path.endsWith('/cancel')) r = libCancel(m, body.loanId);
    } catch (e) { r = fail('خطای پیش‌بینی‌نشده.'); }
    if (r && r.error) { DB = JSON.parse(snap); return r; }
    Store.save(); this.localApply();
    return r || {};
  }
};

/* ---------- صفحه عمومی ---------- */
function renderLibrary() {
  const act = document.activeElement && document.activeElement.id, caret = act && document.activeElement.selectionStart;
  closeModal(true);
  const v = vs('lib', { tab: 'catalog', q: '', cat: '' });
  const m = Lib.mem;
  const cats = [...new Set(Lib.books.map(b => b.category))];
  const list = Lib.books.filter(b => textMatch(v.q, b.title, b.author, b.publisher, b.code, b.category) && (!v.cat || b.category === v.cat) && (!v.avail || b.available > 0));
  const myActive = Lib.loans.filter(l => [LOAN.pending, LOAN.ready, LOAN.out].includes(l.status));
  $('#root').innerHTML = `<div class="lib">
    <header class="lib-top">
      <a class="lib-brand" href="#library" data-a="libTab" data-v="catalog"><span class="mark">${ic('book')}</span><span><b>کتابخانه و رزرو کتاب</b><small>${esc(DB.settings.orgName)}</small></span></a>
      <nav class="row">${m ? `${btn(`درخواست‌های من${myActive.length ? ' (' + fa(myActive.length) + ')' : ''}`, 'libTab', { v: 'mine' }, v.tab === 'mine' ? 'sm' : 'sm ghost', 'inbox')}${btn('خروج', 'libLogout', {}, 'sm ghost', 'logout')}` : `${btn('ورود اعضا', 'libAuth', { m: 'login' }, 'sm', 'user')}${btn('عضویت', 'libAuth', { m: 'signup' }, 'sm ghost', 'plus')}`}<a class="btn sm ghost staff-link" href="#dashboard">${ic('lock')}ورود کارکنان</a></nav>
    </header>
    <main class="lib-main">
      ${v.tab === 'mine' && m ? libMine() : `
      <section class="lib-hero">
        <div><h1>کتاب دلخواهتان را پیدا و رزرو کنید</h1><p>فهرست کتاب‌ها برای همه باز است. برای رزرو یا امانت، عضو شوید؛ پس از بررسی کتابدار، زمان مراجعه برای دریافت کتاب به شما اعلام می‌شود.</p>
        <div class="search lib-search">${ic('search')}<input type="search" id="flt-lib-q" data-f="lib:q" value="${esc(v.q)}" placeholder="جست‌وجوی عنوان، نویسنده یا ناشر…" aria-label="جست‌وجوی کتاب"></div></div>
        <ol class="lib-steps" aria-label="مراحل رزرو و امانت">${LIB_STEPS.map((s, i) => `<li><i>${fa(i + 1)}</i><span>${s}</span></li>`).join('')}</ol>
      </section>
      <div class="chips">${['', ...cats].map(c => `<button class="chip ${(v.cat || '') === c ? 'on' : ''}" data-a="libCat" data-v="${esc(c)}">${esc(c || 'همه موضوع‌ها')}</button>`).join('')}<button class="chip ${v.avail ? 'on' : ''}" data-a="libAvail">فقط کتاب‌های موجود</button></div>
      <div class="books">${list.length ? list.map(b => `<article class="bookcard">
        <div class="cover" aria-hidden="true">${ic('book')}<span>${esc(b.category)}</span></div>
        <div class="bk-b"><h3>${esc(b.title)}</h3><p>${esc(b.author)}</p>
          <div class="bk-st">${b.available ? pill(`${fa(b.available)} نسخه از ${fa(b.total)} موجود`, 'ok') : b.total ? pill('همه نسخه‌ها در امانت؛ قابل رزرو', 'warn') : pill('خارج از دسترس', 'mute')}</div>
          <div class="row">${b.total ? btn(b.available ? 'درخواست امانت' : 'رزرو', 'libReq', { id: b.id }, 'sm') : ''}${btn('جزئیات', 'libBook', { id: b.id }, 'sm ghost')}</div></div>
      </article>`).join('') : empty('کتابی با این مشخصات یافت نشد.')}</div>`}
    </main>
    <footer class="lib-foot">حساب عضویت کتابخانه از حساب کارکنان مجموعه جداست و به هیچ اطلاعات اداری دسترسی ندارد.</footer>
  </div>`;
  if (act && act.startsWith('flt-')) { const el = document.getElementById(act); if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch (e) {} } }
}
function libMine() {
  const m = Lib.mem;
  const late = Lib.loans.filter(l => l.late);
  return `<section class="card"><div class="cb"><div class="who2 big">${av(m.name)}<div><b>${esc(m.name)}</b><span class="sub">شماره عضویت <span class="code">${esc(m.no)}</span> · ${fa(m.phone)}</span></div></div>
    ${late.length ? `<div class="notice warn">${fa(late.length)} کتاب از موعد بازگشت گذشته است؛ لطفاً هرچه زودتر بازگردانید.</div>` : ''}</div></section>
  ${['active', 'past'].map(g => { const rows = Lib.loans.filter(l => (g === 'active') === [LOAN.pending, LOAN.ready, LOAN.out].includes(l.status)).slice().reverse();
    return card(g === 'active' ? 'درخواست‌ها و امانت‌های جاری' : 'سابقه امانت‌ها', rows.length ? `<div class="list">${rows.map(l => `<div class="li loanrow"><div class="k">${ic('book')}</div><div class="t">
      <b>${esc(l.book.title)}</b><small>${esc(l.type)} · <span class="code">${esc(l.no)}</span> · ثبت ${jd(isoOfStamp(l.requested))}${l.copy ? ' · نسخه ' + esc(l.copy) : ''}</small>
      ${l.status === LOAN.ready ? `<div class="notice ok-n">برای دریافت تا ${jd(l.readyUntil)} به کتابخانه مراجعه کنید.</div>` : ''}
      ${l.status === LOAN.out ? `<div class="hint">موعد بازگشت: ${dueTxt(l.due)}</div>` : ''}
      ${l.reply ? `<div class="box mt-s"><b>پاسخ کتابدار:</b> ${esc(l.reply)}</div>` : ''}</div>
      <div class="lr">${pill(l.late ? 'تأخیر در بازگشت' : l.status, l.late ? 'bad' : loanTone(l.status))}${[LOAN.pending, LOAN.ready].includes(l.status) ? btn('لغو', 'libCancel', { id: l.id }, 'sm ghost') : ''}</div></div>`).join('')}</div>` : empty(g === 'active' ? 'درخواست فعالی ندارید. از فهرست کتاب‌ها یک کتاب انتخاب کنید.' : 'هنوز سابقه‌ای ندارید.'), '', { flush: true }); }).join('')}`;
}
A.libTab = d => { vs('lib').tab = d.v; renderLibrary(); };
A.libCat = d => { vs('lib').cat = d.v; renderLibrary(); };
A.libAvail = () => { const v = vs('lib'); v.avail = !v.avail; renderLibrary(); };
A.libBook = d => { const b = Lib.books.find(x => x.id === d.id); if (!b) return; modal({ title: b.title, body: `${kv([['نویسنده', esc(b.author)], ['ناشر', esc(b.publisher || '—')], ['سال انتشار', fa(b.year || '—')], ['موضوع', esc(b.category)], ['شماره ثبت', `<span class="code">${esc(b.code)}</span>`], ['موجودی', `${fa(b.available)} نسخه آزاد از ${fa(b.total)}`]])}${b.desc ? `<div class="box">${esc(b.desc)}</div>` : ''}`, foot: b.total ? btn(b.available ? 'درخواست امانت' : 'رزرو', 'libReq', { id: b.id }, '', 'book') : '' }); };
A.libAuth = d => {
  const signup = d.m === 'signup';
  formModal(signup ? 'عضویت در کتابخانه' : 'ورود اعضای کتابخانه', signup ? [{ k: 'name', l: 'نام و نام خانوادگی', req: true }, { k: 'phone', l: 'شماره همراه', t: 'tel', req: true }, { k: 'username', l: 'نام کاربری', req: true, hint: 'حروف انگلیسی، عدد، نقطه یا خط تیره' }, { k: 'pass', l: 'رمز عبور', t: 'password', req: true, hint: 'دست‌کم ۸ نویسه' }] : [{ k: 'username', l: 'نام کاربری', req: true }, { k: 'pass', l: 'رمز عبور', t: 'password', req: true }], {}, async v => {
    if (signup) { const r = await Lib.post('/api/lib/signup', v); if (r.error) return r; const l = await Lib.post('/api/lib/login', { username: v.username, pass: v.pass }); if (l.error) return l; }
    else { const r = await Lib.post('/api/lib/login', v); if (r.error) return r; }
    if (SERVER) await Lib.load();
    return {};
  }, { submit: signup ? 'عضویت و ورود' : 'ورود', done: signup ? 'عضویت انجام شد؛ خوش آمدید.' : 'وارد شدید.', reopen: () => { renderLibrary(); if (Lib.pendingBook) { const id = Lib.pendingBook; Lib.pendingBook = null; A.libReq({ id }); } }, pre: signup ? '' : `<div class="hint">حساب ندارید؟ <button type="button" class="linkbtn" data-a="libAuth" data-m="signup">عضو شوید</button></div>` });
};
A.libReq = d => {
  const b = Lib.books.find(x => x.id === d.id); if (!b) return;
  if (!Lib.mem) { Lib.pendingBook = b.id; return A.libAuth({ m: 'login' }); }
  formModal('درخواست: ' + b.title, [{ k: 'type', l: 'نوع درخواست', t: 'select', o: b.available ? LOAN_TYPES : ['رزرو'], blank: false }, { k: 'note', l: 'توضیح برای کتابدار', t: 'textarea' }], { type: b.available ? 'امانت' : 'رزرو' }, async v => {
    const r = await Lib.post('/api/lib/request', { bookId: b.id, type: v.type, note: v.note }); return r.error ? r : {};
  }, { submit: 'ثبت درخواست', done: 'درخواست ثبت شد؛ نتیجه بررسی کتابدار در «درخواست‌های من» نمایش داده می‌شود.', reopen: () => { vs('lib').tab = 'mine'; renderLibrary(); }, pre: '<div class="notice">ثبت درخواست به معنای تحویل کتاب نیست. پس از تأیید کتابدار، یک نسخه برای شما کنار گذاشته و زمان مراجعه اعلام می‌شود.</div>' });
};
A.libCancel = async d => { const r = await Lib.post('/api/lib/cancel', { loanId: d.id }); if (r.error) return toast(r.error); renderLibrary(); toast('درخواست لغو شد.'); };
A.libLogout = async () => { await Lib.post('/api/lib/logout', {}); Lib.mem = null; Lib.loans = []; vs('lib').tab = 'catalog'; await Lib.load(); renderLibrary(); };

/* ---------- خدمات عمومی کتابخانه (کتابدار) ---------- */
PAGES['library-admin'] = () => {
  if (!canSeeLib()) return denied('خدمات عمومی کتابخانه فقط برای کتابداران مدیریت کتابخانه است.');
  const v = vs('libadm', { tab: 'requests' });
  const L = DB.loans, edit = canLib();
  const bookT = id => (DB.books.find(b => b.id === id) || {}).title || '—';
  const mem = id => DB.members.find(m => m.id === id) || {};
  const copyC = l => { const b = DB.books.find(x => x.id === l.bookId); const c = b && b.copies.find(x => x.id === l.copyId); return c ? c.code : '—'; };
  const pend = L.filter(l => l.status === LOAN.pending), ready = L.filter(l => l.status === LOAN.ready), out = L.filter(l => l.status === LOAN.out), late = out.filter(loanLate);
  const memCell = l => { const m = mem(l.memberId); return `${esc(m.name || '—')}<span class="sub"><span class="code">${esc(m.no || '')}</span> · ${fa(m.phone || '')}</span>`; };
  let body = '';
  if (v.tab === 'requests') body = card('درخواست‌های رزرو و امانت', table([['شماره', l => `<span class="code">${esc(l.no)}</span>`], ['کتاب', l => `<b>${esc(bookT(l.bookId))}</b><span class="sub">${esc(l.type)}${l.note ? ' · ' + esc(l.note) : ''}</span>`], ['عضو', memCell], ['ثبت', l => jd(isoOfStamp(l.requested))], ['وضعیت', l => pill(l.status, loanTone(l.status)) + (l.status === LOAN.ready ? `<span class="sub">نسخه ${esc(copyC(l))} · تا ${jd(l.readyUntil)}</span>` : '')],
    ['', l => !edit ? '' : l.status === LOAN.pending ? btn('تأیید', 'lbDecide', { id: l.id, ok: 1 }, 'sm') + ' ' + btn('رد', 'lbDecide', { id: l.id, ok: 0 }, 'sm danger') : btn('ثبت تحویل', 'lbDeliver', { id: l.id }, 'sm') + ' ' + btn('عدم مراجعه', 'lbExpire', { id: l.id }, 'sm ghost')]], [...pend, ...ready].sort(by('requested')), { empty: 'درخواست در انتظاری نیست.' }), '', { flush: true });
  if (v.tab === 'loans') body = card('امانت‌های جاری', table([['شماره', l => `<span class="code">${esc(l.no)}</span>`], ['کتاب', l => `<b>${esc(bookT(l.bookId))}</b><span class="sub code">${esc(copyC(l))}</span>`], ['عضو', memCell], ['تحویل', l => jd(isoOfStamp(l.deliveredAt))], ['موعد بازگشت', l => dueTxt(l.due)], ['', l => (edit ? btn('ثبت بازگشت', 'lbReturn', { id: l.id }, 'sm') + ' ' + btn('پیام', 'lbReply', { id: l.id }, 'sm ghost') : '')]], out.sort((a, b) => (a.due > b.due ? 1 : -1)), { empty: 'کتابی در امانت نیست.' }), '', { flush: true });
  if (v.tab === 'books') {
    const rows = DB.books.filter(b => textMatch(v.q, b.title, b.author, b.code));
    body = `<section class="card"><div class="ch"><h2>کتاب‌ها <small>${fa(DB.books.length)} عنوان · ${fa(sum(DB.books, b => b.copies.length))} نسخه</small></h2>${edit ? btn('ثبت کتاب', 'lbBook', {}, 'sm', 'plus') : ''}</div>${filterBar('libadm', [{ k: 'q', t: 'search', l: 'جست‌وجوی عنوان، نویسنده یا شماره ثبت…' }])}<div class="cb flush">${table([['شماره ثبت', b => `<span class="code">${esc(b.code)}</span>`], ['عنوان', b => `<b>${esc(b.title)}</b><span class="sub">${esc(b.author)}</span>`], ['موضوع', b => esc(b.category)], ['موجودی', b => { const f = freeCopies(b).length, t = b.copies.filter(c => c.status !== COPY_ST.off).length; return pill(`${fa(f)} از ${fa(t)} آزاد`, f ? 'ok' : 'warn'); }], ['', b => (edit ? btn('ویرایش', 'lbBook', { id: b.id }, 'sm ghost', 'edit') + ' ' + btn('نسخه‌ها', 'lbCopies', { id: b.id }, 'sm ghost', 'book') : '')]], rows)}</div></section>`;
  }
  if (v.tab === 'members') body = card('اعضای کتابخانه', table([['شماره عضویت', m => `<span class="code">${esc(m.no)}</span>`], ['نام', m => `<b>${esc(m.name)}</b><span class="sub code">${esc(m.username)}</span>`], ['تلفن', m => `<span class="code">${fa(m.phone)}</span>`], ['عضویت', m => jd(isoOfStamp(m.created))], ['امانت فعال', m => fa(L.filter(l => l.memberId === m.id && activeLoan(l)).length)], ['وضعیت', m => pill(m.active ? 'فعال' : 'غیرفعال')], ['', m => (edit ? btn(m.active ? 'غیرفعال‌سازی' : 'فعال‌سازی', 'lbMember', { id: m.id }, 'sm ghost') : '')]], DB.members.slice().reverse()), '', { flush: true });
  if (v.tab === 'history') body = card('سوابق', table([['شماره', l => `<span class="code">${esc(l.no)}</span>`], ['کتاب', l => esc(bookT(l.bookId))], ['عضو', memCell], ['وضعیت', l => pill(l.status, loanTone(l.status)) + (l.lateDays ? `<span class="sub">${fa(l.lateDays)} روز تأخیر</span>` : '')], ['پاسخ', l => esc(l.reply || '—')]], L.filter(l => !activeLoan(l)).slice().reverse(), { empty: 'سابقه‌ای نیست.' }), '', { flush: true });
  return `${head('خدمات عمومی کتابخانه', 'کتاب‌ها، رزرو و امانت مردم؛ کارتابل اداری کتابخانه در بخش جداگانه است', `<a class="btn ghost" href="#unit-${U_LIB}">${ic('inbox')}کارتابل اداری کتابخانه</a><a class="btn ghost" href="#library">${ic('book')}مشاهده سایت عمومی</a>`)}
  <div class="tiles">${tile('در انتظار بررسی', pend.length, '', pend.length ? 'warn' : 'ok')}${tile('آماده تحویل', ready.length)}${tile('در امانت', out.length)}${tile('تأخیر در بازگشت', late.length, '', late.length ? 'bad' : 'ok')}${tile('عنوان کتاب', DB.books.length)}${tile('اعضا', DB.members.length)}</div>
  ${tabs('libadm', [['requests', `درخواست‌ها (${fa(pend.length + ready.length)})`], ['loans', `امانت‌های جاری (${fa(out.length)})`], ['books', 'کتاب‌ها و نسخه‌ها'], ['members', 'اعضا'], ['history', 'سوابق']], v.tab)}${body}`;
};
A.lbDecide = d => actModal(+d.ok ? 'تأیید و اختصاص نسخه' : 'رد درخواست', v => run('loanDecide', d.id, !!+d.ok, v.note, v.days), { fields: +d.ok ? [{ k: 'days', l: 'مهلت مراجعه برای دریافت (روز)', t: 'number', req: true }] : [], init: { days: 3 }, noteReq: !+d.ok, noteLabel: +d.ok ? 'پیام به عضو (اختیاری)' : 'علت رد (برای عضو نمایش داده می‌شود)', submit: +d.ok ? 'تأیید' : 'رد', done: +d.ok ? 'یک نسخه آزاد کنار گذاشته شد و به عضو اعلام شد.' : 'درخواست رد شد.' });
A.lbDeliver = d => formModal('ثبت تحویل کتاب', [{ k: 'days', l: 'مدت امانت (روز)', t: 'number', req: true }], { days: 14 }, v => run('loanDeliver', d.id, v.days), { submit: 'ثبت تحویل', done: 'تحویل و موعد بازگشت ثبت شد.' });
A.lbReturn = d => confirmBox('ثبت بازگشت کتاب', 'بازگشت کتاب ثبت و نسخه آزاد شود؟', 'ثبت بازگشت', () => run('loanReturn', d.id), 'بازگشت ثبت شد و نسخه آزاد شد.');
A.lbExpire = d => actModal('لغو به دلیل عدم مراجعه', v => run('loanExpire', d.id, v.note), { init: { note: 'عضو در مهلت تعیین‌شده مراجعه نکرد.' }, done: 'نسخه آزاد شد.' });
A.lbReply = d => actModal('پیام به عضو', v => run('loanReply', d.id, v.note), { noteReq: true, noteLabel: 'متن پیام', done: 'پیام ثبت شد.' });
A.lbMember = async d => toastRes(await run('memberToggle', d.id), r => (r.active ? 'عضو فعال شد.' : 'عضو غیرفعال شد.'));
A.lbBook = d => { const b = d.id ? DB.books.find(x => x.id === d.id) : {}; formModal(d.id ? 'ویرایش کتاب' : 'ثبت کتاب', [{ k: 'title', l: 'عنوان', req: true, full: true }, { k: 'author', l: 'نویسنده', req: true }, { k: 'publisher', l: 'ناشر' }, { k: 'year', l: 'سال انتشار' }, { k: 'category', l: 'موضوع', t: 'select', o: BOOK_CATS, req: true }, ...(d.id ? [] : [{ k: 'copies', l: 'تعداد نسخه', t: 'number', req: true }]), { k: 'desc', l: 'معرفی کوتاه', t: 'textarea' }], d.id ? b : { copies: 1 }, v => run('saveBook', d.id || '', v), { done: d.id ? 'کتاب ویرایش شد.' : 'کتاب و نسخه‌ها ثبت شد.' }); };
A.lbCopies = d => {
  const b = DB.books.find(x => x.id === d.id); if (!b) return;
  modal({ title: 'نسخه‌های ' + b.title, wide: true, body: table([['شماره نسخه', c => `<span class="code">${esc(c.code)}</span>`], ['وضعیت', c => pill(c.status, c.status === COPY_ST.free ? 'ok' : c.status === COPY_ST.off ? 'mute' : 'info')], ['', c => (c.status === COPY_ST.free ? btn('خارج از دسترس', 'lbCopy', { b: b.id, c: c.id, v: 0 }, 'sm ghost') : c.status === COPY_ST.off ? btn('در دسترس', 'lbCopy', { b: b.id, c: c.id, v: 1 }, 'sm soft') : '<span class="hint">در رزرو یا امانت</span>')]], b.copies) + '<div class="hint mt">هر نسخه در هر لحظه فقط به یک عضو اختصاص می‌یابد.</div>', foot: btn('افزودن نسخه', 'lbAddCopies', { id: b.id }, '', 'plus') });
};
A.lbCopy = async d => { const r = await run('setCopyStatus', d.b, d.c, !!+d.v); if (r.error) return toast(r.error); refresh(); A.lbCopies({ id: d.b }); };
A.lbAddCopies = d => formModal('افزودن نسخه', [{ k: 'n', l: 'تعداد نسخه جدید', t: 'number', req: true }], { n: 1 }, v => run('addCopies', d.id, v.n), { done: 'نسخه‌ها افزوده شد.', reopen: () => A.lbCopies({ id: d.id }) });
