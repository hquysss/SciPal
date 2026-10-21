// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('next/navigation', () => ({ usePathname: () => '/exam/bp', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
const auth = vi.hoisted(() => ({ session: { access_token: 'tok', user: { id: 'u1' } } as null | { access_token: string; user: { id: string } } }));
vi.mock('../../lib/supabase', () => ({
  createBrowserClient: () => ({ auth: { getSession: async () => ({ data: { session: auth.session } }) } }),
}));
const attempts = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock('./examAttempt', async (load) => ({ ...(await load<typeof import('./examAttempt')>()), startExamAttempt: attempts.start }));

import { ExamRunner, type ExamQuestionItem } from './ExamRunner';
import { loadExamPack, saveDraft, saveExamPack, type ExamPack } from '../../lib/pwa/examPacks';
import { EXAM_SYNCED, pendingExamsFor } from '../../lib/pwa/pendingPractice';

const q = (id: string): ExamQuestionItem => ({ id, type: 'mc', data: { stem: { vi: `Câu hỏi ${id}`, en: `Question ${id}` }, options: [{ id: 'A', text: { vi: 'Lựa chọn A', en: 'A' } }, { id: 'B', text: { vi: 'Lựa chọn B', en: 'B' } }] } });
const questions = [q('a'), q('b')];
const pack: ExamPack = {
  user_id: 'u1',
  blueprint_id: 'bp',
  attempt_id: 'att-1',
  blueprint: { id: 'bp', name: 'Đề', grade: 10, subject_id: 's', subject_slug: 'tin', subject_name_en: null, subject_name_vi: null, question_count: 2, format: 'generic', layout: null },
  questions,
  keys: { a: { type: 'mc', data: { answer: 'A' } }, b: { type: 'mc', data: { answer: 'B' } } },
};
let onLine: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  auth.session = { access_token: 'tok', user: { id: 'u1' } };
  localStorage.clear();
  attempts.start.mockReset();
  onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  onLine.mockRestore();
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

async function submitFirstRight() {
  render(<ExamRunner blueprintId="bp" questions={questions} />);
  await settle();
  fireEvent.click(screen.getByRole('radio', { name: /Lựa chọn A/ }));
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài thi' }));
  });
  await settle();
}

describe('an exam saved for offline', () => {
  it('uses the saved attempt without asking the server, and scores a submission on the device', async () => {
    saveExamPack(pack);
    await submitFirstRight();
    expect(attempts.start).not.toHaveBeenCalled();
    expect(screen.getByText(/Kết quả tạm · chờ đồng bộ/)).toBeTruthy();
    expect(screen.getByTestId('exam-score').textContent).toBe('5 / 10');
    expect(pendingExamsFor('u1')).toMatchObject([{ attempt_id: 'att-1', blueprint_id: 'bp', answers: [{ question_id: 'a', selected_option: 'A' }] }]);
  });

  it('reopened offline, brings back the answers written before', async () => {
    saveExamPack(pack);
    saveDraft('att-1', { 1: { option: 'B' } });
    render(<ExamRunner blueprintId="bp" questions={questions} />);
    await settle();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Nộp bài thi' }));
    });
    await settle();
    expect(pendingExamsFor('u1')[0]?.answers).toEqual([{ question_id: 'b', selected_option: 'B' }]);
  });

  it('shows the server result once the exam is synced', async () => {
    saveExamPack(pack);
    await submitFirstRight();
    act(() => {
      window.dispatchEvent(new CustomEvent(EXAM_SYNCED, { detail: [{ blueprint_id: 'bp', attempt_id: 'att-1', result: { score: 7, max_score: 10, correct_count: 1, total_questions: 2, xp_earned: 15 } }] }));
    });
    expect(screen.queryByText(/Kết quả tạm/)).toBeNull();
    expect(screen.getByTestId('exam-score').textContent).toBe('7 / 10');
  });

  it('still opens the saved exam offline after the session has expired', async () => {
    saveExamPack(pack);
    auth.session = null;
    await submitFirstRight();
    expect(screen.getByText(/Kết quả tạm · chờ đồng bộ/)).toBeTruthy();
    expect(pendingExamsFor('u1')).toHaveLength(1);
  });

  it('forgets the saved exam once it is submitted, so it is not taken again on the same attempt', async () => {
    saveExamPack(pack);
    await submitFirstRight();
    expect(loadExamPack('u1', 'bp')).toBeNull();
  });

  it('keeps the clock running across closing and reopening the page', async () => {
    saveExamPack({ ...pack, started_at: new Date(Date.now() - 40 * 60 * 1000).toISOString() });
    render(<ExamRunner blueprintId="bp" questions={questions} durationMinutes={45} />);
    await settle();
    expect(screen.getByRole('timer').textContent).toMatch(/0[45]:\d\d/);
  });

  it('notes when the saved exam was started, the first time', async () => {
    saveExamPack(pack);
    render(<ExamRunner blueprintId="bp" questions={questions} />);
    await settle();
    expect(loadExamPack('u1', 'bp')?.started_at).toEqual(expect.any(String));
  });

  it('sends when the exam was started with the saved exam when it is submitted online', async () => {
    onLine.mockReturnValue(true);
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    saveExamPack({ ...pack, started_at: startedAt });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ score: 5, max_score: 10, correct_count: 1, total_questions: 2, xp_earned: 15 }) });
    vi.stubGlobal('fetch', fetchMock);
    await submitFirstRight();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toMatchObject({ attempt_id: 'att-1', started_at: startedAt });
    vi.unstubAllGlobals();
  });

  it('queues the start time with an exam submitted offline', async () => {
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    saveExamPack({ ...pack, started_at: startedAt });
    await submitFirstRight();
    expect(pendingExamsFor('u1')[0]).toMatchObject({ started_at: startedAt });
  });

  it('says the exam was not counted when the plan has no attempt left, and keeps the answers on the page', async () => {
    onLine.mockReturnValue(true);
    saveExamPack(pack);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: 'QUOTA_EXCEEDED' }) }));
    await submitFirstRight();
    expect(screen.getByText(/chưa được tính/)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Lựa chọn A/ })).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('shows that a queued exam was not counted once the server says so', async () => {
    saveExamPack(pack);
    await submitFirstRight();
    act(() => {
      window.dispatchEvent(new CustomEvent(EXAM_SYNCED, { detail: [{ blueprint_id: 'bp', attempt_id: 'att-1', not_counted: true }] }));
    });
    expect(screen.getByText(/chưa được tính/)).toBeTruthy();
    expect(screen.queryByText(/Kết quả tạm/)).toBeNull();
  });

  it('without a saved exam, says to save it while online', async () => {
    attempts.start.mockResolvedValue({ ok: false, blocked: false, error: { vi: 'Không kết nối được máy chủ.', en: 'x' } });
    await submitFirstRight();
    expect(screen.getByText('Tải đề này khi có mạng để thi offline.')).toBeTruthy();
    expect(pendingExamsFor('u1')).toEqual([]);
  });
});
