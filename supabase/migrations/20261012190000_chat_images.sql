-- A direct message may carry one picture. The file lives in the R2 media store under chat/<sender>/;
-- the row only keeps its public URL. A message needs words or a picture, not necessarily both.

alter table public.chat_messages add column if not exists image_url text;

alter table public.chat_messages drop constraint if exists chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check (char_length(body) <= 500);

alter table public.chat_messages drop constraint if exists chat_messages_content_check;
alter table public.chat_messages add constraint chat_messages_content_check
  check (char_length(body) > 0 or image_url is not null);
