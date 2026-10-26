-- Crossword games (spec docs/superpowers/specs/2026-10-26-crossword-game-design.md).
-- games is readable by everyone (games_read), so the grid and its answers live in game_crosswords,
-- which only the backend (service role) reads and writes.
-- Rollback: delete from public.games where kind = 'crossword'; drop table public.game_crosswords;
--   drop index public.xp_log_crossword_once_idx; restore the two checks without 'crossword'.

alter table public.games drop constraint if exists games_kind_check;
alter table public.games add constraint games_kind_check
  check (kind in ('quiz', 'match', 'wordwall', 'crossword'));

alter table public.games drop constraint if exists games_check;
alter table public.games add constraint games_check check (
  (kind = 'quiz' and lesson_id is not null)
  or (kind = 'match' and cardinality(term_ids) between 3 and 20)
  or (kind = 'wordwall' and wordwall_url like 'https://wordwall.net/embed/%')
  or (kind = 'crossword' and lesson_id is not null and cardinality(term_ids) between 4 and 15)
);

create table if not exists public.game_crosswords (
  game_id   uuid primary key references public.games(id) on delete cascade,
  mode      text not null check (mode in ('en_from_vi', 'vi_from_en', 'term_from_def')),
  grid_rows int  not null check (grid_rows between 1 and 15),
  grid_cols int  not null check (grid_cols between 1 and 15),
  -- [{term_id, number, row, col, dir, answer, clue: {vi, en}}]
  words     jsonb not null
);

alter table public.game_crosswords enable row level security;
revoke all on public.game_crosswords from anon, authenticated;

-- One XP grant per learner per crossword. Backend writes reason = 'crossword:<game_id>'.
create unique index if not exists xp_log_crossword_once_idx
  on public.xp_log (user_id, reason)
  where reason like 'crossword:%';
