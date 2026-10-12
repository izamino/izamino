<?php
/** REST API under /wp-json/anbar/v1. Every route checks permission and warehouse scope on the server. */
if (!defined('ABSPATH')) {
    exit;
}

const ANBAR_UNITS = ['عدد', 'دستگاه', 'متر', 'کیلوگرم', 'گرم', 'لیتر', 'بسته', 'جلد', 'جعبه', 'دست', 'کارتن', 'حلقه', 'ورق', 'شیشه', 'ورق قرص'];
const ANBAR_CONDITIONS = ['ok' => 'سالم', 'broken' => 'خراب', 'repair' => 'نیازمند تعمیر'];
const ANBAR_SOURCES = ['purchase' => 'خرید', 'gift' => 'هدیه', 'transfer' => 'انتقال'];
const ANBAR_CURRENCIES = ['toman' => 'تومان', 'rial' => 'ریال'];

/** Register a route whose handler gets ['user','params','body','query'] and returns data or throws Anbar_Error. */
function anbar_route($method, $path, callable $handler, $public = false)
{
    register_rest_route('anbar/v1', $path, [
        'methods' => $method,
        'permission_callback' => $public ? '__return_true' : 'anbar_rest_permission',
        'callback' => function (WP_REST_Request $req) use ($handler) {
            try {
                $out = $handler([
                    'user' => anbar_current(),
                    'params' => $req->get_url_params(),
                    'body' => $req->get_json_params() ?: [],
                    'query' => $req->get_query_params(),
                ]);
                $res = rest_ensure_response(anbar_cast($out ?? ['ok' => true]));
                $res->header('Cache-Control', 'no-store');
                return $res;
            } catch (Anbar_Error $e) {
                return new WP_Error('anbar_error', $e->getMessage(), ['status' => $e->status]);
            } catch (Throwable $e) {
                error_log('[anbar] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
                return new WP_Error('anbar_internal', 'خطای داخلی سامانه. دوباره تلاش کنید.', ['status' => 500]);
            }
        },
    ]);
}

function anbar_rest_permission()
{
    if (!is_user_logged_in()) {
        return new WP_Error('anbar_auth', 'لطفاً دوباره وارد شوید.', ['status' => 401]);
    }
    if (!anbar_current()) {
        return new WP_Error('anbar_forbidden', 'حساب شما به سامانه انبار دسترسی ندارد.', ['status' => 403]);
    }
    return true;
}

function anbar_send_file($body, $type, $name)
{
    nocache_headers();
    header('Content-Type: ' . $type);
    header('Content-Disposition: attachment; filename="' . $name . '"');
    header('Content-Length: ' . strlen($body));
    header('X-Content-Type-Options: nosniff');
    echo $body; // phpcs:ignore WordPress.Security.EscapeOutput
    exit;
}

function anbar_rest_url($path)
{
    return add_query_arg('_wpnonce', wp_create_nonce('wp_rest'), rest_url('anbar/v1/' . ltrim($path, '/')));
}

function anbar_like($s)
{
    global $wpdb;
    return $wpdb->esc_like((string) $s);
}

function anbar_unread($user_id)
{
    return (int) anbar_var('SELECT COUNT(*) FROM {notifications} WHERE user_id = ? AND is_read = 0', (int) $user_id);
}

function anbar_can_edit_card($user, $wh)
{
    return anbar_can($user, 'edit', $wh) || anbar_can($user, 'steward', $wh);
}

add_action('rest_api_init', 'anbar_register_routes');

function anbar_register_routes()
{
    /* ============================================================ public */

    anbar_route('POST', '/login', function ($c) {
        $username = trim((string) ($c['body']['username'] ?? ''));
        $key = 'anbar_login_' . md5(anbar_client_ip() . '|' . strtolower($username));
        $fails = (int) get_transient($key);
        if ($fails >= 10) {
            throw new Anbar_Error(429, 'تعداد تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه دیگر دوباره امتحان کنید.');
        }
        $u = wp_signon(['user_login' => $username, 'user_password' => (string) ($c['body']['password'] ?? ''), 'remember' => true], is_ssl());
        if (is_wp_error($u)) {
            if ($u->get_error_code() === 'anbar_inactive') {
                throw anbar_forbidden('حساب شما غیرفعال شده است. با مدیر سامانه تماس بگیرید.');
            }
            set_transient($key, $fails + 1, 15 * MINUTE_IN_SECONDS);
            throw new Anbar_Error(401, 'نام کاربری یا رمز عبور درست نیست.');
        }
        if (!user_can($u, 'anbar_access')) {
            wp_logout();
            throw anbar_forbidden('این حساب به سامانه انبار دسترسی ندارد.');
        }
        delete_transient($key);
        anbar_audit($u->ID, 'login', 'user', $u->ID);
        return ['ok' => true];
    }, true);

    anbar_route('POST', '/public/tickets', function ($c) {
        return anbar_ticket_create_public($c['body']);
    }, true);
    anbar_route('POST', '/public/track', function ($c) {
        return anbar_ticket_track_public($c['body']);
    }, true);

    /* ============================================================ account */

    anbar_route('POST', '/logout', function () {
        wp_logout();
        return ['ok' => true];
    });
    anbar_route('GET', '/me', function ($c) {
        return ['user' => $c['user'], 'unread' => anbar_unread($c['user']['id'])];
    });
    anbar_route('POST', '/me/password', function ($c) {
        $u = get_userdata($c['user']['id']);
        if (!wp_check_password((string) ($c['body']['current'] ?? ''), $u->user_pass, $u->ID)) {
            throw anbar_bad('رمز فعلی درست نیست.');
        }
        anbar_check_new_password($c['body']['password'] ?? '');
        wp_set_password($c['body']['password'], $u->ID);
        delete_user_meta($u->ID, 'anbar_must_change_pw');
        wp_set_auth_cookie($u->ID, true, is_ssl());
        anbar_audit($u->ID, 'change_password', 'user', $u->ID);
        return ['ok' => true];
    });
    anbar_route('PUT', '/me', function ($c) {
        update_user_meta($c['user']['id'], 'anbar_phone', anbar_str(anbar_to_latin($c['body']['phone'] ?? ''), 20) ?? '');
        update_user_meta($c['user']['id'], 'anbar_chat_id', anbar_str($c['body']['chat_id'] ?? '', 40) ?? '');
        return ['ok' => true];
    });

    /* ============================================================ lookups */

    anbar_route('GET', '/bootstrap', function ($c) {
        $u = $c['user'];
        $reasons = [];
        foreach (anbar_reasons() as $k => $v) {
            $reasons[$k] = $v[1];
        }
        return [
            'user' => $u,
            'warehouses' => anbar_warehouse_list($u, anbar_can($u, 'manage_users')),
            'all_warehouses' => anbar_all('SELECT id, name FROM {warehouses} WHERE archived = 0 ORDER BY sort, id'),
            'units' => array_values(array_unique(array_merge(ANBAR_UNITS, array_column(anbar_all("SELECT DISTINCT unit FROM {items} WHERE 1 = 1" . anbar_scope_sql($u, 'warehouse_id')), 'unit')))),
            'categories' => array_column(anbar_all("SELECT DISTINCT category FROM {items} WHERE category IS NOT NULL AND category <> ''" . anbar_scope_sql($u, 'warehouse_id') . ' ORDER BY category'), 'category'),
            'locations' => array_column(anbar_all("SELECT DISTINCT location FROM {items} WHERE location IS NOT NULL AND location <> ''" . anbar_scope_sql($u, 'warehouse_id') . ' ORDER BY location'), 'location'),
            'reasons' => $reasons,
            'conditions' => ANBAR_CONDITIONS,
            'sources' => ANBAR_SOURCES,
            'currencies' => ANBAR_CURRENCIES,
            'item_types' => anbar_item_types(),
            'general_fields' => anbar_general_fields(),
            'card_statuses' => anbar_card_statuses(),
            'exit_types' => anbar_exit_types(),
            'exit_statuses' => anbar_exit_statuses(),
            'ticket_statuses' => anbar_ticket_statuses(),
            'unread' => anbar_unread($u['id']),
        ];
    });

    anbar_route('GET', '/dashboard', function ($c) {
        $u = $c['user'];
        $t = anbar_today();
        $ws = function ($col) use ($u) {
            return anbar_scope_sql($u, $col);
        };
        $approve_whs = anbar_can($u, 'approve') ? anbar_scope_sql($u, 'e.from_wh') : ' AND 1 = 0';
        $deliver_whs = anbar_can($u, 'deliver') ? anbar_scope_sql($u, 'e.from_wh') : ' AND 1 = 0';
        $exit_sql = "SELECT e.*, w.name AS from_name, u.display_name AS requester,
              (SELECT COUNT(*) FROM {exit_lines} l WHERE l.exit_id = e.id) AS line_count
            FROM {exits} e JOIN {warehouses} w ON w.id = e.from_wh JOIN {users} u ON u.ID = e.requester_id WHERE ";
        $tickets = (anbar_can($u, 'tickets_all') || anbar_can($u, 'tickets_review') || anbar_scope($u) !== [])
            ? anbar_all("SELECT t.id, t.code, t.first_name, t.last_name, t.item_text, t.status, t.created_at FROM {tickets} t
                WHERE t.status IN ('new', 'reviewing', 'needs_info', 'referred', 'accepted', 'ready')" . anbar_ticket_scope_sql($u) . '
                ORDER BY t.status = \'new\' DESC, t.created_at DESC LIMIT 10') : [];
        return [
            'warehouses' => anbar_warehouse_list($u, false),
            'shortages' => anbar_all('SELECT i.id, i.name, i.qty, i.min_qty, i.unit, w.name AS warehouse FROM {items} i
                JOIN {warehouses} w ON w.id = i.warehouse_id
                WHERE i.archived = 0 AND w.archived = 0 AND (i.qty - i.broken_qty <= 0 OR (i.min_qty > 0 AND i.qty - i.broken_qty <= i.min_qty))'
                . $ws('i.warehouse_id') . ' ORDER BY (i.qty <= 0) DESC, i.qty / NULLIF(i.min_qty, 0) LIMIT 30'),
            'to_approve' => anbar_all($exit_sql . "e.status = 'pending'" . $approve_whs . ' ORDER BY e.submitted_at LIMIT 20'),
            'to_deliver' => anbar_all($exit_sql . "e.status = 'approved'" . $deliver_whs . ' ORDER BY e.approved_at LIMIT 20'),
            'my_exits' => anbar_all($exit_sql . "e.requester_id = ? AND e.status IN ('draft', 'needs_changes', 'pending', 'approved') ORDER BY e.updated_at DESC LIMIT 10", $u['id']),
            'tickets' => $tickets,
            'loans' => anbar_all("SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse FROM {loans} l
                JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id
                WHERE l.status = 'open'" . $ws('l.warehouse_id') . ' ORDER BY l.due_date IS NULL, l.due_date LIMIT 20'),
            'expiring' => anbar_all('SELECT b.*, i.id AS item_id, i.name AS item_name, i.unit, w.name AS warehouse FROM {batches} b
                JOIN {items} i ON i.id = b.item_id JOIN {warehouses} w ON w.id = i.warehouse_id
                WHERE b.qty > 0 AND i.archived = 0 AND b.expiry IS NOT NULL AND b.expiry <= ?' . $ws('i.warehouse_id') . ' ORDER BY b.expiry LIMIT 20',
                anbar_add_days($t, 60)),
            'transfers' => anbar_all("SELECT tr.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name FROM {transfers} tr
                JOIN {items} i ON i.id = tr.item_id JOIN {warehouses} fw ON fw.id = tr.from_wh JOIN {warehouses} tw ON tw.id = tr.to_wh
                WHERE tr.status = 'pending'" . (anbar_scope($u) === null ? '' : ' AND (1 = 0' . str_replace('AND', 'OR', anbar_scope_sql($u, 'tr.to_wh'))
                . str_replace('AND', 'OR', anbar_scope_sql($u, 'tr.from_wh')) . ')') . ' ORDER BY tr.sent_at'),
            'incomplete_cards' => (anbar_can($u, 'steward') || anbar_can($u, 'edit'))
                ? (int) anbar_var("SELECT COUNT(*) FROM {items} WHERE archived = 0 AND card_status <> 'reviewed'" . $ws('warehouse_id')) : 0,
            'announcements' => anbar_all('SELECT a.*, u.display_name AS author FROM {announcements} a JOIN {users} u ON u.ID = a.user_id
                WHERE a.archived = 0 ORDER BY a.pinned DESC, a.created_at DESC LIMIT 3'),
            'recent' => anbar_tx_query($u, ['limit' => 8]),
            'today' => $t,
        ];
    });

    /* ============================================================ items & cards */

    anbar_route('GET', '/items', function ($c) {
        $u = $c['user'];
        $q = $c['query'];
        $where = ['1 = 1'];
        $p = [];
        if (!empty($q['q'])) {
            $like = '%' . anbar_like(trim(anbar_to_latin($q['q']))) . '%';
            $raw = '%' . anbar_like(trim($q['q'])) . '%';
            $where[] = '(i.name LIKE ? OR i.name LIKE ? OR i.code LIKE ? OR i.category LIKE ? OR i.brand LIKE ? OR i.model LIKE ? OR i.serial LIKE ? OR i.location LIKE ? OR i.details LIKE ?)';
            array_push($p, $raw, $like, $like, $raw, $raw, $raw, $like, $raw, $raw);
        }
        if (!empty($q['warehouse'])) {
            anbar_require_see($u, $q['warehouse']);
            $where[] = 'i.warehouse_id = ?';
            $p[] = (int) $q['warehouse'];
        }
        foreach (['condition' => 'i.`condition`', 'category' => 'i.category', 'item_type' => 'i.item_type'] as $k => $col) {
            if (!empty($q[$k])) {
                $where[] = "{$col} = ?";
                $p[] = (string) $q[$k];
            }
        }
        if (!empty($q['location'])) {
            $where[] = 'i.location LIKE ?';
            $p[] = '%' . anbar_like($q['location']) . '%';
        }
        if (($q['card'] ?? '') === 'incomplete') {
            $where[] = "i.card_status <> 'reviewed'";
        } elseif (!empty($q['card'])) {
            $where[] = 'i.card_status = ?';
            $p[] = (string) $q['card'];
        }
        $where[] = (($q['archived'] ?? '') === '1') ? 'i.archived = 1' : 'i.archived = 0';
        $status = $q['status'] ?? '';
        if ($status === 'low') {
            $where[] = 'i.min_qty > 0 AND i.qty - i.broken_qty > 0 AND i.qty - i.broken_qty <= i.min_qty';
        } elseif ($status === 'out') {
            $where[] = 'i.qty - i.broken_qty <= 0';
        } elseif ($status === 'loaned') {
            $where[] = 'i.loaned_qty > 0';
        } elseif ($status === 'broken') {
            $where[] = "(i.broken_qty > 0 OR i.`condition` <> 'ok')";
        } elseif ($status === 'expiring') {
            $where[] = 'EXISTS (SELECT 1 FROM {batches} b WHERE b.item_id = i.id AND b.qty > 0 AND b.expiry <= ?)';
            $p[] = anbar_add_days(anbar_today(), 60);
        }
        $rows = anbar_all('SELECT i.*, w.name AS warehouse, ' . anbar_item_calc_sql() . '
            FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id
            WHERE ' . implode(' AND ', $where) . anbar_scope_sql($u, 'i.warehouse_id') . ' ORDER BY w.sort, i.name LIMIT 1000', ...$p);
        return array_map(function ($i) use ($u) {
            return anbar_decorate_item($i, $u);
        }, $rows);
    });

    anbar_route('GET', '/items/next-code', function ($c) {
        anbar_require_see($c['user'], $c['query']['warehouse'] ?? 0);
        return ['code' => anbar_next_code((int) ($c['query']['warehouse'] ?? 0))];
    });

    anbar_route('POST', '/items', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $wh = anbar_get('SELECT * FROM {warehouses} WHERE id = ? AND archived = 0', (int) ($b['warehouse_id'] ?? 0));
        if (!$wh) {
            throw anbar_bad('انبار را انتخاب کنید.');
        }
        if (!anbar_can_edit_card($u, $wh['id'])) {
            throw anbar_forbidden('شما اجازه ثبت شناسنامه در این انبار را ندارید.');
        }
        if (empty($b['code'])) {
            $b['code'] = anbar_next_code((int) $wh['id']);
        }
        $f = anbar_item_fields($b);
        if (anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ?', (int) $wh['id'], $f['code'])) {
            throw anbar_bad("کد «{$f['code']}» در این انبار تکراری است.");
        }
        $opening = !empty($b['opening_qty']) ? anbar_qty($b['opening_qty'], 'موجودی اولیه') : 0;
        if ($opening > 0) {
            anbar_require($u, 'stock_in', $wh['id'], 'شما اجازه ثبت ورود کالا در این انبار را ندارید.');
        }
        $batch = array_key_exists('batch_tracked', $b) ? (empty($b['batch_tracked']) ? 0 : 1) : (int) $wh['tracks_expiry'];
        $cols = array_keys($f);
        $r = anbar_run('INSERT INTO {items} (warehouse_id, ' . implode(', ', array_map('anbar_col', $cols)) . ', batch_tracked, created_by, created_at, updated_at)
                        VALUES (?, ' . implode(', ', array_fill(0, count($cols), '?')) . ', ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
            ...array_merge([(int) $wh['id']], array_values($f), [$batch, $u['id']]));
        foreach ((array) ($b['photos'] ?? []) as $ph) {
            anbar_add_photo($r['id'], $ph['image_data'] ?? '', $ph['caption'] ?? '', $u);
        }
        anbar_audit($u['id'], 'item_create', 'item', $r['id'], ['name' => $f['name'], 'code' => $f['code']]);
        if ($opening > 0) {
            anbar_stock_in($r['id'], ['reason' => 'opening', 'qty' => $opening, 'note' => 'موجودی اولیه', 'party' => null,
                'op_date' => anbar_today(), 'batch_no' => anbar_str(anbar_to_latin($b['batch_no'] ?? ''), 60),
                'expiry' => anbar_date($b['expiry'] ?? null, 'تاریخ انقضا'), 'op_key' => anbar_str($b['op_key'] ?? '', 64)], $u);
        }
        return ['id' => $r['id']];
    });

    anbar_route('GET', '/items/(?P<id>\d+)', function ($c) {
        $u = $c['user'];
        $item = anbar_get('SELECT i.*, w.name AS warehouse, cu.display_name AS creator, ru.display_name AS reviewer, ' . anbar_item_calc_sql() . '
            FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id LEFT JOIN {users} cu ON cu.ID = i.created_by
            LEFT JOIN {users} ru ON ru.ID = i.reviewed_by WHERE i.id = ?', (int) $c['params']['id']);
        if (!$item) {
            throw anbar_not_found('کالا پیدا نشد.');
        }
        anbar_require_see($u, $item['warehouse_id']);
        $item = anbar_decorate_item($item, $u);
        $id = (int) $item['id'];
        $item['details'] = json_decode($item['details'] ?? '', true) ?: ['specs' => [], 'custom' => []];
        $item['photos'] = array_map(function ($ph) {
            return $ph + ['url' => anbar_rest_url('file/' . $ph['file'])];
        }, anbar_all('SELECT id, file, caption, sort FROM {item_photos} WHERE item_id = ? ORDER BY sort, id', $id));
        $item['batches'] = anbar_all('SELECT * FROM {batches} WHERE item_id = ? AND qty > 0 ORDER BY expiry IS NULL, expiry', $id);
        $item['loans'] = anbar_all("SELECT l.*, u.display_name AS recorder FROM {loans} l JOIN {users} u ON u.ID = l.user_id
            WHERE l.item_id = ? ORDER BY l.status = 'open' DESC, l.created_at DESC LIMIT 30", $id);
        $item['transfers'] = anbar_all('SELECT t.*, fw.name AS from_name, tw.name AS to_name FROM {transfers} t
            JOIN {warehouses} fw ON fw.id = t.from_wh JOIN {warehouses} tw ON tw.id = t.to_wh
            WHERE t.item_id = ? OR t.dest_item_id = ? ORDER BY t.sent_at DESC LIMIT 20', $id, $id);
        $item['open_exits'] = anbar_all("SELECT e.id, e.status, e.type, e.recipient, l.qty, l.from_broken FROM {exit_lines} l JOIN {exits} e ON e.id = l.exit_id
            WHERE l.item_id = ? AND e.status IN ('draft', 'pending', 'needs_changes', 'approved') ORDER BY e.id DESC", $id);
        $item['history'] = anbar_tx_query($u, ['item' => $id, 'limit' => 200]);
        return $item;
    });

    anbar_route('PUT', '/items/(?P<id>\d+)', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $item = anbar_load_item($c['params']['id']);
        if (!anbar_can_edit_card($u, $item['warehouse_id'])) {
            throw anbar_forbidden('شما اجازه ویرایش شناسنامه این انبار را ندارید.');
        }
        $f = anbar_item_fields($b + ['card_status' => $item['card_status']]);
        if ($f['code'] !== $item['code'] && anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ? AND id <> ?', $item['warehouse_id'], $f['code'], $item['id'])) {
            throw anbar_bad("کد «{$f['code']}» در این انبار تکراری است.");
        }
        if ($f['card_status'] === 'reviewed' && $item['card_status'] !== 'reviewed' && !anbar_can($u, 'steward', $item['warehouse_id'])) {
            $f['card_status'] = $item['card_status'];
        }
        $batch = array_key_exists('batch_tracked', $b) ? (empty($b['batch_tracked']) ? 0 : 1) : $item['batch_tracked'];
        if ($batch && !$item['batch_tracked'] && $item['qty'] > 0) {
            throw anbar_bad('برای فعال‌کردن ثبت سری، ابتدا موجودی باید صفر باشد.');
        }
        if (!$batch && $item['batch_tracked'] && anbar_get('SELECT id FROM {batches} WHERE item_id = ? AND qty > 0', $item['id'])) {
            throw anbar_bad('این کالا سری دارای موجودی دارد و نمی‌توان ثبت سری را خاموش کرد.');
        }
        $sets = [];
        foreach (array_keys($f) as $k) {
            $sets[] = anbar_col($k) . ' = ?';
        }
        anbar_run('UPDATE {items} SET ' . implode(', ', $sets) . ', batch_tracked = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
            ...array_merge(array_values($f), [$batch, $item['id']]));
        $changes = [];
        foreach ($f as $k => $v) {
            $old = $item[$k] ?? null;
            $same = in_array($k, ['min_qty', 'purchase_price', 'current_value'], true) ? ((string) $old === '' ? null : (float) $old) === ($v === null ? null : (float) $v) : (string) $old === (string) $v;
            if (!$same) {
                $changes[$k] = $k === 'details' ? ['…', '…'] : [$old, $v];
            }
        }
        if ($changes) {
            anbar_audit($u['id'], 'item_update', 'item', $item['id'], $changes);
        }
        if ($f['condition'] !== $item['condition'] && $f['condition'] !== 'ok') {
            $label = ANBAR_CONDITIONS[$f['condition']];
            anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $u['id']), [
                'kind' => 'damage', 'title' => "«{$f['name']}»: {$label}", 'body' => "ثبت توسط {$u['full_name']}",
                'link' => '#/items/' . $item['id'], 'warehouse_id' => $item['warehouse_id'],
            ]);
        }
        return ['ok' => true];
    });

    anbar_route('POST', '/items/(?P<id>\d+)/review', function ($c) {
        $u = $c['user'];
        $item = anbar_load_item($c['params']['id']);
        anbar_require($u, 'steward', $item['warehouse_id'], 'تأیید شناسنامه با مسئول تکمیل و یکدست‌سازی شناسنامه اموال است.');
        $status = ($c['body']['status'] ?? 'reviewed') === 'reviewed' ? 'reviewed' : 'incomplete';
        anbar_run('UPDATE {items} SET card_status = ?, reviewed_by = ?, last_review_at = UTC_TIMESTAMP() WHERE id = ?', $status, $u['id'], $item['id']);
        anbar_audit($u['id'], 'item_review', 'item', $item['id'], ['status' => $status, 'note' => anbar_str($c['body']['note'] ?? '', 500)]);
        return ['ok' => true];
    });

    anbar_route('POST', '/items/(?P<id>\d+)/photos', function ($c) {
        $item = anbar_load_item($c['params']['id']);
        if (!anbar_can_edit_card($c['user'], $item['warehouse_id'])) {
            throw anbar_forbidden();
        }
        return ['id' => anbar_add_photo($item['id'], $c['body']['image_data'] ?? '', $c['body']['caption'] ?? '', $c['user'])];
    });
    anbar_route('POST', '/photos/(?P<id>\d+)', function ($c) {
        $ph = anbar_get('SELECT * FROM {item_photos} WHERE id = ?', (int) $c['params']['id']);
        if (!$ph) {
            throw anbar_not_found();
        }
        $item = anbar_load_item($ph['item_id']);
        if (!anbar_can_edit_card($c['user'], $item['warehouse_id'])) {
            throw anbar_forbidden();
        }
        if (!empty($c['body']['delete'])) {
            anbar_run('DELETE FROM {item_photos} WHERE id = ?', (int) $ph['id']);
            anbar_audit($c['user']['id'], 'photo_remove', 'item', $item['id'], ['file' => $ph['file']]);
        } else {
            anbar_run('UPDATE {item_photos} SET caption = ?, sort = ? WHERE id = ?', anbar_str($c['body']['caption'] ?? '', 200), (int) ($c['body']['sort'] ?? $ph['sort']), (int) $ph['id']);
        }
        anbar_refresh_cover($item['id']);
        return ['ok' => true];
    });

    anbar_route('POST', '/items/(?P<id>\d+)/archive', function ($c) {
        $item = anbar_load_item($c['params']['id']);
        if (!anbar_can_edit_card($c['user'], $item['warehouse_id'])) {
            throw anbar_forbidden();
        }
        $archived = empty($c['body']['archived']) ? 0 : 1;
        if ($archived && ($item['loaned_qty'] > 0 || anbar_get("SELECT t.id FROM {transfers} t WHERE t.item_id = ? AND t.status = 'pending'", $item['id'])
            || anbar_get("SELECT l.id FROM {exit_lines} l JOIN {exits} e ON e.id = l.exit_id WHERE l.item_id = ? AND e.status IN ('pending', 'approved')", $item['id']))) {
            throw anbar_bad('این کالا امانت، انتقال یا درخواست خروج باز دارد.');
        }
        anbar_run('UPDATE {items} SET archived = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $archived, $item['id']);
        anbar_audit($c['user']['id'], $archived ? 'item_archive' : 'item_unarchive', 'item', $item['id']);
        return ['ok' => true];
    });

    /* ============================================================ stock operations (no exits here) */

    anbar_route('POST', '/items/(?P<id>\d+)/in', function ($c) {
        $item = anbar_load_item($c['params']['id']);
        anbar_require($c['user'], 'stock_in', $item['warehouse_id'], 'شما اجازه ثبت ورود در این انبار را ندارید.');
        $b = $c['body'];
        return ['tx_id' => anbar_stock_in($item['id'], [
            'qty' => anbar_qty($b['qty'] ?? ''), 'reason' => (string) ($b['reason'] ?? ''), 'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(),
            'party' => anbar_str($b['party'] ?? '', 150), 'note' => anbar_str($b['note'] ?? '', 1000),
            'batch_no' => anbar_str(anbar_to_latin($b['batch_no'] ?? ''), 60), 'expiry' => anbar_date($b['expiry'] ?? null, 'تاریخ انقضا'),
            'op_key' => anbar_str($b['op_key'] ?? '', 64),
        ], $c['user'])];
    });

    anbar_route('POST', '/items/(?P<id>\d+)/adjust', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $item = anbar_load_item($c['params']['id']);
        $new = anbar_qty($b['new_qty'] ?? '', 'مقدار شمارش‌شده', true);
        $current = $item['qty'];
        if ($item['batch_tracked'] && !empty($b['batch_id'])) {
            $current = (float) anbar_var('SELECT qty FROM {batches} WHERE id = ? AND item_id = ?', (int) $b['batch_id'], $item['id']);
        }
        // Increasing is like an entry; decreasing removes stock, so it needs exit-approval authority.
        if ($new < $current) {
            anbar_require($u, 'approve', $item['warehouse_id'], 'کاهش موجودی با اصلاح فقط در اختیار تأییدکنندگان خروج است؛ برای خروج، درخواست خروج ثبت کنید.');
        } else {
            anbar_require($u, 'stock_in', $item['warehouse_id']);
        }
        return ['tx_id' => anbar_adjust($item['id'], [
            'new_qty' => $new, 'batch_id' => !empty($b['batch_id']) ? (int) $b['batch_id'] : null, 'note' => anbar_str($b['note'] ?? '', 1000),
            'corrects_id' => !empty($b['corrects_id']) ? (int) $b['corrects_id'] : null, 'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(),
            'op_key' => anbar_str($b['op_key'] ?? '', 64),
        ], $u)];
    });

    foreach (['damage', 'repair'] as $mode) {
        anbar_route('POST', '/items/(?P<id>\d+)/' . $mode, function ($c) use ($mode) {
            $item = anbar_load_item($c['params']['id']);
            if (!anbar_can_edit_card($c['user'], $item['warehouse_id'])) {
                throw anbar_forbidden();
            }
            $b = $c['body'];
            return ['tx_id' => anbar_damage_repair($item['id'], $mode, ['qty' => anbar_qty($b['qty'] ?? ''), 'note' => anbar_str($b['note'] ?? '', 1000),
                'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(), 'op_key' => anbar_str($b['op_key'] ?? '', 64)], $c['user'])];
        });
    }

    /* ============================================================ exit requests */

    anbar_route('GET', '/exits', function ($c) {
        $u = $c['user'];
        $q = $c['query'];
        $where = ['1 = 1'];
        $p = [];
        $tab = $q['tab'] ?? 'all';
        if ($tab === 'approve') {
            $where[] = "e.status = 'pending'";
        } elseif ($tab === 'deliver') {
            $where[] = "e.status = 'approved'";
        } elseif ($tab === 'mine') {
            $where[] = 'e.requester_id = ?';
            $p[] = $u['id'];
        } elseif ($tab === 'drafts') {
            $where[] = "e.status IN ('draft', 'needs_changes')";
        }
        if (!empty($q['status'])) {
            $where[] = 'e.status = ?';
            $p[] = (string) $q['status'];
        }
        if (!empty($q['q'])) {
            $num = (int) preg_replace('/\D/', '', anbar_to_latin($q['q']));
            $where[] = '(e.id = ? OR e.recipient LIKE ?)';
            array_push($p, $num, '%' . anbar_like($q['q']) . '%');
        }
        // A person always sees their own requests, plus everything in their warehouse scope.
        $scope = anbar_scope_sql($u, 'e.from_wh');
        $vis = $scope ? ' AND (e.requester_id = ' . (int) $u['id'] . ' OR (1 = 1' . $scope . '))' : '';
        return anbar_all('SELECT e.*, w.name AS from_name, tw.name AS to_name, u.display_name AS requester, au.display_name AS approver,
              du.display_name AS deliverer, (SELECT COUNT(*) FROM {exit_lines} l WHERE l.exit_id = e.id) AS line_count,
              (SELECT GROUP_CONCAT(i.name SEPARATOR \'، \') FROM {exit_lines} l JOIN {items} i ON i.id = l.item_id WHERE l.exit_id = e.id) AS item_names
            FROM {exits} e JOIN {warehouses} w ON w.id = e.from_wh LEFT JOIN {warehouses} tw ON tw.id = e.to_wh
            JOIN {users} u ON u.ID = e.requester_id LEFT JOIN {users} au ON au.ID = e.approver_id LEFT JOIN {users} du ON du.ID = e.deliverer_id
            WHERE ' . implode(' AND ', $where) . $vis . ' ORDER BY e.updated_at DESC LIMIT 300', ...$p);
    });

    anbar_route('GET', '/exits/(?P<id>\d+)', function ($c) {
        return anbar_exit_view($c['user'], (int) $c['params']['id']);
    });
    anbar_route('POST', '/exits', function ($c) {
        $id = anbar_exit_save($c['user'], $c['body']);
        if (!empty($c['body']['submit'])) {
            anbar_exit_submit($c['user'], $id);
        }
        return ['id' => $id];
    });
    anbar_route('PUT', '/exits/(?P<id>\d+)', function ($c) {
        $id = anbar_exit_save($c['user'], $c['body'], (int) $c['params']['id']);
        $e = anbar_exit_load($id);
        if (!empty($c['body']['submit']) && in_array($e['status'], ['draft', 'needs_changes'], true)) {
            anbar_exit_submit($c['user'], $id);
        }
        return ['id' => $id];
    });
    anbar_route('POST', '/exits/(?P<id>\d+)/submit', function ($c) {
        anbar_exit_submit($c['user'], (int) $c['params']['id']);
        return ['ok' => true];
    });
    anbar_route('POST', '/exits/(?P<id>\d+)/decide', function ($c) {
        anbar_exit_decide($c['user'], (int) $c['params']['id'], (string) ($c['body']['decision'] ?? ''), anbar_str($c['body']['note'] ?? '', 1000));
        return ['ok' => true];
    });
    anbar_route('POST', '/exits/(?P<id>\d+)/deliver', function ($c) {
        anbar_exit_deliver($c['user'], (int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000),
            'op_date' => anbar_date($c['body']['op_date'] ?? null) ?: anbar_today()]);
        return ['ok' => true];
    });
    anbar_route('POST', '/exits/(?P<id>\d+)/cancel', function ($c) {
        anbar_exit_cancel($c['user'], (int) $c['params']['id'], anbar_str($c['body']['note'] ?? '', 1000));
        return ['ok' => true];
    });

    /* ============================================================ loans & transfers */

    anbar_route('GET', '/loans', function ($c) {
        $u = $c['user'];
        $status = $c['query']['status'] ?? 'open';
        $rows = anbar_all("SELECT l.*, i.name AS item_name, i.unit, i.code, w.name AS warehouse, u.display_name AS recorder FROM {loans} l
            JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id JOIN {users} u ON u.ID = l.user_id
            WHERE (? = 'all' OR l.status = ?)" . anbar_scope_sql($u, 'l.warehouse_id') . "
            ORDER BY l.status = 'open' DESC, l.due_date IS NULL, l.due_date, l.created_at DESC LIMIT 500", $status, $status);
        return array_map(function ($l) use ($u) {
            return $l + ['can_return' => anbar_can($u, 'stock_in', $l['warehouse_id']) || anbar_can($u, 'deliver', $l['warehouse_id'])];
        }, $rows);
    });
    anbar_route('POST', '/loans/(?P<id>\d+)/return', function ($c) {
        $b = $c['body'];
        return ['tx_id' => anbar_loan_return((int) $c['params']['id'], ['qty' => anbar_qty($b['qty'] ?? ''),
            'broken' => ($b['broken'] ?? '') === '' ? 0 : anbar_qty($b['broken'], 'مقدار خراب', true), 'note' => anbar_str($b['note'] ?? '', 1000),
            'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(), 'op_key' => anbar_str($b['op_key'] ?? '', 64)], $c['user'])];
    });

    anbar_route('GET', '/transfers', function ($c) {
        $u = $c['user'];
        $status = $c['query']['status'] ?? 'all';
        $scope = anbar_scope($u) === null ? '' : ' AND (1 = 0' . str_replace('AND', 'OR', anbar_scope_sql($u, 't.to_wh')) . str_replace('AND', 'OR', anbar_scope_sql($u, 't.from_wh')) . ')';
        $rows = anbar_all("SELECT t.*, i.name AS item_name, i.unit, i.code, fw.name AS from_name, tw.name AS to_name,
              su.display_name AS sender, hu.display_name AS handler FROM {transfers} t
            JOIN {items} i ON i.id = t.item_id JOIN {warehouses} fw ON fw.id = t.from_wh JOIN {warehouses} tw ON tw.id = t.to_wh
            JOIN {users} su ON su.ID = t.sent_by LEFT JOIN {users} hu ON hu.ID = t.handled_by
            WHERE (? = 'all' OR t.status = ?){$scope} ORDER BY t.status = 'pending' DESC, t.sent_at DESC LIMIT 300", $status, $status);
        return array_map(function ($t) use ($u) {
            return $t + ['can_receive' => anbar_can($u, 'stock_in', $t['to_wh'])];
        }, $rows);
    });
    anbar_route('POST', '/transfers/(?P<id>\d+)/receive', function ($c) {
        return ['tx_id' => anbar_transfer_receive((int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000)], $c['user'])];
    });
    anbar_route('POST', '/transfers/(?P<id>\d+)/reject', function ($c) {
        return ['tx_id' => anbar_transfer_reject((int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000)], $c['user'])];
    });

    /* ============================================================ transactions & receipts */

    anbar_route('GET', '/transactions', function ($c) {
        $q = $c['query'];
        $q['from'] = anbar_date($q['from'] ?? null);
        $q['to'] = anbar_date($q['to'] ?? null);
        return anbar_tx_query($c['user'], $q);
    });
    anbar_route('GET', '/transactions/(?P<id>\d+)', function ($c) {
        $t = anbar_get('SELECT t.*, i.name AS item_name, i.code, i.unit, i.brand, i.model, i.serial,
              w.name AS warehouse, u.display_name AS recorder, l.program, l.due_date
            FROM {transactions} t JOIN {items} i ON i.id = t.item_id JOIN {warehouses} w ON w.id = t.warehouse_id
            JOIN {users} u ON u.ID = t.user_id LEFT JOIN {loans} l ON l.id = t.loan_id WHERE t.id = ?', (int) $c['params']['id']);
        if (!$t) {
            throw anbar_not_found('رسید پیدا نشد.');
        }
        anbar_require_see($c['user'], $t['warehouse_id']);
        $t['corrections'] = anbar_all('SELECT id, delta, note, created_at FROM {transactions} WHERE corrects_id = ?', (int) $t['id']);
        return $t;
    });

    /* ============================================================ tickets */

    anbar_route('GET', '/tickets', function ($c) {
        $u = $c['user'];
        $status = $c['query']['status'] ?? '';
        $where = ['1 = 1'];
        $p = [];
        if ($status === 'open') {
            $where[] = "t.status NOT IN ('delivered', 'rejected', 'closed')";
        } elseif ($status) {
            $where[] = 't.status = ?';
            $p[] = $status;
        }
        if (!empty($c['query']['q'])) {
            $s = '%' . anbar_like(anbar_to_latin($c['query']['q'])) . '%';
            $where[] = '(t.code LIKE ? OR t.first_name LIKE ? OR t.last_name LIKE ? OR t.item_text LIKE ? OR t.phone LIKE ?)';
            array_push($p, $s, $s, $s, $s, $s);
        }
        return anbar_all('SELECT t.id, t.code, t.first_name, t.last_name, t.phone, t.item_text, t.qty_text, t.status, t.referred_wh, t.appointment,
              t.created_at, t.updated_at, w.name AS referred_name,
              (SELECT COUNT(*) FROM {exits} e WHERE e.ticket_id = t.id AND e.status <> \'cancelled\') AS exit_count
            FROM {tickets} t LEFT JOIN {warehouses} w ON w.id = t.referred_wh
            WHERE ' . implode(' AND ', $where) . anbar_ticket_scope_sql($u) . " ORDER BY t.status = 'new' DESC, t.updated_at DESC LIMIT 300", ...$p);
    });
    anbar_route('GET', '/tickets/(?P<id>\d+)', function ($c) {
        $u = $c['user'];
        $t = anbar_ticket_for_user((int) $c['params']['id'], $u);
        unset($t['ip']);
        $t['referred_name'] = $t['referred_wh'] ? anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $t['referred_wh']) : null;
        $t['events'] = anbar_all('SELECT ev.*, u.display_name AS author FROM {ticket_events} ev LEFT JOIN {users} u ON u.ID = ev.user_id
            WHERE ev.ticket_id = ? ORDER BY ev.id DESC', (int) $t['id']);
        $t['exits'] = array_map(function ($e) {
            $e['lines'] = anbar_all('SELECT l.qty, l.from_broken, i.name AS item_name, i.unit FROM {exit_lines} l JOIN {items} i ON i.id = l.item_id WHERE l.exit_id = ?', (int) $e['id']);
            return $e;
        }, anbar_all('SELECT e.*, w.name AS from_name, au.display_name AS approver, du.display_name AS deliverer FROM {exits} e
            JOIN {warehouses} w ON w.id = e.from_wh LEFT JOIN {users} au ON au.ID = e.approver_id LEFT JOIN {users} du ON du.ID = e.deliverer_id
            WHERE e.ticket_id = ? ORDER BY e.id', (int) $t['id']));
        $t['can_review'] = anbar_can($u, 'tickets_review');
        $t['can_follow'] = anbar_can($u, 'tickets_all') || anbar_can($u, 'tickets_review');
        $t['can_create_exit'] = anbar_can($u, 'request_out');
        return $t;
    });
    anbar_route('POST', '/tickets/(?P<id>\d+)/status', function ($c) {
        return anbar_ticket_set_status($c['user'], (int) $c['params']['id'], (string) ($c['body']['status'] ?? ''), anbar_str($c['body']['note'] ?? '', 1000));
    });
    anbar_route('POST', '/tickets/(?P<id>\d+)/refer', function ($c) {
        return anbar_ticket_refer($c['user'], (int) $c['params']['id'], (int) ($c['body']['warehouse_id'] ?? 0), anbar_str($c['body']['note'] ?? '', 1000));
    });
    anbar_route('POST', '/tickets/(?P<id>\d+)/note', function ($c) {
        return anbar_ticket_note($c['user'], (int) $c['params']['id'], (string) ($c['body']['kind'] ?? 'note'),
            anbar_str($c['body']['text'] ?? '', 2000), anbar_str($c['body']['appointment'] ?? '', 200));
    });

    /* ============================================================ notifications & announcements */

    anbar_route('GET', '/notifications', function ($c) {
        return anbar_all('SELECT * FROM {notifications} WHERE user_id = ? ORDER BY id DESC LIMIT 200', $c['user']['id']);
    });
    anbar_route('POST', '/notifications/read', function ($c) {
        if (!empty($c['body']['all'])) {
            anbar_run('UPDATE {notifications} SET is_read = 1 WHERE user_id = ?', $c['user']['id']);
        } else {
            foreach ((array) ($c['body']['ids'] ?? []) as $id) {
                anbar_run('UPDATE {notifications} SET is_read = 1 WHERE user_id = ? AND id = ?', $c['user']['id'], (int) $id);
            }
        }
        return ['ok' => true];
    });
    anbar_route('GET', '/announcements', function () {
        return anbar_all('SELECT a.*, u.display_name AS author FROM {announcements} a JOIN {users} u ON u.ID = a.user_id
            WHERE a.archived = 0 ORDER BY a.pinned DESC, a.created_at DESC LIMIT 100');
    });
    anbar_route('POST', '/announcements', function ($c) {
        $u = $c['user'];
        if (!anbar_can($u, 'manage_users') && !anbar_can($u, 'approve')) {
            throw anbar_forbidden('انتشار اطلاعیه با مدیران است.');
        }
        $title = anbar_required($c['body']['title'] ?? '', 'عنوان', 150);
        $text = anbar_required($c['body']['body'] ?? '', 'متن اطلاعیه', 4000);
        $r = anbar_run('INSERT INTO {announcements} (title, body, pinned, user_id, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
            $title, $text, empty($c['body']['pinned']) ? 0 : 1, $u['id']);
        anbar_notify(anbar_all_active_users($u['id']), ['kind' => 'announcement', 'title' => "اطلاعیه: {$title}",
            'body' => mb_substr($text, 0, 200), 'link' => '#/announcements']);
        return ['id' => $r['id']];
    });
    anbar_route('POST', '/announcements/(?P<id>\d+)/archive', function ($c) {
        $a = anbar_get('SELECT * FROM {announcements} WHERE id = ?', (int) $c['params']['id']);
        if (!$a) {
            throw anbar_not_found();
        }
        if ((int) $a['user_id'] !== $c['user']['id']) {
            anbar_require($c['user'], 'manage_users');
        }
        anbar_run('UPDATE {announcements} SET archived = 1 WHERE id = ?', (int) $a['id']);
        return ['ok' => true];
    });

    /* ============================================================ admin */

    anbar_route('GET', '/users', function ($c) {
        anbar_require($c['user'], 'manage_users');
        return array_map('anbar_user_public', anbar_app_users());
    });

    anbar_route('POST', '/users', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $b = $c['body'];
        $username = anbar_required(anbar_to_latin($b['username'] ?? ''), 'نام کاربری', 40);
        if (!preg_match('/^[a-zA-Z0-9._-]{3,40}$/', $username)) {
            throw anbar_bad('نام کاربری فقط با حروف انگلیسی، عدد، نقطه یا خط تیره و حداقل ۳ حرف باشد.');
        }
        if (username_exists($username)) {
            throw anbar_bad('این نام کاربری قبلاً ثبت شده است.');
        }
        anbar_check_new_password($b['password'] ?? '');
        $full = anbar_required($b['full_name'] ?? '', 'نام و نام خانوادگی', 100);
        $id = wp_insert_user(['user_login' => $username, 'user_pass' => $b['password'], 'display_name' => $full, 'first_name' => $full,
            'nickname' => $full, 'role' => 'anbar_user', 'user_email' => '']);
        if (is_wp_error($id)) {
            throw anbar_bad($id->get_error_message());
        }
        update_user_meta($id, 'anbar_must_change_pw', '1');
        update_user_meta($id, 'anbar_active', '1');
        update_user_meta($id, 'show_admin_bar_front', 'false');
        anbar_apply_user_fields($id, $b);
        anbar_audit($c['user']['id'], 'user_create', 'user', $id, ['username' => $username, 'perms' => anbar_get_perms($id)]);
        return ['id' => $id];
    });

    anbar_route('PUT', '/users/(?P<id>\d+)', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $b = $c['body'];
        $target = get_userdata((int) $c['params']['id']);
        if (!$target || !user_can($target, 'anbar_access')) {
            throw anbar_not_found('کاربر پیدا نشد.');
        }
        $active = !empty($b['active']);
        if ($target->ID === $c['user']['id'] && (!$active || empty($b['perms']['manage_users']))) {
            throw anbar_bad('نمی‌توانید مدیریت کاربران یا فعال‌بودن حساب خودتان را بردارید.');
        }
        wp_update_user(['ID' => $target->ID, 'display_name' => anbar_required($b['full_name'] ?? '', 'نام و نام خانوادگی', 100)]);
        $before = anbar_get_perms($target->ID);
        anbar_apply_user_fields($target->ID, $b);
        update_user_meta($target->ID, 'anbar_active', $active ? '1' : '0');
        if (!$active) {
            WP_Session_Tokens::get_instance($target->ID)->destroy_all();
        }
        anbar_audit($c['user']['id'], 'user_update', 'user', $target->ID, ['active' => $active, 'before' => $before, 'after' => anbar_get_perms($target->ID)]);
        return ['ok' => true];
    });

    anbar_route('POST', '/users/(?P<id>\d+)/reset-password', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $target = get_userdata((int) $c['params']['id']);
        if (!$target || !user_can($target, 'anbar_access')) {
            throw anbar_not_found('کاربر پیدا نشد.');
        }
        anbar_check_new_password($c['body']['password'] ?? '');
        wp_set_password($c['body']['password'], $target->ID);
        update_user_meta($target->ID, 'anbar_must_change_pw', '1');
        if ($target->ID === $c['user']['id']) {
            wp_set_auth_cookie($target->ID, true, is_ssl());
        }
        anbar_audit($c['user']['id'], 'password_reset', 'user', $target->ID);
        return ['ok' => true];
    });

    anbar_route('POST', '/warehouses', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $b = $c['body'];
        $name = anbar_required($b['name'] ?? '', 'نام انبار', 100);
        if (anbar_get('SELECT id FROM {warehouses} WHERE name = ?', $name)) {
            throw anbar_bad('انباری با این نام وجود دارد.');
        }
        $sort = (int) anbar_var('SELECT COALESCE(MAX(sort), 0) + 1 FROM {warehouses}');
        $r = anbar_run('INSERT INTO {warehouses} (name, description, tracks_expiry, sort, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
            $name, anbar_str($b['description'] ?? '', 500), empty($b['tracks_expiry']) ? 0 : 1, $sort);
        anbar_set_wh_people($r['id'], $b['people'] ?? []);
        anbar_audit($c['user']['id'], 'warehouse_create', 'warehouse', $r['id'], ['name' => $name]);
        return ['id' => $r['id']];
    });

    anbar_route('PUT', '/warehouses/(?P<id>\d+)', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $b = $c['body'];
        $w = anbar_get('SELECT * FROM {warehouses} WHERE id = ?', (int) $c['params']['id']);
        if (!$w) {
            throw anbar_not_found('انبار پیدا نشد.');
        }
        $name = anbar_required($b['name'] ?? '', 'نام انبار', 100);
        if (anbar_get('SELECT id FROM {warehouses} WHERE name = ? AND id <> ?', $name, (int) $w['id'])) {
            throw anbar_bad('انباری با این نام وجود دارد.');
        }
        anbar_run('UPDATE {warehouses} SET name = ?, description = ?, tracks_expiry = ?, archived = ? WHERE id = ?',
            $name, anbar_str($b['description'] ?? '', 500), empty($b['tracks_expiry']) ? 0 : 1, empty($b['archived']) ? 0 : 1, (int) $w['id']);
        if (isset($b['people'])) {
            anbar_set_wh_people($w['id'], $b['people']);
        }
        anbar_audit($c['user']['id'], 'warehouse_update', 'warehouse', (int) $w['id'], ['name' => $name, 'archived' => !empty($b['archived'])]);
        return ['ok' => true];
    });

    anbar_route('GET', '/audit', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $e = (string) ($c['query']['entity'] ?? '');
        $id = (int) ($c['query']['entity_id'] ?? 0);
        return anbar_all("SELECT a.*, u.display_name AS actor FROM {audit} a LEFT JOIN {users} u ON u.ID = a.user_id
            WHERE (? = '' OR a.entity = ?) AND (? = 0 OR a.entity_id = ?) ORDER BY a.id DESC LIMIT 300", $e, $e, $id, $id);
    });

    /* ============================================================ files, backups, reports */

    anbar_route('GET', '/file/(?P<name>[a-f0-9]{24}\.(?:jpg|png|webp))', function ($c) {
        $name = $c['params']['name'];
        $wh = anbar_var('SELECT i.warehouse_id FROM {item_photos} p JOIN {items} i ON i.id = p.item_id WHERE p.file = ? LIMIT 1', $name)
            ?: anbar_var('SELECT warehouse_id FROM {items} WHERE image = ? LIMIT 1', $name);
        if (!$wh || !anbar_can_see($c['user'], $wh)) {
            throw anbar_not_found();
        }
        $path = anbar_private_dir('images') . '/' . $name;
        if (!is_file($path)) {
            throw anbar_not_found();
        }
        header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($path, PATHINFO_EXTENSION)]);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    });

    anbar_route('GET', '/backups', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $files = glob(anbar_private_dir('backups') . '/anbar-*.json.gz') ?: [];
        rsort($files);
        return array_map(function ($f) {
            return ['name' => basename($f), 'size' => filesize($f), 'created_at' => gmdate('c', filemtime($f)), 'url' => anbar_rest_url('backups/' . basename($f))];
        }, $files);
    });
    anbar_route('POST', '/backups', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $name = anbar_backup_now();
        anbar_audit($c['user']['id'], 'backup', null, null, ['name' => $name]);
        return ['name' => $name];
    });
    anbar_route('GET', '/backups/(?P<name>anbar-[\d-]+\.json\.gz)', function ($c) {
        anbar_require($c['user'], 'manage_users');
        $path = anbar_private_dir('backups') . '/' . $c['params']['name'];
        if (!is_file($path)) {
            throw anbar_not_found();
        }
        anbar_send_file(file_get_contents($path), 'application/gzip', $c['params']['name']);
    });

    anbar_route('GET', '/reports/(?P<kind>\w+)', function ($c) {
        $u = $c['user'];
        $reports = anbar_reports($u);
        $rep = $reports[$c['params']['kind']] ?? null;
        if (!$rep) {
            throw anbar_not_found('گزارش پیدا نشد.');
        }
        $wh = (int) ($c['query']['warehouse'] ?? 0);
        if ($wh) {
            anbar_require_see($u, $wh);
        }
        $q = ['wh' => $wh, 'from' => anbar_date($c['query']['from'] ?? null, 'از تاریخ'), 'to' => anbar_date($c['query']['to'] ?? null, 'تا تاریخ')];
        $rows = $rep['rows']($q);
        if (($c['query']['format'] ?? '') === 'xlsx') {
            anbar_send_file(anbar_build_xlsx($rep['title'], $rep['headers'], $rows),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $c['params']['kind'] . '-' . anbar_today() . '.xlsx');
        }
        return ['title' => $rep['title'], 'headers' => $rep['headers'], 'rows' => $rows];
    });
}

/* ================================================================ helpers used by the routes */

/** Backtick-quote column names that are reserved words in MySQL. */
function anbar_col($k)
{
    return $k === 'condition' ? '`condition`' : $k;
}

function anbar_warehouse_list($user, $include_archived)
{
    $rows = anbar_all("SELECT w.*,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0) AS item_count,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.qty - i.broken_qty <= 0) AS out_count,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.min_qty > 0 AND i.qty - i.broken_qty > 0 AND i.qty - i.broken_qty <= i.min_qty) AS low_count,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.card_status <> 'reviewed') AS incomplete_count,
        (SELECT COUNT(*) FROM {loans} l WHERE l.warehouse_id = w.id AND l.status = 'open') AS loan_count,
        (SELECT COUNT(*) FROM {exits} e WHERE e.from_wh = w.id AND e.status = 'pending') AS pending_count,
        (SELECT COUNT(*) FROM {transfers} t WHERE t.to_wh = w.id AND t.status = 'pending') AS incoming_count
      FROM {warehouses} w WHERE 1 = 1" . ($include_archived ? '' : ' AND w.archived = 0') . anbar_scope_sql($user, 'w.id') . ' ORDER BY w.sort, w.id');
    $people = [];
    foreach (anbar_app_users() as $p) {
        if (anbar_is_active($p->ID)) {
            $people[] = anbar_user_public($p);
        }
    }
    foreach ($rows as &$w) {
        // Restricted people assigned to this warehouse are its operators.
        $w['people'] = [];
        foreach ($people as $p) {
            if (!$p['perms']['scope_all'] && in_array((int) $w['id'], $p['perms']['warehouses'], true)) {
                $w['people'][] = ['id' => $p['id'], 'full_name' => $p['full_name']];
            }
        }
    }
    return $rows;
}

/** Add/remove a warehouse from restricted users' scopes. */
function anbar_set_wh_people($warehouse_id, $user_ids)
{
    $want = array_map('intval', (array) $user_ids);
    foreach (anbar_app_users() as $u) {
        $p = anbar_get_perms($u->ID);
        if ($p['scope_all']) {
            continue;
        }
        $has = in_array((int) $warehouse_id, $p['warehouses'], true);
        $should = in_array((int) $u->ID, $want, true);
        if ($has !== $should) {
            $p['warehouses'] = $should ? array_merge($p['warehouses'], [(int) $warehouse_id]) : array_values(array_diff($p['warehouses'], [(int) $warehouse_id]));
            anbar_save_perms($u->ID, $p);
        }
    }
}

function anbar_apply_user_fields($id, $b)
{
    $perms = anbar_normalize_perms($b['perms'] ?? []);
    anbar_save_perms($id, $perms);
    update_user_meta($id, 'anbar_title', anbar_str($b['title'] ?? '', 100) ?? '');
    update_user_meta($id, 'anbar_phone', anbar_str(anbar_to_latin($b['phone'] ?? ''), 20) ?? '');
    update_user_meta($id, 'anbar_chat_id', anbar_str($b['chat_id'] ?? '', 40) ?? '');
}

/** Computed quantities for item queries (alias i). */
function anbar_item_calc_sql()
{
    return "(SELECT COALESCE(SUM(l.qty), 0) FROM {exit_lines} l JOIN {exits} e ON e.id = l.exit_id WHERE e.status = 'approved' AND l.item_id = i.id AND l.from_broken = 0) AS reserved_qty,
        (SELECT COALESCE(SUM(l.qty), 0) FROM {exit_lines} l JOIN {exits} e ON e.id = l.exit_id WHERE e.status = 'approved' AND l.item_id = i.id AND l.from_broken = 1) AS reserved_broken,
        (SELECT MIN(b.expiry) FROM {batches} b WHERE b.item_id = i.id AND b.qty > 0) AS next_expiry,
        (SELECT COALESCE(SUM(t.qty), 0) FROM {transfers} t WHERE t.item_id = i.id AND t.status = 'pending') AS transit_qty,
        (SELECT COUNT(*) FROM {item_photos} p WHERE p.item_id = i.id) AS photo_count";
}

function anbar_decorate_item($i, $user)
{
    $wh = $i['warehouse_id'];
    $i['usable_qty'] = anbar_r3($i['qty'] - $i['broken_qty'] - $i['reserved_qty']);
    $i['image_url'] = $i['image'] ? anbar_rest_url('file/' . $i['image']) : null;
    $i['missing'] = anbar_card_missing($i, (int) $i['photo_count']);
    $i['can'] = [
        'edit' => anbar_can_edit_card($user, $wh), 'stock_in' => anbar_can($user, 'stock_in', $wh), 'request_out' => anbar_can($user, 'request_out', $wh),
        'approve' => anbar_can($user, 'approve', $wh), 'steward' => anbar_can($user, 'steward', $wh),
    ];
    // Prices are useful to managers and the card steward; operators don't need them.
    if (!anbar_can($user, 'approve', $wh) && !anbar_can($user, 'steward', $wh) && !anbar_can($user, 'manage_users')) {
        unset($i['purchase_price'], $i['current_value']);
    }
    return $i;
}

function anbar_save_image($data_url)
{
    if (!preg_match('/^data:image\/(jpeg|png|webp);base64,(.+)$/s', (string) $data_url, $m)) {
        throw anbar_bad('فرمت تصویر پشتیبانی نمی‌شود.');
    }
    $buf = base64_decode($m[2], true);
    if ($buf === false || strlen($buf) > 4 * 1024 * 1024) {
        throw anbar_bad('حجم تصویر بیشتر از ۴ مگابایت است.');
    }
    if (function_exists('getimagesizefromstring') && !@getimagesizefromstring($buf)) {
        throw anbar_bad('فایل انتخاب‌شده تصویر نیست.');
    }
    $name = bin2hex(random_bytes(12)) . '.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]);
    file_put_contents(anbar_private_dir('images') . '/' . $name, $buf);
    return $name;
}

function anbar_add_photo($item_id, $data_url, $caption, $user)
{
    $file = anbar_save_image($data_url);
    $sort = (int) anbar_var('SELECT COALESCE(MAX(sort), 0) + 1 FROM {item_photos} WHERE item_id = ?', (int) $item_id);
    $r = anbar_run('INSERT INTO {item_photos} (item_id, file, caption, sort, user_id, created_at) VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())',
        (int) $item_id, $file, anbar_str($caption, 200), $sort, $user['id']);
    anbar_refresh_cover($item_id);
    return $r['id'];
}

function anbar_refresh_cover($item_id)
{
    $first = anbar_var('SELECT file FROM {item_photos} WHERE item_id = ? ORDER BY sort, id LIMIT 1', (int) $item_id);
    anbar_run('UPDATE {items} SET image = ? WHERE id = ?', $first ?: null, (int) $item_id);
}

/** Money: digits only; empty stays NULL (unknown), never 0. */
function anbar_money($v)
{
    $s = preg_replace('/[^\d]/', '', anbar_to_latin($v ?? ''));
    return $s === '' ? null : $s;
}

function anbar_item_fields($b)
{
    $condition = $b['condition'] ?? 'ok';
    if (!isset(ANBAR_CONDITIONS[$condition])) {
        throw anbar_bad('وضعیت نامعتبر است.');
    }
    $type = isset(anbar_item_types()[$b['item_type'] ?? '']) ? $b['item_type'] : 'other';
    $card = $b['card_status'] ?? 'draft';
    if (!isset(anbar_card_statuses()[$card])) {
        $card = 'draft';
    }
    $source = isset(ANBAR_SOURCES[$b['source'] ?? '']) ? $b['source'] : null;
    $currency = isset(ANBAR_CURRENCIES[$b['currency'] ?? '']) ? $b['currency'] : 'toman';
    return [
        'name' => anbar_required($b['name'] ?? '', 'نام کالا', 200),
        'code' => anbar_required(anbar_to_latin($b['code'] ?? ''), 'کد کالا', 50),
        'item_type' => $type,
        'category' => anbar_str($b['category'] ?? '', 80),
        'location' => anbar_str($b['location'] ?? '', 200),
        'custodian' => anbar_str($b['custodian'] ?? '', 150),
        'unit' => anbar_required($b['unit'] ?? '', 'واحد', 30),
        'min_qty' => anbar_qty(($b['min_qty'] ?? '') === '' ? 0 : $b['min_qty'], 'حداقل موجودی', true),
        'condition' => $condition,
        'condition_notes' => anbar_str($b['condition_notes'] ?? '', 3000),
        'brand' => anbar_str($b['brand'] ?? '', 120),
        'model' => anbar_str($b['model'] ?? '', 160),
        'serial' => anbar_str(anbar_to_latin($b['serial'] ?? ''), 160),
        'purchase_price' => anbar_money($b['purchase_price'] ?? ''),
        'current_value' => anbar_money($b['current_value'] ?? ''),
        'currency' => $currency,
        'purchase_date' => anbar_date($b['purchase_date'] ?? null, 'تاریخ خرید'),
        'valuation_date' => anbar_date($b['valuation_date'] ?? null, 'تاریخ برآورد'),
        'source' => $source,
        'vendor' => anbar_str($b['vendor'] ?? '', 200),
        'details' => wp_json_encode(anbar_clean_details($b['details'] ?? [], $type), JSON_UNESCAPED_UNICODE),
        'card_status' => $card,
        'notes' => anbar_str($b['notes'] ?? '', 4000),
    ];
}

function anbar_next_code($warehouse_id)
{
    $n = (int) anbar_var('SELECT COUNT(*) FROM {items} WHERE warehouse_id = ?', $warehouse_id);
    for ($i = $n + 1;; $i++) {
        $code = $warehouse_id . '-' . str_pad((string) $i, 4, '0', STR_PAD_LEFT);
        if (!anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ?', $warehouse_id, $code)) {
            return $code;
        }
    }
}

function anbar_exit_view($user, $id)
{
    $e = anbar_exit_load($id);
    $mine = (int) $e['requester_id'] === $user['id'];
    if (!$mine && !anbar_can_see($user, $e['from_wh']) && !($e['to_wh'] && anbar_can_see($user, $e['to_wh']))) {
        throw anbar_forbidden('این درخواست در محدوده دسترسی شما نیست.');
    }
    $names = function ($uid) {
        return $uid ? anbar_var('SELECT display_name FROM {users} WHERE ID = ?', (int) $uid) : null;
    };
    $e['code'] = anbar_exit_code($e['id']);
    $e['from_name'] = anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $e['from_wh']);
    $e['to_name'] = $e['to_wh'] ? anbar_var('SELECT name FROM {warehouses} WHERE id = ?', (int) $e['to_wh']) : null;
    $e['requester'] = $names($e['requester_id']);
    $e['approver'] = $names($e['approver_id']);
    $e['deliverer'] = $names($e['deliverer_id']);
    foreach ($e['lines'] as &$l) {
        $item = anbar_load_item($l['item_id']);
        $l['usable_qty'] = anbar_usable($item, $e['status'] === 'approved' ? $e['id'] : 0);
        $l['broken_free'] = anbar_broken_free($item, $e['status'] === 'approved' ? $e['id'] : 0);
    }
    unset($l);
    $e['ticket'] = $e['ticket_id'] ? anbar_get('SELECT id, code, first_name, last_name, status FROM {tickets} WHERE id = ?', (int) $e['ticket_id']) : null;
    $e['history'] = anbar_all("SELECT a.action, a.details, a.created_at, u.display_name AS actor FROM {audit} a LEFT JOIN {users} u ON u.ID = a.user_id
        WHERE a.entity = 'exit' AND a.entity_id = ? ORDER BY a.id", (int) $id);
    $wh = (int) $e['from_wh'];
    $open = in_array($e['status'], ['draft', 'pending', 'needs_changes', 'approved'], true);
    $e['can'] = [
        'edit' => $open && ($mine || anbar_can($user, 'request_out', $wh)),
        'submit' => in_array($e['status'], ['draft', 'needs_changes'], true) && ($mine || anbar_can($user, 'request_out', $wh)),
        'decide' => $e['status'] === 'pending' && anbar_can($user, 'approve', $wh),
        'deliver' => $e['status'] === 'approved' && anbar_can($user, 'deliver', $wh),
        'cancel' => $open && ($mine || anbar_can($user, 'request_out', $wh) || anbar_can($user, 'approve', $wh)),
    ];
    return $e;
}

function anbar_tx_query($user, $f = [])
{
    $where = ['1 = 1'];
    $p = [];
    foreach (['item' => 't.item_id', 'warehouse' => 't.warehouse_id', 'exit' => 't.exit_id'] as $k => $col) {
        if (!empty($f[$k])) {
            $where[] = "{$col} = ?";
            $p[] = (int) $f[$k];
        }
    }
    foreach (['from' => 't.op_date >= ?', 'to' => 't.op_date <= ?', 'reason' => 't.reason = ?', 'direction' => 't.direction = ?'] as $k => $cond) {
        if (!empty($f[$k])) {
            $where[] = $cond;
            $p[] = (string) $f[$k];
        }
    }
    $limit = min((int) ($f['limit'] ?? 500) ?: 500, 5000);
    return anbar_all('SELECT t.*, i.name AS item_name, i.code, i.unit, w.name AS warehouse, u.display_name AS recorder FROM {transactions} t
        JOIN {items} i ON i.id = t.item_id JOIN {warehouses} w ON w.id = t.warehouse_id JOIN {users} u ON u.ID = t.user_id
        WHERE ' . implode(' AND ', $where) . anbar_scope_sql($user, 't.warehouse_id') . " ORDER BY t.id DESC LIMIT {$limit}", ...$p);
}

function anbar_reports($user)
{
    $n = function ($v) {
        return $v === null || $v === '' ? '' : anbar_r3($v);
    };
    $money = function ($v) {
        return $v === null || $v === '' ? '' : (float) $v;
    };
    $reasons = anbar_reasons();
    $sc = function ($col) use ($user) {
        return anbar_scope_sql($user, $col);
    };
    $prices = anbar_can($user, 'approve') || anbar_can($user, 'steward') || anbar_can($user, 'manage_users');
    $types = anbar_item_types();
    $reports = [
        'inventory' => [
            'title' => 'گزارش موجودی',
            'headers' => ['انبار', 'کد', 'نام کالا', 'دسته‌بندی', 'محل نگهداری', 'در انبار', 'قابل‌استفاده', 'رزروشده', 'خراب', 'در امانت', 'در حال انتقال', 'واحد', 'حداقل', 'نزدیک‌ترین انقضا'],
            'rows' => function ($q) use ($n, $sc) {
                $rows = anbar_all('SELECT i.*, w.name AS warehouse, ' . anbar_item_calc_sql() . ' FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id
                    WHERE i.archived = 0 AND (? = 0 OR i.warehouse_id = ?)' . $sc('i.warehouse_id') . ' ORDER BY w.sort, i.name', $q['wh'], $q['wh']);
                return array_map(function ($i) use ($n) {
                    return [$i['warehouse'], $i['code'], $i['name'], $i['category'], $i['location'], $n($i['qty']),
                        $n($i['qty'] - $i['broken_qty'] - $i['reserved_qty']), $n($i['reserved_qty']), $n($i['broken_qty']), $n($i['loaned_qty']),
                        $n($i['transit_qty']), $i['unit'], $n($i['min_qty']), anbar_jalali($i['next_expiry'])];
                }, $rows);
            },
        ],
        'cards' => [
            'title' => 'شناسنامه اموال',
            'headers' => array_merge(['انبار', 'کد', 'نام', 'نوع', 'دسته‌بندی', 'برند', 'مدل', 'سریال', 'مقدار', 'واحد', 'وضعیت', 'شرح سلامت', 'محل نگهداری', 'تحویل‌دار', 'منبع', 'فروشنده/اهداکننده'],
                $prices ? ['قیمت خرید', 'تاریخ خرید', 'ارزش فعلی', 'تاریخ برآورد', 'واحد پول'] : [], ['وضعیت شناسنامه', 'موارد ناقص', 'مشخصات']),
            'rows' => function ($q) use ($n, $money, $sc, $prices, $types) {
                $rows = anbar_all('SELECT i.*, w.name AS warehouse, ' . anbar_item_calc_sql() . ' FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id
                    WHERE i.archived = 0 AND (? = 0 OR i.warehouse_id = ?)' . $sc('i.warehouse_id') . ' ORDER BY w.sort, i.name', $q['wh'], $q['wh']);
                return array_map(function ($i) use ($n, $money, $prices, $types) {
                    $d = json_decode($i['details'] ?? '', true) ?: [];
                    $spec = [];
                    foreach (anbar_general_fields() as [$k, $label]) {
                        if (!empty($d[$k])) {
                            $spec[] = "{$label}: {$d[$k]}";
                        }
                    }
                    foreach (($types[$i['item_type']]['fields'] ?? []) as [$k, $label]) {
                        if (!empty($d['specs'][$k])) {
                            $spec[] = "{$label}: {$d['specs'][$k]}";
                        }
                    }
                    foreach (($d['custom'] ?? []) as $cf) {
                        $spec[] = "{$cf['label']}: {$cf['value']}";
                    }
                    $row = [$i['warehouse'], $i['code'], $i['name'], $types[$i['item_type']]['label'] ?? '', $i['category'], $i['brand'], $i['model'], $i['serial'],
                        $n($i['qty']), $i['unit'], ANBAR_CONDITIONS[$i['condition']] ?? '', $i['condition_notes'], $i['location'], $i['custodian'],
                        ANBAR_SOURCES[$i['source']] ?? '', $i['vendor']];
                    if ($prices) {
                        array_push($row, $money($i['purchase_price']), anbar_jalali($i['purchase_date']), $money($i['current_value']),
                            anbar_jalali($i['valuation_date']), ANBAR_CURRENCIES[$i['currency']] ?? '');
                    }
                    array_push($row, anbar_card_statuses()[$i['card_status']] ?? '', implode('، ', anbar_card_missing($i, (int) $i['photo_count'])), implode(' | ', $spec));
                    return $row;
                }, $rows);
            },
        ],
        'transactions' => [
            'title' => 'گزارش گردش کالا',
            'headers' => ['شماره رسید', 'تاریخ', 'انبار', 'کد', 'کالا', 'نوع', 'علت', 'مقدار', 'تغییر موجودی', 'واحد', 'موجودی پس از عملیات', 'طرف تحویل', 'حواله', 'ثبت‌کننده', 'توضیحات'],
            'rows' => function ($q) use ($n, $reasons, $user) {
                $rows = array_reverse(anbar_tx_query($user, ['warehouse' => $q['wh'], 'from' => $q['from'], 'to' => $q['to'], 'limit' => 5000]));
                return array_map(function ($t) use ($n, $reasons) {
                    return [(int) $t['id'], anbar_jalali($t['op_date']), $t['warehouse'], $t['code'], $t['item_name'],
                        ['in' => 'ورود', 'out' => 'خروج', 'adj' => 'اصلاح', 'st' => 'وضعیت'][$t['direction']] ?? '', $reasons[$t['reason']][1] ?? $t['reason'],
                        $n($t['qty']), $n($t['delta']), $t['unit'], $n($t['qty_after']), $t['party'], $t['exit_id'] ? anbar_exit_code($t['exit_id']) : '', $t['recorder'], $t['note']];
                }, $rows);
            },
        ],
        'exits' => [
            'title' => 'گزارش درخواست‌ها، تأییدها و حواله‌های خروج',
            'headers' => ['شماره', 'تاریخ ثبت', 'انبار مبدأ', 'نوع', 'اقلام', 'تحویل‌گیرنده', 'وضعیت', 'درخواست‌کننده', 'تأییدکننده/بررسی‌کننده', 'زمان تصمیم', 'توضیح تصمیم', 'تحویل‌دهنده', 'زمان تحویل', 'تیکت'],
            'rows' => function ($q) use ($sc) {
                $rows = anbar_all('SELECT e.*, w.name AS from_name, tw.name AS to_name, u.display_name AS requester, au.display_name AS approver, du.display_name AS deliverer,
                      tk.code AS ticket_code,
                      (SELECT GROUP_CONCAT(CONCAT(i.name, \' (\', (l.qty * 1E0), \' \', i.unit, \')\') SEPARATOR \'، \')
                         FROM {exit_lines} l JOIN {items} i ON i.id = l.item_id WHERE l.exit_id = e.id) AS items
                    FROM {exits} e JOIN {warehouses} w ON w.id = e.from_wh LEFT JOIN {warehouses} tw ON tw.id = e.to_wh JOIN {users} u ON u.ID = e.requester_id
                    LEFT JOIN {users} au ON au.ID = e.approver_id LEFT JOIN {users} du ON du.ID = e.deliverer_id LEFT JOIN {tickets} tk ON tk.id = e.ticket_id
                    WHERE (? = 0 OR e.from_wh = ?) AND (? IS NULL OR DATE(e.created_at) >= ?) AND (? IS NULL OR DATE(e.created_at) <= ?)' . $sc('e.from_wh') . ' ORDER BY e.id',
                    $q['wh'], $q['wh'], $q['from'], $q['from'], $q['to'], $q['to']);
                return array_map(function ($e) {
                    return [anbar_exit_code($e['id']), anbar_jalali($e['created_at']), $e['from_name'],
                        anbar_exit_types()[$e['type']] . ($e['to_name'] ? " به {$e['to_name']}" : ''), $e['items'], $e['recipient'],
                        anbar_exit_statuses()[$e['status']] ?? $e['status'], $e['requester'], $e['approver'], anbar_jalali($e['approved_at']), $e['decision_note'],
                        $e['deliverer'], anbar_jalali($e['delivered_at']), $e['ticket_code']];
                }, $rows);
            },
        ],
        'loans' => [
            'title' => 'گزارش امانت‌ها',
            'headers' => ['انبار', 'کالا', 'تحویل‌گیرنده', 'برنامه', 'مقدار', 'برگشت‌داده', 'برگشت خراب', 'باقی‌مانده', 'واحد', 'تاریخ تحویل', 'موعد بازگشت', 'وضعیت', 'حواله'],
            'rows' => function ($q) use ($n, $sc) {
                $rows = anbar_all('SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse FROM {loans} l
                    JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id
                    WHERE (? = 0 OR l.warehouse_id = ?) AND (? IS NULL OR DATE(l.created_at) >= ?) AND (? IS NULL OR DATE(l.created_at) <= ?)' . $sc('l.warehouse_id') . '
                    ORDER BY l.created_at', $q['wh'], $q['wh'], $q['from'], $q['from'], $q['to'], $q['to']);
                $t = anbar_today();
                return array_map(function ($l) use ($n, $t) {
                    return [$l['warehouse'], $l['item_name'], $l['borrower'], $l['program'], $n($l['qty']), $n($l['returned_qty']), $n($l['returned_broken']),
                        $n($l['qty'] - $l['returned_qty']), $l['unit'], anbar_jalali($l['created_at']), anbar_jalali($l['due_date']),
                        $l['status'] === 'closed' ? 'بسته' : ($l['due_date'] && $l['due_date'] < $t ? 'دارای تأخیر' : 'باز'), $l['exit_id'] ? anbar_exit_code($l['exit_id']) : ''];
                }, $rows);
            },
        ],
        'transfers' => [
            'title' => 'گزارش انتقال‌ها',
            'headers' => ['شماره', 'تاریخ ارسال', 'کالا', 'مقدار', 'واحد', 'از انبار', 'به انبار', 'وضعیت', 'ارسال‌کننده', 'دریافت/بررسی', 'تاریخ بررسی', 'حواله', 'توضیحات'],
            'rows' => function ($q) use ($n, $user) {
                $scope = anbar_scope($user) === null ? '' : ' AND (1 = 0' . str_replace('AND', 'OR', anbar_scope_sql($user, 't.to_wh')) . str_replace('AND', 'OR', anbar_scope_sql($user, 't.from_wh')) . ')';
                $rows = anbar_all('SELECT t.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name, su.display_name AS sender, hu.display_name AS handler
                    FROM {transfers} t JOIN {items} i ON i.id = t.item_id JOIN {warehouses} fw ON fw.id = t.from_wh JOIN {warehouses} tw ON tw.id = t.to_wh
                    JOIN {users} su ON su.ID = t.sent_by LEFT JOIN {users} hu ON hu.ID = t.handled_by
                    WHERE (? = 0 OR t.from_wh = ? OR t.to_wh = ?) AND (? IS NULL OR DATE(t.sent_at) >= ?) AND (? IS NULL OR DATE(t.sent_at) <= ?)' . $scope . ' ORDER BY t.sent_at',
                    $q['wh'], $q['wh'], $q['wh'], $q['from'], $q['from'], $q['to'], $q['to']);
                $labels = ['pending' => 'در حال انتقال', 'received' => 'دریافت شد', 'rejected' => 'رد شد', 'cancelled' => 'لغو شد'];
                return array_map(function ($t) use ($n, $labels) {
                    return [(int) $t['id'], anbar_jalali($t['sent_at']), $t['item_name'], $n($t['qty']), $t['unit'], $t['from_name'], $t['to_name'],
                        $labels[$t['status']] ?? $t['status'], $t['sender'], $t['handler'], anbar_jalali($t['handled_at']), $t['exit_id'] ? anbar_exit_code($t['exit_id']) : '',
                        implode(' / ', array_filter([$t['note'], $t['handle_note']]))];
                }, $rows);
            },
        ],
        'repairs' => [
            'title' => 'گزارش خرابی و تعمیر',
            'headers' => ['تاریخ', 'انبار', 'کد', 'کالا', 'عملیات', 'مقدار', 'واحد', 'ثبت‌کننده', 'شرح'],
            'rows' => function ($q) use ($n, $user) {
                $rows = array_filter(anbar_tx_query($user, ['warehouse' => $q['wh'], 'from' => $q['from'], 'to' => $q['to'], 'direction' => 'st', 'limit' => 5000]));
                return array_map(function ($t) use ($n) {
                    return [anbar_jalali($t['op_date']), $t['warehouse'], $t['code'], $t['item_name'], $t['reason'] === 'damage' ? 'ثبت خرابی' : 'ثبت تعمیر',
                        $n($t['qty']), $t['unit'], $t['recorder'], $t['note']];
                }, array_reverse($rows));
            },
        ],
    ];
    if (anbar_can($user, 'tickets_all') || anbar_can($user, 'tickets_review')) {
        $reports['tickets'] = [
            'title' => 'گزارش تیکت‌ها',
            'headers' => ['شماره پیگیری', 'تاریخ', 'نام', 'شماره تماس', 'وسیله درخواستی', 'مقدار', 'وضعیت', 'ارجاع', 'زمان مراجعه', 'حواله‌ها'],
            'rows' => function ($q) {
                $rows = anbar_all("SELECT t.*, w.name AS referred_name,
                      (SELECT GROUP_CONCAT(e.id) FROM {exits} e WHERE e.ticket_id = t.id AND e.status <> 'cancelled') AS exit_ids
                    FROM {tickets} t LEFT JOIN {warehouses} w ON w.id = t.referred_wh
                    WHERE (? IS NULL OR DATE(t.created_at) >= ?) AND (? IS NULL OR DATE(t.created_at) <= ?) ORDER BY t.id", $q['from'], $q['from'], $q['to'], $q['to']);
                return array_map(function ($t) {
                    $exits = $t['exit_ids'] ? implode('، ', array_map('anbar_exit_code', explode(',', $t['exit_ids']))) : '';
                    return [$t['code'], anbar_jalali($t['created_at']), "{$t['first_name']} {$t['last_name']}", $t['phone'], $t['item_text'], $t['qty_text'],
                        anbar_ticket_statuses()[$t['status']] ?? '', $t['referred_name'], $t['appointment'], $exits];
                }, $rows);
            },
        ];
    }
    return $reports;
}
