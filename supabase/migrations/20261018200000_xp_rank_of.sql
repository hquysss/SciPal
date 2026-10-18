-- All-time XP rank of one person, for their public profile ("#3 on the leaderboard"). Same ranking as
-- xp_leaderboard(false): totals above zero, ties share a rank. Only the backend (service role) calls it.
-- Rollback: drop function public.xp_rank_of(uuid).
create or replace function public.xp_rank_of(p_user uuid)
returns table (rank bigint, xp bigint)
language sql
stable
security definer
set search_path = ''
as $$
  -- ponytail: aggregates xp_log on every call, like xp_leaderboard; a materialized total per user if this gets slow.
  with totals as (
    select x.user_id, sum(x.delta)::bigint as xp
    from public.xp_log as x
    group by x.user_id
    having sum(x.delta) > 0
  )
  select (select count(*) from totals as o where o.xp > t.xp) + 1, t.xp
  from totals as t
  where t.user_id = p_user;
$$;

revoke execute on function public.xp_rank_of(uuid) from public, anon, authenticated;
grant execute on function public.xp_rank_of(uuid) to service_role;
