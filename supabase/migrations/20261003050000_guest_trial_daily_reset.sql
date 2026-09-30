-- Guest trials come back every 24 hours (chủ dự án chốt 30/09): 24 hours after a visitor opened a
-- feature's 30-minute window they get a new one, and 24 hours after their Tutor question they may
-- ask another. Same signatures as 20260930000000_guest_trials.sql, so the backend is unchanged.

create or replace function public.guest_trial_open(p_visitor text, p_feature text, p_window_minutes integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_until timestamptz;
begin
  if p_visitor is null or p_visitor !~ '^[a-f0-9]{64}$' or p_feature not in ('learn', 'glossary', 'exam', 'pricing')
     or p_window_minutes is null or p_window_minutes not between 1 and 1440 then
    raise exception using errcode = '22023', message = 'INVALID_GUEST_TRIAL';
  end if;
  -- Trials older than a month are forgotten (a few at a time, on the way).
  delete from public.guest_trials
   where ctid in (select g.ctid from public.guest_trials as g where g.started_at < pg_catalog.now() - interval '30 days' limit 100);

  insert into public.guest_trials (visitor_hash, feature) values (p_visitor, p_feature)
  on conflict (visitor_hash, feature) do update
    set started_at = pg_catalog.now()
    where public.guest_trials.started_at <= pg_catalog.now() - interval '24 hours';
  select g.started_at into v_start from public.guest_trials as g where g.visitor_hash = p_visitor and g.feature = p_feature;
  v_until := v_start + pg_catalog.make_interval(mins => p_window_minutes);
  return pg_catalog.jsonb_build_object(
    'allowed', pg_catalog.now() < v_until,
    'expires_at', v_until,
    'resets_at', v_start + interval '24 hours'
  );
end;
$$;
revoke execute on function public.guest_trial_open(text, text, integer) from public, anon, authenticated;
grant execute on function public.guest_trial_open(text, text, integer) to service_role;

-- The Tutor: one question per visitor every 24 hours; all guests together get at most p_daily_cap a
-- Vietnam day. Returns 'claimed', 'used' (asked within the last 24 hours) or 'busy'.
create or replace function public.guest_tutor_claim(p_visitor text, p_daily_cap integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uses integer;
  v_started timestamptz;
  v_today timestamptz := (pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh';
  v_count integer;
begin
  if p_visitor is null or p_visitor !~ '^[a-f0-9]{64}$' or p_daily_cap is null or p_daily_cap < 0 then
    raise exception using errcode = '22023', message = 'INVALID_GUEST_TRIAL';
  end if;
  -- One claim at a time, so the daily cap is exact.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('guest_tutor', 0));

  select g.uses, g.started_at into v_uses, v_started from public.guest_trials as g where g.visitor_hash = p_visitor and g.feature = 'tutor';
  if coalesce(v_uses, 0) >= 1 and v_started > pg_catalog.now() - interval '24 hours' then
    return 'used';
  end if;
  select pg_catalog.count(*) into v_count from public.guest_trials as g
   where g.feature = 'tutor' and g.uses >= 1 and g.started_at >= v_today;
  if v_count >= p_daily_cap then
    return 'busy';
  end if;
  insert into public.guest_trials (visitor_hash, feature, started_at, uses) values (p_visitor, 'tutor', pg_catalog.now(), 1)
  on conflict (visitor_hash, feature) do update set uses = 1, started_at = pg_catalog.now();
  return 'claimed';
end;
$$;
revoke execute on function public.guest_tutor_claim(text, integer) from public, anon, authenticated;
grant execute on function public.guest_tutor_claim(text, integer) to service_role;
