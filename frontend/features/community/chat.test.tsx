// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPaneView } from './ChatPane';
import { groupReactions, mergeMessages } from './useChatRoom';
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
  it('is a log; others show their name and get Chặn, your own do not, and no message has its own Báo cáo', () => {
    render(<ChatPaneView messages={[msg('1', 'me', '2026-10-12T10:00:00Z'), msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...handlers()} />);
    expect(screen.getByRole('log')).toBeTruthy();
    expect(screen.getByText('Tên them')).toBeTruthy();
    expect(screen.queryByText('Tên me')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Báo cáo' })).toBeNull();
    // Your own message has no menu without onRecall; theirs offers Chặn behind Thêm.
    expect(screen.getAllByRole('button', { name: 'Thêm' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    expect(screen.getAllByRole('menuitem', { name: 'Chặn' })).toHaveLength(1);
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
    expect(h.onSend).toHaveBeenCalledWith('chào cả nhà', undefined);
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

  it('reports the whole conversation from the top bar, with one of the fixed reasons', () => {
    const h = handlers();
    render(<ChatPaneView messages={[msg('1', 'them', '2026-10-12T10:00:00Z'), msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...h} title="Lớp 10A" />);
    expect(screen.getAllByRole('button', { name: 'Báo cáo' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Báo cáo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Spam' }));
    expect(h.onReport).toHaveBeenCalledTimes(1);
    expect(h.onReport).toHaveBeenCalledWith('Spam');
  });

  it('blocks only on the second click, since there is no undo', () => {
    const h = handlers();
    render(<ChatPaneView messages={[msg('2', 'them', '2026-10-12T10:00:01Z')]} meId="me" {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Chặn' }));
    expect(h.onBlock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: /Chắc chắn chặn/ }));
    expect(h.onBlock).toHaveBeenCalledWith('them');
  });

  it('unsends your own message after confirming, and shows a recalled one as a note without actions', () => {
    const onRecall = vi.fn();
    const recalled = { ...msg('3', 'them', '2026-10-12T10:00:02Z', ''), recalled_at: '2026-10-12T10:01:00Z' };
    render(<ChatPaneView messages={[msg('1', 'me', '2026-10-12T10:00:00Z'), recalled]} meId="me" {...handlers()} onRecall={onRecall} />);
    expect(screen.getByText('Tên them đã thu hồi một tin nhắn')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Trả lời' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Thu hồi' }));
    expect(onRecall).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Thu hồi' }));
    expect(onRecall).toHaveBeenCalledWith('1');
  });
});

describe('pictures in ChatPaneView', () => {
  const file = (name: string, type: string, size = 100) => new File([new Uint8Array(size)], name, { type });
  const pick = (f: File) => fireEvent.change(screen.getByLabelText('Đính kèm ảnh'), { target: { files: [f] } });

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows a picture small, opens it large on click, and only for https URLs', () => {
    const good = msg('1', 'them', '2026-10-12T10:00:00Z', '', 'https://m.test/chat/u/a.png');
    const bad = msg('2', 'them', '2026-10-12T10:00:01Z', 'x', 'javascript:alert(1)');
    render(<ChatPaneView messages={[good, bad]} meId="me" {...handlers()} />);
    expect(screen.getAllByRole('img')).toHaveLength(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to ảnh' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('img').getAttribute('src')).toBe('https://m.test/chat/u/a.png');
    const original = within(dialog).getByRole('link', { name: 'Mở ảnh gốc' });
    expect(original.getAttribute('href')).toBe('https://m.test/chat/u/a.png');
    expect(original.getAttribute('rel')).toContain('noopener');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByRole('dialog')).toBeNull();
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

describe('messenger layout', () => {
  it('shows the title, subtitle and a back button that goes back', () => {
    const onBack = vi.fn();
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} title="Lớp 10A" subtitle="Cả lớp cùng thấy" onBack={onBack} />);
    expect(screen.getByRole('heading', { name: 'Lớp 10A' })).toBeTruthy();
    expect(screen.getByText('Cả lớp cùng thấy')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('names the sender once per run in a group chat, and never in a two-person chat', () => {
    const run = [msg('1', 'them', '2026-10-12T03:00:00Z'), msg('2', 'them', '2026-10-12T03:01:00Z')];
    const { unmount } = render(<ChatPaneView messages={run} meId="me" {...handlers()} showNames />);
    expect(screen.getAllByText('Tên them')).toHaveLength(1);
    unmount();
    render(<ChatPaneView messages={run} meId="me" {...handlers()} showNames={false} />);
    expect(screen.queryByText('Tên them')).toBeNull();
  });

  it('puts a time label before a conversation', () => {
    render(<ChatPaneView messages={[msg('1', 'them', '2026-10-12T03:00:00Z')]} meId="me" {...handlers()} now={new Date('2026-10-12T05:00:00Z')} />);
    expect(screen.getByText('10:00')).toBeTruthy();
  });

  it('shows that a message is being sent, and ignores a second send meanwhile', async () => {
    let finish: (ok: boolean) => void = () => {};
    const onSend = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} onSend={onSend} />);
    const box = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(box, { target: { value: 'chào' } });
    fireEvent.submit(box.closest('form')!);
    const sending = await screen.findByRole('button', { name: 'Đang gửi…' });
    expect((sending as HTMLButtonElement).disabled).toBe(true);
    expect(sending.getAttribute('aria-busy')).toBe('true');
    fireEvent.submit(box.closest('form')!);
    expect(onSend).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
    expect((screen.getByRole('button', { name: 'Gửi' }) as HTMLButtonElement).disabled).toBe(true); // box is empty again
    expect(box.value).toBe('');
  });
});

describe('sender header', () => {
  it('shows the sender avatar, name and role beside the first message, and the initial until the lookup arrives', () => {
    const run = [msg('1', 'them', '2026-10-12T03:00:00Z')];
    const senders = { them: { user_id: 'them', avatar_url: 'https://m.test/a.webp', role: 'teacher' as const } };
    const { container, rerender } = render(<ChatPaneView messages={run} meId="me" {...handlers()} showNames />);
    expect(screen.getByText('Tên them')).toBeTruthy();
    expect(screen.queryByText('Giáo viên')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    rerender(<ChatPaneView messages={run} meId="me" {...handlers()} showNames senders={senders} />);
    expect(screen.getByText('Giáo viên')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('https://m.test/a.webp');
    rerender(<ChatPaneView messages={run} meId="me" {...handlers()} showNames senders={{ them: { ...senders.them, role: 'student' } }} />);
    expect(screen.getByText('Học sinh')).toBeTruthy();
  });

  it('shows reactions as bare emoji under the message, with the count revealed on hover', () => {
    render(<ChatPaneView messages={[msg('1', 'them', '2026-10-12T03:00:00Z')]} meId="me" {...handlers()} onReact={vi.fn()} reactions={{ '1': [{ emoji: '🔥', count: 2, mine: false }] }} />);
    const chip = screen.getByRole('button', { name: '🔥 2' });
    const [emoji, count] = Array.from(chip.children);
    expect(emoji.textContent).toBe('🔥');
    expect(count.textContent).toBe('2');
    expect(count.className).toContain('group-hover/chip:inline');
    expect(chip.className).not.toMatch(/ring|border|bg-/);
  });
});

describe('loading', () => {
  it('shows skeleton bubbles, not the empty note, while the first page loads', () => {
    render(<ChatPaneView messages={[]} meId="me" {...handlers()} loading />);
    expect(screen.getByRole('log').getAttribute('aria-busy')).toBe('true');
    expect(screen.queryByText(/Chưa có tin nhắn/)).toBeNull();
  });

  it('asks for the older page when scrolled near the top, and marks the start once there is none', () => {
    const onLoadOlder = vi.fn();
    const one = [msg('1', 'them', '2026-10-12T10:00:00Z')];
    const { rerender } = render(<ChatPaneView messages={one} meId="me" {...handlers()} hasOlder onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole('log');
    log.scrollTop = 0;
    fireEvent.scroll(log);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
    rerender(<ChatPaneView messages={one} meId="me" {...handlers()} hasOlder={false} onLoadOlder={onLoadOlder} />);
    expect(screen.getByText('Đầu cuộc trò chuyện')).toBeTruthy();
  });

  it('mergeMessages keeps every older page the reader asked for', () => {
    const many = Array.from({ length: 250 }, (_, i) => msg(`m${i}`, 'u1', new Date(Date.UTC(2026, 9, 12, 10, 0, i)).toISOString()));
    expect(mergeMessages([], many, Infinity)).toHaveLength(250);
  });
});

describe('replies and reactions', () => {
  const a = msg('a', 'them', '2026-10-12T10:00:00Z', 'đề này khó');
  const b = { ...msg('b', 'me', '2026-10-12T10:00:01Z', 'mình cũng thấy'), reply_to: 'a' };

  it('groupReactions counts per emoji and marks the reader\'s own', () => {
    const chips = groupReactions([
      { message_id: 'a', user_id: 'me', emoji: '👍' }, { message_id: 'a', user_id: 'x', emoji: '👍' }, { message_id: 'a', user_id: 'x', emoji: '🔥' },
    ], 'me');
    expect(chips.a).toEqual([{ emoji: '👍', count: 2, mine: true }, { emoji: '🔥', count: 1, mine: false }]);
  });

  it('shows the replied-to message above a reply, and sends reply_to after pressing Trả lời', async () => {
    const h = handlers();
    render(<ChatPaneView messages={[a, b]} meId="me" {...h} />);
    expect(screen.getByText('Tên them: đề này khó', { selector: 'p' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: 'Trả lời' })[0]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'đúng rồi' } });
    fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    expect(h.onSend).toHaveBeenCalledWith('đúng rồi', 'a');
  });

  it('picks an emoji and toggles an existing chip through onReact', () => {
    const onReact = vi.fn();
    render(<ChatPaneView messages={[a]} meId="me" {...handlers()} onReact={onReact} reactions={{ a: [{ emoji: '🔥', count: 2, mine: false }] }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thả cảm xúc' }));
    fireEvent.click(screen.getByRole('button', { name: '👍' }));
    expect(onReact).toHaveBeenCalledWith('a', '👍');
    fireEvent.click(screen.getByRole('button', { name: /🔥 2/ }));
    expect(onReact).toHaveBeenCalledWith('a', '🔥');
  });
});
