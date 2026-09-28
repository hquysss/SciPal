-- Tutor limits decided 28/09: free students and free teachers get 5 Tutor requests a day
-- (Vietnam day); Student Plus 200 a month; Teacher Pro 200 a month (to confirm); admins are not
-- metered (routes/tutor.ts). Adds the 'daily' kind to the quota ledger, and a 10-minute lease so
-- a long answer is still counted when it finishes.

alter table public.billing_plan_limits drop constraint billing_plan_limits_kind_check;
alter table public.billing_plan_limits drop constraint billing_plan_limits_check;
alter table public.billing_plan_limits
  add constraint billing_plan_limits_kind_check check (kind in ('daily', 'monthly', 'capacity')),
  add constraint billing_plan_limits_check check (
    (metric = 'tutor_requests' and kind in ('daily', 'monthly'))
    or (metric in ('graded_exam_attempts', 'import_files', 'author_ai_requests') and kind = 'monthly')
    or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
  );

update public.billing_plan_limits set kind = 'daily', limit_value = 5
 where plan_code = 'student_free' and metric = 'tutor_requests';
insert into public.billing_plan_limits (plan_code, metric, kind, limit_value)
values ('teacher_free', 'tutor_requests', 'daily', 5),
       ('teacher_pro', 'tutor_requests', 'monthly', 200);

update public.billing_plans set
  description_en = 'Core lessons and progress tracking, 5 Tutor requests a day and 3 graded exam attempts a month.',
  description_vi = 'Bài học cốt lõi và theo dõi tiến độ, 5 lượt Tutor mỗi ngày và 3 lượt thi chấm điểm mỗi tháng.'
 where code = 'student_free';
update public.billing_plans set
  description_en = 'One active class, 50 students per class, five imports, five active authored exams, 5 Tutor requests a day, and no monthly lesson-authoring AI requests.',
  description_vi = 'Một lớp hoạt động, 50 học sinh mỗi lớp, 5 tệp nhập, 5 đề tự soạn đang hoạt động, 5 lượt Tutor mỗi ngày và không có lượt AI soạn bài theo tháng.'
 where code = 'teacher_free';
update public.billing_plans set
  description_en = 'Ten active classes, 50 students per class, 100 imports, 100 active authored exams, 200 Tutor requests and 100 lesson-authoring AI requests each month.',
  description_vi = '10 lớp hoạt động, 50 học sinh mỗi lớp, 100 tệp nhập, 100 đề tự soạn đang hoạt động, 200 lượt Tutor và 100 lượt AI soạn bài mỗi tháng.'
 where code = 'teacher_pro';

-- Daily quotas count per Vietnam day and reset at the next Vietnam midnight.
create or replace function public.billing_get_effective_quotas(p_user_id uuid, p_now timestamptz)
returns table (
  metric text,
  kind text,
  quota_limit integer,
  used integer,
  reserved integer,
  source text,
  expires_at timestamptz,
  resets_at timestamptz
)
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_plan_code text;
  v_period_start date;
  v_resets_at timestamptz;
  v_day date;
  v_day_resets_at timestamptz;
