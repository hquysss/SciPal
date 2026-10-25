import { test, expect } from '../lib/report-fixture';
import { asRole } from '../lib/auth';

test.describe('review', () => {
  test('review renders for a logged-in student with no errors', async ({ page, report }) => {
    await asRole(page, 'student');
    await page.goto('/review');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main')).toContainText(/\S{3,}/);
    await report.step('review');
    report.assertClean();
  });
});
