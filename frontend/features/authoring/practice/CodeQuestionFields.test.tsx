// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyQuestion, type QuestionDraft } from './questionDraft';
import { CodeQuestionFields } from './CodeQuestionFields';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
const api = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock('./api', () => ({ verifyCode: api.verify }));

function Harness({ onChange }: { onChange: (data: QuestionDraft['data']) => void }) {
  const draft = emptyQuestion('code');
  return <CodeQuestionFields data={draft.data} lang="vi" onData={(patch) => onChange({ ...draft.data, ...patch })} />;
}

beforeEach(() => api.verify.mockReset());
afterEach(cleanup);

describe('CodeQuestionFields', () => {
  it('adds a test, and marks one as an example', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm test' }));
    expect(onChange.mock.calls.at(-1)![0].tests).toHaveLength(2);
    fireEvent.click(screen.getByLabelText('Test 1 là ví dụ mẫu'));
    expect(onChange.mock.calls.at(-1)![0].tests[0].sample).toBe(false);
  });

  it('keeps at least one test', () => {
    render(<Harness onChange={() => {}} />);
    expect((screen.getByRole('button', { name: 'Bỏ test 1' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('checks the test set with a model solution and shows every test, hidden ones included', async () => {
    api.verify.mockResolvedValue({ ok: true, data: { status: 'WA', tests: [{ verdict: 'AC', time_ms: 5, memory_kb: 900, stdout: '4\n', expected: '4\n' }] } });
    render(<Harness onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Lời giải mẫu'), { target: { value: 'print(4)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra bộ test' }));
    await waitFor(() => expect(screen.getByText('1/1 test đạt')).toBeTruthy());
    expect(api.verify).toHaveBeenCalledWith(expect.objectContaining({ language: 'python', source: 'print(4)', time_limit_ms: 2000, memory_limit_mb: 128, tests: expect.any(Array) }));
  });

  it('shows the server message when the check cannot run', async () => {
    api.verify.mockResolvedValue({ ok: false, status: 503, error: { vi: 'Chấm code chưa được bật.', en: 'Off' } });
    render(<Harness onChange={() => {}} />);
    fireEvent.change(screen.getByLabelText('Lời giải mẫu'), { target: { value: 'print(4)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra bộ test' }));
    expect(await screen.findByText('Chấm code chưa được bật.')).toBeTruthy();
  });
});
