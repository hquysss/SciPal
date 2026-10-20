// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminBadgesPage } from './AdminBadgesPage';

const m = vi.hoisted(() => ({ listAccounts: vi.fn(), getBadges: vi.fn(), awardBadge: vi.fn(), revokeBadge: vi.fn() }));
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('../accountsApi', () => ({ listAccounts: m.listAccounts }));
vi.mock('../../profile/profileApi', async (orig) => ({ ...(await orig<object>()), getBadges: m.getBadges }));
vi.mock('./adminBadgesApi', () => ({ awardBadge: m.awardBadge, revokeBadge: m.revokeBadge }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const account = { id: 'u1', display_name: 'Nguyễn Bình', email: 'binh@x.vn', app_role: 'student', created_at: null, last_sign_in_at: null };
const badge = (over: object) => ({
  id: 'b1', slug: 'h', name_vi: 'Học sinh tiêu biểu', name_en: 'Star', description_vi: 'Danh dự', description_en: 'Honor', icon: '⭐', category: 'honor', tier: 'special',
  is_system: false, unlocked: false, earned_at: null, reason: null, ...over,
});

async function open() {
  m.listAccounts.mockResolvedValue([account]);
  render(<AdminBadgesPage />);
  const search = screen.getByLabelText('Tìm học sinh') as HTMLInputElement;
  await waitFor(() => expect(search.disabled).toBe(false));
  fireEvent.change(search, { target: { value: 'binh' } });
  fireEvent.click(await screen.findByRole('button', { name: /Nguyễn Bình/ }));
}

describe('AdminBadgesPage', () => {
  it('finds a student without accents, lists only honor badges, and gives one with a reason', async () => {
    m.getBadges.mockResolvedValue({ ok: true, data: { badges: [badge({}), badge({ id: 'auto', is_system: true, name_vi: 'Kỷ luật thép' })] } });
    m.awardBadge.mockResolvedValue({ ok: true, data: {} });
    await open();
    expect(await screen.findByText('Học sinh tiêu biểu')).toBeTruthy();
    expect(screen.queryByText('Kỷ luật thép')).toBeNull();
    const give = screen.getByRole('button', { name: 'Trao' }) as HTMLButtonElement;
    expect(give.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Lý do trao/), { target: { value: ' Giúp bạn học ' } });
    expect(give.disabled).toBe(false);
    fireEvent.click(give);
    await waitFor(() => expect(m.awardBadge).toHaveBeenCalledWith('u1', 'b1', 'Giúp bạn học'));
  });

  it('takes back a badge already given, and shows a failure', async () => {
    m.getBadges.mockResolvedValue({ ok: true, data: { badges: [badge({ unlocked: true, reason: 'Giúp bạn học' })] } });
    m.revokeBadge.mockResolvedValue({ ok: false, status: 500, error: { vi: 'Chưa xử lý được.', en: 'x' } });
    await open();
    fireEvent.click(await screen.findByRole('button', { name: 'Thu hồi' }));
    await waitFor(() => expect(m.revokeBadge).toHaveBeenCalledWith('u1', 'b1'));
    expect(await screen.findByText('Chưa xử lý được.')).toBeTruthy();
  });
});
