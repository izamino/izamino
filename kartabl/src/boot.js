/* ---------- راه‌اندازی ---------- */
/* ردیف‌ها و کارت‌های کلیک‌پذیر با صفحه‌کلید هم قابل استفاده‌اند */
function a11yClickables(root = document) {
  $$('[data-a]:not(button):not(a[href]):not(input):not(select):not(textarea)', root).forEach(el => {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
  });
}
document.addEventListener('keydown', e => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-a][role="button"]')) { e.preventDefault(); e.target.click(); }
});
new MutationObserver(() => a11yClickables()).observe(document.documentElement, { childList: true, subtree: true });

function boot() {
  document.documentElement.lang = 'fa';
  document.documentElement.dir = 'rtl';
  const t = pref.get('theme', ''); if (t) document.documentElement.dataset.theme = t;
  window.addEventListener('hashchange', () => { closeModal(); route(); window.scrollTo(0, 0); });
  setInterval(tick, 1000);
  if (SERVER) { Remote.boot(); return; }
  Store.load();
  migrate(DB); applySettings();
  sweepDeadlines(); Store.save();
  const [sid, ses] = (sess.get() || '').split('|');
  const u = sid && userById(sid);
  const s = DB.sessions.find(x => x.id === ses);
  if (u && u.active && !u.deleted && u.posId && s && s.active) { setMe(u); renderShell(); } else { sess.set(null); renderLogin(); }
  Sync.init();
}
boot();
