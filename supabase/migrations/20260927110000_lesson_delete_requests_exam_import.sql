-- Lesson deletion requests and exams imported from Excel.
--
-- 1. A teacher cannot delete a lesson that students may have seen (published, or waiting for
--    review); they ask an admin instead. The request lives on the lesson row until an admin
--    deletes the lesson or declines, or the teacher withdraws it.
-- 2. An imported exam lists its exact questions (in order) and its duration. Exams without
--    question_ids keep drawing from their subject's question pool.

alter table public.lessons
  add column if not exists delete_requested_at timestamptz,
  add column if not exists delete_requested_by uuid references public.profiles(id) on delete set null,
  add column if not exists delete_request_note text;

alter table public.lessons
  drop constraint if exists lessons_delete_request_note_length,
  add constraint lessons_delete_request_note_length
    check (delete_request_note is null or char_length(delete_request_note) <= 1000);

create index if not exists lessons_delete_requested_idx
  on public.lessons (delete_requested_at)
  where delete_requested_at is not null;

alter table public.exam_blueprints
  add column if not exists name_en text,
  add column if not exists question_ids uuid[],
  add column if not exists duration_minutes int;

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_duration_range,
  add constraint exam_blueprints_duration_range
    check (duration_minutes is null or duration_minutes between 5 and 300);

-- 3. Teachers import exams too, reviewed like lessons. Every import is one batch (import_id):
--    an admin publishes or rejects the batch's questions and exams together. Existing rows and
--    admin imports are published; learners and the question pool only see published rows.
alter table public.exam_blueprints
  add column if not exists status text not null default 'published',
  add column if not exists import_id uuid,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.questions
  add column if not exists status text not null default 'published',
  add column if not exists import_id uuid,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_status_check,
  add constraint exam_blueprints_status_check check (status in ('published', 'pending_review'));

alter table public.questions
  drop constraint if exists questions_status_check,
  add constraint questions_status_check check (status in ('published', 'pending_review'));

create index if not exists exam_blueprints_import_idx on public.exam_blueprints (import_id) where import_id is not null;
create index if not exists questions_import_idx on public.questions (import_id) where import_id is not null;
create index if not exists questions_subject_status_idx on public.questions (subject_id, status, id);
