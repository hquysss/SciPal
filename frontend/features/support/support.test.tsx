// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminSupport } from './AdminSupport';
import { SupportPage } from './SupportPage';
import * as api from './supportApi';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (copy: { vi: string }) => copy.vi }) }));
vi.mock('next/link', () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock('./supportApi', async (importOriginal) => {
  const real = await importOriginal<typeof import('./supportApi')>();
  return {
    ...real,
    getMyApplication: vi.fn(), sendApplication: vi.fn(), redeemCode: vi.fn(),
    listApplications: vi.fn(), decideApplication: vi.fn(), listCodes: vi.fn(), createCode: vi.fn(), revokeCode: vi.fn(),
  };
});

const m = vi.mocked(api);
const ok = <T,>(data: T) => ({ ok: true as const, data });
const fail = (status: number, vi: string) => ({ ok: false as const, status, error: { vi, en: vi } });
const empty = { application: null, plan: null };

beforeEach(() => { vi.resetAllMocks(); });
afterEach(cleanup);

describe('SupportPage', () => {
  it('asks a visitor to sign in', async () => {
    m.getMyApplication.mockResolvedValue(fail(401, 'x'));
    render(<SupportPage />);
    const link = await screen.findByRole('link', { name: 'Đăng nhập' });
    expect(link.getAttribute('href')).toBe('/login?redirect=/support');
  });

  it('sends a trimmed application only once every field is filled', async () => {
    m.getMyApplication.mockResolvedValue(ok(empty));
    m.sendApplication.mockResolvedValue(ok({ id: 'a1' }));
    render(<SupportPage />);
    const send = await screen.findByRole('button', { name: 'Gửi đơn' });
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: ' Nguyễn Văn A ' } });
    fireEvent.change(screen.getByLabelText('Trường'), { target: { value: 'THCS Bản Hồ' } });
    fireEvent.change(screen.getByLabelText(/Nơi ở/), { target: { value: 'Sa Pa, Lào Cai' } });
    fireEvent.change(screen.getByLabelText('Vì sao bạn cần hỗ trợ?'), { target: { value: 'Sóng yếu' } });
    expect((send as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(m.sendApplication).toHaveBeenCalledTimes(1));
    expect(m.sendApplication.mock.calls[0]![0]).toMatchObject({ school: 'THCS Bản Hồ', area: 'Sa Pa, Lào Cai', reason: 'Sóng yếu' });
    expect(m.getMyApplication).toHaveBeenCalledTimes(2);
  });

  it('shows how the application went instead of the form, with the plan date once approved', async () => {
    m.getMyApplication.mockResolvedValue(ok({
      application: { id: 'a1', role: 'student', status: 'approved', decisionNote: null, grantedMonths: 3, decidedAt: '2026-10-22T01:00:00Z', createdAt: '2026-10-21T01:00:00Z' },
      plan: { planCode: 'student_plus', paidThrough: '2027-01-22T01:00:00Z' },
    }));
    render(<SupportPage />);
    expect(await screen.findByText(/Đơn của bạn đã được duyệt/)).toBeTruthy();
    expect(screen.getByText(/Gói dùng được đến 22\/1\/2027/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gửi đơn' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Gửi đơn mới' })).toBeTruthy();
  });

  it('shows the reason when rejected, and nothing to send again while pending', async () => {
    m.getMyApplication.mockResolvedValue(ok({ application: { id: 'a1', role: 'student', status: 'rejected', decisionNote: 'Chưa đủ thông tin', grantedMonths: null, decidedAt: '2026-10-22T01:00:00Z', createdAt: '2026-10-21T01:00:00Z' }, plan: null }));
    render(<SupportPage />);
    expect(await screen.findByText(/Chưa đủ thông tin/)).toBeTruthy();
    cleanup();
    m.getMyApplication.mockResolvedValue(ok({ application: { id: 'a2', role: 'student', status: 'pending', decisionNote: null, grantedMonths: null, decidedAt: null, createdAt: '2026-10-21T01:00:00Z' }, plan: null }));
    render(<SupportPage />);
    expect(await screen.findByText(/đang được xem xét/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gửi đơn mới' })).toBeNull();
  });

  it('redeems a code and says until when the plan runs, or says why not', async () => {
    m.getMyApplication.mockResolvedValue(ok(empty));
    m.redeemCode.mockResolvedValueOnce(fail(400, 'Mã không hợp lệ hoặc đã hết hạn.')).mockResolvedValueOnce(ok({ planCode: 'student_plus', paidThrough: '2027-01-22T01:00:00Z' }));
    render(<SupportPage />);
    const input = await screen.findByLabelText('Mã');
    const use = screen.getByRole('button', { name: 'Dùng mã' });
    expect((use as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'abcd-efgh' } });
    fireEvent.click(use);
    expect(await screen.findByText('Mã không hợp lệ hoặc đã hết hạn.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Dùng mã' }));
    expect(await screen.findByText(/Gói của bạn dùng được đến 22\/1\/2027/)).toBeTruthy();
    expect(m.redeemCode).toHaveBeenNthCalledWith(1, 'abcd-efgh');
  });
});

