-- Orders and verified payments (billing plan Task 6, spec §6–7). The backend creates an order
-- with a price snapshot before it asks the provider for a payment link, and applies a payment
-- only after it has verified the provider's signature (or queried the provider itself). Both
-- steps are single transactions here, so a repeated or concurrent callback grants at most once.
-- Backend only (service_role).

-- Creates the order of a checkout, or returns the one made with the same idempotency key.
-- Refuses: an unknown/inactive price, a plan for another audience than the account's role,
-- admin accounts, and the same key with a different request.
create or replace function public.billing_create_order(
  p_user_id uuid,
  p_price_id uuid,
  p_idempotency_key text,
  p_payload_hash text,
  p_expires_at timestamptz
)
returns table (
  order_id uuid,
  plan_code text,
  billing_interval text,
  amount_vnd integer,
  status text,
  expires_at timestamptz,
  created boolean
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_role text;
  v_price record;
  v_order record;
begin
  if p_user_id is null or p_price_id is null or p_idempotency_key is null or p_payload_hash is null or p_expires_at is null then
    raise exception using errcode = '22023', message = 'INVALID_CHECKOUT';
  end if;

  select u.raw_app_meta_data ->> 'app_role' into v_role from auth.users as u where u.id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'BILLING_ACCOUNT_NOT_FOUND';
  end if;
  v_role := coalesce(v_role, 'student');
  if v_role not in ('student', 'teacher') then
    raise exception using errcode = '22023', message = 'UNSUPPORTED_BILLING_ROLE';
  end if;

  -- One checkout per key at a time: the second of two equal requests waits, then replays.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('checkout:' || p_user_id::text || ':' || p_idempotency_key, 0));

  select o.id, o.plan_code, o.interval, o.amount_vnd, o.status, o.expires_at, o.payload_hash
    into v_order
    from public.billing_orders as o
   where o.user_id = p_user_id and o.idempotency_key = p_idempotency_key;
  if found then
    if v_order.payload_hash <> p_payload_hash then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_CONFLICT';
    end if;
    return query select v_order.id, v_order.plan_code, v_order.interval, v_order.amount_vnd, v_order.status, v_order.expires_at, false;
    return;
  end if;

  select pr.id, pr.plan_code, pr.interval, pr.amount_vnd, p.audience
    into v_price
    from public.billing_prices as pr
    join public.billing_plans as p on p.code = pr.plan_code and p.active
   where pr.id = p_price_id and pr.active;
  if not found then
    raise exception using errcode = 'P0001', message = 'PRICE_NOT_AVAILABLE';
  end if;
  if v_price.audience <> v_role then
    raise exception using errcode = 'P0001', message = 'PLAN_NOT_FOR_ROLE';
  end if;

  insert into public.billing_orders (user_id, price_id, plan_code, interval, amount_vnd, idempotency_key, payload_hash, expires_at)
  values (p_user_id, v_price.id, v_price.plan_code, v_price.interval, v_price.amount_vnd, p_idempotency_key, p_payload_hash, p_expires_at)
  returning id, billing_orders.plan_code, billing_orders.interval, billing_orders.amount_vnd, billing_orders.status, billing_orders.expires_at
  into v_order;
  return query select v_order.id, v_order.plan_code, v_order.interval, v_order.amount_vnd, v_order.status, v_order.expires_at, true;
