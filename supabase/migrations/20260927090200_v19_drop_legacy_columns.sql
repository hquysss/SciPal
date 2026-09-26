-- supabase/migrations/20260927090200_v19_drop_legacy_columns.sql
-- Runs after application code reads lessons.status and subject_grade_catalog only.
drop index if exists public.lessons_pending_review_idx;
drop index if exists public.lessons_author_review_idx;
drop index if exists public.subjects_education_level_sort_order_idx;

alter table public.lessons drop column published, drop column review_status;
alter table public.subjects drop column status, drop column education_level;

create index lessons_author_status_idx on public.lessons (created_by, status, updated_at desc);
