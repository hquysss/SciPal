import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { defaultScope, Leaderboard } from './Leaderboard';
import type { LeaderRow } from './progressQueries';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const row = (rank: number, me = false): LeaderRow => ({ rank, display_name: `HS ${rank}`, xp: 1000 - rank, is_me: me });

describe('Leaderboard', () => {
  it('shows the top 10 and the caller below a gap when they rank lower', () => {
    const week = [...Array.from({ length: 10 }, (_, i) => row(i + 1)), row(42, true)];
    const html = renderToStaticMarkup(<Leaderboard board={{ week, all: [] }} />);
    expect(html).toContain('HS 10');
    expect(html).toContain('⋯');
    expect(html).toContain('HS 42<span class="font-normal text-ink-muted"> (bạn)</span>');
    expect(html).toContain('aria-current="true"');
    expect(countRawColors(html).total).toBe(0);
  });

  it('has no gap when the caller is in the top 10, and a nudge when they are absent', () => {
    expect(renderToStaticMarkup(<Leaderboard board={{ week: [row(1), row(2, true)], all: [] }} />)).not.toContain('⋯');
    expect(renderToStaticMarkup(<Leaderboard board={{ week: [row(1)], all: [] }} />)).toContain('Tích XP để có tên trên bảng.');
  });

  it('names someone who did not choose to be named only as "Học sinh #rank", with no initial', () => {
    const hidden = { rank: 3, display_name: null, xp: 50, is_me: false };
    const html = renderToStaticMarkup(<Leaderboard board={{ week: [row(1), row(2), hidden], all: [] }} />);
    expect(html).toContain('Học sinh #3');
    expect(html).toContain('Chỉ những bạn chọn hiện tên');
  });

  it('opens on Friends when there is a friend, then Class, then Everyone', () => {
    const friends = { week: [row(1, true), row(2)], all: [row(1, true), row(2)] };
    expect(defaultScope(friends, [])).toBe('friends');
    expect(defaultScope({ week: [row(1, true)], all: [row(1, true)] }, [{ id: 'c1', name: '10A1' }])).toBe('class');
    expect(defaultScope(null, [])).toBe('global');
    const html = renderToStaticMarkup(<Leaderboard board={{ week: [], all: [] }} friends={friends} />);
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>Bạn bè</);
    expect(html).toContain('HS 2');
    expect(html).not.toContain('Chỉ những bạn chọn hiện tên');
  });

  it('asks for friends or a class when those tabs have nobody', () => {
    const alone = { week: [row(1, true)], all: [row(1, true)] };
    expect(renderToStaticMarkup(<Leaderboard board={null} friends={alone} initialScope="friends" />)).toContain('Kết bạn để thi đua XP');
    expect(renderToStaticMarkup(<Leaderboard board={null} initialScope="class" />)).toContain('Tham gia một lớp');
    expect(renderToStaticMarkup(<Leaderboard board={null} classes={[{ id: 'c1', name: '10A1' }]} />)).toContain('Đang tải bảng của lớp');
  });

  it('explains an empty week and a failed load', () => {
    expect(renderToStaticMarkup(<Leaderboard board={{ week: [], all: [] }} />)).toContain('Tuần này chưa ai có XP');
    expect(renderToStaticMarkup(<Leaderboard board={null} />)).toContain('Chưa tải được bảng xếp hạng');
  });
});