begin
  if p_user_id is null or p_now is null then
    raise exception using errcode = '22023', message = 'INVALID_BILLING_ACCOUNT';
  end if;

  select u.raw_app_meta_data ->> 'app_role'
    into v_role
    from auth.users as u
   where u.id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'BILLING_ACCOUNT_NOT_FOUND';
  end if;
  -- Sign-up (handle_new_user) sets no app_role: an account without one is a student.
  v_role := coalesce(v_role, 'student');
  if v_role not in ('student', 'teacher') then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_BILLING_ROLE';
  end if;

  select s.plan_code
    into v_plan_code
    from public.billing_subscriptions as s
    join public.billing_plans as p on p.code = s.plan_code and p.audience = v_role
   where s.user_id = p_user_id
     and s.paid_through > p_now
     and p.active;
  if v_plan_code is null then
    v_plan_code := case v_role when 'student' then 'student_free' else 'teacher_free' end;
  end if;

  v_period_start := pg_catalog.date_trunc('month', p_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_resets_at := (v_period_start + interval '1 month')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_day := (p_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_day_resets_at := (v_day + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';

  return query
  select l.metric,
         l.kind,
         coalesce(o.limit_value, l.limit_value)::integer as quota_limit,
         case l.kind
           when 'capacity' then case l.metric
             when 'active_classes' then (
               select count(c.teacher_id)::integer from public.class_rooms as c where c.teacher_id = p_user_id
             )
             when 'students_per_class' then coalesce((
               select max(class_usage.member_count)::integer
                 from (
                   select count(cm.student_id) as member_count
                     from public.class_rooms as c
                     left join public.class_members as cm on cm.class_id = c.id
                    where c.teacher_id = p_user_id
                    group by c.id
                 ) as class_usage
             ), 0)
             when 'active_authored_exams' then (
               select count(e.created_by)::integer
                 from public.exam_blueprints as e
                where e.created_by = p_user_id
                  and e.status in ('draft', 'pending_review', 'published')
             )
             else 0
           end
           else coalesce(u.used, 0)
         end::integer as used,
         case when l.kind = 'capacity' then 0 else coalesce(u.reserved, 0) end::integer as reserved,
         case when o.user_id is null then 'plan' else 'override' end as source,
         o.expires_at,
         case l.kind when 'monthly' then v_resets_at when 'daily' then v_day_resets_at else null end as resets_at
    from public.billing_plan_limits as l
    left join public.account_quota_overrides as o
      on o.user_id = p_user_id
     and o.metric = l.metric
     and (o.expires_at is null or o.expires_at > p_now)
    left join public.quota_usage as u
      on u.user_id = p_user_id
     and u.metric = l.metric
     and u.period_start = case l.kind when 'daily' then v_day else v_period_start end
   where l.plan_code = v_plan_code
   order by l.metric;
end;
$$;

-- The period comes from the quota's kind (a Vietnam day or month); the answer carries the kind.
create or replace function public.billing_reserve_quota(
  p_user_id uuid,
  p_metric text,
  p_operation_id uuid,
  p_request_hash text,
  p_units integer default 1
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_period_start date;
  v_limit integer;
  v_used integer;
  v_reserved integer;
  v_resets_at timestamptz;
  v_kind text;
  v_expired_units integer;
  v_existing public.quota_operations%rowtype;
begin
  if p_user_id is null or p_operation_id is null or p_units is null or p_units <= 0
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_QUOTA_RESERVATION';
  end if;

  select q.quota_limit, q.kind, q.resets_at
    into v_limit, v_kind, v_resets_at
    from public.billing_get_effective_quotas(p_user_id, v_now) as q
   where q.metric = p_metric;
  if not found then
    raise exception using errcode = '22023', message = 'UNKNOWN_QUOTA_METRIC';
  end if;
  if v_kind = 'capacity' then
    raise exception using errcode = 'P0001', message = 'CAPACITY_RESERVATION_UNSUPPORTED';
  end if;

  v_period_start := case v_kind
    when 'daily' then (v_now at time zone 'Asia/Ho_Chi_Minh')::date
    else pg_catalog.date_trunc('month', v_now at time zone 'Asia/Ho_Chi_Minh')::date
  end;

  insert into public.quota_usage (user_id, metric, period_start)
  values (p_user_id, p_metric, v_period_start)
  on conflict (user_id, metric, period_start) do nothing;

  perform 1
    from public.quota_usage as q
   where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start
   for update;

  with expired as (
    update public.quota_operations as op
       set state = 'released', settled_at = v_now
     where op.user_id = p_user_id
       and op.metric = p_metric
       and op.period_start = v_period_start
       and op.state = 'reserved'
       and op.lease_expires_at <= v_now
     returning op.units
  )
  select coalesce(sum(expired.units), 0)::integer
    into v_expired_units
    from expired;
  if v_expired_units > 0 then
    update public.quota_usage as q
       set reserved = q.reserved - v_expired_units,
           updated_at = v_now
     where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start;
  end if;

  select op.*
    into v_existing
    from public.quota_operations as op
   where op.operation_id = p_operation_id
   for update;
  if found then
    if v_existing.user_id <> p_user_id or v_existing.metric <> p_metric
      or v_existing.request_hash <> p_request_hash or v_existing.units <> p_units then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    select q.used, q.reserved
      into v_used, v_reserved
      from public.quota_usage as q
     where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_existing.period_start;
    return pg_catalog.jsonb_build_object(
      'operation_id', v_existing.operation_id,
      'state', v_existing.state,
      'kind', v_kind,
      'remaining', greatest(v_limit - v_used - v_reserved, 0),
      'resets_at', v_resets_at
    );
  end if;

  select q.used, q.reserved
    into v_used, v_reserved
    from public.quota_usage as q
   where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start;
  if v_used + v_reserved + p_units > v_limit then
    raise exception using errcode = 'P0001', message = 'QUOTA_EXCEEDED';
  end if;

  begin
    insert into public.quota_operations (
      operation_id, user_id, metric, period_start, request_hash, units, state, lease_expires_at
    ) values (
      p_operation_id, p_user_id, p_metric, v_period_start, p_request_hash, p_units, 'reserved', v_now + interval '10 minutes'
    );
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end;
  update public.quota_usage as q
     set reserved = q.reserved + p_units,
         updated_at = v_now
   where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start
  returning q.used, q.reserved into v_used, v_reserved;

  return pg_catalog.jsonb_build_object(
    'operation_id', p_operation_id,
    'state', 'reserved',
    'kind', v_kind,
    'remaining', greatest(v_limit - v_used - v_reserved, 0),
    'resets_at', v_resets_at
  );
end;
$$;
