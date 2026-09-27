-- Images in lessons. Anyone reads them by public URL; only the backend (service role) writes,
-- after checking the uploader is a teacher or admin and the bytes are PNG/JPEG/WEBP (≤ 4 MB).
-- No storage.objects policies are added, so browser clients cannot upload or overwrite.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-media', 'lesson-media', true, 4194304, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
