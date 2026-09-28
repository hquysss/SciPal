-- Teacher capacity (billing Task 4, spec §5): active classes, students per class and active
-- authored exams are checked where the row is added, so every path (create, join, import) is held
-- to the owner's plan and two requests cannot both take the last place. Existing rows over a limit
-- stay; only adding more is refused. Admin-owned rows are not limited.
--
-- A refusal raises P0001 'QUOTA_EXCEEDED' with detail = the metric and hint = the limit.

create or replace function public.billing_capacity_limit(p_owner uuid, p_metric text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit integer;
begin
  select q.quota_limit into v_limit
    from public.billing_get_effective_quotas(p_owner, pg_catalog.now()) as q
   where q.metric = p_metric;
  return v_limit;
exception
  -- Admins (and anything without a plan) are not limited.
  when sqlstate '22023' then return null;
end;
$$;
revoke execute on function public.billing_capacity_limit(uuid, text) from public, anon, authenticated;

create or replace function public.billing_enforce_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_metric text;
  v_limit integer;
  v_count integer;
begin
  if tg_table_name = 'class_rooms' then
    v_owner := new.teacher_id;
    v_metric := 'active_classes';
  elsif tg_table_name = 'class_members' then
    select c.teacher_id into v_owner from public.class_rooms as c where c.id = new.class_id;
    v_metric := 'students_per_class';
  else
    -- exam_blueprints: only an active exam of an author counts.
    if new.created_by is null or new.status not in ('draft', 'pending_review', 'published') then
      return new;
    end if;
    if tg_op = 'UPDATE' and old.status in ('draft', 'pending_review', 'published') then
      return new;
    end if;
    v_owner := new.created_by;
    v_metric := 'active_authored_exams';
  end if;
  if v_owner is null then
    return new;
  end if;

  v_limit := public.billing_capacity_limit(v_owner, v_metric);
  if v_limit is null then
    return new;
  end if;

  -- One writer per owner and metric (per class for members) at a time: the count below is exact.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_metric || ':' || case when v_metric = 'students_per_class' then new.class_id::text else v_owner::text end, 0));

  if v_metric = 'active_classes' then
    select count(*) into v_count from public.class_rooms as c where c.teacher_id = v_owner;
  elsif v_metric = 'students_per_class' then
    if exists (select 1 from public.class_members as m where m.class_id = new.class_id and m.student_id = new.student_id) then
      return new; -- already a member: the primary key answers this insert
    end if;
    select count(*) into v_count from public.class_members as m where m.class_id = new.class_id;
  else
    select count(*) into v_count
      from public.exam_blueprints as e
     where e.created_by = v_owner
       and e.status in ('draft', 'pending_review', 'published')
       and e.id is distinct from new.id;
  end if;

  if v_count >= v_limit then
    raise exception using errcode = 'P0001', message = 'QUOTA_EXCEEDED', detail = v_metric, hint = v_limit::text;
  end if;
  return new;
end;
$$;
revoke execute on function public.billing_enforce_capacity() from public, anon, authenticated;

create trigger class_rooms_capacity
  before insert on public.class_rooms
  for each row execute function public.billing_enforce_capacity();
create trigger class_members_capacity
  before insert on public.class_members
  for each row execute function public.billing_enforce_capacity();
create trigger exam_blueprints_capacity
  before insert or update of status on public.exam_blueprints
  for each row execute function public.billing_enforce_capacity();
