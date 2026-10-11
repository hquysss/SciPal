-- 3-month and 6-month plans. The interval becomes month | quarter | half_year | year.
-- Optional intervals (quarter, half_year) can be taken off sale by an admin; month and year cannot.
-- Quarter and half-year are prepaid: auto-renew stays month/year only (backend enforces it).

create function public.billing_interval_months(p_interval text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_interval when 'month' then 1 when 'quarter' then 3 when 'half_year' then 6 when 'year' then 12 end;
$$;

-- Widen every "interval in ('month', 'year')" check.
do $$
declare
  c record;
begin
  for c in
    select con.conrelid::regclass as tbl, con.conname, pg_catalog.pg_get_constraintdef(con.oid) as def
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_namespace n on n.oid = con.connamespace
     where n.nspname = 'public' and con.contype = 'c'
       and pg_catalog.pg_get_constraintdef(con.oid) like '%''month''%''year''%'
  loop
    execute format('alter table %s drop constraint %I', c.tbl, c.conname);
    execute format('alter table %s add constraint %I %s', c.tbl, c.conname,
      replace(c.def, '''year''', '''quarter'', ''half_year'', ''year'''));
  end loop;
end;
$$;

-- Every function that turns an interval into a duration: swap the year/month case for the helper.
do $$
declare
  f record;
  v_def text;
  v_patched integer := 0;
begin
  for f in
    select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosrc like '%interval ''12 months''%'
  loop
    v_def := pg_catalog.pg_get_functiondef(f.oid);
    v_def := pg_catalog.regexp_replace(v_def,
      'case when (\w+)\.interval = ''year'' then interval ''12 months'' else interval ''1 month'' end',
      '(public.billing_interval_months(\1.interval) * interval ''1 month'')', 'g');
    if v_def like '%interval ''12 months''%' then
      raise exception 'billing interval patch missed a duration expression';
    end if;
    execute v_def;
    v_patched := v_patched + 1;
  end loop;
  if v_patched = 0 then raise exception 'no billing function carried a year/month duration'; end if;
end;
$$;

-- Same as 20261003020000_billing_plan_perks, plus: quarter and half_year prices, and null to remove one.
create or replace function public.billing_update_plan(
  p_actor_id uuid,
  p_plan_code text,
  p_expected_version integer,
  p_reason text,
  p_limits jsonb,
  p_description jsonb,
  p_prices jsonb,
  p_perks jsonb default null
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
  v_perks jsonb := '[]'::jsonb;
  v_reason text := pg_catalog.btrim(coalesce(p_reason, ''));
begin
  if p_plan_code is null or p_expected_version is null or char_length(v_reason) not between 1 and 500
     or (p_limits is not null and pg_catalog.jsonb_typeof(p_limits) <> 'array')
     or (p_description is not null and pg_catalog.jsonb_typeof(p_description) <> 'object')
     or (p_prices is not null and pg_catalog.jsonb_typeof(p_prices) <> 'object')
     or (p_perks is not null and (pg_catalog.jsonb_typeof(p_perks) <> 'array' or pg_catalog.jsonb_array_length(p_perks) > 8)) then
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

  if p_perks is not null then
    for v_item in select * from pg_catalog.jsonb_array_elements(p_perks) loop
      if pg_catalog.jsonb_typeof(v_item) <> 'object'
         or char_length(pg_catalog.btrim(coalesce(v_item ->> 'en', ''))) not between 1 and 120
         or char_length(pg_catalog.btrim(coalesce(v_item ->> 'vi', ''))) not between 1 and 120 then
        raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
      end if;
      v_perks := v_perks || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'en', pg_catalog.btrim(v_item ->> 'en'), 'vi', pg_catalog.btrim(v_item ->> 'vi')));
    end loop;
    update public.billing_plans set perks = v_perks where code = p_plan_code;
  end if;

  if p_prices is not null then
    if p_plan_code not in ('student_plus', 'teacher_pro') then
      raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
    end if;
    for v_interval in select * from pg_catalog.jsonb_object_keys(p_prices) loop
      if v_interval not in ('month', 'quarter', 'half_year', 'year') then
        raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
      end if;
      -- null takes an optional interval off sale; monthly and yearly always stay on sale.
      if p_prices -> v_interval = 'null'::jsonb then
        if v_interval in ('month', 'year') then
          raise exception using errcode = '22023', message = 'INVALID_PLAN_CHANGE';
        end if;
        update public.billing_prices set active = false
         where plan_code = p_plan_code and interval = v_interval and active;
        continue;
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

insert into public.billing_prices (plan_code, interval, amount_vnd)
values
  ('student_plus', 'quarter', 105000),
  ('student_plus', 'half_year', 199000),
  ('teacher_pro', 'quarter', 267000),
  ('teacher_pro', 'half_year', 499000);
