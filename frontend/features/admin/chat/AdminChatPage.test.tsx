// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminChatPageView } from './AdminChatPage';
import type { ChatReport, ReportedMessage } from './adminChatApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

const message = (id: string, sender: string, over: Partial<ReportedMessage> = {}): ReportedMessage => ({
  id, sender_id: `u-${sender}`, sender_name: sender, body: `tin ${id}`, image_url: null, created_at: '2026-10-12T10:00:00Z', deleted: false, ...over,
});
const report: ChatReport = {
  id: 'r1', reason: 'Quấy rối', created_at: '2026-10-12T11:00:00Z', label: 'Lớp 10A',
  messages: [message('m1', 'An'), message('m2', 'Bình'), message('m3', 'An')],
};
const handlers = () => ({ onDelete: vi.fn(), onBan: vi.fn(), onResolve: vi.fn() });
const ready = (reports: ChatReport[]) => ({ status: 'ready' as const, reports });

describe('AdminChatPageView', () => {
  it('shows each report as a conversation: its name, the reason, and the messages that were there', () => {
    render(<AdminChatPageView state={ready([report])} {...handlers()} />);
    expect(screen.getByText('Lớp 10A')).toBeTruthy();
    expect(screen.getByText(/Quấy rối/)).toBeTruthy();
    for (const id of ['m1', 'm2', 'm3']) expect(screen.getByText(`tin ${id}`)).toBeTruthy();
  });

  it('deletes one message by id, only while it is not deleted yet', () => {
    const h = handlers();
    const deleted = { ...report, messages: [message('m1', 'An'), message('m2', 'An', { deleted: true })] };
    render(<AdminChatPageView state={ready([deleted])} {...h} />);
    expect(screen.getAllByRole('button', { name: 'Xoá tin' })).toHaveLength(1);
    expect(screen.getByText('Đã xoá')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá tin' }));
    expect(h.onDelete).toHaveBeenCalledWith('m1');
  });

  it('offers one Cấm chat per sender, not per message', () => {
    const h = handlers();
    render(<AdminChatPageView state={ready([report])} {...h} />);
    const bans = screen.getAllByRole('button', { name: /Cấm chat/ });
    expect(bans).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cấm chat Bình' }));
    expect(h.onBan).toHaveBeenCalledWith('u-Bình', true);
  });

  it('marks a report handled', () => {
    const h = handlers();
    render(<AdminChatPageView state={ready([report])} {...h} />);
    fireEvent.click(screen.getByRole('button', { name: 'Đã xử lý' }));
    expect(h.onResolve).toHaveBeenCalledWith('r1');
  });

  it('shows a reported picture as a thumbnail linking to the full size, https only', () => {
    const withPictures = { ...report, messages: [
      message('m1', 'An', { body: '', image_url: 'https://m.test/chat/u1/a.png' }),
      message('m2', 'An', { image_url: 'javascript:alert(1)' }),
    ] };
    render(<AdminChatPageView state={ready([withPictures])} {...handlers()} />);
    const pictures = screen.getAllByRole('img');
    expect(pictures).toHaveLength(1);
    expect(within(pictures[0].closest('a') as HTMLElement).getByRole('img')).toBe(pictures[0]);
    expect(pictures[0].closest('a')!.getAttribute('href')).toBe('https://m.test/chat/u1/a.png');
  });

  it('says so when there is nothing to review', () => {
    render(<AdminChatPageView state={ready([])} {...handlers()} />);
    expect(screen.getByText('Không có báo cáo nào')).toBeTruthy();
  });
});
