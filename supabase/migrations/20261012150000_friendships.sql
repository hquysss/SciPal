-- Friend requests and friendships between accounts. A pair is stored once with user_a < user_b, so
-- (A,B) and (B,A) are the same row. The backend (service role) does every write; browsers can only
-- read the rows they belong to.

create table if not exists public.friendships (
  id           uuid primary key default gen_random_uuid(),
  user_a       uuid not null references public.profiles(id) on delete cascade,
  user_b       uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (user_a < user_b),
  check (requested_by in (user_a, user_b)),
  unique (user_a, user_b)
);
create index if not exists friendships_user_b_idx on public.friendships (user_b);
create index if not exists friendships_requested_by_idx on public.friendships (requested_by) where status = 'pending';

alter table public.friendships enable row level security;

drop policy if exists friendships_select_member on public.friendships;
create policy friendships_select_member on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
