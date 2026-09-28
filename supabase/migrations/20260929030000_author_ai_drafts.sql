-- Lesson drafts written by AI for teachers (billing Task 5b, routes/authorAi.ts). One row per
-- request (operation id), so a retried request answers the stored draft without a new charge.
-- Backend only: RLS on, no policies.

create table public.author_ai_drafts (
  operation_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  blocks jsonb not null check (jsonb_typeof(blocks) = 'array'),
  created_at timestamptz not null default now()
);
create index author_ai_drafts_user_created_idx on public.author_ai_drafts (user_id, created_at desc);
alter table public.author_ai_drafts enable row level security;
revoke all on public.author_ai_drafts from public, anon, authenticated;
grant select, insert on public.author_ai_drafts to service_role;
