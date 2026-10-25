import { test, expect } from '../lib/report-fixture';

test.describe('subjects', () => {
  test('subjects renders with no errors', async ({ page, report }) => {
    await page.goto('/subjects');
    await expect(page.locator('main')).toContainText(/\S{3,}/);
    await expect(page.locator('main a[href^="/"]').first()).toBeVisible();
    await report.step('subjects');
    report.assertClean();
  });
});
