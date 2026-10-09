// Chụp giao diện thật từ dev server (localhost:3000) cho trailer.
const path = require('path');
const { chromium } = require(path.resolve(__dirname, '../../node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core'));
const OUT = path.resolve(__dirname, '../public/shots');
const PAGES = process.argv.length > 2 ? process.argv.slice(2).map((s) => '/' + s) : ['/', '/tutor', '/lab', '/pricing', '/login'];
const VIEWS = { wide: { width: 1440, height: 900, deviceScaleFactor: 1.5 }, tall: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } };
(async () => {
  require('fs').mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  for (const lang of ['vi', 'en']) for (const [vname, vp] of Object.entries(VIEWS)) {
    for (const picker of process.argv.length > 2 ? [false] : [true, false]) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, isMobile: vp.isMobile, hasTouch: vp.hasTouch, reducedMotion: 'reduce', colorScheme: 'light' });
      await ctx.addInitScript(([l, p]) => {
        localStorage.setItem('scipal-lang', l);
        localStorage.setItem('scipal-theme', 'light');
        if (!p) sessionStorage.setItem('scipal_education_level_tab', 'upper_secondary');
      }, [lang, picker]);
      if (!picker) await ctx.addCookies([{ name: 'scipal_intro', value: '1', url: 'http://localhost:3000' }]);
      const page = await ctx.newPage();
      for (const p of picker ? ['/'] : PAGES) {
        await page.goto('http://localhost:3000' + p, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => {});
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});
        await page.waitForTimeout(2500);
        const name = (picker ? 'picker' : (p === '/' ? 'home' : p.slice(1))) + `-${vname}-${lang}.png`;
        await page.screenshot({ path: path.join(OUT, name), fullPage: !picker && ['/', '/lab', '/pricing'].includes(p) });
        console.log(name, page.url());
      }
      await ctx.close();
    }
  }
  await browser.close();
})();
