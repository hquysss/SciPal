// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPracticeQuestion } from '@scipal/types';
import { useState } from 'react';
import { PracticeSection, usePracticeState } from './PracticeSection';

vi.mock('../habit/habitApi', () => ({ useHabit: () => ({ habit: null, reload: async () => {} }) }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
const api = vi.hoisted(() => ({ check: vi.fn(), feedback: vi.fn() }));
vi.mock('./practiceApi', () => ({ checkPractice: api.check, writingFeedback: api.feedback }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => 'test-session' }));
const xp = vi.hoisted(() => ({ total: null as number | null }));
vi.mock('./useTotalXp', () => ({ useTotalXp: () => xp.total }));

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
    {visible && <PracticeSection lessonId="lesson-1" load={{ ok: true, questions: list }} state={practice.state} onAnswer={practice.onAnswer} onResult={practice.onResult} onQuestion={practice.onQuestion} onWritingFeedback={practice.onWritingFeedback} />}
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
    expect(api.check).toHaveBeenCalledWith('lesson-1', 'q1', { selected_option: 'a' });

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
    await waitFor(() => expect(api.check).toHaveBeenCalledWith('lesson-1', 'q2', { short_answer: '0,12' }));
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

describe('submitting the whole set', () => {
  it('checks every answered, unchecked question in one go', async () => {
    render(<Practice />);
    fireEvent.click(screen.getByRole('radio', { name: 'Hai' }));
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Nộp bài (2 câu)' }));
    await screen.findByText('Đúng 2/2');
    expect(api.check).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: 'Nộp bài (0 câu)' })).toHaveProperty('disabled', true);
    expect(screen.getByRole('button', { name: 'Câu 1: đúng' })).toBeTruthy();
  });

  it('shows the status of each question and jumps to it', () => {
    render(<Practice />);
    expect(screen.getByRole('button', { name: 'Câu 2: chưa làm' })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: 'Hai' }));
    expect(screen.getByRole('button', { name: 'Câu 1: đã làm, chưa kiểm tra' }).getAttribute('aria-current')).toBe('step');
    fireEvent.click(screen.getByRole('button', { name: 'Câu 2: chưa làm' }));
    expect(screen.getByText('Nhập kết quả.')).toBeTruthy();
  });
});

describe('results that count', () => {
  async function answerFirst(result: object) {
    api.check.mockResolvedValue(result);
    render(<Practice />);
    fireEvent.click(screen.getByRole('radio', { name: 'Hai' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra' }));
    });
  }

  it('sends the lesson with the answer, so an offline answer can be graded from its pack', async () => {
    await answerFirst({ ok: true, result: { correct: true } });
    expect(api.check).toHaveBeenCalledWith('lesson-1', 'q1', { selected_option: 'a' });
  });

  it('shows the provisional label and estimated XP for an offline result', async () => {
    await answerFirst({ ok: true, result: { correct: true }, provisional: { xp: 15, streak: 3 } });
    expect(screen.getByText(/Kết quả tạm · chờ đồng bộ/).textContent).toContain('+15 XP tạm tính');
    expect(screen.getByText(/Kết quả tạm · chờ đồng bộ/).textContent).toContain('chuỗi 3 ngày');
  });

  it('a PRACTICE_SYNCED event replaces it with the server result', async () => {
    await answerFirst({ ok: true, result: { correct: true }, provisional: { xp: 15, streak: null } });
    act(() => {
      window.dispatchEvent(new CustomEvent('scipal:practice-synced', { detail: [{ question_id: 'q1', status: 'ok', correct: false, xp_earned: 0, response: { selected_option: 'a' } }] }));
    });
    expect(screen.queryByText(/Kết quả tạm/)).toBeNull();
    expect(screen.getByText('Chưa đúng. Sửa câu trả lời rồi thử lại.')).toBeTruthy();
  });

  it('keeps the verdict of a later answer when the synced one is for the first answer', async () => {
    await answerFirst({ ok: true, result: { correct: true }, provisional: { xp: 0, streak: null } });
    act(() => {
      window.dispatchEvent(new CustomEvent('scipal:practice-synced', { detail: [{ question_id: 'q1', status: 'ok', correct: false, xp_earned: 0, response: { selected_option: 'b' } }] }));
    });
    expect(screen.queryByText(/Kết quả tạm/)).toBeNull();
    expect(screen.getByText('Đúng rồi!')).toBeTruthy();
  });

  it('shows +XP and the completed message from the server', async () => {
    await answerFirst({ ok: true, result: { correct: true, xp_earned: 10, new_streak: 2, lesson_completed: true } });
    expect(screen.getByText('+10 XP')).toBeTruthy();
    expect(screen.getByText('Bạn đã hoàn thành bài này.')).toBeTruthy();
    expect(screen.getByText('Phiên này: +10 XP')).toBeTruthy();
  });

  it('never counts provisional XP in the session', async () => {
    await answerFirst({ ok: true, result: { correct: true, xp_earned: 10 }, provisional: { xp: 10, streak: null } });
    expect(screen.getByText('Phiên này: +0 XP')).toBeTruthy();
  });
});

describe('session feedback', () => {
  afterEach(() => {
    xp.total = null;
  });
  const three: PublicPracticeQuestion[] = ['q1', 'q2', 'q3'].map((id) => ({ id, type: 'short', difficulty: 1, data: { stem: { vi: `Câu ${id}`, en: id } } }));
  async function answer() {
    fireEvent.change(screen.getByPlaceholderText('Câu trả lời của bạn'), { target: { value: '4' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    });
  }

  it('shows the streak from three first-try right answers and drops it on a wrong one', async () => {
    api.check.mockResolvedValue({ ok: true, result: { correct: true, xp_earned: 10 } });
    render(<Practice list={three} />);
    for (let i = 0; i < 3; i++) {
      await answer();
      if (i < 2) fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    }
    expect(screen.getByText('Chuỗi đúng ×3')).toBeTruthy();
    api.check.mockResolvedValue({ ok: true, result: { correct: false } });
    fireEvent.change(screen.getByPlaceholderText('Câu trả lời của bạn'), { target: { value: '5' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    });
    expect(screen.queryByText(/Chuỗi đúng ×/)).toBeNull();
  });

  it('opens the level-up dialog once when server XP crosses a level, Escape closes it', async () => {
    xp.total = 95;
    api.check.mockResolvedValue({ ok: true, result: { correct: true, xp_earned: 10 } });
    render(<Practice list={three} />);
    await answer();
    expect(screen.getByRole('dialog', { name: 'Lên cấp!' })).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Câu tiếp' }));
    await answer();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not open the level-up dialog for a provisional result', async () => {
    xp.total = 95;
    api.check.mockResolvedValue({ ok: true, result: { correct: true, xp_earned: 10 }, provisional: { xp: 10, streak: null } });
    render(<Practice list={three} />);
    await answer();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
