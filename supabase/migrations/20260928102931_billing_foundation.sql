create table public.billing_plans (
  code text primary key check (code in ('student_free', 'student_plus', 'teacher_free', 'teacher_pro')),
  audience text not null check (audience in ('student', 'teacher')),
  name_en text not null,
  name_vi text not null,
  description_en text not null,
  description_vi text not null,
  active boolean not null default true,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  check (
    (code like 'student_%' and audience = 'student')
    or (code like 'teacher_%' and audience = 'teacher')
  )
);

create table public.billing_prices (
  id uuid primary key default gen_random_uuid(),
  plan_code text not null references public.billing_plans(code) on delete restrict,
  interval text not null check (interval in ('month', 'year')),
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (plan_code in ('student_plus', 'teacher_pro')),
  unique (id, plan_code, interval, amount_vnd)
);
create unique index billing_prices_one_active_interval_idx
  on public.billing_prices (plan_code, interval) where active;

create table public.billing_plan_limits (
  plan_code text not null references public.billing_plans(code) on delete restrict,
  metric text not null check (metric in (
    'tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class',
    'import_files', 'active_authored_exams', 'author_ai_requests'
  )),
  kind text not null check (kind in ('monthly', 'capacity')),
  limit_value integer not null check (limit_value >= 0),
  primary key (plan_code, metric),
  check (
    (metric in ('tutor_requests', 'graded_exam_attempts', 'import_files', 'author_ai_requests') and kind = 'monthly')
    or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
  )
);

create table public.billing_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  price_id uuid not null,
  plan_code text not null references public.billing_plans(code) on delete restrict,
  interval text not null check (interval in ('month', 'year')),
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  purpose text not null default 'subscription' check (purpose = 'subscription'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled', 'reconciliation')),
  idempotency_key text not null,
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (plan_code in ('student_plus', 'teacher_pro')),
  foreign key (price_id, plan_code, interval, amount_vnd)
    references public.billing_prices(id, plan_code, interval, amount_vnd) on delete restrict,
  unique (user_id, idempotency_key)
);
create index billing_orders_user_created_idx on public.billing_orders (user_id, created_at desc);

create table public.billing_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.billing_orders(id) on delete restrict,
  provider text not null check (provider in ('payos', 'vnpay')),
  provider_reference text not null,
  provider_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled', 'expired', 'reconciliation')),
  amount_vnd integer not null check (amount_vnd > 0),
  currency text not null default 'VND' check (currency = 'VND'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_reference)
);
create unique index billing_payment_attempts_transaction_idx
  on public.billing_payment_attempts (provider, provider_transaction_id)
  where provider_transaction_id is not null;

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('payos', 'vnpay')),
  fingerprint text not null,
  event_type text not null,
  merchant_reference text,
  provider_transaction_id text,
  outcome text not null check (outcome in ('paid', 'failed', 'cancelled', 'expired', 'unverified')),
  verification_state text not null check (verification_state in ('verified', 'rejected', 'reconciliation')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, fingerprint)
);

create table public.billing_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code text not null references public.billing_plans(code) on delete restrict
    check (plan_code in ('student_plus', 'teacher_pro')),
  paid_through timestamptz not null,
  pending_price_id uuid references public.billing_prices(id) on delete restrict,
  renewal_mode text not null default 'manual' check (renewal_mode in ('manual', 'auto')),
  mandate_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_grants (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  plan_code text not null references public.billing_plans(code) on delete restrict,
  starts_at timestamptz not null,
  paid_through timestamptz not null,
  created_at timestamptz not null default now(),
  check (paid_through > starts_at)
);

create table public.account_quota_versions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  updated_at timestamptz not null default now()
);

create table public.account_quota_overrides (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in (
    'tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class',
    'import_files', 'active_authored_exams', 'author_ai_requests'
  )),
  limit_value integer not null check (limit_value >= 0),
  expires_at timestamptz,
  version integer not null check (version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, metric)
);

create table public.account_quota_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  target_id uuid references auth.users(id) on delete set null,
  before_state jsonb not null,
  after_state jsonb not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
create index account_quota_audit_target_created_idx
  on public.account_quota_audit (target_id, created_at desc);

create table public.quota_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in (
    'tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class',
    'import_files', 'active_authored_exams', 'author_ai_requests'
  )),
  period_start date not null,
  used integer not null default 0 check (used >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, metric, period_start)
);

create table public.quota_operations (
  operation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in (
    'tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class',
    'import_files', 'active_authored_exams', 'author_ai_requests'
  )),
  period_start date not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  units integer not null check (units > 0),
  state text not null check (state in ('reserved', 'committed', 'released')),
  lease_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  settled_at timestamptz,
  foreign key (user_id, metric, period_start)
    references public.quota_usage(user_id, metric, period_start) on delete cascade
);
create index quota_operations_pending_lease_idx
  on public.quota_operations (user_id, metric, period_start, lease_expires_at)
  where state = 'reserved';

