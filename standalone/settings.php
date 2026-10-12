<?php
/** Settings for people with «مدیریت کاربران»: organisation name, SMS / messenger delivery, missing initial accounts. */
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/page.php';

$user = anbar_current();
if (!$user || !anbar_can($user, 'manage_users')) {
    anbar_page_open('تنظیمات');
    echo '<div class="card"><p>این صفحه فقط برای افرادی است که مجوز «مدیریت کاربران» دارند. ابتدا در سامانه وارد شوید.</p><a class="btn" href="./">ورود</a></div>';
    anbar_page_close();
    exit;
}

$notice = '';
$result = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!wp_verify_nonce($_POST['token'] ?? '', 'anbar_settings')) {
        $notice = 'فرم منقضی شده است؛ دوباره تلاش کنید.';
    } elseif (($_POST['do'] ?? '') === 'accounts') {
        $result = anbar_create_initial_accounts(anbar_parse_initial_passwords($_POST['passwords'] ?? ''), !empty($_POST['force_change']));
    } else {
        $s = [];
        foreach (['org_name', 'org_sub', 'bale_token', 'telegram_token', 'kavenegar_key', 'kavenegar_sender'] as $k) {
            $s[$k] = sanitize_text_field($_POST[$k] ?? '');
        }
        update_option('anbar_settings', $s);
        anbar_audit($user['id'], 'settings_update');
        $notice = 'تنظیمات ذخیره شد.';
    }
}
$s = anbar_settings();
$token = wp_create_nonce('anbar_settings');
$missing = array_filter(anbar_initial_accounts(), function ($a) {
    return !username_exists($a[0]);
});
$f = function ($k, $label, $ltr = false, $hint = '') use ($s) {
    echo '<div class="field"><label>' . htmlspecialchars($label) . '</label><input class="input" name="' . $k . '" value="' . htmlspecialchars($s[$k] ?? '') . '"'
        . ($ltr ? ' dir="ltr"' : '') . '>' . ($hint ? '<span class="hint">' . htmlspecialchars($hint) . '</span>' : '') . '</div>';
};

anbar_page_open('تنظیمات سامانه');
echo '<a class="back" href="./#/more">بازگشت به سامانه</a>';
if ($notice) {
    echo '<div class="callout info">' . htmlspecialchars($notice) . '</div>';
}
if ($result) {
    anbar_accounts_table($result);
}
?>
<form method="post" class="card form"><input type="hidden" name="token" value="<?= $token ?>">
  <h2>مشخصات مجموعه</h2>
  <div class="form-row"><?php $f('org_name', 'نام مجموعه'); $f('org_sub', 'زیرعنوان'); ?></div>
  <h2>ارسال اعلان با پیامک یا پیام‌رسان (اختیاری)</h2>
  <p class="hint">اعلان‌های مهم به شماره همراه یا شناسه گفت‌وگوی هر کاربر هم فرستاده می‌شود؛ هر کاربر آن را در «حساب من» وارد می‌کند.</p>
  <div class="form-row"><?php $f('bale_token', 'توکن ربات بله', true); $f('telegram_token', 'توکن ربات تلگرام', true); ?></div>
  <div class="form-row"><?php $f('kavenegar_key', 'کلید API کاوه‌نگار', true); $f('kavenegar_sender', 'شماره فرستنده کاوه‌نگار', true, 'اختیاری'); ?></div>
  <button class="btn" type="submit">ذخیره تنظیمات</button>
</form>
<?php if ($missing) : ?>
<form method="post" class="card form"><input type="hidden" name="token" value="<?= $token ?>"><input type="hidden" name="do" value="accounts">
  <h2>حساب‌های اولیه ساخته‌نشده (<?= count($missing) ?>)</h2>
  <p class="hint"><?= htmlspecialchars(implode('، ', array_map(function ($a) {
      return "{$a[1]} ({$a[0]})";
  }, $missing))) ?></p>
  <?php anbar_accounts_fields(); ?>
  <button class="btn" type="submit">ساخت حساب‌ها</button>
</form>
<?php endif;
anbar_page_close();
