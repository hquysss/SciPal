import { test, expect } from '../lib/report-fixture';

test.describe('pricing', () => {
  test('pricing renders with no errors', async ({ page, report }) => {
    await page.goto('/pricing');
    await expect(page.locator('main')).toContainText(/\S{3,}/);

    await report.step('pricing');
    report.assertClean();
  });
});
