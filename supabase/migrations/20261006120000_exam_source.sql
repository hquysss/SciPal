-- Where an exam comes from (shown on its card), written by its author.
alter table public.exam_blueprints add column if not exists source text check (source is null or char_length(source) <= 300);
