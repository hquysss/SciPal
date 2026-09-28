-- AI tutor conversations (spec docs/superpowers/specs/2026-09-28-ai-tutor-page-design.md).
-- Students read their own rows; only the backend (service role) writes.

create table if not exists public.tutor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  lesson_id uuid references public.lessons(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tutor_conversations_user_idx
  on public.tutor_conversations (user_id, updated_at desc);
create index if not exists tutor_conversations_lesson_idx
  on public.tutor_conversations (lesson_id)
  where lesson_id is not null;

create table if not exists public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.tutor_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create index if not exists tutor_messages_conversation_idx
  on public.tutor_messages (conversation_id, created_at);
create index if not exists tutor_messages_daily_idx
  on public.tutor_messages (user_id, created_at)
  where role = 'user';

alter table public.tutor_conversations enable row level security;
alter table public.tutor_messages enable row level security;

revoke all on public.tutor_conversations, public.tutor_messages from anon, authenticated;
grant select on public.tutor_conversations, public.tutor_messages to authenticated;

drop policy if exists tutor_conversations_owner_read on public.tutor_conversations;
create policy tutor_conversations_owner_read on public.tutor_conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists tutor_messages_owner_read on public.tutor_messages;
create policy tutor_messages_owner_read on public.tutor_messages
  for select to authenticated
  using (user_id = (select auth.uid()));
