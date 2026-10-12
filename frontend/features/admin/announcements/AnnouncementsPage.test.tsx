// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AnnouncementsPage } from './AnnouncementsPage';

const api = vi.hoisted(() => ({ fetchAnnouncements: vi.fn(), sendAnnouncement: vi.fn() }));
vi.mock('@/features/newsletter/newsletterApi', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/features/newsletter/newsletterApi')>()), ...api }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (v: { vi: string; en: string }) => v.vi }) }));
vi.mock('@/components/nav/PageBreadcrumb', () => ({ PageBreadcrumb: () => null }));
afterEach(() => { cleanup(); api.fetchAnnouncements.mockReset(); api.sendAnnouncement.mockReset(); });

const loaded = (emailReady = true) => ({
  ok: true,
  data: {
    announcements: [],
    emailReady,
    audience: { accounts: 42, confirmed: 3, pending: 1, unsubscribed: 0, confirmedByLevel: { primary: 2, lower_secondary: 0, upper_secondary: 3 } },
  },
});

it('confirms the recipient counts, then sends once with one request id', async () => {
  api.fetchAnnouncements.mockResolvedValue(loaded());
  api.sendAnnouncement.mockResolvedValue({ ok: true, data: { announcement: { id: 'a', app_count: 42, email_count: 3 } } });
  render(<AnnouncementsPage />);
  await screen.findByText(/42 tài khoản · 3 đã xác nhận/);
  fireEvent.change(screen.getByLabelText('Tiêu đề (tiếng Việt)'), { target: { value: 'Có bài mới' } });
  fireEvent.change(screen.getByLabelText('Tiêu đề (tiếng Anh)'), { target: { value: 'New lessons' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /Email, tới 3/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Gửi thông báo' }));
  await screen.findByText(/Sẽ gửi tới 42 tài khoản \(chuông thông báo\) và 3 người đăng ký \(email\)/);
  fireEvent.click(screen.getByRole('button', { name: 'Gửi' }));
  await screen.findByText('Đã gửi: 42 thông báo trong app, 3 email.');
  expect(api.sendAnnouncement).toHaveBeenCalledTimes(1);
  expect(api.sendAnnouncement.mock.calls[0]?.[0]).toMatchObject({ title_vi: 'Có bài mới', send_app: true, send_email: true, level: '' });
  expect(api.sendAnnouncement.mock.calls[0]?.[0].client_request_id).toMatch(/^[0-9a-f-]{36}$/);
});

it('warns and blocks e-mail while the service is not configured', async () => {
  api.fetchAnnouncements.mockResolvedValue(loaded(false));
  render(<AnnouncementsPage />);
  await waitFor(() => expect(screen.getByText(/Dịch vụ email chưa được cấu hình/)).toBeTruthy());
  expect((screen.getByRole('checkbox', { name: /Email, tới/ }) as HTMLInputElement).disabled).toBe(true);
});
