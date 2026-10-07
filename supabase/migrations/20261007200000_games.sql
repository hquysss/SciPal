-- Games: a teacher makes one for a class (members get a notification) or for everyone (played solo).
-- kind 'quiz' plays a published lesson's practice questions, 'match' pairs glossary terms EN↔VI,
-- 'wordwall' embeds a Wordwall activity. Scores are written by the backend (service role) only;
-- browsers read games and notifications under RLS and never see answers.

create table public.games (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  class_id      uuid references public.class_rooms(id) on delete cascade,
  kind          text not null check (kind in ('quiz', 'match', 'wordwall')),
  title_en      text not null default '',
  title_vi      text not null check (length(title_vi) between 1 and 200),
  lesson_id     uuid references public.lessons(id) on delete cascade,
  term_ids      uuid[] not null default '{}',
  wordwall_url  text,
  time_limit_s  int check (time_limit_s between 10 and 3600),
  created_at    timestamptz not null default now(),
  check (
    (kind = 'quiz' and lesson_id is not null)
    or (kind = 'match' and cardinality(term_ids) between 3 and 20)
    or (kind = 'wordwall' and wordwall_url like 'https://wordwall.net/embed/%')
  )
);
create index games_class_idx on public.games (class_id);
create index games_public_idx on public.games (created_at desc) where class_id is null;

create table public.game_plays (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  -- match: the shuffled order of the right column, so the client only ever sends positions.
  right_order  uuid[] not null default '{}',
  score        int,
  max_score    int,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index game_plays_game_idx on public.game_plays (game_id, score desc);

create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title_en    text not null,
  title_vi    text not null,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.games enable row level security;
alter table public.game_plays enable row level security;
alter table public.notifications enable row level security;

-- Public games, games of a class the user is in, and the owner's own games.
create policy games_read on public.games for select to anon, authenticated using (
  class_id is null
  or owner_id = (select auth.uid())
  or exists (select 1 from public.class_members m where m.class_id = games.class_id and m.student_id = (select auth.uid()))
);

create policy notifications_read_own on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

-- game_plays: no browser policies; the backend reads and writes them.

-- The bell listens for new rows over Supabase Realtime; RLS above limits each user to their own.
alter publication supabase_realtime add table public.notifications;
