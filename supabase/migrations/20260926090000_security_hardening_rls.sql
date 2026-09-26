-- Security hardening: server-authoritative gamification, private questions,
-- non-recursive class policies, no client survey inserts.
-- Backend (service_role) bypasses RLS and is the only writer for these tables.

-- ── Helpers for class policies (break class_rooms <-> class_members recursion) ──
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_rooms
    where id = p_class_id and teacher_id = (select auth.uid())
  );
$$;

create or replace function private.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and student_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_class_teacher(uuid) from public, anon;
revoke execute on function private.is_class_member(uuid) from public, anon;
grant execute on function private.is_class_teacher(uuid) to authenticated;
grant execute on function private.is_class_member(uuid) to authenticated;

-- ── Server-authoritative gamification tables: read own rows only ──
drop policy if exists "progress: own rows" on public.progress;
drop policy if exists "xp_log: own rows" on public.xp_log;
drop policy if exists "streaks: own rows" on public.streaks;
drop policy if exists "user_badges: own rows" on public.user_badges;

create policy "progress: select own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "xp_log: select own" on public.xp_log
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "streaks: select own" on public.streaks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_badges: select own" on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.progress from anon, authenticated;
revoke insert, update, delete on public.xp_log from anon, authenticated;
revoke insert, update, delete on public.streaks from anon, authenticated;
revoke insert, update, delete on public.user_badges from anon, authenticated;

create index if not exists xp_log_user_id_idx on public.xp_log (user_id);

-- ── Profiles: read/update own row, only safe columns ──
drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, preferred_education_level) on public.profiles to authenticated;

-- ── Classes: clients read only; writes go through the backend ──
drop policy if exists "class_rooms: teacher" on public.class_rooms;
drop policy if exists "class_rooms: member" on public.class_rooms;
drop policy if exists "class_members: visible" on public.class_members;
drop policy if exists "assignments: visible" on public.assignments;

create policy "class_rooms: select teacher or member" on public.class_rooms
  for select to authenticated
  using (teacher_id = (select auth.uid()) or private.is_class_member(id));
create policy "class_members: select self or teacher" on public.class_members
  for select to authenticated
  using (student_id = (select auth.uid()) or private.is_class_teacher(class_id));
create policy "assignments: select teacher or member" on public.assignments
  for select to authenticated
  using (private.is_class_teacher(class_id) or private.is_class_member(class_id));

revoke insert, update, delete on public.class_rooms from anon, authenticated;
revoke insert, update, delete on public.class_members from anon, authenticated;
revoke insert, update, delete on public.assignments from anon, authenticated;

create index if not exists class_rooms_teacher_id_idx on public.class_rooms (teacher_id);
create index if not exists class_members_student_id_idx on public.class_members (student_id);

-- ── Content tables: public read, no client writes ──
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.terms enable row level security;
alter table public.resources enable row level security;
alter table public.badges enable row level security;
alter table public.questions enable row level security;
alter table public.exam_blueprints enable row level security;

drop policy if exists "subjects: public read" on public.subjects;
drop policy if exists "topics: public read" on public.topics;
drop policy if exists "terms: public read" on public.terms;
drop policy if exists "resources: public read" on public.resources;
drop policy if exists "badges: public read" on public.badges;

create policy "subjects: public read" on public.subjects for select to anon, authenticated using (true);
create policy "topics: public read" on public.topics for select to anon, authenticated using (true);
create policy "terms: public read" on public.terms for select to anon, authenticated using (true);
create policy "resources: public read" on public.resources for select to anon, authenticated using (true);
create policy "badges: public read" on public.badges for select to anon, authenticated using (true);
-- lessons keeps its existing "lessons: published read" policy from 0006.

revoke insert, update, delete on public.subjects from anon, authenticated;
revoke insert, update, delete on public.topics from anon, authenticated;
revoke insert, update, delete on public.lessons from anon, authenticated;
revoke insert, update, delete on public.terms from anon, authenticated;
revoke insert, update, delete on public.resources from anon, authenticated;
revoke insert, update, delete on public.badges from anon, authenticated;

-- Questions hold answer keys; blueprints are served by the backend only.
revoke all on public.questions from anon, authenticated;
revoke all on public.exam_blueprints from anon, authenticated;

-- ── Surveys: only the backend inserts (policy names differ between environments) ──
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'surveys' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.surveys', pol.policyname);
  end loop;
end $$;

revoke insert, update, delete on public.surveys from anon, authenticated;
