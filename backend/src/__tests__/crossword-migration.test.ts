import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/20261026090000_crossword_games.sql', import.meta.url), 'utf8').toLowerCase();

describe('crossword games migration contract', () => {
  it('keeps the grid and its answers from browsers', () => {
    expect(sql).toContain('alter table public.game_crosswords enable row level security');
    expect(sql).toContain('revoke all on public.game_crosswords from anon, authenticated');
    expect(sql).not.toMatch(/create policy[^;]*game_crosswords/);
    expect(sql).not.toMatch(/grant[^;]*game_crosswords/);
  });

  it('adds crossword to both games checks and keeps the older kinds', () => {
    expect(sql).toContain("check (kind in ('quiz', 'match', 'wordwall', 'crossword'))");
    expect(sql).toContain("(kind = 'crossword' and lesson_id is not null and cardinality(term_ids) between 4 and 15)");
    expect(sql).toContain("(kind = 'match' and cardinality(term_ids) between 3 and 20)");
  });

  it('grants crossword XP once per learner', () => {
    expect(sql).toMatch(/create unique index[^;]*xp_log_crossword_once_idx[^;]*\(user_id, reason\)[^;]*where reason like 'crossword:%'/);
  });
});
