// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { WritingAnswer, wordCount } from './WritingAnswer';

const api = vi.hoisted(() => ({ feedback: vi.fn(), token: vi.fn() }));
vi.mock('./practiceApi', () => ({ writingFeedback: api.feedback }));
vi.mock('../../lib/session', () => ({ getAccessToken: api.token }));

const t = (o: { en: string; vi: string }) => o.vi;
const result = { correct: false, writing: { used: ['loop'], missing: ['condition'], sample_answer: 'A loop repeats code while a condition is true.' } };

/** A stand-in for the browser's speech recognition: the test says what was heard. */
class FakeRecognition {
  static last: FakeRecognition | null = null;
  lang = '';
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  hear(text: string) {
    this.onresult?.({ results: [[{ transcript: text }]] });
    this.onend?.();
  }
}

function renderAnswer(props: Partial<Parameters<typeof WritingAnswer>[0]> = {}) {
  const onChange = vi.fn();
  render(<WritingAnswer questionId="q1" value="" onChange={onChange} result={undefined} t={t} lang="vi" {...props} />);
  return { onChange };
}

beforeEach(() => {
  api.token.mockResolvedValue('token');
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  delete (window as { SpeechRecognition?: unknown }).SpeechRecognition;
  delete (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
  FakeRecognition.last = null;
});

describe('wordCount', () => {
  it('counts words, not spaces', () => {
    expect(wordCount('  A loop   repeats. ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});

describe('WritingAnswer', () => {
  it('is a labelled English text box with a word count', () => {
    renderAnswer({ value: 'A loop repeats' });
    const box = screen.getByLabelText('Viết câu trả lời bằng tiếng Anh');
    expect(box.tagName).toBe('TEXTAREA');
    expect(box.getAttribute('lang')).toBe('en');
    expect(box.getAttribute('maxLength')).toBe('1000');
    expect(screen.getByText('3 từ')).toBeTruthy();
    expect(countRawColors(document.body.innerHTML).total).toBe(0);
  });

  it('has no microphone where the browser cannot listen', () => {
    renderAnswer();
    expect(screen.queryByRole('button', { name: /Nói/ })).toBeNull();
  });

  it('listens in English and adds what it heard to the answer', async () => {
    (window as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition = FakeRecognition;
    const { onChange } = renderAnswer({ value: 'A loop' });
    fireEvent.click(await screen.findByRole('button', { name: 'Nói câu trả lời' }));
    expect(FakeRecognition.last!.lang).toBe('en-US');
    expect(FakeRecognition.last!.started).toBe(true);
    expect(screen.getByText('Đang nghe…')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dừng nghe' })).toBeTruthy();
    act(() => FakeRecognition.last!.hear('repeats code'));
    expect(onChange).toHaveBeenCalledWith('A loop repeats code');
    expect(screen.queryByText('Đang nghe…')).toBeNull();
  });

  it('says so when the microphone is blocked', async () => {
    (window as { SpeechRecognition?: unknown }).SpeechRecognition = FakeRecognition;
    renderAnswer();
    fireEvent.click(await screen.findByRole('button', { name: 'Nói câu trả lời' }));
    act(() => FakeRecognition.last!.onerror?.({ error: 'not-allowed' }));
    expect(screen.getByRole('status').textContent).toMatch(/micro/);
  });

  it('after checking, lists the key terms used and missing, then the sample answer', () => {
    renderAnswer({ value: 'A loop repeats.', result });
    expect(screen.getByText('Đã dùng').nextSibling?.textContent).toContain('loop');
    expect(screen.getByText('Còn thiếu').nextSibling?.textContent).toContain('condition');
    expect(screen.getByText(result.writing.sample_answer).getAttribute('lang')).toBe('en');
  });

  it('asks the Professor for comments and shows them', async () => {
    api.feedback.mockResolvedValue({ ok: true, data: { feedback: 'Em đã đúng ý. Viết lại: A loop repeats code.', remaining: 9000 } });
    renderAnswer({ value: 'A loop repeat code.', result });
    fireEvent.click(await screen.findByRole('button', { name: 'Nhờ Giáo sư nhận xét' }));
    expect(api.feedback).toHaveBeenCalledWith('q1', 'A loop repeat code.', 'vi');
    expect(await screen.findByText(/Em đã đúng ý/)).toBeTruthy();
  });

  it('shows the server message when the comment cannot be had', async () => {
    api.feedback.mockResolvedValue({ ok: false, status: 429, error: { vi: 'Em đã dùng hết token Giáo sư AI hôm nay.', en: 'x' } });
    renderAnswer({ value: 'A loop.', result });
    fireEvent.click(await screen.findByRole('button', { name: 'Nhờ Giáo sư nhận xét' }));
    expect(await screen.findByText('Em đã dùng hết token Giáo sư AI hôm nay.')).toBeTruthy();
  });

  it('a guest is asked to sign in instead', async () => {
    api.token.mockResolvedValue(undefined);
    renderAnswer({ value: 'A loop.', result });
    expect(await screen.findByText('Đăng nhập để Giáo sư AI nhận xét bài viết.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Nhờ Giáo sư nhận xét' })).toBeNull();
  });
});
