// ساخت نسخه تک‌فایلی: dist/index.html (مستقل) و dist/kartabl.html (پیش‌نمایش Artifact)
import { readFileSync, writeFileSync } from 'node:fs';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const css = src('styles.css');
const js = ['core.js', 'domain.js', 'seed.js', 'ui.js', 'pages1.js', 'pages2.js', 'pages3.js', 'admin.js', 'sync.js', 'boot.js'].map(src).join('\n');
const headTags = `<title>کارتابل شباب اهل‌الجنه</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&family=Noto+Nastaliq+Urdu:wght@500&display=swap">
<style>
${css}
</style>`;
const body = `<div id="root"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
${js}
</script>`;
writeFileSync(new URL('./dist/kartabl.html', import.meta.url), `${headTags}\n${body}\n`);
writeFileSync(new URL('./dist/index.html', import.meta.url), `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${headTags}
</head>
<body>
${body}
</body>
</html>
`);
console.log('built', (js.length / 1024).toFixed(0) + 'KB js');
