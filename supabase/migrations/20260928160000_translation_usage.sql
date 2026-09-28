-- Characters each author sent to automatic translation per Vietnam day (routes/translate.ts).
-- Backend only: RLS on, no policies.
create table if not exists public.translation_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  chars integer not null default 0 check (chars >= 0),
  primary key (user_id, day)
);
alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from anon, authenticated;

-- Adds to today's count and returns the new total, in one statement (no lost updates).
create or replace function public.add_translation_usage(p_user uuid, p_day date, p_chars integer)
returns integer
language sql
set search_path = ''
as $$
  insert into public.translation_usage (user_id, day, chars) values (p_user, p_day, p_chars)
  on conflict (user_id, day) do update set chars = public.translation_usage.chars + excluded.chars
  returning chars;
$$;
revoke execute on function public.add_translation_usage(uuid, date, integer) from public, anon, authenticated;
