-- The exam's code (mã đề, e.g. "0101") and the year it was set (năm), written by its author or taken from an Excel import.
alter table public.exam_blueprints add column if not exists exam_code text check (exam_code is null or char_length(exam_code) <= 40);
alter table public.exam_blueprints add column if not exists exam_year smallint check (exam_year is null or exam_year between 2000 and 2100);
