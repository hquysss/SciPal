const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/Code/SciPal/node_modules/.pnpm/playwright-core@1.63.0/node_modules/playwright-core');

const evidenceDir = 'D:/Code/SciPal/.omo/evidence';
const executablePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const origins = ['http://localhost:3102', 'http://127.0.0.1:3102'];

async function runOrigin(browser, origin, index) {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1024, height: 768 },
  });
  const page = await context.newPage();
  const requests = [];
  const responses = [];
  const consoleErrors = [];

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().includes('/api/preferences/education-level')) {
      const headers = request.headers();
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: {
          origin: headers.origin ?? null,
          referer: headers.referer ?? null,
          contentType: headers['content-type'] ?? null,
        },
        postData: request.postData(),
      });
    }
  });
  page.on('response', (response) => {
    if (response.request().method() === 'POST' && response.url().includes('/api/preferences/education-level')) {
      const headers = response.headers();
      responses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        headers: {
          location: headers.location ?? null,
          setCookie: headers['set-cookie'] ?? null,
          contentType: headers['content-type'] ?? null,
        },
      });
    }
  });

  const result = {
    origin,
    javascriptEnabled: false,
    initial: {},
    submit: {},
    screenshots: {},
    requestEvents: requests,
    responseEvents: responses,
    consoleErrors,
  };

  try {
    const initialResponse = await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    result.initial = {
      url: page.url(),
      status: initialResponse ? initialResponse.status() : null,
      gateCount: await page.locator('[data-scipal-level-gate]').count(),
      submitCount: await page.locator('button[name="level"][value="upper_secondary"]').count(),
      title: await page.title(),
    };
    const beforePath = path.join(evidenceDir, `nojs-host-${index}-${origin.includes('127.0.0.1') ? 'loopback' : 'localhost'}-before.png`);
    await page.screenshot({ path: beforePath, fullPage: true });
    result.screenshots.before = beforePath;

    const postResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes('/api/preferences/education-level'),
      { timeout: 30000 },
    );
    await page.locator('button[name="level"][value="upper_secondary"]').click();
    const postResponse = await postResponsePromise;
    await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
    const afterPath = path.join(evidenceDir, `nojs-host-${index}-${origin.includes('127.0.0.1') ? 'loopback' : 'localhost'}-after.png`);
    await page.screenshot({ path: afterPath, fullPage: true });

    const cookies = await context.cookies(origin);
    const levelCookie = cookies.find((cookie) => cookie.name === 'scipal_education_level');
    result.submit = {
      responseStatusFromWait: postResponse.status(),
      responseUrlFromWait: postResponse.url(),
      finalUrl: page.url(),
      gateCountAfter: await page.locator('[data-scipal-level-gate]').count(),
      landingTitleCountAfter: await page.locator('#landing-title').count(),
      cookies: cookies.map(({ name, value, domain, path: cookiePath, httpOnly, sameSite, secure }) => ({ name, value, domain, path: cookiePath, httpOnly, sameSite, secure })),
      levelCookie: levelCookie ? { name: levelCookie.name, value: levelCookie.value, domain: levelCookie.domain, path: levelCookie.path, httpOnly: levelCookie.httpOnly, sameSite: levelCookie.sameSite, secure: levelCookie.secure } : null,
    };
    result.screenshots.after = afterPath;
  } catch (error) {
    result.error = { name: error.name, message: error.message, stack: error.stack };
  } finally {
    result.requestEvents = requests;
    result.responseEvents = responses;
    await context.close();
  }
  return result;
}

(async () => {
  fs.mkdirSync(evidenceDir, { recursive: true });
  const browser = await chromium.launch({ headless: false, executablePath, slowMo: 100 });
  const results = [];
  try {
    for (const [index, origin] of origins.entries()) {
      results.push(await runOrigin(browser, origin, index + 1));
    }
  } finally {
    await browser.close();
  }
  const outputPath = path.join(evidenceDir, 'nojs-host-repro-playwright.json');
  fs.writeFileSync(outputPath, `${JSON.stringify({ invocation: 'node .omo/evidence/nojs-host-repro-playwright.cjs', results }, null, 2)}\n`);
  console.log(JSON.stringify({ outputPath, results }, null, 2));
})();
