-- Competition among friends and classmates (spec docs/superpowers/specs/2026-10-25-gamification-social-design.md).
-- Apply after 20261025090000_study_days.sql and 20261025100000_learning_badges.sql: challenge XP reads study_days.
-- Rollback: drop table public.challenges; drop function public.friends_leaderboard(boolean), public.class_leaderboard(uuid, boolean);
--   delete from public.badges where slug in ('challenge_win_1', 'challenge_win_5');
--   re-run xp_leaderboard from 20261010150000_progress_reads.sql; drop the two columns.

-- Not in the client's column grants (profiles) and class_rooms has no client writes, so only the backend changes them.
alter table public.profiles add column if not exists leaderboard_public bool not null default false;
alter table public.class_rooms add column if not exists leaderboard_enabled bool not null default true;

-- A week-long XP race between two friends. Only the backend (service role) writes; the two people read it.
create table if not exists public.challenges (
  id         uuid primary key default gen_random_uuid(),
  challenger uuid not null references public.profiles(id) on delete cascade,
  opponent   uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'active', 'declined', 'done')),
  starts_on  date,
  ends_on    date,
  winner     uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (challenger <> opponent)
);
-- One open challenge per pair, whichever way round it was sent.
create unique index if not exists challenges_open_pair_idx
  on public.challenges (least(challenger, opponent), greatest(challenger, opponent))
  where status in ('pending', 'active');
create index if not exists challenges_opponent_idx on public.challenges (opponent);
create index if not exists challenges_challenger_idx on public.challenges (challenger);

alter table public.challenges enable row level security;
revoke insert, update, delete on public.challenges from anon, authenticated;
drop policy if exists "challenges select member" on public.challenges;
create policy "challenges select member" on public.challenges for select to authenticated
  using ((select auth.uid()) in (challenger, opponent));

-- The global board names only people who chose to be named, and the viewer; the rest come back with a null name.
create or replace function public.xp_leaderboard(p_weekly boolean default false)
returns table (rank bigint, display_name text, xp bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  -- ponytail: aggregates xp_log on every call; a materialized total per user if this gets slow.
  with totals as (
    select x.user_id, sum(x.delta)::bigint as xp
    from public.xp_log as x
    where not p_weekly
       or x.created_at >= (pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')
    group by x.user_id
    having sum(x.delta) > 0
  ), ranked as (
    select t.user_id, t.xp,
           pg_catalog.rank() over (order by t.xp desc) as rank,
           pg_catalog.row_number() over (order by t.xp desc, t.user_id) as pos
    from totals as t
  )
  select r.rank,
         case when p.leaderboard_public or r.user_id = (select auth.uid()) then p.display_name end,
         r.xp,
         r.user_id = (select auth.uid())
  from ranked as r
  join public.profiles as p on p.id = r.user_id
  where r.pos <= 10 or r.user_id = (select auth.uid())
  order by r.pos;
$$;

revoke execute on function public.xp_leaderboard(boolean) from public, anon;
grant execute on function public.xp_leaderboard(boolean) to authenticated;

-- The viewer and their accepted friends, named (both sides agreed to be friends).
create or replace function public.friends_leaderboard(p_weekly boolean default false)
returns table (rank bigint, display_name text, xp bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with people as (
    select (select auth.uid()) as user_id
    union
    select case when f.user_a = (select auth.uid()) then f.user_b else f.user_a end
    from public.friendships as f
    where f.status = 'accepted' and (select auth.uid()) in (f.user_a, f.user_b)
  ), totals as (
    select pe.user_id, coalesce(sum(x.delta), 0)::bigint as xp
    from people as pe
    left join public.xp_log as x
      on x.user_id = pe.user_id
     and (not p_weekly
          or x.created_at >= (pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'))
    where pe.user_id is not null
    group by pe.user_id
  )
  select pg_catalog.rank() over (order by t.xp desc), p.display_name, t.xp, t.user_id = (select auth.uid())
  from totals as t
  join public.profiles as p on p.id = t.user_id
  order by t.xp desc, t.user_id
  limit 50;
$$;

revoke execute on function public.friends_leaderboard(boolean) from public, anon;
grant execute on function public.friends_leaderboard(boolean) to authenticated;

-- A class's students, for its members and its teacher; empty for anyone else or when the teacher turned the board off.
create or replace function public.class_leaderboard(p_class uuid, p_weekly boolean default false)
returns table (rank bigint, display_name text, xp bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with allowed as (
    select c.id
    from public.class_rooms as c
    where c.id = p_class
      and c.leaderboard_enabled
      and (c.teacher_id = (select auth.uid())
           or exists (select 1 from public.class_members as m where m.class_id = c.id and m.student_id = (select auth.uid())))
  ), totals as (
    select m.student_id as user_id, coalesce(sum(x.delta), 0)::bigint as xp
    from allowed as a
    join public.class_members as m on m.class_id = a.id
    left join public.xp_log as x
      on x.user_id = m.student_id
     and (not p_weekly
          or x.created_at >= (pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh'))
    group by m.student_id
  )
  select pg_catalog.rank() over (order by t.xp desc), p.display_name, t.xp, t.user_id = (select auth.uid())
  from totals as t
  join public.profiles as p on p.id = t.user_id
  order by t.xp desc, t.user_id
  limit 100;
$$;

revoke execute on function public.class_leaderboard(uuid, boolean) from public, anon;
grant execute on function public.class_leaderboard(uuid, boolean) to authenticated;

-- condition type added: challenge_wins (with min).
insert into public.badges (slug, name_vi, name_en, description_vi, description_en, icon, category, tier, is_system, sort_order, condition) values
  ('challenge_win_1', 'Chiến thắng đầu tiên', 'First win', 'Thắng 1 thử thách tuần', 'Win 1 weekly challenge', '🥊', 'community', 'bronze', true, 320, '{"type":"challenge_wins","min":1}'),
  ('challenge_win_5', 'Nhà vô địch', 'Champion', 'Thắng 5 thử thách tuần', 'Win 5 weekly challenges', '🏅', 'community', 'gold', true, 330, '{"type":"challenge_wins","min":5}')
on conflict (slug) do update set
  name_vi = excluded.name_vi, name_en = excluded.name_en, description_vi = excluded.description_vi, description_en = excluded.description_en,
  icon = excluded.icon, category = excluded.category, tier = excluded.tier, is_system = excluded.is_system,
  sort_order = excluded.sort_order, condition = excluded.condition;
