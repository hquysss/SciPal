import { test, expect } from '../lib/report-fixture';
import { asRole } from '../lib/auth';

// Critical path `open-lesson`: /informatics (login-gated) -> first lesson renders its blocks.
test.describe('open lesson flow', () => {
  test('first informatics lesson renders', async ({ page, report }) => {
    await asRole(page, 'student');
    await page.goto('/informatics');
    const first = page.locator('main a[href^="/informatics/"]').first();
    await expect(first).toBeVisible();
    await first.click();
    await page.waitForURL(/\/informatics\/[^/]+/);
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('main')).toContainText(/\S{40,}/);
    await report.step('lesson');
    report.assertClean();
  });
});
