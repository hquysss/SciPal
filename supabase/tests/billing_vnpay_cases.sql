-- Called by billing.sql in a disposable database, never against a live project.
reset role;
insert into auth.users(id, raw_app_meta_data) values ('00000000-0000-4000-8000-000000000021', '{}');
set role service_role;
do $$
declare v_user uuid := '00000000-0000-4000-8000-000000000021'; v_price uuid; v_order record; v_mandate uuid;
  v_claim record; v_result text; v_paid timestamptz; v_other record; v_blocked boolean := false;
begin
 select id into v_price from public.billing_prices where plan_code = 'student_plus' and interval = 'month' and active;
 select * into v_order from public.billing_create_order(v_user, v_price, 'vnpay-sql-initial', repeat('a',64), now()+interval '30 minutes');
 v_mandate := public.billing_prepare_vnpay_mandate(v_user, v_order.order_id, 'vnpay-subscription-v1');
 insert into public.billing_payment_attempts(order_id,provider,provider_reference,amount_vnd)
 values(v_order.order_id,'vnpay','i'||replace(v_order.order_id::text,'-',''),v_order.amount_vnd);
 update public.billing_mandates set provider_checkout='{"recurringId":"registration123","dataKey":"fixture","payUrl":"https://sandbox.vnpayment.vn/recurring-payment/pay","tmnCode":"SCIPAL01"}' where id=v_mandate;
 if public.billing_store_vnpay_authorization(v_order.order_id, '00000000-0000-4000-8000-000000000002', 'fixture-token') then raise exception 'Foreign user authorization accepted'; end if;
 if not public.billing_store_vnpay_authorization(v_order.order_id, v_user, 'fixture-token') then raise exception 'Authorization rejected'; end if;
 if exists(select 1 from public.billing_grants where order_id=v_order.order_id) then raise exception 'Authorization granted paid access'; end if;
 select * into v_claim from public.billing_claim_vnpay_initial(v_order.order_id);
 if v_claim.state <> 'ready' then raise exception 'Initial charge not claimed'; end if;
 if exists(select 1 from public.billing_claim_vnpay_initial(v_order.order_id)) then raise exception 'Initial charge claimed twice'; end if;
 if exists(select 1 from public.billing_claim_momo_renewals(20) where mandate_id=v_mandate) then raise exception 'MoMo claimed VNPAY'; end if;
 v_result := public.billing_apply_vnpay_payment('i'||replace(v_order.order_id::text,'-',''),'txn-initial',v_order.amount_vnd,'paid',now(),'vnpay-sql-initial-event','renewal');
 if v_result <> 'applied' then raise exception 'Initial payment not applied: %',v_result; end if;
 if not exists(select 1 from public.billing_subscriptions where user_id=v_user and mandate_id=v_mandate and renewal_mode='auto') then raise exception 'VNPAY authorization not activated'; end if;
 v_result := public.billing_apply_vnpay_payment('i'||replace(v_order.order_id::text,'-',''),'txn-initial',v_order.amount_vnd,'paid',now(),'vnpay-sql-repeat-event','renewal');
 if v_result <> 'duplicate' or (select count(*) from public.billing_grants where order_id=v_order.order_id) <> 1 then raise exception 'Duplicate payment granted twice'; end if;
 select paid_through into v_paid from public.billing_subscriptions where user_id=v_user;
 select * into v_other from public.billing_create_order(v_user,v_price,'vnpay-sql-second',repeat('b',64),now()+interval '30 minutes');
 begin perform public.billing_prepare_momo_mandate(v_user,v_other.order_id,'momo-test'); exception when sqlstate 'P0001' then v_blocked := true; end;
 if not v_blocked then raise exception 'Second provider authorization accepted'; end if;
 perform public.billing_begin_vnpay_cancellation(v_user);
 if exists(select 1 from public.billing_claim_vnpay_renewals(20) where mandate_id=v_mandate) then raise exception 'Cancelled mandate claimed'; end if;
 if (select paid_through from public.billing_subscriptions where user_id=v_user) <> v_paid then raise exception 'Cancellation removed paid access'; end if;
 if not public.billing_confirm_vnpay_cancellation(v_mandate,'cancelled') then raise exception 'Cancellation not confirmed'; end if;
 if has_table_privilege('anon','public.billing_mandates','SELECT') or has_function_privilege('authenticated','public.billing_store_vnpay_authorization(uuid,uuid,text)','EXECUTE') then raise exception 'VNPAY secrets exposed'; end if;
end; $$;
reset role;
