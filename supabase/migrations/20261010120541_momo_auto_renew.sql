alter table public.billing_payment_attempts drop constraint billing_payment_attempts_provider_check;
alter table public.billing_payment_attempts add constraint billing_payment_attempts_provider_check check (provider in ('payos', 'vnpay', 'momo'));
alter table public.billing_events drop constraint billing_events_provider_check;
alter table public.billing_events add constraint billing_events_provider_check check (provider in ('payos', 'vnpay', 'momo'));

create table public.billing_mandates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  provider text not null default 'momo' check (provider = 'momo'),
  provider_reference text not null unique,
  price_id uuid not null,
  plan_code text not null,
  interval text not null check (interval in ('month', 'year')),
  amount_vnd integer not null check (amount_vnd > 0),
  consent_at timestamptz not null,
  consent_version text not null check (char_length(consent_version) between 1 and 80),
  status text not null default 'pending' check (status in ('pending', 'active', 'cancel_pending', 'cancelled', 'paused', 'failed')),
  provider_token text,
  next_charge_at timestamptz,
  last_charge_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (price_id, plan_code, interval, amount_vnd)
    references public.billing_prices(id, plan_code, interval, amount_vnd) on delete restrict,
  check ((status = 'active' and provider_token is not null and next_charge_at is not null)
    or status <> 'active')
);
create index billing_mandates_due_idx on public.billing_mandates (next_charge_at, id) where status = 'active';

create table public.billing_renewal_attempts (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references public.billing_mandates(id) on delete restrict,
  renewal_period timestamptz not null,
  order_id uuid not null unique references public.billing_orders(id) on delete restrict,
  state text not null check (state in ('processing', 'unknown', 'paid', 'failed', 'reconciliation')),
  retry_count integer not null default 0 check (retry_count >= 0),
  lease_expires_at timestamptz,
  result_code integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mandate_id, renewal_period)
);
create index billing_renewal_attempts_lease_idx on public.billing_renewal_attempts (lease_expires_at) where state in ('processing', 'unknown');

alter table public.billing_subscriptions
  add constraint billing_subscriptions_mandate_id_fkey
  foreign key (mandate_id) references public.billing_mandates(id) on delete set null;

alter table public.billing_mandates enable row level security;
alter table public.billing_renewal_attempts enable row level security;
revoke all on public.billing_mandates, public.billing_renewal_attempts from public, anon, authenticated;
grant select, insert, update, delete on public.billing_mandates, public.billing_renewal_attempts to service_role;

