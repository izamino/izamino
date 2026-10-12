<?php
/**
 * One-time installer: database connection, tables, organisation name and the 15 initial accounts in one step,
 * so there is never a window where someone else could set the accounts' passwords.
 */
require __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/page.php';

$error = '';
$configured = is_file(ANBAR_CONFIG);
$has_users = $configured && anbar_is_installed() && (int) $GLOBALS['wpdb']->get_var("SELECT COUNT(*) FROM {$GLOBALS['wpdb']->users}") > 0;

if ($has_users) {
    anbar_page_open('سامانه نصب شده است');
    echo '<div class="card"><p>سامانه قبلاً نصب شده است. تنظیمات و حساب‌های باقی‌مانده از «تنظیمات» (برای مدیران کاربران) در دسترس است.</p>
      <div class="btns"><a class="btn" href="./">ورود به سامانه</a><a class="btn ghost" href="settings.php">تنظیمات</a></div></div>';
    anbar_page_close();
    exit;
}

$v = array_map('trim', $_POST + ['db_host' => 'localhost', 'db_name' => '', 'db_user' => '', 'db_pass' => '', 'prefix' => 'sb_',
    'org_name' => 'مجتمع مسجد محور شباب', 'org_sub' => 'مجموعه تفکر ناب', 'passwords' => '']);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        if (version_compare(PHP_VERSION, '7.4', '<')) {
            throw new RuntimeException('نسخه PHP باید ۷٫۴ یا بالاتر باشد.');
        }
        if ($configured) {
            // Config exists but accounts were never created: prove ownership with the database password.
            if (!hash_equals((string) DB_PASSWORD, (string) $v['db_pass'])) {
                throw new RuntimeException('رمز پایگاه داده درست نیست.');
            }
        } else {
            if (!preg_match('/^[a-zA-Z0-9_]{1,20}$/', $v['prefix'])) {
                throw new RuntimeException('پیشوند جدول‌ها فقط حروف انگلیسی، عدد و زیرخط باشد.');
            }
            require_once __DIR__ . '/lib/compat.php';
            new wpdb($v['db_host'], $v['db_user'], $v['db_pass'], $v['db_name'], $v['prefix']); // throws if it cannot connect
            $config = "<?php\n// Written by install.php\n"
                . "define('DB_HOST', " . var_export($v['db_host'], true) . ");\n"
                . "define('DB_NAME', " . var_export($v['db_name'], true) . ");\n"
                . "define('DB_USER', " . var_export($v['db_user'], true) . ");\n"
                . "define('DB_PASSWORD', " . var_export($v['db_pass'], true) . ");\n"
                . "define('TABLE_PREFIX', " . var_export($v['prefix'], true) . ");\n"
                . "define('ANBAR_SECRET', '" . bin2hex(random_bytes(32)) . "');\n";
            if (@file_put_contents(ANBAR_CONFIG, $config) === false) {
                anbar_page_open('ساخت فایل تنظیمات');
                echo '<div class="card"><p>برنامه اجازه نوشتن در پوشه را ندارد. یک فایل به نام <code>config.php</code> کنار <code>index.php</code> بسازید،
                  متن زیر را در آن بگذارید و دوباره این صفحه را باز کنید.</p><pre>' . htmlspecialchars($config) . '</pre></div>';
                anbar_page_close();
                exit;
            }
            @chmod(ANBAR_CONFIG, 0640);
            require __DIR__ . '/bootstrap.php';
        }
        anbar_compat_install_core();
        anbar_install_schema();
        anbar_private_dir();
        update_option('anbar_settings', ['org_name' => $v['org_name'], 'org_sub' => $v['org_sub']] + (get_option('anbar_settings', []) ?: []));
        $result = anbar_create_initial_accounts(anbar_parse_initial_passwords($v['passwords']), !empty($_POST['force_change']));
        anbar_page_open('نصب انجام شد');
        anbar_accounts_table($result);
        echo '<div class="card"><p>سامانه آماده است. ۱۰ انبار و ۱۵ حساب ساخته شد.</p><a class="btn" href="./">باز کردن سامانه</a></div>';
        anbar_page_close();
        exit;
    } catch (Throwable $e) {
        $error = $e->getMessage();
        if (is_file(ANBAR_CONFIG) && !$configured && strpos($error, 'اتصال') !== false) {
            @unlink(ANBAR_CONFIG);
        }
    }
}

anbar_page_open('نصب سامانه انبار شباب');
?>
<form method="post" class="form" autocomplete="off">
  <?php if ($error) : ?><p class="form-error"><?= htmlspecialchars($error) ?></p><?php endif; ?>
  <fieldset class="card form"><legend>پایگاه داده MySQL / MariaDB</legend>
    <?php if ($configured) : ?>
      <p>فایل تنظیمات وجود دارد ولی حساب‌ها ساخته نشده‌اند. برای ادامه، رمز پایگاه داده را وارد کنید.</p>
      <div class="field"><label>رمز پایگاه داده</label><input class="input" type="password" name="db_pass" dir="ltr" required></div>
    <?php else : ?>
      <p class="hint">این اطلاعات را از کنترل‌پنل هاست (بخش MySQL Databases) بردارید. پایگاه داده باید از قبل ساخته شده باشد.</p>
      <div class="form-row">
        <div class="field"><label>میزبان</label><input class="input" name="db_host" dir="ltr" value="<?= htmlspecialchars($v['db_host']) ?>" required></div>
        <div class="field"><label>نام پایگاه داده</label><input class="input" name="db_name" dir="ltr" value="<?= htmlspecialchars($v['db_name']) ?>" required></div>
      </div>
      <div class="form-row">
        <div class="field"><label>نام کاربری پایگاه داده</label><input class="input" name="db_user" dir="ltr" value="<?= htmlspecialchars($v['db_user']) ?>" required></div>
        <div class="field"><label>رمز پایگاه داده</label><input class="input" type="password" name="db_pass" dir="ltr"></div>
      </div>
      <div class="field"><label>پیشوند جدول‌ها</label><input class="input" name="prefix" dir="ltr" value="<?= htmlspecialchars($v['prefix']) ?>"></div>
    <?php endif; ?>
  </fieldset>
  <fieldset class="card form"><legend>مشخصات مجموعه</legend>
    <div class="form-row">
      <div class="field"><label>نام مجموعه</label><input class="input" name="org_name" value="<?= htmlspecialchars($v['org_name']) ?>"></div>
      <div class="field"><label>زیرعنوان</label><input class="input" name="org_sub" value="<?= htmlspecialchars($v['org_sub']) ?>"></div>
    </div>
  </fieldset>
  <fieldset class="card form"><legend>حساب‌های اولیه</legend>
    <p class="hint">۱۵ حساب طبق سند ساخته می‌شود (۱۰ نفر و ۵ حساب رزرو) با مجوزهای تعیین‌شده. حسابی برای حسین فرانی ساخته نمی‌شود.</p>
    <?php anbar_accounts_fields(); ?>
  </fieldset>
  <button class="btn block" type="submit">نصب</button>
</form>
<?php
anbar_page_close();
