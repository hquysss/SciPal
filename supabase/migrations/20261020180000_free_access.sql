-- Free access (spec docs/superpowers/specs/2026-10-20-free-access-toggle-design.md): an admin switch
-- at /admin/site. While it is on, every signed-in account may use the paid features that call no AI
-- without a plan. AI (tutor_tokens, voice_minutes, author_ai_requests, ...) keeps its plan limits.
--
-- The one place that decides is billing_get_effective_quotas: billing_reserve_quota and the capacity
-- triggers (billing_capacity_limit) both read their limit from it. While free, the listed metrics get
-- the integer maximum as their limit; use is still counted. A metric added later is NOT free unless it
-- is added to the list here (a new metric may cost money).
--
-- APPLY BEFORE the backend that reads site_settings.free_access. The column defaults to false and the
-- function behaves exactly as before while it is false, so the old backend keeps working.
-- Rollback: turn the switch off. To remove it entirely, re-run the function from
-- 20260929000000_tutor_daily_quota.sql and `alter table public.site_settings drop column free_access`.

alter table public.site_settings add column if not exists free_access boolean not null default false;

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
  v_free boolean;
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

  v_free := coalesce((select s.free_access from public.site_settings as s where s.id = 1), false);

  v_period_start := pg_catalog.date_trunc('month', p_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_resets_at := (v_period_start + interval '1 month')::date::timestamp at time zone 'Asia/Ho_Chi_Minh';
  v_day := (p_now at time zone 'Asia/Ho_Chi_Minh')::date;
  v_day_resets_at := (v_day + 1)::timestamp at time zone 'Asia/Ho_Chi_Minh';

  return query
  select l.metric,
         l.kind,
         case
           when v_free and l.metric in ('graded_exam_attempts', 'active_classes', 'students_per_class',
             'import_files', 'active_authored_exams', 'code_submits', 'code_runs') then 2147483647
           else coalesce(o.limit_value, l.limit_value)::integer
         end as quota_limit,
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
