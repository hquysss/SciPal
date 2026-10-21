-- Sales switch (spec docs/superpowers/specs/2026-10-21-sales-closed-until-legal-design.md): while
-- sales_open is false the plans stay visible but nobody can buy (backend refuses new orders, web
-- shows "Sắp mở bán" with sales_note). Admins change both at /admin/site.
--
-- Defaults to closed: SciPal has no legal basis to sell yet. Additive; the old backend ignores the
-- columns, so apply this before the backend that reads them.
-- Rollback: set sales_open = true, or drop both columns.

alter table public.site_settings
  add column if not exists sales_open boolean not null default false,
  add column if not exists sales_note jsonb not null default '{}'::jsonb
    check (
      jsonb_typeof(sales_note) = 'object'
      and length(coalesce(sales_note ->> 'vi', '')) <= 400
      and length(coalesce(sales_note ->> 'en', '')) <= 400
    );
