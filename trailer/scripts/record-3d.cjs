// Quay mô phỏng dao động điều hoà 3D (xoay + zoom thật) từ chính canvas WebGL.
// node scripts/record-3d.cjs  ->  public/clips/harmonic-<lang>.mp4
// Thao tác (ms, tọa độ theo tỉ lệ canvas) phải khớp CURSOR trong src/Trailer.tsx.
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { chromium } = require(path.resolve(__dirname, '../../node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core'));

const OUT = path.resolve(__dirname, '../public/clips');
const PLAN = { total: 9500, dragStart: 2000, dragEnd: 4800, from: [0.45, 0.56], to: [0.535, 0.5], zoomStart: 5400, zoomSteps: 4, zoomGap: 170 };

async function record(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: 'light' });
  await ctx.addInitScript((l) => { localStorage.setItem('scipal-lang', l); localStorage.setItem('scipal-theme', 'light'); sessionStorage.setItem('scipal_education_level_tab', 'upper_secondary'); }, lang);
  await ctx.addCookies([{ name: 'scipal_intro', value: '1', url: 'http://localhost:3000' }]);
  const page = await ctx.newPage();
  await page.goto('http://localhost:3000/lab/harmonic-3d', { waitUntil: 'networkidle', timeout: 180000 });
  await page.locator('canvas').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);
  const b64 = await page.evaluate(async (plan) => {
    const canvas = document.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    const at = ([fx, fy]) => ({ clientX: r.left + fx * r.width, clientY: r.top + fy * r.height });
    const fire = (type, pos, extra = {}) => canvas.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, buttons: type === 'pointerup' ? 0 : 1, ...pos, ...extra }));
    const rec = new MediaRecorder(canvas.captureStream(60), { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 30_000_000 });
    const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const t0 = performance.now();
    rec.start();
    await new Promise((done) => {
      let down = false; let up = false; let zoomed = 0;
      const tick = () => {
        const t = performance.now() - t0;
        if (t >= plan.dragStart && !down) { down = true; fire('pointerdown', at(plan.from)); }
        if (down && !up) {
          const k = Math.min(1, (t - plan.dragStart) / (plan.dragEnd - plan.dragStart));
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          fire('pointermove', at([plan.from[0] + (plan.to[0] - plan.from[0]) * e, plan.from[1] + (plan.to[1] - plan.from[1]) * e]));
          if (k >= 1) { up = true; fire('pointerup', at(plan.to)); }
        }
        while (zoomed < plan.zoomSteps && t >= plan.zoomStart + zoomed * plan.zoomGap) {
          canvas.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -120, ctrlKey: true, ...at([0.5, 0.5]) }));
          zoomed++;
        }
        if (t >= plan.total) return done();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    rec.stop();
    await new Promise((res) => { rec.onstop = res; });
    const buf = new Uint8Array(await new Blob(chunks).arrayBuffer());
    let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  }, PLAN);
  const webm = path.join(OUT, `harmonic-${lang}.webm`);
  fs.writeFileSync(webm, Buffer.from(b64, 'base64'));
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf', 'fps=30', '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', path.join(OUT, `harmonic-${lang}.mp4`)]);
  fs.rmSync(webm);
  await ctx.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const d of fs.readdirSync(OUT)) if (d.startsWith('frames-')) fs.rmSync(path.join(OUT, d), { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const lang of ['vi', 'en']) await record(browser, lang);
  await browser.close();
})();
