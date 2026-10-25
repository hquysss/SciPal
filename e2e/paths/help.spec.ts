import { test, expect } from '../lib/report-fixture';

test.describe('help', () => {
  test('help renders with no errors', async ({ page, report }) => {
    await page.goto('/help');
    await expect(page.locator('main')).toContainText(/\S{3,}/);

    await report.step('help');
    report.assertClean();
  });
});
