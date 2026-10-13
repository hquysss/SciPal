-- Spaced repetition on the word list: when each saved term is due again, and its schedule.
-- A newly saved term is due at once. Only the backend writes these (see 20261013120000).
alter table public.user_terms
  add column if not exists due_at        timestamptz not null default now(),
  add column if not exists interval_days real        not null default 0,
  add column if not exists ease          real        not null default 2.5,
  add column if not exists reps          int         not null default 0,
  add column if not exists lapses        int         not null default 0;

create index if not exists user_terms_due on public.user_terms (user_id, due_at);
