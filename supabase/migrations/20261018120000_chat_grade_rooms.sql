-- Community chat: rooms by grade (10/11/12), replies and emoji reactions. Additive only.
-- Rollback: drop chat_reactions, chat_can_enter_grade, the two chat_messages columns and profiles.grade,
-- then restore chat_messages_target_check and chat_messages_read from 20261012230000_chat_class.sql.

alter table public.profiles add column if not exists grade smallint check (grade in (10, 11, 12));

alter table public.chat_messages add column if not exists room_grade smallint check (room_grade in (10, 11, 12));
alter table public.chat_messages add column if not exists reply_to uuid references public.chat_messages(id) on delete set null;

alter table public.chat_messages drop constraint if exists chat_messages_target_check;
alter table public.chat_messages add constraint chat_messages_target_check
  check (room_subject_id is null and community::int + (friendship_id is not null)::int + (class_id is not null)::int + (room_grade is not null)::int = 1);

create index if not exists chat_messages_grade_idx on public.chat_messages (room_grade, created_at desc) where room_grade is not null;

-- A student enters their own grade's room; teachers and admins enter every grade.
create or replace function public.chat_can_enter_grade(p_grade smallint) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select auth.jwt()) -> 'app_metadata' ->> 'app_role' = 'admin', false)
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and (p.role = 'teacher' or p.grade = p_grade)
    )
$$;
revoke execute on function public.chat_can_enter_grade(smallint) from public, anon;
grant execute on function public.chat_can_enter_grade(smallint) to authenticated;

drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages
  for select to authenticated
  using (
    deleted_at is null
    and (
      (community and not exists (
        select 1 from public.chat_blocks b
        where b.blocker_id = (select auth.uid()) and b.blocked_id = chat_messages.sender_id
      ))
      or (room_grade is not null
        and public.chat_can_enter_grade(room_grade)
        and not exists (
          select 1 from public.chat_blocks b
          where b.blocker_id = (select auth.uid()) and b.blocked_id = chat_messages.sender_id
        ))
      or (class_id is not null
        and not exists (
          select 1 from public.chat_blocks b
          where b.blocker_id = (select auth.uid()) and b.blocked_id = chat_messages.sender_id
        )
        and exists (
          select 1 from public.class_rooms c
          where c.id = chat_messages.class_id
            and (c.teacher_id = (select auth.uid())
              or exists (select 1 from public.class_members m where m.class_id = c.id and m.student_id = (select auth.uid())))
        ))
      or (friendship_id is not null and exists (
        select 1 from public.friendships f
        where f.id = chat_messages.friendship_id
          and f.status = 'accepted'
          and (select auth.uid()) in (f.user_a, f.user_b)
      ))
    )
  );

-- One row per person, message and emoji. Readable wherever the message is (the subquery runs under chat_messages RLS);
-- the backend does every write.
create table if not exists public.chat_reactions (
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  emoji      text not null check (emoji in ('👍', '❤️', '😂', '😮', '😢', '🔥')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
create index if not exists chat_reactions_user_idx on public.chat_reactions (user_id);
alter table public.chat_reactions enable row level security;

drop policy if exists chat_reactions_read on public.chat_reactions;
create policy chat_reactions_read on public.chat_reactions
  for select to authenticated
  using (exists (select 1 from public.chat_messages m where m.id = chat_reactions.message_id));

alter publication supabase_realtime add table public.chat_reactions;
