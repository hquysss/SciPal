-- Lesson videos (spec docs/superpowers/specs/2026-10-19-lesson-videos-design.md).
-- One video per lesson: a generated file in the private bucket `lesson-videos`, or an embed from an
-- allowlisted app (youtube, vimeo, drive, loom). Only the backend (service_role) reads or writes;
-- it decides who may watch and hands out the playable URL.
-- site_settings.lesson_videos_access is the one switch for all videos: 'free' or 'plus'.

create table public.lesson_videos (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons (id) on delete cascade,
  source text not null check (source in ('file', 'embed')),
  video_path text,
  embed_provider text check (embed_provider in ('youtube', 'vimeo', 'drive', 'loom')),
  embed_id text check (embed_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  poster_path text,
  duration_s integer check (duration_s > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (source = 'file' and video_path is not null and embed_provider is null and embed_id is null)
    or (source = 'embed' and embed_provider is not null and embed_id is not null and video_path is null)
  )
);

alter table public.lesson_videos enable row level security;
revoke all on public.lesson_videos from public, anon, authenticated;
grant select, insert, update, delete on public.lesson_videos to service_role;

alter table public.site_settings
  add column lesson_videos_access text not null default 'plus' check (lesson_videos_access in ('free', 'plus'));

insert into storage.buckets (id, name, public) values ('lesson-videos', 'lesson-videos', false)
on conflict (id) do nothing;
