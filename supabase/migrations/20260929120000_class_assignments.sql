-- Class assignments (spec docs/superpowers/specs/2026-09-29-class-assignments-design.md).
-- The live table was created before 0003 took its final shape (due_date, no blueprint_id), so
-- every step below works on either shape. Writes go through the backend (service_role) only;
-- the select policy of 20260926090000 stays.

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'assignments' and column_name = 'due_date')
     and not exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'assignments' and column_name = 'due_at') then
    alter table public.assignments rename column due_date to due_at;
  end if;
end;
$$;

alter table public.assignments add column if not exists due_at timestamptz;
alter table public.assignments add column if not exists blueprint_id uuid references public.exam_blueprints(id) on delete cascade;
alter table public.assignments add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.assignments alter column created_at set default now();

-- One assignment is one lesson or one exam, and each is given to a class once.
alter table public.assignments drop constraint if exists assignments_one_content_check;
alter table public.assignments add constraint assignments_one_content_check
  check (num_nonnulls(lesson_id, blueprint_id) = 1);
create unique index if not exists assignments_class_lesson_key
  on public.assignments (class_id, lesson_id) where lesson_id is not null;
create unique index if not exists assignments_class_blueprint_key
  on public.assignments (class_id, blueprint_id) where blueprint_id is not null;
create index if not exists assignments_class_created_idx
  on public.assignments (class_id, created_at desc);

revoke insert, update, delete on public.assignments from anon, authenticated;
