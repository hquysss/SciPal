-- A report is about a whole conversation (the community room, a class chat or a direct chat), not one
-- message. It keeps a snapshot of the latest messages, so the evidence survives if the conversation is
-- deleted afterwards (unfriending or blocking removes a direct chat). message_id stays for old rows.

alter table public.chat_reports alter column message_id drop not null;
alter table public.chat_reports add column if not exists conversation_key text;
alter table public.chat_reports add column if not exists label text;
alter table public.chat_reports add column if not exists snapshot jsonb not null default '[]'::jsonb;

alter table public.chat_reports drop constraint if exists chat_reports_target_check;
alter table public.chat_reports add constraint chat_reports_target_check
  check (message_id is not null or conversation_key is not null);

-- One open report per person per conversation.
create unique index if not exists chat_reports_open_conversation_key
  on public.chat_reports (reporter_id, conversation_key)
  where conversation_key is not null and handled_at is null;
