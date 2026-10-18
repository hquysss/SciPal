-- Unread chat messages: one read marker per person and conversation. A conversation key is "all", "10"/"11"/"12",
-- "class:<id>" or "dm:<friendship id>". The marker only records when its owner last looked, so the browser sets it
-- through chat_mark_read (always the caller's own row, server clock); counting runs under chat_messages RLS.
-- Rollback: drop function public.chat_unread_counts(), public.chat_mark_read(text); drop table public.chat_reads.

create table if not exists public.chat_reads (
  user_id uuid not null references public.profiles(id) on delete cascade,
  conv    text not null check (char_length(conv) between 1 and 60),
  read_at timestamptz not null default now(),
  primary key (user_id, conv)
);

alter table public.chat_reads enable row level security;

drop policy if exists chat_reads_own on public.chat_reads;
create policy chat_reads_own on public.chat_reads for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.chat_reads from anon, authenticated;

create or replace function public.chat_mark_read(p_conv text) returns void
language sql volatile security definer set search_path = '' as $$
  insert into public.chat_reads (user_id, conv, read_at)
  select (select auth.uid()), p_conv, now()
  where (select auth.uid()) is not null and char_length(p_conv) between 1 and 60
  on conflict (user_id, conv) do update set read_at = excluded.read_at
$$;
revoke execute on function public.chat_mark_read(text) from public, anon;
grant execute on function public.chat_mark_read(text) to authenticated;

-- Messages from others since the reader last looked (a conversation never opened counts the last 7 days).
-- Security invoker: chat_messages RLS decides which conversations and senders the reader can see.
create or replace function public.chat_unread_counts() returns table (conv text, unread integer)
language sql stable security invoker set search_path = '' as $$
  with msgs as (
    select case
             when m.community then 'all'
             when m.room_grade is not null then m.room_grade::text
             when m.class_id is not null then 'class:' || m.class_id
             else 'dm:' || m.friendship_id
           end as conv,
           m.created_at
    from public.chat_messages m
    where m.sender_id <> (select auth.uid())
      and m.recalled_at is null
      and m.created_at > now() - interval '7 days'
  )
  select msgs.conv, count(*)::integer
  from msgs
  left join public.chat_reads r on r.user_id = (select auth.uid()) and r.conv = msgs.conv
  where r.read_at is null or msgs.created_at > r.read_at
  group by msgs.conv
$$;
revoke execute on function public.chat_unread_counts() from public, anon;
grant execute on function public.chat_unread_counts() to authenticated;
