-- Site switches, changed by admins at /admin/site (backend/src/routes/siteSettings.ts):
-- whether new accounts may sign up, and which features are on. Everyone may read them (the web hides
-- what is off); only the backend (service_role) writes them.
--
-- features: a feature missing from the map is on. Keys: glossary, exam, pricing, classes,
-- guest_trial (see backend/src/site/features.ts).

create table public.site_settings (
  id smallint primary key default 1 check (id = 1),
  signup_enabled boolean not null default true,
  features jsonb not null default '{}'::jsonb check (jsonb_typeof(features) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
insert into public.site_settings (id) values (1);

alter table public.site_settings enable row level security;
create policy site_settings_read on public.site_settings for select to anon, authenticated using (true);
revoke all on public.site_settings from public, anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant select, insert, update on public.site_settings to service_role;

-- With sign-up closed, a new account that signs itself up (email or Google) is refused. Accounts an
-- admin creates carry an app_role in their app metadata and still go through.
create or replace function public.guard_signup_open()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((select s.signup_enabled from public.site_settings as s where s.id = 1), true)
     and not (coalesce(new.raw_app_meta_data, '{}'::jsonb) ? 'app_role') then
    raise exception using errcode = 'P0001', message = 'SIGNUP_CLOSED';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_signup_open() from public, anon, authenticated;

create trigger guard_signup_open before insert on auth.users
  for each row execute function public.guard_signup_open();
