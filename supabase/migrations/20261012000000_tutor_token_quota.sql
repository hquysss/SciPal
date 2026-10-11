-- The Professor's quota counts tokens, not questions (12/10): `tutor_tokens` replaces `tutor_requests`
-- in every plan, every per-account override and the admin's daily cap. A question was worth about
-- 3,000 tokens, so each old limit is multiplied by 3,000.
--
-- What a call really used (the provider's token count) is committed against a hold, so the ledger
-- gains a settle that can count a different number of units than were held.
--
-- APPLY AFTER the backend that knows 'tutor_tokens' is deployed: until then an older backend reads
-- the quota rows with a closed list of metrics and would fail on the new rows. Between the deploy
-- and this migration the new backend answers "billing unavailable" for the Professor only, because
-- it finds no 'tutor_tokens' quota yet.
--
-- Usage rows of 'tutor_requests' (quota_usage, quota_operations) stay as history; the metric stays
-- allowed there. To go back: set the metric of plan limits and overrides to 'tutor_requests' again
-- with the limit divided by 3,000, and redeploy the earlier backend.

-- 1. The new metric is allowed everywhere metrics are listed.
do $$
declare
  metrics text := $m$'tutor_requests', 'tutor_tokens', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'import_files', 'active_authored_exams', 'author_ai_requests', 'voice_minutes'$m$;
  t text;
begin
  foreach t in array array['billing_plan_limits', 'account_quota_overrides', 'quota_usage', 'quota_operations'] loop
    execute format('alter table public.%I drop constraint %I', t, t || '_metric_check');
    execute format('alter table public.%I add constraint %I check (metric in (%s))', t, t || '_metric_check', metrics);
  end loop;
end $$;

alter table public.billing_plan_limits drop constraint billing_plan_limits_check;
alter table public.billing_plan_limits add constraint billing_plan_limits_check check (
  (metric in ('tutor_requests', 'tutor_tokens', 'graded_exam_attempts', 'import_files', 'author_ai_requests', 'voice_minutes') and kind in ('daily', 'monthly'))
  or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
);

-- 2. Plans and per-account overrides: questions become tokens (capped well under the integer range).
update public.billing_plan_limits
   set metric = 'tutor_tokens',
       limit_value = least(limit_value::bigint * 3000, 1000000000)::integer
 where metric = 'tutor_requests';

update public.account_quota_overrides
   set metric = 'tutor_tokens',
       limit_value = least(limit_value::bigint * 3000, 1000000000)::integer
 where metric = 'tutor_requests';

-- 3. The admin's daily cap (ai_settings.daily_limit) is tokens a day: 1,000 to 600,000.
do $$
declare
  c text;
begin
  for c in
    select conname from pg_catalog.pg_constraint
     where conrelid = 'public.ai_settings'::regclass and contype = 'c'
       and pg_catalog.pg_get_constraintdef(oid) like '%daily_limit%'
  loop
    execute format('alter table public.ai_settings drop constraint %I', c);
  end loop;
end $$;

update public.ai_settings set daily_limit = least(daily_limit::bigint * 3000, 600000)::integer where daily_limit is not null;

alter table public.ai_settings add constraint ai_settings_daily_limit_check
  check (daily_limit is null or daily_limit between 1000 and 600000);

-- 4. Each counted answer carries its tokens, so the daily cap can add up a student's day.
-- Answers from before this change, and cut-off ones, carry none.
alter table public.tutor_messages add column if not exists tokens integer check (tokens is null or tokens >= 0);
create index if not exists tutor_messages_tokens_day_idx
  on public.tutor_messages (user_id, created_at)
  where tokens is not null;

-- 5. Settling can count the units really used (tokens) instead of the whole hold. Without
-- p_units_used a commit counts the hold, as before. The old two-argument function goes: leaving it
-- would make a call with two arguments ambiguous.
alter table public.quota_operations add column if not exists units_used integer check (units_used is null or units_used >= 0);

drop function public.billing_settle_quota(uuid, text);

create or replace function public.billing_settle_quota(p_operation_id uuid, p_outcome text, p_units_used integer default null)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_metric text;
  v_period_start date;
  v_units integer;
  v_state text;
  v_lease_expires_at timestamptz;
  v_counted integer;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_operation_id is null or p_outcome not in ('commit', 'release')
    or (p_units_used is not null and (p_units_used < 0 or p_outcome <> 'commit')) then
    raise exception using errcode = '22023', message = 'INVALID_QUOTA_SETTLEMENT';
  end if;

  select op.user_id, op.metric, op.period_start
    into v_user_id, v_metric, v_period_start
    from public.quota_operations as op
   where op.operation_id = p_operation_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTA_OPERATION_NOT_FOUND';
  end if;

  perform 1
    from public.quota_usage as q
   where q.user_id = v_user_id and q.metric = v_metric and q.period_start = v_period_start
   for update;

  select op.units, op.state, op.lease_expires_at
    into v_units, v_state, v_lease_expires_at
    from public.quota_operations as op
   where op.operation_id = p_operation_id
   for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'QUOTA_OPERATION_NOT_FOUND';
  end if;
  if v_state <> 'reserved' then
    return (v_state = case p_outcome when 'commit' then 'committed' else 'released' end);
  end if;

  if v_lease_expires_at <= v_now then
    update public.quota_operations as op
       set state = 'released', settled_at = v_now
     where op.operation_id = p_operation_id;
    update public.quota_usage as q
       set reserved = q.reserved - v_units,
           updated_at = v_now
     where q.user_id = v_user_id and q.metric = v_metric and q.period_start = v_period_start;
    return false;
  end if;

  -- A commit counts what was used, which may be more or less than was held; a release counts nothing.
  v_counted := case when p_outcome = 'commit' then coalesce(p_units_used, v_units) else 0 end;
  update public.quota_operations as op
     set state = case p_outcome when 'commit' then 'committed' else 'released' end,
         units_used = case when p_outcome = 'commit' then v_counted else null end,
         settled_at = v_now
   where op.operation_id = p_operation_id;
  update public.quota_usage as q
     set used = q.used + v_counted,
         reserved = q.reserved - v_units,
         updated_at = v_now
   where q.user_id = v_user_id and q.metric = v_metric and q.period_start = v_period_start;
  return true;
end;
$$;

revoke execute on function public.billing_settle_quota(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.billing_settle_quota(uuid, text, integer) to service_role;

-- 6. Two admin functions cap a limit at 1,000,000, far below a token allowance. Raise the cap for
-- tutor_tokens only (in parentheses: an IF condition ends at the first THEN, even one inside a
-- CASE), patching the definitions that are live (they were redefined by later
-- migrations), and fail loudly if the text to change is not there.
do $$
declare
  v_def text;
  v_new text;
begin
  v_def := pg_catalog.pg_get_functiondef('public.billing_update_plan(uuid, text, integer, text, jsonb, jsonb, jsonb, jsonb)'::regprocedure);
  v_new := pg_catalog.replace(v_def, 'v_limit > 1000000', $r$v_limit > (case when v_metric = 'tutor_tokens' then 1000000000 else 1000000 end)$r$);
  if v_new = v_def then
    raise exception 'billing_update_plan: the limit check was not found';
  end if;
  execute v_new;

  v_def := pg_catalog.pg_get_functiondef('public.billing_update_account_quotas(uuid, uuid, integer, jsonb, text, timestamptz)'::regprocedure);
  v_new := pg_catalog.replace(v_def, $o$(v_change ->> 'limit')::numeric > 1000000$o$, $r$(v_change ->> 'limit')::numeric > (case when v_metric = 'tutor_tokens' then 1000000000 else 1000000 end)$r$);
  if v_new = v_def then
    raise exception 'billing_update_account_quotas: the limit check was not found';
  end if;
  execute v_new;
end $$;
