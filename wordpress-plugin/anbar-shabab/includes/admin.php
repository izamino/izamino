<?php
/** Settings → انبار شباب: organisation name, app page, and optional SMS / messenger delivery. */
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

function anbar_settings_page()
{
    $o = get_option('anbar_settings', []) + ['org_name' => 'مجتمع مسجد محور شباب', 'org_sub' => 'مجموعه تفکر ناب'];
    $field = function ($key, $label, $hint = '', $ltr = false) use ($o) {
        printf('<tr><th scope="row"><label for="anbar_%1$s">%2$s</label></th><td><input class="regular-text" %5$s id="anbar_%1$s" name="anbar_settings[%1$s]" value="%3$s">%4$s</td></tr>',
            esc_attr($key), esc_html($label), esc_attr($o[$key] ?? ''), $hint ? '<p class="description">' . esc_html($hint) . '</p>' : '', $ltr ? 'dir="ltr"' : '');
    };
    ?>
    <div class="wrap">
      <h1>سامانه انبار شباب</h1>
      <p>
        <a class="button button-primary" href="<?php echo esc_url(anbar_app_url()); ?>" target="_blank">باز کردن سامانه</a>
        نشانی سامانه: <code dir="ltr"><?php echo esc_html(anbar_app_url()); ?></code>
      </p>
      <?php if (get_option('users_can_register')) : ?>
        <div class="notice notice-warning inline"><p>ثبت‌نام عمومی وردپرس روشن است. کاربرانی که خودشان ثبت‌نام کنند به سامانه انبار دسترسی ندارند،
          ولی اگر ثبت‌نام لازم نیست آن را از «تنظیمات › عمومی › عضویت» خاموش کنید.</p></div>
      <?php endif; ?>
      <p>کاربران سامانه را از داخل خود سامانه (بخش «کاربران») بسازید. مدیران سایت وردپرس به‌طور خودکار «مدیر کل» انبار هستند.</p>
      <form method="post" action="options.php">
        <?php settings_fields('anbar_settings'); ?>
        <h2>مشخصات مجموعه</h2>
        <table class="form-table" role="presentation">
          <?php $field('org_name', 'نام مجموعه'); ?>
          <?php $field('org_sub', 'زیرعنوان'); ?>
        </table>
        <h2>ارسال اعلان با پیامک یا پیام‌رسان (اختیاری)</h2>
        <p>اعلان‌های مهم (کمبود، اتمام کالا، درخواست جدید، انتقال، تأخیر امانت، خرابی، انقضا و اطلاعیه‌ها) علاوه بر مرکز اعلان سامانه
          به شماره همراه یا شناسه گفت‌وگوی هر کاربر هم فرستاده می‌شود. هر کاربر این اطلاعات را در «حساب من» وارد می‌کند.</p>
        <table class="form-table" role="presentation">
          <?php $field('bale_token', 'توکن ربات بله', 'از @BotFather در بله دریافت کنید.', true); ?>
          <?php $field('telegram_token', 'توکن ربات تلگرام', '', true); ?>
          <?php $field('kavenegar_key', 'کلید API کاوه‌نگار', '', true); ?>
          <?php $field('kavenegar_sender', 'شماره فرستنده کاوه‌نگار', 'اختیاری', true); ?>
        </table>
        <?php submit_button('ذخیره تنظیمات'); ?>
      </form>
    </div>
    <?php
}
