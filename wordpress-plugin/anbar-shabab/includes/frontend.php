<?php
/**
 * The app lives on one WordPress page that contains the [anbar_app] shortcode.
 * That page is rendered with the plugin's own full-screen template (no theme header/footer),
 * so it looks and works like a mobile app.
 */
if (!defined('ABSPATH')) {
    exit;
}

add_shortcode('anbar_app', function () {
    // Only reached if a theme bypasses template_include; render a link to the full-screen app.
    return '<p><a href="' . esc_url(anbar_app_url()) . '">ورود به سامانه انبار</a></p>';
});

function anbar_app_page_id()
{
    $id = (int) get_option('anbar_page_id');
    return ($id && get_post_status($id) === 'publish') ? $id : 0;
}

function anbar_app_url()
{
    $id = anbar_app_page_id();
    return $id ? get_permalink($id) : home_url('/');
}

function anbar_ensure_app_page()
{
    if (anbar_app_page_id()) {
        return;
    }
    $id = wp_insert_post([
        'post_title' => 'سامانه انبار',
        'post_name' => 'anbar',
        'post_content' => '[anbar_app]',
        'post_status' => 'publish',
        'post_type' => 'page',
        'comment_status' => 'closed',
    ]);
    if ($id && !is_wp_error($id)) {
        update_option('anbar_page_id', $id);
    }
}

function anbar_is_app_request()
{
    if (!is_singular()) {
        return false;
    }
    $post = get_queried_object();
    return $post instanceof WP_Post && ((int) $post->ID === anbar_app_page_id() || has_shortcode($post->post_content, 'anbar_app'));
}

add_filter('template_include', function ($template) {
    return anbar_is_app_request() ? ANBAR_DIR . 'templates/app.php' : $template;
}, 99);

// The app must never be cached by page-cache plugins: it carries a per-user security token.
add_action('template_redirect', function () {
    if (anbar_is_app_request()) {
        if (!defined('DONOTCACHEPAGE')) {
            define('DONOTCACHEPAGE', true);
        }
        nocache_headers();
    }
});

/** Settings passed to the JavaScript app. */
function anbar_client_config()
{
    $user = anbar_current();
    return [
        'root' => esc_url_raw(rest_url('anbar/v1/')),
        'nonce' => wp_create_nonce('wp_rest'),
        'assets' => ANBAR_URL . 'assets/',
        'loggedIn' => (bool) $user,
        'wpUser' => is_user_logged_in() && !$user ? wp_get_current_user()->display_name : null,
        'wpAdmin' => current_user_can('manage_options') ? admin_url('options-general.php?page=anbar-shabab') : null,
        'org' => get_option('anbar_settings', [])['org_name'] ?? 'مجتمع مسجد محور شباب',
        'orgSub' => get_option('anbar_settings', [])['org_sub'] ?? 'مجموعه تفکر ناب',
    ];
}

// People who only use the warehouse app don't need the WordPress dashboard or admin bar.
add_filter('show_admin_bar', function ($show) {
    if (is_user_logged_in() && !current_user_can('edit_posts') && current_user_can('anbar_access')) {
        return false;
    }
    return $show;
});
add_action('admin_init', function () {
    if (wp_doing_ajax() || !is_user_logged_in()) {
        return;
    }
    if (current_user_can('anbar_access') && !current_user_can('edit_posts') && anbar_app_page_id()) {
        wp_safe_redirect(anbar_app_url());
        exit;
    }
});
add_filter('login_redirect', function ($redirect, $requested, $user) {
    if ($user instanceof WP_User && user_can($user, 'anbar_access') && !user_can($user, 'edit_posts') && anbar_app_page_id()) {
        return anbar_app_url();
    }
    return $redirect;
}, 10, 3);
