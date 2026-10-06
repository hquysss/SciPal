-- lessons is readable column by column for learners; the new public `source` column needs its own grant.
grant select (source) on public.lessons to anon, authenticated;
