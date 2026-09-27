-- Exams built in the app (authoring Part 4).
--
-- 1. An exam starts as a draft; an admin can send it back with a note.
-- 2. updated_at lets the builder refuse a save made from a stale copy.
-- 3. An exam's own unpublished questions follow the exam through review, in the same statement
--    as the exam's status change (as lessons do with their practice questions). Imported exams
--    (import_id) keep their own batch review and are not touched here.

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_status_check,
  add constraint exam_blueprints_status_check check (status in ('draft', 'pending_review', 'published'));

alter table public.exam_blueprints
  add column if not exists review_note text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_review_note_length,
  add constraint exam_blueprints_review_note_length
    check (review_note is null or char_length(review_note) <= 1000);

create index if not exists exam_blueprints_created_by_idx
  on public.exam_blueprints (created_by, status)
  where created_by is not null;

create or replace function public.touch_exam_blueprint()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.clock_timestamp();
  return new;
end;
$$;

revoke execute on function public.touch_exam_blueprint() from public, anon, authenticated;

drop trigger if exists exam_blueprints_touch on public.exam_blueprints;
create trigger exam_blueprints_touch
  before update on public.exam_blueprints
  for each row
  execute function public.touch_exam_blueprint();

-- Exam status → its listed exam questions owned by the exam's author:
--   published (approved, or created published by an admin)   draft/pending → published
--   pending_review (submitted)                               draft         → pending_review
--   sent back (pending_review → draft)                       pending       → draft
-- Nothing moves a published question back, and another author's rows never move.
create or replace function public.sync_exam_questions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.import_id is not null or new.question_ids is null or pg_catalog.cardinality(new.question_ids) = 0 then
    return new;
  end if;

  if new.status = 'published' then
    update public.questions
       set status = 'published'
     where id = any(new.question_ids)
       and usage = 'exam'
       and created_by = new.created_by
       and status in ('draft', 'pending_review');
  elsif new.status = 'pending_review' then
    update public.questions
       set status = 'pending_review'
     where id = any(new.question_ids)
       and usage = 'exam'
       and created_by = new.created_by
       and status = 'draft';
  elsif tg_op = 'UPDATE' and old.status = 'pending_review' and new.status = 'draft' then
    update public.questions
       set status = 'draft'
     where id = any(new.question_ids)
       and usage = 'exam'
       and created_by = new.created_by
       and status = 'pending_review';
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_exam_questions() from public, anon, authenticated;

drop trigger if exists exam_blueprints_sync_questions on public.exam_blueprints;
create trigger exam_blueprints_sync_questions
  after update of status on public.exam_blueprints
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_exam_questions();

drop trigger if exists exam_blueprints_sync_questions_insert on public.exam_blueprints;
create trigger exam_blueprints_sync_questions_insert
  after insert on public.exam_blueprints
  for each row
  when (new.status = 'published')
  execute function public.sync_exam_questions();
