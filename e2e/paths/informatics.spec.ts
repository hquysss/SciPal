import { test, expect } from '../lib/report-fixture';
import { asRole } from '../lib/auth';

test.describe('informatics', () => {
  test('subject page lists lessons with no errors', async ({ page, report }) => {
    await asRole(page, 'student');
    await page.goto('/informatics');
    await expect(page.getByRole('heading').first()).toBeVisible();
    await expect(page.locator('main a[href^="/informatics/"]').first()).toBeVisible();
    await report.step('informatics');
    report.assertClean();
  });
});
