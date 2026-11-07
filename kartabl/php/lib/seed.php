<?php
/* ساختار اولیه: جایگاه‌ها، تنظیمات پیش‌فرض، کدینگ حساب‌ها و دوره مالی سال جاری */
if (!defined('KT')) exit;

function defaultSettings($org) {
  return (object)[
    'orgName' => $org, 'subtitle' => 'مجتمع مسجدمحور', 'loginTitle' => 'کارتابل اداری',
    'loginText' => 'سامانه یکپارچه مکاتبات، دستورات، ارجاع وظایف، درخواست‌ها، رزروها، ابزارهای اختصاصی مدیریت‌ها، حسابداری و امور اداری زیر نظر امام جماعت.',
    'announcement' => (object)['on' => false, 'text' => '', 'tone' => 'info'], 'maintenance' => false,
    'theme' => (object)['palette' => 'zomorrod', 'scale' => 14], 'security' => (object)['minLen' => 6, 'maxFails' => 5, 'lockMin' => 15, 'sessionMin' => 120],
    'clock' => (object)['city' => 'آبادان', 'lat' => 30.3392, 'lng' => 48.3043, 'prayer' => true],
    'rolePerms' => new stdClass(), 'units' => new stdClass(), 'unitsOff' => [], 'extraUnits' => [], 'payThreshold' => 50000000,
    'sms' => (object)['enabled' => false, 'provider' => 'none', 'sender' => '', 'apiKey' => '', 'webhook' => '', 'events' => (object)['request' => true, 'letter' => true, 'order' => true, 'decision' => true], 'roles' => ['manager', 'office']],
    'letterhead' => (object)['mode' => 'bw', 'address' => 'آبادان', 'phone' => '', 'site' => '', 'footer' => '', 'motto' => '', 'image' => null],
    'backups' => [], 'cronKey' => bin2hex(random_bytes(16))
  ];
}
function basePositions() {
  $P = [(object)['id' => 'P0', 'unitId' => 0, 'role' => 'imam', 'title' => 'امام جماعت']];
  foreach (ORG('UNITS') as $u) foreach (['manager' => 'مدیر', 'office' => 'مسئول دفتر', 'secretary' => 'منشی'] as $r => $t) $P[] = (object)['id' => 'P' . $u['id'] . '-' . $r[0], 'unitId' => $u['id'], 'role' => $r, 'title' => $t];
  return $P;
}
function baseAccounts() { $o = []; foreach (ORG('CHART') as $c) $o[] = (object)['id' => $c[0], 'code' => $c[0], 'name' => $c[1], 'type' => $c[2], 'parent' => $c[3] ?? '', 'active' => true]; return $o; }
function fiscalPeriod($jy) { return (object)['id' => 'p' . $jy, 'title' => 'سال مالی ' . fa($jy), 'from' => jToIso($jy, 1, 1), 'to' => jToIso($jy, 12, jMonthLen($jy, 12)), 'status' => 'باز', 'created' => stamp()]; }
function baseDB($org) {
  $D = new stdClass();
  foreach (COLLECTIONS as $c) $D->$c = [];
  $D->settings = defaultSettings($org); $D->seq = new stdClass(); $D->flags = new stdClass();
  $D->positions = basePositions();
  $D->accounts = baseAccounts();
  $D->periods = [fiscalPeriod(jYearNow())];
  foreach (ORG('UNITS') as $u) $D->budgets[] = (object)['unitId' => $u['id'], 'year' => jYearNow(), 'amount' => 0];
  $D->warehouses = [(object)['id' => 'w1', 'name' => 'انبار مرکزی', 'unitId' => 1]];
  return $D;
}
/* ایجاد حساب جایگاه‌ها با نام کاربری و رمزی که مدیر هنگام نصب وارد کرده است */
function seedAccounts($D, $list) {
  $made = 0;
  foreach ($D->positions as $p) {
    $row = $list[$p->id] ?? null; if (!$row || $row['pass'] === '') continue;
    $u = (object)['id' => 'u' . uid(), 'username' => strtolower($row['username']), 'posId' => $p->id, 'first' => '', 'last' => '', 'name' => 'متصدی ثبت‌نشده', 'phone' => '', 'title' => '',
      'active' => true, 'named' => false, 'pass' => password_hash(en($row['pass']), PASSWORD_DEFAULT), 'created' => stamp(), 'start' => todayISO()];
    $D->users[] = $u;
    $D->posHistory[] = (object)['posId' => $p->id, 'userId' => $u->id, 'name' => $u->name, 'phone' => '', 'from' => todayISO(), 'to' => '', 'by' => 'نصب سامانه', 'note' => ''];
    $made++;
  }
  return $made;
}
function defaultUsername($p) {
  if ($p->role === 'imam') return 'imam';
  foreach (ORG('UNITS') as $u) if ($u['id'] === (int)$p->unitId) return $u['slug'] . '.' . $p->role;
  return 'unit' . $p->unitId . '.' . $p->role;
}
