-- Practice (Tự luyện) XP: only a learner's first answer to each question counts.
-- The backend (service role) writes both tables; learners may read their own rows.

create table if not exists public.practice_attempts (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  correct     boolean not null,
  -- When the learner answered: the time of an offline answer, not of its sync (clamped by the backend).
  created_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index if not exists practice_attempts_question_idx on public.practice_attempts (question_id);

-- When a learner first downloaded a lesson's offline package; an offline answer is never dated earlier.
create table if not exists public.offline_downloads (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  lesson_id     uuid not null references public.lessons (id) on delete cascade,
  downloaded_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists offline_downloads_lesson_idx on public.offline_downloads (lesson_id);

alter table public.practice_attempts enable row level security;
alter table public.offline_downloads enable row level security;

drop policy if exists practice_attempts_own_read on public.practice_attempts;
create policy practice_attempts_own_read on public.practice_attempts
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists offline_downloads_own_read on public.offline_downloads;
create policy offline_downloads_own_read on public.offline_downloads
  for select to authenticated using ((select auth.uid()) = user_id);

-- One XP grant per learner per practice question. Backend writes reason = 'practice_ok:<question_id>'.
create unique index if not exists xp_log_practice_once_idx
  on public.xp_log (user_id, reason)
  where reason like 'practice_ok:%';
