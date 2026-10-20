// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
const api = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock('@/features/lessons/practiceApi', () => ({ postPracticeSync: api.sync }));
vi.mock('../../lib/supabase', () => ({
  createBrowserClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'tok', user: { id: 'u1' } } } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

import { PendingSync } from './PendingSync';
import { PENDING_CHANGED, queueFirstAnswer } from '../../lib/pwa/pendingPractice';

afterEach(() => {
  cleanup();
  localStorage.clear();
  api.sync.mockReset();
});

describe('PendingSync', () => {
  it('sends the queue once while a sync is already running', async () => {
    queueFirstAnswer({ user_id: 'u1', question_id: 'q1', lesson_id: 'l1', subject_id: 's1', response: { selected_option: 'a' }, answered_at: '2026-10-20T07:00:00.000Z' });
    let release: (value: unknown) => void = () => {};
    api.sync.mockImplementation(() => new Promise((resolve) => { release = resolve; }));
    render(<PendingSync />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
      window.dispatchEvent(new Event(PENDING_CHANGED));
      window.dispatchEvent(new Event(PENDING_CHANGED));
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(api.sync).toHaveBeenCalledTimes(1);
    await act(async () => {
      release([{ question_id: 'q1', status: 'ok', correct: true, xp_earned: 10 }]);
      await new Promise((r) => setTimeout(r, 0));
    });
  });

  it('says how many answers wait, in both languages without "(s)"', async () => {
    queueFirstAnswer({ user_id: 'u1', question_id: 'q1', lesson_id: 'l1', subject_id: 's1', response: { selected_option: 'a' }, answered_at: '2026-10-20T07:00:00.000Z' });
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { findByRole } = render(<PendingSync />);
    expect((await findByRole('status')).textContent).toBe('1 câu đang chờ đồng bộ.');
    onLine.mockRestore();
  });
});
