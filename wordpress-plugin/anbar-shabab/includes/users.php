<?php
/**
 * People are WordPress users with the `anbar_user` role (capability `anbar_access`).
 * What each person may do is a set of independent permissions stored in user meta `anbar_perms`:
 *
 *   scope_all      sees and works in every warehouse (otherwise only `warehouses`)
 *   warehouses     warehouse ids for restricted users
 *   edit           create / edit asset cards (شناسنامه), record damage and repair
 *   stock_in       record stock entries and loan returns, receive transfers
 *   request_out    create exit requests
 *   approve        approve / reject exit requests, record stock decreases by correction
 *   deliver        record the actual hand-over of an approved exit
 *   manage_users   accounts, passwords, permissions, warehouses, backups
 *   tickets_review accept / reject public tickets
 *   tickets_all    see and follow up every public ticket (refer, notes, calls)
 *   steward        responsible for completing and unifying asset cards
 *
 * Every rule is enforced here on the server; the app only hides buttons for convenience.
 * WordPress site administrators are NOT automatically app users.
 */
if (!defined('ABSPATH')) {
    exit;
}

const ANBAR_PERMS = ['edit', 'stock_in', 'request_out', 'approve', 'deliver', 'manage_users', 'tickets_review', 'tickets_all', 'steward'];

function anbar_install_roles()
{
    add_role('anbar_user', 'کاربر سامانه انبار', ['read' => true, 'anbar_access' => true]);
    // Version 1 granted the app to site administrators and had an anbar_admin role; access is now explicit.
    $admin = get_role('administrator');
    if ($admin) {
        $admin->remove_cap('anbar_access');
        $admin->remove_cap('anbar_manage');
    }
    if (get_role('anbar_admin')) {
        foreach (get_users(['role' => 'anbar_admin']) as $u) {
            $u->set_role('anbar_user');
            if (!get_user_meta($u->ID, 'anbar_perms', true)) {
                anbar_save_perms($u->ID, anbar_full_perms());
            }
        }
        remove_role('anbar_admin');
    }
}

function anbar_full_perms()
{
    $p = ['scope_all' => true, 'warehouses' => []];
    foreach (ANBAR_PERMS as $k) {
        $p[$k] = $k !== 'steward';
    }
    return $p;
}

function anbar_normalize_perms($raw)
{
    $raw = is_array($raw) ? $raw : [];
    $p = ['scope_all' => !empty($raw['scope_all']), 'warehouses' => array_values(array_unique(array_map('intval', (array) ($raw['warehouses'] ?? []))))];
    foreach (ANBAR_PERMS as $k) {
        $p[$k] = !empty($raw[$k]);
    }
    return $p;
}

function anbar_get_perms($user_id)
{
    $raw = get_user_meta($user_id, 'anbar_perms', true);
    return anbar_normalize_perms(is_string($raw) ? json_decode($raw, true) : $raw);
}

function anbar_save_perms($user_id, $perms)
{
    update_user_meta($user_id, 'anbar_perms', wp_json_encode(anbar_normalize_perms($perms)));
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
        'title' => get_user_meta($id, 'anbar_title', true) ?: '',
        'phone' => get_user_meta($id, 'anbar_phone', true) ?: null,
        'chat_id' => get_user_meta($id, 'anbar_chat_id', true) ?: null,
        'active' => anbar_is_active($id),
        'must_change_pw' => get_user_meta($id, 'anbar_must_change_pw', true) === '1',
        'perms' => anbar_get_perms($id),
    ];
}

/** Everyone who can use the app (active or not). */
function anbar_app_users()
{
    return get_users(['capability' => 'anbar_access', 'orderby' => 'display_name']);
}

/** Warehouses the user may see: null = all. */
function anbar_scope($user)
{
    return $user['perms']['scope_all'] ? null : $user['perms']['warehouses'];
}
function anbar_can_see($user, $warehouse_id)
{
    $s = anbar_scope($user);
    return $s === null || in_array((int) $warehouse_id, $s, true);
}
/** Permission + warehouse scope check. `$warehouse_id` null checks the permission alone. */
function anbar_can($user, $perm, $warehouse_id = null)
{
    if (empty($user['perms'][$perm])) {
        return false;
    }
    return $warehouse_id === null || anbar_can_see($user, $warehouse_id);
}
function anbar_require($user, $perm, $warehouse_id = null, $msg = null)
{
    if (!anbar_can($user, $perm, $warehouse_id)) {
        throw anbar_forbidden($msg ?: 'شما اجازه این کار را در این انبار ندارید.');
    }
}
function anbar_require_see($user, $warehouse_id)
{
    if (!anbar_can_see($user, $warehouse_id)) {
        throw anbar_forbidden('این انبار در محدوده دسترسی شما نیست.');
    }
}
/** SQL fragment restricting a warehouse column to the user's scope. */
function anbar_scope_sql($user, $col)
{
    $s = anbar_scope($user);
    if ($s === null) {
        return '';
    }
    return $s ? " AND {$col} IN (" . implode(',', array_map('intval', $s)) . ')' : ' AND 1 = 0';
}

function anbar_check_new_password($pw)
{
    if (mb_strlen((string) $pw) < 6) {
        throw anbar_bad('رمز عبور باید حداقل ۶ کاراکتر باشد.');
    }
}

