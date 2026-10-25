import { test, expect } from '../lib/report-fixture';

test.describe('home', () => {
  test('renders the landing page with navbar and no errors', async ({ page, report }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation').first()).toBeVisible();
    await expect(page.locator('main')).not.toBeEmpty();
    await report.step('landing');
    report.assertClean();
  });
});
