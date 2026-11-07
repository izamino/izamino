<?php
/* صفحه اصلی سامانه (رابط کاربری تک‌صفحه‌ای) */
require __DIR__ . '/lib/boot.php';
if (!kt_config()) { header('Location: install.php'); exit; }
$v = KT_VERSION . '-' . @filemtime(__DIR__ . '/assets/app.js');
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: DENY');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'");
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d3a2e">
<meta name="robots" content="noindex, nofollow">
<title>کارتابل اداری</title>
<link rel="stylesheet" href="assets/app.css?v=<?= htmlspecialchars($v) ?>">
</head>
<body>
<div id="root"><div class="boot">در حال بارگذاری کارتابل…</div></div>
<noscript>برای استفاده از کارتابل، جاوااسکریپت مرورگر را فعال کنید.</noscript>
<script src="assets/qrcode.min.js?v=<?= htmlspecialchars($v) ?>" defer></script>
<script src="assets/app.js?v=<?= htmlspecialchars($v) ?>" defer></script>
</body>
</html>
