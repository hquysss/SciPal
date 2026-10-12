// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPaneView } from './ChatPane';
import { mergeMessages } from './useChatRoom';
import type { ChatMessage } from './chatApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

afterEach(cleanup);

const msg = (id: string, sender: string, at: string, body = `tin ${id}`, image_url: string | null = null): ChatMessage => ({
  id, sender_id: sender, sender_name: `Tên ${sender}`, body, created_at: at, image_url,
});

describe('mergeMessages', () => {
  it('drops duplicate ids, sorts oldest first and keeps the newest 200', () => {
    const a = msg('a', 'u1', '2026-10-12T10:00:02Z');
    const b = msg('b', 'u2', '2026-10-12T10:00:01Z');
    expect(mergeMessages([a], [b, a]).map((m) => m.id)).toEqual(['b', 'a']);
    const many = Array.from({ length: 205 }, (_, i) => msg(`m${i}`, 'u1', new Date(Date.UTC(2026, 9, 12, 10, 0, i)).toISOString()));
    const merged = mergeMessages([], many);
    expect(merged).toHaveLength(200);
    expect(merged[0].id).toBe('m5');
    expect(merged[199].id).toBe('m204');
  });
});

const handlers = () => ({ onSend: vi.fn().mockResolvedValue(true), onReport: vi.fn(), onBlock: vi.fn() });

describe('ChatPaneView', () => {
  it('is a log; others show their name and get Báo cáo and Chặn, your own do not', () => {
    render(<ChatPaneView messages={[msg('1', 'me', '2026-10-12T10:00:00Z'), msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...handlers()} />);
    expect(screen.getByRole('log')).toBeTruthy();
    expect(screen.getByText('Tên them')).toBeTruthy();
    expect(screen.queryByText('Tên me')).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Báo cáo' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Chặn' })).toHaveLength(1);
  });

  it('sends the trimmed text on submit, keeps the box locked while empty, and clears after sending', async () => {
    const h = handlers();
    render(<ChatPaneView messages={[]} meId="me" {...h} />);
    const box = screen.getByRole('textbox') as HTMLInputElement;
    const send = screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(box, { target: { value: '  chào cả nhà  ' } });
    expect(send.disabled).toBe(false);
    fireEvent.submit(box.closest('form')!);
    expect(h.onSend).toHaveBeenCalledWith('chào cả nhà');
    await waitFor(() => expect(box.value).toBe(''));
  });

  it('keeps what you typed when sending fails', async () => {
    const h = { ...handlers(), onSend: vi.fn().mockResolvedValue(false) };
    render(<ChatPaneView messages={[]} meId="me" {...h} />);
    const box = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'xin chào' } });
    fireEvent.submit(box.closest('form')!);
    await waitFor(() => expect(h.onSend).toHaveBeenCalled());
    expect(box.value).toBe('xin chào');
  });

  it('reports with one of the fixed reasons', () => {
    const h = handlers();
    render(<ChatPaneView messages={[msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spam' }));
    expect(h.onReport).toHaveBeenCalledWith('2', 'Spam');
  });

  it('blocks only on the second click, since there is no undo', () => {
    const h = handlers();
    render(<ChatPaneView messages={[msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Chặn' }));
    expect(h.onBlock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Chắc chắn chặn/ }));
    expect(h.onBlock).toHaveBeenCalledWith('them');
  });
});

describe('pictures in ChatPaneView', () => {
  const file = (name: string, type: string, size = 100) => new File([new Uint8Array(size)], name, { type });
  const pick = (f: File) => fireEvent.change(screen.getByLabelText('Đính kèm ảnh'), { target: { files: [f] } });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows a picture in the bubble as a link to the full size, only for https URLs', () => {
    const good = msg('1', 'them', '2026-10-12T10:00:00Z', '', 'https://m.test/chat/u/a.png');
    const bad = msg('2', 'them', '2026-10-12T10:00:01Z', 'x', 'javascript:alert(1)');
    render(<ChatPaneView messages={[good, bad]} meId="me" {...handlers()} />);
    const pictures = screen.getAllByRole('img');
    expect(pictures).toHaveLength(1);
    expect(pictures[0].getAttribute('src')).toBe('https://m.test/chat/u/a.png');
    const link = pictures[0].closest('a')!;
    expect(link.getAttribute('href')).toBe('https://m.test/chat/u/a.png');
    expect(link.getAttribute('rel')).toContain('noopener');
  });

  it('offers the attach button only where pictures are allowed', () => {
    const { rerender } = render(<ChatPaneView messages={[]} meId="me" {...handlers()} />);
    expect(screen.queryByLabelText('Đính kèm ảnh')).toBeNull();
    rerender(<ChatPaneView messages={[]} meId="me" {...handlers()} onSendImage={vi.fn().mockResolvedValue(true)} />);
    expect(screen.getByLabelText('Đính kèm ảnh')).toBeTruthy();
  });

  it('previews the chosen picture, sends it with the trimmed caption, then clears', async () => {
    const onSendImage = vi.fn().mockResolvedValue(true);
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} onSendImage={onSendImage} />);
    const send = screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    const f = file('a.png', 'image/png');
    pick(f);
    expect(screen.getByAltText('Ảnh sắp gửi').getAttribute('src')).toBe('blob:preview');
    expect(send.disabled).toBe(false);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  bài 3  ' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(onSendImage).toHaveBeenCalledWith(f, 'bài 3');
    await waitFor(() => expect(screen.queryByAltText('Ảnh sắp gửi')).toBeNull());
  });

  it('keeps the picture when sending fails, and lets you drop it', async () => {
    const onSendImage = vi.fn().mockResolvedValue(false);
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} onSendImage={onSendImage} />);
    pick(file('a.png', 'image/png'));
    // act() waits for the failed send to settle, so a premature clear would show here.
    await act(async () => { fireEvent.submit(screen.getByRole('textbox').closest('form')!); });
    expect(onSendImage).toHaveBeenCalled();
    expect(screen.getByAltText('Ảnh sắp gửi')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh' }));
    expect(screen.queryByAltText('Ảnh sắp gửi')).toBeNull();
  });

  it('refuses a wrong type or a file over 1.5 MB before any upload', () => {
    const onSendImage = vi.fn();
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} onSendImage={onSendImage} />);
    pick(file('a.gif', 'image/gif'));
    expect(screen.getByRole('alert').textContent).toContain('PNG, JPG hoặc WEBP');
    pick(file('big.png', 'image/png', 1.5 * 1024 * 1024 + 1));
    expect(screen.getByRole('alert').textContent).toContain('1,5 MB');
    expect(screen.queryByAltText('Ảnh sắp gửi')).toBeNull();
    expect(onSendImage).not.toHaveBeenCalled();
  });
});
