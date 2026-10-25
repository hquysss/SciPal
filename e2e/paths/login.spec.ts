import { test, expect } from '../lib/report-fixture';

test.describe('login', () => {
  test('login renders with no errors', async ({ page, report }) => {
    await page.goto('/login');
    await expect(page.locator('main')).toContainText(/\S{3,}/);
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /đăng nhập|log ?in|sign ?in/i }).first()).toBeEnabled();
    await report.step('login');
    report.assertClean();
  });
});
