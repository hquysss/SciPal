-- The word list's schedule moves from a trimmed SM-2 to FSRS-4.5 (backend/src/terms/review.ts).
-- A card never reviewed keeps null stability and difficulty.
alter table public.user_terms
  add column if not exists stability   real,
  add column if not exists difficulty  real,
  add column if not exists last_review timestamptz;

-- Cards already on a schedule carry over: stability is their last interval (at 90% retention the
-- FSRS interval equals the stability), difficulty starts at the middle of its 1–10 range.
update public.user_terms
set stability   = interval_days,
    difficulty  = 5,
    last_review = due_at - make_interval(secs => interval_days * 86400)
where stability is null and interval_days > 0;

-- `ease` is no longer read; it stays until the backend that reads it is gone everywhere.
comment on column public.user_terms.ease is 'Unused since FSRS (20261013220000); drop in a later migration.';
