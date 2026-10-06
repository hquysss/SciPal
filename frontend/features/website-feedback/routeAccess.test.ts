import { expect, it } from 'vitest';
import { routeAccess } from '@/lib/guestTrial';
it('opens the exact review page to guests while keeping other routes guarded', () => {
  expect(routeAccess('/feedback')).toEqual({ kind: 'public' });
  expect(routeAccess('/feedback-extra')).toEqual({ kind: 'trial', feature: 'learn' });
  expect(routeAccess('/admin/feedback')).toEqual({ kind: 'account' });
});