create or replace function public.billing_prepare_momo_mandate(p_user_id uuid, p_order_id uuid, p_consent_version text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_mandate_id uuid;
begin
  if p_user_id is null or p_order_id is null or p_consent_version is null or char_length(p_consent_version) not between 1 and 80 then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_CONSENT';
  end if;

  select o.* into v_order
    from public.billing_orders as o
   where o.id = p_order_id and o.user_id = p_user_id and o.status = 'pending' and o.expires_at > pg_catalog.now();
  if not found then
    raise exception using errcode = 'P0001', message = 'MOMO_ORDER_NOT_PENDING';
  end if;

  if exists (
    select 1 from public.billing_mandates as m
     where m.user_id = p_user_id and m.order_id <> p_order_id
       and m.status in ('active', 'cancel_pending')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_MOMO_MANDATE_EXISTS';
  end if;

  insert into public.billing_mandates (
    user_id, order_id, provider_reference, price_id, plan_code, interval, amount_vnd, consent_at, consent_version
  ) values (
    p_user_id, p_order_id, p_order_id::text, v_order.price_id, v_order.plan_code, v_order.interval,
    v_order.amount_vnd, pg_catalog.now(), p_consent_version
  )
  on conflict (order_id) do nothing;

  select m.id into v_mandate_id
    from public.billing_mandates as m
   where m.order_id = p_order_id and m.user_id = p_user_id and m.status = 'pending';
  if v_mandate_id is null then
    raise exception using errcode = 'P0001', message = 'MOMO_MANDATE_NOT_PENDING';
  end if;
  return v_mandate_id;
end;
$$;
revoke execute on function public.billing_prepare_momo_mandate(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.billing_prepare_momo_mandate(uuid, uuid, text) to service_role;

create or replace function public.billing_activate_momo_mandate(p_order_id uuid, p_provider_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mandate public.billing_mandates%rowtype;
  v_paid_through timestamptz;
begin
  if p_order_id is null or p_provider_token is null or char_length(p_provider_token) not between 1 and 8192 then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_TOKEN';
  end if;

  select m.* into v_mandate
    from public.billing_mandates as m
    join public.billing_orders as o on o.id = m.order_id
    join public.billing_grants as g on g.order_id = o.id
   where m.order_id = p_order_id and o.status = 'paid' and g.user_id = m.user_id
   for update of m;
  if not found then return false; end if;

  select s.paid_through into v_paid_through
    from public.billing_subscriptions as s
   where s.user_id = v_mandate.user_id and s.plan_code = v_mandate.plan_code
   for update;
  if not found or v_paid_through <= pg_catalog.now() then return false; end if;
  if exists (
    select 1 from public.billing_mandates as m
     where m.user_id = v_mandate.user_id and m.id <> v_mandate.id and m.status = 'active'
  ) then return false; end if;

  update public.billing_mandates
     set provider_token = p_provider_token,
         status = 'active',
         next_charge_at = pg_catalog.date_trunc('day', v_paid_through at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh',
         version = version + 1,
         updated_at = pg_catalog.now()
   where id = v_mandate.id and status in ('pending', 'active');
  if not found then return false; end if;

  update public.billing_subscriptions
     set renewal_mode = 'auto', mandate_id = v_mandate.id, version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_mandate.user_id and plan_code = v_mandate.plan_code;
  return found;
end;
$$;
revoke execute on function public.billing_activate_momo_mandate(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_activate_momo_mandate(uuid, text) to service_role;

create or replace function public.billing_claim_momo_renewals(p_limit integer default 20)
returns table (
  attempt_id uuid,
  mandate_id uuid,
  order_id text,
  initial_order_id text,
  request_id text,
  partner_client_id text,
  amount_vnd integer,
  billing_interval text,
  next_payment_date text,
  aes_token text,
  state text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_due record;
  v_attempt public.billing_renewal_attempts%rowtype;
  v_order_id uuid;
  v_idempotency_key text;
  v_now timestamptz := pg_catalog.now();
  v_interval interval;
  v_next_payment_date date;
begin
  if p_limit is null or p_limit < 1 or p_limit > 50 then
    raise exception using errcode = '22023', message = 'INVALID_RENEWAL_LIMIT';
  end if;

  for v_due in
    select m.id as mandate_id, m.user_id, m.provider_reference, m.price_id, m.plan_code, m.interval,
           m.amount_vnd, m.provider_token, s.paid_through
      from public.billing_mandates as m
      join public.billing_subscriptions as s on s.user_id = m.user_id and s.mandate_id = m.id
     where m.status = 'active' and s.renewal_mode = 'auto' and m.next_charge_at <= v_now
     order by m.next_charge_at, m.id
     limit p_limit
     for update of m skip locked
  loop
    v_interval := case when v_due.interval = 'year' then interval '12 months' else interval '1 month' end;
    v_next_payment_date := ((v_due.paid_through at time zone 'Asia/Ho_Chi_Minh') + v_interval)::date;

    select a.* into v_attempt
      from public.billing_renewal_attempts as a
     where a.mandate_id = v_due.mandate_id and a.renewal_period = v_due.paid_through
     for update;

    if found then
      if v_attempt.state not in ('processing', 'unknown') or v_attempt.lease_expires_at > v_now then
        continue;
      end if;
      if v_attempt.retry_count >= 3 then
        update public.billing_renewal_attempts set state = 'reconciliation', lease_expires_at = null, updated_at = v_now where id = v_attempt.id;
        update public.billing_mandates set status = 'paused', provider_token = null, next_charge_at = null, version = version + 1, updated_at = v_now where id = v_due.mandate_id;
        update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = v_now where user_id = v_due.user_id and mandate_id = v_due.mandate_id;
        continue;
      end if;
      update public.billing_renewal_attempts
         set state = 'processing', retry_count = retry_count + 1, lease_expires_at = v_now + interval '10 minutes', updated_at = v_now
       where id = v_attempt.id;
      return query select v_attempt.id, v_due.mandate_id, v_attempt.order_id::text, v_due.provider_reference,
        v_attempt.order_id::text, v_due.user_id::text, v_due.amount_vnd, v_due.interval,
        v_next_payment_date::text, v_due.provider_token, 'unknown'::text;
      continue;
    end if;

    v_order_id := gen_random_uuid();
    v_idempotency_key := 'momo-renewal-' || v_due.mandate_id::text || '-' || pg_catalog.to_char(v_due.paid_through at time zone 'UTC', 'YYYYMMDDHH24MISS');
    insert into public.billing_orders (
      id, user_id, price_id, plan_code, interval, amount_vnd, purpose, status, idempotency_key,
      payload_hash, expires_at
    ) values (
      v_order_id, v_due.user_id, v_due.price_id, v_due.plan_code, v_due.interval, v_due.amount_vnd,
      'subscription', 'pending', v_idempotency_key, pg_catalog.repeat(pg_catalog.md5(v_idempotency_key), 2),
      v_due.paid_through + interval '30 days'
    );
    insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd)
    values (v_order_id, 'momo', v_order_id::text, v_due.amount_vnd);
    insert into public.billing_renewal_attempts (mandate_id, renewal_period, order_id, state, lease_expires_at)
    values (v_due.mandate_id, v_due.paid_through, v_order_id, 'processing', v_now + interval '10 minutes')
    returning id into attempt_id;
    update public.billing_mandates set last_charge_at = v_now, updated_at = v_now where id = v_due.mandate_id;
    return query select attempt_id, v_due.mandate_id, v_order_id::text, v_due.provider_reference,
      v_order_id::text, v_due.user_id::text, v_due.amount_vnd, v_due.interval,
      v_next_payment_date::text, v_due.provider_token, 'ready'::text;
  end loop;
end;
$$;
revoke execute on function public.billing_claim_momo_renewals(integer) from public, anon, authenticated;
grant execute on function public.billing_claim_momo_renewals(integer) to service_role;

create or replace function public.billing_mark_momo_renewal_unknown(p_attempt_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.billing_renewal_attempts
     set state = 'unknown', lease_expires_at = pg_catalog.now(), updated_at = pg_catalog.now()
   where id = p_attempt_id and state = 'processing';
$$;
revoke execute on function public.billing_mark_momo_renewal_unknown(uuid) from public, anon, authenticated;
grant execute on function public.billing_mark_momo_renewal_unknown(uuid) to service_role;

create or replace function public.billing_mark_momo_renewal_failed(p_attempt_id uuid, p_result_code integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mandate_id uuid;
  v_user_id uuid;
begin
  update public.billing_renewal_attempts
     set state = 'failed', result_code = p_result_code, lease_expires_at = null, updated_at = pg_catalog.now()
   where id = p_attempt_id and state = 'processing'
   returning mandate_id into v_mandate_id;
  if v_mandate_id is null then return; end if;
  update public.billing_mandates set status = 'failed', provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = v_mandate_id returning user_id into v_user_id;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = v_mandate_id;
end;
$$;
revoke execute on function public.billing_mark_momo_renewal_failed(uuid, integer) from public, anon, authenticated;
grant execute on function public.billing_mark_momo_renewal_failed(uuid, integer) to service_role;

create or replace function public.billing_begin_momo_cancellation(p_user_id uuid)
returns table (mandate_id uuid, initial_order_id text, partner_client_id text, aes_token text, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mandate public.billing_mandates%rowtype;
begin
  select m.* into v_mandate
    from public.billing_mandates as m
    join public.billing_subscriptions as s on s.user_id = m.user_id and s.mandate_id = m.id
   where m.user_id = p_user_id and m.status in ('active', 'cancel_pending')
   for update of m;
  if not found then return; end if;
  update public.billing_mandates set status = 'cancel_pending', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = v_mandate.id;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = p_user_id and mandate_id = v_mandate.id;
  return query select v_mandate.id, v_mandate.provider_reference, v_mandate.user_id::text, v_mandate.provider_token, 'cancel_pending'::text;
end;
$$;
revoke execute on function public.billing_begin_momo_cancellation(uuid) from public, anon, authenticated;
grant execute on function public.billing_begin_momo_cancellation(uuid) to service_role;

create or replace function public.billing_confirm_momo_cancellation(p_mandate_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if p_status is null or p_status not in ('cancelled', 'paused') then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_MANDATE_STATUS';
  end if;
  update public.billing_mandates
     set status = p_status, provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = p_mandate_id and status = 'cancel_pending'
   returning user_id into v_user_id;
  if v_user_id is null then return false; end if;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = p_mandate_id;
  return true;
end;
$$;
revoke execute on function public.billing_confirm_momo_cancellation(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_confirm_momo_cancellation(uuid, text) to service_role;

create or replace function public.billing_apply_momo_subscription_action(p_order_id text, p_partner_client_id text, p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_mandate_id uuid;
  v_user_id uuid;
begin
  v_status := case p_action when 'pause' then 'paused' when 'lock' then 'paused' when 'cancel' then 'cancelled' when 'expire' then 'cancelled' else null end;
  if v_status is null then raise exception using errcode = '22023', message = 'INVALID_MOMO_ACTION'; end if;
  update public.billing_mandates
     set status = v_status, provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where provider_reference = p_order_id and user_id::text = p_partner_client_id and status in ('active', 'cancel_pending', 'paused')
   returning id, user_id into v_mandate_id, v_user_id;
  if v_mandate_id is null then return false; end if;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = v_mandate_id;
  return true;
end;
$$;
revoke execute on function public.billing_apply_momo_subscription_action(text, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_momo_subscription_action(text, text, text) to service_role;

create or replace function public.billing_apply_payment(
  p_provider text,
  p_reference text,
  p_transaction_id text,
  p_amount_vnd integer,
  p_outcome text,
  p_paid_at timestamptz,
  p_fingerprint text,
  p_event_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_attempt record;
  v_attempt_found boolean := false;
  v_order record;
  v_role text;
  v_audience text;
  v_sub record;
  v_start timestamptz;
  v_through timestamptz;
  v_now timestamptz := pg_catalog.now();
  v_admin_recheck boolean := coalesce(p_event_type = 'admin_reconciliation', false);
begin
  if p_provider not in ('payos', 'vnpay', 'momo') or p_outcome not in ('paid', 'failed', 'cancelled', 'expired')
     or p_reference is null or p_fingerprint is null then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_EVENT';
  end if;

  select a.* into v_attempt
    from public.billing_payment_attempts as a
   where a.provider = p_provider and a.provider_reference = p_reference
   for update;
  v_attempt_found := found;
  if v_attempt_found then
    select o.* into v_order from public.billing_orders as o where o.id = v_attempt.order_id for update;
  end if;

  if v_admin_recheck and v_attempt_found and p_outcome = 'paid' and p_transaction_id is not null then
    select e.id into v_event_id
      from public.billing_events as e
     where e.provider = p_provider
       and e.merchant_reference = p_reference
       and e.provider_transaction_id is not distinct from p_transaction_id
     order by (e.verification_state = 'reconciliation') desc, e.received_at desc, e.id desc
     limit 1
     for update;
  end if;

  if v_event_id is null then
    insert into public.billing_events (provider, fingerprint, event_type, merchant_reference, provider_transaction_id, amount_vnd, paid_at, outcome, verification_state)
    values (p_provider, p_fingerprint, coalesce(p_event_type, 'payment'), p_reference, p_transaction_id, p_amount_vnd, p_paid_at, p_outcome, 'verified')
    on conflict (provider, fingerprint) do nothing
    returning id into v_event_id;
    if v_event_id is null then return 'duplicate'; end if;
  end if;

  if not v_attempt_found then
    update public.billing_events set verification_state = 'reconciliation', processed_at = v_now where id = v_event_id;
    return 'reconciliation';
  end if;

  if p_outcome <> 'paid' then
    if v_attempt.status = 'pending' then
      update public.billing_payment_attempts set status = p_outcome, updated_at = v_now where id = v_attempt.id;
    end if;
    update public.billing_events set processed_at = v_now where id = v_event_id;
    return 'recorded';
  end if;

  if v_attempt.provider_transaction_id is not distinct from p_transaction_id
     and (
       v_attempt.status = 'paid'
       or (
         v_admin_recheck
         and v_attempt.status = 'reconciliation'
         and v_order.status = 'paid'
         and exists (
           select 1 from public.billing_events as e
            where e.provider = p_provider
              and e.merchant_reference = p_reference
              and e.provider_transaction_id is not distinct from p_transaction_id
              and e.verification_state = 'verified'
         )
       )
     ) then
    update public.billing_events set processed_at = v_now where id = v_event_id;
    if v_admin_recheck then
      update public.billing_events
         set verification_state = 'verified', processed_at = v_now
       where provider = p_provider
         and merchant_reference = p_reference
         and provider_transaction_id is not distinct from p_transaction_id
         and verification_state = 'reconciliation';
    end if;
    return 'duplicate';
  end if;
  if v_admin_recheck and v_attempt.status <> 'reconciliation' and v_order.status <> 'reconciliation' then
    update public.billing_events set verification_state = 'reconciliation', processed_at = v_now where id = v_event_id;
    return 'reconciliation';
  end if;

  select u.raw_app_meta_data ->> 'app_role' into v_role from auth.users as u where u.id = v_order.user_id;
  v_role := coalesce(v_role, 'student');
  select p.audience into v_audience from public.billing_plans as p where p.code = v_order.plan_code;

  if v_attempt.status = 'paid'
     or v_order.status = 'paid'
     or (v_attempt.status = 'reconciliation' and not v_admin_recheck)
     or (v_order.status = 'reconciliation' and not v_admin_recheck)
     or (v_admin_recheck and v_attempt.provider_transaction_id is not null and v_attempt.provider_transaction_id is distinct from p_transaction_id)
     or p_amount_vnd is distinct from v_attempt.amount_vnd
     or p_amount_vnd is distinct from v_order.amount_vnd
     or coalesce(p_paid_at, v_now) > v_order.expires_at
     or v_order.user_id is null
     or v_role is distinct from v_audience then
    update public.billing_payment_attempts
       set status = 'reconciliation', provider_transaction_id = coalesce(provider_transaction_id, p_transaction_id), updated_at = v_now
     where id = v_attempt.id;
    if v_order.status <> 'paid' then
      update public.billing_orders set status = 'reconciliation' where id = v_order.id;
    end if;
    update public.billing_events set verification_state = 'reconciliation', processed_at = v_now where id = v_event_id;
    return 'reconciliation';
  end if;

  select s.* into v_sub from public.billing_subscriptions as s where s.user_id = v_order.user_id for update;
  if found and v_sub.plan_code = v_order.plan_code and v_sub.paid_through > v_now then
    v_start := v_sub.paid_through;
  else
    v_start := v_now;
  end if;
  v_through := ((v_start at time zone 'Asia/Ho_Chi_Minh')
                + case when v_order.interval = 'year' then interval '12 months' else interval '1 month' end)
               at time zone 'Asia/Ho_Chi_Minh';

  insert into public.billing_subscriptions (user_id, plan_code, paid_through)
  values (v_order.user_id, v_order.plan_code, v_through)
  on conflict (user_id) do update
    set plan_code = excluded.plan_code,
        paid_through = excluded.paid_through,
        version = public.billing_subscriptions.version + 1,
        updated_at = v_now;
  insert into public.billing_grants (order_id, user_id, plan_code, starts_at, paid_through)
  values (v_order.id, v_order.user_id, v_order.plan_code, v_start, v_through);
  update public.billing_orders set status = 'paid', paid_at = coalesce(p_paid_at, v_now) where id = v_order.id;
  update public.billing_payment_attempts
     set status = 'paid', provider_transaction_id = p_transaction_id, updated_at = v_now
   where id = v_attempt.id;
  update public.billing_events set processed_at = v_now where id = v_event_id;
  if v_admin_recheck then
    update public.billing_events
       set verification_state = 'verified', processed_at = v_now
     where provider = p_provider
       and merchant_reference = p_reference
       and provider_transaction_id is not distinct from p_transaction_id
       and verification_state = 'reconciliation';
  end if;
  return 'applied';
end;
$$;
revoke execute on function public.billing_apply_payment(text, text, text, integer, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_payment(text, text, text, integer, text, timestamptz, text, text) to service_role;

create or replace function public.billing_apply_momo_payment(
  p_reference text,
  p_request_id text,
  p_partner_client_id text,
  p_transaction_id text,
  p_amount_vnd integer,
  p_outcome text,
  p_paid_at timestamptz,
  p_fingerprint text,
  p_event_type text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text;
  v_attempt public.billing_payment_attempts%rowtype;
  v_renewal public.billing_renewal_attempts%rowtype;
  v_mandate public.billing_mandates%rowtype;
  v_paid_through timestamptz;
begin
  if p_reference is null or p_request_id is null or p_partner_client_id is null or p_fingerprint is null then
    raise exception using errcode = '22023', message = 'INVALID_MOMO_PAYMENT';
  end if;
  if p_request_id is distinct from p_reference or exists (
    select 1
      from public.billing_payment_attempts as a
      join public.billing_orders as o on o.id = a.order_id
     where a.provider = 'momo' and a.provider_reference = p_reference
       and o.user_id::text is distinct from p_partner_client_id
  ) then
    insert into public.billing_events (provider, fingerprint, event_type, merchant_reference, provider_transaction_id, amount_vnd, paid_at, outcome, verification_state, processed_at)
    values ('momo', p_fingerprint, coalesce(p_event_type, 'webhook'), p_reference, p_transaction_id, p_amount_vnd, p_paid_at, 'unverified', 'reconciliation', pg_catalog.now())
    on conflict (provider, fingerprint) do nothing;
    return 'reconciliation';
  end if;
  v_result := public.billing_apply_payment('momo', p_reference, p_transaction_id, p_amount_vnd, p_outcome, p_paid_at, p_fingerprint, p_event_type);
  select a.* into v_attempt from public.billing_payment_attempts as a where a.provider = 'momo' and a.provider_reference = p_reference;
  if not found then return v_result; end if;

  select r.* into v_renewal from public.billing_renewal_attempts as r where r.order_id = v_attempt.order_id for update;
  if found then
    select m.* into v_mandate from public.billing_mandates as m where m.id = v_renewal.mandate_id for update;
    if p_outcome = 'paid' and v_attempt.status = 'paid' then
      select s.paid_through into v_paid_through
        from public.billing_subscriptions as s
       where s.user_id = v_mandate.user_id and s.mandate_id = v_mandate.id;
      update public.billing_renewal_attempts set state = 'paid', lease_expires_at = null, updated_at = pg_catalog.now() where id = v_renewal.id;
      update public.billing_mandates
         set last_charge_at = coalesce(p_paid_at, pg_catalog.now()),
             next_charge_at = case when status = 'active' then pg_catalog.date_trunc('day', v_paid_through at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh' else null end,
             updated_at = pg_catalog.now()
       where id = v_mandate.id;
    elsif v_result = 'reconciliation' then
      update public.billing_renewal_attempts set state = 'reconciliation', lease_expires_at = null, updated_at = pg_catalog.now() where id = v_renewal.id;
      update public.billing_mandates set status = 'paused', provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now() where id = v_mandate.id;
      update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now() where user_id = v_mandate.user_id and mandate_id = v_mandate.id;
    elsif p_outcome <> 'paid' and v_renewal.state in ('processing', 'unknown') then
      update public.billing_renewal_attempts set state = 'failed', lease_expires_at = null, updated_at = pg_catalog.now() where id = v_renewal.id;
      update public.billing_mandates set status = 'failed', provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now() where id = v_mandate.id;
      update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now() where user_id = v_mandate.user_id and mandate_id = v_mandate.id;
    end if;
  elsif p_outcome <> 'paid' then
    update public.billing_mandates set status = 'failed', provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
     where order_id = v_attempt.order_id and status = 'pending';
  end if;
  return v_result;
end;
$$;
revoke execute on function public.billing_apply_momo_payment(text, text, text, text, integer, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_momo_payment(text, text, text, text, integer, text, timestamptz, text, text) to service_role;

create or replace function public.billing_reconciliation_page(p_limit integer default 20, p_offset integer default 0)
returns table (items jsonb, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception using errcode = '22023', message = 'INVALID_RECONCILIATION_PAGE';
  end if;
  return query
  with incidents as (
    select
      e.id as incident_id,
      e.provider as provider,
      e.id as event_id,
      a.id as attempt_id,
      o.id as order_id,
      e.received_at as created_at,
      e.merchant_reference as provider_reference,
      coalesce(e.provider_transaction_id, a.provider_transaction_id) as provider_transaction_id,
      e.amount_vnd as amount_received_vnd,
      e.paid_at as paid_at,
      a.status as attempt_status,
      o.status as order_status,
      a.amount_vnd as expected_amount_vnd,
      o.amount_vnd as order_amount_vnd,
      o.expires_at as order_expires_at,
      o.user_id as user_id,
      u.email as account_email,
      coalesce(p.display_name, u.raw_user_meta_data ->> 'display_name') as display_name,
      coalesce(u.raw_app_meta_data ->> 'app_role', 'student') as current_role,
      o.plan_code as plan_code,
      bp.name_en as plan_name_en,
      bp.name_vi as plan_name_vi,
      bp.audience as plan_audience
    from public.billing_events as e
    left join public.billing_payment_attempts as a
      on a.provider = e.provider and a.provider_reference = e.merchant_reference
    left join public.billing_orders as o on o.id = a.order_id
    left join public.billing_plans as bp on bp.code = o.plan_code
    left join auth.users as u on u.id = o.user_id
    left join public.profiles as p on p.id = o.user_id
    where e.provider in ('payos', 'momo') and e.verification_state = 'reconciliation'

    union all

    select
      a.id as incident_id,
      a.provider as provider,
      null::uuid as event_id,
      a.id as attempt_id,
      o.id as order_id,
      a.updated_at as created_at,
      a.provider_reference as provider_reference,
      a.provider_transaction_id as provider_transaction_id,
      null::integer as amount_received_vnd,
      null::timestamptz as paid_at,
      a.status as attempt_status,
      o.status as order_status,
      a.amount_vnd as expected_amount_vnd,
      o.amount_vnd as order_amount_vnd,
      o.expires_at as order_expires_at,
      o.user_id as user_id,
      u.email as account_email,
      coalesce(p.display_name, u.raw_user_meta_data ->> 'display_name') as display_name,
      coalesce(u.raw_app_meta_data ->> 'app_role', 'student') as current_role,
      o.plan_code as plan_code,
      bp.name_en as plan_name_en,
      bp.name_vi as plan_name_vi,
      bp.audience as plan_audience
    from public.billing_payment_attempts as a
    join public.billing_orders as o on o.id = a.order_id
    left join public.billing_plans as bp on bp.code = o.plan_code
    left join auth.users as u on u.id = o.user_id
    left join public.profiles as p on p.id = o.user_id
    where a.provider in ('payos', 'momo') and a.status = 'reconciliation'
      and not exists (
        select 1 from public.billing_events as e
         where e.provider = a.provider
           and e.merchant_reference = a.provider_reference
           and e.verification_state = 'reconciliation'
      )

    union all

    select
      r.id as incident_id,
      a.provider as provider,
      null::uuid as event_id,
      a.id as attempt_id,
      o.id as order_id,
      r.updated_at as created_at,
      a.provider_reference as provider_reference,
      a.provider_transaction_id as provider_transaction_id,
      null::integer as amount_received_vnd,
      null::timestamptz as paid_at,
      'reconciliation'::text as attempt_status,
      o.status as order_status,
      a.amount_vnd as expected_amount_vnd,
      o.amount_vnd as order_amount_vnd,
      o.expires_at as order_expires_at,
      o.user_id as user_id,
      u.email as account_email,
      coalesce(p.display_name, u.raw_user_meta_data ->> 'display_name') as display_name,
      coalesce(u.raw_app_meta_data ->> 'app_role', 'student') as current_role,
      o.plan_code as plan_code,
      bp.name_en as plan_name_en,
      bp.name_vi as plan_name_vi,
      bp.audience as plan_audience
    from public.billing_renewal_attempts as r
    join public.billing_payment_attempts as a on a.order_id = r.order_id and a.provider = 'momo'
    join public.billing_orders as o on o.id = r.order_id
    left join public.billing_plans as bp on bp.code = o.plan_code
    left join auth.users as u on u.id = o.user_id
    left join public.profiles as p on p.id = o.user_id
    where r.state = 'reconciliation'
      and a.status <> 'reconciliation'
      and not exists (
        select 1 from public.billing_events as e
         where e.provider = a.provider
           and e.merchant_reference = a.provider_reference
           and e.verification_state = 'reconciliation'
      )
  ),
  tally as (select pg_catalog.count(*)::bigint as total_count from incidents),
  page_rows as (
    select * from incidents
     order by created_at desc, incident_id desc
     limit p_limit offset p_offset
  )
  select coalesce(
           pg_catalog.jsonb_agg(pg_catalog.to_jsonb(page_rows) order by page_rows.created_at desc, page_rows.incident_id desc)
             filter (where page_rows.incident_id is not null),
           '[]'::jsonb
         ),
         tally.total_count
    from tally left join page_rows on true
   group by tally.total_count;
end;
$$;
revoke execute on function public.billing_reconciliation_page(integer, integer) from public, anon, authenticated;
grant execute on function public.billing_reconciliation_page(integer, integer) to service_role;
