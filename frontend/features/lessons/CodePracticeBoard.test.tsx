// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicPracticeQuestion } from '@scipal/types';
import { CodePracticeBoard, problemTitle } from './CodePracticeBoard';

vi.mock('../../lib/theme/useShellDark', () => ({ useShellDark: () => false }));
const api = vi.hoisted(() => ({ solved: vi.fn(async () => [] as string[]) }));
vi.mock('./practiceApi', () => ({ fetchSolvedCode: api.solved, runCode: vi.fn(), submitCode: vi.fn() }));

const problem = (id: string, stem: string, difficulty = 1): PublicPracticeQuestion => ({
  id, type: 'code', difficulty,
  data: { stem: { vi: stem, en: stem }, input_spec: { vi: 'n', en: 'n' }, output_spec: { vi: '2n', en: '2n' }, time_limit_ms: 1000, memory_limit_mb: 128, starter: {}, samples: [] },
});
const list = [problem('a', 'Tổng hai số: cho a và b', 1), problem('b', 'Số nguyên tố. Kiểm tra n', 3)];
const t = (text: { vi: string }) => text.vi;
const board = (results = {}) => render(<CodePracticeBoard questions={list} answers={{}} results={results} onAnswer={() => {}} onResult={() => {}} t={t} />);

afterEach(cleanup);

describe('problemTitle', () => {
  it('takes the statement up to the first colon or full stop, and shortens a long one', () => {
    expect(problemTitle('Tổng hai số: cho a và b')).toBe('Tổng hai số');
    expect(problemTitle('x'.repeat(100))).toHaveLength(68);
  });
});

describe('CodePracticeBoard', () => {
  it('lists the problems with their XP and counts what the learner solved before', async () => {
    api.solved.mockResolvedValueOnce(['b']);
    board();
    expect(screen.getByText('Tổng hai số')).toBeTruthy();
    expect(screen.getByText('20 XP')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('1/2')).toBeTruthy());
    expect(screen.getByText('50/70')).toBeTruthy();
  });

  it('marks a problem solved in this visit', () => {
    board({ a: { correct: true } });
    expect(screen.getByRole('button', { name: /Bài 1: Tổng hai số, Dễ, đã giải/ })).toBeTruthy();
  });

  it('opens a problem at full width and goes back to the list', () => {
    board();
    fireEvent.click(screen.getByRole('button', { name: /Bài 2: Số nguyên tố/ }));
    expect(screen.getByRole('heading', { name: 'Số nguyên tố' })).toBeTruthy();
    expect(screen.getByText('Bài 2 / 2')).toBeTruthy();
    expect(screen.getByLabelText('Code của em')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bài trước' }));
    expect(screen.getByText('Bài 1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Danh sách bài' }));
    expect(screen.getByText('Bài lập trình')).toBeTruthy();
  });
});
