<?php
/* نصب یک‌مرحله‌ای: پایگاه داده، نام مجموعه و حساب‌های جایگاه‌ها (نام کاربری و رمزی که خودتان وارد می‌کنید)
   پس از نصب موفق، این صفحه دیگر کار نمی‌کند. */
require __DIR__ . '/lib/boot.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$done = kt_config() !== null;
$err = ''; $msg = '';

/* جایگاه‌ها (بدون نیاز به پایگاه داده) */
Store::$D = (object)['settings' => (object)['units' => new stdClass(), 'unitsOff' => [], 'extraUnits' => []], 'positions' => [], 'users' => []];
$positions = basePositions(); Store::$D->positions = $positions;
$rows = []; foreach ($positions as $p) $rows[$p->id] = ['panel' => panelName($p), 'username' => defaultUsername($p), 'pass' => ''];

if (!$done && $_SERVER['REQUEST_METHOD'] === 'POST') {
  try {
    $drv = ($_POST['driver'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
    $org = trim((string)($_POST['org'] ?? '')); need($org !== '' && !preg_match(LABEL_BAD, $org), 'نام مجموعه را درست بنویسید.');
    foreach ($rows as $id => &$r) { $u = strtolower(trim(en((string)($_POST['u'][$id] ?? $r['username'])))); $r['username'] = $u; $r['pass'] = en((string)($_POST['p'][$id] ?? '')); } unset($r);
    /* جایگذاری فهرست: هر خط «نام‌کاربری فاصله رمز» */
    foreach (preg_split('/\r?\n/', (string)($_POST['paste'] ?? '')) as $line) {
      $line = trim(en($line)); if ($line === '') continue;
      $parts = preg_split('/[\s,;|\t]+/', $line); if (count($parts) < 2) continue;
      $un = strtolower($parts[0]); $pw = $parts[count($parts) - 1];
      $hit = false; foreach ($rows as &$r) if ($r['username'] === $un) { $r['pass'] = $pw; $hit = true; } unset($r);
      need($hit, 'نام کاربری «' . $un . '» در فهرست جایگاه‌ها نیست؛ ابتدا نام کاربری همان جایگاه را در جدول اصلاح کنید.');
    }
    $seen = [];
    foreach ($rows as $id => $r) {
      if ($r['pass'] === '') continue;
      need(preg_match('/^[a-z0-9._-]{3,32}$/', $r['username']), 'نام کاربری «' . $r['username'] . '» معتبر نیست (حروف انگلیسی، عدد، نقطه یا خط تیره).');
      need(!isset($seen[$r['username']]), 'نام کاربری «' . $r['username'] . '» تکراری است.'); $seen[$r['username']] = 1;
      need(mb_strlen($r['pass']) >= 6, 'رمز «' . $r['username'] . '» باید دست‌کم ۶ نویسه باشد.');
    }
    need($rows['P0']['pass'] !== '', 'رمز حساب امام جماعت لازم است.');
    need($rows['P16-m']['pass'] !== '', 'رمز حساب مدیر فناوری اطلاعات لازم است (مدیریت حساب‌ها با این حساب است).');
    $dataDir = KT_ROOT . '/data';
    if (!is_dir($dataDir)) @mkdir($dataDir, 0700, true);
    need(is_writable($dataDir), 'پوشه data قابل نوشتن نیست؛ دسترسی آن را ۷۵۵ یا ۷۰۰ کنید.');
    foreach (['files', 'backups'] as $sub) if (!is_dir("$dataDir/$sub")) @mkdir("$dataDir/$sub", 0700, true);
    $db = $drv === 'sqlite' ? ['driver' => 'sqlite', 'path' => $dataDir . '/kartabl.sqlite', 'prefix' => 'kt_']
      : ['driver' => 'mysql', 'host' => trim($_POST['host'] ?? 'localhost') ?: 'localhost', 'port' => (int)($_POST['port'] ?? 3306) ?: 3306, 'name' => trim($_POST['name'] ?? ''), 'user' => trim($_POST['user'] ?? ''), 'pass' => (string)($_POST['dbpass'] ?? ''), 'prefix' => preg_replace('/[^a-z0-9_]/', '', strtolower($_POST['prefix'] ?? 'kt_')) ?: 'kt_'];
    if ($drv === 'mysql') need($db['name'] !== '' && $db['user'] !== '', 'نام پایگاه داده و نام کاربری پایگاه داده را بنویسید.');
    try { KDB::connect($db); } catch (Throwable $e) { throw new OpError('اتصال به پایگاه داده برقرار نشد: ' . $e->getMessage()); }
    KDB::schema();
    need(!KDB::one("SELECT k FROM " . KDB::t('kv') . " LIMIT 1"), 'در این پایگاه داده قبلاً کارتابل نصب شده است. برای نصب تازه از پیشوند جدول دیگری استفاده کنید.');
    $D = baseDB($org); Store::$D = $D;
    $made = seedAccounts($D, $rows);
    KDB::lock(); $ok = false;
    try { Store::$orig = []; Store::$ver = 0; Store::save(); audit('نصب سامانه', 'system', '', fa($made) . ' حساب جایگاه'); flushAudit(); $ok = true; } finally { KDB::unlock($ok); }
    $cfg = "<?php\n/* پیکربندی کارتابل — این فایل را منتشر نکنید */\nreturn " . var_export(['db' => $db, 'dataDir' => $dataDir, 'maxUploadMB' => 20], true) . ";\n";
    if (@file_put_contents(KT_ROOT . '/config.php', $cfg) === false) throw new OpError('نوشتن config.php ممکن نشد؛ دسترسی نوشتن پوشه اصلی را بررسی کنید.');
    @chmod(KT_ROOT . '/config.php', 0600);
    $done = true; $msg = 'نصب انجام شد: ' . fa($made) . ' حساب جایگاه ساخته شد.';
  } catch (OpError $e) { $err = $e->getMessage(); }
}
$req = ['PHP ۷٫۴ یا بالاتر' => PHP_VERSION_ID >= 70400, 'PDO' => class_exists('PDO'), 'pdo_mysql یا pdo_sqlite' => extension_loaded('pdo_mysql') || extension_loaded('pdo_sqlite'), 'mbstring' => extension_loaded('mbstring'), 'json' => function_exists('json_encode'), 'dom (برای متن نامه‌ها)' => class_exists('DOMDocument'), 'zlib (پشتیبان فشرده)' => function_exists('gzencode'), 'پوشه data قابل نوشتن' => is_writable(KT_ROOT . '/data') || (!is_dir(KT_ROOT . '/data') && is_writable(KT_ROOT))];
?><!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>نصب کارتابل اداری</title>
<style>
@font-face{font-family:Vazirmatn;src:url(assets/fonts/vazirmatn-arabic-400-normal.woff2) format('woff2');font-weight:400}
@font-face{font-family:Vazirmatn;src:url(assets/fonts/vazirmatn-arabic-700-normal.woff2) format('woff2');font-weight:700}
body{font-family:Vazirmatn,Tahoma,sans-serif;background:#f3f5f4;color:#1b2a25;margin:0;line-height:1.8}
.wrap{max-width:980px;margin:24px auto;padding:0 16px}.card{background:#fff;border:1px solid #dde5e2;border-radius:14px;padding:20px;margin-bottom:16px}
h1{color:#0d3a2e;margin:0 0 6px}h2{font-size:1.05rem;margin:0 0 10px;color:#0d3a2e}label{display:block;font-size:.85rem;color:#4a5b55;margin-top:8px}
input,select,textarea{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border:1px solid #cdd8d4;border-radius:8px;background:#fff}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px}.btn{background:#0f4b3a;color:#fff;border:0;border-radius:10px;padding:12px 22px;font:inherit;font-weight:700;cursor:pointer;margin-top:14px}
table{width:100%;border-collapse:collapse;font-size:.85rem}td,th{border-bottom:1px solid #eef2f0;padding:5px;text-align:right}td input{direction:ltr;text-align:left}
.err{background:#fdecec;color:#8a1c1c;border-radius:10px;padding:10px 14px}.ok{background:#e4f5ee;color:#0d5c40;border-radius:10px;padding:10px 14px}.hint{font-size:.8rem;color:#6b7c76}
.req li{list-style:none}.req .y::before{content:'✓ ';color:#0d7a55}.req .n::before{content:'✗ ';color:#b42318}code{direction:ltr;display:inline-block;background:#f0f3f2;padding:0 6px;border-radius:5px}
</style></head><body><div class="wrap">
<div class="card"><h1>نصب کارتابل اداری</h1><div class="hint">نسخه <?= $h(KT_VERSION) ?> · این صفحه فقط یک بار کار می‌کند.</div></div>
<?php if ($done): ?>
  <div class="card"><div class="ok"><?= $h($msg ?: 'سامانه قبلاً نصب شده است.') ?></div>
  <p>نشانی سامانه: <a href="index.php">ورود به کارتابل</a>. با حساب مدیر فناوری اطلاعات وارد شوید؛ نام کاربری و رمز همه حساب‌ها از «پنل مدیریت سامانه › حساب‌ها» قابل تغییر است.</p>
  <p class="hint">برای امنیت بیشتر، پس از نصب فایل <code>install.php</code> را از هاست حذف کنید.</p></div>
<?php else: ?>
  <div class="card"><h2>بررسی پیش‌نیازها</h2><ul class="req"><?php foreach ($req as $k => $ok) echo '<li class="' . ($ok ? 'y' : 'n') . '">' . $h($k) . '</li>'; ?></ul></div>
  <?php if ($err): ?><div class="err"><?= $h($err) ?></div><?php endif; ?>
  <form method="post" autocomplete="off">
  <div class="card"><h2>۱. پایگاه داده</h2>
    <div class="g"><div><label>نوع</label><select name="driver"><option value="mysql">MySQL / MariaDB (پیشنهادی)</option><option value="sqlite" <?= ($_POST['driver'] ?? '') === 'sqlite' ? 'selected' : '' ?>>SQLite (فایل داخل پوشه data)</option></select></div>
    <div><label>میزبان</label><input name="host" value="<?= $h($_POST['host'] ?? 'localhost') ?>" dir="ltr"></div><div><label>درگاه</label><input name="port" value="<?= $h($_POST['port'] ?? '3306') ?>" dir="ltr"></div>
    <div><label>نام پایگاه داده</label><input name="name" value="<?= $h($_POST['name'] ?? '') ?>" dir="ltr"></div><div><label>نام کاربری پایگاه داده</label><input name="user" value="<?= $h($_POST['user'] ?? '') ?>" dir="ltr"></div>
    <div><label>رمز پایگاه داده</label><input name="dbpass" type="password" dir="ltr"></div><div><label>پیشوند جدول‌ها</label><input name="prefix" value="<?= $h($_POST['prefix'] ?? 'kt_') ?>" dir="ltr"></div></div>
  </div>
  <div class="card"><h2>۲. نام مجموعه</h2><input name="org" value="<?= $h($_POST['org'] ?? 'مجتمع مسجدمحور شباب اهل‌الجنه') ?>"></div>
  <div class="card"><h2>۳. حساب‌های جایگاه‌ها</h2>
    <p class="hint">برای هر جایگاه نام کاربری و رمز همان حساب‌هایی را که دارید وارد کنید. جایگاهی که رمز نداشته باشد فعلاً حساب ندارد و مدیر فناوری اطلاعات بعداً می‌تواند آن را بسازد. رمز امام جماعت و مدیر فناوری اطلاعات الزامی است. رمزها فقط به‌صورت درهم‌سازی‌شده ذخیره می‌شوند.</p>
    <label>جایگذاری فهرست (اختیاری): هر خط یک حساب — «نام‌کاربری فاصله رمز»</label>
    <textarea name="paste" rows="5" dir="ltr" placeholder="it.manager  ********&#10;finance.office  ********"><?= $h($_POST['paste'] ?? '') ?></textarea>
    <table><thead><tr><th>پنل</th><th>نام کاربری</th><th>رمز عبور</th></tr></thead><tbody>
    <?php foreach ($rows as $id => $r): ?><tr><td><?= $h($r['panel']) ?></td><td><input name="u[<?= $h($id) ?>]" value="<?= $h($_POST['u'][$id] ?? $r['username']) ?>"></td><td><input name="p[<?= $h($id) ?>]" type="password" autocomplete="new-password"></td></tr><?php endforeach; ?>
    </tbody></table>
  </div>
  <button class="btn" type="submit">نصب سامانه</button>
  </form>
<?php endif; ?>
</div></body></html>
