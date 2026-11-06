/* =====================================================================
   پیام‌های مستقیم میان پنل‌ها (گفت‌وگوی کوتاه کاری؛ مکاتبه رسمی از مسیر دبیرخانه)
   ===================================================================== */
function threads() {
  const me = ME.pos.id; const T = {};
  (DB.messages || []).forEach(m => { const o = m.from === me ? m.to : m.from; (T[o] = T[o] || { pos: o, list: [], unread: 0 }).list.push(m); if (m.to === me && !m.read) T[o].unread++; });
  return Object.values(T).map(t => ({ ...t, last: t.list[t.list.length - 1] })).sort((a, b) => (a.last.ts < b.last.ts ? 1 : -1));
}
PAGES.messages = () => {
  if (!can('messages.use') && !isImam()) return denied('پیام‌رسانی برای جایگاه شما فعال نشده است؛ مدیر بخش می‌تواند آن را فعال کند.');
  const v = vs('msg');
  const T = threads();
  const cur = v.with && posById(v.with) ? v.with : '';
  const list = T.filter(t => textMatch(v.q, posLabel(t.pos), (holderOf(t.pos) || {}).name || ''));
  const conv = cur ? (DB.messages || []).filter(m => m.from === cur || m.to === cur) : [];
  if (cur && conv.some(m => m.to === ME.pos.id && !m.read)) setTimeout(() => run('readThread', cur).then(() => renderChrome()), 50);
  const bubble = m => `<div class="bub ${m.from === ME.pos.id ? 'me' : ''}"><div>${esc(m.text).replace(/\n/g, '<br>')}</div>${files(m.files)}<small>${jdt(m.ts)}${m.from === ME.pos.id ? (m.read ? ' · خوانده شد' : ' · ارسال شد') : ''}</small></div>`;
  return `${head('پیام‌ها', 'گفت‌وگوی مستقیم میان پنل‌ها؛ برای مکاتبه رسمی و شماره‌دار از «دبیرخانه» استفاده کنید', btn('پیام جدید', 'newMsg', {}, '', 'plus'))}
  <div class="chatwrap ${cur ? 'has' : ''}">
    <section class="card threads"><div class="filters"><input type="search" id="flt-msg-q" data-f="msg:q" placeholder="جست‌وجوی پنل یا نام…" value="${esc(v.q || '')}" aria-label="جست‌وجو"></div>
      ${list.length ? `<div class="list">${list.map(t => `<a class="li ${t.pos === cur ? 'on' : ''}" data-a="msgOpen" data-id="${t.pos}">${av((holderOf(t.pos) || {}).name || posLabel(t.pos))}<div class="t"><b>${esc(panelName(posById(t.pos)))}</b><small>${esc((holderOf(t.pos) || {}).name || '')} · ${esc(t.last.text.slice(0, 40))}</small></div>${t.unread ? `<span class="cnt">${fa(t.unread)}</span>` : ''}</a>`).join('')}</div>` : empty('گفت‌وگویی ندارید. «پیام جدید» را بزنید.')}
    </section>
    <section class="card conv">${cur ? `<div class="ch"><button class="ibtn sm back" data-a="msgBack" aria-label="بازگشت">${ic('logout')}</button><h2>${esc(panelName(posById(cur)))}<small> — ${esc((holderOf(cur) || {}).name || 'بدون متصدی')}</small></h2></div>
      <div class="bubbles" id="bubbles">${conv.length ? conv.map(bubble).join('') : empty('هنوز پیامی رد و بدل نشده است.')}</div>
      <form class="composer" id="msgf"><textarea id="msgt" rows="2" placeholder="پیام خود را بنویسید… (Enter برای ارسال، Shift+Enter برای خط جدید)" aria-label="متن پیام"></textarea><label class="ibtn" title="پیوست" aria-label="پیوست">${ic('clip')}<input type="file" id="msgfile" hidden multiple></label><button class="btn" type="submit" id="msgsend">${ic('send')}ارسال</button></form><div class="hint" id="msgatt"></div>`
      : `<div class="cb">${empty('یک گفت‌وگو را از فهرست انتخاب کنید.')}</div>`}</section>
  </div>`;
};
A.msgOpen = d => { vs('msg').with = d.id; route(); setTimeout(msgReady, 30); };
A.msgBack = () => { vs('msg').with = ''; route(); };
A.newMsg = () => formModal('پیام جدید', [{ k: 'to', l: 'به پنل', t: 'select', o: allPosOpts().map(g => ({ ...g, items: g.items.filter(([p]) => p !== ME.pos.id) })), req: true }, { k: 'text', l: 'متن پیام', t: 'textarea', req: true }, { k: 'files', l: 'پیوست', t: 'file' }], {}, v => run('sendMessage', v.to, v.text, v.files), { done: 'پیام ارسال شد.', noDraft: true, reopen: () => { location.hash = 'messages'; A.msgOpen({ id: ME && (DB.messages || []).slice(-1)[0] ? (DB.messages || []).slice(-1)[0].to : '' }); } });
let MSG_FILES = [];
function msgReady() {
  const f = $('#msgf'); if (!f || f.dataset.ok) return; f.dataset.ok = 1;
  const b = $('#bubbles'); if (b) b.scrollTop = b.scrollHeight;
  const t = $('#msgt'); t.focus();
  t.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); f.requestSubmit(); } });
  $('#msgfile').addEventListener('change', async e => { for (const x of [...e.target.files]) { try { MSG_FILES.push(await readFile(x)); } catch (er) { toast(er.message); } } $('#msgatt').textContent = MSG_FILES.length ? fa(MSG_FILES.length) + ' پیوست آماده ارسال' : ''; });
  f.addEventListener('submit', async e => {
    e.preventDefault(); const s = $('#msgsend'); if (s.disabled) return;
    const txt = t.value.trim(); if (!txt && !MSG_FILES.length) return;
    s.disabled = true; const r = await run('sendMessage', vs('msg').with, txt, MSG_FILES); s.disabled = false;
    if (r.error) return toast(r.error);
    MSG_FILES = []; route(); setTimeout(msgReady, 30);
  });
}
new MutationObserver(() => { if ($('#msgf') && !$('#msgf').dataset.ok) msgReady(); }).observe(document.documentElement, { childList: true, subtree: true });
