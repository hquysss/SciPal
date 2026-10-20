-- Free access (migration 20261020180000_free_access.sql): while the admin switch is on, the metrics
-- that call no AI have no limit; AI keeps its plan limit. Runs after tutor_token_cases.sql.

reset role;
-- Stand-in for the table billing.sql does not create (migration 20261003070000_site_settings.sql).
create table public.site_settings (id smallint primary key default 1 check (id = 1));
insert into public.site_settings (id) values (1);
grant select, update on public.site_settings to service_role;

\ir ../migrations/20261020180000_free_access.sql

set role service_role;
do $$
declare
  c_student constant uuid := '00000000-0000-4000-8000-000000000004';
  c_teacher constant uuid := '00000000-0000-4000-8000-000000000003';
  c_hash constant text := repeat('a', 64);
  v_refused boolean;
begin
  -- Limit 0 on an AI and a non-AI metric for the student, one active class for the teacher (who has one).
  insert into public.account_quota_overrides (user_id, metric, limit_value, version) values
    (c_student, 'graded_exam_attempts', 0, 1),
    (c_student, 'tutor_tokens', 0, 1),
    (c_teacher, 'active_classes', 1, 1)
  on conflict (user_id, metric) do update set limit_value = excluded.limit_value, expires_at = null;

  -- Off: both refused, and no second class.
  begin
    perform public.billing_reserve_quota(c_student, 'graded_exam_attempts', gen_random_uuid(), c_hash, 1);
    raise exception 'Off: an exam attempt over the limit was held';
  exception when others then
    if sqlerrm <> 'QUOTA_EXCEEDED' then raise; end if;
  end;
  v_refused := false;
  begin
    insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-0000000000f1', c_teacher);
  exception when others then
    if sqlerrm <> 'QUOTA_EXCEEDED' then raise; end if;
    v_refused := true;
  end;
  if not v_refused then raise exception 'Off: a class over the limit was created'; end if;

  update public.site_settings set free_access = true where id = 1;

  -- On: the exam attempt and the class go through; the Professor is still refused.
  if (select q.quota_limit from public.billing_get_effective_quotas(c_student, now()) as q where q.metric = 'graded_exam_attempts') <> 2147483647 then
    raise exception 'On: the exam limit was not lifted';
  end if;
  if (select q.quota_limit from public.billing_get_effective_quotas(c_student, now()) as q where q.metric = 'tutor_tokens') <> 0 then
    raise exception 'On: the Professor limit changed';
  end if;
  perform public.billing_reserve_quota(c_student, 'graded_exam_attempts', gen_random_uuid(), c_hash, 1);
  begin
    perform public.billing_reserve_quota(c_student, 'tutor_tokens', gen_random_uuid(), c_hash, 1);
    raise exception 'On: Professor tokens over the limit were held';
  exception when others then
    if sqlerrm <> 'QUOTA_EXCEEDED' then raise; end if;
  end;
  insert into public.class_rooms (id, teacher_id) values ('10000000-0000-4000-8000-0000000000f1', c_teacher);

  update public.site_settings set free_access = false where id = 1;
  if (select q.quota_limit from public.billing_get_effective_quotas(c_student, now()) as q where q.metric = 'graded_exam_attempts') <> 0 then
    raise exception 'Off again: the exam limit did not come back';
  end if;
end;
$$;
reset role;
