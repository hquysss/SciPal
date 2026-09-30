-- Extra benefits of a plan, written by admins and shown on the pricing cards under the limits
-- (limits are listed from billing_plan_limits; these are the other things a plan gives).
-- perks: [{en, vi}], at most 8, each 1–120 characters. Edited through billing_update_plan.

alter table public.billing_plans
  add column perks jsonb not null default '[]'::jsonb
  check (pg_catalog.jsonb_typeof(perks) = 'array' and pg_catalog.jsonb_array_length(perks) <= 8);

create or replace function public.billing_plan_state(p_plan_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select pg_catalog.jsonb_build_object(
    'description', pg_catalog.jsonb_build_object('en', p.description_en, 'vi', p.description_vi),
    'perks', p.perks,
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

-- Same as before (20260929140000_admin_plan_settings) plus p_perks: [{en, vi}] or null (unchanged).
drop function public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb);

create function public.billing_update_plan(
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
revoke execute on function public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb, jsonb) to service_role;

-- Starting benefits for the student plans: only things the plans already give today.
update public.billing_plans set perks = '[
  {"vi": "Toàn bộ bài học, song ngữ Việt – Anh", "en": "Every lesson, in Vietnamese and English"},
  {"vi": "Từ điển thuật ngữ song ngữ", "en": "Bilingual glossary of terms"},
  {"vi": "Theo dõi tiến độ, XP và chuỗi ngày học", "en": "Progress, XP and study streaks"},
  {"vi": "Vào lớp của giáo viên và làm bài được giao", "en": "Join your teacher''s class and do assigned work"}
]'::jsonb where code = 'student_free';

update public.billing_plans set perks = '[
  {"vi": "Mọi quyền lợi của gói Miễn phí", "en": "Everything in the Free plan"},
  {"vi": "Hỏi Gia sư AI thoải mái hơn khi ôn thi", "en": "More room to ask the AI tutor while you revise"},
  {"vi": "Thi thử có chấm điểm nhiều lần hơn", "en": "More graded practice exams"}
]'::jsonb where code = 'student_plus';
