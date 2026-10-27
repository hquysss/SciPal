// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('./gamesApi', () => ({
  listNotifications: api.list,
  deleteNotification: vi.fn(),
  clearNotifications: vi.fn(),
  markNotificationsRead: vi.fn(),
}));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({
  createBrowserClient: () => {
    const channel = { on: () => channel, subscribe: () => channel };
    return { auth: { getSession: async () => ({ data: { session: null } }) }, channel: () => channel, removeChannel: async () => {} };
  },
}));
import { NotificationBell } from './NotificationBell';

afterEach(cleanup);
const item = (id: string, kind: string, vi: string) => ({ id, kind, title: { vi, en: vi }, link: '/', read: false, createdAt: '2026-10-27T10:00:00Z' });

it('marks a coloured announcement with its label and edge, and leaves the plain one alone', async () => {
  api.list.mockResolvedValue({ ok: true, data: { unread: 2, notifications: [item('1', 'announcement:urgent', 'Bảo trì tối nay'), item('2', 'announcement', 'Thông báo thường')] } });
  render(<NotificationBell />);
  await waitFor(() => expect(api.list).toHaveBeenCalled());
  fireEvent.click(screen.getByRole('button', { name: /Thông báo/ }));
  const urgent = (await screen.findByText('Bảo trì tối nay')).closest('li')!;
  expect(urgent.textContent).toContain('Khẩn');
  expect(urgent.className).toContain('border-danger');
  const plain = screen.getByText('Thông báo thường').closest('li')!;
  expect(plain.className).not.toContain('border-l-4');
  expect(plain.textContent).not.toContain('Thông tin');
});
