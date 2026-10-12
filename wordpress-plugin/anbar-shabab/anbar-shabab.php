<?php
/**
 * Plugin Name:       سامانه انبار شباب
 * Description:       مدیریت انبارهای مجتمع مسجد محور شباب — مجموعه تفکر ناب: ثبت تجهیزات، موجودی، ورود و خروج، امانت، انتقال، درخواست و اطلاع‌رسانی.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            مجموعه تفکر ناب
 * License:           GPL-2.0-or-later
 * Text Domain:       anbar-shabab
 */

if (!defined('ABSPATH')) {
    exit;
}

define('ANBAR_VERSION', '1.0.0');
define('ANBAR_DB_VERSION', '1');
define('ANBAR_FILE', __FILE__);
define('ANBAR_DIR', plugin_dir_path(__FILE__));
define('ANBAR_URL', plugin_dir_url(__FILE__));

require_once ANBAR_DIR . 'includes/util.php';
require_once ANBAR_DIR . 'includes/db.php';
require_once ANBAR_DIR . 'includes/users.php';
require_once ANBAR_DIR . 'includes/notify.php';
require_once ANBAR_DIR . 'includes/stock.php';
require_once ANBAR_DIR . 'includes/xlsx.php';
require_once ANBAR_DIR . 'includes/rest.php';
require_once ANBAR_DIR . 'includes/frontend.php';
require_once ANBAR_DIR . 'includes/admin.php';

register_activation_hook(__FILE__, 'anbar_activate');
register_deactivation_hook(__FILE__, 'anbar_deactivate');

function anbar_activate()
{
    anbar_install_schema();
    anbar_install_roles();
    anbar_private_dir();
    anbar_ensure_app_page();
    if (!wp_next_scheduled('anbar_hourly')) {
        wp_schedule_event(time() + 60, 'hourly', 'anbar_hourly');
    }
    if (!wp_next_scheduled('anbar_daily')) {
        wp_schedule_event(time() + 300, 'daily', 'anbar_daily');
    }
}

function anbar_deactivate()
{
    wp_clear_scheduled_hook('anbar_hourly');
    wp_clear_scheduled_hook('anbar_daily');
}

// Upgrades that ship schema changes run once per version.
add_action('plugins_loaded', function () {
    if (get_option('anbar_db_version') !== ANBAR_DB_VERSION) {
        anbar_install_schema();
        anbar_install_roles();
    }
});

add_action('anbar_hourly', 'anbar_run_scheduled_checks');
add_action('anbar_daily', function () {
    anbar_backup_now();
});
