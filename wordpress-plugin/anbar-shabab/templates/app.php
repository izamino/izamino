<?php
/** Full-screen app shell (the theme is intentionally not loaded on this page). */
if (!defined('ABSPATH')) {
    exit;
}
$anbar_assets = ANBAR_URL . 'assets/';
$anbar_ver = ANBAR_VERSION;
?><!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0e5f57">
  <meta name="robots" content="noindex, nofollow">
  <title>انبار شباب</title>
  <link rel="icon" href="<?php echo esc_url($anbar_assets . 'logo.svg'); ?>" type="image/svg+xml">
  <link rel="preload" href="<?php echo esc_url($anbar_assets . 'fonts/vazirmatn-arabic-400-normal.woff2'); ?>" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="<?php echo esc_url($anbar_assets . 'app.css?ver=' . $anbar_ver); ?>">
</head>
<body>
  <div id="app" aria-live="polite">
    <div class="boot"><img src="<?php echo esc_url($anbar_assets . 'logo.svg'); ?>" alt="" width="56" height="56"><span>در حال بارگذاری…</span></div>
  </div>
  <div id="toasts" role="status"></div>
  <script>window.ANBAR = <?php echo wp_json_encode(anbar_client_config(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES); ?>;</script>
  <script src="<?php echo esc_url($anbar_assets . 'app.js?ver=' . $anbar_ver); ?>"></script>
</body>
</html>
