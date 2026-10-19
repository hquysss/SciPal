-- Widens the 3D tag: every simulation drawn with three.js, not only kinds named "-3d" (knee reflex, skin senses,
-- damped pendulum and the history campaign maps are 3D too). Replaces the function from 20261020120000.
create or replace function public.subject_lesson_tags(p_subject uuid)
returns table (lesson_id uuid, tags text[])
language sql
stable
security definer
set search_path = public
as $$
  with ls as (
    select l.id, l.blocks from public.lessons l
    where l.subject_id = p_subject and l.status = 'published'
  ),
  hot as (
    select p.lesson_id from public.progress p
    join ls on ls.id = p.lesson_id
    where p.completed_at > now() - interval '30 days'
    group by p.lesson_id
    having count(*) >= 3
    order by count(*) desc
    limit 3
  )
  select ls.id, array_remove(array[
    case when exists (
      select 1 from jsonb_array_elements(case when jsonb_typeof(ls.blocks) = 'array' then ls.blocks else '[]'::jsonb end) b
      where b->>'type' = 'interactive' and b->>'kind' in ('knee-reflex', 'skin-senses', 'circulation-3d', 'graph-3d', 'harmonic-3d', 'damped-pendulum', 'wave-3d', 'solid-3d', 'history-map')
    ) then '3d' end,
    case when exists (select 1 from public.lesson_videos v where v.lesson_id = ls.id and v.status = 'published') then 'video' end,
    case when exists (
      select 1 from public.questions q
      where q.lesson_id = ls.id and q.type = 'code' and q.usage = 'practice' and q.status = 'published'
    ) then 'code' end,
    case when exists (
      select 1 from public.questions q
      where q.lesson_id = ls.id and q.type <> 'code' and q.usage = 'practice' and q.status = 'published'
    ) then 'practice' end,
    case when ls.id in (select hot.lesson_id from hot) then 'hot' end
  ], null)
  from ls;
$$;

revoke all on function public.subject_lesson_tags(uuid) from public;
grant execute on function public.subject_lesson_tags(uuid) to anon, authenticated;
