-- Minutes of spoken tutoring (POST /api/tutor/voice) as a counted quota of each plan, per Vietnam
-- day or month like the other counted quotas; admins change it on /admin/plans and per account.
-- A session takes the minutes the student picks (3, 5 or 10, fewer if fewer are left) when it
-- starts: the browser talks to Gemini directly, so the backend cannot see when it really ends.
--
-- APPLY AFTER the backend that knows 'voice_minutes' is deployed: an older backend reads the quota
-- rows with a closed list of metrics and would fail on the new rows (Tutor, exams and imports
-- would all report "billing unavailable").

do $$
declare
  metrics text := $m$'tutor_requests', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'import_files', 'active_authored_exams', 'author_ai_requests', 'voice_minutes'$m$;
  t text;
begin
  foreach t in array array['billing_plan_limits', 'account_quota_overrides', 'quota_usage', 'quota_operations'] loop
    execute format('alter table public.%I drop constraint %I', t, t || '_metric_check');
    execute format('alter table public.%I add constraint %I check (metric in (%s))', t, t || '_metric_check', metrics);
  end loop;
end $$;

alter table public.billing_plan_limits drop constraint billing_plan_limits_check;
alter table public.billing_plan_limits add constraint billing_plan_limits_check check (
  (metric in ('tutor_requests', 'graded_exam_attempts', 'import_files', 'author_ai_requests', 'voice_minutes') and kind in ('daily', 'monthly'))
  or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
);

-- Starting minutes; admins change them on /admin/plans.
insert into public.billing_plan_limits (plan_code, metric, kind, limit_value)
values
  ('student_free', 'voice_minutes', 'monthly', 10),
  ('student_plus', 'voice_minutes', 'monthly', 300),
  ('teacher_free', 'voice_minutes', 'monthly', 10),
  ('teacher_pro', 'voice_minutes', 'monthly', 120)
on conflict (plan_code, metric) do nothing;
