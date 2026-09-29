\set ON_ERROR_STOP on

select 'create role anon nologin' where not exists (select 1 from pg_roles where rolname = 'anon') \gexec
select 'create role authenticated nologin' where not exists (select 1 from pg_roles where rolname = 'authenticated') \gexec
select 'create role service_role nologin bypassrls' where not exists (select 1 from pg_roles where rolname = 'service_role') \gexec

create schema if not exists auth;
create table auth.users (
  id uuid primary key,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create table public.profiles (id uuid primary key, display_name text, role text);
create table public.class_rooms (id uuid primary key, teacher_id uuid not null);
create table public.class_members (class_id uuid not null, student_id uuid not null);
create table public.exam_blueprints (id uuid primary key, created_by uuid, status text not null);
-- The live assignments table predates 0003's final shape (due_date, no blueprint_id).
create table public.assignments (id uuid primary key default gen_random_uuid(), class_id uuid not null, lesson_id uuid, due_date timestamptz, created_at timestamptz);

insert into auth.users (id, raw_app_meta_data)
values
  ('00000000-0000-4000-8000-000000000001', '{"app_role":"student"}'),
  ('00000000-0000-4000-8000-000000000002', '{"app_role":"student"}'),
  ('00000000-0000-4000-8000-000000000003', '{"app_role":"teacher"}'),
  ('00000000-0000-4000-8000-000000000004', '{}'),
  ('00000000-0000-4000-8000-000000000005', '{"app_role":"admin"}'),
  ('00000000-0000-4000-8000-000000000006', '{"app_role":"student"}');
update auth.users set email = 'student@example.test', raw_user_meta_data = '{"display_name":"Learner"}' where id = '00000000-0000-4000-8000-000000000004';
grant update (raw_app_meta_data) on auth.users to service_role;
insert into public.profiles (id, display_name, role) values ('00000000-0000-4000-8000-000000000004', 'Learner', 'student');
insert into public.class_rooms (id, teacher_id)
values ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000003');
insert into public.class_members (class_id, student_id)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002');

\ir ../migrations/20260928102931_billing_foundation.sql
\ir ../migrations/20260928230000_account_quota_admin.sql
\ir ../migrations/20260929000000_tutor_daily_quota.sql
\ir ../migrations/20260929010000_exam_attempts.sql
\ir ../migrations/20260929020000_teacher_capacity.sql
\ir ../migrations/20260929030000_author_ai_drafts.sql
\ir ../migrations/20260929040000_billing_payments.sql
\ir ../migrations/20260929100000_billing_reconciliation.sql
\ir ../migrations/20260929120000_class_assignments.sql
\ir ../migrations/20260929140000_admin_plan_settings.sql
-- Supabase's service_role writes these tables; the stubs above need the same grant.
grant select, insert, update, delete on public.class_rooms, public.class_members, public.exam_blueprints, public.assignments to service_role;

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
  if (select count(*) from public.billing_plan_limits) <> 16 then
    raise exception 'Expected sixteen plan limits';
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
    or (select limit_value from public.billing_plan_limits where plan_code = 'student_free' and metric = 'tutor_requests' and kind = 'daily') <> 5
    or (select limit_value from public.billing_plan_limits where plan_code = 'teacher_free' and metric = 'tutor_requests' and kind = 'daily') <> 5
    or (select limit_value from public.billing_plan_limits where plan_code = 'student_plus' and metric = 'tutor_requests' and kind = 'monthly') <> 200
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
  c_student constant uuid := '00000000-0000-4000-8000-000000000006';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  c_now constant timestamptz := '2026-09-15T00:00:00Z';
begin
  -- An account without app_role is a Free student.
  select * into v_quota from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000004', c_now) where metric = 'tutor_requests';
  if v_quota.quota_limit <> 5 or v_quota.kind <> 'daily' or v_quota.source <> 'plan' then
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
  insert into public.quota_usage (user_id, metric, period_start, used) values (c_student, 'tutor_requests', '2026-09-15', 40);
  v_version := public.billing_update_account_quotas(c_admin, c_student, 1, '[{"metric":"tutor_requests","action":"reset"}]', 'Hết thử nghiệm', c_now);
  select * into v_quota from public.billing_get_effective_quotas(c_student, c_now) where metric = 'tutor_requests';
  if v_version <> 2 or v_quota.quota_limit <> 5 or v_quota.source <> 'plan' or v_quota.used <> 40 then
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

-- Tutor per Vietnam day for free accounts (migration 20260929000000).
set role service_role;
do $$
declare
  v_quota record;
  v_reservation jsonb;
  v_failed text;
  i integer;
  c_free constant uuid := '00000000-0000-4000-8000-000000000004';
begin
  -- A day counts on its own and resets at the next Vietnam midnight (17:00Z).
  insert into public.quota_usage (user_id, metric, period_start, used) values (c_free, 'tutor_requests', '2026-09-20', 4);
  select * into v_quota from public.billing_get_effective_quotas(c_free, '2026-09-20T16:59:00Z') where metric = 'tutor_requests';
  if v_quota.used <> 4 or v_quota.resets_at <> '2026-09-20T17:00:00Z'::timestamptz then
    raise exception 'Daily usage or reset time is wrong: used %, resets %', v_quota.used, v_quota.resets_at;
  end if;
  select * into v_quota from public.billing_get_effective_quotas(c_free, '2026-09-20T17:00:00Z') where metric = 'tutor_requests';
  if v_quota.used <> 0 then raise exception 'Yesterday still counted after Vietnam midnight'; end if;

  -- A free teacher has 5 a day too.
  select * into v_quota from public.billing_get_effective_quotas('00000000-0000-4000-8000-000000000003', '2026-09-20T00:00:00Z') where metric = 'tutor_requests';
  if v_quota.quota_limit <> 5 or v_quota.kind <> 'daily' then raise exception 'Free teacher has no daily Tutor quota'; end if;

  -- Five reservations today, the sixth is refused; the answer says the quota is daily; lease 10 min.
  for i in 1..5 loop
    v_reservation := public.billing_reserve_quota(c_free, 'tutor_requests', ('30000000-0000-4000-8000-00000000000' || i)::uuid, repeat('d', 64), 1);
  end loop;
  if v_reservation ->> 'kind' <> 'daily' or (v_reservation ->> 'remaining')::integer <> 0 then
    raise exception 'Daily reservation answer is wrong: %', v_reservation;
  end if;
  begin
    perform public.billing_reserve_quota(c_free, 'tutor_requests', '30000000-0000-4000-8000-000000000006', repeat('d', 64), 1);
    raise exception 'unreachable';
  exception when others then v_failed := sqlerrm; end;
  if v_failed <> 'QUOTA_EXCEEDED' then raise exception 'Sixth daily request: %', v_failed; end if;
  if (select min(lease_expires_at - created_at) from public.quota_operations where user_id = c_free) < interval '9 minutes' then
    raise exception 'Lease is shorter than ten minutes';
  end if;
  -- Releasing gives the request back.
  if not public.billing_settle_quota('30000000-0000-4000-8000-000000000005', 'release') then raise exception 'Release refused'; end if;
  v_reservation := public.billing_reserve_quota(c_free, 'tutor_requests', '30000000-0000-4000-8000-000000000007', repeat('d', 64), 1);
  if v_reservation ->> 'state' <> 'reserved' then raise exception 'Released request was not given back'; end if;
end;
$$;
reset role;

-- Graded exam attempts (migration 20260929010000).
set role service_role;
do $$
declare
  v_reservation jsonb;
  c_free constant uuid := '00000000-0000-4000-8000-000000000004';
begin
  v_reservation := public.billing_reserve_quota(c_free, 'graded_exam_attempts', '40000000-0000-4000-8000-000000000001', repeat('e', 64), 1);
  if v_reservation ->> 'kind' <> 'monthly' then raise exception 'Exam attempts are not monthly: %', v_reservation; end if;
  if (select lease_expires_at - created_at from public.quota_operations where operation_id = '40000000-0000-4000-8000-000000000001') < interval '2 hours 59 minutes' then
    raise exception 'An exam hold is shorter than three hours';
  end if;
  insert into public.exam_attempts (id, user_id, blueprint_id, metered) values ('40000000-0000-4000-8000-000000000001', c_free, 'bp-1', true);
  begin
    update public.exam_attempts set status = 'submitted' where id = '40000000-0000-4000-8000-000000000001';
    raise exception 'A submitted attempt without a result was accepted';
  exception when check_violation then null;
  end;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.exam_attempts;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user read exam attempts directly'; end if;
end;
$$;
reset role;

-- Teacher capacity (migration 20260929020000).
set role service_role;
do $$
declare
  v_failed text;
  v_detail text;
  i integer;
  c_teacher constant uuid := '00000000-0000-4000-8000-000000000003';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  c_class constant uuid := '10000000-0000-4000-8000-000000000001';
begin
  -- Teacher Free: one active class (already has one).
  begin
    insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-000000000002', c_teacher);
    raise exception 'unreachable';
  exception when others then
    get stacked diagnostics v_failed = message_text, v_detail = pg_exception_detail;
  end;
  if v_failed <> 'QUOTA_EXCEEDED' or v_detail <> 'active_classes' then raise exception 'Second class: % %', v_failed, v_detail; end if;

  -- Admins are not limited.
  insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-000000000003', c_admin);
  insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-000000000004', c_admin);

  -- Students per class follow the owner's quota (override to 3; the class has 2).
  insert into public.account_quota_overrides (user_id, metric, limit_value, version) values (c_teacher, 'students_per_class', 3, 1);
  insert into public.class_members (class_id, student_id) values (c_class, '00000000-0000-4000-8000-000000000004');
  begin
    insert into public.class_members (class_id, student_id) values (c_class, '00000000-0000-4000-8000-000000000006');
    raise exception 'unreachable';
  exception when others then
    get stacked diagnostics v_failed = message_text, v_detail = pg_exception_detail;
  end;
  if v_failed <> 'QUOTA_EXCEEDED' or v_detail <> 'students_per_class' then raise exception 'Fourth member: % %', v_failed, v_detail; end if;

  -- Teacher Free: five active authored exams, drafts included; the sixth is refused.
  for i in 1..5 loop
    insert into public.exam_blueprints (id, created_by, status) values (('50000000-0000-4000-8000-00000000000' || i)::uuid, c_teacher, 'draft');
  end loop;
  begin
    insert into public.exam_blueprints (id, created_by, status) values ('50000000-0000-4000-8000-000000000006', c_teacher, 'pending_review');
    raise exception 'unreachable';
  exception when others then
    get stacked diagnostics v_failed = message_text, v_detail = pg_exception_detail;
  end;
  if v_failed <> 'QUOTA_EXCEEDED' or v_detail <> 'active_authored_exams' then raise exception 'Sixth exam: % %', v_failed, v_detail; end if;
  -- Changing the status of an exam already counted is not a new exam.
  update public.exam_blueprints set status = 'pending_review' where id = '50000000-0000-4000-8000-000000000001';
  -- Deleting one frees a place.
  delete from public.exam_blueprints where id = '50000000-0000-4000-8000-000000000002';
  insert into public.exam_blueprints (id, created_by, status) values ('50000000-0000-4000-8000-000000000006', c_teacher, 'draft');
end;
$$;
reset role;

-- AI lesson drafts (migration 20260929030000): backend only.
set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.author_ai_drafts;
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user read AI drafts directly'; end if;
end;
$$;
reset role;

-- Orders and verified payments (migration 20260929040000).
set role service_role;
do $$
declare
  c_student constant uuid := '00000000-0000-4000-8000-000000000004'; -- no app_role: a student
  c_teacher constant uuid := '00000000-0000-4000-8000-000000000003';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  c_hash constant text := repeat('a', 64);
  v_month uuid;
  v_year uuid;
  v_pro uuid;
  v_order record;
  v_again record;
  v_late record;
  v_role_order record;
  v_failed text;
  v_result text;
  v_through timestamptz;
  v_before timestamptz;
  v_page_items jsonb;
  v_total_count bigint;
  v_event_count bigint;
begin
  select id into v_month from public.billing_prices where plan_code = 'student_plus' and interval = 'month' and active;
  select id into v_year from public.billing_prices where plan_code = 'student_plus' and interval = 'year' and active;
  select id into v_pro from public.billing_prices where plan_code = 'teacher_pro' and interval = 'month' and active;

  -- The order snapshots the price; the same key replays it; another request with that key is refused.
  select * into v_order from public.billing_create_order(c_student, v_month, 'key-one-000', c_hash, now() + interval '30 minutes');
  if not v_order.created or v_order.amount_vnd <> 39000 or v_order.plan_code <> 'student_plus' or v_order.status <> 'pending' then
    raise exception 'Order snapshot: %', row_to_json(v_order);
  end if;
  select * into v_again from public.billing_create_order(c_student, v_month, 'key-one-000', c_hash, now() + interval '30 minutes');
  if v_again.created or v_again.order_id <> v_order.order_id then raise exception 'Replay made a second order'; end if;
  begin
    perform public.billing_create_order(c_student, v_year, 'key-one-000', repeat('b', 64), now() + interval '30 minutes');
    raise exception 'unreachable';
  exception when others then get stacked diagnostics v_failed = message_text;
  end;
  if v_failed <> 'IDEMPOTENCY_CONFLICT' then raise exception 'Changed payload: %', v_failed; end if;

  -- A student cannot buy the teacher plan, an admin buys nothing.
  begin
    perform public.billing_create_order(c_student, v_pro, 'key-two-000', c_hash, now() + interval '30 minutes');
    raise exception 'unreachable';
  exception when others then get stacked diagnostics v_failed = message_text;
  end;
  if v_failed <> 'PLAN_NOT_FOR_ROLE' then raise exception 'Student bought teacher plan: %', v_failed; end if;
  begin
    perform public.billing_create_order(c_admin, v_month, 'key-three-00', c_hash, now() + interval '30 minutes');
    raise exception 'unreachable';
  exception when others then get stacked diagnostics v_failed = message_text;
  end;
  if v_failed <> 'UNSUPPORTED_BILLING_ROLE' then raise exception 'Admin order: %', v_failed; end if;

  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd)
  values (v_order.order_id, 'payos', '1001', 39000), (v_order.order_id, 'vnpay', 'VN1001', 39000);

  -- A wrong amount is not granted.
  select * into v_late from public.billing_create_order(c_student, v_month, 'key-four-000', c_hash, now() + interval '30 minutes');
  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd) values (v_late.order_id, 'payos', '1002', 39000);
  v_result := public.billing_apply_payment('payos', '1002', 'tx-short', 3900, 'paid', now(), 'fp-short', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Short payment: %', v_result; end if;
  if (select status from public.billing_orders where id = v_late.order_id) <> 'reconciliation' then raise exception 'Short payment order status'; end if;
  if (select amount_vnd from public.billing_events where fingerprint = 'fp-short') <> 3900
     or (select paid_at from public.billing_events where fingerprint = 'fp-short') is null then
    raise exception 'Reconciliation event did not retain its received amount and payment time';
  end if;

  -- A failure is recorded; the payment then grants one month from now.
  v_result := public.billing_apply_payment('payos', '1001', null, 39000, 'cancelled', null, 'fp-cancel', 'webhook');
  if v_result <> 'recorded' then raise exception 'Cancel: %', v_result; end if;
  v_before := now();
  v_result := public.billing_apply_payment('payos', '1001', 'tx-1', 39000, 'paid', now(), 'fp-paid', 'webhook');
  if v_result <> 'applied' then raise exception 'Paid: %', v_result; end if;
  select paid_through into v_through from public.billing_subscriptions where user_id = c_student and plan_code = 'student_plus';
  if v_through is null or v_through < v_before + interval '27 days' or v_through > v_before + interval '32 days' then
    raise exception 'One month: %', v_through;
  end if;
  if (select status from public.billing_orders where id = v_order.order_id) <> 'paid' then raise exception 'Order not paid'; end if;

  -- The same event again, or the same money under a new event id: nothing more.
  v_result := public.billing_apply_payment('payos', '1001', 'tx-1', 39000, 'paid', now(), 'fp-paid', 'webhook');
  if v_result <> 'duplicate' then raise exception 'Same event: %', v_result; end if;
  v_result := public.billing_apply_payment('payos', '1001', 'tx-1', 39000, 'paid', now(), 'fp-paid-query', 'query');
  if v_result <> 'duplicate' then raise exception 'Same money: %', v_result; end if;
  -- A later failure does not take the payment back.
  v_result := public.billing_apply_payment('payos', '1001', null, 39000, 'failed', null, 'fp-failed-late', 'webhook');
  if (select status from public.billing_payment_attempts where provider_reference = '1001') <> 'paid' then raise exception 'Failure undid a payment'; end if;

  v_result := public.billing_apply_payment('payos', '1001', 'tx-double-payos', 39000, 'paid', now(), 'fp-double-same-link', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Second transaction on the paid payOS link: %', v_result; end if;
  if (select count(*) from public.billing_grants where order_id = v_order.order_id) <> 1 then raise exception 'Second payOS transaction granted twice'; end if;
  if (select provider_transaction_id from public.billing_payment_attempts where provider_reference = '1001') <> 'tx-1' then
    raise exception 'The duplicate transaction replaced the original paid transaction';
  end if;

  select count(*) into v_event_count from public.billing_events
   where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-1';
  v_result := public.billing_apply_payment('payos', '1001', 'tx-1', 39000, 'paid', now(), 'fp-admin-original-first', 'admin_reconciliation');
  if v_result <> 'duplicate' then raise exception 'Rechecking the original transaction: %', v_result; end if;
  if (select count(*) from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-1') <> v_event_count
     or exists (select 1 from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-1' and verification_state = 'reconciliation') then
    raise exception 'Rechecking the original transaction created an unresolved incident';
  end if;

  select count(*) into v_event_count from public.billing_events
   where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-double-payos';
  if v_event_count <> 1 then raise exception 'Expected one second-transaction event, got %', v_event_count; end if;
  v_result := public.billing_apply_payment('payos', '1001', 'tx-double-payos', 39000, 'paid', now(), 'fp-admin-second-first', 'admin_reconciliation');
  if v_result <> 'reconciliation' then raise exception 'Rechecking the second transaction: %', v_result; end if;
  if (select count(*) from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-double-payos') <> v_event_count
     or (select count(*) from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-double-payos' and verification_state = 'reconciliation') <> 1 then
    raise exception 'Rechecking the second transaction duplicated or cleared its incident';
  end if;

  v_result := public.billing_apply_payment('payos', '1001', 'tx-1', 39000, 'paid', now(), 'fp-admin-original-repeat', 'admin_reconciliation');
  if v_result <> 'duplicate' then raise exception 'Repeated original-transaction recheck: %', v_result; end if;
  v_result := public.billing_apply_payment('payos', '1001', 'tx-double-payos', 39000, 'paid', now(), 'fp-admin-second-repeat', 'admin_reconciliation');
  if v_result <> 'reconciliation' then raise exception 'Repeated second-transaction recheck: %', v_result; end if;
  if (select count(*) from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-double-payos') <> v_event_count
     or (select count(*) from public.billing_events where provider = 'payos' and merchant_reference = '1001' and provider_transaction_id = 'tx-double-payos' and verification_state = 'reconciliation') <> 1 then
    raise exception 'Repeated recheck created another second-payment incident';
  end if;

  -- Paid twice (QR and card): one grant, the second payment kept for reconciliation.
  v_result := public.billing_apply_payment('vnpay', 'VN1001', 'vn-tx-1', 39000, 'paid', now(), 'fp-vn', 'ipn');
  if v_result <> 'reconciliation' then raise exception 'Second payment: %', v_result; end if;
  if (select count(*) from public.billing_grants where order_id = v_order.order_id) <> 1 then raise exception 'Two grants'; end if;
  if (select paid_through from public.billing_subscriptions where user_id = c_student) <> v_through then raise exception 'Second payment extended the plan'; end if;
  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd) values (v_order.order_id, 'payos', '1005', 39000);
  v_result := public.billing_apply_payment('payos', '1005', 'tx-double', 39000, 'paid', now(), 'fp-double', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Second payOS payment: %', v_result; end if;

  -- Renewing the same plan follows the current period (a year here).
  select * into v_again from public.billing_create_order(c_student, v_year, 'key-five-000', c_hash, now() + interval '30 minutes');
  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd) values (v_again.order_id, 'payos', '1003', 390000);
  v_result := public.billing_apply_payment('payos', '1003', 'tx-3', 390000, 'paid', now(), 'fp-year', 'webhook');
  if v_result <> 'applied' then raise exception 'Year: %', v_result; end if;
  if (select paid_through from public.billing_subscriptions where user_id = c_student)
     <> ((v_through at time zone 'Asia/Ho_Chi_Minh') + interval '12 months') at time zone 'Asia/Ho_Chi_Minh' then
    raise exception 'Year did not follow the month';
  end if;

  -- Money after the order expired is not granted; an unknown reference is kept too.
  select * into v_late from public.billing_create_order(c_teacher, v_pro, 'key-six-0000', c_hash, now() - interval '1 minute');
  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd) values (v_late.order_id, 'payos', '1004', 99000);
  v_result := public.billing_apply_payment('payos', '1004', 'tx-4', 99000, 'paid', now(), 'fp-late', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Late: %', v_result; end if;
  if exists (select 1 from public.billing_subscriptions where user_id = c_teacher) then raise exception 'Late payment granted'; end if;
  v_result := public.billing_apply_payment('payos', '999999', 'tx-x', 1000, 'paid', now(), 'fp-unknown', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Unknown reference: %', v_result; end if;
  if (select amount_vnd from public.billing_events where fingerprint = 'fp-unknown') <> 1000
     or (select paid_at from public.billing_events where fingerprint = 'fp-unknown') is null then
    raise exception 'Unmatched payment did not retain its received facts';
  end if;

  -- A fresh provider query may resolve the same transaction after its role mismatch is corrected.
  select * into v_role_order from public.billing_create_order(c_student, v_month, 'key-seven-0000', c_hash, now() + interval '30 minutes');
  insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd) values (v_role_order.order_id, 'payos', '1006', 39000);
  update auth.users set raw_app_meta_data = '{"app_role":"teacher"}' where id = c_student;
  v_result := public.billing_apply_payment('payos', '1006', 'tx-role', 39000, 'paid', now(), 'fp-role-webhook', 'webhook');
  if v_result <> 'reconciliation' then raise exception 'Changed role was not held for review: %', v_result; end if;
  update auth.users set raw_app_meta_data = '{"app_role":"student"}' where id = c_student;
  v_result := public.billing_apply_payment('payos', '1006', 'tx-role', 39000, 'paid', now(), 'fp-role-recheck', 'admin_reconciliation');
  if v_result <> 'applied' then raise exception 'Verified role correction did not resolve: %', v_result; end if;
  if (select status from public.billing_orders where id = v_role_order.order_id) <> 'paid'
     or (select status from public.billing_payment_attempts where provider_reference = '1006') <> 'paid'
     or (select verification_state from public.billing_events where fingerprint = 'fp-role-webhook') <> 'verified' then
    raise exception 'Resolved provider evidence remained in reconciliation';
  end if;

  select items, total_count into v_page_items, v_total_count from public.billing_reconciliation_page(100, 0);
  if v_total_count <> 5 or pg_catalog.jsonb_array_length(v_page_items) <> 5 then
    raise exception 'The reconciliation page did not include exactly five payOS incidents: % %', v_total_count, v_page_items;
  end if;
  if not exists (
    select 1 from pg_catalog.jsonb_array_elements(v_page_items) as item(value)
     where item.value ->> 'provider_reference' = '1002'
       and (item.value ->> 'amount_received_vnd')::integer = 3900
       and (item.value ->> 'order_amount_vnd')::integer = 39000
       and item.value ->> 'account_email' = 'student@example.test'
       and item.value ->> 'plan_name_en' = 'Student Plus'
  ) then raise exception 'Wrong-amount row is missing account, plan or amounts'; end if;
  if not exists (
    select 1 from pg_catalog.jsonb_array_elements(v_page_items) as item(value)
     where item.value ->> 'provider_reference' = '999999'
       and item.value ->> 'order_id' is null
       and (item.value ->> 'amount_received_vnd')::integer = 1000
  ) then raise exception 'Unknown-order row is missing its received transaction'; end if;
  if exists (select 1 from pg_catalog.jsonb_array_elements(v_page_items) as item(value) where item.value ? 'reason') then
    raise exception 'Reconciliation reason belongs to the backend, not the database result';
  end if;
  select items, total_count into v_page_items, v_total_count from public.billing_reconciliation_page(2, 0);
  if v_total_count <> 5 or pg_catalog.jsonb_array_length(v_page_items) <> 2 then
    raise exception 'Reconciliation pagination did not return a two-row page and global count';
  end if;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.billing_apply_payment('payos', '1', 't', 1, 'paid', now(), 'f', 'x');
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user applied a payment'; end if;
  v_denied := false;
  begin
    perform * from public.billing_reconciliation_page(20, 0);
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user read billing reconciliation'; end if;
end;
$$;
reset role;

-- Class assignments (migration 20260929120000).
set role service_role;
do $$
declare
  c_class constant uuid := '10000000-0000-4000-8000-000000000001';
  c_lesson constant uuid := '60000000-0000-4000-8000-000000000001';
  c_exam constant uuid := '50000000-0000-4000-8000-000000000001';
  v_failed text;
begin
  if not exists (select 1 from information_schema.columns where table_name = 'assignments' and column_name = 'due_at') then
    raise exception 'due_date was not renamed to due_at';
  end if;
  insert into public.assignments (class_id, lesson_id, due_at) values (c_class, c_lesson, now() + interval '1 day');
  insert into public.assignments (class_id, blueprint_id) values (c_class, c_exam);
  begin
    insert into public.assignments (class_id, lesson_id) values (c_class, c_lesson);
    raise exception 'unreachable';
  exception when unique_violation then v_failed := 'unique';
  end;
  if v_failed is distinct from 'unique' then raise exception 'Same lesson given twice'; end if;
  v_failed := null;
  begin
    insert into public.assignments (class_id, lesson_id, blueprint_id) values (c_class, '60000000-0000-4000-8000-000000000002', c_exam);
    raise exception 'unreachable';
  exception when check_violation then v_failed := 'check';
  end;
  if v_failed is distinct from 'check' then raise exception 'Lesson and exam in one assignment'; end if;
  v_failed := null;
  begin
    insert into public.assignments (class_id) values (c_class);
    raise exception 'unreachable';
  exception when check_violation then v_failed := 'check';
  end;
  if v_failed is distinct from 'check' then raise exception 'Empty assignment'; end if;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    insert into public.assignments (class_id, lesson_id) values ('10000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000009');
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user wrote an assignment directly'; end if;
end;
$$;
reset role;

-- Admin plan settings (migration 20260929140000).
set role service_role;
do $$
declare
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  v_version integer;
  v_failed text;
  v_old uuid;
begin
  select version into v_version from public.billing_plans where code = 'teacher_free';
  v_version := public.billing_update_plan(c_admin, 'teacher_free', v_version, 'Thử nâng tệp nhập',
    '[{"metric":"import_files","kind":"monthly","limit":7}]'::jsonb, null, null);
  if (select limit_value from public.billing_plan_limits where plan_code = 'teacher_free' and metric = 'import_files') <> 7 then
    raise exception 'Limit not saved';
  end if;
  if not exists (select 1 from public.billing_plan_audit where plan_code = 'teacher_free' and actor_id = c_admin
                  and before_state -> 'limits' @> '[{"metric":"import_files","limit":5}]'
                  and after_state -> 'limits' @> '[{"metric":"import_files","limit":7}]') then
    raise exception 'Audit missing';
  end if;

  -- A stale version is refused.
  begin
    perform public.billing_update_plan(c_admin, 'teacher_free', v_version - 1, 'cũ', '[]'::jsonb, null, null);
    raise exception 'unreachable';
  exception when others then get stacked diagnostics v_failed = message_text;
  end;
  if v_failed <> 'PLAN_VERSION_CONFLICT' then raise exception 'Stale save: %', v_failed; end if;

  -- Tutor may switch between daily and monthly; other metrics keep their kind; unknown metrics are refused.
  select version into v_version from public.billing_plans where code = 'student_free';
  v_version := public.billing_update_plan(c_admin, 'student_free', v_version, 'Tutor theo tháng',
    '[{"metric":"tutor_requests","kind":"monthly","limit":60}]'::jsonb, '{"en":"Free","vi":"Miễn phí"}'::jsonb, null);
  if (select kind from public.billing_plan_limits where plan_code = 'student_free' and metric = 'tutor_requests') <> 'monthly' then
    raise exception 'Tutor kind not switched';
  end if;
  if (select description_vi from public.billing_plans where code = 'student_free') <> 'Miễn phí' then raise exception 'Description not saved'; end if;
  foreach v_failed in array array[
    '[{"metric":"graded_exam_attempts","kind":"daily","limit":3}]',
    '[{"metric":"active_classes","kind":"capacity","limit":3}]',
    '[{"metric":"tutor_requests","kind":"monthly","limit":-1}]'
  ] loop
    begin
      perform public.billing_update_plan(c_admin, 'student_free', v_version, 'sai', v_failed::jsonb, null, null);
      raise exception 'unreachable: %', v_failed;
    exception when others then
      if sqlerrm <> 'INVALID_PLAN_CHANGE' then raise exception 'Bad limit %: %', v_failed, sqlerrm; end if;
    end;
  end loop;

  -- A new price replaces the active one; the old row stays for the orders sold at it.
  select id into v_old from public.billing_prices where plan_code = 'student_plus' and interval = 'month' and active;
  select version into v_version from public.billing_plans where code = 'student_plus';
  v_version := public.billing_update_plan(c_admin, 'student_plus', v_version, 'Tăng giá tháng', null, null, '{"month":49000,"year":390000}'::jsonb);
  if (select active from public.billing_prices where id = v_old) then raise exception 'Old price still active'; end if;
  if (select amount_vnd from public.billing_prices where plan_code = 'student_plus' and interval = 'month' and active) <> 49000 then
    raise exception 'New price missing';
  end if;
  if (select count(*) from public.billing_prices where plan_code = 'student_plus' and interval = 'year') <> 1 then
    raise exception 'Unchanged yearly price was replaced';
  end if;
  -- Back to the published price for the checks that follow.
  perform public.billing_update_plan(c_admin, 'student_plus', v_version, 'Trả giá cũ', null, null, '{"month":39000}'::jsonb);
  begin
    perform public.billing_update_plan(c_admin, 'student_free', (select version from public.billing_plans where code = 'student_free'), 'giá', null, null, '{"month":10000}'::jsonb);
    raise exception 'unreachable';
  exception when others then get stacked diagnostics v_failed = message_text;
  end;
  if v_failed <> 'INVALID_PLAN_CHANGE' then raise exception 'Free plan got a price: %', v_failed; end if;
end;
$$;
reset role;

set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.billing_update_plan(null, 'student_free', 1, 'x', null, null, null);
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user changed a plan'; end if;
end;
$$;
reset role;
