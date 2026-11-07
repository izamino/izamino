<?php
/* مدیریت سامانه: متصدیان، نام کاربری و رمز (فقط فناوری اطلاعات)، تحویل جایگاه، دسترسی‌ها، تنظیمات */
if (!defined('KT')) exit;
$OPS = &$GLOBALS['OPS'];
const USERNAME_RE = '/^[a-z0-9._-]{3,32}$/i';

function nameParts($v) {
  $first = str($v->first ?? '', 60); $last = str($v->last ?? '', 80);
  need($first !== '' && $last !== '', 'نام و نام خانوادگی را بنویسید.');
  need(!preg_match(LABEL_BAD, $first . $last), 'نام نباید شامل نویسه‌های < > " \' ` & باشد.');
  $phone = cleanPhone($v->phone ?? ''); if ($phone !== '') need(phoneOk($phone), 'شماره تماس معتبر نیست.');
  return [$first, $last, $phone, str($v->title ?? '', 80)];
}
function endUserSessions($uid, $except = '', $reason = 'پایان نشست توسط مدیر سامانه') {
  $st = KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE uid = ? AND active = 1 AND id <> ?", [stamp(), $reason, $uid, $except]);
  return $st->rowCount();
}
function curHist($posId) { $h = null; foreach (D()->posHistory as $x) if ($x->posId === $posId && empty($x->to)) $h = $x; return $h; }

