-- An exam a teacher gives only to their own classes (no admin review, not in the public /exam list).
-- 'class_only' behaves like 'published' for the exam's own questions, so students of the class can be
-- served and scored on them; who may open it is decided by the backend (author, or a class it is given to).

alter table public.exam_blueprints
  drop constraint if exists exam_blueprints_status_check,
  add constraint exam_blueprints_status_check check (status in ('draft', 'pending_review', 'published', 'class_only'));

create or replace function public.sync_exam_questions()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.import_id is null and old.status = 'pending_review' and pg_catalog.cardinality(old.question_ids) > 0 then
      perform public.release_exam_questions(old.id, old.question_ids, old.created_by);
    end if;
    return old;
  end if;

  if new.import_id is not null or new.question_ids is null or pg_catalog.cardinality(new.question_ids) = 0 then
    return new;
  end if;

  if new.status in ('published', 'class_only') then
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
    perform public.release_exam_questions(new.id, new.question_ids, new.created_by);
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_exam_questions() from public, anon, authenticated;
