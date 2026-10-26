-- Study reminders (spec docs/superpowers/specs/2026-10-26-study-reminders-design.md).
-- reminder_hour is the Vietnam hour (0-23) the learner wants a nudge; null means reminders are off.
-- Not in the client's column grants on profiles, so only the backend (service role) changes them.
-- Rollback: drop function public.claim_study_reminders(date, int, int); drop the four columns.
alter table public.profiles add column if not exists reminder_hour smallint check (reminder_hour between 0 and 23);
alter table public.profiles add column if not exists reminder_in_app bool not null default true;
alter table public.profiles add column if not exists reminder_email bool not null default false;
alter table public.profiles add column if not exists last_reminded_on date;

-- Claims, in one statement, the learners due a reminder at this hour: reminders on, a channel chosen, not
-- reminded today, and no study (XP or a streak freeze) on p_day. Setting last_reminded_on is the claim, so a
-- repeated or overlapping run never returns the same learner twice for the same day.
create or replace function public.claim_study_reminders(p_day date, p_hour int, p_limit int)
returns table (user_id uuid, in_app bool, email bool)
language sql
security definer
set search_path = ''
as $$
  update public.profiles as p
  set last_reminded_on = p_day
  where p.id in (
    select q.id from public.profiles as q
    where q.reminder_hour = p_hour
      and (q.reminder_in_app or q.reminder_email)
      and (q.last_reminded_on is null or q.last_reminded_on < p_day)
      and not exists (
        select 1 from public.study_days as s
        where s.user_id = q.id and s.day = p_day and (s.xp > 0 or s."freeze")
      )
    order by q.id
    limit greatest(p_limit, 0)
    for update skip locked
  )
  returning p.id, p.reminder_in_app, p.reminder_email;
$$;

revoke execute on function public.claim_study_reminders(date, int, int) from public, anon, authenticated;
grant execute on function public.claim_study_reminders(date, int, int) to service_role;
