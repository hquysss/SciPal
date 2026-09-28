-- Check for 20260927160000_exam_builder.sql. Runs in a transaction that is always rolled back.
-- Usage: psql -v ON_ERROR_STOP=1 -f supabase/manual/check_exam_builder.sql   (raises on failure)
begin;

insert into auth.users (id) values
  ('a0000000-0000-4000-8000-000000000001'), ('b0000000-0000-4000-8000-000000000002');
insert into public.profiles (id) values
  ('a0000000-0000-4000-8000-000000000001'), ('b0000000-0000-4000-8000-000000000002')
  on conflict do nothing;
insert into public.subjects (id, slug, name_en, name_vi, accent_color, icon)
  values ('50000000-0000-4000-8000-000000000005', 'check-exam', 'Check', 'Kiểm', '#000000', 'x');

-- q1: A draft · q2: B draft · q3: published (B) · q4: A draft, not in the exam
insert into public.questions (id, subject_id, type, data, usage, status, created_by) values
  ('10000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000005', 'short', '{}', 'exam', 'draft', 'a0000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000005', 'short', '{}', 'exam', 'draft', 'b0000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000005', 'short', '{}', 'exam', 'published', 'b0000000-0000-4000-8000-000000000002'),
  ('10000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000005', 'short', '{}', 'exam', 'draft', 'a0000000-0000-4000-8000-000000000001');

insert into public.exam_blueprints (id, name, subject_id, sections, status, created_by, question_ids) values
  ('e0000000-0000-4000-8000-00000000000e', 'check exam', '50000000-0000-4000-8000-000000000005', '[]', 'draft',
   'a0000000-0000-4000-8000-000000000001',
   array['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003']::uuid[]);

create temp table stamp as select updated_at from public.exam_blueprints where id = 'e0000000-0000-4000-8000-00000000000e';
select pg_sleep(0.01);

update public.exam_blueprints set status = 'pending_review' where id = 'e0000000-0000-4000-8000-00000000000e';
do $$ begin
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000001') <> 'pending_review' then raise exception 'submit: own draft not pending'; end if;
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000002') <> 'draft' then raise exception 'submit: foreign draft moved'; end if;
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000004') <> 'draft' then raise exception 'submit: unlisted question moved'; end if;
  if (select updated_at from public.exam_blueprints where id = 'e0000000-0000-4000-8000-00000000000e') = (select updated_at from stamp) then raise exception 'updated_at not bumped'; end if;
end $$;

update public.exam_blueprints set status = 'draft', review_note = 'Thêm câu khó' where id = 'e0000000-0000-4000-8000-00000000000e';
do $$ begin
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000001') <> 'draft' then raise exception 'reject: own pending not back to draft'; end if;
end $$;

update public.exam_blueprints set status = 'published' where id = 'e0000000-0000-4000-8000-00000000000e';
do $$ begin
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000001') <> 'published' then raise exception 'publish: own draft not published'; end if;
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000002') <> 'draft' then raise exception 'publish: foreign draft published'; end if;
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000004') <> 'draft' then raise exception 'publish: unlisted question published'; end if;
end $$;

-- An admin creating an exam already published publishes its own drafts.
insert into public.exam_blueprints (id, name, subject_id, sections, status, created_by, question_ids) values
  ('e0000000-0000-4000-8000-0000000000f0', 'check exam 2', '50000000-0000-4000-8000-000000000005', '[]', 'published',
   'a0000000-0000-4000-8000-000000000001', array['10000000-0000-4000-8000-000000000004']::uuid[]);
do $$ begin
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000004') <> 'published' then raise exception 'insert published: own draft not published'; end if;
end $$;

-- Imported exams are left to the import queue.
insert into public.questions (id, subject_id, type, data, usage, status, created_by) values
  ('10000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000005', 'short', '{}', 'exam', 'pending_review', 'a0000000-0000-4000-8000-000000000001');
insert into public.exam_blueprints (id, name, subject_id, sections, status, created_by, import_id, question_ids) values
  ('e0000000-0000-4000-8000-0000000000f1', 'check exam 3', '50000000-0000-4000-8000-000000000005', '[]', 'pending_review',
   'a0000000-0000-4000-8000-000000000001', gen_random_uuid(), array['10000000-0000-4000-8000-000000000005']::uuid[]);
update public.exam_blueprints set status = 'published' where id = 'e0000000-0000-4000-8000-0000000000f1';
do $$ begin
  if (select status from public.questions where id = '10000000-0000-4000-8000-000000000005') <> 'pending_review' then raise exception 'import: question moved by trigger'; end if;
end $$;

select 'check_exam_builder: ok';
rollback;
