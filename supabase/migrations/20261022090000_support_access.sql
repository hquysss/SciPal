-- Highland / hardship support (spec docs/superpowers/specs/2026-10-21-hardship-access-codes-design.md):
-- a student or teacher can send an application, an admin can approve it, and an admin can also hand out
-- codes that anyone can redeem. Both paths end in billing_grant_support_time, the only place that moves
-- billing_subscriptions.paid_through for a gift. Everything is written by the backend (service_role).
--
-- Codes are stored as a sha256 hash; the raw code is shown once to the admin who creates it.
-- Additive. Apply before the backend that calls these functions.
-- Rollback: drop the four tables and the four functions.

create table public.billing_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  code_hint text not null check (char_length(code_hint) = 4),
  plan_code text not null references public.billing_plans (code) on delete restrict
    check (plan_code in ('student_plus', 'teacher_pro')),
  months smallint not null check (months between 1 and 12),
  max_uses integer not null default 1 check (max_uses between 1 and 1000),
  expires_at timestamptz,
  note text check (char_length(note) <= 200),
  revoked_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.billing_code_redemptions (
  code_id uuid not null references public.billing_access_codes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  granted_from timestamptz not null,
  granted_through timestamptz not null,
  redeemed_at timestamptz not null default now(),
  primary key (code_id, user_id)
);

-- Wrong codes, counted per account to slow down guessing (5 an hour).
create table public.billing_code_failures (
  user_id uuid not null references auth.users (id) on delete cascade,
  failed_at timestamptz not null default now()
);
create index billing_code_failures_recent on public.billing_code_failures (user_id, failed_at desc);

