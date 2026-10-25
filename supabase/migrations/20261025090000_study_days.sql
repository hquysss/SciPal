-- Study days, daily goal and streak freezes (spec docs/superpowers/specs/2026-10-25-gamification-streak-habit-design.md).
-- One row per learner per Vietnam calendar day with any study; `freeze` rows fill a missed day with a streak freeze.
-- Only the backend (service role) writes; learners read their own rows.
create table if not exists public.study_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day     date not null,
  xp      int  not null default 0,
  "freeze" bool not null default false, -- quoted: FREEZE is a reserved word
  primary key (user_id, day)
);

alter table public.study_days enable row level security;
revoke insert, update, delete on public.study_days from anon, authenticated;
drop policy if exists "study_days select own" on public.study_days;
create policy "study_days select own" on public.study_days for select to authenticated using (user_id = (select auth.uid()));

-- Not in the client's column grant on profiles, so only the backend changes them.
alter table public.profiles add column if not exists daily_goal_xp int not null default 20 check (daily_goal_xp in (20, 50, 100));
alter table public.profiles add column if not exists streak_freezes int not null default 0 check (streak_freezes between 0 and 2);

-- Adds XP to a study day in one statement, so concurrent answers never lose XP; a real study day is never a freeze.
create or replace function public.bump_study_day(p_user uuid, p_day date, p_xp int)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.study_days as s (user_id, day, xp, "freeze")
  values (p_user, p_day, greatest(p_xp, 0), false)
  on conflict (user_id, day) do update set xp = s.xp + greatest(excluded.xp, 0), "freeze" = false;
$$;

revoke execute on function public.bump_study_day(uuid, date, int) from public, anon, authenticated;
grant execute on function public.bump_study_day(uuid, date, int) to service_role;

-- Backfill from past XP, by Vietnam day.
insert into public.study_days (user_id, day, xp)
select x.user_id, (x.created_at at time zone 'Asia/Ho_Chi_Minh')::date, sum(x.delta)::int
from public.xp_log as x
where x.created_at is not null
group by 1, 2
on conflict do nothing;
