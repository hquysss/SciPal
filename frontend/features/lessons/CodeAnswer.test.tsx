// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeCheckResult, PracticeResponse, PublicPracticeQuestion } from '@scipal/types';
import { CodeAnswer } from './CodeAnswer';
import { CodeResults } from './CodeResults';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
vi.mock('../../lib/theme/useShellDark', () => ({ useShellDark: () => false }));
const api = vi.hoisted(() => ({ run: vi.fn(), submit: vi.fn(), quota: vi.fn() }));
vi.mock('./practiceApi', () => ({ runCode: api.run, submitCode: api.submit, fetchCodeQuota: api.quota }));

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
  api.quota.mockReset();
  api.quota.mockResolvedValue(null);
});
afterEach(cleanup);

describe('CodeAnswer', () => {
  it('shows the statement, the limits, the example and the starter code', () => {
    renderAnswer();
    expect(screen.getByText('Một số nguyên n.')).toBeTruthy();
    expect(screen.getByText(/2000 ms/)).toBeTruthy();
    expect((screen.getByLabelText('Code của bạn') as HTMLTextAreaElement).value).toBe('n = int(input())\n');
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

  it('shows where judging happens while it runs, then moves to the fresh verdict', async () => {
    const scrolled: Element[] = [];
    Element.prototype.scrollIntoView = function (this: Element) { scrolled.push(this); };
    let finish!: (v: unknown) => void;
    api.submit.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const answer = { code: { language: 'python' as const, source: 'print(1)' } };
    const onResult = vi.fn();
    const view = renderAnswer({ answer, onResult, result: passed });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
    const judging = screen.getByRole('region', { name: 'Đang chấm bài' });
    expect(judging.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText('Đang gửi code')).toBeTruthy();
    expect(screen.getByText('Đang chạy trên bộ test').closest('li')!.getAttribute('aria-current')).toBe('step');
    // The old verdict is hidden so it cannot pass for the new one.
    expect(screen.queryByRole('region', { name: 'Kết quả chấm' })).toBeNull();
    await waitFor(() => expect(scrolled.length).toBeGreaterThan(0));
    // Live progress: the count, then each test as the judge finishes it.
    const onProgress = api.submit.mock.calls[0]![2] as (p: unknown) => void;
    act(() => {
      onProgress({ type: 'start', total: 2 });
      onProgress({ type: 'test', index: 1, verdict: 'WA', time_ms: 3 });
    });
    expect(screen.getByText('Đã chấm 1/2 test')).toBeTruthy();
    expect(screen.getByText('1 chưa đạt')).toBeTruthy();
    expect(screen.getByText('1 đang chạy')).toBeTruthy();
    expect(screen.getByText('Đang chạy test')).toBeTruthy();
    act(() => onProgress({ type: 'test', index: 0, verdict: 'AC', time_ms: 2 }));
    expect(screen.getByText('Đang tổng hợp kết quả')).toBeTruthy();
    finish({ ok: true, result: passed });
    await waitFor(() => expect(onResult).toHaveBeenCalled());
    view.rerender({ answer, result: { ...passed } });
    const heading = await screen.findByRole('heading', { name: /Đã chấm xong:\s*Đạt/ });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.queryByRole('region', { name: 'Đang chấm bài' })).toBeNull();
  });

  it('shows the runs left today, reads them again after a submit, and stops submitting at none', async () => {
    const part = (used: number, limit: number) => ({ used, limit, site_full: false });
    api.quota.mockResolvedValueOnce({ submit: part(3, 20), run: part(10, 50), resets_at: '2026-10-20T17:00:00Z' });
    api.submit.mockResolvedValue({ ok: true, result: passed });
    const view = renderAnswer({ answer: { code: { language: 'python', source: 'print(1)' } } });
    expect(await screen.findByRole('progressbar', { name: 'Nộp bài' })).toBeTruthy();
    expect(screen.getByText(/^17\/20/)).toBeTruthy();
    expect(screen.getByText(/^40\/50/)).toBeTruthy();
    api.quota.mockResolvedValueOnce({ submit: part(20, 20), run: part(11, 50), resets_at: '2026-10-20T17:00:00Z' });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài' }));
    await waitFor(() => expect(api.quota).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/^0\/20/)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Nộp bài' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Chạy thử' }) as HTMLButtonElement).disabled).toBe(false);
    view.unmount();
  });

  it('shows no bar for a visitor', async () => {
    renderAnswer();
    await waitFor(() => expect(api.quota).toHaveBeenCalled());
    expect(screen.queryByRole('region', { name: 'Lượt còn lại hôm nay' })).toBeNull();
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
    expect(screen.queryByText('Output của bạn')).toBeNull();
  });

  it('shows what an example test printed against what it should print', () => {
    render(<CodeResults t={t} result={{ status: 'WA', tests: [{ verdict: 'WA', time_ms: 5, memory_kb: 900, stdout: '5\n', expected: '4\n' }] }} />);
    expect(screen.getByText('Output của bạn')).toBeTruthy();
    expect(screen.getByText('Kết quả đúng')).toBeTruthy();
  });

  it('shows the compiler message', () => {
    render(<CodeResults t={t} result={{ status: 'CE', compile_message: 'error: expected ;', tests: [{ verdict: 'CE', time_ms: 0, memory_kb: 0 }] }} />);
    expect(screen.getByText('error: expected ;')).toBeTruthy();
  });
});

describe('XP on the verdict', () => {
  it('shows the XP the server gave for a first solve', () => {
    render(<CodeResults t={t} xpEarned={35} result={{ status: 'AC', tests: [{ verdict: 'AC', time_ms: 1, memory_kb: 1, stdout: '1', expected: '1' }] }} />);
    expect(screen.getByText('+35 XP')).toBeTruthy();
  });
  it('shows no XP when none was given', () => {
    render(<CodeResults t={t} xpEarned={0} result={{ status: 'AC', tests: [{ verdict: 'AC', time_ms: 1, memory_kb: 1 }] }} />);
    expect(screen.queryByText(/XP/)).toBeNull();
  });
});
