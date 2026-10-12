<?php
require __DIR__ . '/bootstrap.php';
if (!anbar_is_installed()) {
    header('Location: install.php');
    exit;
}
anbar_maybe_run_jobs();
if (isset($_GET['api'])) {
    anbar_dispatch($_GET['api']);
    exit;
}
nocache_headers();
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
$assets = anbar_base_url() . 'assets/';
$ver = ANBAR_VERSION;
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0e5f57">
  <meta name="robots" content="noindex, nofollow">
  <title>انبار شباب</title>
  <link rel="icon" href="<?= htmlspecialchars($assets) ?>logo.svg" type="image/svg+xml">
  <link rel="preload" href="<?= htmlspecialchars($assets) ?>fonts/vazirmatn-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="<?= htmlspecialchars($assets) ?>app.css?ver=<?= $ver ?>">
</head>
<body>
  <div id="app" aria-live="polite">
    <div class="boot"><img src="<?= htmlspecialchars($assets) ?>logo.svg" alt="" width="56" height="56"><span>در حال بارگذاری…</span></div>
  </div>
  <div id="toasts" role="status"></div>
  <script>window.ANBAR = <?= json_encode(anbar_client_config(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?>;</script>
  <script src="<?= htmlspecialchars($assets) ?>app.js?ver=<?= $ver ?>"></script>
</body>
</html>
