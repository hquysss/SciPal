-- The personal word list (migration 20261013120000_user_terms_ipa.sql): a learner reads only their
-- own saved terms and cannot write the table; the backend (service role) writes it.

-- Stand-ins for the tables and the auth helper billing.sql does not create.
create table if not exists public.subjects (id uuid primary key);
create table if not exists public.terms (id uuid primary key, subject_id uuid);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant usage on schema public to authenticated;

insert into public.terms (id) values
  ('20000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002');

\ir ../migrations/20261013120000_user_terms_ipa.sql
\ir ../migrations/20261013160000_user_terms_review.sql

set role service_role;
insert into public.user_terms (user_id, term_id) values
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
set role authenticated;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.user_terms;
  if v_count <> 2 then
    raise exception 'A learner should read only their own 2 saved terms, read %', v_count;
  end if;
  begin
    insert into public.user_terms (user_id, term_id)
    values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001');
    raise exception 'A learner must not write user_terms directly';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', false);

select ipa from public.terms limit 0;

-- A newly saved term is due at once, with a fresh schedule.
do $$
begin
  if exists (select 1 from public.user_terms where due_at > now() or ease <> 2.5 or reps <> 0) then
    raise exception 'A saved term should start due now with ease 2.5 and no reps';
  end if;
end;
$$;

-- FSRS (20261013220000): a card on a schedule carries over, a card never reviewed stays new.
update public.user_terms set interval_days = 10, reps = 3, due_at = '2026-10-20T00:00:00Z'
where user_id = '00000000-0000-4000-8000-000000000002';
\ir ../migrations/20261013220000_user_terms_fsrs.sql
do $$
begin
  if not exists (select 1 from public.user_terms where user_id = '00000000-0000-4000-8000-000000000002'
                 and stability = 10 and difficulty = 5 and last_review = '2026-10-10T00:00:00Z') then
    raise exception 'A scheduled card should carry over with stability 10, difficulty 5, last review 10 days before due';
  end if;
  if exists (select 1 from public.user_terms where user_id = '00000000-0000-4000-8000-000000000001'
             and (stability is not null or difficulty is not null or last_review is not null)) then
    raise exception 'A card never reviewed should stay new';
  end if;
end;
$$;

-- Quick dictionary (20261014090000): anyone reads entries, nobody but the backend writes them; the
-- word list keeps a term or an entry, exactly one, once per learner.
insert into public.subjects (id) values ('30000000-0000-4000-8000-000000000001');
\ir ../migrations/20261014090000_dictionary_entries.sql
set role service_role;
insert into public.dictionary_entries (id, subject_id, source_lang, query, term_en, term_vi, definition_en, definition_vi)
values ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'en', 'repeat', 'repeat', 'lặp lại', 'Do again.', 'Làm lại.');
insert into public.user_terms (user_id, entry_id)
values ('00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001');
reset role;
do $$
begin
  begin
    insert into public.user_terms (user_id, entry_id)
    values ('00000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001');
    raise exception 'An entry should be saved once per learner';
  exception when unique_violation then null;
  end;
  begin
    insert into public.user_terms (user_id, term_id, entry_id)
    values ('00000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001');
    raise exception 'A word list row should hold a term or an entry, not both';
  exception when check_violation then null;
  end;
  begin
    insert into public.user_terms (user_id) values ('00000000-0000-4000-8000-000000000002');
    raise exception 'A word list row should hold a term or an entry';
  exception when check_violation then null;
  end;
end;
$$;
set role anon;
do $$
begin
  if (select count(*) from public.dictionary_entries) <> 1 then
    raise exception 'A visitor should read dictionary entries';
  end if;
  begin
    insert into public.dictionary_entries (subject_id, source_lang, query, term_en, term_vi, definition_en, definition_vi)
    values ('30000000-0000-4000-8000-000000000001', 'en', 'x', 'x', 'x', 'x', 'x');
    raise exception 'A visitor must not write dictionary entries';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;

-- Core terms (20261014120000): nothing is core at first, and a lesson tags terms unless switched off.
create table if not exists public.lessons (id uuid primary key default gen_random_uuid());
insert into public.lessons default values;
\ir ../migrations/20261014120000_core_terms.sql
do $$
begin
  if exists (select 1 from public.terms where core) then
    raise exception 'No term should be core until an admin marks it';
  end if;
  if exists (select 1 from public.lessons where not auto_terms) then
    raise exception 'A lesson should tag terms automatically until it is switched off';
  end if;
end;
$$;

-- The stand-in lessons table is only for this check: lessons_columns.sql creates the real shape next.
drop table public.lessons;
