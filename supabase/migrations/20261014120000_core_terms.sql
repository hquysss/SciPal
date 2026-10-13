-- Automatic tagging of glossary terms in lessons: only terms an admin marks "core" are tagged, and a
-- lesson can switch the tagging off. Nothing is core at first, so no lesson changes until terms are marked.
alter table public.terms add column if not exists core boolean not null default false;
alter table public.lessons add column if not exists auto_terms boolean not null default true;

-- lessons is readable column by column for learners; the page needs to know whether tagging is on.
grant select (auto_terms) on public.lessons to anon, authenticated;
