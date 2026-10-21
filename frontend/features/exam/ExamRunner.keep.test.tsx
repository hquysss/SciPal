// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/exam/bp', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('../../lib/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok', user: { id: 'u1' } } } }) } }),
}));
const attempts = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('./examAttempt', async (load) => ({ ...(await load<typeof import('./examAttempt')>()), startExamAttempt: attempts.start }));

import { ExamRunner, type ExamQuestionItem } from './ExamRunner';
import { loadDraft, saveDraft } from '../../lib/pwa/examPacks';
import { ensureRun, loadRun } from '../../lib/pwa/examRun';

const q = (id: string): ExamQuestionItem => ({ id, type: 'mc', data: { stem: { vi: `Câu hỏi ${id}`, en: `Question ${id}` }, options: [{ id: 'A', text: { vi: 'Lựa chọn A', en: 'A' } }, { id: 'B', text: { vi: 'Lựa chọn B', en: 'B' } }] } });
const questions = [q('a'), q('b')];
const scored = { score: 5, max_score: 10, correct_count: 1, total_questions: 2, xp_earned: 15 };
const minutesAgo = (n: number) => new Date(Date.now() - n * 60 * 1000).toISOString();

const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  attempts.start.mockReset();
  attempts.start.mockResolvedValue({ ok: true, attemptId: 'att-1', remaining: 2, period: 'month' });
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => scored });
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const open = async () => {
  render(<ExamRunner blueprintId="bp" questions={questions} durationMinutes={45} />);
  await settle();
};
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};
const leave = async () => {
  await act(async () => {
    setHidden(true);
    setHidden(false);
  });
  await settle();
};
const submitted = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/score/exam'));

describe('leaving the page during an exam', () => {
  it('counts each time the page was hidden and shown again, and says how many', async () => {
    await open();
    await leave();
    expect(screen.getByText(/rời trang 1\/3/)).toBeTruthy();
    await leave();
    expect(screen.getByText(/rời trang 2\/3/)).toBeTruthy();
    expect(submitted()).toHaveLength(0);
  });

  it('does not count the window losing focus', async () => {
    await open();
    await act(async () => {
      window.dispatchEvent(new Event('blur'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.queryByText(/rời trang/)).toBeNull();
    expect(loadRun('att-1')?.leaves).toBe(0);
  });

  it('submits on the third time, with what was answered', async () => {
    await open();
    fireEvent.click(screen.getByRole('radio', { name: /Lựa chọn A/ }));
    await leave();
    await leave();
    await leave();
    expect(submitted()).toHaveLength(1);
    expect(JSON.parse(submitted()[0]![1].body).answers).toEqual([{ question_id: 'a', selected_option: 'A' }]);
    expect(screen.getByTestId('exam-score').textContent).toBe('5 / 10');
  });

  it('keeps the count after the page is closed and opened again', async () => {
    await open();
    await leave();
    await leave();
    cleanup();
    await open();
    expect(loadRun('att-1')?.leaves).toBe(2);
    await leave();
    expect(submitted()).toHaveLength(1);
  });

  it('shows how many times the learner left, on the result', async () => {
    await open();
    await leave();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Nộp bài thi' }));
    });
    await settle();
    expect(screen.getByText(/Số lần rời trang: 1/)).toBeTruthy();
  });
});

describe('closing the page during an exam', () => {
  it('asks first while the exam is being taken, and not once it has a result', async () => {
    await open();
    const working = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(working);
    expect(working.defaultPrevented).toBe(true);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Nộp bài thi' }));
    });
    await settle();
    const done = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(done);
    expect(done.defaultPrevented).toBe(false);
  });
});

describe('coming back to an exam that was left', () => {
  it('submits the draft when the time ran out while the page was closed', async () => {
    ensureRun('att-1', minutesAgo(60));
    saveDraft('att-1', { 0: { option: 'B' } });
    await open();
    expect(submitted()).toHaveLength(1);
    expect(JSON.parse(submitted()[0]![1].body).answers).toEqual([{ question_id: 'a', selected_option: 'B' }]);
    expect(screen.getByTestId('exam-score').textContent).toBe('5 / 10');
  });

  it('carries on with the clock where it was left, when time is left', async () => {
    ensureRun('att-1', minutesAgo(10));
    saveDraft('att-1', { 0: { option: 'B' } });
    await open();
    expect(submitted()).toHaveLength(0);
    expect(screen.getByRole('timer').textContent).toMatch(/3[45]:\d\d/);
    expect(loadDraft('att-1')).toEqual({ 0: { option: 'B' } });
  });

  it('opens a new attempt, and sends nothing, when time ran out with nothing written', async () => {
    ensureRun('att-1', minutesAgo(60));
    attempts.start.mockResolvedValueOnce({ ok: true, attemptId: 'att-1', remaining: 2, period: 'month' }).mockResolvedValueOnce({ ok: true, attemptId: 'att-2', remaining: 1, period: 'month' });
    await open();
    expect(submitted()).toHaveLength(0);
    expect(attempts.start).toHaveBeenCalledTimes(2);
    expect(loadRun('att-1')).toBeNull();
    expect(loadRun('att-2')?.leaves).toBe(0);
  });
});
