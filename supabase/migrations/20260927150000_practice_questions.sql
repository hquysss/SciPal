-- Practice questions (a lesson's Tự luyện part) and exam questions are separate pools.
--
-- 1. Every question has a usage. Existing rows (seeded pool, Excel imports) stay 'exam', so
--    today's exams behave as before. Exam questions may carry a grade.
-- 2. Questions written in the Studio start as drafts.
-- 3. Deleting the lesson a question came from keeps the question (it may be reused elsewhere).
-- 4. A lesson's own practice questions follow the lesson through review, in the same statement
--    as the lesson's status change: if the question update fails, the lesson update fails too.

alter table public.questions
  add column if not exists usage text not null default 'exam',
  add column if not exists grade int;

alter table public.questions
  drop constraint if exists questions_usage_check,
  add constraint questions_usage_check check (usage in ('practice', 'exam')),
  drop constraint if exists questions_grade_check,
  add constraint questions_grade_check check (grade is null or grade between 1 and 12),
  drop constraint if exists questions_status_check,
  add constraint questions_status_check check (status in ('draft', 'pending_review', 'published'));

alter table public.questions
  drop constraint if exists questions_lesson_id_fkey,
  add constraint questions_lesson_id_fkey
    foreign key (lesson_id) references public.lessons(id) on delete set null;

create index if not exists questions_usage_pool_idx
  on public.questions (usage, subject_id, status, difficulty, id);
create index if not exists questions_lesson_usage_idx
  on public.questions (lesson_id, usage)
  where lesson_id is not null;
create index if not exists questions_created_by_idx
  on public.questions (created_by, usage, status)
  where created_by is not null;

-- Questions hold answer keys: only the backend (service role) reads or writes them.
revoke all on public.questions from anon, authenticated;

-- Lesson status → its linked practice questions:
--   submitted (→ pending_review)          own drafts           → pending_review
--   approved or published directly         drafts and pending   → published
--   sent back (pending_review → draft/rejected) own pending     → draft
-- Only rows referenced by the lesson's quiz blocks, attached to this lesson (lesson_id) and of
-- usage 'practice' move. A published question reused from another lesson is never touched,
-- and nothing moves a published question back. Publishing is admin-only, and the API only
-- attaches a question to a lesson its author may edit, so publishing covers every attached row;
-- review and return move the lesson author's own rows.
create or replace function public.sync_lesson_practice_questions()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  ids uuid[];
begin
  select coalesce(pg_catalog.array_agg(distinct (b ->> 'question_id')::uuid), '{}')
    into ids
    from pg_catalog.jsonb_array_elements(
      case when pg_catalog.jsonb_typeof(new.blocks) = 'array' then new.blocks else '[]'::jsonb end
    ) as b
   where b ->> 'type' = 'quiz'
     and b ->> 'question_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  if pg_catalog.cardinality(ids) = 0 then
    return new;
  end if;

  if new.status = 'published' then
    update public.questions
       set status = 'published'
     where id = any(ids)
       and usage = 'practice'
       and lesson_id = new.id
       and status in ('draft', 'pending_review');
  elsif new.status = 'pending_review' then
    update public.questions
       set status = 'pending_review'
     where id = any(ids)
       and usage = 'practice'
       and lesson_id = new.id
       and created_by = new.created_by
       and status = 'draft';
  elsif old.status = 'pending_review' and new.status in ('draft', 'rejected') then
    update public.questions
       set status = 'draft'
     where id = any(ids)
       and usage = 'practice'
       and lesson_id = new.id
       and created_by = new.created_by
       and status = 'pending_review';
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_lesson_practice_questions() from public, anon, authenticated;

drop trigger if exists lessons_sync_practice_questions on public.lessons;
create trigger lessons_sync_practice_questions
  after update of status on public.lessons
  for each row
  when (old.status is distinct from new.status)
  execute function public.sync_lesson_practice_questions();
