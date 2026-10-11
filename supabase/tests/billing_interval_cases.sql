-- Called by billing.sql in a disposable database, never against a live project.
-- 3-month and 6-month plans: grant length, one-time only, admin on/off.
reset role;
insert into auth.users(id, raw_app_meta_data) values
  ('00000000-0000-4000-8000-000000000031', '{}'),
  ('00000000-0000-4000-8000-000000000032', '{}');
set role service_role;
do $$
declare
  v_quarter_user uuid := '00000000-0000-4000-8000-000000000031';
  v_half_user uuid := '00000000-0000-4000-8000-000000000032';
  v_price uuid; v_order record; v_result text; v_paid timestamptz; v_paid_at timestamptz := now();
  v_version integer; v_failed boolean := false;
begin
  if public.billing_interval_months('month') <> 1 or public.billing_interval_months('quarter') <> 3
     or public.billing_interval_months('half_year') <> 6 or public.billing_interval_months('year') <> 12 then
    raise exception 'billing_interval_months is wrong';
  end if;

  select id into v_price from public.billing_prices where plan_code = 'student_plus' and interval = 'quarter' and active;
  if v_price is null then raise exception 'No active 3-month price'; end if;
  select * into v_order from public.billing_create_order(v_quarter_user, v_price, 'interval-quarter', repeat('c', 64), now() + interval '30 minutes');
  if v_order.billing_interval <> 'quarter' then raise exception 'Order kept the wrong interval: %', v_order.billing_interval; end if;
  insert into public.billing_payment_attempts(order_id, provider, provider_reference, amount_vnd)
  values (v_order.order_id, 'payos', '910031', v_order.amount_vnd);
  v_result := public.billing_apply_payment('payos', '910031', 'bank-q', v_order.amount_vnd, 'paid', v_paid_at, 'interval-quarter-event', 'webhook');
  if v_result <> 'applied' then raise exception '3-month payment not applied: %', v_result; end if;
  select paid_through into v_paid from public.billing_subscriptions where user_id = v_quarter_user;
  if v_paid <> v_paid_at + interval '3 months' then raise exception '3-month grant ended at % not +3 months of %', v_paid, v_paid_at; end if;

  select id into v_price from public.billing_prices where plan_code = 'student_plus' and interval = 'half_year' and active;
  select * into v_order from public.billing_create_order(v_half_user, v_price, 'interval-half', repeat('d', 64), now() + interval '30 minutes');
  insert into public.billing_payment_attempts(order_id, provider, provider_reference, amount_vnd)
  values (v_order.order_id, 'payos', '910032', v_order.amount_vnd);
  v_result := public.billing_apply_payment('payos', '910032', 'bank-h', v_order.amount_vnd, 'paid', v_paid_at, 'interval-half-event', 'webhook');
  select paid_through into v_paid from public.billing_subscriptions where user_id = v_half_user;
  if v_result <> 'applied' or v_paid <> v_paid_at + interval '6 months' then raise exception '6-month grant is wrong: % %', v_result, v_paid; end if;

  -- Admin: take 3 months off sale, change 6 months; month and year can never be removed.
  select version into v_version from public.billing_plans where code = 'student_plus';
  v_version := public.billing_update_plan(null, 'student_plus', v_version, 'test', null, null, '{"quarter":null,"half_year":210000}'::jsonb, null);
  if exists (select 1 from public.billing_prices where plan_code = 'student_plus' and interval = 'quarter' and active) then raise exception '3-month price still on sale'; end if;
  if (select amount_vnd from public.billing_prices where plan_code = 'student_plus' and interval = 'half_year' and active) <> 210000 then raise exception '6-month price not updated'; end if;
  begin
    perform public.billing_update_plan(null, 'student_plus', v_version, 'test', null, null, '{"year":null}'::jsonb, null);
  exception when sqlstate '22023' then v_failed := true; end;
  if not v_failed then raise exception 'Yearly price was removed'; end if;
  v_failed := false;
  begin
    perform public.billing_update_plan(null, 'student_plus', v_version, 'test', null, null, '{"decade":5000}'::jsonb, null);
  exception when sqlstate '22023' then v_failed := true; end;
  if not v_failed then raise exception 'Unknown interval accepted'; end if;
  -- Sold orders keep their interval and price.
  if (select count(*) from public.billing_orders where interval in ('quarter', 'half_year')) <> 2 then raise exception 'Sold orders changed'; end if;
end; $$;
reset role;
