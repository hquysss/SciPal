// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { CodeAnswer } from './CodeAnswer';
import { CodeResults } from './CodeResults';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
vi.mock('../../lib/theme/useShellDark', () => ({ useShellDark: () => false }));
const api = vi.hoisted(() => ({ run: vi.fn(), submit: vi.fn() }));
vi.mock('./practiceApi', () => ({ runCode: api.run, submitCode: api.submit }));

const question = {
  id: 'q5', type: 'code', difficulty: 1,
  data: {
    stem: { vi: 'Nhân đôi một số.', en: 'Double a number.' },
    input_spec: { vi: 'Một số nguyên n.', en: 'One integer n.' },
    output_spec: { vi: 'In 2n.', en: 'Print 2n.' },
    time_limit_ms: 2000, memory_limit_mb: 128,
    starter: { python: 'n = int(input())\n', cpp: '#include <iostream>\nint main() {}\n' },
    samples: [{ input: '2\n', expected: '4\n' }],
  },
} as PublicPracticeQuestion;
const t = (text: { vi: string }) => text.vi;
const passed: PracticeCheckResult = { correct: true, code: { status: 'AC', tests: [{ verdict: 'AC', time_ms: 12, memory_kb: 3000, stdout: '4\n', expected: '4\n' }] } };

function renderAnswer(props: { answer?: PracticeResponse; result?: PracticeCheckResult; onAnswer?: (a: PracticeResponse) => void; onResult?: (r: PracticeCheckResult, c: PracticeResponse | undefined) => void } = {}) {
  const view = render(<CodeAnswer question={question} answer={props.answer} result={props.result} onAnswer={props.onAnswer ?? (() => {})} onResult={props.onResult ?? (() => {})} t={t} />);
  const rerender = (next: Partial<typeof props>) =>
    view.rerender(<CodeAnswer question={question} answer={next.answer ?? props.answer} result={next.result ?? props.result} onAnswer={props.onAnswer ?? (() => {})} onResult={props.onResult ?? (() => {})} t={t} />);
  return { ...view, rerender };
}

beforeEach(() => {
  api.run.mockReset();
  api.submit.mockReset();
});
afterEach(cleanup);

describe('CodeAnswer', () => {
  it('shows the statement, the limits, the example and the starter code', () => {
    renderAnswer();
    expect(screen.getByText('Một số nguyên n.')).toBeTruthy();
    expect(screen.getByText(/2000 ms/)).toBeTruthy();
    expect((screen.getByLabelText('Code của em') as HTMLTextAreaElement).value).toBe('n = int(input())\n');
  });

  it('loads the starter of the other language, keeping the draft of the first', () => {
    const onAnswer = vi.fn();
    renderAnswer({ onAnswer, answer: { code: { language: 'python', source: 'print(1)' } } });
    fireEvent.change(screen.getByLabelText('Ngôn ngữ lập trình'), { target: { value: 'cpp' } });
    expect(onAnswer).toHaveBeenLastCalledWith({ code: { language: 'cpp', source: '#include <iostream>\nint main() {}\n' } });
  });

  it('reads a small file into the editor and refuses a large one', async () => {
    const onAnswer = vi.fn();
    renderAnswer({ onAnswer });
    const input = screen.getByLabelText('Tải file code') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(['print(2)'], 'a.py', { type: 'text/plain' })] } });
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith({ code: { language: 'python', source: 'print(2)' } }));
    onAnswer.mockClear();
    fireEvent.change(input, { target: { files: [new File(['x'.repeat(70_000)], 'big.py')] } });
    expect(await screen.findByText(/quá lớn/)).toBeTruthy();
    expect(onAnswer).not.toHaveBeenCalled();
  });

  it('submits once, even if the button is pressed twice, and reports the verdict', async () => {
    let finish!: (v: unknown) => void;
    api.submit.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onResult = vi.fn();
    const answer = { code: { language: 'python' as const, source: 'print(1)' } };
    renderAnswer({ answer, onResult });
    const button = screen.getByRole('button', { name: 'Nộp bài' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(api.submit).toHaveBeenCalledTimes(1);
    expect((screen.getByRole('button', { name: 'Đang chấm…' }) as HTMLButtonElement).disabled).toBe(true);
    finish({ ok: true, result: passed });
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(passed, answer));
  });

  it('drops a verdict that arrives after the code was changed', async () => {
    let finish!: (v: unknown) => void;
    api.submit.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const onResult = vi.fn();
    const answer = { code: { language: 'python' as const, source: 'print(1)' } };
    const view = renderAnswer({ answer, onResult });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
    view.rerender({ answer: { code: { language: 'python', source: 'print(2)' } } });
    finish({ ok: true, result: passed });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Nộp bài' })).toBeTruthy());
    expect(onResult).not.toHaveBeenCalled();
  });

  it('invites a visitor to sign in', async () => {
    api.submit.mockResolvedValue({ ok: false, signIn: true, error: { vi: 'Đăng nhập để chạy và nộp code.', en: 'Sign in' } });
    renderAnswer({ answer: { code: { language: 'python', source: 'print(1)' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
    const link = await screen.findByRole('link', { name: /Đăng nhập/ });
    expect(link.getAttribute('href')).toContain('/login');
  });

  it('runs the code on the typed input and shows the output', async () => {
    api.run.mockResolvedValue({ ok: true, run: { status: 'AC', stdout: '6\n', stderr: '', time_ms: 5, memory_kb: 100 } });
    renderAnswer({ answer: { code: { language: 'python', source: 'print(6)' } } });
    fireEvent.change(screen.getByLabelText('Dữ liệu vào để chạy thử'), { target: { value: '3\n' } });
    fireEvent.click(screen.getByRole('button', { name: 'Chạy thử' }));
    expect(await screen.findByText('6')).toBeTruthy();
    expect(api.run).toHaveBeenCalledWith('q5', { language: 'python', source: 'print(6)' }, '3\n');
  });
});

describe('CodeResults', () => {
  it('names each verdict in words and keeps hidden tests closed', () => {
    render(
      <CodeResults
        t={t}
        result={{
          status: 'WA',
          tests: [
            { verdict: 'AC', time_ms: 10, memory_kb: 1000, stdout: '4\n', expected: '4\n' },
            { verdict: 'WA', time_ms: 11, memory_kb: 1000 },
            { verdict: 'TLE', time_ms: 2000, memory_kb: 1000 },
          ],
        }}
      />,
    );
    expect(screen.getByText('1/3 test đạt')).toBeTruthy();
    expect(screen.getByText('Đạt')).toBeTruthy();
    expect(screen.getAllByText('Sai kết quả').length).toBeGreaterThan(0);
    expect(screen.getByText('Quá thời gian')).toBeTruthy();
    expect(screen.getAllByText(/\(ẩn\)/)).toHaveLength(2);
    expect(screen.queryByText('Output của em')).toBeNull();
  });

  it('shows what an example test printed against what it should print', () => {
    render(<CodeResults t={t} result={{ status: 'WA', tests: [{ verdict: 'WA', time_ms: 5, memory_kb: 900, stdout: '5\n', expected: '4\n' }] }} />);
    expect(screen.getByText('Output của em')).toBeTruthy();
    expect(screen.getByText('Kết quả đúng')).toBeTruthy();
  });

  it('shows the compiler message', () => {
    render(<CodeResults t={t} result={{ status: 'CE', compile_message: 'error: expected ;', tests: [{ verdict: 'CE', time_ms: 0, memory_kb: 0 }] }} />);
    expect(screen.getByText('error: expected ;')).toBeTruthy();
  });
});