/** Active app users holding a permission for a warehouse (null = permission alone). */
function anbar_users_with($perm, $warehouse_id = null, $except = 0)
{
    static $all = null;
    if ($all === null) {
        $all = [];
        foreach (anbar_app_users() as $u) {
            if (anbar_is_active($u->ID)) {
                $all[] = anbar_user_public($u);
            }
        }
    }
    $ids = [];
    foreach ($all as $u) {
        if ($u['id'] !== (int) $except && ($perm === null ? ($warehouse_id === null || anbar_can_see($u, $warehouse_id)) : anbar_can($u, $perm, $warehouse_id))) {
            $ids[] = $u['id'];
        }
    }
    return $ids;
}

/**
 * Initial accounts from the project brief. Passwords are deliberately NOT stored here;
 * they are entered once on Settings → انبار شباب → «ایجاد حساب‌های اولیه».
 */
function anbar_initial_accounts()
{
    // Everyone completes and reviews asset cards within their own warehouse scope (steward).
    $gm = ['scope_all' => true, 'edit' => true, 'stock_in' => true, 'request_out' => true, 'approve' => true, 'deliver' => true,
        'manage_users' => true, 'tickets_review' => true, 'tickets_all' => true, 'steward' => true];
    $operator = ['edit' => true, 'stock_in' => true, 'request_out' => true, 'deliver' => true, 'steward' => true];
    $reserve = ['scope_all' => true, 'tickets_all' => true] + $operator;
    return [
        ['mohammadali', 'محمدعلی درویش‌نژاد', 'مدیر کل', $gm, []],
        ['mehdi', 'مهدی تمیمی', 'مدیر کل، مسئول ویژه انبار و پایگاه', $gm, []],
        ['mostafa', 'مصطفی دریانشین', 'مدیر کل تجهیزات', $gm, []],
        ['amin', 'محمد امین ابیات', 'مدیر کل', $gm, []],
        ['gholamreza', 'غلامرضا درویش‌نژاد', 'مدیر کل، مسئول ویژه کارگاه', $gm, []],
        ['morteza', 'مرتضی عثمانی', 'مسئول صوت', $operator, ['انبار صوت مسجد']],
        ['yahya', 'یحیی تمیمی', 'مسئول صوت', $operator, ['انبار صوت مسجد']],
        ['abbasali', 'عباسعلی همودی', 'مسئول کتابخانه', $operator, ['اموال و انبار کتابخانه']],
        ['amirhossein', 'امیرحسین مهاجرانی', 'مسئول رسانه', $operator, ['انبار رسانه']],
        ['ali', 'علی ایدانی', 'مسئول کل اموال و تأیید خروج',
            ['scope_all' => true, 'approve' => true, 'tickets_review' => true, 'tickets_all' => true] + $operator, []],
        ['reserve01', 'حساب رزرو ۱', 'حساب رزرو', $reserve, []],
        ['reserve02', 'حساب رزرو ۲', 'حساب رزرو', $reserve, []],
        ['reserve03', 'حساب رزرو ۳', 'حساب رزرو', $reserve, []],
        ['reserve04', 'حساب رزرو ۴', 'حساب رزرو', $reserve, []],
        ['reserve05', 'حساب رزرو ۵', 'حساب رزرو', $reserve, []],
    ];
}

/**
 * Create the initial accounts that don't exist yet.
 * `$passwords` maps username → password; a missing password gets a random 8-digit one.
 * Returns [[username, full_name, password|null(existing)], ...].
 */
function anbar_create_initial_accounts($passwords, $force_change = false)
{
    $out = [];
    foreach (anbar_initial_accounts() as [$login, $name, $title, $perms, $wh_names]) {
        if (username_exists($login)) {
            $out[] = [$login, $name, null];
            continue;
        }
        $pw = trim((string) ($passwords[$login] ?? ''));
        if (mb_strlen($pw) < 6) {
            $pw = (string) random_int(10000000, 99999999);
        }
        $id = wp_insert_user(['user_login' => $login, 'user_pass' => $pw, 'display_name' => $name, 'nickname' => $name,
            'first_name' => $name, 'role' => 'anbar_user', 'user_email' => '']);
        if (is_wp_error($id)) {
            $out[] = [$login, $name, 'خطا: ' . $id->get_error_message()];
            continue;
        }
        $ids = [];
        foreach ($wh_names as $wn) {
            $w = anbar_var('SELECT id FROM {warehouses} WHERE name = ?', $wn);
            if ($w) {
                $ids[] = (int) $w;
            }
        }
        anbar_save_perms($id, $perms + ['warehouses' => $ids]);
        update_user_meta($id, 'anbar_title', $title);
        update_user_meta($id, 'anbar_active', '1');
        update_user_meta($id, 'show_admin_bar_front', 'false');
        if ($force_change) {
            update_user_meta($id, 'anbar_must_change_pw', '1');
        }
        anbar_audit(get_current_user_id() ?: null, 'user_create', 'user', $id, ['username' => $login, 'source' => 'initial-accounts']);
        $out[] = [$login, $name, $pw];
    }
    return $out;
}

// Deactivated people cannot sign in, even through wp-login.php.
add_filter('wp_authenticate_user', function ($user) {
    if ($user instanceof WP_User && user_can($user, 'anbar_access') && !anbar_is_active($user->ID)) {
        return new WP_Error('anbar_inactive', 'حساب شما غیرفعال شده است. با مدیر سامانه تماس بگیرید.');
    }
    return $user;
});

/** Version 3: every initial account also completes asset cards (steward) within its scope. */
function anbar_grant_steward_to_initial_accounts()
{
    foreach (anbar_initial_accounts() as [$login]) {
        $u = get_user_by('login', $login);
        if ($u && user_can($u, 'anbar_access')) {
            $p = anbar_get_perms($u->ID);
            if (!$p['steward']) {
                $p['steward'] = true;
                anbar_save_perms($u->ID, $p);
            }
        }
    }
}
