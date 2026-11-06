// ساخت خروجی‌ها:
//   php/lib/org.json   پیکربندی مشترک برای سرور PHP
//   php/assets/app.js  رابط کاربری (همراه پیکربندی)
//   php/assets/app.css سبک‌ها
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as ORG from './config/org.mjs';
const src = f => readFileSync(new URL('./src/' + f, import.meta.url), 'utf8');
const ORDER = ['core.js', 'rules.js', 'ui.js', 'remote.js', 'pages1.js', 'letters.js', 'pages2.js', 'finance.js', 'tools.js', 'messages.js', 'pages3.js', 'admin.js', 'office.js', 'boot.js'];
const org = JSON.stringify(ORG);
writeFileSync(new URL('./php/lib/org.json', import.meta.url), JSON.stringify(ORG, null, 1));
mkdirSync(new URL('./php/assets/', import.meta.url), { recursive: true });
const js = `'use strict';\nconst ORG = ${org};\n` + ORDER.map(src).join('\n');
writeFileSync(new URL('./php/assets/app.js', import.meta.url), js);
const fonts = [['arabic', 400], ['arabic', 500], ['arabic', 700], ['arabic', 800], ['latin', 400], ['latin', 700]].map(([s, w]) =>
  `@font-face{font-family:Vazirmatn;font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/vazirmatn-${s}-${w}-normal.woff2) format('woff2')${s === 'latin' ? ';unicode-range:U+0000-00FF,U+2000-206F' : ''}}`).join('\n');
writeFileSync(new URL('./php/assets/app.css', import.meta.url), fonts + '\n' + src('styles.css'));
console.log('built', (js.length / 1024).toFixed(0) + 'KB js');

/* بسته نصب برای هاست: dist/kartabl-shabab-v3.zip (بدون config.php و بدون داده) */
import { execSync } from 'node:child_process';
import { mkdtempSync, cpSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if (process.argv.includes('--zip')) {
  const stage = mkdtempSync(join(tmpdir(), 'ktzip-'));
  const dst = join(stage, 'kartabl');
  cpSync(new URL('./php/', import.meta.url).pathname, dst, { recursive: true, filter: s => !/\/config\.php$/.test(s) && !/\/data\/(files|backups|demo)/.test(s) && !/\.sqlite/.test(s) });
  readdirSync(join(dst, 'data')).forEach(f => { if (!['.htaccess', 'index.php'].includes(f)) rmSync(join(dst, 'data', f), { recursive: true, force: true }); });
  mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
  const out = new URL('./dist/kartabl-shabab-v3.zip', import.meta.url).pathname;
  if (existsSync(out)) rmSync(out);
  execSync(`cd "${stage}" && zip -qr -X "${out}" kartabl`);
  rmSync(stage, { recursive: true, force: true });
  console.log('zip', out);
}
