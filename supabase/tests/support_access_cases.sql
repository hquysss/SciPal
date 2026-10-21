-- Highland / hardship support (migration 20261022090000_support_access.sql): applications, an admin's
-- decision, and redeemable codes. Runs after free_access_cases.sql.

reset role;
\ir ../migrations/20261022090000_support_access.sql

set role service_role;
do $$
declare
  c_student constant uuid := '00000000-0000-4000-8000-000000000006';
  c_student_b constant uuid := '00000000-0000-4000-8000-000000000002';
  c_noroleuser constant uuid := '00000000-0000-4000-8000-000000000004';
  c_locked constant uuid := '00000000-0000-4000-8000-000000000001';
  c_teacher constant uuid := '00000000-0000-4000-8000-000000000003';
  c_admin constant uuid := '00000000-0000-4000-8000-000000000005';
  v_app uuid;
  v_status text;
  v_plan text;
  v_through timestamptz;
  v_before timestamptz;
  v_expected timestamptz;
  v_i integer;
begin
  delete from public.billing_subscriptions where user_id in (c_student, c_student_b, c_noroleuser, c_locked, c_teacher);

  -- Applications: one pending at a time, an admin cannot apply, a student gets student_plus.
  select s.result_status, s.result_id into v_status, v_app
    from public.support_submit_application(c_student, 'Nguyen Van A', 'THCS Ban Ho', 'Ban Ho, Sa Pa, Lao Cai', 'Song yeu, hoc qua dien thoai cua bo me', now()) as s;
  if v_status <> 'ok' or v_app is null then raise exception 'A student application was refused: %', v_status; end if;
  if (select s.result_status from public.support_submit_application(c_student, 'A', 'B', 'C', 'D', now()) as s) <> 'pending_exists' then
    raise exception 'A second pending application was accepted';
  end if;
  if (select s.result_status from public.support_submit_application(c_admin, 'A', 'B', 'C', 'D', now()) as s) <> 'unsupported' then
    raise exception 'An admin could apply';
  end if;
  if (select a.role from public.support_applications as a where a.id = v_app) <> 'student' then raise exception 'Application role not taken from the account'; end if;

  select d.result_status, d.result_plan, d.result_through into v_status, v_plan, v_through
    from public.support_decide_application(v_app, c_admin, true, 3, 'Duyet', now()) as d;
  if v_status <> 'approved' or v_plan <> 'student_plus' then raise exception 'Approval failed: % %', v_status, v_plan; end if;
  if v_through < now() + interval '89 days' or v_through > now() + interval '93 days' then raise exception 'Approval granted the wrong span: %', v_through; end if;
  if (select s.paid_through from public.billing_subscriptions as s where s.user_id = c_student and s.plan_code = 'student_plus') is distinct from v_through then
    raise exception 'The subscription did not take the granted date';
  end if;
  if (select d.result_status from public.support_decide_application(v_app, c_admin, false, null, 'x', now()) as d) <> 'already_decided' then
    raise exception 'An application was decided twice';
  end if;
  if (select count(*) from public.billing_subscriptions as s where s.user_id = c_student) <> 1 then raise exception 'Duplicate subscriptions'; end if;
  if (select d.result_status from public.support_decide_application(gen_random_uuid(), c_admin, true, 3, null, now()) as d) <> 'not_found' then
    raise exception 'An unknown application was found';
  end if;

  -- A rejection grants nothing; three applications in 30 days is the most.
  for v_i in 1..3 loop
    select s.result_id into v_app from public.support_submit_application(c_noroleuser, 'B', 'S', 'A', 'R', now()) as s;
    if v_app is null then raise exception 'Application % was refused', v_i; end if;
    if (select d.result_status from public.support_decide_application(v_app, c_admin, false, null, 'Chua du thong tin', now()) as d) <> 'rejected' then
      raise exception 'Rejection failed';
    end if;
  end loop;
  if exists (select 1 from public.billing_subscriptions as s where s.user_id = c_noroleuser) then raise exception 'A rejection granted a plan'; end if;
  if (select s.result_status from public.support_submit_application(c_noroleuser, 'B', 'S', 'A', 'R', now()) as s) <> 'too_many' then
    raise exception 'A fourth application in 30 days was accepted';
  end if;

  -- Codes: a gift extends what is already there, and is used once.
  insert into public.billing_access_codes (code_hash, code_hint, plan_code, months, max_uses, created_by)
    values (repeat('a', 64), 'AAAA', 'student_plus', 2, 1, c_admin);
  select s.paid_through into v_before from public.billing_subscriptions as s where s.user_id = c_student;
  v_expected := ((v_before at time zone 'Asia/Ho_Chi_Minh') + interval '2 months') at time zone 'Asia/Ho_Chi_Minh';
  select r.result_status, r.result_through into v_status, v_through from public.billing_redeem_code(c_student, repeat('a', 64), now()) as r;
  if v_status <> 'ok' or v_through <> v_expected then raise exception 'A code did not extend the paid time: % % (expected %)', v_status, v_through, v_expected; end if;
  if (select r.result_status from public.billing_redeem_code(c_student, repeat('a', 64), now()) as r) <> 'invalid' then raise exception 'A code was used twice by one account'; end if;
  if (select r.result_status from public.billing_redeem_code(c_student_b, repeat('a', 64), now()) as r) <> 'invalid' then raise exception 'A single-use code was used twice'; end if;

  -- Several uses, and one account only once.
  insert into public.billing_access_codes (code_hash, code_hint, plan_code, months, max_uses)
    values (repeat('b', 64), 'BBBB', 'student_plus', 1, 2);
  if (select r.result_status from public.billing_redeem_code(c_student_b, repeat('b', 64), now()) as r) <> 'ok' then raise exception 'First use refused'; end if;
  if (select r.result_status from public.billing_redeem_code(c_noroleuser, repeat('b', 64), now()) as r) <> 'ok' then raise exception 'Second use refused'; end if;
  if (select r.result_status from public.billing_redeem_code(c_locked, repeat('b', 64), now()) as r) <> 'invalid' then raise exception 'A third use was allowed'; end if;
  if (select count(*) from public.billing_code_redemptions as r join public.billing_access_codes as c on c.id = r.code_id where c.code_hash = repeat('b', 64)) <> 2 then
    raise exception 'Redemptions miscounted';
  end if;

  -- The code must match the account's role; an admin cannot redeem.
  insert into public.billing_access_codes (code_hash, code_hint, plan_code, months, max_uses)
    values (repeat('c', 64), 'CCCC', 'teacher_pro', 3, 5);
  if (select r.result_status from public.billing_redeem_code(c_student_b, repeat('c', 64), now()) as r) <> 'invalid' then raise exception 'A student redeemed a teacher code'; end if;
  if (select r.result_status from public.billing_redeem_code(c_admin, repeat('c', 64), now()) as r) <> 'invalid' then raise exception 'An admin redeemed a code'; end if;
  select r.result_status, r.result_plan into v_status, v_plan from public.billing_redeem_code(c_teacher, repeat('c', 64), now()) as r;
  if v_status <> 'ok' or v_plan <> 'teacher_pro' then raise exception 'A teacher could not redeem a teacher code: % %', v_status, v_plan; end if;
  if (select s.plan_code from public.billing_subscriptions as s where s.user_id = c_teacher) <> 'teacher_pro' then raise exception 'The teacher plan was not recorded'; end if;

  -- Revoked, expired and unknown codes are all just invalid; five misses an hour lock the account.
  insert into public.billing_access_codes (code_hash, code_hint, plan_code, months, max_uses, revoked_at)
    values (repeat('d', 64), 'DDDD', 'student_plus', 1, 5, now());
  insert into public.billing_access_codes (code_hash, code_hint, plan_code, months, max_uses, expires_at)
    values (repeat('e', 64), 'EEEE', 'student_plus', 1, 5, now() - interval '1 day');
  -- (the earlier refused third use of code b already counted as the first miss)
  for v_i in 1..4 loop
    v_status := (select r.result_status from public.billing_redeem_code(c_locked, case v_i when 1 then repeat('d', 64) when 2 then repeat('e', 64) else repeat('f', 64) end, now()) as r);
    if v_status <> 'invalid' then raise exception 'Miss % answered %', v_i, v_status; end if;
  end loop;
  if (select r.result_status from public.billing_redeem_code(c_locked, repeat('b', 64), now()) as r) <> 'locked' then raise exception 'Five misses did not lock the account'; end if;
  if (select r.result_status from public.billing_redeem_code(c_locked, repeat('b', 64), now() + interval '2 hours') as r) = 'locked' then raise exception 'The lock did not lift after an hour'; end if;
end;
$$;

-- Not callable by a signed-in browser session.
set role authenticated;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform public.billing_redeem_code('00000000-0000-4000-8000-000000000006', repeat('a', 64), now());
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user called billing_redeem_code directly'; end if;
  v_denied := false;
  begin
    perform public.billing_grant_support_time('00000000-0000-4000-8000-000000000006', 'student_plus', 12, now());
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user granted themselves time'; end if;
  v_denied := false;
  begin
    perform 1 from public.support_applications;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then raise exception 'A signed-in user read applications directly'; end if;
end;
$$;
reset role;
