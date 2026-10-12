<?php
/** Small shared layout for install.php and settings.php. */
require_once __DIR__ . '/compat.php';
if (!defined('ABSPATH')) {
    exit;
}
function anbar_page_open($title)
{
    nocache_headers();
    header('X-Frame-Options: DENY');
    ?><!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title><?= htmlspecialchars($title) ?> — انبار شباب</title>
<link rel="stylesheet" href="assets/app.css"><style>
.setup { max-width: 760px; margin-inline: auto; padding: 24px 16px 60px; display: grid; gap: 16px; }
.setup h1 { display: flex; align-items: center; gap: 10px; } .setup h1 img { width: 44px; height: 44px; }
.setup table { width: 100%; border-collapse: collapse; } .setup td, .setup th { border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: right; }
.setup .ok { color: var(--ok); } .setup code { direction: ltr; display: inline-block; }
.setup pre { direction: ltr; text-align: left; background: var(--surface-2); padding: 12px; border-radius: 10px; overflow-x: auto; }
</style></head><body><main class="setup"><h1><img src="assets/logo.svg" alt=""><?= htmlspecialchars($title) ?></h1>
<?php
}
function anbar_page_close()
{
    echo '</main></body></html>';
}
function anbar_accounts_table($result)
{
    echo '<div class="card"><p><b>نتیجه ساخت حساب‌ها</b> — این فهرست فقط همین یک بار نمایش داده می‌شود. به هر نفر فقط اطلاعات حساب خودش را بدهید.</p><table><tr><th>نام</th><th>نام کاربری</th><th>رمز</th></tr>';
    foreach ($result as [$login, $name, $pw]) {
        echo '<tr><td>' . htmlspecialchars($name) . '</td><td dir="ltr">' . htmlspecialchars($login) . '</td><td dir="ltr">'
            . ($pw === null ? 'از قبل وجود داشت' : htmlspecialchars($pw)) . '</td></tr>';
    }
    echo '</table></div>';
}
function anbar_accounts_fields()
{
    ?>
    <div class="field"><label for="pw">رمزهای اولیه حساب‌ها</label>
      <textarea class="input" id="pw" name="passwords" rows="9" dir="ltr" placeholder="mohammadali 12345678"></textarea>
      <span class="hint">هر خط: نام کاربری، فاصله، رمز. می‌توانید کل جدول حساب‌ها را از سند راه‌اندازی همین‌جا بچسبانید.
        حسابی که رمزش وارد نشود رمز تصادفی ۸ رقمی می‌گیرد. رمزها فقط به‌صورت رمزنگاری‌شده ذخیره می‌شوند.</span></div>
    <label class="check"><input type="checkbox" name="force_change" value="1"> هر فرد در اولین ورود رمز شخصی خودش را تعیین کند (اختیاری)</label>
    <?php
}
