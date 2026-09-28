-- Checks the tutor tables' RLS on a real database without keeping anything.
-- Run after (or together with) 20260928120000_tutor_conversations.sql; everything is rolled back.
-- Expected: owner sees 1 conversation and 1 message; another user and anon see 0;
-- a direct insert as a signed-in user is refused.

begin;

create temp table tutor_check (name text, result text) on commit drop;
grant all on tutor_check to authenticated, anon;

do $$
declare a uuid; b uuid; c uuid;
begin
  select id into a from auth.users order by created_at limit 1;
  select id into b from auth.users where id <> a order by created_at limit 1;
  insert into public.tutor_conversations (user_id, title) values (a, 'Kiểm tra') returning id into c;
  insert into public.tutor_messages (conversation_id, user_id, role, content) values (c, a, 'user', 'Câu hỏi');
  perform set_config('tutor_check.a', a::text, true);
  perform set_config('tutor_check.b', b::text, true);
  perform set_config('tutor_check.c', c::text, true);
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('tutor_check.a'), 'role', 'authenticated')::text, true);
insert into tutor_check select 'owner conversations', count(*)::text from public.tutor_conversations where id = current_setting('tutor_check.c')::uuid;
insert into tutor_check select 'owner messages', count(*)::text from public.tutor_messages where conversation_id = current_setting('tutor_check.c')::uuid;

do $$
begin
  insert into public.tutor_messages (conversation_id, user_id, role, content)
  values (current_setting('tutor_check.c')::uuid, current_setting('tutor_check.a')::uuid, 'user', 'x');
  insert into tutor_check values ('owner direct insert', 'ALLOWED');
exception when insufficient_privilege then
  insert into tutor_check values ('owner direct insert', 'denied');
end $$;

select set_config('request.jwt.claims', json_build_object('sub', current_setting('tutor_check.b'), 'role', 'authenticated')::text, true);
insert into tutor_check select 'other user conversations', count(*)::text from public.tutor_conversations where id = current_setting('tutor_check.c')::uuid;
insert into tutor_check select 'other user messages', count(*)::text from public.tutor_messages where conversation_id = current_setting('tutor_check.c')::uuid;

reset role;
set local role anon;
do $$
begin
  perform count(*) from public.tutor_conversations;
  insert into tutor_check values ('anon read', 'ALLOWED');
exception when insufficient_privilege then
  insert into tutor_check values ('anon read', 'denied');
end $$;

reset role;
select * from tutor_check;

rollback;
