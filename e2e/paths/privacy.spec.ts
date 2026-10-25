import { test, expect } from '../lib/report-fixture';

test.describe('privacy', () => {
  test('privacy renders with no errors', async ({ page, report }) => {
    await page.goto('/privacy');
    await expect(page.locator('main')).toContainText(/\S{3,}/);

    await report.step('privacy');
    report.assertClean();
  });
});