insert into public.billing_plans
  (code, audience, name_en, name_vi, description_en, description_vi)
values
  ('student_free', 'student', 'Student Free', 'Học sinh Miễn phí',
   'Core lessons and progress tracking, with monthly Tutor and graded exam limits.',
   'Bài học cốt lõi và theo dõi tiến độ, kèm giới hạn Tutor và lượt thi chấm điểm theo tháng.'),
  ('student_plus', 'student', 'Student Plus', 'Học sinh Plus',
   '200 Tutor requests and 30 graded exam attempts each month.',
   '200 lượt Tutor và 30 lượt thi chấm điểm mỗi tháng.'),
  ('teacher_free', 'teacher', 'Teacher Free', 'Giáo viên Miễn phí',
   'One active class, 50 students per class, five imports, five active authored exams, and no monthly lesson-authoring AI requests.',
   'Một lớp hoạt động, 50 học sinh mỗi lớp, 5 tệp nhập, 5 đề tự soạn đang hoạt động và không có lượt AI soạn bài theo tháng.'),
  ('teacher_pro', 'teacher', 'Teacher Pro', 'Giáo viên Pro',
   'Ten active classes, 50 students per class, 100 imports, 100 active authored exams, and 100 monthly lesson-authoring AI requests.',
   '10 lớp hoạt động, 50 học sinh mỗi lớp, 100 tệp nhập, 100 đề tự soạn đang hoạt động và 100 lượt AI soạn bài mỗi tháng.');

insert into public.billing_prices (plan_code, interval, amount_vnd)
values
  ('student_plus', 'month', 39000),
  ('student_plus', 'year', 390000),
  ('teacher_pro', 'month', 99000),
  ('teacher_pro', 'year', 990000);

insert into public.billing_plan_limits (plan_code, metric, kind, limit_value)
values
  ('student_free', 'tutor_requests', 'monthly', 10),
  ('student_free', 'graded_exam_attempts', 'monthly', 3),
  ('student_plus', 'tutor_requests', 'monthly', 200),
  ('student_plus', 'graded_exam_attempts', 'monthly', 30),
  ('teacher_free', 'active_classes', 'capacity', 1),
  ('teacher_free', 'students_per_class', 'capacity', 50),
  ('teacher_free', 'import_files', 'monthly', 5),
  ('teacher_free', 'active_authored_exams', 'capacity', 5),
  ('teacher_free', 'author_ai_requests', 'monthly', 0),
  ('teacher_pro', 'active_classes', 'capacity', 10),
  ('teacher_pro', 'students_per_class', 'capacity', 50),
  ('teacher_pro', 'import_files', 'monthly', 100),
  ('teacher_pro', 'active_authored_exams', 'capacity', 100),
  ('teacher_pro', 'author_ai_requests', 'monthly', 100);

create or replace function public.protect_billing_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception using errcode = 'P0001', message = 'BILLING_PRICE_IMMUTABLE';
  end if;
  if old.plan_code is distinct from new.plan_code
    or old.interval is distinct from new.interval
    or old.amount_vnd is distinct from new.amount_vnd
    or old.currency is distinct from new.currency
    or old.created_at is distinct from new.created_at then
    raise exception using errcode = 'P0001', message = 'BILLING_PRICE_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_billing_price() from public, anon, authenticated;
create trigger billing_prices_immutable
  before update or delete on public.billing_prices
  for each row execute function public.protect_billing_price();

create or replace function public.protect_billing_order_snapshot()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.price_id is distinct from new.price_id
    or old.plan_code is distinct from new.plan_code
    or old.interval is distinct from new.interval
    or old.amount_vnd is distinct from new.amount_vnd
    or old.currency is distinct from new.currency
    or old.purpose is distinct from new.purpose
    or old.idempotency_key is distinct from new.idempotency_key
    or old.payload_hash is distinct from new.payload_hash then
    raise exception using errcode = 'P0001', message = 'BILLING_ORDER_SNAPSHOT_IMMUTABLE';
  end if;
  if old.status = 'paid' and new.status <> 'paid' then
    raise exception using errcode = 'P0001', message = 'PAID_ORDER_STATUS_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke execute on function public.protect_billing_order_snapshot() from public, anon, authenticated;
create trigger billing_orders_snapshot_immutable
  before update on public.billing_orders
  for each row execute function public.protect_billing_order_snapshot();

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
  if v_role is null or v_role not in ('student', 'teacher') then
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
  v_remaining integer;
  v_expired_units integer;
  v_existing public.quota_operations%rowtype;
