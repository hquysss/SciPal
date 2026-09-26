// Manual QA for the level gate and landing (not part of `pnpm test`).
// Usage: pnpm build && pnpm start -p 3100, then
//   QA_BASE_URL=http://localhost:3100 QA_OUT=/tmp/qa node scripts/qa-landing.mjs
// PLAYWRIGHT_MODULE may point at a playwright-core install; CHROMIUM_PATH at a Chromium binary.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
const BASE = process.env.QA_BASE_URL ?? 'http://localhost:3100';
const OUT = process.env.QA_OUT ?? 'qa-landing';
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 812, isMobile: true, hasTouch: true },
];
const LANGS = ['vi', 'en'];
const LEVELS = ['primary', 'lower_secondary', 'upper_secondary'];

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

async function noHorizontalScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

async function chooseLanguage(page, lang) {
  const label = lang === 'en' ? 'English' : 'Tiếng Việt';
  const button = page.locator(`[data-language-toggle] button[aria-label="${label}"]:visible`).first();
  if (await button.count()) await button.click();
}

for (const viewport of VIEWPORTS) {
  for (const lang of LANGS) {
    for (const level of LEVELS) {
      const tag = `${viewport.name}-${lang}-${level}`;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });
      const page = await context.newPage();
      const problems = [];
      page.on('console', (message) => {
        if (/hydration|did not match/i.test(message.text())) problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(String(error)));

      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await chooseLanguage(page, lang);
      await page.waitForSelector('#level-gate-title');
      check(await noHorizontalScroll(page), `${tag}: gate has no horizontal scroll`);
      await page.screenshot({ path: join(OUT, `${tag}-gate.png`) });

      await page.locator(`button[name="level"][value="${level}"]`).dblclick();
      await page.waitForSelector('#landing-title', { timeout: 5000 });
      check((await page.locator('#landing-title').count()) === 1, `${tag}: landing shown once after double click`);
      await page.waitForTimeout(3500);
      const state = await page.locator('[data-hero-state]').getAttribute('data-hero-state');
      console.log(`     ${tag}: hero state ${state}`);
      check(await noHorizontalScroll(page), `${tag}: landing has no horizontal scroll`);
      await page.screenshot({ path: join(OUT, `${tag}-hero.png`) });
      // Scroll through so scroll-reveal sections appear before the full-page capture.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 400) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      });
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, `${tag}-full.png`), fullPage: true });
      check(problems.length === 0, `${tag}: no hydration warnings or page errors ${problems.join(' | ')}`);
      await context.close();
    }
  }
}

// The gate fits one screen on common laptop viewports (spec §2).
for (const [width, height] of [[1366, 657], [1280, 720], [1280, 800], [1440, 900]]) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForSelector('#level-gate-title');
  const fits = await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
  check(fits, `gate fits one screen at ${width}x${height}`);
  await context.close();
}

// A failed scene chunk keeps the landing usable with the SVG.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.route(/\/_next\/static\/chunks\//, async (route) => {
    const body = await (await route.fetch()).text();
    if (body.includes('WebGLRenderer')) return route.abort();
    return route.continue();
  });
  await page.locator('button[name="level"][value="upper_secondary"]').click();
  await page.waitForSelector('#landing-title');
  await page.waitForTimeout(4000);
  check((await page.locator('#landing-title').count()) === 1, 'blocked scene chunk: landing still rendered');
  const state = await page.locator('[data-hero-state]').getAttribute('data-hero-state');
  check(state === 'failed', `blocked scene chunk: hero falls back (state ${state})`);
  await context.close();
}

// Reduced motion: no canvas, no flip delay.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const started = Date.now();
  await page.locator('button[name="level"][value="upper_secondary"]').click();
  await page.waitForSelector('#landing-title');
  check(Date.now() - started < 1500, 'reduced motion: gate choice applies without the flip delay');
  await page.waitForTimeout(3000);
  check((await page.locator('canvas').count()) === 0, 'reduced motion: no WebGL canvas');
  await context.close();
}

// Keyboard: focus a notebook and press Enter.
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  let reached = false;
  for (let i = 0; i < 30 && !reached; i += 1) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.getAttribute('name') === 'level');
  }
  check(reached, 'keyboard: Tab reaches a notebook');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#landing-title', { timeout: 5000 });
  check(true, 'keyboard: Enter opens the landing');
  await context.close();
}

await browser.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
