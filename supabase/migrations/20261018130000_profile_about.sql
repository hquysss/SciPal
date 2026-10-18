-- Public profile: school and bio, each hidden on request. Avatar, cover and grade already exist.
-- The backend (service role) writes these; browsers keep the column-level update grant they had.
-- Rollback: drop the four columns.

alter table public.profiles add column if not exists school text check (char_length(school) <= 100);
alter table public.profiles add column if not exists bio text check (char_length(bio) <= 250);
alter table public.profiles add column if not exists show_school boolean not null default true;
alter table public.profiles add column if not exists show_bio boolean not null default true;
