// ساخت خروجی‌ها:
//   dist/index.html    نسخه نمایشی مستقل (داده در مرورگر)
//   dist/kartabl.html  پیش‌نمایش claude.ai (نسخه نمایشی)
//   server/public/     نسخه عملیاتی که سرور ارائه می‌دهد (بدون داده نمونه در مرورگر)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const ORDER = ['core.js', 'domain.js', 'seed.js', 'domain-admin.js', 'ops.js', 'ui.js', 'remote.js', 'pages1.js', 'pages2.js', 'pages3.js', 'admin.js', 'sync.js', 'boot.js'];
const css = src('styles.css');
const js = ORDER.map(src).join('\n');
const fonts = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@500&display=swap">`;
const headTags = `<title>کارتابل شباب اهل‌الجنه</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>`;
const qr = '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"></script>';
const body = `<div id="root"></div>
${qr}
<script>
${js}
</script>`;
const page = (head, inner) => `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${head}
</head>
<body>
${inner}
</body>
</html>
`;
writeFileSync(new URL('./dist/kartabl.html', import.meta.url), `${headTags}\n${body}\n`);
writeFileSync(new URL('./dist/index.html', import.meta.url), page(headTags, body));

/* نسخه سروری: کد در فایل جدا تا سیاست امنیت محتوا (CSP) اسکریپت درون‌خطی را ممنوع کند */
mkdirSync(new URL('./server/public/', import.meta.url), { recursive: true });
writeFileSync(new URL('./server/public/app.js', import.meta.url), 'window.__KARTABL_SERVER__ = true;\n' + js);
writeFileSync(new URL('./server/public/app.css', import.meta.url), css);
writeFileSync(new URL('./server/public/index.html', import.meta.url), page(`<title>کارتابل شباب اهل‌الجنه</title>
<meta name="theme-color" content="#0d3a2e">
${fonts}
<link rel="stylesheet" href="/app.css">`, `<div id="root"></div>
<script src="/qrcode.min.js" defer></script>
<script src="/app.js" defer></script>`));

/* فایل‌های مشترک قواعد کسب‌وکار برای اجرا روی سرور */
writeFileSync(new URL('./server/shared.js', import.meta.url), ['core.js', 'domain.js', 'seed.js', 'domain-admin.js', 'ops.js'].map(src).join('\n'));
console.log('built', (js.length / 1024).toFixed(0) + 'KB js');
