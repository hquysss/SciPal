-- Leaderboards and challenges (migration 20261025110000_social.sql): the global board hides names of
-- people who did not choose to be named, the friends board holds only accepted friends, a class board
-- answers only its members and teacher, and learners cannot write challenges. Runs after support_access_cases.sql.

reset role;
-- Stand-ins for the tables billing.sql does not create.
create table if not exists public.xp_log (user_id uuid not null, delta int not null, reason text, created_at timestamptz not null default now());
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(), slug text unique, name_vi text, name_en text, description_vi text, description_en text,
  icon text, category text, tier text, is_system bool, sort_order int, condition jsonb
);
insert into public.profiles (id, display_name) values
  ('00000000-0000-4000-8000-000000000001', 'An'),
  ('00000000-0000-4000-8000-000000000002', 'Bình'),
  ('00000000-0000-4000-8000-000000000003', 'Cô Dung'),
  ('00000000-0000-4000-8000-000000000006', 'Chi')
on conflict (id) do update set display_name = excluded.display_name;

\ir ../migrations/20261012150000_friendships.sql
-- The three gamification migrations in the order they are applied.
\ir ../migrations/20261025090000_study_days.sql
\ir ../migrations/20261025100000_learning_badges.sql
\ir ../migrations/20261025110000_social.sql

grant select, insert, update, delete on public.challenges, public.friendships to service_role;
-- Fixture rows only: skip the teacher capacity trigger billing.sql installs.
set session_replication_role = replica;
insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000003');
insert into public.class_members (class_id, student_id) values
  ('10000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000002');
set session_replication_role = origin;
grant select on public.profiles, public.xp_log, public.class_rooms, public.class_members to authenticated;

update public.profiles set leaderboard_public = true where id = '00000000-0000-4000-8000-000000000002';
insert into public.xp_log (user_id, delta) values
  ('00000000-0000-4000-8000-000000000001', 30),
  ('00000000-0000-4000-8000-000000000002', 50),
  ('00000000-0000-4000-8000-000000000006', 10);
-- An (1) and Chi (6) are friends; An asked Bình (2) but Bình has not answered.
insert into public.friendships (user_a, user_b, requested_by, status) values
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001', 'accepted'),
  ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 'pending');

-- Chi (6), not a member of the class, looks at the boards.
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000006', false);
set role authenticated;
do $$
declare
  v_name text;
  v_count int;
begin
  select display_name into v_name from public.xp_leaderboard(false) where xp = 30;
  if v_name is not null then raise exception 'An did not choose to be named, yet the global board shows %', v_name; end if;
  select display_name into v_name from public.xp_leaderboard(false) where xp = 50;
  if v_name is distinct from 'Bình' then raise exception 'Bình chose to be named, the global board shows %', v_name; end if;
  select display_name into v_name from public.xp_leaderboard(false) where is_me;
  if v_name is distinct from 'Chi' then raise exception 'The viewer always sees their own name, got %', v_name; end if;

  select count(*) into v_count from public.class_leaderboard('10000000-0000-4000-8000-000000000099', false);
  if v_count <> 0 then raise exception 'A non-member read % rows of a class board', v_count; end if;

  begin
    insert into public.challenges (challenger, opponent)
    values ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001');
    raise exception 'A learner must not write challenges directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- An (1), a member of the class.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
set role authenticated;
do $$
declare
  v_names text;
  v_count int;
begin
  select string_agg(display_name, ',' order by rank) into v_names from public.friends_leaderboard(false);
  if v_names is distinct from 'An,Chi' then raise exception 'The friends board should be An,Chi (no pending Bình), got %', v_names; end if;
  select count(*) into v_count from public.class_leaderboard('10000000-0000-4000-8000-000000000099', false);
  if v_count <> 2 then raise exception 'A member should see the 2 students of the class, saw %', v_count; end if;
end;
$$;

-- The teacher (3) sees the class board; once it is off, nobody does.
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', false);
set role authenticated;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.class_leaderboard('10000000-0000-4000-8000-000000000099', false);
  if v_count <> 2 then raise exception 'The teacher should see the 2 students of the class, saw %', v_count; end if;
end;
$$;
reset role;
update public.class_rooms set leaderboard_enabled = false where id = '10000000-0000-4000-8000-000000000099';
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
set role authenticated;
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.class_leaderboard('10000000-0000-4000-8000-000000000099', false);
  if v_count <> 0 then raise exception 'A board the teacher turned off still returned % rows', v_count; end if;
end;
$$;

-- One open challenge per pair, whichever way round.
reset role;
set role service_role;
do $$
begin
  insert into public.challenges (challenger, opponent) values ('00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000006');
  begin
    insert into public.challenges (challenger, opponent) values ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001');
    raise exception 'A second open challenge for the same pair was allowed';
  exception when unique_violation then null;
  end;
  update public.challenges set status = 'done';
  insert into public.challenges (challenger, opponent) values ('00000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-000000000001');
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
