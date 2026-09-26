-- supabase/migrations/20260927090000_v19_content_schema.sql
-- v1.9 content schema: curriculum catalog, tracks, four-state lesson status.
-- Legacy columns (lessons.published, lessons.review_status, subjects.status,
-- subjects.education_level) are dropped later in 20260927090200.

create table public.curriculum_versions (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name_vi        text not null,
  issued_by      text not null,
  source_ref     jsonb not null default '{}'::jsonb,
  effective_from date not null,
  effective_to   date,
  status         text not null default 'active' check (status in ('draft', 'active', 'retired')),
  created_at     timestamptz not null default now()
);

create table public.subject_grade_catalog (
  id                    uuid primary key default gen_random_uuid(),
  curriculum_version_id uuid not null references public.curriculum_versions(id) on delete cascade,
  subject_id            uuid not null references public.subjects(id) on delete cascade,
  grade                 int not null check (grade between 1 and 12),
  curriculum_role       text not null
    check (curriculum_role in ('required', 'elective_choice', 'optional', 'required_activity')),
  source_ref            jsonb not null default '{}'::jsonb,
  sort_order            int not null default 0,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  unique (curriculum_version_id, subject_id, grade)
);
create index subject_grade_catalog_grade_idx on public.subject_grade_catalog (grade, sort_order) where active;

create table public.subject_tracks (
  id         uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  slug       text not null,
  name_en    text not null,
  name_vi    text not null,
  grades     int[] not null
    check (cardinality(grades) > 0 and grades <@ array[1,2,3,4,5,6,7,8,9,10,11,12]),
  sort_order int not null default 0,
  unique (subject_id, slug)
);

alter table public.subjects add column icon_url text;

alter table public.topics
  add column grade int check (grade between 1 and 12),
  add column kind text not null default 'core' check (kind in ('core', 'elective_topic'));

alter table public.lessons drop constraint if exists lessons_grade_check;
alter table public.lessons
  add constraint lessons_grade_range check (grade between 1 and 12),
  add column status text not null default 'draft'
    check (status in ('draft', 'pending_review', 'published', 'rejected')),
  add column track_id uuid references public.subject_tracks(id) on delete set null,
  add column digital_competency jsonb,
  add column review_note text,
  add column published_at timestamptz;

update public.lessons set
  status = case
    when published then 'published'
    when review_status = 'pending' then 'pending_review'
    when review_status = 'rejected' then 'rejected'
    else 'draft'
  end,
  published_at = case when published then coalesce(reviewed_at, updated_at, created_at) end;

-- A topic inherits a grade only when all of its lessons agree on one.
update public.topics t set grade = g.grade
from (
  select topic_id, min(grade) as grade
  from public.lessons
  group by topic_id
  having count(distinct grade) = 1
) g
where t.id = g.topic_id and t.grade is null;

create index lessons_subject_grade_status_idx on public.lessons (subject_id, grade, status);
create index lessons_pending_review_status_idx on public.lessons (created_at) where status = 'pending_review';
create index topics_subject_grade_sort_idx on public.topics (subject_id, grade, sort_order);

alter table public.profiles
  add column preferred_code_language text check (preferred_code_language in ('python', 'cpp'));
grant update (preferred_code_language) on public.profiles to authenticated;

drop policy if exists "lessons: published read" on public.lessons;
create policy "lessons: published read" on public.lessons
  for select to anon, authenticated using (status = 'published');

alter table public.curriculum_versions enable row level security;
alter table public.subject_grade_catalog enable row level security;
alter table public.subject_tracks enable row level security;

create policy "curriculum_versions: public read" on public.curriculum_versions
  for select to anon, authenticated using (true);
create policy "subject_grade_catalog: public read" on public.subject_grade_catalog
  for select to anon, authenticated using (true);
create policy "subject_tracks: public read" on public.subject_tracks
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.curriculum_versions from anon, authenticated;
revoke insert, update, delete on public.subject_grade_catalog from anon, authenticated;
revoke insert, update, delete on public.subject_tracks from anon, authenticated;
