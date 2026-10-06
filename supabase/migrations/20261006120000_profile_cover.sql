-- A cover photo for the profile page, next to the existing avatar. Both are written only by the
-- backend (routes/profile.ts), which keeps one file per picture in the R2 media store.
alter table public.profiles add column cover_url text;
