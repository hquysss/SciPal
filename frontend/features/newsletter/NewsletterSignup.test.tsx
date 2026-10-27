// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSignup } from './NewsletterSignup';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (text: { vi: string }) => text.vi }) }));
const api = vi.hoisted(() => ({ subscribe: vi.fn() }));
vi.mock('./newsletterApi', async (original) => ({ ...(await original<typeof import('./newsletterApi')>()), subscribeNewsletter: api.subscribe }));

afterEach(() => {
  cleanup();
  api.subscribe.mockReset();
});

const fill = (email: string, level?: string) => {
  fireEvent.change(screen.getByLabelText('Email của bạn'), { target: { value: email } });
  if (level) fireEvent.click(screen.getByLabelText(level));
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký nhận tin' }));
};

describe('NewsletterSignup', () => {
  it('asks for a valid e-mail and a level before calling the server', () => {
    render(<NewsletterSignup />);
    fill('not-an-email');
    expect(screen.getByText('Email chưa đúng. Kiểm tra lại nhé.')).toBeTruthy();
    fill('a@b.vn');
    expect(screen.getByText('Chọn ít nhất một cấp học.')).toBeTruthy();
    expect(api.subscribe).not.toHaveBeenCalled();
  });

  it('sends the e-mail, levels and language, then says a confirmation e-mail follows if needed', async () => {
    api.subscribe.mockResolvedValue({ ok: true, confirmed: false });
    render(<NewsletterSignup />);
    fill(' A@B.vn ', 'THPT');
    await waitFor(() => expect(screen.getByText('Xong. Nếu email này chưa đăng ký, bạn sẽ nhận email xác nhận.')).toBeTruthy());
    expect(api.subscribe).toHaveBeenCalledWith({ email: 'a@b.vn', levels: ['upper_secondary'], locale: 'vi' });
  });

  it('says so when the account address is confirmed at once, and pre-fills it', async () => {
    api.subscribe.mockResolvedValue({ ok: true, confirmed: true });
    render(<NewsletterSignup email="me@scipal.vn" />);
    expect((screen.getByLabelText('Email của bạn') as HTMLInputElement).value).toBe('me@scipal.vn');
    fireEvent.click(screen.getByLabelText('THCS'));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký nhận tin' }));
    await waitFor(() => expect(screen.getByText('Đã đăng ký nhận tin.')).toBeTruthy());
  });

  it('shows the server error text', async () => {
    api.subscribe.mockResolvedValue({ ok: false, error: { vi: 'Bạn đã đăng ký nhiều lần trong giờ qua.', en: 'Too many.' } });
    render(<NewsletterSignup />);
    fill('a@b.vn', 'THPT');
    await waitFor(() => expect(screen.getByText('Bạn đã đăng ký nhiều lần trong giờ qua.')).toBeTruthy());
  });
});
