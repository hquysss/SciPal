-- Graded exam attempts (billing Task 3, spec §5): an attempt is created (and, for students, one
-- graded_exam_attempts request held) before the exam starts; the result is stored once and the
-- request is counted then. Resubmitting the same attempt returns the stored result.

create table public.exam_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  blueprint_id text not null,
  -- The quota hold (same id as the attempt) or null when the account is not metered.
  metered boolean not null,
  status text not null default 'started' check (status in ('started', 'submitted')),
  score numeric(4, 2),
  correct_count integer check (correct_count >= 0),
  total_questions integer check (total_questions >= 0),
  xp_earned integer check (xp_earned >= 0),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  check ((status = 'submitted') = (submitted_at is not null and score is not null))
);
create index exam_attempts_user_created_idx on public.exam_attempts (user_id, created_at desc);
alter table public.exam_attempts enable row level security;
revoke all on public.exam_attempts from public, anon, authenticated;
grant select, insert, update on public.exam_attempts to service_role;

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
      p_operation_id, p_user_id, p_metric, v_period_start, p_request_hash, p_units, 'reserved',
      -- An exam is held while the student works on it (up to the 3-hour cap); a Tutor answer for 10 minutes.
      v_now + case p_metric when 'graded_exam_attempts' then interval '3 hours' else interval '10 minutes' end
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
