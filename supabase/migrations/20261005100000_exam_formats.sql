-- Exam formats (THPTQG and ĐGNL ĐHQG-HCM): an exam can carry a section layout, and an attempt
-- records a score out of that format's scale with a per-section breakdown.
--
-- 1. exam_blueprints.format: 'generic' for every exam that exists today (flat question list, 0-10
--    score); 'thptqg' and 'dgnl_hcm' use layout (sections of questions, optionally grouped under a
--    passage). layout is validated by the API (backend/src/schemas/examFormat.ts); question_ids stays
--    the flattened layout so the existing question release and lookups keep working.
-- 2. exam_attempts.score widens from numeric(4, 2) (tops out at 99.99) to numeric(7, 2) so a
--    1200-point ĐGNL score fits. Widening keeps the status/score check intact and rewrites nothing.
--    max_score is the scale the score is out of (10, or 1200); section_scores is the per-section
--    breakdown. Both are null for attempts made before this migration.

alter table public.exam_blueprints
  add column if not exists format text not null default 'generic',
  add column if not exists layout jsonb;

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_format_check,
  add constraint exam_blueprints_format_check check (format in ('generic', 'thptqg', 'dgnl_hcm'));

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_layout_check,
  add constraint exam_blueprints_layout_check
    check (layout is null or jsonb_typeof(layout) = 'array');

alter table public.exam_attempts
  alter column score type numeric(7, 2),
  add column if not exists max_score numeric(7, 2),
  add column if not exists section_scores jsonb;
