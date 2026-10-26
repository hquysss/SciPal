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

const followUp = readFileSync(new URL('../../../supabase/migrations/20261026100000_crossword_no_term_ids.sql', import.meta.url), 'utf8').toLowerCase();

// games is readable by anon and authenticated and terms is public: term_ids would list the answers.
describe('crossword answers stay out of games', () => {
  it('requires an empty term_ids for a crossword, and keeps the other kinds', () => {
    expect(followUp).toContain("(kind = 'crossword' and lesson_id is not null and cardinality(term_ids) = 0)");
    expect(followUp).toContain("(kind = 'match' and cardinality(term_ids) between 3 and 20)");
    expect(followUp).toContain("(kind = 'quiz' and lesson_id is not null)");
  });

  it('does not open game_crosswords to browsers', () => {
    expect(followUp).not.toMatch(/grant|create policy/);
  });
});
