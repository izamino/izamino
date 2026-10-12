<?php
/** REST API under /wp-json/anbar/v1 — same shapes the app's JavaScript expects. */
if (!defined('ABSPATH')) {
    exit;
}

const ANBAR_UNITS = ['عدد', 'متر', 'کیلوگرم', 'گرم', 'لیتر', 'بسته', 'جلد', 'جعبه', 'دست', 'کارتن', 'حلقه', 'ورق', 'شیشه', 'ورق قرص'];
const ANBAR_CONDITIONS = ['ok' => 'سالم', 'broken' => 'خراب', 'repair' => 'نیازمند تعمیر'];

/** Register a route whose handler gets ['user','params','body','query'] and returns data or throws Anbar_Error. */
function anbar_route($method, $path, callable $handler, $public = false)
{
    register_rest_route('anbar/v1', $path, [
        'methods' => $method,
        'permission_callback' => $public ? '__return_true' : 'anbar_rest_permission',
        'callback' => function (WP_REST_Request $req) use ($handler) {
            try {
                $ctx = [
                    'user' => anbar_current(),
                    'params' => $req->get_url_params(),
                    'body' => $req->get_json_params() ?: [],
                    'query' => $req->get_query_params(),
                    'request' => $req,
                ];
                $out = $handler($ctx);
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

/** Stream a file download and stop. */
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

add_action('rest_api_init', 'anbar_register_routes');

function anbar_register_routes()
{
    /* ------------------------------------------------------------ auth */

    anbar_route('POST', '/login', function ($c) {
        $username = trim((string) ($c['body']['username'] ?? ''));
        $key = 'anbar_login_' . md5(($_SERVER['REMOTE_ADDR'] ?? '') . '|' . strtolower($username));
        $fails = (int) get_transient($key);
        if ($fails >= 10) {
            throw new Anbar_Error(429, 'تعداد تلاش‌های ناموفق زیاد بود. ۱۵ دقیقه دیگر دوباره امتحان کنید.');
        }
        $u = wp_signon(['user_login' => $username, 'user_password' => (string) ($c['body']['password'] ?? ''), 'remember' => true], is_ssl());
        if (is_wp_error($u)) {
            if ($u->get_error_code() === 'anbar_inactive') {
                throw anbar_forbidden('حساب شما غیرفعال شده است. با مدیر کل تماس بگیرید.');
            }
            set_transient($key, $fails + 1, 15 * MINUTE_IN_SECONDS);
            throw new Anbar_Error(401, 'نام کاربری یا رمز عبور درست نیست.');
        }
        if (!user_can($u, 'anbar_access')) {
            wp_logout();
            throw anbar_forbidden('این حساب به سامانه انبار دسترسی ندارد. با مدیر کل تماس بگیرید.');
        }
        delete_transient($key);
        anbar_audit($u->ID, 'login', 'user', $u->ID);
        return ['ok' => true, 'reload' => true];
    }, true);

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
        // Changing the password invalidates the cookie; sign this browser back in.
        wp_set_auth_cookie($u->ID, true, is_ssl());
        anbar_audit($u->ID, 'change_password', 'user', $u->ID);
        return ['ok' => true, 'reload' => true];
    });

    anbar_route('PUT', '/me', function ($c) {
        update_user_meta($c['user']['id'], 'anbar_phone', anbar_str(anbar_to_latin($c['body']['phone'] ?? ''), 20) ?? '');
        update_user_meta($c['user']['id'], 'anbar_chat_id', anbar_str($c['body']['chat_id'] ?? '', 40) ?? '');
        return ['ok' => true];
    });

    /* ------------------------------------------------------------ lookups */

    anbar_route('GET', '/bootstrap', function ($c) {
        $u = $c['user'];
        $units = array_values(array_unique(array_merge(ANBAR_UNITS, array_column(anbar_all('SELECT DISTINCT unit FROM {items}'), 'unit'))));
        $people = [];
        foreach (anbar_app_users() as $p) {
            if (anbar_is_active($p->ID)) {
                $people[] = ['id' => (int) $p->ID, 'full_name' => $p->display_name];
            }
        }
        $reasons = [];
        foreach (anbar_reasons() as $k => $v) {
            $reasons[$k] = $v[1];
        }
        return [
            'user' => $u,
            'warehouses' => anbar_warehouse_list(anbar_is_admin($u)),
            'units' => $units,
            'categories' => array_column(anbar_all("SELECT DISTINCT category FROM {items} WHERE category IS NOT NULL AND category <> '' ORDER BY category"), 'category'),
            'locations' => array_column(anbar_all("SELECT DISTINCT location FROM {items} WHERE location IS NOT NULL AND location <> '' ORDER BY location"), 'location'),
            'people' => $people,
            'reasons' => $reasons,
            'conditions' => ANBAR_CONDITIONS,
            'unread' => anbar_unread($u['id']),
        ];
    });

    /* ------------------------------------------------------------ dashboard */

    anbar_route('GET', '/dashboard', function ($c) {
        $u = $c['user'];
        $t = anbar_today();
        if (anbar_is_admin($u)) {
            $scope = 'OR 1 = 1';
        } else {
            $scope = $u['managed'] ? 'OR r.warehouse_id IN (' . implode(',', array_map('intval', $u['managed'])) . ')' : '';
        }
        return [
            'warehouses' => anbar_warehouse_list(false),
            'shortages' => anbar_all('SELECT i.id, i.name, i.qty, i.min_qty, i.unit, w.name AS warehouse FROM {items} i
                JOIN {warehouses} w ON w.id = i.warehouse_id
                WHERE i.archived = 0 AND w.archived = 0 AND (i.qty <= 0 OR (i.min_qty > 0 AND i.qty <= i.min_qty))
                ORDER BY (i.qty <= 0) DESC, i.qty / NULLIF(i.min_qty, 0) LIMIT 30'),
            'requests' => anbar_all("SELECT r.*, w.name AS warehouse, u.display_name AS requester FROM {requests} r
                JOIN {warehouses} w ON w.id = r.warehouse_id JOIN {users} u ON u.ID = r.requester_id
                WHERE r.status IN ('pending', 'approved') AND (r.requester_id = ? {$scope})
                ORDER BY r.status = 'pending' DESC, r.created_at DESC LIMIT 20", $u['id']),
            'loans' => anbar_all("SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse FROM {loans} l
                JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id
                WHERE l.status = 'open' ORDER BY l.due_date IS NULL, l.due_date LIMIT 20"),
            'expiring' => anbar_all('SELECT b.*, i.id AS item_id, i.name AS item_name, i.unit, w.name AS warehouse FROM {batches} b
                JOIN {items} i ON i.id = b.item_id JOIN {warehouses} w ON w.id = i.warehouse_id
                WHERE b.qty > 0 AND i.archived = 0 AND b.expiry IS NOT NULL AND b.expiry <= ?
                ORDER BY b.expiry LIMIT 20', anbar_add_days($t, 60)),
            'transfers' => anbar_all("SELECT tr.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name FROM {transfers} tr
                JOIN {items} i ON i.id = tr.item_id JOIN {warehouses} fw ON fw.id = tr.from_wh JOIN {warehouses} tw ON tw.id = tr.to_wh
                WHERE tr.status = 'pending' ORDER BY tr.sent_at"),
            'announcements' => anbar_all('SELECT a.*, u.display_name AS author FROM {announcements} a JOIN {users} u ON u.ID = a.user_id
                WHERE a.archived = 0 ORDER BY a.pinned DESC, a.created_at DESC LIMIT 3'),
            'recent' => anbar_tx_query(['limit' => 8]),
            'today' => $t,
        ];
    });

    /* ------------------------------------------------------------ items */

    anbar_route('GET', '/items', function ($c) {
        $q = $c['query'];
        $where = ['1 = 1'];
        $p = [];
        if (!empty($q['q'])) {
            $like = '%' . anbar_like(trim(anbar_to_latin($q['q']))) . '%';
            $raw = '%' . anbar_like(trim($q['q'])) . '%';
            $where[] = '(i.name LIKE ? OR i.code LIKE ? OR i.category LIKE ? OR i.brand LIKE ? OR i.model LIKE ? OR i.serial LIKE ? OR i.location LIKE ? OR i.name LIKE ?)';
            array_push($p, $like, $like, $like, $like, $like, $like, $like, $raw);
        }
        if (!empty($q['warehouse'])) {
            $where[] = 'i.warehouse_id = ?';
            $p[] = (int) $q['warehouse'];
        }
        if (!empty($q['condition'])) {
            $where[] = 'i.`condition` = ?';
            $p[] = (string) $q['condition'];
        }
        if (!empty($q['category'])) {
            $where[] = 'i.category = ?';
            $p[] = (string) $q['category'];
        }
        if (!empty($q['location'])) {
            $where[] = 'i.location LIKE ?';
            $p[] = '%' . anbar_like($q['location']) . '%';
        }
        $where[] = (($q['archived'] ?? '') === '1') ? 'i.archived = 1' : 'i.archived = 0';
        $status = $q['status'] ?? '';
        if ($status === 'low') {
            $where[] = 'i.min_qty > 0 AND i.qty > 0 AND i.qty <= i.min_qty';
        } elseif ($status === 'out') {
            $where[] = 'i.qty <= 0';
        } elseif ($status === 'loaned') {
            $where[] = 'i.loaned_qty > 0';
        } elseif ($status === 'expiring') {
            $where[] = 'EXISTS (SELECT 1 FROM {batches} b WHERE b.item_id = i.id AND b.qty > 0 AND b.expiry <= ?)';
            $p[] = anbar_add_days(anbar_today(), 60);
        }
        $rows = anbar_all("SELECT i.*, w.name AS warehouse,
              (SELECT MIN(b.expiry) FROM {batches} b WHERE b.item_id = i.id AND b.qty > 0) AS next_expiry,
              (SELECT COALESCE(SUM(t.qty), 0) FROM {transfers} t WHERE t.item_id = i.id AND t.status = 'pending') AS transit_qty
            FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id
            WHERE " . implode(' AND ', $where) . ' ORDER BY w.sort, i.name LIMIT 1000', ...$p);
        return array_map(function ($i) use ($c) {
            return anbar_decorate_item($i, $c['user']);
        }, $rows);
    });

    anbar_route('GET', '/items/next-code', function ($c) {
        return ['code' => anbar_next_code((int) ($c['query']['warehouse'] ?? 0))];
    });

    anbar_route('POST', '/items', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $wh = anbar_get('SELECT * FROM {warehouses} WHERE id = ? AND archived = 0', (int) ($b['warehouse_id'] ?? 0));
        if (!$wh) {
            throw anbar_bad('انبار را انتخاب کنید.');
        }
        anbar_require_edit($u, $wh['id']);
        if (empty($b['code'])) {
            $b['code'] = anbar_next_code((int) $wh['id']);
        }
        $f = anbar_item_fields($b);
        if (anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ?', (int) $wh['id'], $f['code'])) {
            throw anbar_bad("کد «{$f['code']}» در این انبار تکراری است.");
        }
        $batch = array_key_exists('batch_tracked', $b) ? (empty($b['batch_tracked']) ? 0 : 1) : (int) $wh['tracks_expiry'];
        $image = !empty($b['image_data']) ? anbar_save_image($b['image_data']) : null;
        $opening = !empty($b['opening_qty']) ? anbar_qty($b['opening_qty'], 'موجودی اولیه') : 0;
        $expiry = anbar_date($b['expiry'] ?? null, 'تاریخ انقضا');
        $r = anbar_run('INSERT INTO {items} (warehouse_id, name, code, category, location, unit, min_qty, `condition`, brand, model, serial,
                          notes, image, batch_tracked, created_by, created_at, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())',
            (int) $wh['id'], $f['name'], $f['code'], $f['category'], $f['location'], $f['unit'], $f['min_qty'], $f['condition'],
            $f['brand'], $f['model'], $f['serial'], $f['notes'], $image, $batch, $u['id']);
        anbar_audit($u['id'], 'item_create', 'item', $r['id'], $f);
        // Opening stock is recorded as a normal entry so it appears in history.
        if ($opening > 0) {
            anbar_stock_in($r['id'], ['reason' => 'receive', 'qty' => $opening, 'note' => 'موجودی اولیه',
                'batch_no' => anbar_str(anbar_to_latin($b['batch_no'] ?? ''), 60), 'expiry' => $expiry], $u);
        }
        return ['id' => $r['id']];
    });

    anbar_route('GET', '/items/(?P<id>\d+)', function ($c) {
        $u = $c['user'];
        $item = anbar_get('SELECT i.*, w.name AS warehouse, u.display_name AS creator FROM {items} i
            JOIN {warehouses} w ON w.id = i.warehouse_id LEFT JOIN {users} u ON u.ID = i.created_by WHERE i.id = ?', (int) $c['params']['id']);
        if (!$item) {
            throw anbar_not_found('کالا پیدا نشد.');
        }
        $item = anbar_decorate_item($item, $u);
        $id = (int) $item['id'];
        $item['batches'] = anbar_all('SELECT * FROM {batches} WHERE item_id = ? AND qty > 0 ORDER BY expiry IS NULL, expiry', $id);
        $item['loans'] = anbar_all("SELECT l.*, u.display_name AS recorder FROM {loans} l JOIN {users} u ON u.ID = l.user_id
            WHERE l.item_id = ? ORDER BY l.status = 'open' DESC, l.created_at DESC LIMIT 30", $id);
        $item['transfers'] = anbar_all('SELECT t.*, fw.name AS from_name, tw.name AS to_name FROM {transfers} t
            JOIN {warehouses} fw ON fw.id = t.from_wh JOIN {warehouses} tw ON tw.id = t.to_wh
            WHERE t.item_id = ? OR t.dest_item_id = ? ORDER BY t.sent_at DESC LIMIT 20', $id, $id);
        $transit = 0;
        foreach ($item['transfers'] as $t) {
            if ($t['status'] === 'pending' && (int) $t['item_id'] === $id) {
                $transit += (float) $t['qty'];
            }
        }
        $item['transit_qty'] = anbar_r3($transit);
        $item['history'] = anbar_tx_query(['item' => $id, 'limit' => 200]);
        $item['open_requests'] = anbar_all("SELECT r.*, u.display_name AS requester FROM {requests} r JOIN {users} u ON u.ID = r.requester_id
            WHERE r.item_id = ? AND r.status IN ('pending','approved')", $id);
        return $item;
    });

    anbar_route('PUT', '/items/(?P<id>\d+)', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $item = anbar_load_item($c['params']['id']);
        anbar_require_edit($u, $item['warehouse_id']);
        $f = anbar_item_fields($b);
        if ($f['code'] !== $item['code'] && anbar_get('SELECT id FROM {items} WHERE warehouse_id = ? AND code = ? AND id <> ?', $item['warehouse_id'], $f['code'], $item['id'])) {
            throw anbar_bad("کد «{$f['code']}» در این انبار تکراری است.");
        }
        $image = $item['image'];
        if (!empty($b['image_data'])) {
            $image = anbar_save_image($b['image_data']);
        }
        if (!empty($b['remove_image'])) {
            $image = null;
        }
        $batch = array_key_exists('batch_tracked', $b) ? (empty($b['batch_tracked']) ? 0 : 1) : $item['batch_tracked'];
        if ($batch && !$item['batch_tracked'] && $item['qty'] > 0) {
            throw anbar_bad('برای فعال‌کردن ثبت سری، ابتدا موجودی را صفر کنید یا کالای جدید بسازید.');
        }
        if (!$batch && $item['batch_tracked'] && anbar_get('SELECT id FROM {batches} WHERE item_id = ? AND qty > 0', $item['id'])) {
            throw anbar_bad('این کالا سری دارای موجودی دارد و نمی‌توان ثبت سری را خاموش کرد.');
        }
        anbar_run('UPDATE {items} SET name = ?, code = ?, category = ?, location = ?, unit = ?, min_qty = ?, `condition` = ?, brand = ?, model = ?,
                     serial = ?, notes = ?, image = ?, batch_tracked = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
            $f['name'], $f['code'], $f['category'], $f['location'], $f['unit'], $f['min_qty'], $f['condition'], $f['brand'], $f['model'],
            $f['serial'], $f['notes'], $image, $batch, $item['id']);
        $changes = [];
        foreach ($f as $k => $v) {
            $old = $item[$k] ?? null;
            if ($k === 'min_qty' ? (float) $old != (float) $v : (string) $old !== (string) $v) {
                $changes[$k] = [$old, $v];
            }
        }
        if ($image !== $item['image']) {
            $changes['image'] = ['قبلی', $image ? 'جدید' : 'حذف'];
        }
        if ($changes) {
            anbar_audit($u['id'], 'item_update', 'item', $item['id'], $changes);
        }
        if ($f['condition'] !== $item['condition'] && $f['condition'] !== 'ok') {
            $label = ANBAR_CONDITIONS[$f['condition']];
            anbar_notify(anbar_warehouse_audience($item['warehouse_id'], $u['id']), [
                'kind' => 'damage', 'title' => "«{$f['name']}»: {$label}",
                'body' => "وضعیت این کالا توسط {$u['full_name']} به «{$label}» تغییر کرد.",
                'link' => '#/items/' . $item['id'], 'warehouse_id' => $item['warehouse_id'],
            ]);
        }
        return ['ok' => true];
    });

    anbar_route('POST', '/items/(?P<id>\d+)/archive', function ($c) {
        $item = anbar_load_item($c['params']['id']);
        anbar_require_edit($c['user'], $item['warehouse_id']);
        $archived = empty($c['body']['archived']) ? 0 : 1;
        if ($archived && $item['loaned_qty'] > 0) {
            throw anbar_bad('این کالا امانت باز دارد؛ ابتدا امانت‌ها را ببندید.');
        }
        if ($archived && anbar_get("SELECT id FROM {transfers} WHERE item_id = ? AND status = 'pending'", $item['id'])) {
            throw anbar_bad('این کالا انتقال در جریان دارد.');
        }
        anbar_run('UPDATE {items} SET archived = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?', $archived, $item['id']);
        anbar_audit($c['user']['id'], $archived ? 'item_archive' : 'item_unarchive', 'item', $item['id']);
        return ['ok' => true];
    });

    /* ------------------------------------------------------------ stock operations */

    $guard = function ($c) {
        anbar_require_edit($c['user'], anbar_load_item($c['params']['id'])['warehouse_id']);
        return (int) $c['params']['id'];
    };
    anbar_route('POST', '/items/(?P<id>\d+)/in', function ($c) use ($guard) {
        return ['tx_id' => anbar_stock_in($guard($c), anbar_op_input($c['body']), $c['user'])];
    });
    anbar_route('POST', '/items/(?P<id>\d+)/out', function ($c) use ($guard) {
        return ['tx_id' => anbar_stock_out($guard($c), anbar_op_input($c['body']), $c['user'])];
    });
    anbar_route('POST', '/items/(?P<id>\d+)/adjust', function ($c) use ($guard) {
        $b = $c['body'];
        return ['tx_id' => anbar_adjust($guard($c), [
            'new_qty' => anbar_qty($b['new_qty'] ?? '', 'مقدار شمارش‌شده', true),
            'batch_id' => !empty($b['batch_id']) ? (int) $b['batch_id'] : null,
            'note' => anbar_str($b['note'] ?? '', 1000),
            'corrects_id' => !empty($b['corrects_id']) ? (int) $b['corrects_id'] : null,
            'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(),
        ], $c['user'])];
    });
    anbar_route('POST', '/items/(?P<id>\d+)/loan', function ($c) use ($guard) {
        $b = $c['body'];
        return anbar_loan_out($guard($c), [
            'borrower' => anbar_required($b['borrower'] ?? '', 'نام تحویل‌گیرنده', 150),
            'program' => anbar_str($b['program'] ?? '', 150),
            'due_date' => anbar_date($b['due_date'] ?? null, 'موعد بازگشت'),
        ] + anbar_op_input($b), $c['user']);
    });
    anbar_route('POST', '/items/(?P<id>\d+)/transfer', function ($c) use ($guard) {
        $b = $c['body'];
        return anbar_transfer_send($guard($c), ['to_wh' => (int) ($b['to_wh'] ?? 0), 'qty' => anbar_qty($b['qty'] ?? ''),
            'note' => anbar_str($b['note'] ?? '', 1000), 'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today()], $c['user']);
    });

    /* ------------------------------------------------------------ loans */

    anbar_route('GET', '/loans', function ($c) {
        $status = $c['query']['status'] ?? 'open';
        $wh = (int) ($c['query']['warehouse'] ?? 0);
        $rows = anbar_all("SELECT l.*, i.name AS item_name, i.unit, i.code, w.name AS warehouse, u.display_name AS recorder FROM {loans} l
            JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id JOIN {users} u ON u.ID = l.user_id
            WHERE (? = 'all' OR l.status = ?) AND (? = 0 OR l.warehouse_id = ?)
            ORDER BY l.status = 'open' DESC, l.due_date IS NULL, l.due_date, l.created_at DESC LIMIT 500", $status, $status, $wh, $wh);
        return array_map(function ($l) use ($c) {
            return $l + ['can_edit' => anbar_can_edit($c['user'], $l['warehouse_id'])];
        }, $rows);
    });
    anbar_route('POST', '/loans/(?P<id>\d+)/return', function ($c) {
        $b = $c['body'];
        return ['tx_id' => anbar_loan_return((int) $c['params']['id'], ['qty' => anbar_qty($b['qty'] ?? ''), 'note' => anbar_str($b['note'] ?? '', 1000),
            'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today()], $c['user'])];
    });

    /* ------------------------------------------------------------ transfers */

    anbar_route('GET', '/transfers', function ($c) {
        $status = $c['query']['status'] ?? 'all';
        $rows = anbar_all("SELECT t.*, i.name AS item_name, i.unit, i.code, fw.name AS from_name, tw.name AS to_name,
              su.display_name AS sender, hu.display_name AS handler FROM {transfers} t
            JOIN {items} i ON i.id = t.item_id JOIN {warehouses} fw ON fw.id = t.from_wh JOIN {warehouses} tw ON tw.id = t.to_wh
            JOIN {users} su ON su.ID = t.sent_by LEFT JOIN {users} hu ON hu.ID = t.handled_by
            WHERE (? = 'all' OR t.status = ?) ORDER BY t.status = 'pending' DESC, t.sent_at DESC LIMIT 300", $status, $status);
        return array_map(function ($t) use ($c) {
            return $t + ['can_receive' => anbar_can_edit($c['user'], $t['to_wh']), 'can_cancel' => anbar_can_edit($c['user'], $t['from_wh'])];
        }, $rows);
    });
    anbar_route('POST', '/transfers/(?P<id>\d+)/receive', function ($c) {
        return ['tx_id' => anbar_transfer_receive((int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000)], $c['user'])];
    });
    anbar_route('POST', '/transfers/(?P<id>\d+)/reject', function ($c) {
        return ['tx_id' => anbar_transfer_back((int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000)], $c['user'], 'reject')];
    });
    anbar_route('POST', '/transfers/(?P<id>\d+)/cancel', function ($c) {
        return ['tx_id' => anbar_transfer_back((int) $c['params']['id'], ['note' => anbar_str($c['body']['note'] ?? '', 1000)], $c['user'], 'cancel')];
    });

    /* ------------------------------------------------------------ transactions & receipts */

    anbar_route('GET', '/transactions', function ($c) {
        $q = $c['query'];
        $q['from'] = anbar_date($q['from'] ?? null);
        $q['to'] = anbar_date($q['to'] ?? null);
        return anbar_tx_query($q);
    });
    anbar_route('GET', '/transactions/(?P<id>\d+)', function ($c) {
        $t = anbar_get('SELECT t.*, i.name AS item_name, i.code, i.unit, i.brand, i.model, i.serial,
              w.name AS warehouse, u.display_name AS recorder, l.program, l.due_date
            FROM {transactions} t JOIN {items} i ON i.id = t.item_id JOIN {warehouses} w ON w.id = t.warehouse_id
            JOIN {users} u ON u.ID = t.user_id LEFT JOIN {loans} l ON l.id = t.loan_id WHERE t.id = ?', (int) $c['params']['id']);
        if (!$t) {
            throw anbar_not_found('رسید پیدا نشد.');
        }
        $t['corrections'] = anbar_all('SELECT id, delta, note, created_at FROM {transactions} WHERE corrects_id = ?', (int) $t['id']);
        return $t;
    });

    /* ------------------------------------------------------------ requests */

    anbar_route('GET', '/requests', function ($c) {
        $u = $c['user'];
        $scope = $c['query']['scope'] ?? 'all';
        $where = [];
        $p = [];
        if ($scope === 'mine') {
            $where[] = 'r.requester_id = ?';
            $p[] = $u['id'];
        }
        if ($scope === 'review' && !anbar_is_admin($u)) {
            $where[] = $u['managed'] ? 'r.warehouse_id IN (' . implode(',', array_map('intval', $u['managed'])) . ')' : '0 = 1';
        }
        if (!empty($c['query']['status'])) {
            $where[] = 'r.status = ?';
            $p[] = (string) $c['query']['status'];
        }
        $rows = anbar_all('SELECT r.*, w.name AS warehouse, u.display_name AS requester, ru.display_name AS reviewer, i.qty AS item_qty,
              i.unit AS item_unit FROM {requests} r
            JOIN {warehouses} w ON w.id = r.warehouse_id JOIN {users} u ON u.ID = r.requester_id
            LEFT JOIN {users} ru ON ru.ID = r.reviewer_id LEFT JOIN {items} i ON i.id = r.item_id
            ' . ($where ? 'WHERE ' . implode(' AND ', $where) : '') . "
            ORDER BY r.status = 'pending' DESC, r.status = 'approved' DESC, r.created_at DESC LIMIT 300", ...$p);
        return array_map(function ($r) use ($u) {
            return $r + ['can_review' => anbar_can_edit($u, $r['warehouse_id']), 'is_mine' => (int) $r['requester_id'] === $u['id']];
        }, $rows);
    });

    anbar_route('POST', '/requests', function ($c) {
        $u = $c['user'];
        $b = $c['body'];
        $wh = anbar_get('SELECT * FROM {warehouses} WHERE id = ? AND archived = 0', (int) ($b['warehouse_id'] ?? 0));
        if (!$wh) {
            throw anbar_bad('انبار را انتخاب کنید.');
        }
        $kind = in_array($b['kind'] ?? '', ['use', 'loan', 'supply'], true) ? $b['kind'] : 'use';
        $item = null;
        if (!empty($b['item_id'])) {
            $item = anbar_get('SELECT * FROM {items} WHERE id = ? AND warehouse_id = ?', (int) $b['item_id'], (int) $wh['id']);
            if (!$item) {
                throw anbar_bad('کالای انتخاب‌شده در این انبار نیست.');
            }
        }
        $name = $item ? $item['name'] : anbar_required($b['item_name'] ?? '', 'نام کالا', 150);
        $qty = anbar_qty($b['qty'] ?? '');
        $unit = $item ? $item['unit'] : anbar_str($b['unit'] ?? '', 30);
        $r = anbar_run('INSERT INTO {requests} (warehouse_id, item_id, item_name, qty, unit, kind, reason, needed_by, requester_id, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())',
            (int) $wh['id'], $item ? (int) $item['id'] : null, $name, $qty, $unit, $kind,
            anbar_required($b['reason'] ?? '', 'علت نیاز', 1000), anbar_date($b['needed_by'] ?? null, 'زمان موردنیاز'), $u['id']);
        $kinds = ['use' => 'دریافت وسیله', 'loan' => 'امانت', 'supply' => 'تأمین کالا'];
        anbar_notify(anbar_warehouse_audience($wh['id'], $u['id']), [
            'kind' => 'request_new', 'title' => "درخواست {$kinds[$kind]}: «{$name}»",
            'body' => "{$u['full_name']} — " . anbar_fmt($qty) . ' ' . ($unit ?: '') . " — {$wh['name']}",
            'link' => '#/requests', 'warehouse_id' => (int) $wh['id'],
        ]);
        return ['id' => $r['id']];
    });

    anbar_route('POST', '/requests/(?P<id>\d+)/review', function ($c) {
        $u = $c['user'];
        $r = anbar_get('SELECT * FROM {requests} WHERE id = ?', (int) $c['params']['id']);
        if (!$r) {
            throw anbar_not_found('درخواست پیدا نشد.');
        }
        anbar_require_edit($u, $r['warehouse_id']);
        $map = ['approve' => 'approved', 'reject' => 'rejected', 'deliver' => 'delivered'];
        $decision = $map[$c['body']['decision'] ?? ''] ?? null;
        if (!$decision) {
            throw anbar_bad('تصمیم نامعتبر است.');
        }
        $note = anbar_str($c['body']['note'] ?? '', 1000);
        if ($decision === 'rejected' && !$note) {
            throw anbar_bad('علت رد درخواست را بنویسید.');
        }
        if ($decision === 'delivered' && $r['item_id'] && $r['kind'] !== 'supply') {
            throw anbar_bad('برای تحویل این درخواست، خروج یا امانت را از صفحه کالا ثبت کنید تا موجودی کم شود.');
        }
        if (!in_array($r['status'], ['pending', 'approved'], true)) {
            throw anbar_bad('این درخواست قبلاً بسته شده است.');
        }
        anbar_run('UPDATE {requests} SET status = ?, reviewer_id = ?, review_note = ?, reviewed_at = UTC_TIMESTAMP() WHERE id = ?',
            $decision, $u['id'], $note, (int) $r['id']);
        $labels = ['approved' => 'تأیید شد', 'rejected' => 'رد شد', 'delivered' => 'انجام شد'];
        if ((int) $r['requester_id'] !== $u['id']) {
            anbar_notify([(int) $r['requester_id']], [
                'kind' => 'request_result', 'title' => "درخواست «{$r['item_name']}» {$labels[$decision]}",
                'body' => $note ? "توضیح {$u['full_name']}: {$note}" : "بررسی‌کننده: {$u['full_name']}",
                'link' => '#/requests', 'warehouse_id' => (int) $r['warehouse_id'],
            ]);
        }
        return ['ok' => true];
    });

    anbar_route('POST', '/requests/(?P<id>\d+)/cancel', function ($c) {
        $r = anbar_get('SELECT * FROM {requests} WHERE id = ?', (int) $c['params']['id']);
        if (!$r) {
            throw anbar_not_found('درخواست پیدا نشد.');
        }
        if ((int) $r['requester_id'] !== $c['user']['id']) {
            throw anbar_forbidden('فقط ثبت‌کننده می‌تواند درخواست را لغو کند.');
        }
        if ($r['status'] !== 'pending') {
            throw anbar_bad('فقط درخواست‌های در انتظار بررسی قابل لغو هستند.');
        }
        anbar_run("UPDATE {requests} SET status = 'cancelled' WHERE id = ?", (int) $r['id']);
        return ['ok' => true];
    });

    /* ------------------------------------------------------------ notifications & announcements */

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
        if (!anbar_is_admin($u) && !$u['managed']) {
            throw anbar_forbidden('فقط مدیران می‌توانند اطلاعیه منتشر کنند.');
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
            anbar_require_admin($c['user']);
        }
        anbar_run('UPDATE {announcements} SET archived = 1 WHERE id = ?', (int) $a['id']);
        return ['ok' => true];
    });

    /* ------------------------------------------------------------ admin: users & warehouses */

    anbar_route('GET', '/users', function ($c) {
        anbar_require_admin($c['user']);
        $out = array_map('anbar_user_public', anbar_app_users());
        usort($out, function ($a, $b) {
            return [$b['active'], $a['role'], $a['full_name']] <=> [$a['active'], $b['role'], $b['full_name']];
        });
        return $out;
    });

    anbar_route('POST', '/users', function ($c) {
        anbar_require_admin($c['user']);
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
        $id = wp_insert_user([
            'user_login' => $username, 'user_pass' => $b['password'], 'display_name' => $full, 'first_name' => $full,
            'nickname' => $full, 'role' => ($b['role'] ?? '') === 'admin' ? 'anbar_admin' : 'anbar_user',
            'user_email' => '',
        ]);
        if (is_wp_error($id)) {
            throw anbar_bad($id->get_error_message());
        }
        update_user_meta($id, 'anbar_must_change_pw', '1');
        update_user_meta($id, 'anbar_active', '1');
        update_user_meta($id, 'anbar_phone', anbar_str(anbar_to_latin($b['phone'] ?? ''), 20) ?? '');
        update_user_meta($id, 'anbar_chat_id', anbar_str($b['chat_id'] ?? '', 40) ?? '');
        update_user_meta($id, 'show_admin_bar_front', 'false');
        anbar_set_managed($id, $b['managed'] ?? []);
        anbar_audit($c['user']['id'], 'user_create', 'user', $id, ['username' => $username, 'role' => $b['role'] ?? 'user', 'managed' => $b['managed'] ?? []]);
        return ['id' => $id];
    });

    anbar_route('PUT', '/users/(?P<id>\d+)', function ($c) {
        anbar_require_admin($c['user']);
        $b = $c['body'];
        $target = get_userdata((int) $c['params']['id']);
        if (!$target || !user_can($target, 'anbar_access')) {
            throw anbar_not_found('کاربر پیدا نشد.');
        }
        $admin = ($b['role'] ?? '') === 'admin';
        $active = !empty($b['active']);
        if ($target->ID === $c['user']['id'] && (!$admin || !$active)) {
            throw anbar_bad('نمی‌توانید نقش مدیر کل یا فعال‌بودن حساب خودتان را بردارید.');
        }
        $full = anbar_required($b['full_name'] ?? '', 'نام و نام خانوادگی', 100);
        wp_update_user(['ID' => $target->ID, 'display_name' => $full]);
        // WordPress administrators keep their site role; only the app's own roles are switched here.
        if (!user_can($target, 'manage_options')) {
            $target->set_role($admin ? 'anbar_admin' : 'anbar_user');
        } elseif (!$admin) {
            throw anbar_bad('مدیر سایت وردپرس همیشه مدیر کل انبار است.');
        }
        update_user_meta($target->ID, 'anbar_phone', anbar_str(anbar_to_latin($b['phone'] ?? ''), 20) ?? '');
        update_user_meta($target->ID, 'anbar_chat_id', anbar_str($b['chat_id'] ?? '', 40) ?? '');
        update_user_meta($target->ID, 'anbar_active', $active ? '1' : '0');
        if (!$active) {
            WP_Session_Tokens::get_instance($target->ID)->destroy_all();
        }
        anbar_set_managed($target->ID, $b['managed'] ?? []);
        anbar_audit($c['user']['id'], 'user_update', 'user', $target->ID, ['role' => $admin ? 'admin' : 'user', 'active' => $active, 'managed' => $b['managed'] ?? []]);
        return ['ok' => true];
    });

    anbar_route('POST', '/users/(?P<id>\d+)/reset-password', function ($c) {
        anbar_require_admin($c['user']);
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
        anbar_require_admin($c['user']);
        $b = $c['body'];
        $name = anbar_required($b['name'] ?? '', 'نام انبار', 100);
        if (anbar_get('SELECT id FROM {warehouses} WHERE name = ?', $name)) {
            throw anbar_bad('انباری با این نام وجود دارد.');
        }
        return anbar_tx(function () use ($b, $name, $c) {
            $sort = (int) anbar_var('SELECT COALESCE(MAX(sort), 0) + 1 FROM {warehouses}');
            $r = anbar_run('INSERT INTO {warehouses} (name, description, tracks_expiry, sort, created_at) VALUES (?, ?, ?, ?, UTC_TIMESTAMP())',
                $name, anbar_str($b['description'] ?? '', 500), empty($b['tracks_expiry']) ? 0 : 1, $sort);
            foreach (array_unique(array_map('intval', (array) ($b['managers'] ?? []))) as $m) {
                anbar_run('INSERT INTO {warehouse_managers} (warehouse_id, user_id) VALUES (?, ?)', $r['id'], $m);
            }
            anbar_audit($c['user']['id'], 'warehouse_create', 'warehouse', $r['id'], ['name' => $name, 'managers' => $b['managers'] ?? []]);
            return ['id' => $r['id']];
        });
    });

    anbar_route('PUT', '/warehouses/(?P<id>\d+)', function ($c) {
        anbar_require_admin($c['user']);
        $b = $c['body'];
        $w = anbar_get('SELECT * FROM {warehouses} WHERE id = ?', (int) $c['params']['id']);
        if (!$w) {
            throw anbar_not_found('انبار پیدا نشد.');
        }
        $name = anbar_required($b['name'] ?? '', 'نام انبار', 100);
        if (anbar_get('SELECT id FROM {warehouses} WHERE name = ? AND id <> ?', $name, (int) $w['id'])) {
            throw anbar_bad('انباری با این نام وجود دارد.');
        }
        return anbar_tx(function () use ($b, $w, $name, $c) {
            anbar_run('UPDATE {warehouses} SET name = ?, description = ?, tracks_expiry = ?, archived = ? WHERE id = ?',
                $name, anbar_str($b['description'] ?? '', 500), empty($b['tracks_expiry']) ? 0 : 1, empty($b['archived']) ? 0 : 1, (int) $w['id']);
            anbar_run('DELETE FROM {warehouse_managers} WHERE warehouse_id = ?', (int) $w['id']);
            foreach (array_unique(array_map('intval', (array) ($b['managers'] ?? []))) as $m) {
                anbar_run('INSERT INTO {warehouse_managers} (warehouse_id, user_id) VALUES (?, ?)', (int) $w['id'], $m);
            }
            anbar_audit($c['user']['id'], 'warehouse_update', 'warehouse', (int) $w['id'], ['name' => $name, 'archived' => !empty($b['archived']), 'managers' => $b['managers'] ?? []]);
            return ['ok' => true];
        });
    });

    anbar_route('GET', '/audit', function ($c) {
        anbar_require_admin($c['user']);
        $e = (string) ($c['query']['entity'] ?? '');
        $id = (int) ($c['query']['entity_id'] ?? 0);
        return anbar_all("SELECT a.*, u.display_name AS actor FROM {audit} a LEFT JOIN {users} u ON u.ID = a.user_id
            WHERE (? = '' OR a.entity = ?) AND (? = 0 OR a.entity_id = ?) ORDER BY a.id DESC LIMIT 300", $e, $e, $id, $id);
    });

    /* ------------------------------------------------------------ files, backups, reports */

    anbar_route('GET', '/file/(?P<name>[a-f0-9]{24}\.(?:jpg|png|webp))', function ($c) {
        $path = anbar_private_dir('images') . '/' . $c['params']['name'];
        if (!is_file($path)) {
            throw anbar_not_found();
        }
        $type = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($path, PATHINFO_EXTENSION)];
        header('Content-Type: ' . $type);
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=31536000, immutable');
        header('X-Content-Type-Options: nosniff');
        readfile($path);
        exit;
    });

    anbar_route('GET', '/backups', function ($c) {
        anbar_require_admin($c['user']);
        $files = glob(anbar_private_dir('backups') . '/anbar-*.json.gz') ?: [];
        rsort($files);
        return array_map(function ($f) {
            return ['name' => basename($f), 'size' => filesize($f), 'created_at' => gmdate('c', filemtime($f)),
                'url' => anbar_rest_url('backups/' . basename($f))];
        }, $files);
    });
    anbar_route('POST', '/backups', function ($c) {
        anbar_require_admin($c['user']);
        $name = anbar_backup_now();
        anbar_audit($c['user']['id'], 'backup', null, null, ['name' => $name]);
        return ['name' => $name];
    });
    anbar_route('GET', '/backups/(?P<name>anbar-[\d-]+\.json\.gz)', function ($c) {
        anbar_require_admin($c['user']);
        $path = anbar_private_dir('backups') . '/' . $c['params']['name'];
        if (!is_file($path)) {
            throw anbar_not_found();
        }
        anbar_send_file(file_get_contents($path), 'application/gzip', $c['params']['name']);
    });

    anbar_route('GET', '/reports/(?P<kind>\w+)', function ($c) {
        $reports = anbar_reports();
        $rep = $reports[$c['params']['kind']] ?? null;
        if (!$rep) {
            throw anbar_not_found('گزارش پیدا نشد.');
        }
        $q = ['wh' => (int) ($c['query']['warehouse'] ?? 0), 'from' => anbar_date($c['query']['from'] ?? null, 'از تاریخ'),
            'to' => anbar_date($c['query']['to'] ?? null, 'تا تاریخ')];
        $rows = $rep['rows']($q);
        if (($c['query']['format'] ?? '') === 'xlsx') {
            anbar_send_file(anbar_build_xlsx($rep['title'], $rep['headers'], $rows),
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $c['params']['kind'] . '-' . anbar_today() . '.xlsx');
        }
        return ['title' => $rep['title'], 'headers' => $rep['headers'], 'rows' => $rows, 'xlsx' => anbar_rest_url('reports/' . $c['params']['kind'])];
    });
}

/* ================================================================ helpers used by the routes */

function anbar_like($s)
{
    global $wpdb;
    return $wpdb->esc_like((string) $s);
}

function anbar_unread($user_id)
{
    return (int) anbar_var('SELECT COUNT(*) FROM {notifications} WHERE user_id = ? AND is_read = 0', (int) $user_id);
}

function anbar_warehouse_list($include_archived)
{
    $rows = anbar_all("SELECT w.*,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0) AS item_count,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.qty <= 0) AS out_count,
        (SELECT COUNT(*) FROM {items} i WHERE i.warehouse_id = w.id AND i.archived = 0 AND i.min_qty > 0 AND i.qty > 0 AND i.qty <= i.min_qty) AS low_count,
        (SELECT COUNT(*) FROM {loans} l WHERE l.warehouse_id = w.id AND l.status = 'open') AS loan_count,
        (SELECT COUNT(*) FROM {transfers} t WHERE t.to_wh = w.id AND t.status = 'pending') AS incoming_count
      FROM {warehouses} w " . ($include_archived ? '' : 'WHERE w.archived = 0') . ' ORDER BY w.sort, w.id');
    $mgr = anbar_all('SELECT m.warehouse_id, u.ID AS id, u.display_name AS full_name FROM {warehouse_managers} m JOIN {users} u ON u.ID = m.user_id');
    foreach ($rows as &$w) {
        $w['managers'] = [];
        foreach ($mgr as $m) {
            if ($m['warehouse_id'] === $w['id'] && anbar_is_active($m['id'])) {
                $w['managers'][] = ['id' => (int) $m['id'], 'full_name' => $m['full_name']];
            }
        }
    }
    return $rows;
}

function anbar_decorate_item($i, $user)
{
    $i['can_edit'] = anbar_can_edit($user, $i['warehouse_id']);
    $i['image_url'] = $i['image'] ? anbar_rest_url('file/' . $i['image']) : null;
    return $i;
}

function anbar_save_image($data_url)
{
    if (!preg_match('/^data:image\/(jpeg|png|webp);base64,(.+)$/s', (string) $data_url, $m)) {
        throw anbar_bad('فرمت تصویر پشتیبانی نمی‌شود.');
    }
    $buf = base64_decode($m[2], true);
    if ($buf === false || strlen($buf) > 3 * 1024 * 1024) {
        throw anbar_bad('حجم تصویر بیشتر از ۳ مگابایت است.');
    }
    if (function_exists('getimagesizefromstring') && !@getimagesizefromstring($buf)) {
        throw anbar_bad('فایل انتخاب‌شده تصویر نیست.');
    }
    $name = bin2hex(random_bytes(12)) . '.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]);
    file_put_contents(anbar_private_dir('images') . '/' . $name, $buf);
    return $name;
}

function anbar_item_fields($b)
{
    $condition = $b['condition'] ?? 'ok';
    if (!isset(ANBAR_CONDITIONS[$condition])) {
        throw anbar_bad('وضعیت نامعتبر است.');
    }
    return [
        'name' => anbar_required($b['name'] ?? '', 'نام کالا', 150),
        'code' => anbar_required(anbar_to_latin($b['code'] ?? ''), 'کد کالا', 50),
        'category' => anbar_str($b['category'] ?? '', 80),
        'location' => anbar_str($b['location'] ?? '', 150),
        'unit' => anbar_required($b['unit'] ?? '', 'واحد', 30),
        'min_qty' => anbar_qty(($b['min_qty'] ?? '') === '' ? 0 : $b['min_qty'], 'حداقل موجودی', true),
        'condition' => $condition,
        'brand' => anbar_str($b['brand'] ?? '', 80),
        'model' => anbar_str($b['model'] ?? '', 80),
        'serial' => anbar_str(anbar_to_latin($b['serial'] ?? ''), 120),
        'notes' => anbar_str($b['notes'] ?? '', 2000),
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

function anbar_op_input($b)
{
    return [
        'qty' => anbar_qty($b['qty'] ?? ''),
        'reason' => (string) ($b['reason'] ?? ''),
        'op_date' => anbar_date($b['op_date'] ?? null) ?: anbar_today(),
        'party' => anbar_str($b['party'] ?? '', 150),
        'note' => anbar_str($b['note'] ?? '', 1000),
        'batch_no' => anbar_str(anbar_to_latin($b['batch_no'] ?? ''), 60),
        'expiry' => anbar_date($b['expiry'] ?? null, 'تاریخ انقضا'),
        'batch_id' => !empty($b['batch_id']) ? (int) $b['batch_id'] : null,
        'request_id' => !empty($b['request_id']) ? (int) $b['request_id'] : null,
    ];
}

function anbar_tx_query($f = [])
{
    $where = ['1 = 1'];
    $p = [];
    foreach (['item' => 't.item_id', 'warehouse' => 't.warehouse_id', 'user' => 't.user_id'] as $k => $col) {
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
        WHERE ' . implode(' AND ', $where) . " ORDER BY t.id DESC LIMIT {$limit}", ...$p);
}

function anbar_reports()
{
    $n = function ($v) {
        return $v === null ? '' : anbar_r3($v);
    };
    $reasons = anbar_reasons();
    return [
        'inventory' => [
            'title' => 'گزارش موجودی',
            'headers' => ['انبار', 'کد', 'نام کالا', 'دسته‌بندی', 'محل نگهداری', 'موجودی در انبار', 'در امانت', 'در حال انتقال', 'واحد', 'حداقل', 'وضعیت', 'برند', 'مدل', 'سریال', 'نزدیک‌ترین انقضا'],
            'rows' => function ($q) use ($n) {
                $rows = anbar_all("SELECT i.*, w.name AS warehouse,
                    (SELECT MIN(b.expiry) FROM {batches} b WHERE b.item_id = i.id AND b.qty > 0) AS next_expiry,
                    (SELECT COALESCE(SUM(t.qty), 0) FROM {transfers} t WHERE t.item_id = i.id AND t.status = 'pending') AS transit
                  FROM {items} i JOIN {warehouses} w ON w.id = i.warehouse_id
                  WHERE i.archived = 0 AND (? = 0 OR i.warehouse_id = ?) ORDER BY w.sort, i.name", $q['wh'], $q['wh']);
                return array_map(function ($i) use ($n) {
                    return [$i['warehouse'], $i['code'], $i['name'], $i['category'], $i['location'], $n($i['qty']), $n($i['loaned_qty']),
                        $n($i['transit']), $i['unit'], $n($i['min_qty']), ANBAR_CONDITIONS[$i['condition']] ?? '', $i['brand'], $i['model'],
                        $i['serial'], anbar_jalali($i['next_expiry'])];
                }, $rows);
            },
        ],
        'transactions' => [
            'title' => 'گزارش ورود و خروج',
            'headers' => ['شماره رسید', 'تاریخ', 'انبار', 'کد', 'کالا', 'نوع', 'علت', 'مقدار', 'واحد', 'موجودی پس از عملیات', 'طرف تحویل', 'ثبت‌کننده', 'توضیحات'],
            'rows' => function ($q) use ($n, $reasons) {
                $rows = array_reverse(anbar_tx_query(['warehouse' => $q['wh'], 'from' => $q['from'], 'to' => $q['to'], 'limit' => 5000]));
                return array_map(function ($t) use ($n, $reasons) {
                    return [(int) $t['id'], anbar_jalali($t['op_date']), $t['warehouse'], $t['code'], $t['item_name'],
                        ['in' => 'ورود', 'out' => 'خروج', 'adj' => 'اصلاح'][$t['direction']], $reasons[$t['reason']][1] ?? $t['reason'],
                        $n($t['delta']), $t['unit'], $n($t['qty_after']), $t['party'], $t['recorder'], $t['note']];
                }, $rows);
            },
        ],
        'loans' => [
            'title' => 'گزارش امانت‌ها',
            'headers' => ['انبار', 'کالا', 'تحویل‌گیرنده', 'برنامه', 'مقدار', 'برگشت‌داده', 'باقی‌مانده', 'واحد', 'تاریخ تحویل', 'موعد بازگشت', 'وضعیت', 'ثبت‌کننده'],
            'rows' => function ($q) use ($n) {
                $rows = anbar_all('SELECT l.*, i.name AS item_name, i.unit, w.name AS warehouse, u.display_name AS recorder FROM {loans} l
                    JOIN {items} i ON i.id = l.item_id JOIN {warehouses} w ON w.id = l.warehouse_id JOIN {users} u ON u.ID = l.user_id
                    WHERE (? = 0 OR l.warehouse_id = ?) AND (? IS NULL OR DATE(l.created_at) >= ?) AND (? IS NULL OR DATE(l.created_at) <= ?)
                    ORDER BY l.created_at', $q['wh'], $q['wh'], $q['from'], $q['from'], $q['to'], $q['to']);
                $t = anbar_today();
                return array_map(function ($l) use ($n, $t) {
                    $status = $l['status'] === 'closed' ? 'بسته' : ($l['due_date'] && $l['due_date'] < $t ? 'دارای تأخیر' : 'باز');
                    return [$l['warehouse'], $l['item_name'], $l['borrower'], $l['program'], $n($l['qty']), $n($l['returned_qty']),
                        $n($l['qty'] - $l['returned_qty']), $l['unit'], anbar_jalali($l['created_at']), anbar_jalali($l['due_date']), $status, $l['recorder']];
                }, $rows);
            },
        ],
        'transfers' => [
            'title' => 'گزارش انتقال‌ها',
            'headers' => ['شماره', 'تاریخ ارسال', 'کالا', 'مقدار', 'واحد', 'از انبار', 'به انبار', 'وضعیت', 'ارسال‌کننده', 'بررسی‌کننده', 'تاریخ بررسی', 'توضیحات'],
            'rows' => function ($q) use ($n) {
                $rows = anbar_all('SELECT t.*, i.name AS item_name, i.unit, fw.name AS from_name, tw.name AS to_name, su.display_name AS sender,
                      hu.display_name AS handler FROM {transfers} t JOIN {items} i ON i.id = t.item_id JOIN {warehouses} fw ON fw.id = t.from_wh
                    JOIN {warehouses} tw ON tw.id = t.to_wh JOIN {users} su ON su.ID = t.sent_by LEFT JOIN {users} hu ON hu.ID = t.handled_by
                    WHERE (? = 0 OR t.from_wh = ? OR t.to_wh = ?) AND (? IS NULL OR DATE(t.sent_at) >= ?) AND (? IS NULL OR DATE(t.sent_at) <= ?)
                    ORDER BY t.sent_at', $q['wh'], $q['wh'], $q['wh'], $q['from'], $q['from'], $q['to'], $q['to']);
                $labels = ['pending' => 'در حال انتقال', 'received' => 'دریافت شد', 'rejected' => 'رد شد', 'cancelled' => 'لغو شد'];
                return array_map(function ($t) use ($n, $labels) {
                    return [(int) $t['id'], anbar_jalali($t['sent_at']), $t['item_name'], $n($t['qty']), $t['unit'], $t['from_name'], $t['to_name'],
                        $labels[$t['status']] ?? $t['status'], $t['sender'], $t['handler'], anbar_jalali($t['handled_at']),
                        implode(' / ', array_filter([$t['note'], $t['handle_note']]))];
                }, $rows);
            },
        ],
    ];
}
