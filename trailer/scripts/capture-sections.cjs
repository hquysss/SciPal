// Chụp từng section của trang chủ (THPT) để làm cảnh trailer.
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core'));
const OUT = path.resolve(__dirname, '../public/shots');
const IDS = ['landing-title', 'trust-title', 'how-title', 'tutor-title', 'install-title', 'pricing-title', 'stats-title', 'start-title'];
const VIEWS = { wide: { width: 1440, height: 900, deviceScaleFactor: 1.5 }, tall: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const lang of ['vi', 'en']) for (const [vname, vp] of Object.entries(VIEWS)) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: 'reduce', colorScheme: 'light' });
    await ctx.addInitScript((l) => { localStorage.setItem('scipal-lang', l); localStorage.setItem('scipal-theme', 'light'); sessionStorage.setItem('scipal_education_level_tab', 'upper_secondary'); }, lang);
    await ctx.addCookies([{ name: 'scipal_intro', value: '1', url: 'http://localhost:3000' }]);
    const page = await ctx.newPage();
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important} [class*=revealPending]{opacity:1!important;transform:none!important}' });
    await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden'; } });
    for (const id of IDS) {
      const el = page.locator(`section[aria-labelledby="${id}"]`).first();
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await el.screenshot({ path: path.join(OUT, `sec-${id.replace('-title', '')}-${vname}-${lang}.png`) });
    }
    await ctx.close();
  }
  await browser.close();
})();
