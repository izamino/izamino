/* ---------- راه‌اندازی ---------- */
function boot() {
  const t = pref.get('theme', ''); if (t) document.documentElement.dataset.theme = t;
  Store.load();
  migrate(DB); applySettings();
  sweepDeadlines(); Store.save();
  const [sid, ses] = (sess.get() || '').split('|');
  const u = sid && userById(sid);
  const s = DB.sessions.find(x => x.id === ses);
  if (u && u.active && !u.deleted && u.posId && s && s.active) { setMe(u); renderShell(); } else { sess.set(null); renderLogin(); }
  window.addEventListener('hashchange', () => { closeModal(); route(); window.scrollTo(0, 0); });
  setInterval(tick, 1000);
  document.addEventListener('click', () => touchSession(), true);
  Sync.init();
}
boot();
