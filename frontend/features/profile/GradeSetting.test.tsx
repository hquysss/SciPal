// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GradeSetting } from './GradeSetting';

const getProfile = vi.fn();
const setChatGrade = vi.fn();
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./profileApi', () => ({ getProfile: (...a: unknown[]) => getProfile(...a) }));
vi.mock('../community/chatApi', () => ({ setChatGrade: (...a: unknown[]) => setChatGrade(...a) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('GradeSetting', () => {
  it('shows the grade kept on the account and saves a new one', async () => {
    getProfile.mockResolvedValue({ ok: true, data: { grade: 11 } });
    setChatGrade.mockResolvedValue({ ok: true, data: { grade: 12 } });
    render(<GradeSetting />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Khối 11/ }).getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByText('Đã lưu vào tài khoản')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Khối 12' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Khối 12/ }).getAttribute('aria-pressed')).toBe('true'));
    expect(setChatGrade).toHaveBeenCalledWith(12);
    expect(screen.getByText('Đã lưu. Phòng chat của khối đã sẵn sàng.')).toBeTruthy();
  });

  it('says no grade is chosen yet, and keeps the old one when saving fails', async () => {
    getProfile.mockResolvedValue({ ok: true, data: { grade: null } });
    setChatGrade.mockResolvedValue({ ok: false, status: 500, error: { en: 'x', vi: 'x' } });
    render(<GradeSetting />);
    expect(await screen.findByText('Chưa chọn khối')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Khối 10' }));
    expect(await screen.findByText(/Chưa lưu được khối/)).toBeTruthy();
    expect(screen.getByText('Chưa chọn khối')).toBeTruthy();
  });

  it('says loading failed, not saving, and retries the load', async () => {
    getProfile.mockResolvedValueOnce({ ok: false, status: 500, error: { en: 'x', vi: 'x' } });
    render(<GradeSetting />);
    expect(await screen.findByText(/Chưa tải được khối của bạn/)).toBeTruthy();
    expect(screen.queryByText(/Chưa lưu được khối/)).toBeNull();
    expect(screen.queryByText('Chưa chọn khối')).toBeNull();
    expect((screen.getByRole('button', { name: 'Khối 12' }) as HTMLButtonElement).disabled).toBe(true);
    getProfile.mockResolvedValueOnce({ ok: true, data: { grade: 12 } });
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Khối 12/ }).getAttribute('aria-pressed')).toBe('true'));
    expect(getProfile).toHaveBeenCalledTimes(2);
  });
});
