-- Maintenance mode, switched at /admin/site: while on, everyone but admins sees the maintenance page
-- (the sign-in page stays open so admins can get in) and the backend answers 503.
alter table public.site_settings add column maintenance boolean not null default false;
