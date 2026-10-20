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
import { saveDraft, saveExamPack, type ExamPack } from '../../lib/pwa/examPacks';
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

  it('without a saved exam, says to save it while online', async () => {
    attempts.start.mockResolvedValue({ ok: false, blocked: false, error: { vi: 'Không kết nối được máy chủ.', en: 'x' } });
    await submitFirstRight();
    expect(screen.getByText('Tải đề này khi có mạng để thi offline.')).toBeTruthy();
    expect(pendingExamsFor('u1')).toEqual([]);
  });
});
