-- The AI tutor's settings, changed by admins at /admin/ai (backend/src/routes/aiSettings.ts).
-- One row (id = 1). Unset fields fall back to the backend environment, then the code defaults.
-- API keys are never stored here: they stay in the backend environment.
-- Only the backend (service role) reads or writes; no policies for anon or authenticated.

create table if not exists public.ai_settings (
  id smallint primary key default 1 check (id = 1),
  provider text check (provider in ('gemini', 'openai')),
  model text check (model is null or model ~ '^[A-Za-z0-9._:/-]{1,100}$'),
  daily_limit integer check (daily_limit is null or daily_limit between 1 and 200),
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists ai_settings_updated_by_idx
  on public.ai_settings (updated_by)
  where updated_by is not null;

alter table public.ai_settings enable row level security;
revoke all on public.ai_settings from anon, authenticated;
