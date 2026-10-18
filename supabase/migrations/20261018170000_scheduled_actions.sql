-- Things an admin schedules: an announcement to send, or maintenance mode to switch on or off.
-- A runner (backend /api/internal/scheduled/run, called every minute) claims the rows that are due.
-- No browser policies: the backend reads and writes this table with the service role.
create table public.scheduled_actions (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('announcement', 'maintenance_on', 'maintenance_off')),
  run_at       timestamptz not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'pending' check (status in ('pending', 'running', 'done', 'cancelled', 'failed')),
  result       jsonb,
  error        text,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index scheduled_actions_due_idx on public.scheduled_actions (run_at) where status = 'pending';
create index scheduled_actions_created_idx on public.scheduled_actions (created_at desc);

alter table public.scheduled_actions enable row level security;
revoke all on public.scheduled_actions from anon, authenticated;
