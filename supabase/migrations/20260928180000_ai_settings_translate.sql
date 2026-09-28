-- Automatic translation settings next to the tutor's, changed by admins at /admin/ai
-- (backend/src/routes/aiSettings.ts, routes/translate.ts). Null limit = AUTHOR_TRANSLATE_DAILY_CHARS, then 200 000.
alter table public.ai_settings
  add column if not exists translate_enabled boolean not null default true,
  add column if not exists translate_daily_chars integer
    check (translate_daily_chars is null or translate_daily_chars between 1000 and 5000000);
