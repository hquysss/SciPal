-- Spoken tutoring and thinking settings, changed by admins at /admin/ai (backend/src/tutor/settings.ts).
-- voice_model null = TUTOR_VOICE_MODEL, then gemini-3.8-live (backend/src/tutor/settings.ts).
alter table public.ai_settings
  add column if not exists voice_model text
    check (voice_model is null or voice_model ~ '^[A-Za-z0-9._:/-]{1,100}$');

-- Voice chat on/off apart from the tutor, and how long the model thinks before answering
-- (Gemini's reasoning_effort; low was the fixed value before).
alter table public.ai_settings
  add column if not exists voice_enabled boolean not null default true,
  add column if not exists reasoning_effort text not null default 'low'
    check (reasoning_effort in ('low', 'medium', 'high'));