/* مشخصات متصدی: خود متصدی (نام خودش را تعیین می‌کند) یا فناوری اطلاعات */
function applyHolder($u, $v, $self) {
  [$first, $last, $phone, $title] = nameParts($v);
  $before = $u->name . ' · ' . ($u->phone ?: '—');
  $u->first = $first; $u->last = $last; $u->name = $first . ' ' . $last; $u->phone = $phone; $u->title = $title; $u->named = true;
  if (!empty($v->start)) $u->start = needDate($v->start, 'تاریخ شروع مسئولیت');
  $h = curHist($u->posId); if ($h && $h->userId === $u->id) { $h->name = $u->name; $h->phone = $phone; if (!empty($u->start) && empty($h->from)) $h->from = $u->start; }
  audit($self ? 'ثبت مشخصات توسط متصدی' : 'ویرایش مشخصات متصدی', 'user', $u->id, posLabel($u->posId) . ': ' . $before . ' ← ' . $u->name . ' · ' . ($phone ?: '—'));
  return $u;
}
$OPS['updateOwnHolder'] = function ($v) { return applyHolder(meUser(), obj($v), true); };
$OPS['updateHolder'] = function ($id, $v) {
  $u = rec('users', $id);
  if ($u->id === meUser()->id) return applyHolder($u, obj($v), true);
  need(can('admin.users'), 'ویرایش مشخصات متصدی برای جایگاه شما مجاز نیست.');
  return applyHolder($u, obj($v), false);
};
$OPS['setUsername'] = function ($id, $username) {
  need(can('admin.users'), 'تغییر نام کاربری فقط با مدیر فناوری اطلاعات است.');
  $u = rec('users', $id); $n = strtolower(en(str($username, 40)));
  need(preg_match(USERNAME_RE, $n), 'نام کاربری باید ۳ تا ۳۲ نویسه انگلیسی، عدد، نقطه یا خط تیره باشد.');
  foreach (D()->users as $x) need($x->id === $u->id || $x->username !== $n || !empty($x->deleted), 'این نام کاربری قبلاً استفاده شده است.');
  $old = $u->username; if ($old === $n) return $u;
  $u->username = $n; audit('تغییر نام کاربری', 'user', $u->id, $old . ' ← ' . $n);
  notify([$u->posId], 'decision', 'نام کاربری حساب شما توسط مدیریت فناوری اطلاعات به «' . $n . '» تغییر کرد.', 'profile');
  if (($p = posById($u->posId)) && $p->role === 'imam' && !isImam()) notify([imamPos()], 'decision', 'نام کاربری حساب امام جماعت تغییر کرد.', 'profile');
  return $u;
};
$OPS['setPassword'] = function ($id, $pass) {
  need(can('admin.passwords'), 'تعیین رمز عبور فقط با مدیر فناوری اطلاعات است.');
  $u = rec('users', $id); $pass = en((string)$pass);
  $min = (int)(D()->settings->security->minLen ?? 6);
  need(mb_strlen($pass) >= $min, 'رمز عبور باید دست‌کم ' . fa($min) . ' نویسه باشد.');
  need(mb_strlen($pass) <= 128, 'رمز عبور بیش از حد طولانی است.');
  $u->pass = password_hash($pass, PASSWORD_DEFAULT); $u->passChanged = stamp(); $u->fails = 0; $u->lockedUntil = '';
  $n = endUserSessions($u->id, ME()['sid'] ?? '', 'تغییر رمز توسط مدیر سامانه');
  audit('تعیین رمز توسط مدیر سامانه', 'user', $u->id, $u->username . ' · ' . fa($n) . ' نشست بسته شد');
  if (($p = posById($u->posId)) && $p->role === 'imam' && !isImam()) notify([imamPos()], 'decision', 'رمز عبور حساب امام جماعت توسط مدیریت فناوری اطلاعات تغییر کرد.', 'profile');
  return ['ok' => 1, 'ended' => $n];
};
$OPS['createAccount'] = function ($posId, $username, $pass) {
  need(can('admin.users') && can('admin.passwords'), 'ایجاد حساب فقط با مدیر فناوری اطلاعات است.');
  $p = posById($posId); need($p, 'جایگاه یافت نشد.'); need(!accountOf($posId), 'این جایگاه حساب دارد.');
  $n = strtolower(en(str($username, 40))); need(preg_match(USERNAME_RE, $n), 'نام کاربری معتبر نیست.');
  foreach (D()->users as $x) need($x->username !== $n || !empty($x->deleted), 'این نام کاربری قبلاً استفاده شده است.');
  $min = (int)(D()->settings->security->minLen ?? 6); need(mb_strlen(en($pass)) >= $min, 'رمز عبور باید دست‌کم ' . fa($min) . ' نویسه باشد.');
  $u = (object)['id' => 'u' . uid(), 'username' => $n, 'posId' => $posId, 'first' => '', 'last' => '', 'name' => 'متصدی ثبت‌نشده', 'phone' => '', 'active' => true, 'named' => false,
    'pass' => password_hash(en($pass), PASSWORD_DEFAULT), 'created' => stamp(), 'start' => todayISO()];
  D()->users[] = $u;
  D()->posHistory[] = (object)['posId' => $posId, 'userId' => $u->id, 'name' => $u->name, 'phone' => '', 'from' => todayISO(), 'to' => '', 'by' => actorName(), 'note' => 'ایجاد حساب'];
  audit('ایجاد حساب جایگاه', 'user', $u->id, panelName($p) . ' · ' . $n); return $u;
};
/* تحویل رسمی مسئولیت: حساب و پنل جایگاه ثابت؛ سابقه متصدی قبلی بسته و متصدی جدید ثبت می‌شود */
$OPS['handover'] = function ($posId, $v) {
  $v = obj($v); need(can('admin.users') || isImam(), 'تحویل جایگاه با امام جماعت یا مدیر فناوری اطلاعات است.');
  $p = posById($posId); need($p, 'جایگاه یافت نشد.');
  need($posId !== mePos()->id, 'تحویل جایگاه خودتان با امام جماعت انجام می‌شود.');
  if ($p->role === 'imam') need(isImam(), 'تحویل جایگاه امام جماعت فقط از پنل امام جماعت ممکن است.');
  [$first, $last, $phone, $title] = nameParts($v);
  $start = ($v->start ?? '') ? needDate($v->start, 'تاریخ شروع مسئولیت') : todayISO();
  $acc = accountOf($posId); need($acc, 'این جایگاه حساب ندارد؛ ابتدا حساب آن را ایجاد کنید.');
  $prev = $acc->name;
  $h = curHist($posId);
  if ($h) { need($start >= ($h->from ?: '0000'), 'تاریخ شروع متصدی جدید نمی‌تواند پیش از شروع متصدی فعلی باشد.'); $h->to = $start; $h->name = $h->name ?: $prev; $h->handedTo = $first . ' ' . $last; $h->closeNote = str($v->note ?? '', 1000); }
  $acc->first = $first; $acc->last = $last; $acc->name = $first . ' ' . $last; $acc->phone = $phone; $acc->title = $title; $acc->start = $start; $acc->named = true; $acc->active = true; $acc->fails = 0; $acc->lockedUntil = '';
  if (!empty($v->pass)) { $min = (int)(D()->settings->security->minLen ?? 6); need(mb_strlen(en($v->pass)) >= $min, 'رمز جدید باید دست‌کم ' . fa($min) . ' نویسه باشد.'); $acc->pass = password_hash(en($v->pass), PASSWORD_DEFAULT); $acc->passChanged = stamp(); }
  D()->posHistory[] = (object)['posId' => $posId, 'userId' => $acc->id, 'name' => $acc->name, 'phone' => $phone, 'title' => $title, 'from' => $start, 'to' => '', 'by' => actorName(), 'note' => str($v->note ?? '', 1000), 'prev' => $prev];
  $n = endUserSessions($acc->id, '', 'تحویل جایگاه به متصدی جدید');
  audit('تحویل مسئولیت جایگاه', 'position', $posId, posLabel($posId) . ': ' . $prev . ' ← ' . $acc->name . ' از ' . jd($start) . (!empty($v->pass) ? ' · رمز جدید' : ''));
  return ['ok' => 1, 'ended' => $n];
};
$OPS['toggleUser'] = function ($id) {
  need(can('admin.users'), 'مدیریت حساب‌ها مجاز نیست.'); $u = rec('users', $id);
  need($u->id !== meUser()->id, 'حساب خودتان را نمی‌توانید غیرفعال کنید.');
  if (($p = posById($u->posId)) && isSensitivePos($p)) need(isImam(), 'غیرفعال‌کردن حساب حساس فقط با امام جماعت است.');
  $u->active = empty($u->active); if (!$u->active) endUserSessions($u->id, '', 'غیرفعال‌شدن حساب');
  audit($u->active ? 'فعال‌سازی حساب' : 'غیرفعال‌سازی حساب', 'user', $u->id, $u->username); return $u;
};
$OPS['unlockUser'] = function ($id) { need(can('admin.users'), 'مدیریت حساب‌ها مجاز نیست.'); $u = rec('users', $id); $u->lockedUntil = ''; $u->fails = 0; audit('بازکردن قفل حساب', 'user', $u->id, $u->username); return $u; };
$OPS['kickUser'] = function ($id) { need(can('admin.users') || can('admin.logs'), 'پایان نشست کاربران مجاز نیست.'); $u = rec('users', $id); need($u->id !== meUser()->id, 'برای خروج از «خروج» استفاده کنید.'); $n = endUserSessions($u->id); audit('خروج اجباری کاربر', 'session', $u->id, $u->username . ' · ' . fa($n) . ' نشست'); return ['n' => $n]; };
$OPS['endSession'] = function ($sid) { need(can('admin.users') || can('admin.logs'), 'پایان نشست مجاز نیست.'); $n = KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE id = ? AND active = 1", [stamp(), 'پایان نشست توسط مدیر سامانه', (string)$sid])->rowCount(); need($n, 'نشست فعالی با این شناسه یافت نشد.'); audit('پایان نشست', 'session', $sid, ''); return ['n' => $n]; };
$OPS['kickAll'] = function () { need(can('admin.users'), 'مدیریت حساب‌ها مجاز نیست.'); $n = KDB::q("UPDATE " . KDB::t('sessions') . " SET active = 0, endts = ?, reason = ? WHERE active = 1 AND uid <> ?", [stamp(), 'خروج همه کاربران توسط مدیر سامانه', meUser()->id])->rowCount(); audit('خروج همه کاربران', 'session', '', fa($n) . ' نشست'); return ['n' => $n]; };

/* ---------- سطح دسترسی ---------- */
$OPS['setPosPerm'] = function ($posId, $k, $val) {
  need(can('admin.perms') || isImam(), 'تعیین دسترسی مجاز نیست.');
  $p = posById($posId); need($p, 'جایگاه یافت نشد.'); need(permDef($k) && in_array($val, ['', 'allow', 'deny'], true), 'مجوز نامعتبر است.');
  need($p->id !== mePos()->id, 'تغییر دسترسی جایگاه خودتان مجاز نیست؛ این کار با امام جماعت است.');
  need($p->role !== 'imam', 'دسترسی امام جماعت قابل تغییر نیست.');
  if (!empty(permDef($k)['s']) && $val === 'allow') need(isImam(), '«' . permLabel($k) . '» مجوز حساس است و اعطای آن فقط با امام جماعت است.');
  if (!isset($p->perms) || !is_object($p->perms)) $p->perms = new stdClass();
  if ($val === '') unset($p->perms->$k); else $p->perms->$k = $val;
  audit($val === 'allow' ? 'اعطای دسترسی' : ($val === 'deny' ? 'سلب دسترسی' : 'بازگشت دسترسی به پیش‌فرض'), 'perm', $p->id, posLabel($p->id) . ' · ' . permLabel($k));
  notify([$p->id], 'decision', 'دسترسی «' . permLabel($k) . '» برای جایگاه شما ' . ($val === 'allow' ? 'اعطا' : ($val === 'deny' ? 'سلب' : 'به حالت پیش‌فرض بازگردانده')) . ' شد.', 'profile');
  return $p;
};
$OPS['setRolePerm'] = function ($role, $k, $val) {
  need(can('admin.perms') || isImam(), 'تعیین دسترسی مجاز نیست.');
  need(in_array($role, ['manager', 'office', 'secretary']), 'نقش نامعتبر است.'); need(permDef($k) && in_array($val, ['', 'allow', 'deny'], true), 'مجوز نامعتبر است.');
  if (!empty(permDef($k)['s']) && $val === 'allow') need(isImam(), 'اعطای مجوز حساس به یک نقش فقط با امام جماعت است.');
  need(isImam() || $role !== myRole(), 'تغییر دسترسی نقش خودتان مجاز نیست.');
  $rp = D()->settings->rolePerms ?? new stdClass(); if (!isset($rp->$role)) $rp->$role = new stdClass();
  if ($val === '') unset($rp->$role->$k); else $rp->$role->$k = $val;
  D()->settings->rolePerms = $rp;
  audit('تغییر دسترسی نقش', 'perm', $role, ORG('ROLES')[$role] . ' · ' . permLabel($k) . ' · ' . ($val ?: 'پیش‌فرض')); return ['ok' => 1];
};
/* مدیر هر بخش: تعیین اختیار مسئول دفتر و منشی خودش (دادن یا گرفتن)، فقط تا سقف اختیار خودش */
function canManageOfficeOf($p) { return isImam() || can('admin.perms') || (myRole() === 'manager' && inUnit($p->unitId)); }
$OPS['setOfficePerm'] = function ($posId, $k, $val) {
  $p = posById($posId); need($p && in_array($p->role, ['office', 'secretary']), 'فقط دسترسی مسئول دفتر و منشی از این بخش تنظیم می‌شود.');
  need(canManageOfficeOf($p), 'فقط مدیر همان مدیریت می‌تواند دسترسی دفتر خودش را تعیین کند.');
  $P = permDef($k); need($P && !empty($P['d']), 'این مجوز از سوی مدیر بخش قابل واگذاری نیست.');
  need(in_array($val, ['', 'allow', 'deny'], true), 'مقدار نامعتبر است.');
  $mgr = unitPos($p->unitId, 'manager');
  if ($val === 'allow') need($mgr && permOf($mgr, $k), '«' . permLabel($k) . '» در سقف اختیار مدیر این بخش نیست و قابل واگذاری نیست.');
  if ($val === 'allow' && !empty($P['p'])) need(permOf($p, $P['p']) || (($p->mgr->{$P['p']} ?? '') === 'allow'), 'ابتدا مجوز پایه «' . permLabel($P['p']) . '» را فعال کنید.');
  if (!isset($p->mgr) || !is_object($p->mgr)) $p->mgr = new stdClass();
  $was = $p->mgr->$k ?? '';
  if ($val === '') unset($p->mgr->$k); else $p->mgr->$k = $val;
  if ($val === 'deny') foreach (ORG('PERMS') as $c) if (($c['p'] ?? '') === $k && isset($p->mgr->{$c['k']}) && $p->mgr->{$c['k']} === 'allow') unset($p->mgr->{$c['k']});
  if ($was !== $val) {
    audit('تعیین دسترسی دفتر توسط مدیر', 'perm', $p->id, posLabel($p->id) . ' · ' . permLabel($k) . ' · ' . ($val === 'allow' ? 'مجاز' : ($val === 'deny' ? 'غیرمجاز' : 'پیش‌فرض')));
    notify([$p->id], 'decision', 'مدیر بخش دسترسی «' . permLabel($k) . '» را برای جایگاه شما ' . ($val === 'allow' ? 'فعال' : ($val === 'deny' ? 'محدود' : 'به پیش‌فرض بازگردانده')) . ' کرد.', 'profile');
  }
  return $p;
};
$OPS['setToolLevel'] = function ($posId, $key, $level) {
  $p = posById($posId); need($p && in_array($p->role, ['office', 'secretary']), 'سطح ابزار فقط برای مسئول دفتر و منشی تعیین می‌شود.');
  need(canManageOfficeOf($p), 'فقط مدیر همان مدیریت می‌تواند این تنظیم را انجام دهد.');
  $t = toolDef($p->unitId, $key); need($t, 'ابزار یافت نشد.'); need(isset(TOOL_LEVELS[$level]), 'سطح نامعتبر است.');
  if (!isset($p->tools) || !is_object($p->tools)) $p->tools = new stdClass();
  $p->tools->$key = $level;
  $L = ['none' => 'بدون دسترسی', 'view' => 'فقط مشاهده', 'own' => 'کارهای خود و ارجاع‌شده', 'all' => 'همه کارهای مدیریت'];
  audit('تعیین سطح ابزار', 'perm', $p->id, posLabel($p->id) . ' · ' . $t['t'] . ' · ' . $L[$level]);
  notify([$p->id], 'decision', 'سطح دسترسی شما به «' . $t['t'] . '»: ' . $L[$level], 'unit-' . $p->unitId);
  return $p;
};

/* ---------- تنظیمات ---------- */
$OPS['saveSettings'] = function ($section, $v) {
  need(can('admin.settings'), 'تغییر تنظیمات برای جایگاه شما مجاز نیست.');
  $v = obj($v); $s = D()->settings;
  $n = function ($x, $min, $max, $lb) { $q = num($x); need(is_numeric($q) && !is_nan($q) && $q >= $min && $q <= $max, $lb . ' باید بین ' . fa($min) . ' و ' . fa($max) . ' باشد.'); return $q; };
  switch ($section) {
    case 'site':
      $s->orgName = label($v->orgName ?? '', 'نام مجموعه'); $s->subtitle = str($v->subtitle ?? '', 200); $s->loginTitle = str($v->loginTitle ?? '', 200); $s->loginText = str($v->loginText ?? '', 1000);
      $s->payThreshold = $n($v->payThreshold ?? 0, 1, 1e15, 'سقف پرداخت'); break;
    case 'announcement': $s->announcement = (object)['on' => !empty($v->on), 'tone' => in_array($v->tone ?? '', ['info', 'warn', 'ok']) ? $v->tone : 'info', 'text' => str($v->text ?? '', 1000)]; break;
    case 'theme':
      if (!empty($v->palette)) { need(in_array($v->palette, ['zomorrod', 'firouzeh', 'lajvard', 'kahroba', 'anar']), 'رنگ‌بندی نامعتبر است.'); $s->theme->palette = $v->palette; }
      if (!empty($v->scale)) $s->theme->scale = $n($v->scale, 12, 18, 'اندازه متن'); break;
    case 'clock': $s->clock = (object)['city' => str($v->city ?? '', 60) ?: 'آبادان', 'lat' => $n($v->lat ?? 0, -89, 89, 'عرض جغرافیایی'), 'lng' => $n($v->lng ?? 0, -179, 179, 'طول جغرافیایی'), 'prayer' => !empty($v->prayer)]; break;
    case 'security':
      $s->security = (object)['minLen' => (int)$n($v->minLen ?? 6, 4, 64, 'حداقل طول رمز'), 'maxFails' => (int)$n($v->maxFails ?? 5, 3, 20, 'تعداد تلاش'), 'lockMin' => (int)$n($v->lockMin ?? 15, 1, 1440, 'مدت قفل'), 'sessionMin' => (int)$n($v->sessionMin ?? 120, 10, 1440, 'مهلت بی‌فعالیتی')];
      $s->maintenance = !empty($v->maintenance); break;
    case 'maintenance': $s->maintenance = !empty($v->on); break;
    case 'sms':
      $sm = $s->sms ?? (object)['events' => new stdClass(), 'roles' => []];
      $sm->enabled = !empty($v->enabled); $sm->provider = in_array($v->provider ?? '', ['none', 'kavenegar', 'webhook']) ? $v->provider : 'none'; $sm->sender = str($v->sender ?? '', 30);
      if (!empty($v->apiKey)) $sm->apiKey = str($v->apiKey, 200);
      if (isset($v->webhook)) { $w = str($v->webhook, 500); need($w === '' || preg_match('#^https://#', $w), 'نشانی وب‌هوک باید با https شروع شود.'); $sm->webhook = $w; }
      $sm->events = new stdClass(); foreach (array_keys(SMS_EVENTS) as $k) $sm->events->$k = in_array($k, arr($v->events ?? []));
      $sm->roles = array_values(array_intersect(arr($v->roles ?? []), ['imam', 'manager', 'office', 'secretary'])); $s->sms = $sm; break;
    case 'lists': {
      $L = function ($t) { $o = []; foreach (preg_split('/\n/', str($t, 4000)) as $x) { $x = trim($x); if ($x !== '') $o[] = label($x, 'مورد فهرست'); } return $o; };
      $a = $L($v->letterCats ?? ''); $b = $L($v->leaveTypes ?? ''); need($a && $b, 'فهرست‌ها نباید خالی باشند.'); $s->letterCats = $a; $s->leaveTypes = $b; break;
    }
    case 'letterhead': {
      $lh = (object)['address' => str($v->address ?? '', 300), 'phone' => str($v->phone ?? '', 100), 'site' => str($v->site ?? '', 100), 'footer' => str($v->footer ?? '', 300), 'motto' => str($v->motto ?? '', 120),
        'mode' => in_array($v->mode ?? '', ['bw', 'image']) ? $v->mode : 'bw', 'image' => null];
      $f = files($v->image ?? []); if ($f) { $img = $f[0]; need(preg_match('#^image/(png|jpeg|webp)$#', $img->type), 'تصویر سربرگ باید PNG، JPG یا WEBP باشد.'); $lh->image = $img; }
      elseif (!empty($s->letterhead->image) && empty($v->dropImage)) $lh->image = $s->letterhead->image;
      if ($lh->mode === 'image' && !$lh->image) $lh->mode = 'bw';
      $s->letterhead = $lh; break;
    }
    default: need(false, 'بخش تنظیمات نامعتبر است.');
  }
  audit('تغییر تنظیمات: ' . $section, 'settings', $section, '');
  return ['ok' => 1];
};
$OPS['saveUnit'] = function ($id, $v) {
  need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.'); $v = obj($v); $s = D()->settings;
  $name = label($v->name ?? '', 'نام کامل مدیریت'); $short = label($v->short ?? '', 'نام کوتاه مدیریت', 60);
  $sv = []; foreach (preg_split('/\n/', str($v->services ?? '', 4000)) as $x) { $x = trim($x); if ($x !== '') $sv[] = label($x, 'نام خدمت'); }
  need($sv, 'دست‌کم یک خدمت لازم است.');
  $u = (int)$id;
  if (!$u) {
    $u = max(array_keys(units(true))) + 1;
    $s->extraUnits = array_merge(arr($s->extraUnits ?? []), [(object)['id' => $u, 'name' => $name, 'short' => $short, 'slug' => 'unit' . $u, 'ic' => 'building']]);
    foreach (['manager' => 'مدیر', 'office' => 'مسئول دفتر', 'secretary' => 'منشی'] as $r => $t) D()->positions[] = (object)['id' => 'P' . $u . '-' . $r[0], 'unitId' => $u, 'role' => $r, 'title' => $t];
  } else need(unitById($u), 'مدیریت یافت نشد.');
  if (!isset($s->units) || !is_object($s->units)) $s->units = new stdClass();
  $s->units->$u = (object)['name' => $name, 'short' => $short];
  if (!isset($s->services) || !is_object($s->services)) $s->services = new stdClass();
  $s->services->$u = $sv;
  audit($id ? 'ویرایش مدیریت' : 'افزودن مدیریت', 'settings', 'unit-' . $u, $name); return ['id' => $u];
};
$OPS['toggleUnit'] = function ($id) {
  need(can('admin.settings'), 'تغییر ساختار سازمانی مجاز نیست.'); need(unitById($id), 'مدیریت یافت نشد.');
  $off = arr(D()->settings->unitsOff ?? []); $i = array_search((int)$id, $off, true);
  if ($i !== false) array_splice($off, $i, 1); else $off[] = (int)$id;
  D()->settings->unitsOff = array_values($off); audit($i !== false ? 'فعال‌سازی مدیریت' : 'غیرفعال‌سازی مدیریت', 'settings', 'unit-' . $id, unitName($id)); return ['ok' => 1];
};
$OPS['saveSpace'] = function ($id, $v) {
  need(can('admin.settings'), 'تغییر فضاها مجاز نیست.'); $v = obj($v);
  $name = label($v->name ?? '', 'نام فضا'); need(unitExists($v->unit ?? 0), 'مدیریت تأییدکننده را انتخاب کنید.');
  $cap = num($v->cap ?? ''); need(is_int($cap) && $cap >= 1 && $cap <= 100000, 'ظرفیت باید عدد صحیح مثبت باشد.');
  $list = spaces();
  if ($id) { $f = false; foreach ($list as &$x) if ($x['id'] === $id) { $x = ['id' => $id, 'name' => $name, 'unit' => (int)$v->unit, 'cap' => $cap, 'excl' => !empty($v->excl)]; $f = true; } unset($x); need($f, 'فضا یافت نشد.'); }
  else $list[] = ['id' => 'sp' . substr(uid(), 0, 6), 'name' => $name, 'unit' => (int)$v->unit, 'cap' => $cap, 'excl' => !empty($v->excl)];
  D()->settings->spaces = json_decode(json_encode($list)); audit($id ? 'ویرایش فضا' : 'افزودن فضا', 'settings', 'spaces', $name); return ['ok' => 1];
};
$OPS['deleteSpace'] = function ($id) {
  need(can('admin.settings'), 'تغییر فضاها مجاز نیست.');
  foreach (D()->reservations as $r) need(!($r->space === $id && in_array($r->status, ['در انتظار تأیید', 'تأییدشده']) && $r->date >= todayISO()), 'این فضا رزرو پیش رو دارد؛ ابتدا رزروها را لغو کنید.');
  D()->settings->spaces = json_decode(json_encode(array_values(array_filter(spaces(), fn($s) => $s['id'] !== $id)))); audit('حذف فضا', 'settings', 'spaces', $id); return ['ok' => 1];
};
