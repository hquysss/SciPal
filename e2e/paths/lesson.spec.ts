import { test, expect } from '../lib/report-fixture';
import { asRole } from '../lib/auth';

test.describe('lesson', () => {
  test('first informatics lesson renders blocks with no errors', async ({ page, report }) => {
    await asRole(page, 'student');
    await page.goto('/informatics');
    const href = await page.locator('main a[href^="/informatics/"]').first().getAttribute('href');
    await page.goto(href!);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('main')).toContainText(/\S{40,}/);
    await report.step('lesson');
    report.assertClean();
  });
});
