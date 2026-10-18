-- Pictures for the shared chat rooms (everyone, grade 10, 11, 12), set by an admin.
-- Anyone signed in may read them; the backend writes (admin only) and keeps the files in the media store.
-- Rollback: drop table public.chat_room_avatars.
create table if not exists public.chat_room_avatars (
  room        text primary key check (room in ('all', '10', '11', '12')),
  avatar_url  text not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.chat_room_avatars enable row level security;

drop policy if exists chat_room_avatars_read on public.chat_room_avatars;
create policy chat_room_avatars_read on public.chat_room_avatars for select to authenticated using (true);

revoke insert, update, delete on public.chat_room_avatars from anon, authenticated;
