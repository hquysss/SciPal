// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatPaneView } from './ChatPane';
import { mergeMessages } from './useChatRoom';
import type { ChatMessage } from './chatApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

afterEach(cleanup);

const msg = (id: string, sender: string, at: string, body = `tin ${id}`): ChatMessage => ({
  id, sender_id: sender, sender_name: `Tên ${sender}`, body, created_at: at,
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
