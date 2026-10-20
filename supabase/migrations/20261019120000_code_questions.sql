-- Programming questions in lesson practice ("code"): judged against hidden tests by Judge0.
-- Practice only: never drawn into an exam.
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('mc', 'truefalse', 'short', 'writing', 'code'));

alter table public.questions drop constraint if exists questions_code_practice_only;
alter table public.questions add constraint questions_code_practice_only
  check (type <> 'code' or usage = 'practice');

-- One row per run, submit or teacher check. Only the backend (service role) reads and writes it;
-- it counts a person's recent runs to enforce the per-minute limit.
create table if not exists public.code_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('run', 'submit', 'verify')),
  created_at timestamptz not null default now()
);
create index if not exists code_runs_user_kind_created_idx on public.code_runs (user_id, kind, created_at desc);
alter table public.code_runs enable row level security;
