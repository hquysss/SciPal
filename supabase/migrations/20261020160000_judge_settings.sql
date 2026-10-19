-- Daily limits on the code judge, changed by admins at /admin/judge (backend/src/routes/judgeSettings.ts).
-- Each run on the hosted judge costs money, so a person and the whole site each have a cap per Vietnam day.
-- One row (id = 1). A null field means the default in backend/src/judge/limits.ts.
-- Only the backend (service role) reads or writes; no policies for anon or authenticated.

create table if not exists public.judge_settings (
  id smallint primary key default 1 check (id = 1),
  person_submits_per_day integer check (person_submits_per_day is null or person_submits_per_day between 1 and 1000000),
  person_runs_per_day integer check (person_runs_per_day is null or person_runs_per_day between 1 and 1000000),
  global_submits_per_day integer check (global_submits_per_day is null or global_submits_per_day between 1 and 1000000),
  global_runs_per_day integer check (global_runs_per_day is null or global_runs_per_day between 1 and 1000000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists judge_settings_updated_by_idx
  on public.judge_settings (updated_by)
  where updated_by is not null;

alter table public.judge_settings enable row level security;
revoke all on public.judge_settings from anon, authenticated;

-- Counting a person's or the site's runs of a day reads code_runs by time; the table is small, but make it cheap.
create index if not exists code_runs_kind_created_idx on public.code_runs (kind, created_at desc);
