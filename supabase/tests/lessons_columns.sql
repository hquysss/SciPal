\set ON_ERROR_STOP on

select 'create role anon nologin' where not exists (select 1 from pg_roles where rolname = 'anon') \gexec
select 'create role authenticated nologin' where not exists (select 1 from pg_roles where rolname = 'authenticated') \gexec

create table public.lessons (
  id uuid primary key, topic_id uuid, subject_id uuid, track_id uuid, slug text, title_en text,
  title_vi text, grade integer, blocks jsonb, sort_order integer, status text, digital_competency jsonb,
  published_at timestamptz, created_at timestamptz, updated_at timestamptz, created_by uuid, reviewed_by uuid,
  reviewed_at timestamptz, review_note text, delete_requested_at timestamptz, delete_requested_by uuid,
  delete_request_note text
);
grant select on public.lessons to anon, authenticated;

\ir ../migrations/20260930010000_lessons_public_columns.sql

do $$
declare
  role_name text;
  col text;
begin
  foreach role_name in array array['anon', 'authenticated'] loop
    foreach col in array array['id', 'slug', 'title_vi', 'blocks', 'status', 'subject_id', 'topic_id'] loop
      if not has_column_privilege(role_name, 'public.lessons', col, 'SELECT') then
        raise exception '% cannot read lessons.%', role_name, col;
      end if;
    end loop;
    foreach col in array array['review_note', 'delete_request_note', 'created_by', 'reviewed_by', 'delete_requested_by'] loop
      if has_column_privilege(role_name, 'public.lessons', col, 'SELECT') then
        raise exception '% can still read lessons.%', role_name, col;
      end if;
    end loop;
  end loop;
end $$;

select 'lessons_columns ok';
