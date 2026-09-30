-- The Professor's voice in spoken sessions, picked by admins at /admin/ai. Null = TUTOR_VOICE_NAME,
-- then Charon (backend/src/tutor/settings.ts, which also lists the voices an admin may pick).
alter table public.ai_settings
  add column if not exists voice_name text
    check (voice_name is null or voice_name ~ '^[A-Za-z]{2,30}$');
