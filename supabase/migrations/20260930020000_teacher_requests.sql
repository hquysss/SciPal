-- A student asks to become a teacher; an admin approves (the account's app_role becomes teacher,
-- set by the backend through the Auth admin API) or declines with a reason. Only the backend
-- (service role) reads or writes these rows: RLS is on and nothing is granted to clients.

create table public.teacher_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Who asked, as they were when asking (the admin list shows it without an Auth lookup per row).
  email text check (email is null or char_length(email) <= 320),
  display_name text check (display_name is null or char_length(display_name) <= 100),
  school text not null check (char_length(btrim(school)) between 1 and 200),
  subject text not null check (char_length(btrim(subject)) between 1 and 100),
  note text check (note is null or char_length(note) <= 1000),
  evidence_url text check (evidence_url is null or (char_length(evidence_url) <= 2048 and evidence_url ~ '^https?://')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text check (review_note is null or char_length(review_note) <= 1000),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint teacher_requests_rejection_has_reason check (status <> 'rejected' or char_length(btrim(coalesce(review_note, ''))) > 0)
);

-- One open request per account.
create unique index teacher_requests_one_pending on public.teacher_requests (user_id) where status = 'pending';
create index teacher_requests_user_created on public.teacher_requests (user_id, created_at desc);
create index teacher_requests_pending_created on public.teacher_requests (created_at) where status = 'pending';

alter table public.teacher_requests enable row level security;
revoke all on public.teacher_requests from anon, authenticated;
