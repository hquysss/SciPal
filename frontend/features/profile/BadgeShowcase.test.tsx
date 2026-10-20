// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadgeShowcase } from './BadgeShowcase';
import type { CommunityBadge } from './profileApi';

const getBadges = vi.fn();
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('./profileApi', async (orig) => ({ ...(await orig<object>()), getBadges: (...a: unknown[]) => getBadges(...a) }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const badge = (over: Partial<CommunityBadge>): CommunityBadge => ({
  id: 'b', slug: 's', name_vi: 'Tên', name_en: 'Name', description_vi: 'Mô tả', description_en: 'Desc', icon: '🔥', category: 'streak', tier: 'bronze',
  is_system: true, unlocked: false, earned_at: null, reason: null, ...over,
});

describe('BadgeShowcase', () => {
  it('counts earned badges, marks locked ones, and shows the admin\'s reason on an honor badge', async () => {
    getBadges.mockResolvedValue({ ok: true, data: { badges: [
      badge({ id: '1', name_vi: 'Kỷ luật thép', unlocked: true }),
      badge({ id: '2', name_vi: 'Học sinh tiêu biểu', unlocked: true, is_system: false, reason: 'Giúp bạn học' }),
      badge({ id: '3', name_vi: 'Bậc thầy luyện đề' }),
    ] } });
    render(<BadgeShowcase userId="u" />);
    expect(await screen.findByText('2/3')).toBeTruthy();
    expect(screen.getByText('Giúp bạn học')).toBeTruthy();
    expect(screen.getAllByText('Chưa đạt')).toHaveLength(1);
    expect(screen.getAllByText('Đã đạt')).toHaveLength(2);
  });

  it('renders nothing when the badges cannot be loaded', async () => {
    getBadges.mockResolvedValue({ ok: false, status: 500, error: { en: 'x', vi: 'x' } });
    const { container } = render(<BadgeShowcase userId="u" />);
    await Promise.resolve();
    expect(container.textContent).toBe('');
  });
});
