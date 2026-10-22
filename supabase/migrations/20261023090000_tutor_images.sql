-- Pictures a student sends to the AI Professor (spec docs/superpowers/specs/2026-10-23-tutor-chat-images-design.md).
-- They sit in the private bucket `tutor-images` under <user_id>/<conversation_id>/, so nobody reads one by URL:
-- the backend (service role) writes them and hands the owner a signed link that expires in an hour.
-- No storage.objects policies are added, so browser clients cannot read, upload or overwrite.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutor-images', 'tutor-images', false, 1572864, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- The picture of a question, null for a message without one. Owners already read their own
-- messages (RLS); a path alone opens nothing, since the bucket has no policies.
alter table public.tutor_messages add column if not exists image_path text;
