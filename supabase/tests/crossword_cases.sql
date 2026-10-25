-- Crossword games (migration 20261026090000_crossword_games.sql): learners cannot read the grid and
-- its answers, a crossword game needs a lesson and 4–15 terms, and XP is granted once. Runs after social_cases.sql.

reset role;
-- Stand-in for games with the live check names (20261007200000_games.sql needs lessons, which billing.sql does not create).
create table if not exists public.games (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null constraint games_kind_check check (kind in ('quiz', 'match', 'wordwall')),
  lesson_id    uuid,
  term_ids     uuid[] not null default '{}',
  wordwall_url text,
  constraint games_check check (
    (kind = 'quiz' and lesson_id is not null)
    or (kind = 'match' and cardinality(term_ids) between 3 and 20)
    or (kind = 'wordwall' and wordwall_url like 'https://wordwall.net/embed/%')
  )
);
grant select on public.games to anon, authenticated;

\ir ../migrations/20261026090000_crossword_games.sql

grant select, insert, update, delete on public.games, public.game_crosswords, public.xp_log to service_role;

set role service_role;
do $$
declare
  v_game uuid;
  v_terms uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
begin
  insert into public.games (kind, lesson_id, term_ids) values ('crossword', gen_random_uuid(), v_terms) returning id into v_game;
  insert into public.game_crosswords (game_id, mode, grid_rows, grid_cols, words) values (v_game, 'en_from_vi', 5, 7, '[]');

  begin
    insert into public.games (kind, lesson_id, term_ids) values ('crossword', gen_random_uuid(), v_terms[1:3]);
    raise exception 'A crossword with 3 terms was allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.games (kind, term_ids) values ('crossword', v_terms);
    raise exception 'A crossword without a lesson was allowed';
  exception when check_violation then null;
  end;
  -- The older kinds still pass.
  insert into public.games (kind, term_ids) values ('match', v_terms);

  insert into public.xp_log (user_id, delta, reason) values ('00000000-0000-4000-8000-000000000001', 20, 'crossword:' || v_game);
  begin
    insert into public.xp_log (user_id, delta, reason) values ('00000000-0000-4000-8000-000000000001', 20, 'crossword:' || v_game);
    raise exception 'A second crossword XP grant was allowed';
  exception when unique_violation then null;
  end;
end;
$$;

reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
set role authenticated;
do $$
begin
  begin
    perform 1 from public.game_crosswords;
    raise exception 'A learner read game_crosswords';
  exception when insufficient_privilege then null;
  end;
end;
$$;
reset role;
select set_config('request.jwt.claim.sub', '', false);
