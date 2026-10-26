-- Study reminders (migration 20261026110000_study_reminders.sql): a learner is claimed once a day, only at their
-- hour, only with a channel on, and never after studying or using a freeze. Runs after social_cases.sql.

reset role;
\ir ../migrations/20261026110000_study_reminders.sql
grant select, update on public.profiles to service_role;
grant select on public.study_days to service_role;

update public.profiles set reminder_hour = 20, reminder_in_app = true, reminder_email = false where id = '00000000-0000-4000-8000-000000000001'; -- An: due
update public.profiles set reminder_hour = 20, reminder_in_app = false, reminder_email = true where id = '00000000-0000-4000-8000-000000000002'; -- Bình: studied today
update public.profiles set reminder_hour = 20, reminder_in_app = true where id = '00000000-0000-4000-8000-000000000006';                          -- Chi: froze today
update public.profiles set reminder_hour = 9, reminder_in_app = true where id = '00000000-0000-4000-8000-000000000003';                           -- Cô Dung: another hour
insert into public.study_days (user_id, day, xp, "freeze") values
  ('00000000-0000-4000-8000-000000000002', '2026-11-02', 30, false),
  ('00000000-0000-4000-8000-000000000006', '2026-11-02', 0, true)
on conflict (user_id, day) do update set xp = excluded.xp, "freeze" = excluded."freeze";

set role service_role;
do $$
declare
  v_ids uuid[];
  v_in_app bool;
begin
  select array_agg(user_id), bool_and(in_app) into v_ids, v_in_app from public.claim_study_reminders('2026-11-02', 20, 100);
  if v_ids is distinct from array['00000000-0000-4000-8000-000000000001'::uuid] then
    raise exception 'Expected only An to be claimed at 20h, got %', v_ids;
  end if;
  if not v_in_app then raise exception 'The claim lost the in-app channel'; end if;
  if exists (select 1 from public.claim_study_reminders('2026-11-02', 20, 100)) then
    raise exception 'A second run claimed the same learner again';
  end if;
  if not exists (select 1 from public.claim_study_reminders('2026-11-03', 20, 100) where user_id = '00000000-0000-4000-8000-000000000001') then
    raise exception 'The next day did not claim An again';
  end if;
  if not exists (select 1 from public.claim_study_reminders('2026-11-02', 9, 100) where user_id = '00000000-0000-4000-8000-000000000003') then
    raise exception 'Another hour did not claim its learner';
  end if;
end;
$$;
reset role;

-- Learners cannot call the claim or write the reminder columns.
set role authenticated;
do $$
begin
  begin
    perform public.claim_study_reminders('2026-11-02', 20, 1);
    raise exception 'A learner could claim reminders';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set reminder_hour = 3 where id = '00000000-0000-4000-8000-000000000001';
    raise exception 'A learner could write reminder_hour';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
