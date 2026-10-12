-- Community chat: subject rooms and direct messages between friends, with blocks and reports. The
-- backend (service role) does every write; browsers can only read what RLS lets them see, and the
-- same rules decide who hears a row over Supabase Realtime.

alter table public.profiles add column if not exists chat_banned boolean not null default false;

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  room_subject_id uuid references public.subjects(id) on delete cascade,
  friendship_id   uuid references public.friendships(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  sender_name     text not null,
  body            text not null check (char_length(body) between 1 and 500),
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  check (num_nonnulls(room_subject_id, friendship_id) = 1)
);
create index if not exists chat_messages_room_idx on public.chat_messages (room_subject_id, created_at desc);
create index if not exists chat_messages_dm_idx on public.chat_messages (friendship_id, created_at desc);
create index if not exists chat_messages_sender_idx on public.chat_messages (sender_id, created_at desc);

create table if not exists public.chat_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists chat_blocks_blocked_idx on public.chat_blocks (blocked_id);

create table if not exists public.chat_reports (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null check (char_length(reason) between 1 and 300),
  created_at  timestamptz not null default now(),
  handled_at  timestamptz,
  unique (message_id, reporter_id)
);
create index if not exists chat_reports_open_idx on public.chat_reports (created_at desc) where handled_at is null;
create index if not exists chat_reports_reporter_idx on public.chat_reports (reporter_id);

alter table public.chat_messages enable row level security;
alter table public.chat_blocks enable row level security;
alter table public.chat_reports enable row level security;

-- Room messages are open to every signed-in account, minus senders the reader blocked. A direct
-- message is readable only by the two members of an accepted friendship. Deleted rows are hidden.
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages
  for select to authenticated
  using (
    deleted_at is null
    and (
      (room_subject_id is not null and not exists (
        select 1 from public.chat_blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = chat_messages.sender_id
      ))
      or (friendship_id is not null and exists (
        select 1 from public.friendships f
        where f.id = chat_messages.friendship_id
          and f.status = 'accepted'
          and (select auth.uid()) in (f.user_a, f.user_b)
      ))
    )
  );

drop policy if exists chat_blocks_read_own on public.chat_blocks;
create policy chat_blocks_read_own on public.chat_blocks
  for select to authenticated
  using (blocker_id = (select auth.uid()));

-- chat_reports: no browser policies; the backend reads and writes them.

alter publication supabase_realtime add table public.chat_messages;