end;
$$;
revoke execute on function public.billing_create_order(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.billing_create_order(uuid, uuid, text, text, timestamptz) to service_role;

-- Applies one verified provider event to its payment attempt.
-- Returns 'applied' (the plan was granted or extended), 'recorded' (a failure/cancel noted),
-- 'duplicate' (this event or this payment was already applied) or 'reconciliation' (money that
-- cannot be matched to exactly one on-time, full payment of an open order: kept for review,
-- never granted and never dropped).
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
  v_order record;
  v_role text;
  v_audience text;
  v_sub record;
  v_start timestamptz;
  v_through timestamptz;
  v_now timestamptz := pg_catalog.now();
  v_result text;
begin
  if p_provider not in ('payos', 'vnpay') or p_outcome not in ('paid', 'failed', 'cancelled', 'expired')
     or p_reference is null or p_fingerprint is null then
    raise exception using errcode = '22023', message = 'INVALID_PAYMENT_EVENT';
  end if;

  insert into public.billing_events (provider, fingerprint, event_type, merchant_reference, provider_transaction_id, outcome, verification_state)
  values (p_provider, p_fingerprint, coalesce(p_event_type, 'payment'), p_reference, p_transaction_id, p_outcome, 'verified')
  on conflict (provider, fingerprint) do nothing
  returning id into v_event_id;
  if v_event_id is null then
    return 'duplicate';
  end if;

  select a.* into v_attempt
    from public.billing_payment_attempts as a
   where a.provider = p_provider and a.provider_reference = p_reference
   for update;
  if not found then
    update public.billing_events set verification_state = 'reconciliation', processed_at = v_now where id = v_event_id;
    return 'reconciliation';
  end if;

  select o.* into v_order from public.billing_orders as o where o.id = v_attempt.order_id for update;

  if p_outcome <> 'paid' then
    -- A failure never takes back a payment already received.
    if v_attempt.status = 'pending' then
      update public.billing_payment_attempts set status = p_outcome, updated_at = v_now where id = v_attempt.id;
    end if;
    update public.billing_events set processed_at = v_now where id = v_event_id;
    return 'recorded';
  end if;

  -- The same money reported again under another event id.
  if v_attempt.status = 'paid' and v_attempt.provider_transaction_id is not distinct from p_transaction_id then
    update public.billing_events set processed_at = v_now where id = v_event_id;
    return 'duplicate';
  end if;

  select u.raw_app_meta_data ->> 'app_role' into v_role from auth.users as u where u.id = v_order.user_id;
  v_role := coalesce(v_role, 'student');
  select p.audience into v_audience from public.billing_plans as p where p.code = v_order.plan_code;

  if v_attempt.status = 'paid'                                  -- this attempt was already paid once
     or v_order.status = 'paid'                                  -- another attempt already paid the order
     or v_order.status = 'reconciliation'
     or p_amount_vnd is distinct from v_attempt.amount_vnd       -- not the amount asked for
     or p_amount_vnd is distinct from v_order.amount_vnd
     or coalesce(p_paid_at, v_now) > v_order.expires_at          -- paid after the order expired
     or v_order.user_id is null                                  -- the account was deleted
     or v_role is distinct from v_audience then                  -- the role changed since checkout
    update public.billing_payment_attempts
       set status = 'reconciliation', provider_transaction_id = coalesce(provider_transaction_id, p_transaction_id), updated_at = v_now
     where id = v_attempt.id;
    if v_order.status <> 'paid' then
      update public.billing_orders set status = 'reconciliation' where id = v_order.id;
    end if;
    update public.billing_events set verification_state = 'reconciliation', processed_at = v_now where id = v_event_id;
    return 'reconciliation';
  end if;

  -- Same plan still running: the new period follows it. Otherwise it starts now.
  select s.* into v_sub from public.billing_subscriptions as s where s.user_id = v_order.user_id for update;
  if found and v_sub.plan_code = v_order.plan_code and v_sub.paid_through > v_now then
    v_start := v_sub.paid_through;
  else
    v_start := v_now;
  end if;
  -- Calendar months in Vietnam time; the 31st becomes the last day of a shorter month.
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
  v_result := 'applied';
  return v_result;
end;
$$;
revoke execute on function public.billing_apply_payment(text, text, text, integer, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_payment(text, text, text, integer, text, timestamptz, text, text) to service_role;

create index if not exists billing_payment_attempts_order_idx on public.billing_payment_attempts (order_id, created_at desc);

-- The hosted payment page of an attempt, so a retried checkout reopens the same link.
alter table public.billing_payment_attempts add column if not exists checkout_url text;
