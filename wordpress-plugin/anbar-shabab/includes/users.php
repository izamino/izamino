<?php
/**
 * People are ordinary WordPress users. Access to the app is the `anbar_access` capability;
 * general administrators additionally have `anbar_manage`. Warehouse managers are stored per warehouse.
 */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_install_roles()
{
    add_role('anbar_user', 'کاربر انبار', ['read' => true, 'anbar_access' => true]);
    add_role('anbar_admin', 'مدیر کل انبار', ['read' => true, 'anbar_access' => true, 'anbar_manage' => true]);
    $admin = get_role('administrator');
    if ($admin) {
        $admin->add_cap('anbar_access');
        $admin->add_cap('anbar_manage');
    }
}

function anbar_managed($user_id)
{
    return array_map('intval', array_column(anbar_all('SELECT warehouse_id FROM {warehouse_managers} WHERE user_id = ?', (int) $user_id), 'warehouse_id'));
}

function anbar_is_active($user_id)
{
    return get_user_meta($user_id, 'anbar_active', true) !== '0';
}

/** The signed-in person as the app sees them, or null. */
function anbar_current()
{
    static $cache = null;
    $uid = get_current_user_id();
    if (!$uid) {
        return null;
    }
    if ($cache && $cache['id'] === $uid) {
        return $cache;
    }
    $u = get_userdata($uid);
    if (!$u || !user_can($u, 'anbar_access') || !anbar_is_active($uid)) {
        return null;
    }
    $cache = anbar_user_public($u);
    return $cache;
}

function anbar_user_public($u)
{
    $id = (int) $u->ID;
    return [
        'id' => $id,
        'username' => $u->user_login,
        'full_name' => $u->display_name ?: $u->user_login,
        'role' => user_can($u, 'anbar_manage') ? 'admin' : 'user',
        'wp_admin' => user_can($u, 'manage_options'),
        'phone' => get_user_meta($id, 'anbar_phone', true) ?: null,
        'chat_id' => get_user_meta($id, 'anbar_chat_id', true) ?: null,
        'active' => anbar_is_active($id),
        'must_change_pw' => get_user_meta($id, 'anbar_must_change_pw', true) === '1',
        'managed' => anbar_managed($id),
    ];
}

/** Everyone who can use the app (active or not). */
function anbar_app_users()
{
    return get_users(['capability' => 'anbar_access', 'orderby' => 'display_name']);
}

function anbar_is_admin($user)
{
    return $user['role'] === 'admin';
}
function anbar_can_edit($user, $warehouse_id)
{
    return anbar_is_admin($user) || in_array((int) $warehouse_id, $user['managed'], true);
}
function anbar_require_edit($user, $warehouse_id)
{
    if (!anbar_can_edit($user, $warehouse_id)) {
        throw anbar_forbidden('فقط مدیر همین انبار یا مدیر کل می‌تواند این تغییر را ثبت کند.');
    }
}
function anbar_require_admin($user)
{
    if (!anbar_is_admin($user)) {
        throw anbar_forbidden('این بخش فقط برای مدیران کل است.');
    }
}

function anbar_check_new_password($pw)
{
    if (mb_strlen((string) $pw) < 6) {
        throw anbar_bad('رمز عبور باید حداقل ۶ کاراکتر باشد.');
    }
}

function anbar_set_managed($user_id, $warehouse_ids)
{
    anbar_run('DELETE FROM {warehouse_managers} WHERE user_id = ?', (int) $user_id);
    foreach (array_unique(array_map('intval', (array) $warehouse_ids)) as $w) {
        if (anbar_get('SELECT id FROM {warehouses} WHERE id = ?', $w)) {
            anbar_run('INSERT INTO {warehouse_managers} (warehouse_id, user_id) VALUES (?, ?)', $w, (int) $user_id);
        }
    }
}

// Deactivated people cannot sign in, even through wp-login.php.
add_filter('wp_authenticate_user', function ($user) {
    if ($user instanceof WP_User && user_can($user, 'anbar_access') && !anbar_is_active($user->ID)) {
        return new WP_Error('anbar_inactive', 'حساب شما غیرفعال شده است. با مدیر کل تماس بگیرید.');
    }
    return $user;
});
