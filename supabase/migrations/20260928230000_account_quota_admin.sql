-- Account quota overrides by admins (Task 2 of docs/superpowers/plans/2026-09-28-account-pricing-billing.md).

-- 1. Accounts created by sign-up have no app_role: treat them as students instead of failing.
--    An account id that does not exist now fails with BILLING_ACCOUNT_NOT_FOUND.
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

  return query
  select l.metric,
         l.kind,
         coalesce(o.limit_value, l.limit_value)::integer as quota_limit,
         case l.kind
           when 'monthly' then coalesce(u.used, 0)
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
           else 0
         end::integer as used,
         case when l.kind = 'monthly' then coalesce(u.reserved, 0) else 0 end::integer as reserved,
         case when o.user_id is null then 'plan' else 'override' end as source,
         o.expires_at,
         case when l.kind = 'monthly' then v_resets_at else null end as resets_at
    from public.billing_plan_limits as l
    left join public.account_quota_overrides as o
      on o.user_id = p_user_id
     and o.metric = l.metric
     and (o.expires_at is null or o.expires_at > p_now)
    left join public.quota_usage as u
      on u.user_id = p_user_id
     and u.metric = l.metric
     and u.period_start = v_period_start
   where l.plan_code = v_plan_code
   order by l.metric;
end;
$$;


-- 2. Set or reset overrides with a version check and an audit row, atomically.
-- Admin sets or resets per-account quota overrides (backend/src/routes/accountQuotas.ts).
-- One transaction: version check, override writes and the audit row succeed or fail together.
-- p_changes: [{ "metric": text, "action": "set", "limit": int >= 0, "expires_at": timestamptz | null }
--             | { "metric": text, "action": "reset" }]
create or replace function public.billing_update_account_quotas(
  p_actor_id uuid,
  p_target_id uuid,
  p_expected_version integer,
  p_changes jsonb,
  p_reason text,
  p_now timestamptz
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_version integer;
  v_change jsonb;
  v_metric text;
  v_action text;
  v_limit integer;
  v_expires timestamptz;
  v_before jsonb;
  v_after jsonb;
  v_metrics text[];
  v_seen text[] := array[]::text[];
begin
  if p_actor_id is null or p_target_id is null or p_expected_version is null or p_now is null
    or p_changes is null or pg_catalog.jsonb_typeof(p_changes) <> 'array'
    or pg_catalog.jsonb_array_length(p_changes) = 0 or pg_catalog.jsonb_array_length(p_changes) > 7
    or p_reason is null or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 500 then
    raise exception using errcode = '22023', message = 'INVALID_QUOTA_CHANGE';
  end if;

  -- The metrics of the account's plan; also rejects admins and unknown accounts.
  select pg_catalog.array_agg(q.metric)
    into v_metrics
    from public.billing_get_effective_quotas(p_target_id, p_now) as q;

  insert into public.account_quota_versions (user_id) values (p_target_id)
  on conflict (user_id) do nothing;
  select v.version into v_version
    from public.account_quota_versions as v
   where v.user_id = p_target_id
   for update;
  if v_version <> p_expected_version then
    raise exception using errcode = 'P0001', message = 'QUOTA_VERSION_CONFLICT';
  end if;

  select coalesce(pg_catalog.jsonb_object_agg(o.metric, pg_catalog.jsonb_build_object('limit', o.limit_value, 'expires_at', o.expires_at)), '{}'::jsonb)
    into v_before
    from public.account_quota_overrides as o
   where o.user_id = p_target_id;

  for v_change in select * from pg_catalog.jsonb_array_elements(p_changes) loop
    v_metric := v_change ->> 'metric';
    v_action := v_change ->> 'action';
    if v_metric is null or not (v_metric = any(v_metrics)) or v_metric = any(v_seen) then
      raise exception using errcode = '22023', message = 'INVALID_QUOTA_CHANGE';
    end if;
    v_seen := v_seen || v_metric;
    if v_action = 'reset' then
      delete from public.account_quota_overrides as o where o.user_id = p_target_id and o.metric = v_metric;
    elsif v_action = 'set' then
      if pg_catalog.jsonb_typeof(v_change -> 'limit') <> 'number'
        or (v_change ->> 'limit')::numeric <> pg_catalog.trunc((v_change ->> 'limit')::numeric)
        or (v_change ->> 'limit')::numeric < 0 or (v_change ->> 'limit')::numeric > 1000000 then
        raise exception using errcode = '22023', message = 'INVALID_QUOTA_CHANGE';
      end if;
      v_limit := (v_change ->> 'limit')::integer;
      v_expires := case when v_change -> 'expires_at' is null or pg_catalog.jsonb_typeof(v_change -> 'expires_at') = 'null'
                        then null else (v_change ->> 'expires_at')::timestamptz end;
      if v_expires is not null and v_expires <= p_now then
        raise exception using errcode = '22023', message = 'INVALID_QUOTA_CHANGE';
      end if;
      insert into public.account_quota_overrides (user_id, metric, limit_value, expires_at, version, updated_by, updated_at)
      values (p_target_id, v_metric, v_limit, v_expires, v_version + 1, p_actor_id, p_now)
      on conflict (user_id, metric) do update
        set limit_value = excluded.limit_value,
            expires_at = excluded.expires_at,
            version = excluded.version,
            updated_by = excluded.updated_by,
            updated_at = excluded.updated_at;
    else
      raise exception using errcode = '22023', message = 'INVALID_QUOTA_CHANGE';
    end if;
  end loop;

  select coalesce(pg_catalog.jsonb_object_agg(o.metric, pg_catalog.jsonb_build_object('limit', o.limit_value, 'expires_at', o.expires_at)), '{}'::jsonb)
    into v_after
    from public.account_quota_overrides as o
   where o.user_id = p_target_id;

  insert into public.account_quota_audit (actor_id, target_id, before_state, after_state, reason, created_at)
  values (p_actor_id, p_target_id, v_before, v_after, pg_catalog.btrim(p_reason), p_now);

  update public.account_quota_versions as v
     set version = v_version + 1, updated_at = p_now
   where v.user_id = p_target_id;
  return v_version + 1;
end;
$$;
revoke execute on function public.billing_update_account_quotas(uuid, uuid, integer, jsonb, text, timestamptz) from public, anon, authenticated;
grant execute on function public.billing_update_account_quotas(uuid, uuid, integer, jsonb, text, timestamptz) to service_role;
