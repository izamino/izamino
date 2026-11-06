<?php
/* ابزار خط فرمان (فقط روی سرور؛ از مرورگر در دسترس نیست)
   php cli.php reset-password <نام‌کاربری> <رمز جدید>   بازنشانی اضطراری رمز (مثلاً رمز مدیر فناوری اطلاعات)
   php cli.php backup                                    تهیه نسخه پشتیبان
   php cli.php cron                                      اجرای کارهای دوره‌ای (برای زمان‌بندی هاست)
   php cli.php verify-audit                              بررسی سلامت زنجیره رویدادها
   php cli.php demo <پوشه>                               ساخت نسخه آزمایشی با داده نمونه (رمز همه ۱۲۳۴) */
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
require __DIR__ . '/lib/boot.php';
$cmd = $argv[1] ?? '';
if ($cmd === 'demo' || $cmd === 'demo-mysql') {
  require __DIR__ . '/lib/demo.php';
  $dir = rtrim($argv[2] ?? (__DIR__ . '/data'), '/');
  @mkdir($dir . '/files', 0700, true); @mkdir($dir . '/backups', 0700, true);
  if ($cmd === 'demo') { @unlink($dir . '/kartabl.sqlite'); $db = ['driver' => 'sqlite', 'path' => $dir . '/kartabl.sqlite', 'prefix' => 'kt_']; }
  else {
    $db = ['driver' => 'mysql', 'host' => $argv[3] ?? 'localhost', 'port' => 3306, 'name' => $argv[4] ?? 'kartabl', 'user' => $argv[5] ?? '', 'pass' => $argv[6] ?? '', 'prefix' => 'kt_'];
    KDB::connect($db); foreach (['kv', 'meta', 'audit', 'sessions', 'logins', 'throttle', 'files', 'idem'] as $t) KDB::$pdo->exec('DROP TABLE IF EXISTS kt_' . $t);
  }
  file_put_contents(__DIR__ . '/config.php', "<?php\nreturn " . var_export(['db' => $db, 'dataDir' => $dir, 'maxUploadMB' => 20], true) . ";\n");
  kt_boot(); KDB::schema();
  buildDemo();
  echo "نسخه آزمایشی ساخته شد (رمز همه حساب‌ها 1234).\n"; exit;
}
if (!kt_boot()) { fwrite(STDERR, "سامانه نصب نشده است.\n"); exit(1); }
switch ($cmd) {
  case 'reset-password':
    [$u, $p] = [$argv[2] ?? '', $argv[3] ?? ''];
    if (strlen($p) < 6) { fwrite(STDERR, "رمز باید دست‌کم ۶ نویسه باشد.\n"); exit(1); }
    KDB::lock(); $ok = false;
    try { Store::load(); $x = null; foreach (D()->users as $y) if ($y->username === strtolower($u)) $x = $y;
      if (!$x) { fwrite(STDERR, "حساب یافت نشد.\n"); exit(1); }
      $x->pass = password_hash($p, PASSWORD_DEFAULT); $x->fails = 0; $x->lockedUntil = ''; $x->active = true;
      audit('بازنشانی رمز از خط فرمان سرور', 'user', $x->id, $x->username); Store::save(); flushAudit(); $ok = true; echo "رمز تغییر کرد.\n";
    } finally { KDB::unlock($ok); }
    break;
  case 'backup': KDB::lock(); $ok = false; try { Store::load(); $e = createBackup('manual', 'خط فرمان سرور'); Store::save(); $ok = true; echo $e->ok ? "ساخته شد: {$e->name}\n" : "ناموفق: {$e->error}\n"; } finally { KDB::unlock($ok); } break;
  case 'cron': $r = runMaintenance(true, 'cron'); echo "انجام شد.\n"; break;
  case 'verify-audit': $r = verifyAudit(); echo $r['ok'] ? "سالم: {$r['n']} رویداد\n" : "خدشه در رویداد شماره {$r['at']}\n"; exit($r['ok'] ? 0 : 2);
  default: echo "دستورها: reset-password، backup، cron، verify-audit، demo\n";
}
