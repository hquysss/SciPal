-- Progress page reads: the XP leaderboard (top 10 by XP, this week or all time, plus the caller) and the caller's own exam results.
-- xp_log stays own-rows-only under RLS; this definer function hands out only display names and totals.
-- Week = Monday 00:00 in Vietnam time.

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
  select r.rank, p.display_name, r.xp, r.user_id = (select auth.uid())
  from ranked as r
  join public.profiles as p on p.id = r.user_id
  where r.pos <= 10 or r.user_id = (select auth.uid())
  order by r.pos;
$$;

revoke execute on function public.xp_leaderboard(boolean) from public, anon;
grant execute on function public.xp_leaderboard(boolean) to authenticated;

-- The caller's own submitted exams for /progress (passed count, exams to retake, recent milestones).
-- exam_attempts has no client grants; this returns only the caller's rows.
create or replace function public.my_exam_results()
returns table (blueprint_id text, name text, score numeric, max_score numeric, submitted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select a.blueprint_id, b.name, a.score, coalesce(a.max_score, 10), a.submitted_at
  from public.exam_attempts as a
  left join public.exam_blueprints as b on b.id::text = a.blueprint_id
  where a.user_id = (select auth.uid()) and a.status = 'submitted'
  order by a.submitted_at desc
  limit 50;
$$;

revoke execute on function public.my_exam_results() from public, anon;
grant execute on function public.my_exam_results() to authenticated;
