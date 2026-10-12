-- A class chat: the teacher and every student of a class_room share one conversation. Text only.
-- Rollback: delete the class_id messages, drop the column and put the old check and policy back.

alter table public.chat_messages add column if not exists class_id uuid references public.class_rooms(id) on delete cascade;

alter table public.chat_messages drop constraint if exists chat_messages_target_check;
alter table public.chat_messages add constraint chat_messages_target_check
  check (room_subject_id is null and community::int + (friendship_id is not null)::int + (class_id is not null)::int = 1);

create index if not exists chat_messages_class_idx on public.chat_messages (class_id, created_at desc);

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
