-- The learner's word list ("Sổ từ của tôi") and the IPA of a glossary term.
-- Learners read their own rows; only the backend (service role) writes them.

alter table public.terms add column if not exists ipa text;

create table if not exists public.user_terms (
  user_id    uuid not null references auth.users(id) on delete cascade,
  term_id    uuid not null references public.terms(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id)
);

alter table public.user_terms enable row level security;

drop policy if exists "user_terms: own read" on public.user_terms;
create policy "user_terms: own read" on public.user_terms for select using (auth.uid() = user_id);

grant select on public.user_terms to authenticated;
grant all on public.user_terms to service_role;
