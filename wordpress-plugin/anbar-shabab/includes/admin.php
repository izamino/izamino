<?php
/**
 * Settings → انبار شباب (WordPress site administrators only):
 * organisation name, one-time creation of the initial accounts, and optional SMS / messenger delivery.
 */
if (!defined('ABSPATH')) {
    exit;
}

add_action('admin_menu', function () {
    add_options_page('سامانه انبار شباب', 'انبار شباب', 'manage_options', 'anbar-shabab', 'anbar_settings_page');
});

add_action('admin_init', function () {
    register_setting('anbar_settings', 'anbar_settings', [
        'type' => 'array',
        'sanitize_callback' => function ($v) {
            $out = [];
            foreach (['org_name', 'org_sub', 'bale_token', 'telegram_token', 'kavenegar_key', 'kavenegar_sender'] as $k) {
                $out[$k] = sanitize_text_field($v[$k] ?? '');
            }
            return $out;
        },
    ]);
});

add_filter('plugin_action_links_' . plugin_basename(ANBAR_FILE), function ($links) {
    array_unshift($links, '<a href="' . esc_url(anbar_app_url()) . '">باز کردن سامانه</a>',
        '<a href="' . esc_url(admin_url('options-general.php?page=anbar-shabab')) . '">تنظیمات</a>');
    return $links;
});

/**
 * Create the initial accounts. Passwords are pasted by the site administrator; the parser accepts
 * "username password" per line or the whole table from the project brief (it looks for each known
 * username followed by its password).
 */
add_action('admin_post_anbar_create_accounts', function () {
    if (!current_user_can('manage_options')) {
        wp_die('دسترسی ندارید.');
    }
    check_admin_referer('anbar_create_accounts');
    $text = anbar_to_latin(wp_unslash($_POST['passwords'] ?? ''));
    $passwords = [];
    foreach (anbar_initial_accounts() as [$login]) {
        if (preg_match('/(?<![\w.-])' . preg_quote($login, '/') . '(?![\w.-])\s+(\S{6,})/u', $text, $m)) {
            $passwords[$login] = $m[1];
        }
    }
    $result = anbar_create_initial_accounts($passwords, !empty($_POST['force_change']));
    set_transient('anbar_accounts_result_' . get_current_user_id(), $result, 10 * MINUTE_IN_SECONDS);
    wp_safe_redirect(admin_url('options-general.php?page=anbar-shabab&accounts=1#accounts'));
    exit;
});

