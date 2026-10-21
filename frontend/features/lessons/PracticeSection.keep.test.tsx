// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicPracticeQuestion } from '@scipal/types';
import { PracticeSection, usePracticeState } from './PracticeSection';
import { clearPacks } from '../../lib/pwa/practicePacks';
import { loadPracticeDraft } from '../../lib/pwa/practiceDraft';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
const api = vi.hoisted(() => ({ check: vi.fn(), feedback: vi.fn() }));
vi.mock('./practiceApi', () => ({ checkPractice: api.check, writingFeedback: api.feedback }));
vi.mock('../../lib/session', () => ({ getAccessToken: async () => 'test-session' }));

const questions: PublicPracticeQuestion[] = [
  { id: 'q1', type: 'mc', difficulty: 1, data: { stem: { vi: 'Chọn số chẵn.', en: 'Choose the even number.' }, options: [{ id: 'a', text: { vi: 'Hai', en: 'Two' } }, { id: 'b', text: { vi: 'Ba', en: 'Three' } }] } },
  { id: 'q2', type: 'short', difficulty: 1, data: { stem: { vi: 'Nhập kết quả.', en: 'Enter the result.' } } },
];

function Practice() {
  const practice = usePracticeState('lesson-1');
  return <PracticeSection lessonId="lesson-1" load={{ ok: true, questions }} state={practice.state} onAnswer={practice.onAnswer} onResult={practice.onResult} onQuestion={practice.onQuestion} onWritingFeedback={practice.onWritingFeedback} />;
}

beforeEach(() => {
  localStorage.clear();
  api.check.mockReset();
  api.check.mockResolvedValue({ ok: true, result: { correct: true } });
});
afterEach(cleanup);

const pickTwo = () => fireEvent.click(screen.getByRole('radio', { name: 'Hai' }));

describe('answers not handed in yet', () => {
  it('stay on this device and come back on the next visit', async () => {
    render(<Practice />);
    pickTwo();
    await waitFor(() => expect(loadPracticeDraft('lesson-1')).toEqual({ q1: { selected_option: 'a' } }));
    cleanup();
    render(<Practice />);
    await waitFor(() => expect((screen.getByRole('radio', { name: 'Hai' }) as HTMLInputElement).checked).toBe(true));
  });

  it('are removed from the draft once they were checked', async () => {
    render(<Practice />);
    pickTwo();
    await waitFor(() => expect(loadPracticeDraft('lesson-1')).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra', exact: true }));
    await screen.findByText('Đúng rồi!');
    await waitFor(() => expect(loadPracticeDraft('lesson-1')).toBeNull());
  });

  it('are wiped from the device when the learner signs out', async () => {
    render(<Practice />);
    pickTwo();
    await waitFor(() => expect(loadPracticeDraft('lesson-1')).not.toBeNull());
    clearPacks();
    expect(loadPracticeDraft('lesson-1')).toBeNull();
  });

  it('are counted in a reminder, which hands them in', async () => {
    render(<Practice />);
    expect(screen.queryByText(/chưa nộp/)).toBeNull();
    pickTwo();
    expect(await screen.findByText(/Còn 1 câu đã làm chưa nộp/)).toBeTruthy();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Nộp 1 câu ngay' }));
    });
    await waitFor(() => expect(api.check).toHaveBeenCalledWith('lesson-1', 'q1', { selected_option: 'a' }));
    await waitFor(() => expect(screen.queryByText(/chưa nộp/)).toBeNull());
  });

  it('make the browser ask before the page is closed, and only while there are some', async () => {
    render(<Practice />);
    const none = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(none);
    expect(none.defaultPrevented).toBe(false);
    pickTwo();
    await screen.findByText(/chưa nộp/);
    const some = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(some);
    expect(some.defaultPrevented).toBe(true);
  });
});
