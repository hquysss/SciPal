-- Harden the auth.users signup trigger function (Supabase advisor lints 0011, 0028, 0029).
-- Behaviour is unchanged: the body is the one deployed to production
-- (see supabase/full_schema_and_seed.sql), now with a pinned search_path and
-- every referenced object schema-qualified.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', pg_catalog.split_part(new.email, '@', 1)),
    'student'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the on_auth_user_created trigger should run this; triggers do not need
-- EXECUTE for the inserting role, so blocking /rest/v1/rpc/handle_new_user is safe.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