begin
  if p_user_id is null or p_operation_id is null or p_units is null or p_units <= 0
    or p_request_hash is null or p_request_hash !~ '^[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'INVALID_QUOTA_RESERVATION';
  end if;

  v_period_start := pg_catalog.date_trunc('month', v_now at time zone 'Asia/Ho_Chi_Minh')::date;

  insert into public.quota_usage (user_id, metric, period_start)
  values (p_user_id, p_metric, v_period_start)
  on conflict (user_id, metric, period_start) do nothing;

  select q.used, q.reserved
    into v_used, v_reserved
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

  select q.used, q.reserved
    into v_used, v_reserved
    from public.quota_usage as q
   where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start;

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
    select q.quota_limit, q.resets_at
      into v_limit, v_resets_at
      from public.billing_get_effective_quotas(p_user_id, v_now) as q
     where q.metric = p_metric;
    select q.used, q.reserved
      into v_used, v_reserved
      from public.quota_usage as q
     where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start;
    return pg_catalog.jsonb_build_object(
      'operation_id', v_existing.operation_id,
      'state', v_existing.state,
      'remaining', greatest(v_limit - v_used - v_reserved, 0),
      'resets_at', v_resets_at
    );
  end if;

  select q.quota_limit, q.kind, q.resets_at
    into v_limit, v_kind, v_resets_at
    from public.billing_get_effective_quotas(p_user_id, v_now) as q
   where q.metric = p_metric;
  if not found then
    raise exception using errcode = '22023', message = 'UNKNOWN_QUOTA_METRIC';
  end if;
  if v_kind <> 'monthly' then
    raise exception using errcode = 'P0001', message = 'CAPACITY_RESERVATION_UNSUPPORTED';
  end if;

  if v_used + v_reserved + p_units > v_limit then
    raise exception using errcode = 'P0001', message = 'QUOTA_EXCEEDED';
  end if;

  begin
    insert into public.quota_operations (
      operation_id, user_id, metric, period_start, request_hash, units, state, lease_expires_at
    ) values (
      p_operation_id, p_user_id, p_metric, v_period_start, p_request_hash, p_units, 'reserved', v_now + interval '2 minutes'
    );
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
  end;
  update public.quota_usage as q
     set reserved = q.reserved + p_units,
         updated_at = v_now
   where q.user_id = p_user_id and q.metric = p_metric and q.period_start = v_period_start
  returning q.used, q.reserved into v_used, v_reserved;
  v_remaining := greatest(v_limit - v_used - v_reserved, 0);

  return pg_catalog.jsonb_build_object(
    'operation_id', p_operation_id,
    'state', 'reserved',
    'remaining', v_remaining,
    'resets_at', v_resets_at
  );
end;
$$;

create or replace function public.billing_settle_quota(p_operation_id uuid, p_outcome text)
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
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if p_operation_id is null or p_outcome not in ('commit', 'release') then
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

  update public.quota_operations as op
     set state = case p_outcome when 'commit' then 'committed' else 'released' end,
         settled_at = v_now
   where op.operation_id = p_operation_id;
  update public.quota_usage as q
     set used = q.used + case when p_outcome = 'commit' then v_units else 0 end,
         reserved = q.reserved - v_units,
         updated_at = v_now
   where q.user_id = v_user_id and q.metric = v_metric and q.period_start = v_period_start;
  return true;
end;
$$;

alter table public.billing_plans enable row level security;
alter table public.billing_prices enable row level security;
alter table public.billing_plan_limits enable row level security;
alter table public.billing_orders enable row level security;
alter table public.billing_payment_attempts enable row level security;
alter table public.billing_events enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_grants enable row level security;
alter table public.account_quota_versions enable row level security;
alter table public.account_quota_overrides enable row level security;
alter table public.account_quota_audit enable row level security;
alter table public.quota_usage enable row level security;
alter table public.quota_operations enable row level security;

revoke all on public.billing_plans, public.billing_prices, public.billing_plan_limits,
  public.billing_orders, public.billing_payment_attempts, public.billing_events,
  public.billing_subscriptions, public.billing_grants, public.account_quota_versions,
  public.account_quota_overrides, public.account_quota_audit, public.quota_usage,
  public.quota_operations from public, anon, authenticated;
grant select, insert, update, delete on public.billing_plans, public.billing_prices,
  public.billing_plan_limits, public.billing_orders, public.billing_payment_attempts,
  public.billing_events, public.billing_subscriptions, public.billing_grants,
  public.account_quota_versions, public.account_quota_overrides,
  public.account_quota_audit, public.quota_usage, public.quota_operations to service_role;

grant usage on schema auth to service_role;
grant select (id, raw_app_meta_data) on table auth.users to service_role;
grant select (id, teacher_id) on table public.class_rooms to service_role;
grant select (class_id, student_id) on table public.class_members to service_role;
grant select (created_by, status) on table public.exam_blueprints to service_role;

revoke execute on function public.billing_get_effective_quotas(uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.billing_reserve_quota(uuid, text, uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.billing_settle_quota(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_get_effective_quotas(uuid, timestamptz) to service_role;
grant execute on function public.billing_reserve_quota(uuid, text, uuid, text, integer) to service_role;
grant execute on function public.billing_settle_quota(uuid, text) to service_role;
