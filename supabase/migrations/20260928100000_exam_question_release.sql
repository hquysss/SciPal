-- Exam questions leave review only when no other exam still holds them there.
--
-- 1. Sending an exam back moved its author's pending questions to draft even when another
--    pending exam listed them, so they could be edited while that exam waited for review.
-- 2. Deleting a pending exam left its questions pending with no exam to review them.

-- The author's pending questions of an exam go back to draft, except those another pending
-- exam (not the one being released) still lists.
create or replace function public.release_exam_questions(p_exam_id uuid, p_question_ids uuid[], p_author uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  update public.questions q
     set status = 'draft'
   where q.id = any(p_question_ids)
     and q.usage = 'exam'
     and q.created_by = p_author
     and q.status = 'pending_review'
     and not exists (
       select 1
         from public.exam_blueprints e
        where e.id <> p_exam_id
          and e.status = 'pending_review'
          and q.id = any(e.question_ids)
     );
end;
$$;

revoke execute on function public.release_exam_questions(uuid, uuid[], uuid) from public, anon, authenticated;

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
    perform public.release_exam_questions(new.id, new.question_ids, new.created_by);
  end if;

  return new;
end;
$$;

revoke execute on function public.sync_exam_questions() from public, anon, authenticated;

drop trigger if exists exam_blueprints_sync_questions_delete on public.exam_blueprints;
create trigger exam_blueprints_sync_questions_delete
  after delete on public.exam_blueprints
  for each row
  when (old.status = 'pending_review')
  execute function public.sync_exam_questions();
