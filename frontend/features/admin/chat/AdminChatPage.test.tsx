// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminChatPageView } from './AdminChatPage';
import type { ChatReport } from './adminChatApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

afterEach(cleanup);

const report: ChatReport = { id: 'r1', message_id: 'm1', reason: 'Spam', created_at: '2026-10-12T00:00:00Z', body: 'mua ngay', sender_id: 'u1', sender_name: 'An', image_url: null };

describe('AdminChatPageView', () => {
  it('lists each report with the message, sender and reason', () => {
    render(<AdminChatPageView state={{ status: 'ready', reports: [report] }} onDelete={vi.fn()} onBan={vi.fn()} />);
    expect(screen.getByText('mua ngay')).toBeTruthy();
    expect(screen.getByText(/An/)).toBeTruthy();
    expect(screen.getByText(/Spam/)).toBeTruthy();
  });

  it('deletes the message or bans the sender', () => {
    const onDelete = vi.fn();
    const onBan = vi.fn();
    render(<AdminChatPageView state={{ status: 'ready', reports: [report] }} onDelete={onDelete} onBan={onBan} />);
    fireEvent.click(screen.getByRole('button', { name: 'Xoá tin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cấm chat' }));
    expect(onDelete).toHaveBeenCalledWith('m1');
    expect(onBan).toHaveBeenCalledWith('u1', true);
  });

  it('says so when there is nothing to review', () => {
    render(<AdminChatPageView state={{ status: 'ready', reports: [] }} onDelete={vi.fn()} onBan={vi.fn()} />);
    expect(screen.getByText('Không có báo cáo nào')).toBeTruthy();
  });

  it('shows a reported picture as a thumbnail linking to the full size, https only', () => {
    const withPicture: ChatReport = { ...report, id: 'r2', message_id: 'm2', body: '', image_url: 'https://m.test/chat/u1/a.png' };
    const unsafe: ChatReport = { ...report, id: 'r3', message_id: 'm3', image_url: 'javascript:alert(1)' };
    render(<AdminChatPageView state={{ status: 'ready', reports: [withPicture, unsafe] }} onDelete={vi.fn()} onBan={vi.fn()} />);
    const pictures = screen.getAllByRole('img');
    expect(pictures).toHaveLength(1);
    expect(pictures[0].closest('a')!.getAttribute('href')).toBe('https://m.test/chat/u1/a.png');
  });
});
