-- Code submits and trial runs a person may start per Vietnam day become counted quotas of each plan
-- (`code_submits`, `code_runs`), like the Professor's tokens: admins change them on /admin/plans and per
-- account, and the learner sees what is left under the code window.
--
-- The whole-site daily caps stay in judge_settings (/admin/judge); the per-person caps move here, so
-- judge_settings loses its two person columns.
--
-- APPLY AFTER the backend that knows 'code_submits' and 'code_runs' is deployed: an older backend reads
-- the quota rows with a closed list of metrics and would fail on the new rows (the Professor, exams and
-- imports would all report "billing unavailable"). Between the deploy and this migration the new backend
-- finds no code quota and answers "billing unavailable" for code submits and trial runs only.
--
-- To go back: delete the rows of these two metrics from billing_plan_limits and account_quota_overrides,
-- and redeploy the earlier backend.

-- 1. The new metrics are allowed everywhere metrics are listed.
do $$
declare
  metrics text := $m$'tutor_requests', 'tutor_tokens', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'import_files', 'active_authored_exams', 'author_ai_requests', 'voice_minutes', 'code_submits', 'code_runs'$m$;
  t text;
begin
  foreach t in array array['billing_plan_limits', 'account_quota_overrides', 'quota_usage', 'quota_operations'] loop
    execute format('alter table public.%I drop constraint %I', t, t || '_metric_check');
    execute format('alter table public.%I add constraint %I check (metric in (%s))', t, t || '_metric_check', metrics);
  end loop;
end $$;

-- Per day only: the learner's bar and every message say "today".
alter table public.billing_plan_limits drop constraint billing_plan_limits_check;
alter table public.billing_plan_limits add constraint billing_plan_limits_check check (
  (metric in ('tutor_requests', 'tutor_tokens', 'graded_exam_attempts', 'import_files', 'author_ai_requests', 'voice_minutes') and kind in ('daily', 'monthly'))
  or (metric in ('code_submits', 'code_runs') and kind = 'daily')
  or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
);

-- 2. Starting limits; admins change them on /admin/plans.
insert into public.billing_plan_limits (plan_code, metric, kind, limit_value)
values
  ('student_free', 'code_submits', 'daily', 20),
  ('student_free', 'code_runs', 'daily', 50),
  ('student_plus', 'code_submits', 'daily', 100),
  ('student_plus', 'code_runs', 'daily', 300),
  ('teacher_free', 'code_submits', 'daily', 20),
  ('teacher_free', 'code_runs', 'daily', 50),
  ('teacher_pro', 'code_submits', 'daily', 100),
  ('teacher_pro', 'code_runs', 'daily', 300)
on conflict (plan_code, metric) do nothing;

-- 3. The per-person caps now live in the plans.
alter table public.judge_settings
  drop column if exists person_submits_per_day,
  drop column if exists person_runs_per_day;
