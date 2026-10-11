-- VNPAY remains closed until backend configuration and merchant protocol confirmation.
alter table public.billing_mandates drop constraint billing_mandates_provider_check;
alter table public.billing_mandates add constraint billing_mandates_provider_check check (provider in ('momo', 'vnpay'));
alter table public.billing_mandates add column provider_checkout jsonb;


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

  perform 1 from auth.users where id = p_user_id for update;
  select o.* into v_order
    from public.billing_orders as o
   where o.id = p_order_id and o.user_id = p_user_id and o.status = 'pending' and o.expires_at > pg_catalog.now();
  if not found then
    raise exception using errcode = 'P0001', message = 'MOMO_ORDER_NOT_PENDING';
  end if;

  if exists (
    select 1 from public.billing_mandates as m
     where m.user_id = p_user_id and m.order_id <> p_order_id
       and (m.status in ('active', 'cancel_pending') or (m.provider = 'vnpay' and m.status in ('pending', 'paused', 'failed')))
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
   where m.provider = 'momo' and m.order_id = p_order_id and m.user_id = p_user_id and m.status = 'pending';
  if v_mandate_id is null then
    raise exception using errcode = 'P0001', message = 'MOMO_MANDATE_NOT_PENDING';
  end if;
  return v_mandate_id;
end;
$$;
revoke execute on function public.billing_prepare_momo_mandate(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.billing_prepare_momo_mandate(uuid, uuid, text) to service_role;

create or replace function public.billing_prepare_vnpay_mandate(p_user_id uuid, p_order_id uuid, p_consent_version text)
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
    raise exception using errcode = '22023', message = 'INVALID_VNPAY_CONSENT';
  end if;

  perform 1 from auth.users where id = p_user_id for update;
  select o.* into v_order
    from public.billing_orders as o
   where o.id = p_order_id and o.user_id = p_user_id and o.status = 'pending' and o.expires_at > pg_catalog.now();
  if not found then
    raise exception using errcode = 'P0001', message = 'VNPAY_ORDER_NOT_PENDING';
  end if;

  if exists (
    select 1 from public.billing_mandates as m
     where m.user_id = p_user_id and m.order_id <> p_order_id
       and m.status in ('pending', 'active', 'cancel_pending', 'paused', 'failed')
  ) then
    raise exception using errcode = 'P0001', message = 'ACTIVE_VNPAY_MANDATE_EXISTS';
  end if;

  insert into public.billing_mandates (
    user_id, order_id, provider, provider_reference, price_id, plan_code, interval, amount_vnd, consent_at, consent_version
  ) values (
    p_user_id, p_order_id, 'vnpay', p_order_id::text, v_order.price_id, v_order.plan_code, v_order.interval,
    v_order.amount_vnd, pg_catalog.now(), p_consent_version
  )
  on conflict (order_id) do nothing;

  select m.id into v_mandate_id
    from public.billing_mandates as m
   where m.provider = 'vnpay' and m.order_id = p_order_id and m.user_id = p_user_id and m.status = 'pending';
  if v_mandate_id is null then
    raise exception using errcode = 'P0001', message = 'VNPAY_MANDATE_NOT_PENDING';
  end if;
  return v_mandate_id;
end;
$$;
revoke execute on function public.billing_prepare_vnpay_mandate(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.billing_prepare_vnpay_mandate(uuid, uuid, text) to service_role;

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
   where m.provider = 'momo' and m.order_id = p_order_id and o.status = 'paid' and g.user_id = m.user_id
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

create or replace function public.billing_activate_vnpay_mandate(p_order_id uuid, p_provider_token text)
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
    raise exception using errcode = '22023', message = 'INVALID_VNPAY_TOKEN';
  end if;

  select m.* into v_mandate
    from public.billing_mandates as m
    join public.billing_orders as o on o.id = m.order_id
    join public.billing_grants as g on g.order_id = o.id
   where m.provider = 'vnpay' and m.order_id = p_order_id and o.status = 'paid' and g.user_id = m.user_id
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
revoke execute on function public.billing_activate_vnpay_mandate(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_activate_vnpay_mandate(uuid, text) to service_role;

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
     where m.provider = 'momo' and m.status = 'active' and s.renewal_mode = 'auto' and m.next_charge_at <= v_now
     order by m.next_charge_at, m.id
     limit p_limit
     for update of m skip locked
  loop
    v_interval := (public.billing_interval_months(v_due.interval) * interval '1 month');
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
        update public.billing_renewal_attempts
           set state = 'reconciliation', lease_expires_at = null, updated_at = v_now
         where id = v_attempt.id;
        update public.billing_mandates
           set status = 'paused', provider_token = null, next_charge_at = null, version = version + 1, updated_at = v_now
         where id = v_due.mandate_id;
        update public.billing_subscriptions as subscription
           set renewal_mode = 'manual', version = version + 1, updated_at = v_now
         where subscription.user_id = v_due.user_id and subscription.mandate_id = v_due.mandate_id;
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

create or replace function public.billing_claim_vnpay_renewals(p_limit integer default 20)
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
     where m.provider = 'vnpay' and m.status = 'active' and s.renewal_mode = 'auto' and m.next_charge_at <= v_now
     order by m.next_charge_at, m.id
     limit p_limit
     for update of m skip locked
  loop
    v_interval := (public.billing_interval_months(v_due.interval) * interval '1 month');
    v_next_payment_date := (v_due.paid_through at time zone 'Asia/Ho_Chi_Minh')::date;

    select a.* into v_attempt
      from public.billing_renewal_attempts as a
     where a.mandate_id = v_due.mandate_id and a.renewal_period = v_due.paid_through
     for update;

    if found then
      if v_attempt.state not in ('processing', 'unknown') or v_attempt.lease_expires_at > v_now then
        continue;
      end if;
      if v_attempt.retry_count >= 3 then
        update public.billing_renewal_attempts
           set state = 'reconciliation', lease_expires_at = null, updated_at = v_now
         where id = v_attempt.id;
        update public.billing_mandates
           set status = 'paused', next_charge_at = null, version = version + 1, updated_at = v_now
         where id = v_due.mandate_id;
        update public.billing_subscriptions as subscription
           set renewal_mode = 'manual', version = version + 1, updated_at = v_now
         where subscription.user_id = v_due.user_id and subscription.mandate_id = v_due.mandate_id;
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
    v_idempotency_key := 'vnpay-renewal-' || v_due.mandate_id::text || '-' || pg_catalog.to_char(v_due.paid_through at time zone 'UTC', 'YYYYMMDDHH24MISS');
    insert into public.billing_orders (
      id, user_id, price_id, plan_code, interval, amount_vnd, purpose, status, idempotency_key,
      payload_hash, expires_at
    ) values (
      v_order_id, v_due.user_id, v_due.price_id, v_due.plan_code, v_due.interval, v_due.amount_vnd,
      'subscription', 'pending', v_idempotency_key, pg_catalog.repeat(pg_catalog.md5(v_idempotency_key), 2),
      v_due.paid_through + interval '30 days'
    );
    insert into public.billing_payment_attempts (order_id, provider, provider_reference, amount_vnd)
    values (v_order_id, 'vnpay', v_order_id::text, v_due.amount_vnd);
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
revoke execute on function public.billing_claim_vnpay_renewals(integer) from public, anon, authenticated;
grant execute on function public.billing_claim_vnpay_renewals(integer) to service_role;

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
   where m.provider = 'momo' and m.user_id = p_user_id and m.status in ('active', 'cancel_pending')
   for update of m;
  if not found then return; end if;
  update public.billing_mandates
     set status = 'cancel_pending', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = v_mandate.id;
  update public.billing_subscriptions as subscription
     set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where subscription.user_id = p_user_id and subscription.mandate_id = v_mandate.id;
  return query select v_mandate.id, v_mandate.provider_reference, v_mandate.user_id::text, v_mandate.provider_token, 'cancel_pending'::text;
end;
$$;
revoke execute on function public.billing_begin_momo_cancellation(uuid) from public, anon, authenticated;
grant execute on function public.billing_begin_momo_cancellation(uuid) to service_role;

create or replace function public.billing_begin_vnpay_cancellation(p_user_id uuid)
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
   where m.provider = 'vnpay' and m.user_id = p_user_id and m.status in ('pending', 'active', 'cancel_pending', 'paused', 'failed')
   for update of m;
  if not found then return; end if;
  update public.billing_mandates
     set status = 'cancel_pending', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = v_mandate.id;
  update public.billing_subscriptions as subscription
     set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where subscription.user_id = p_user_id and subscription.mandate_id = v_mandate.id;
  return query select v_mandate.id, v_mandate.provider_reference, v_mandate.user_id::text, v_mandate.provider_token, 'cancel_pending'::text;
end;
$$;
revoke execute on function public.billing_begin_vnpay_cancellation(uuid) from public, anon, authenticated;
grant execute on function public.billing_begin_vnpay_cancellation(uuid) to service_role;

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
   where provider = 'momo' and id = p_mandate_id and status = 'cancel_pending'
   returning user_id into v_user_id;
  if v_user_id is null then return false; end if;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = p_mandate_id;
  return true;
end;
$$;
revoke execute on function public.billing_confirm_momo_cancellation(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_confirm_momo_cancellation(uuid, text) to service_role;

create or replace function public.billing_confirm_vnpay_cancellation(p_mandate_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  if p_status is null or p_status not in ('cancelled', 'paused') then
    raise exception using errcode = '22023', message = 'INVALID_VNPAY_MANDATE_STATUS';
  end if;
  update public.billing_mandates
     set status = p_status, provider_token = null, next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where provider = 'vnpay' and id = p_mandate_id and status = 'cancel_pending'
   returning user_id into v_user_id;
  if v_user_id is null then return false; end if;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = p_mandate_id;
  return true;
end;
$$;
revoke execute on function public.billing_confirm_vnpay_cancellation(uuid, text) from public, anon, authenticated;
grant execute on function public.billing_confirm_vnpay_cancellation(uuid, text) to service_role;

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
   where provider = 'momo' and provider_reference = p_order_id and user_id::text = p_partner_client_id and status in ('active', 'cancel_pending', 'paused')
   returning id, user_id into v_mandate_id, v_user_id;
  if v_mandate_id is null then return false; end if;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = v_mandate_id;
  return true;
end;
$$;
revoke execute on function public.billing_apply_momo_subscription_action(text, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_momo_subscription_action(text, text, text) to service_role;

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

create or replace function public.billing_apply_vnpay_payment(
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
  v_result text;
  v_attempt public.billing_payment_attempts%rowtype;
  v_renewal public.billing_renewal_attempts%rowtype;
  v_mandate public.billing_mandates%rowtype;
  v_paid_through timestamptz;
begin
  if p_reference is null or p_fingerprint is null then raise exception 'INVALID_VNPAY_PAYMENT'; end if;
  v_result := public.billing_apply_payment('vnpay', p_reference, p_transaction_id, p_amount_vnd, p_outcome, p_paid_at, p_fingerprint, p_event_type);
  select a.* into v_attempt from public.billing_payment_attempts as a where a.provider = 'vnpay' and a.provider_reference = p_reference;
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
      update public.billing_mandates set status = 'paused', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now() where id = v_mandate.id;
      update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now() where user_id = v_mandate.user_id and mandate_id = v_mandate.id;
    elsif p_outcome <> 'paid' and v_renewal.state in ('processing', 'unknown') then
      update public.billing_renewal_attempts set state = 'failed', lease_expires_at = null, updated_at = pg_catalog.now() where id = v_renewal.id;
      update public.billing_mandates set status = 'failed', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now() where id = v_mandate.id;
      update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now() where user_id = v_mandate.user_id and mandate_id = v_mandate.id;
    end if;
  elsif p_outcome <> 'paid' then
    update public.billing_mandates set status = 'failed', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
     where order_id = v_attempt.order_id and status = 'pending';
  end if;
  if p_outcome = 'paid' and v_result in ('applied', 'duplicate') then
    select m.* into v_mandate from public.billing_mandates m where m.order_id = v_attempt.order_id and m.provider = 'vnpay' and m.status = 'pending' and m.provider_token is not null;
    if found then perform public.billing_activate_vnpay_mandate(v_attempt.order_id, v_mandate.provider_token); end if;
  end if;
  return v_result;
end;
$$;
revoke execute on function public.billing_apply_vnpay_payment(text, text, integer, text, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.billing_apply_vnpay_payment(text, text, integer, text, timestamptz, text, text) to service_role;

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
    where e.provider in ('payos', 'momo', 'vnpay') and e.verification_state = 'reconciliation'

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
    where a.provider in ('payos', 'momo', 'vnpay') and a.status = 'reconciliation'
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
    join public.billing_payment_attempts as a on a.order_id = r.order_id and a.provider in ('momo', 'vnpay')
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

create or replace function public.billing_store_vnpay_authorization(p_order_id uuid, p_user_id uuid, p_token_id text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_m public.billing_mandates%rowtype;
begin
  if p_token_id is null or char_length(p_token_id) not between 1 and 4096 then return false; end if;
  select m.* into v_m from public.billing_mandates m join public.billing_orders o on o.id = m.order_id
   where m.provider = 'vnpay' and m.order_id = p_order_id and m.user_id = p_user_id
     and m.status in ('pending', 'active', 'cancel_pending') and m.provider_checkout is not null
   for update of m;
  if not found then return false; end if;
  if v_m.provider_token is not null then
    return v_m.provider_token::jsonb ->> 'tokenId' = p_token_id;
  end if;
  update public.billing_mandates set provider_token = jsonb_build_object('recurringId', provider_checkout ->> 'recurringId', 'tokenId', p_token_id)::text,
    updated_at = pg_catalog.now() where id = v_m.id;
  return true;
end; $$;
revoke execute on function public.billing_store_vnpay_authorization(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.billing_store_vnpay_authorization(uuid, uuid, text) to service_role;

create or replace function public.billing_claim_vnpay_initial(p_order_id uuid default null)
returns table (attempt_id uuid, mandate_id uuid, order_id text, initial_order_id text, request_id text,
  partner_client_id text, amount_vnd integer, billing_interval text, next_payment_date text, aes_token text, state text)
language plpgsql security definer set search_path = '' as $$
declare v_m record; v_attempt public.billing_renewal_attempts%rowtype; v_now timestamptz := pg_catalog.now();
begin
  for v_m in select m.*, o.created_at as order_created_at, o.expires_at
    from public.billing_mandates m join public.billing_orders o on o.id = m.order_id
    where m.provider = 'vnpay' and m.status = 'pending' and m.provider_token is not null
      and o.status = 'pending' and (p_order_id is null or m.order_id = p_order_id)
    order by m.created_at limit 20 for update of m skip locked
  loop
    select r.* into v_attempt from public.billing_renewal_attempts r where r.order_id = v_m.order_id for update;
    if found then
      if v_attempt.state not in ('processing', 'unknown') or v_attempt.lease_expires_at > v_now then continue; end if;
      if v_attempt.retry_count >= 3 then
        update public.billing_renewal_attempts set state = 'reconciliation', lease_expires_at = null where id = v_attempt.id;
        update public.billing_mandates set status = 'paused', next_charge_at = null where id = v_m.id;
        continue;
      end if;
      update public.billing_renewal_attempts set state = 'processing', retry_count = retry_count + 1,
        lease_expires_at = v_now + interval '10 minutes' where id = v_attempt.id;
      return query select v_attempt.id, v_m.id, v_m.order_id::text, v_m.provider_reference,
        v_m.order_id::text, v_m.user_id::text, v_m.amount_vnd, v_m.interval,
        (v_m.order_created_at at time zone 'Asia/Ho_Chi_Minh')::date::text, v_m.provider_token, 'unknown'::text;
      continue;
    end if;
    if v_m.expires_at <= v_now then
      update public.billing_mandates set status = 'failed' where id = v_m.id;
      continue;
    end if;
    insert into public.billing_renewal_attempts (mandate_id, renewal_period, order_id, state, lease_expires_at)
      values (v_m.id, v_m.order_created_at, v_m.order_id, 'processing', v_now + interval '10 minutes') returning id into attempt_id;
    return query select attempt_id, v_m.id, v_m.order_id::text, v_m.provider_reference,
      v_m.order_id::text, v_m.user_id::text, v_m.amount_vnd, v_m.interval,
      (v_m.order_created_at at time zone 'Asia/Ho_Chi_Minh')::date::text, v_m.provider_token, 'ready'::text;
  end loop;
end; $$;
revoke execute on function public.billing_claim_vnpay_initial(uuid) from public, anon, authenticated;
grant execute on function public.billing_claim_vnpay_initial(uuid) to service_role;

create or replace function public.billing_mark_vnpay_renewal_unknown(p_attempt_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.billing_renewal_attempts
     set state = 'unknown', lease_expires_at = pg_catalog.now(), updated_at = pg_catalog.now()
   where id = p_attempt_id and state = 'processing';
$$;
revoke execute on function public.billing_mark_vnpay_renewal_unknown(uuid) from public, anon, authenticated;
grant execute on function public.billing_mark_vnpay_renewal_unknown(uuid) to service_role;


create or replace function public.billing_mark_vnpay_renewal_failed(p_attempt_id uuid, p_result_code integer)
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
  update public.billing_mandates set status = 'failed', next_charge_at = null, version = version + 1, updated_at = pg_catalog.now()
   where id = v_mandate_id returning user_id into v_user_id;
  update public.billing_subscriptions set renewal_mode = 'manual', version = version + 1, updated_at = pg_catalog.now()
   where user_id = v_user_id and mandate_id = v_mandate_id;
end;
$$;
revoke execute on function public.billing_mark_vnpay_renewal_failed(uuid, integer) from public, anon, authenticated;
grant execute on function public.billing_mark_vnpay_renewal_failed(uuid, integer) to service_role;

