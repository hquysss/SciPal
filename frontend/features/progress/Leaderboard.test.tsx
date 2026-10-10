import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Leaderboard } from './Leaderboard';
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

  it('explains an empty week and a failed load', () => {
    expect(renderToStaticMarkup(<Leaderboard board={{ week: [], all: [] }} />)).toContain('Tuần này chưa ai có XP');
    expect(renderToStaticMarkup(<Leaderboard board={null} />)).toContain('Chưa tải được bảng xếp hạng');
  });
});