const pendingApp = { id: 'a1', userId: 'u1', role: 'student' as const, fullName: 'Nguyễn Văn A', school: 'THCS Bản Hồ', area: 'Sa Pa', reason: 'Sóng yếu', status: 'pending' as const, decisionNote: null, grantedMonths: null, decidedAt: null, createdAt: '2026-10-21T01:00:00Z' };

// "Từ chối" is both a status filter (aria-pressed) and the action on a card.
const rejectButton = () => screen.getAllByRole('button', { name: 'Từ chối' }).find((b) => !b.hasAttribute('aria-pressed')) as HTMLButtonElement;

describe('AdminSupport', () => {
  it('approves an application for the months chosen, and rejects only with a reason', async () => {
    m.listApplications.mockResolvedValue(ok({ applications: [pendingApp] }));
    m.decideApplication.mockResolvedValue(ok({ status: 'approved' as const }));
    render(<AdminSupport />);
    expect(await screen.findByText(/Nguyễn Văn A/)).toBeTruthy();
    expect(m.listApplications).toHaveBeenCalledWith('pending');
    expect(rejectButton().disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Số tháng'), { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(m.decideApplication).toHaveBeenCalledWith('a1', { approve: true, months: 6 }));
    fireEvent.change(screen.getByLabelText('Lý do nếu từ chối'), { target: { value: 'Chưa đủ thông tin' } });
    expect(rejectButton().disabled).toBe(false);
  });

  it('shows a new code once and lists codes by their last four characters only', async () => {
    m.listApplications.mockResolvedValue(ok({ applications: [] }));
    m.listCodes.mockResolvedValue(ok({ codes: [{ id: 'c1', hint: 'JKMN', planCode: 'student_plus' as const, months: 3, maxUses: 2, uses: 1, expiresAt: null, note: 'hs 12', revokedAt: null, createdAt: '2026-10-22T01:00:00Z' }] }));
    m.createCode.mockResolvedValue(ok({ id: 'c2', code: 'ABCDEFGHJKMN', display: 'ABCD-EFGH-JKMN' }));
    render(<AdminSupport />);
    fireEvent.click(screen.getByRole('tab', { name: 'Mã' }));
    expect(await screen.findByText('…JKMN')).toBeTruthy();
    expect(screen.getByText(/1\/2 lượt/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tạo mã' }));
    expect((await screen.findByTestId('fresh-code')).textContent).toBe('ABCD-EFGH-JKMN');
    expect(m.createCode).toHaveBeenCalledWith({ planCode: 'student_plus', months: 3, maxUses: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByTestId('fresh-code')).toBeNull();
    expect(document.body.textContent).not.toContain('ABCD-EFGH-JKMN');
  });
});
