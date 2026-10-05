-- Archive (hide) a subject without deleting anything: archived_at is null while the subject is in use.
-- Browser reads go through RLS, so the public read policy stops serving archived subjects; the backend
-- (service role) excludes them explicitly. Idempotent. Lessons, questions, exams, xp and classes are untouched.

alter table public.subjects
  add column if not exists archived_at timestamptz;

drop policy if exists "subjects: public read" on public.subjects;
create policy "subjects: public read" on public.subjects
  for select to anon, authenticated
  using (archived_at is null);
