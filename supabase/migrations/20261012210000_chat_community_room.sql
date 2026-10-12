-- One community room for everyone, not a room per subject. A room message is now marked
-- `community`; room_subject_id stays on the table, unused and always null, so nothing is dropped.
-- Rollback: put the rows back with `community = false` and a subject id; the subject each message
-- was posted in is not kept, so only the old policy and check can be restored, not the mapping.

alter table public.chat_messages add column if not exists community boolean not null default false;

alter table public.chat_messages drop constraint if exists chat_messages_check;
alter table public.chat_messages drop constraint if exists chat_messages_target_check;

-- Messages already posted in a subject room join the community room.
update public.chat_messages set community = true, room_subject_id = null where room_subject_id is not null;

alter table public.chat_messages add constraint chat_messages_target_check
  check (room_subject_id is null and community <> (friendship_id is not null));

create index if not exists chat_messages_community_idx on public.chat_messages (created_at desc) where community;

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
      or (friendship_id is not null and exists (
        select 1 from public.friendships f
        where f.id = chat_messages.friendship_id
          and f.status = 'accepted'
          and (select auth.uid()) in (f.user_a, f.user_b)
      ))
    )
  );
