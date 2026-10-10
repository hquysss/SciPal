-- Exams may share a name: the exam code and year tell them apart.
alter table public.exam_blueprints drop constraint if exists exam_blueprints_name_key;
