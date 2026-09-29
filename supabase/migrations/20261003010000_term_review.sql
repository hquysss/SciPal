-- Glossary terms written by staff. An admin's term is published at once; a teacher's waits as
-- 'pending' until an admin approves it (published) or turns it down (rejected, with a note).
-- Only published terms are readable by clients; the backend (service role) writes every change.

alter table public.terms
  add column status text not null default 'published' check (status in ('pending', 'published', 'rejected')),
  add column created_by uuid references auth.users (id) on delete set null,
  add column review_note text check (review_note is null or char_length(review_note) <= 1000),
  add column reviewed_by uuid references auth.users (id) on delete set null,
  add column reviewed_at timestamptz,
  add column created_at timestamptz not null default now();

create index terms_pending_created on public.terms (created_at) where status = 'pending';
create index terms_created_by on public.terms (created_by, created_at desc) where created_by is not null;

drop policy if exists "terms: public read" on public.terms;
create policy "terms: public read" on public.terms for select using (status = 'published');
