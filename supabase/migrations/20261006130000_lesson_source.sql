-- Where a lesson comes from (e.g. the textbook), written by its author and shown under the title.
alter table public.lessons add column if not exists source text check (source is null or char_length(source) <= 300);
