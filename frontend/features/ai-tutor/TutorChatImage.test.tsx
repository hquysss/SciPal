// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TutorChatView } from './TutorChat';
import { prepareTutorImage } from './tutorImage';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./tutorImage', async (importActual) => ({ ...(await importActual<typeof import('./tutorImage')>()), prepareTutorImage: vi.fn() }));

const image = { mime: 'image/jpeg' as const, data: 'QUJD', preview: 'blob:preview-1' };
const base = { messages: [], streaming: false, remaining: 12, error: null, limitReached: false, level: 'upper_secondary' as const, onStop: () => {}, onRetry: () => {} };
const picture = () => new File(['x'], 'bai.png', { type: 'image/png' });
const send = () => screen.getByLabelText('Gửi') as HTMLButtonElement;
const attach = () => screen.getByLabelText('Đính kèm ảnh') as HTMLInputElement;
const choose = (file = picture()) => fireEvent.change(attach(), { target: { files: [file] } });

beforeEach(() => {
  vi.mocked(prepareTutorImage).mockResolvedValue({ ok: true, image });
  vi.stubGlobal('URL', Object.assign(URL, { revokeObjectURL: vi.fn() }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('TutorChatView with a picture', () => {
  it('previews the chosen picture, and a picture alone can be sent', async () => {
    const onSend = vi.fn();
    render(<TutorChatView {...base} onSend={onSend} />);
    expect(send().disabled).toBe(true);
    choose();
    expect((await screen.findByAltText('Ảnh đính kèm')).getAttribute('src')).toBe('blob:preview-1');
    expect(send().disabled).toBe(false);
    fireEvent.click(screen.getByLabelText('Gửi'));
    expect(onSend).toHaveBeenCalledWith('', image);
    // The picture moves to the message; the composer is clear again.
    expect(screen.queryByAltText('Ảnh đính kèm')).toBeNull();
  });

  it('sends what was written with the picture, and only the text when there is no picture', async () => {
    const onSend = vi.fn();
    render(<TutorChatView {...base} onSend={onSend} />);
    const box = screen.getByLabelText('Câu hỏi của em');
    fireEvent.change(box, { target: { value: 'Giải câu 3' } });
    choose();
    await screen.findByAltText('Ảnh đính kèm');
    fireEvent.click(screen.getByLabelText('Gửi'));
    expect(onSend).toHaveBeenLastCalledWith('Giải câu 3', image);
    fireEvent.change(box, { target: { value: 'Hỏi thường' } });
    fireEvent.click(screen.getByLabelText('Gửi'));
    // Exactly one argument: nothing but the text.
    expect(onSend.mock.calls.at(-1)).toEqual(['Hỏi thường']);
  });

  it('takes the picture back out, and releases its preview', async () => {
    render(<TutorChatView {...base} onSend={vi.fn()} />);
    choose();
    await screen.findByAltText('Ảnh đính kèm');
    fireEvent.click(screen.getByLabelText('Bỏ ảnh'));
    expect(screen.queryByAltText('Ảnh đính kèm')).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
    expect(send().disabled).toBe(true);
  });

  it('shows the reason when a file is refused, and keeps no preview', async () => {
    vi.mocked(prepareTutorImage).mockResolvedValue({ ok: false, error: { vi: 'Chỉ nhận ảnh PNG, JPG hoặc WEBP.', en: 'Only PNG, JPG or WEBP pictures.' } });
    render(<TutorChatView {...base} onSend={vi.fn()} />);
    choose(new File(['x'], 'a.gif', { type: 'image/gif' }));
    expect(await screen.findByText('Chỉ nhận ảnh PNG, JPG hoặc WEBP.')).not.toBeNull();
    expect(screen.queryByAltText('Ảnh đính kèm')).toBeNull();
    expect(send().disabled).toBe(true);
  });

  it('holds the send button while the picture is being prepared', async () => {
    let finish: (value: Awaited<ReturnType<typeof prepareTutorImage>>) => void = () => {};
    vi.mocked(prepareTutorImage).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<TutorChatView {...base} onSend={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Câu hỏi của em'), { target: { value: 'Hỏi' } });
    choose();
    expect(await screen.findByText('Đang chuẩn bị ảnh…')).not.toBeNull();
    expect(send().disabled).toBe(true);
    finish({ ok: true, image });
    await waitFor(() => expect(send().disabled).toBe(false));
  });

  it('offers no picture button while an answer is streaming, and disables it when the allowance is used up', () => {
    const { rerender } = render(<TutorChatView {...base} onSend={vi.fn()} />);
    expect(attach().disabled).toBe(false);
    rerender(<TutorChatView {...base} onSend={vi.fn()} streaming />);
    expect(screen.queryByLabelText('Đính kèm ảnh')).toBeNull();
    rerender(<TutorChatView {...base} onSend={vi.fn()} limitReached remaining={0} />);
    expect(attach().disabled).toBe(true);
  });
});
