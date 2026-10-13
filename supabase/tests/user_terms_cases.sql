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
