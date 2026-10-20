-- A sender can unsend (thu hồi) their own message. The row stays, so everyone sees "đã thu hồi" in its
-- place, but its words and picture are cleared. The original is copied to chat_recalls first, which
-- only the service role reads, so a message cannot be erased before a moderator sees a report.

alter table public.chat_messages add column if not exists recalled_at timestamptz;

alter table public.chat_messages drop constraint if exists chat_messages_content_check;
alter table public.chat_messages add constraint chat_messages_content_check
  check (char_length(body) > 0 or image_url is not null or recalled_at is not null);

create table if not exists public.chat_recalls (
  message_id  uuid primary key references public.chat_messages(id) on delete cascade,
  sender_id   uuid not null references auth.users(id) on delete cascade,
  body        text not null,
  image_url   text,
  recalled_at timestamptz not null default now()
);

-- RLS on with no policies: browsers can neither read nor write it.
alter table public.chat_recalls enable row level security;
