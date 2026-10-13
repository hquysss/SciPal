-- Quick lookup in lessons (docs/superpowers/specs/2026-10-13-quick-dictionary-design.md): words that
-- are not glossary terms are explained once by the AI Professor, kept per subject, and read by all.
create table if not exists public.dictionary_entries (
  id            uuid primary key default gen_random_uuid(),
  subject_id    uuid not null references public.subjects (id) on delete cascade,
  source_lang   text not null check (source_lang in ('en', 'vi')),
  query         text not null check (char_length(query) between 1 and 60),
  term_en       text not null,
  term_vi       text not null,
  ipa           text,
  part_of_speech text,
  definition_en text not null,
  definition_vi text not null,
  example_en    text,
  example_vi    text,
  created_by    uuid,
  created_at    timestamptz not null default now(),
  unique (subject_id, source_lang, query)
);

alter table public.dictionary_entries enable row level security;
drop policy if exists "dictionary_entries: public read" on public.dictionary_entries;
create policy "dictionary_entries: public read" on public.dictionary_entries for select to anon, authenticated using (true);
grant all on public.dictionary_entries to service_role;
-- Supabase grants every new table to anon and authenticated by default; only the backend writes here.
revoke all on public.dictionary_entries from anon, authenticated;
grant select on public.dictionary_entries to anon, authenticated;

-- The word list holds a glossary term or a dictionary entry, never both.
alter table public.user_terms
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists entry_id uuid references public.dictionary_entries (id) on delete cascade;
alter table public.user_terms drop constraint if exists user_terms_pkey;
alter table public.user_terms add primary key (id);
alter table public.user_terms alter column term_id drop not null;
alter table public.user_terms drop constraint if exists user_terms_user_term_key;
alter table public.user_terms add constraint user_terms_user_term_key unique (user_id, term_id);
alter table public.user_terms drop constraint if exists user_terms_user_entry_key;
alter table public.user_terms add constraint user_terms_user_entry_key unique (user_id, entry_id);
alter table public.user_terms drop constraint if exists user_terms_one_word;
alter table public.user_terms add constraint user_terms_one_word check (num_nonnulls(term_id, entry_id) = 1);
