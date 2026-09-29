-- Admins edit a plan's default limits, description and prices (chủ dự án chốt 29/09, phương án B).
-- One transaction per save: version check, writes, audit. A price is never edited in place (sold
-- orders keep their snapshot, protect_billing_price refuses it): a new price row replaces the
-- active one of that interval. Backend only (service_role).

create table public.billing_plan_audit (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null references public.billing_plans(code) on delete restrict,
  actor_id uuid references auth.users(id) on delete set null,
  before_state jsonb not null,
  after_state jsonb not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
create index billing_plan_audit_plan_created_idx on public.billing_plan_audit (plan_code, created_at desc);
alter table public.billing_plan_audit enable row level security;
revoke all on public.billing_plan_audit from public, anon, authenticated;
grant select, insert on public.billing_plan_audit to service_role;

-- The editable state of a plan, as the admin page shows it and the audit records it.
create or replace function public.billing_plan_state(p_plan_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'description', pg_catalog.jsonb_build_object('en', p.description_en, 'vi', p.description_vi),
    'limits', coalesce((
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('metric', l.metric, 'kind', l.kind, 'limit', l.limit_value) order by l.metric)
        from public.billing_plan_limits as l where l.plan_code = p.code), '[]'::jsonb),
    'prices', coalesce((
      select pg_catalog.jsonb_object_agg(pr.interval, pr.amount_vnd)
        from public.billing_prices as pr where pr.plan_code = p.code and pr.active), '{}'::jsonb)
  )
  from public.billing_plans as p
  where p.code = p_plan_code;
$$;
revoke execute on function public.billing_plan_state(text) from public, anon, authenticated;
grant execute on function public.billing_plan_state(text) to service_role;

-- p_limits: [{metric, kind, limit}] for metrics the plan already has (only tutor_requests may
-- switch between daily and monthly). p_description: {en, vi} or null. p_prices: {month, year}
-- (paid plans only) or null. Returns the new version.
create or replace function public.billing_update_plan(
  p_actor_id uuid,
  p_plan_code text,
  p_expected_version integer,
  p_reason text,
  p_limits jsonb,
  p_description jsonb,
  p_prices jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan record;
  v_before jsonb;
  v_item jsonb;
  v_metric text;
  v_kind text;
  v_limit integer;
  v_interval text;
  v_amount integer;
  v_current integer;
  v_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
begin
  if p_plan_code is null or p_expected_version is null or char_length(v_reason) not between 1 and 500
     or (p_limits is not null and pg_catalog.jsonb_typeof(p_limits) <> 'array')
     or (p_description is not null and pg_catalog.jsonb_typeof(p_description) <> 'object')
     or (p_prices is not null and pg_catalog.jsonb_typeof(p_prices) <> 'object') then
    raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
  end if;

  select p.* into v_plan from public.billing_plans as p where p.code = p_plan_code for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'PLAN_NOT_FOUND';
  end if;
  if v_plan.version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'PLAN_VERSION_CONFLICT';
  end if;
  v_before := public.billing_plan_state(p_plan_code);

  for v_item in select * from pg_catalog.jsonb_array_elements(coalesce(p_limits, '[]'::jsonb)) loop
    v_metric := v_item ->> 'metric';
    v_kind := v_item ->> 'kind';
    begin
      v_limit := (v_item ->> 'limit')::integer;
    exception when others then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end;
    if v_limit is null or v_limit < 0 or v_limit > 1000000 then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end if;
    if not exists (select 1 from public.billing_plan_limits as l where l.plan_code = p_plan_code and l.metric = v_metric) then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end if;
    -- The table's check keeps each metric to its allowed kinds (only Tutor can be daily or monthly).
    begin
      update public.billing_plan_limits
         set limit_value = v_limit, kind = coalesce(v_kind, kind)
       where plan_code = p_plan_code and metric = v_metric;
    exception when check_violation then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end;
  end loop;

  if p_description is not null then
    if char_length(pg_catalog.btrim(coalesce(p_description ->> 'en', ''))) not between 1 and 500
       or char_length(pg_catalog.btrim(coalesce(p_description ->> 'vi', ''))) not between 1 and 500 then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end if;
    update public.billing_plans
       set description_en = pg_catalog.btrim(p_description ->> 'en'), description_vi = pg_catalog.btrim(p_description ->> 'vi')
     where code = p_plan_code;
  end if;

  if p_prices is not null then
    if p_plan_code not in ('student_plus', 'teacher_pro') then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end if;
    for v_interval in select * from pg_catalog.jsonb_object_keys(p_prices) loop
      if v_interval not in ('month', 'year') then
        raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
      end if;
      begin
        v_amount := (p_prices ->> v_interval)::integer;
      exception when others then
        raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
      end;
      if v_amount is null or v_amount < 1000 or v_amount > 100000000 then
        raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
      end if;
      select pr.amount_vnd into v_current from public.billing_prices as pr
       where pr.plan_code = p_plan_code and pr.interval = v_interval and pr.active;
      if v_current is distinct from v_amount then
        -- Orders already made keep their price; new checkouts get the new one.
        update public.billing_prices set active = false
         where plan_code = p_plan_code and interval = v_interval and active;
        insert into public.billing_prices (plan_code, interval, amount_vnd) values (p_plan_code, v_interval, v_amount);
      end if;
    end loop;
  end if;

  update public.billing_plans set version = version + 1 where code = p_plan_code;
  insert into public.billing_plan_audit (plan_code, actor_id, before_state, after_state, reason)
  values (p_plan_code, p_actor_id, v_before, public.billing_plan_state(p_plan_code), v_reason);
  return v_plan.version + 1;
end;
$$;
revoke execute on function public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb) to service_role;
