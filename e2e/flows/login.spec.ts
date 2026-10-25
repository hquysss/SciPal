import { test, expect } from '../lib/report-fixture';
import { login, storageStatePath, testCreds } from '../lib/auth';

// Critical path `login`: the one form submit allowed while READ_ONLY.
test.describe('login flow', () => {
  test('student logs in and lands off /login', async ({ page, report }) => {
    const creds = testCreds('student');
    test.skip(!creds, 'no student test creds');
    await login(page, creds!);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toContainText(/\S{3,}/);
    await page.context().storageState({ path: storageStatePath('student') });
    await report.step('after-login');
    report.assertClean();
  });
});
