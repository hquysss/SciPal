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