function anbar_settings_page()
{
    $o = get_option('anbar_settings', []) + ['org_name' => 'مجتمع مسجد محور شباب', 'org_sub' => 'مجموعه تفکر ناب'];
    $field = function ($key, $label, $hint = '', $ltr = false) use ($o) {
        printf('<tr><th scope="row"><label for="anbar_%1$s">%2$s</label></th><td><input class="regular-text" %5$s id="anbar_%1$s" name="anbar_settings[%1$s]" value="%3$s">%4$s</td></tr>',
            esc_attr($key), esc_html($label), esc_attr($o[$key] ?? ''), $hint ? '<p class="description">' . esc_html($hint) . '</p>' : '', $ltr ? 'dir="ltr"' : '');
    };
    $result = get_transient('anbar_accounts_result_' . get_current_user_id());
    if ($result) {
        delete_transient('anbar_accounts_result_' . get_current_user_id());
    }
    $existing = [];
    foreach (anbar_initial_accounts() as [$login, $name, $title]) {
        $existing[] = [$login, $name, $title, (bool) username_exists($login)];
    }
    $missing = count(array_filter($existing, function ($e) {
        return !$e[3];
    }));
    ?>
    <div class="wrap">
      <h1>سامانه انبار شباب</h1>
      <p>
        <a class="button button-primary" href="<?php echo esc_url(anbar_app_url()); ?>" target="_blank">باز کردن سامانه</a>
        نشانی سامانه: <code dir="ltr"><?php echo esc_html(anbar_app_url()); ?></code>
      </p>
      <?php if (get_option('users_can_register')) : ?>
        <div class="notice notice-warning inline"><p>ثبت‌نام عمومی وردپرس روشن است. افرادی که خودشان ثبت‌نام کنند به سامانه انبار دسترسی ندارند،
          ولی چون سامانه ثبت‌نام عمومی ندارد بهتر است آن را از «تنظیمات › عمومی › عضویت» خاموش کنید.</p></div>
      <?php endif; ?>
      <p>حساب مدیر سایت وردپرس به سامانه انبار دسترسی ندارد. فقط حساب‌های تعریف‌شده در سامانه وارد پنل انبار می‌شوند.</p>

      <h2 id="accounts">حساب‌های اولیه سامانه</h2>
      <?php if ($result) : ?>
        <div class="notice notice-success inline"><p>نتیجه ساخت حساب‌ها (این فهرست فقط همین یک بار نمایش داده می‌شود):</p>
          <table class="widefat striped" style="max-width:640px"><thead><tr><th>نام</th><th>نام کاربری</th><th>رمز اولیه</th></tr></thead><tbody>
          <?php foreach ($result as [$login, $name, $pw]) : ?>
            <tr><td><?php echo esc_html($name); ?></td><td dir="ltr"><?php echo esc_html($login); ?></td>
              <td dir="ltr"><?php echo $pw === null ? 'از قبل وجود داشت' : esc_html($pw); ?></td></tr>
          <?php endforeach; ?>
          </tbody></table></div>
      <?php endif; ?>
      <table class="widefat striped" style="max-width:820px">
        <thead><tr><th>نام و عنوان</th><th>نام کاربری</th><th>وضعیت</th></tr></thead><tbody>
        <?php foreach ($existing as [$login, $name, $title, $exists]) : ?>
          <tr><td><?php echo esc_html("{$name} — {$title}"); ?></td><td dir="ltr"><?php echo esc_html($login); ?></td>
            <td><?php echo $exists ? '✓ ساخته شده' : 'هنوز ساخته نشده'; ?></td></tr>
        <?php endforeach; ?>
        </tbody></table>
      <?php if ($missing) : ?>
        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="max-width:820px;margin-top:12px">
          <input type="hidden" name="action" value="anbar_create_accounts">
          <?php wp_nonce_field('anbar_create_accounts'); ?>
          <p><label for="anbar_passwords"><b>رمزهای اولیه</b></label><br>
            هر خط: نام کاربری، فاصله، رمز. می‌توانید کل جدول حساب‌ها را از سند راه‌اندازی همین‌جا بچسبانید.
            حسابی که رمزش وارد نشود، رمز تصادفی ۸ رقمی می‌گیرد. رمزها به‌صورت رمزنگاری‌شده ذخیره می‌شوند و جایی نگه داشته نمی‌شوند.</p>
          <textarea id="anbar_passwords" name="passwords" rows="10" class="large-text code" dir="ltr" placeholder="mohammadali 12345678"></textarea>
          <p><label><input type="checkbox" name="force_change" value="1"> هر فرد در اولین ورود رمز شخصی خودش را تعیین کند (اختیاری)</label></p>
          <?php submit_button('ساخت ' . $missing . ' حساب باقی‌مانده', 'primary', 'submit', false); ?>
        </form>
      <?php endif; ?>

      <form method="post" action="options.php">
        <?php settings_fields('anbar_settings'); ?>
        <h2>مشخصات مجموعه</h2>
        <table class="form-table" role="presentation">
          <?php $field('org_name', 'نام مجموعه'); ?>
          <?php $field('org_sub', 'زیرعنوان'); ?>
        </table>
        <h2>ارسال اعلان با پیامک یا پیام‌رسان (اختیاری)</h2>
        <p>اعلان‌های مهم علاوه بر مرکز اعلان سامانه به شماره همراه یا شناسه گفت‌وگوی هر کاربر هم فرستاده می‌شود.
          هر کاربر این اطلاعات را در «حساب من» وارد می‌کند.</p>
        <table class="form-table" role="presentation">
          <?php $field('bale_token', 'توکن ربات بله', '', true); ?>
          <?php $field('telegram_token', 'توکن ربات تلگرام', '', true); ?>
          <?php $field('kavenegar_key', 'کلید API کاوه‌نگار', '', true); ?>
          <?php $field('kavenegar_sender', 'شماره فرستنده کاوه‌نگار', 'اختیاری', true); ?>
        </table>
        <?php submit_button('ذخیره تنظیمات'); ?>
      </form>
    </div>
    <?php
}
