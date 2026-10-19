import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'child_process';
const [,, html, mode, out, fpsArg] = process.argv;
const fps = +(fpsArg||30);
const browser = await chromium.launch({ args:['--allow-file-access-from-files','--disable-web-security'] });
const page = await browser.newPage({ viewport:{width:1920,height:1080} });
await page.goto('file://'+html); await page.waitForFunction('window.__ready===true');
await page.waitForTimeout(500);
if (mode==='stills') {
  for (const t of out.split(',').slice(1).map(Number)) {
    await page.evaluate(t=>render(t), t);
    await page.screenshot({ path: out.split(',')[0]+`/t${String(t).padStart(5,'0')}.jpg`, type:'jpeg', quality:80 });
  }
} else {
  const D = await page.evaluate('DURATION'); const N = Math.round(D*fps);
  const ff = spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(fps),'-c:v','mjpeg','-i','-',
    '-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',out],{stdio:['pipe','inherit','inherit']});
  for (let i=0;i<N;i++){ await page.evaluate(t=>render(t), i/fps);
    const buf = await page.screenshot({ type:'jpeg', quality:92 });
    if(!ff.stdin.write(buf)) await new Promise(r=>ff.stdin.once('drain',r));
    if(i%300===0) console.log('frame',i,'/',N); }
  ff.stdin.end(); await new Promise(r=>ff.on('close',r));
}
await browser.close();
