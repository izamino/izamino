<?php
/** Standalone glue: API dispatcher, app shell config, scheduled jobs. */
if (!defined('ABSPATH')) {
    exit;
}

function anbar_is_installed()
{
    return get_option('anbar_db_version') !== false;
}

function anbar_settings()
{
    return (get_option('anbar_settings', []) ?: []) + ['org_name' => 'مجتمع مسجد محور شباب', 'org_sub' => 'مجموعه تفکر ناب'];
}

/** Run one API request (index.php?api=/path) the way the WordPress REST server would. */
function anbar_dispatch($path)
{
    $path = '/' . ltrim((string) $path, '/');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $send = function ($status, $data, $headers = []) {
        http_response_code($status);
        header('Content-Type: application/json; charset=UTF-8');
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: no-store');
        foreach ($headers as $k => $v) {
            header("$k: $v");
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
    };
    // Cookie sessions only count when the request carries this session's token (header or _wpnonce).
    if (is_user_logged_in()) {
        $nonce = $_SERVER['HTTP_X_WP_NONCE'] ?? ($_REQUEST['_wpnonce'] ?? null);
        if ($nonce === null || $nonce === '') {
            $GLOBALS['anbar_uid'] = 0;
        } elseif (!wp_verify_nonce($nonce, 'wp_rest')) {
            return $send(403, ['code' => 'rest_cookie_invalid_nonce', 'message' => 'نشست منقضی شده است؛ صفحه را دوباره باز کنید.', 'data' => ['status' => 403]]);
        }
    }
    do_action('rest_api_init');
    foreach ($GLOBALS['anbar_routes'] as $r) {
        if (strtoupper($r['methods']) !== $method || !preg_match('#^' . $r['path'] . '$#', $path, $m)) {
            continue;
        }
        $params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
        $query = $_GET;
        unset($query['api']);
        $json = json_decode(file_get_contents('php://input') ?: '', true);
        $req = new WP_REST_Request($params, $query, is_array($json) ? $json : []);
        $perm = call_user_func($r['permission_callback'], $req);
        if ($perm !== true) {
            $err = is_wp_error($perm) ? $perm : new WP_Error('forbidden', 'دسترسی ندارید.', ['status' => 403]);
            return $send($err->get_error_data()['status'] ?? 403, ['code' => $err->get_error_code(), 'message' => $err->get_error_message(), 'data' => $err->get_error_data()]);
        }
        $out = call_user_func($r['callback'], $req);
        if (is_wp_error($out)) {
            $status = $out->get_error_data()['status'] ?? 500;
            return $send($status, ['code' => $out->get_error_code(), 'message' => $out->get_error_message(), 'data' => $out->get_error_data()]);
        }
        $out = rest_ensure_response($out);
        return $send($out->status, $out->data, $out->headers);
    }
    return $send(404, ['code' => 'rest_no_route', 'message' => 'مسیر پیدا نشد.', 'data' => ['status' => 404]]);
}

/** Settings handed to the JavaScript app. */
function anbar_client_config()
{
    $user = anbar_current();
    $s = anbar_settings();
    return [
        'root' => rest_url(''),
        'nonce' => wp_create_nonce('wp_rest'),
        'assets' => anbar_base_url() . 'assets/',
        'loggedIn' => (bool) $user,
        'org' => $s['org_name'],
        'orgSub' => $s['org_sub'],
        'settingsUrl' => $user && anbar_can($user, 'manage_users') ? anbar_base_url() . 'settings.php' : null,
    ];
}

/** Hourly reminders and daily backup, triggered by normal traffic (no server cron needed). */
function anbar_maybe_run_jobs()
{
    $last = (int) get_option('anbar_last_jobs', 0);
    if (time() - $last < HOUR_IN_SECONDS) {
        return;
    }
    update_option('anbar_last_jobs', time());
    register_shutdown_function(function () {
        if (function_exists('fastcgi_finish_request')) {
            fastcgi_finish_request();
        }
        try {
            anbar_run_scheduled_checks();
            global $wpdb;
            $wpdb->query("DELETE FROM {$wpdb->prefix}sessions WHERE expires < UTC_TIMESTAMP()");
            $wpdb->query("DELETE FROM {$wpdb->prefix}options WHERE expires IS NOT NULL AND expires < " . time());
            if (time() - (int) get_option('anbar_last_backup', 0) >= DAY_IN_SECONDS) {
                update_option('anbar_last_backup', time());
                anbar_backup_now();
            }
        } catch (Throwable $e) {
            error_log('[anbar] jobs: ' . $e->getMessage());
        }
    });
}

/** Parse "username password" pairs (or the whole account table from the brief) for the initial accounts. */
function anbar_parse_initial_passwords($text)
{
    $text = anbar_to_latin($text);
    $out = [];
    foreach (anbar_initial_accounts() as [$login]) {
        if (preg_match('/(?<![\w.-])' . preg_quote($login, '/') . '(?![\w.-])\s+(\S{6,})/u', $text, $m)) {
            $out[$login] = $m[1];
        }
    }
    return $out;
}
