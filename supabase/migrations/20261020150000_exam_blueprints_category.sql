-- Display group of an exam in the exam room: gifted-student training ('hsg') gets its own list.
-- Separate from `format`, which decides sections and scoring; an hsg exam is still `generic`.
alter table public.exam_blueprints
  add column if not exists category text not null default 'standard'
  check (category in ('standard', 'hsg'));
