-- Simulation requests: a teacher asks for a simulation the catalog lacks, for one lesson; an admin
-- accepts, declines (with a note) or completes it with a ready simulation block. Completing never
-- edits the lesson: the teacher inserts the result from the Studio.
--
-- Every write goes through the backend (service role), which checks roles, lesson ownership, URLs,
-- the result block and the status (a transition updates only rows still in the expected status,
-- so a second admin acting at the same time gets 409). Clients may only read their own requests;
-- admins read all.

create table if not exists public.simulation_requests (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  description text not null,
  reference_url text,
  sketch_url text,
  status text not null default 'open',
  admin_note text,
  result_block jsonb,
  handled_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulation_requests_description_length check (char_length(btrim(description)) between 1 and 1000),
  constraint simulation_requests_reference_https check (reference_url is null or (reference_url like 'https://%' and char_length(reference_url) <= 1000)),
  constraint simulation_requests_sketch_length check (sketch_url is null or char_length(sketch_url) <= 1000),
  constraint simulation_requests_note_length check (admin_note is null or char_length(admin_note) <= 1000),
  constraint simulation_requests_status check (status in ('open', 'in_progress', 'done', 'declined')),
  constraint simulation_requests_done_has_result check (status <> 'done' or result_block is not null),
  constraint simulation_requests_declined_has_note check (status <> 'declined' or admin_note is not null)
);

-- The lesson panel lists a lesson's requests; the teacher page lists one teacher's; the admin
-- queue filters by status, oldest first. Foreign keys are indexed for cascades.
create index if not exists simulation_requests_lesson_idx on public.simulation_requests (lesson_id, created_at desc);
create index if not exists simulation_requests_requester_idx on public.simulation_requests (requested_by, created_at desc);
create index if not exists simulation_requests_status_idx on public.simulation_requests (status, created_at);
create index if not exists simulation_requests_handled_by_idx on public.simulation_requests (handled_by) where handled_by is not null;

alter table public.simulation_requests enable row level security;
revoke insert, update, delete on public.simulation_requests from anon, authenticated;

drop policy if exists "simulation_requests: requester or admin read" on public.simulation_requests;
create policy "simulation_requests: requester or admin read" on public.simulation_requests
  for select to authenticated
  using (
    requested_by = (select auth.uid())
    or coalesce(((select auth.jwt()) -> 'app_metadata' ->> 'app_role') = 'admin', false)
  );
