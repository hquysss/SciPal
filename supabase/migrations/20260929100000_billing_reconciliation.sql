-- Preserve provider facts for reconciliation and expose a backend-only paged incident list.
alter table public.billing_events add column if not exists amount_vnd integer;
alter table public.billing_events add column if not exists paid_at timestamptz;

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
  if p_provider not in ('payos', 'vnpay') or p_outcome not in ('paid', 'failed', 'cancelled', 'expired')
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

  -- Reconciliation can only be cleared by a fresh provider query for the same transaction.
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

create index if not exists billing_events_reconciliation_page_idx
  on public.billing_events (received_at desc, id desc)
  where provider = 'payos' and verification_state = 'reconciliation';
create index if not exists billing_attempts_reconciliation_page_idx
  on public.billing_payment_attempts (updated_at desc, id desc)
  where provider = 'payos' and status = 'reconciliation';

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
    where e.provider = 'payos' and e.verification_state = 'reconciliation'

    union all

    select
      a.id as incident_id,
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
    where a.provider = 'payos' and a.status = 'reconciliation'
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
