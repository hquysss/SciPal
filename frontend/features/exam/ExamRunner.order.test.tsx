// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
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
import { arrangeQuestions } from './examOrder';

const q = (id: string): ExamQuestionItem => ({ id, type: 'mc', data: { stem: { vi: `Câu hỏi ${id}`, en: id }, options: [{ id: 'A', text: { vi: 'Lựa chọn A', en: 'A' } }, { id: 'B', text: { vi: 'Lựa chọn B', en: 'B' } }] } });
const questions = Array.from({ length: 12 }, (_, i) => q(`q${i}`));

beforeEach(() => {
  localStorage.clear();
  attempts.start.mockReset();
  attempts.start.mockResolvedValue({ ok: true, attemptId: 'att-1', remaining: 2, period: 'month' });
});
afterEach(cleanup);

const open = async () => {
  render(<ExamRunner blueprintId="bp" questions={questions} durationMinutes={45} />);
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
};
const firstStem = () => screen.getByText(/^Câu hỏi q\d+$/).textContent;

describe('the order an exam is served in', () => {
  it('serves the questions in the order its seed gives, not the written one', async () => {
    localStorage.setItem('scipal-exam-order:bp', 'fixed');
    const first = arrangeQuestions(questions, null, 'fixed')[0]!.id;
    expect(first).not.toBe('q0');
    await open();
    expect(firstStem()).toBe(`Câu hỏi ${first}`);
  });

  it('serves the same order again when the page is opened again', async () => {
    await open();
    const before = firstStem();
    cleanup();
    await open();
    expect(firstStem()).toBe(before);
  });
});
