// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPracticeQuestion } from '@scipal/types';
import { useState } from 'react';
import { PracticeSection, usePracticeState } from './PracticeSection';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
const api = vi.hoisted(() => ({ check: vi.fn(), feedback: vi.fn() }));
vi.mock('./practiceApi', () => ({ checkPractice: api.check, writingFeedback: api.feedback }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => 'test-session' }));

const questions: PublicPracticeQuestion[] = [
  { id: 'q1', type: 'mc', difficulty: 1, data: { stem: { vi: 'Chọn số chẵn.', en: 'Choose the even number.' }, options: [{ id: 'a', text: { vi: 'Hai', en: 'Two' } }, { id: 'b', text: { vi: 'Ba', en: 'Three' } }] } },
  { id: 'q2', type: 'short', difficulty: 1, data: { stem: { vi: 'Nhập kết quả.', en: 'Enter the result.' } } },
];

const writing: PublicPracticeQuestion = { id: 'writing', type: 'writing', difficulty: 1, data: { stem: { vi: 'Giải thích vòng lặp.', en: 'Explain a loop.' } } };

function Practice({ list = questions }: { list?: PublicPracticeQuestion[] }) {
  const practice = usePracticeState();
  const [visible, setVisible] = useState(true);
  return <>
    <button onClick={() => setVisible(!visible)}>{visible ? 'Bài học' : 'Tự luyện'}</button>
    {visible && <PracticeSection load={{ ok: true, questions: list }} state={practice.state} onAnswer={practice.onAnswer} onResult={practice.onResult} onQuestion={practice.onQuestion} onWritingFeedback={practice.onWritingFeedback} />}
  </>;
}

afterEach(cleanup);
beforeEach(() => {
  api.check.mockReset();
  api.check.mockResolvedValue({ ok: true, result: { correct: true } });
  api.feedback.mockReset();
});

describe('writing feedback across questions', () => {
  async function ask() {
    api.check.mockResolvedValue({ ok: true, result: { correct: true, writing: { used: ['loop'], missing: [], sample_answer: 'A loop repeats.' } } });
    render(<Practice list={[writing, questions[1]!]} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'A loop repeats.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nhờ Giáo sư nhận xét' }));
  }

  it('keeps completed comments when returning to the writing question', async () => {
    api.feedback.mockResolvedValue({ ok: true, data: { feedback: 'Good explanation.', remaining: null } });
    await ask();
    await screen.findByText('Good explanation.');
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Câu trước' }));
    expect(screen.getByText('Good explanation.')).toBeTruthy();
    expect(api.feedback).toHaveBeenCalledTimes(1);
  });

  it('keeps pending requests and saves a reply arriving on another question', async () => {
    let finish: ((value: { ok: true; data: { feedback: string; remaining: null } }) => void) | undefined;
    api.feedback.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await ask();
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    fireEvent.click(screen.getByRole('button', { name: 'Câu trước' }));
    expect((await screen.findByRole('button', { name: 'Giáo sư đang đọc bài…' })).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    await act(async () => { finish?.({ ok: true, data: { feedback: 'Good explanation.', remaining: null } }); });
    fireEvent.click(screen.getByRole('button', { name: 'Câu trước' }));
    expect(screen.getByText('Good explanation.')).toBeTruthy();
    expect(api.feedback).toHaveBeenCalledTimes(1);
  });

  it('does not let a late reply to the old draft replace newer comments', async () => {
    let finish: ((value: { ok: true; data: { feedback: string; remaining: null } }) => void) | undefined;
    api.feedback.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    api.feedback.mockResolvedValueOnce({ ok: true, data: { feedback: 'Comments on the new draft.', remaining: null } });
    await ask();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Another loop example.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Nhờ Giáo sư nhận xét' }));
    await screen.findByText('Comments on the new draft.');
    await act(async () => { finish?.({ ok: true, data: { feedback: 'Comments on the old draft.', remaining: null } }); });
    expect(screen.getByText('Comments on the new draft.')).toBeTruthy();
    expect(screen.queryByText('Comments on the old draft.')).toBeNull();
  });
});

describe('one question at a time', () => {
  it('keeps answers, server verdicts, and option order when navigating back', async () => {
    render(<Practice />);
    expect(screen.getByRole('button', { name: 'Câu trước' }).hasAttribute('disabled')).toBe(true);
    const optionOrder = screen.getAllByRole('radio').map((option) => option.closest('label')?.textContent);
    fireEvent.click(screen.getByRole('radio', { name: 'Hai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    await screen.findByText('Đúng rồi!');
    expect(api.check).toHaveBeenCalledWith('q1', { selected_option: 'a' });

    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    expect(screen.queryByText('Chọn số chẵn.')).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Câu trả lời của bạn' }), { target: { value: '0,12' } });
    expect(screen.getByRole('button', { name: 'Câu tiếp' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Câu trước' }));

    expect(screen.getByRole('radio', { name: 'Hai' }).hasAttribute('checked')).toBe(true);
    expect(screen.getByText('Đúng rồi!')).toBeTruthy();
    expect(screen.getAllByRole('radio').map((option) => option.closest('label')?.textContent)).toEqual(optionOrder);
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('0,12');
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' });
    await waitFor(() => expect(api.check).toHaveBeenCalledWith('q2', { short_answer: '0,12' }));
    await waitFor(() => expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2'));
  });

  it('keeps the current question and draft when returning from the lesson', () => {
    render(<Practice />);
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bài học', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Tự luyện', exact: true }));
    expect(screen.getByText('Câu 2 / 2')).toBeTruthy();
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('20');
  });
});
