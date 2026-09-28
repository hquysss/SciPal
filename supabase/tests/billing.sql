\set ON_ERROR_STOP on

select 'create role anon nologin' where not exists (select 1 from pg_roles where rolname = 'anon') \gexec
select 'create role authenticated nologin' where not exists (select 1 from pg_roles where rolname = 'authenticated') \gexec
select 'create role service_role nologin bypassrls' where not exists (select 1 from pg_roles where rolname = 'service_role') \gexec

create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);
create table public.class_rooms (id uuid primary key, teacher_id uuid not null);
create table public.class_members (class_id uuid not null, student_id uuid not null);
create table public.exam_blueprints (id uuid primary key, created_by uuid, status text not null);

insert into auth.users (id, raw_app_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', '{"app_role":"student"}'),
  ('00000000-0000-4000-8000-000000000002', '{"app_role":"student"}'),
  ('00000000-0000-4000-8000-000000000003', '{"app_role":"teacher"}'),
  ('00000000-0000-4000-8000-000000000004', '{}'),
  ('00000000-0000-4000-8000-000000000005', '{"app_role":"admin"}');
insert into public.class_rooms (id, teacher_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003');
insert into public.class_members (class_id, student_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

\ir ../migrations/20260928102931_billing_foundation.sql
\ir ../migrations/20260928230000_account_quota_admin.sql

insert into public.billing_subscriptions (user_id, plan_code, paid_through)
values ('00000000-0000-4000-8000-000000000001', 'student_plus', '2027-09-30T16:00:00Z');
insert into public.quota_usage (user_id, metric, period_start, used)
values ('00000000-0000-4000-8000-000000000001', 'tutor_requests', '2026-09-01', 40);
insert into public.account_quota_overrides (user_id, metric, limit_value, version)
values ('00000000-0000-4000-8000-000000000001', 'tutor_requests', 500, 1);

set role service_role;
do $$
declare
  v_price_id uuid;
  v_quota record;
  v_role_count integer;
  v_rejected boolean;
  v_reservation jsonb;
  v_replay jsonb;
  v_operation_id constant uuid := '20000000-0000-4000-8000-000000000001';
begin
  if (select count(*) from public.billing_plans) <> 4 then
    raise exception 'Expected four plan records';
  end if;
  if (select count(*) from public.billing_prices) <> 4 then
    raise exception 'Expected four paid price records';
  end if;
  if (select count(*) from public.billing_plan_limits) <> 14 then
    raise exception 'Expected fourteen plan limits';
  end if;
  if (select amount_vnd from public.billing_prices where plan_code = 'student_plus' and interval = 'month') <> 39000
    or (select amount_vnd from public.billing_prices where plan_code = 'student_plus' and interval = 'year') <> 390000
    or (select amount_vnd from public.billing_prices where plan_code = 'teacher_pro' and interval = 'month') <> 99000
    or (select amount_vnd from public.billing_prices where plan_code = 'teacher_pro' and interval = 'year') <> 990000 then
    raise exception 'Seeded prices do not match the approved catalog';
  end if;
  if exists (select 1 from public.billing_prices where plan_code in ('student_free', 'teacher_free')) then
    raise exception 'Free plans must not have checkout prices';
  end if;
  if (select count(*) from public.billing_plan_limits where plan_code in ('student_plus', 'student_free') and metric in ('tutor_requests', 'graded_exam_attempts')) <> 4
    or (select limit_value from public.billing_plan_limits where plan_code = 'student_free' and metric = 'tutor_requests') <> 10
    or (select limit_value from public.billing_plan_limits where plan_code = 'student_plus' and metric = 'graded_exam_attempts') <> 30
    or (select limit_value from public.billing_plan_limits where plan_code = 'teacher_free' and metric = 'author_ai_requests') <> 0 then
    raise exception 'Seeded plan limits do not match the approved catalog';
  end if;

  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T16:59:59.999Z')
   where metric = 'tutor_requests';
  if v_quota.quota_limit <> 500 or v_quota.used <> 40 or v_quota.source <> 'override'
    or v_quota.resets_at <> '2026-09-30T17:00:00Z'::timestamptz then
    raise exception 'Active override or Vietnam monthly period was not applied';
  end if;
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T16:59:59.999Z')
   where metric = 'graded_exam_attempts';
  if v_quota.quota_limit <> 30 then
    raise exception 'Annual payment multiplied monthly quota';
  end if;

  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T17:00:00Z')
   where metric = 'tutor_requests';
  if v_quota.resets_at <> '2026-10-31T17:00:00Z'::timestamptz or v_quota.used <> 0 then
    raise exception 'Quota period did not roll at Vietnam midnight';
  end if;
  if (select used from public.quota_usage where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests' and period_start = '2026-09-01') <> 40 then
    raise exception 'Prior period usage was removed during reset';
  end if;

  update public.account_quota_overrides
     set expires_at = '2026-09-30T16:00:00Z'
   where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests';
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T16:00:00Z')
   where metric = 'tutor_requests';
  if v_quota.quota_limit <> 200 or v_quota.source <> 'plan' or v_quota.used <> 40 then
    raise exception 'Expired override did not fall back to the subscription quota';
  end if;

  update public.account_quota_overrides
     set limit_value = 0, expires_at = null
   where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests';
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-28T00:00:00Z')
   where metric = 'tutor_requests';
  if v_quota.quota_limit <> 0 then
    raise exception 'Zero quota was not preserved as a blocking limit';
  end if;
  v_rejected := false;
  begin
    perform public.billing_reserve_quota(
      '00000000-0000-4000-8000-000000000001', 'tutor_requests',
      '20000000-0000-4000-8000-000000000002', repeat('a', 64), 1
    );
  exception when sqlstate 'P0001' then
    v_rejected := sqlerrm = 'QUOTA_EXCEEDED';
  end;
  if not v_rejected then
    raise exception 'Zero quota did not block a reservation';
  end if;

  update public.account_quota_overrides
     set limit_value = 500, expires_at = null
   where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests';
  v_reservation := public.billing_reserve_quota(
    '00000000-0000-4000-8000-000000000001', 'tutor_requests', v_operation_id, repeat('b', 64), 1
  );
  v_replay := public.billing_reserve_quota(
    '00000000-0000-4000-8000-000000000001', 'tutor_requests', v_operation_id, repeat('b', 64), 1
  );
  if v_reservation ->> 'state' <> 'reserved' or v_replay ->> 'operation_id' <> v_operation_id::text
    or (select reserved from public.quota_usage where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests' and period_start = '2026-09-01') <> 1 then
    raise exception 'Reservation retry consumed quota more than once';
  end if;
  v_rejected := false;
  begin
    perform public.billing_reserve_quota(
      '00000000-0000-4000-8000-000000000001', 'tutor_requests', v_operation_id, repeat('c', 64), 1
    );
  exception when sqlstate 'P0001' then
    v_rejected := sqlerrm = 'IDEMPOTENCY_CONFLICT';
  end;
  if not v_rejected then
    raise exception 'A reused operation ID with a different payload was accepted';
  end if;
  if not public.billing_settle_quota(v_operation_id, 'release')
    or not public.billing_settle_quota(v_operation_id, 'release')
    or public.billing_settle_quota(v_operation_id, 'commit') then
    raise exception 'Quota settlement was not idempotent';
  end if;

  update public.account_quota_overrides
     set expires_at = '2026-09-01T00:00:00Z'
   where user_id = '00000000-0000-4000-8000-000000000001' and metric = 'tutor_requests';
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T16:00:00Z')
   where metric = 'tutor_requests';
  if v_quota.used <> 40 then
    raise exception 'Changing an override lost usage history';
  end if;

  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000003', '2026-09-30T16:00:00Z')
   where metric = 'students_per_class';
  if v_quota.quota_limit <> 50 or v_quota.used <> 2 then
    raise exception 'Teacher capacity usage is not scoped to the teacher''s class';
  end if;
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000003', '2026-09-30T16:00:00Z')
   where metric = 'active_classes';
  if v_quota.quota_limit <> 1 or v_quota.used <> 1 then
    raise exception 'Teacher free class capacity was not calculated';
  end if;

  select id into v_price_id from public.billing_prices where plan_code = 'student_plus' and interval = 'month';
  insert into public.billing_orders (
    user_id, price_id, plan_code, interval, amount_vnd, idempotency_key, payload_hash, expires_at
  ) values (
    '00000000-0000-4000-8000-000000000001', v_price_id, 'student_plus', 'month', 39000,
    'sql-billing-order', repeat('d', 64), '2026-10-01T00:00:00Z'
  );
  v_rejected := false;
  begin
    update public.billing_orders
       set amount_vnd = 1
     where idempotency_key = 'sql-billing-order';
  exception when sqlstate 'P0001' then
    v_rejected := sqlerrm = 'BILLING_ORDER_SNAPSHOT_IMMUTABLE';
  end;
  if not v_rejected or (select amount_vnd from public.billing_orders where idempotency_key = 'sql-billing-order') <> 39000 then
    raise exception 'A pending order price snapshot was changed';
  end if;
  update public.billing_orders
     set status = 'paid', paid_at = '2026-09-28T00:00:00Z'
   where idempotency_key = 'sql-billing-order';
  v_rejected := false;
  begin
    update public.billing_orders
       set status = 'pending'
     where idempotency_key = 'sql-billing-order';
  exception when sqlstate 'P0001' then
    v_rejected := sqlerrm = 'PAID_ORDER_STATUS_IMMUTABLE';
  end;
  if not v_rejected or (select status from public.billing_orders where idempotency_key = 'sql-billing-order') <> 'paid' then
    raise exception 'A paid order status was changed';
  end if;
  v_rejected := false;
  begin
    update public.billing_prices set amount_vnd = 1 where id = v_price_id;
  exception when sqlstate 'P0001' then
    v_rejected := sqlerrm = 'BILLING_PRICE_IMMUTABLE';
  end;
  if not v_rejected or (select amount_vnd from public.billing_orders where idempotency_key = 'sql-billing-order') <> 39000 then
    raise exception 'A sold price or its order snapshot was changed';
  end if;

  select count(*) into v_role_count
    from pg_catalog.pg_class as c
    join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname = any(array[
       'billing_plans', 'billing_prices', 'billing_plan_limits', 'billing_orders',
       'billing_payment_attempts', 'billing_events', 'billing_subscriptions', 'billing_grants',
       'account_quota_versions', 'account_quota_overrides', 'account_quota_audit', 'quota_usage', 'quota_operations'
     ])
     and c.relrowsecurity;
  if v_role_count <> 13 then
    raise exception 'RLS is not enabled for every internal billing table';
  end if;
  if has_table_privilege('anon', 'public.billing_plans', 'select')
    or has_table_privilege('authenticated', 'public.billing_subscriptions', 'select')
    or has_function_privilege('anon', 'public.billing_reserve_quota(uuid,text,uuid,text,integer)', 'execute')
    or not has_function_privilege('service_role', 'public.billing_reserve_quota(uuid,text,uuid,text,integer)', 'execute') then
    raise exception 'Billing tables or RPCs have an unsafe grant';
  end if;

  if (select used from public.quota_usage where user_id = '00000000-0000-4000-8000-000000000002' and metric = 'tutor_requests' and period_start = '2026-09-01') is not null then
    raise exception 'Usage leaked between accounts';
  end if;
end;
$$;
reset role;

set role service_role;
do $$
declare
  v_quota record;
begin
  select * into v_quota
    from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000001', '2026-09-30T16:59:59.999Z')
   where metric = 'graded_exam_attempts';
  if v_quota.quota_limit <> 30 then
    raise exception 'service_role could not read effective quotas';
  end if;
end;
$$;
reset role;

set role anon;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.billing_plans;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'Anonymous role read the internal billing catalog';
  end if;
end;
$$;
reset role;

-- Task 2: accounts without a role, and admin quota overrides.
set role service_role;
do $$
declare
  v_quota record;
  v_version integer;
  v_failed text;
  c_student constant uuid := '00000000-0000-4000-8000-000000000002';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  c_now constant timestamptz := '2026-09-15T00:00:00Z';
begin
  -- An account without app_role is a Free student.
  select * into v_quota from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000004', c_now) where metric = 'tutor_requests';
  if v_quota.quota_limit <> 10 or v_quota.source <> 'plan' then
    raise exception 'An account without a role did not get the Student Free quota';
  end if;

  -- Unknown accounts and admins have no quotas.
  begin
    perform 1 from public.billing_get_effective_quotas('00000000-0000-4000-8000-0000000000ff', c_now);
    raise exception 'unreachable';
  exception when others then v_failed := sqlerrm; end;
  if v_failed <> 'BILLING_ACCOUNT_NOT_FOUND' then raise exception 'Unknown account: %', v_failed; end if;
  begin
    perform 1 from public.billing_get_effective_quotas(c_admin, c_now);
    raise exception 'unreachable';
  exception when others then v_failed := sqlerrm; end;
  if v_failed <> 'UNSUPPORTED_BILLING_ROLE' then raise exception 'Admin account: %', v_failed; end if;

  -- Set: a new override wins, the version goes 0 -> 1 and one audit row is written.
  v_version := public.billing_update_account_quotas(c_admin, c_student, 0,
    '[{"metric":"tutor_requests","action":"set","limit":500,"expires_at":null},{"metric":"graded_exam_attempts","action":"set","limit":0,"expires_at":"2026-10-01T00:00:00Z"}]',
    '  Thử nghiệm lớp chuyên  ', c_now);
  if v_version <> 1 then raise exception 'Expected version 1, got %', v_version; end if;
  select * into v_quota from public.billing_get_effective_quotas(c_student, c_now) where metric = 'tutor_requests';
  if v_quota.quota_limit <> 500 or v_quota.source <> 'override' then raise exception 'Override 500 not in force'; end if;
  select * into v_quota from public.billing_get_effective_quotas(c_student, c_now) where metric = 'graded_exam_attempts';
  if v_quota.quota_limit <> 0 then raise exception 'Override 0 must block, not mean unlimited'; end if;
  if (select count(*) from public.account_quota_audit where target_id = c_student) <> 1
    or (select reason from public.account_quota_audit where target_id = c_student) <> 'Thử nghiệm lớp chuyên'
    or (select after_state -> 'tutor_requests' ->> 'limit' from public.account_quota_audit where target_id = c_student) <> '500'
    or (select before_state from public.account_quota_audit where target_id = c_student) <> '{}'::jsonb then
    raise exception 'Audit row is missing or wrong';
  end if;

  -- A stale version is refused and changes nothing.
  begin
    perform public.billing_update_account_quotas(c_admin, c_student, 0, '[{"metric":"tutor_requests","action":"reset"}]', 'stale', c_now);
    raise exception 'unreachable';
  exception when others then v_failed := sqlerrm; end;
  if v_failed <> 'QUOTA_VERSION_CONFLICT' then raise exception 'Stale save: %', v_failed; end if;
  if (select count(*) from public.account_quota_overrides where user_id = c_student) <> 2 then raise exception 'Stale save changed overrides'; end if;

  -- Bad changes are refused as a whole: a past expiry, a fraction, a duplicate, a teacher metric, no reason.
  for v_failed in select unnest(array[
    '[{"metric":"tutor_requests","action":"set","limit":5,"expires_at":"2026-09-01T00:00:00Z"}]',
    '[{"metric":"tutor_requests","action":"set","limit":1.5,"expires_at":null}]',
    '[{"metric":"tutor_requests","action":"reset"},{"metric":"tutor_requests","action":"reset"}]',
    '[{"metric":"active_classes","action":"set","limit":3,"expires_at":null}]',
    '[]'
  ]) loop
    begin
      perform public.billing_update_account_quotas(c_admin, c_student, 1, v_failed::jsonb, 'x', c_now);
      raise exception 'Accepted a bad change: %', v_failed;
    exception when others then
      if sqlerrm <> 'INVALID_QUOTA_CHANGE' then raise; end if;
    end;
  end loop;
  begin
    perform public.billing_update_account_quotas(c_admin, c_student, 1, '[{"metric":"tutor_requests","action":"reset"}]', '   ', c_now);
    raise exception 'Accepted an empty reason';
  exception when others then
    if sqlerrm <> 'INVALID_QUOTA_CHANGE' then raise; end if;
  end;

  -- Reset returns to the plan and keeps usage history.
  insert into public.quota_usage (user_id, metric, period_start, used) values (c_student, 'tutor_requests', '2026-09-01', 40);
  v_version := public.billing_update_account_quotas(c_admin, c_student, 1, '[{"metric":"tutor_requests","action":"reset"}]', 'Hết thử nghiệm', c_now);
  select * into v_quota from public.billing_get_effective_quotas(c_student, c_now) where metric = 'tutor_requests';
  if v_version <> 2 or v_quota.quota_limit <> 10 or v_quota.source <> 'plan' or v_quota.used <> 40 then
    raise exception 'Reset did not return to the plan while keeping usage';
  end if;
  if (select count(*) from public.account_quota_audit where target_id = c_student) <> 2 then raise exception 'Reset was not audited'; end if;

  -- An expired override falls back to the plan without a cron job.
  select * into v_quota from public.billing_get_effective_quotas(c_student, '2026-10-02T00:00:00Z') where metric = 'graded_exam_attempts';
  if v_quota.quota_limit <> 3 then raise exception 'Expired override still in force'; end if;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.billing_update_account_quotas('00000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-000000000001', 0, '[{"metric":"tutor_requests","action":"reset"}]', 'x', now());
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'A signed-in user could change quotas directly';
  end if;
end;
$$;
reset role;
