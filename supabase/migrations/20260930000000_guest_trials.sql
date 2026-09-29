-- Guest trials (chủ dự án chốt 29/09): a visitor without an account may try each feature once —
-- a 30-minute window per page feature, one answered Tutor question — then must sign in.
-- A visitor is an HMAC of their IP (backend only), so clearing cookies or a private window on the
-- same network does not start a new trial. Backend only (service_role).

create table public.guest_trials (
  visitor_hash text not null check (visitor_hash ~ '^[a-f0-9]{64}$'),
  feature text not null check (feature in ('learn', 'glossary', 'exam', 'pricing', 'tutor')),
  started_at timestamptz not null default now(),
  uses integer not null default 0 check (uses >= 0),
  primary key (visitor_hash, feature)
);
create index guest_trials_feature_started_idx on public.guest_trials (feature, started_at);
alter table public.guest_trials enable row level security;
revoke all on public.guest_trials from public, anon, authenticated;
grant select, insert, update, delete on public.guest_trials to service_role;

-- A page feature: the first visit opens the window; later visits read it.
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
  on conflict (visitor_hash, feature) do nothing;
  select g.started_at into v_start from public.guest_trials as g where g.visitor_hash = p_visitor and g.feature = p_feature;
  v_until := v_start + pg_catalog.make_interval(mins => p_window_minutes);
  return pg_catalog.jsonb_build_object('allowed', pg_catalog.now() < v_until, 'expires_at', v_until);
end;
$$;
revoke execute on function public.guest_trial_open(text, text, integer) from public, anon, authenticated;
grant execute on function public.guest_trial_open(text, text, integer) to service_role;

-- The Tutor: one question per visitor; all guests together get at most p_daily_cap a Vietnam day.
-- Returns 'claimed', 'used' (this visitor already asked) or 'busy' (today's guest questions ran out).
create or replace function public.guest_tutor_claim(p_visitor text, p_daily_cap integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uses integer;
  v_today timestamptz := (pg_catalog.date_trunc('day', pg_catalog.now() at time zone 'Asia/Ho_Chi_Minh')) at time zone 'Asia/Ho_Chi_Minh';
  v_count integer;
begin
  if p_visitor is null or p_visitor !~ '^[a-f0-9]{64}$' or p_daily_cap is null or p_daily_cap < 0 then
    raise exception using errcode = '22023', message = 'INVALID_GUEST_TRIAL';
  end if;
  -- One claim at a time, so the daily cap is exact.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('guest_tutor', 0));

  select g.uses into v_uses from public.guest_trials as g where g.visitor_hash = p_visitor and g.feature = 'tutor';
  if coalesce(v_uses, 0) >= 1 then
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

-- The model failed: the visitor keeps their question.
create or replace function public.guest_tutor_release(p_visitor text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.guest_trials set uses = 0 where visitor_hash = p_visitor and feature = 'tutor' and uses >= 1;
$$;
revoke execute on function public.guest_tutor_release(text) from public, anon, authenticated;
grant execute on function public.guest_tutor_release(text) to service_role;
