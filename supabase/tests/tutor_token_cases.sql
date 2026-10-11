-- The Professor's quota in tokens (migration 20261012000000_tutor_token_quota.sql). Runs last in
-- billing.sql, after every earlier migration and test: it applies the migration to the data they left.

-- Stand-ins for the two tables the migration touches that billing.sql does not create.
create table public.ai_settings (
  id integer primary key default 1,
  daily_limit integer check (daily_limit is null or daily_limit between 1 and 200)
);
insert into public.ai_settings (id, daily_limit) values (1, 30);
create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role text not null,
  created_at timestamptz not null default now()
);

-- What the migration must convert: every plan limit and override of the old metric.
create table public.tutor_token_before as
  select plan_code, kind, limit_value from public.billing_plan_limits where metric = 'tutor_requests';
insert into public.account_quota_overrides (user_id, metric, limit_value, version)
values ('00000000-0000-4000-8000-000000000002', 'tutor_requests', 500, 1)
on conflict (user_id, metric) do update set limit_value = 500;

\ir ../migrations/20261012000000_tutor_token_quota.sql

do $$
declare
  c_user constant uuid := '00000000-0000-4000-8000-000000000004';
  c_other constant uuid := '00000000-0000-4000-8000-000000000002';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  v_quota record;
  v_usage record;
  v_op record;
  v_failed text;
  v_version integer;
  v_ok boolean;
