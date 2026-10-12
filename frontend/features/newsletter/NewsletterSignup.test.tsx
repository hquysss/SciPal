// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NewsletterSignup } from './NewsletterSignup';

const subscribe = vi.hoisted(() => vi.fn());
vi.mock('./newsletterApi', async (importOriginal) => ({ ...(await importOriginal<typeof import('./newsletterApi')>()), subscribeNewsletter: subscribe }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (v: { vi: string; en: string }) => v.vi }) }));
afterEach(() => { cleanup(); subscribe.mockReset(); });

const type = (email: string) => fireEvent.change(screen.getByLabelText('Email của bạn'), { target: { value: email } });

it('sends the e-mail with the chosen levels and asks the visitor to check their inbox', async () => {
  subscribe.mockResolvedValue({ ok: true, confirmed: false });
  render(<NewsletterSignup level="upper_secondary" />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tiểu học' }));
  type('khach@gmail.com');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
  await screen.findByText('Kiểm tra email của bạn');
  expect(subscribe).toHaveBeenCalledWith({ email: 'khach@gmail.com', levels: ['upper_secondary', 'primary'], locale: 'vi' });
});

it('shows the server message and keeps the form after a failure', async () => {
  subscribe.mockResolvedValue({ ok: false, error: { vi: 'Bạn đã đăng ký nhiều lần trong giờ qua.', en: 'Too many.' } });
  render(<NewsletterSignup level="primary" />);
  type('khach@gmail.com');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
  await screen.findByRole('alert');
  expect(screen.getByRole('alert').textContent).toContain('nhiều lần');
  expect((screen.getByLabelText('Email của bạn') as HTMLInputElement).value).toBe('khach@gmail.com');
});

it('refuses to send with no level chosen', async () => {
  render(<NewsletterSignup level="primary" />);
  fireEvent.click(screen.getByRole('checkbox', { name: 'Tiểu học' }));
  type('khach@gmail.com');
  fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('ít nhất một cấp'));
  expect(subscribe).not.toHaveBeenCalled();
});