create table public.support_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'teacher')),
  full_name text not null check (char_length(full_name) between 1 and 120),
  school text not null check (char_length(school) between 1 and 200),
  area text not null check (char_length(area) between 1 and 200),
  reason text not null check (char_length(reason) between 1 and 1000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decision_note text check (char_length(decision_note) <= 500),
  granted_months smallint check (granted_months between 1 and 12),
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index support_applications_one_pending on public.support_applications (user_id) where status = 'pending';
create index support_applications_by_status on public.support_applications (status, created_at desc);

alter table public.billing_access_codes enable row level security;
alter table public.billing_code_redemptions enable row level security;
alter table public.billing_code_failures enable row level security;
alter table public.support_applications enable row level security;
revoke all on public.billing_access_codes, public.billing_code_redemptions,
  public.billing_code_failures, public.support_applications from public, anon, authenticated;
grant select, insert, update, delete on public.billing_access_codes, public.billing_code_redemptions,
  public.billing_code_failures, public.support_applications to service_role;

-- The plan an account can hold, by its role: a student gets student_plus, a teacher teacher_pro.
-- An account without app_role is a student (sign-up sets none); admins and others cannot be granted.
create or replace function public.support_plan_for(p_user_id uuid)
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  v_role text;
begin
  select coalesce(u.raw_app_meta_data ->> 'app_role', 'student')
    into v_role
    from auth.users as u
   where u.id = p_user_id;
  if not found then
    return null;
  end if;
  return case v_role when 'student' then 'student_plus' when 'teacher' then 'teacher_pro' else null end;
end;
$$;

-- Adds p_months to the account's plan. Time already paid for is kept: the gift starts where the same
-- plan ends (like a payment does), otherwise now. Renewal settings are left alone.
create or replace function public.billing_grant_support_time(p_user_id uuid, p_plan_code text, p_months integer, p_now timestamptz)
returns table (granted_from timestamptz, granted_through timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_sub public.billing_subscriptions%rowtype;
  v_start timestamptz;
  v_through timestamptz;
begin
  if p_months is null or p_months < 1 or p_months > 12 then
    raise exception using errcode = '22023', message = 'INVALID_SUPPORT_MONTHS';
  end if;
  select s.* into v_sub from public.billing_subscriptions as s where s.user_id = p_user_id for update;
  if found and v_sub.plan_code = p_plan_code and v_sub.paid_through > p_now then
    v_start := v_sub.paid_through;
  else
    v_start := p_now;
  end if;
  v_through := ((v_start at time zone 'Asia/Ho_Chi_Minh') + pg_catalog.make_interval(months => p_months))
               at time zone 'Asia/Ho_Chi_Minh';
  insert into public.billing_subscriptions (user_id, plan_code, paid_through)
  values (p_user_id, p_plan_code, v_through)
  on conflict (user_id) do update
    set plan_code = excluded.plan_code,
        paid_through = excluded.paid_through,
        version = public.billing_subscriptions.version + 1,
        updated_at = p_now;
  return query select v_start, v_through;
end;
$$;

-- Redeems a code (already hashed by the backend). Never raises for a bad code: it answers 'invalid' and
-- records the miss, so the miss survives. Answers: ok | invalid | locked.
create or replace function public.billing_redeem_code(p_user_id uuid, p_code_hash text, p_now timestamptz)
returns table (result_status text, result_plan text, result_through timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_code public.billing_access_codes%rowtype;
  v_from timestamptz;
  v_through timestamptz;
begin
  v_plan := public.support_plan_for(p_user_id);
  if v_plan is null then
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;

  if (select count(*) from public.billing_code_failures as f
       where f.user_id = p_user_id and f.failed_at > p_now - interval '1 hour') >= 5 then
    return query select 'locked'::text, null::text, null::timestamptz;
    return;
  end if;

  select c.* into v_code from public.billing_access_codes as c where c.code_hash = p_code_hash for update;
  if not found
     or v_code.revoked_at is not null
     or (v_code.expires_at is not null and v_code.expires_at <= p_now)
     or v_code.plan_code <> v_plan
     or exists (select 1 from public.billing_code_redemptions as r where r.code_id = v_code.id and r.user_id = p_user_id)
     or (select count(*) from public.billing_code_redemptions as r where r.code_id = v_code.id) >= v_code.max_uses then
    insert into public.billing_code_failures (user_id, failed_at) values (p_user_id, p_now);
    return query select 'invalid'::text, null::text, null::timestamptz;
    return;
  end if;

  select g.granted_from, g.granted_through into v_from, v_through
    from public.billing_grant_support_time(p_user_id, v_code.plan_code, v_code.months, p_now) as g;
  insert into public.billing_code_redemptions (code_id, user_id, granted_from, granted_through, redeemed_at)
  values (v_code.id, p_user_id, v_from, v_through, p_now);
  return query select 'ok'::text, v_code.plan_code, v_through;
end;
$$;

-- Sends an application. Answers: ok | pending_exists | too_many | unsupported.
create or replace function public.support_submit_application(
  p_user_id uuid, p_full_name text, p_school text, p_area text, p_reason text, p_now timestamptz
)
returns table (result_status text, result_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_plan text;
  v_role text;
  v_id uuid;
begin
  v_plan := public.support_plan_for(p_user_id);
  if v_plan is null then
    return query select 'unsupported'::text, null::uuid;
    return;
  end if;
  v_role := case v_plan when 'student_plus' then 'student' else 'teacher' end;

  if exists (select 1 from public.support_applications as a where a.user_id = p_user_id and a.status = 'pending') then
    return query select 'pending_exists'::text, null::uuid;
    return;
  end if;
  if (select count(*) from public.support_applications as a
       where a.user_id = p_user_id and a.created_at > p_now - interval '30 days') >= 3 then
    return query select 'too_many'::text, null::uuid;
    return;
  end if;

  begin
    insert into public.support_applications (user_id, role, full_name, school, area, reason, created_at)
    values (p_user_id, v_role, p_full_name, p_school, p_area, p_reason, p_now)
    returning id into v_id;
  exception when unique_violation then
    return query select 'pending_exists'::text, null::uuid;
    return;
  end;
  return query select 'ok'::text, v_id;
end;
$$;

-- An admin's decision, once per application. Approving grants the account's plan for p_months.
-- Answers: approved | rejected | not_found | already_decided | unsupported.
create or replace function public.support_decide_application(
  p_id uuid, p_admin uuid, p_approve boolean, p_months integer, p_note text, p_now timestamptz
)
returns table (result_status text, result_plan text, result_through timestamptz)
language plpgsql
set search_path = ''
as $$
declare
  v_app public.support_applications%rowtype;
  v_plan text;
  v_through timestamptz;
begin
  select a.* into v_app from public.support_applications as a where a.id = p_id for update;
  if not found then
    return query select 'not_found'::text, null::text, null::timestamptz;
    return;
  end if;
  if v_app.status <> 'pending' then
    return query select 'already_decided'::text, null::text, null::timestamptz;
    return;
  end if;

  if p_approve then
    v_plan := public.support_plan_for(v_app.user_id);
    if v_plan is null then
      return query select 'unsupported'::text, null::text, null::timestamptz;
      return;
    end if;
    select g.granted_through into v_through
      from public.billing_grant_support_time(v_app.user_id, v_plan, p_months, p_now) as g;
    update public.support_applications
       set status = 'approved', granted_months = p_months, decision_note = p_note, decided_by = p_admin, decided_at = p_now
     where id = p_id;
    return query select 'approved'::text, v_plan, v_through;
  else
    update public.support_applications
       set status = 'rejected', decision_note = p_note, decided_by = p_admin, decided_at = p_now
     where id = p_id;
    return query select 'rejected'::text, null::text, null::timestamptz;
  end if;
end;
$$;

revoke execute on function public.support_plan_for(uuid) from public, anon, authenticated;
revoke execute on function public.billing_grant_support_time(uuid, text, integer, timestamptz) from public, anon, authenticated;
revoke execute on function public.billing_redeem_code(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.support_submit_application(uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.support_decide_application(uuid, uuid, boolean, integer, text, timestamptz) from public, anon, authenticated;
grant execute on function public.support_plan_for(uuid) to service_role;
grant execute on function public.billing_grant_support_time(uuid, text, integer, timestamptz) to service_role;
grant execute on function public.billing_redeem_code(uuid, text, timestamptz) to service_role;
grant execute on function public.support_submit_application(uuid, text, text, text, text, timestamptz) to service_role;
grant execute on function public.support_decide_application(uuid, uuid, boolean, integer, text, timestamptz) to service_role;