begin
  -- Plans: every old limit is now tokens, three thousand times larger, same kind; none is left.
  if (select count(*) from public.tutor_token_before) = 0 then
    raise exception 'Nothing to convert: the test would prove nothing';
  end if;
  if exists (select 1 from public.billing_plan_limits where metric = 'tutor_requests')
    or exists (
      select 1 from public.tutor_token_before as b
      left join public.billing_plan_limits as l on l.plan_code = b.plan_code and l.metric = 'tutor_tokens' and l.kind = b.kind
      where l.limit_value is distinct from least(b.limit_value::bigint * 3000, 1000000000)
    ) then
    raise exception 'Plan limits were not converted from questions to tokens';
  end if;

  -- Overrides follow.
  if exists (select 1 from public.account_quota_overrides where metric = 'tutor_requests')
    or (select limit_value from public.account_quota_overrides where user_id = c_other and metric = 'tutor_tokens') <> 1500000 then
    raise exception 'An account override was not converted';
  end if;

  -- The admin daily cap: 30 questions became 90,000 tokens, and only token-sized values pass.
  if (select daily_limit from public.ai_settings where id = 1) <> 90000 then
    raise exception 'The daily cap was not converted';
  end if;
  foreach v_failed in array array['999', '600001'] loop
    begin
      update public.ai_settings set daily_limit = v_failed::integer where id = 1;
      raise exception 'A daily cap of % was accepted', v_failed;
    exception when check_violation then null;
    end;
  end loop;
  update public.ai_settings set daily_limit = 1000 where id = 1;
  update public.ai_settings set daily_limit = 600000 where id = 1;

  -- Each answer can carry its tokens; a negative count is refused.
  insert into public.tutor_messages (user_id, role) values (c_user, 'assistant');
  begin
    execute 'update public.tutor_messages set tokens = -1';
    raise exception 'Negative tokens were accepted';
  exception when check_violation then null;
  end;
  update public.tutor_messages set tokens = 1200;

  -- The student has a tutor_tokens quota to hold against.
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.metric is null or v_quota.quota_limit < 3000 then
    raise exception 'The student has no usable tutor_tokens quota: %', v_quota;
  end if;

  -- A commit counts the tokens really used, not the hold.
  perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000001', repeat('a', 64), 1000);
  if not public.billing_settle_quota('a7000000-0000-4000-8000-000000000001', 'commit', 400) then
    raise exception 'A partial commit was refused';
  end if;
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.used <> 400 or v_quota.reserved <> 0 then
    raise exception 'A commit of 400 of 1000 held counted used=%, reserved=%', v_quota.used, v_quota.reserved;
  end if;
  select * into v_op from public.quota_operations where operation_id = 'a7000000-0000-4000-8000-000000000001';
  if v_op.state <> 'committed' or v_op.units_used <> 400 or v_op.units <> 1000 then
    raise exception 'The operation did not record what was used: %', v_op;
  end if;

  -- Without a count a commit counts the whole hold, as it always did.
  perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000002', repeat('b', 64), 1000);
  if not public.billing_settle_quota('a7000000-0000-4000-8000-000000000002', 'commit') then
    raise exception 'A plain commit was refused';
  end if;
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.used <> 1400 or v_quota.reserved <> 0 then
    raise exception 'A plain commit counted used=%, reserved=%', v_quota.used, v_quota.reserved;
  end if;

  -- A release counts nothing and gives the hold back (and still works with two arguments).
  perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000003', repeat('c', 64), 1000);
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.reserved <> 1000 then raise exception 'The hold was not reserved'; end if;
  if not public.billing_settle_quota('a7000000-0000-4000-8000-000000000003', 'release') then
    raise exception 'A release was refused';
  end if;
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.used <> 1400 or v_quota.reserved <> 0 then
    raise exception 'A release changed used=%, reserved=%', v_quota.used, v_quota.reserved;
  end if;

  -- A long answer may use more than was held; the overshoot is counted.
  perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000004', repeat('d', 64), 1000);
  perform public.billing_settle_quota('a7000000-0000-4000-8000-000000000004', 'commit', 2500);
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.used <> 3900 or v_quota.reserved <> 0 then
    raise exception 'An overshoot of the hold counted used=%, reserved=%', v_quota.used, v_quota.reserved;
  end if;

  -- Settling again changes nothing: the same outcome is confirmed, the other refused.
  if not public.billing_settle_quota('a7000000-0000-4000-8000-000000000004', 'commit', 99)
    or public.billing_settle_quota('a7000000-0000-4000-8000-000000000004', 'release') then
    raise exception 'A repeated settlement was not idempotent';
  end if;
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.used <> 3900 then raise exception 'A repeated settlement counted again: %', v_quota.used; end if;

  -- Counts only go with a commit, and never below zero.
  perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000005', repeat('e', 64), 1000);
  foreach v_failed in array array['release', 'commit'] loop
    begin
      perform public.billing_settle_quota('a7000000-0000-4000-8000-000000000005', v_failed, case v_failed when 'release' then 10 else -1 end);
      raise exception 'A % with a bad count was accepted', v_failed;
    exception when sqlstate '22023' then
      if sqlerrm <> 'INVALID_QUOTA_SETTLEMENT' then raise; end if;
    end;
  end loop;
  perform public.billing_settle_quota('a7000000-0000-4000-8000-000000000005', 'release');

  -- A hold over what is left is refused.
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  v_ok := false;
  begin
    perform public.billing_reserve_quota(c_user, 'tutor_tokens', 'a7000000-0000-4000-8000-000000000006', repeat('f', 64), v_quota.quota_limit);
  exception when sqlstate 'P0001' then
    v_ok := sqlerrm = 'QUOTA_EXCEEDED';
  end;
  if not v_ok then raise exception 'A hold above the remaining tokens was not refused'; end if;

  -- One settle function only, for service_role only.
  if to_regprocedure('public.billing_settle_quota(uuid,text)') is not null
    or has_function_privilege('anon', 'public.billing_settle_quota(uuid,text,integer)', 'execute')
    or has_function_privilege('authenticated', 'public.billing_settle_quota(uuid,text,integer)', 'execute')
    or not has_function_privilege('service_role', 'public.billing_settle_quota(uuid,text,integer)', 'execute') then
    raise exception 'The settle function has the wrong signature or grants';
  end if;

  -- Admin functions: a token limit may reach a billion, every other limit stays under a million.
  select version into v_version from public.billing_plans where code = 'student_free';
  v_version := public.billing_update_plan(c_admin, 'student_free', v_version, 'Token lớn',
    '[{"metric":"tutor_tokens","kind":"monthly","limit":3000000}]'::jsonb, null, null);
  if (select limit_value from public.billing_plan_limits where plan_code = 'student_free' and metric = 'tutor_tokens') <> 3000000 then
    raise exception 'A 3,000,000 token plan limit was not saved';
  end if;
  foreach v_failed in array array[
    '[{"metric":"tutor_tokens","kind":"monthly","limit":1000000001}]',
    '[{"metric":"graded_exam_attempts","kind":"monthly","limit":1000001}]'
  ] loop
    begin
      perform public.billing_update_plan(c_admin, 'student_free', v_version, 'quá lớn', v_failed::jsonb, null, null);
      raise exception 'Plan limit % was accepted', v_failed;
    exception when sqlstate '22023' then
      if sqlerrm <> 'INVALID_PLAN_CHANGE' then raise; end if;
    end;
  end loop;

  v_version := public.billing_update_account_quotas(c_admin, c_user, 0,
    '[{"metric":"tutor_tokens","action":"set","limit":5000000,"expires_at":null}]', 'Lớp chuyên', now());
  select * into v_quota from public.billing_get_effective_quotas(c_user, now()) where metric = 'tutor_tokens';
  if v_quota.quota_limit <> 5000000 then raise exception 'A 5,000,000 token override was not saved'; end if;
  begin
    perform public.billing_update_account_quotas(c_admin, c_user, v_version,
      '[{"metric":"graded_exam_attempts","action":"set","limit":1000001,"expires_at":null}]', 'quá lớn', now());
    raise exception 'An override of 1,000,001 exam attempts was accepted';
  exception when sqlstate '22023' then
    if sqlerrm <> 'INVALID_QUOTA_CHANGE' then raise; end if;
  end;
end;
$$;
