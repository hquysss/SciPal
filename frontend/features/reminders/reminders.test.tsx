// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReminderSettingsView } from './ReminderSettings';
import { ReminderUnsubscribePage } from './ReminderUnsubscribePage';
import type { Reminders } from './remindersApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
const unsubscribe = vi.fn();
vi.mock('./remindersApi', async (orig) => ({ ...(await orig<typeof import('./remindersApi')>()), unsubscribeReminderEmail: (t: string) => unsubscribe(t) }));

afterEach(() => {
  cleanup();
  unsubscribe.mockReset();
});

const value = (over: Partial<Reminders> = {}): Reminders => ({ hour: null, in_app: true, email: false, email_available: true, ...over });
const view = (v: Reminders, onChange = vi.fn(), extra: { saving?: boolean; error?: boolean } = {}) =>
  render(<ReminderSettingsView value={v} saving={extra.saving ?? false} error={extra.error ?? false} onChange={onChange} rowLabel="" rowHint="" />);

describe('ReminderSettingsView', () => {
  it('is off by default and turning it on picks 20:00', () => {
    const onChange = vi.fn();
    view(value(), onChange);
    const toggle = screen.getByRole('switch', { name: 'Nhắc học mỗi ngày' });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByRole('combobox')).toBeNull();
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith({ hour: 20 });
  });

  it('turns off with a null hour, and changes hour and channels', () => {
    const onChange = vi.fn();
    view(value({ hour: 7 }), onChange);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('7');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '21' } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trong app' }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Qua email/ }));
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange.mock.calls).toEqual([[{ hour: 21 }], [{ in_app: false }], [{ email: true }], [{ hour: null }]]);
  });

  it('disables e-mail when the server cannot send it, and shows a save error', () => {
    view(value({ hour: 20, email_available: false }), vi.fn(), { error: true });
    expect((screen.getByRole('checkbox', { name: /Qua email/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText('Chưa lưu được. Thử lại nhé.')).toBeTruthy();
  });
});

describe('ReminderUnsubscribePage', () => {
  it('only acts when the button is pressed, then confirms', async () => {
    unsubscribe.mockResolvedValue(true);
    render(<ReminderUnsubscribePage token="tok" />);
    expect(unsubscribe).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tắt email nhắc học' }));
    await waitFor(() => expect(screen.getByText(/Đã tắt/)).toBeTruthy());
    expect(unsubscribe).toHaveBeenCalledWith('tok');
  });

  it('says so when the link is bad, and has no action without a token', async () => {
    unsubscribe.mockResolvedValue(false);
    const { rerender } = render(<ReminderUnsubscribePage token="bad" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Liên kết không hợp lệ hoặc đã hết hạn.')).toBeTruthy());
    rerender(<ReminderUnsubscribePage token="" />);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
  });
});
