-- A crossword's answers must not be readable by browsers (review finding R1 on PR #251).
-- games is readable by anon and authenticated, and terms is public, so games.term_ids listing a
-- crossword's answer terms would give the answer set away. The terms already live in
-- game_crosswords.words (backend only); games.term_ids stays empty for a crossword.
-- Apply after 20261026090000_crossword_games.sql.
-- Rollback: re-run the games_check of 20261026090000 (needs 4 to 15 term_ids for a crossword).

alter table public.games drop constraint if exists games_check;
alter table public.games add constraint games_check check (
  (kind = 'quiz' and lesson_id is not null)
  or (kind = 'match' and cardinality(term_ids) between 3 and 20)
  or (kind = 'wordwall' and wordwall_url like 'https://wordwall.net/embed/%')
  or (kind = 'crossword' and lesson_id is not null and cardinality(term_ids) = 0)
);
