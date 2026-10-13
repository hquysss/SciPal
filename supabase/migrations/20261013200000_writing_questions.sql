-- English writing answers in lesson practice ("writing"): checked for key terms, then commented on
-- by the AI Professor. Practice only: never drawn into an exam.
alter table public.questions drop constraint if exists questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('mc', 'truefalse', 'short', 'writing'));

alter table public.questions drop constraint if exists questions_writing_practice_only;
alter table public.questions add constraint questions_writing_practice_only
  check (type <> 'writing' or usage = 'practice');
