-- xp_rank_of also returns the person's place this week (same week as xp_leaderboard(true): Monday 00:00
-- Vietnam time), so the profile can show the "Nhất tuần" trophy. The return type changes, so drop first.
-- Rollback: re-run 20261018200000_xp_rank_of.sql after dropping this version.
drop function if exists public.xp_rank_of(uuid);

create function public.xp_rank_of(p_user uuid)
returns table (rank bigint, xp bigint, week_rank bigint)
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
  ), week as (
    select x.user_id, sum(x.delta)::bigint as xp
    from public.xp_log as x
    where x.created_at >= (pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh')
    group by x.user_id
    having sum(x.delta) > 0
  )
  select (select count(*) from totals as o where o.xp > t.xp) + 1,
         t.xp,
         (select (select count(*) from week as o where o.xp > w.xp) + 1 from week as w where w.user_id = p_user)
  from totals as t
  where t.user_id = p_user;
$$;

revoke execute on function public.xp_rank_of(uuid) from public, anon, authenticated;
grant execute on function public.xp_rank_of(uuid) to service_role;
