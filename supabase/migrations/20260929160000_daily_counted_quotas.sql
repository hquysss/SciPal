-- Every counted quota (Tutor, graded exams, imported files, AI drafts) may run per Vietnam day or
-- per Vietnam month, as the admin sets it on /admin/plans (chủ dự án yêu cầu 29/09). The ledger
-- already takes the period from the kind; only this check kept daily to Tutor. Capacity limits
-- (classes, students per class, active exams) stay capacity.

alter table public.billing_plan_limits drop constraint billing_plan_limits_check;
alter table public.billing_plan_limits add constraint billing_plan_limits_check check (
  (metric in ('tutor_requests', 'graded_exam_attempts', 'import_files', 'author_ai_requests') and kind in ('daily', 'monthly'))
  or (metric in ('active_classes', 'students_per_class', 'active_authored_exams') and kind = 'capacity')
);
