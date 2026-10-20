# Lesson videos — spec (2026-10-19)

## Goal
A "Video" tab on the lesson page. Videos are generated from lesson content (Remotion + ElevenLabs Vietnamese voice) and gated by one global Miễn phí / Plus switch.

## Decisions
- Language: Vietnamese only for now (`url` single column; add `_en` later without breaking).
- Voice: ElevenLabs TTS. The key lives only in `backend/.env` (invariant 5), so the generator runs from `backend/`.
- Access: one global switch `lesson_videos_access` = `free` | `plus` (default `plus`) for all videos at once; no per-video access. `plus` = Học sinh Plus and above (student role); admin always watches. Backend decides on each request; the client never receives a playable URL it may not watch.
- The switch lives in the existing site settings/features mechanism (`backend/src/site/features.ts`), changed by an admin from the admin UI.
- Generation is offline (admin command / CI), not on demand.
- First slice: one Tin học lesson end to end.

## Data
`lesson_videos(id, lesson_id fk unique, video_path, poster_path, duration_s, status text check in ('draft','published') default 'draft', created_at, updated_at)`. RLS on, no client policies; all reads through the backend. Files in a private Storage bucket `lesson-videos`.

## API (backend)
- `GET /api/lessons/:id/video` → `{ available, mode, locked, poster, url? }`. `url` is a short-lived signed URL, only when the viewer is allowed (mode `free`, or active student plan ≥ Plus, or admin).
- `PATCH /api/admin/lesson-videos/:lessonId` → set `status`; plus `PATCH /api/admin/lesson-videos-access` to set the global `free`/`plus` switch (admin only).

## UI (frontend)
Tab "Video" beside the lesson content. No published video → tab hidden. Locked → blurred poster + upgrade button to the pricing page. Admin sees the global Miễn phí / Plus switch. Colors only via `--accent`.

## Generator
`backend/scripts/generate-lesson-video.ts <lessonId>`: reads the lesson JSONB blocks → narration script (per block) → ElevenLabs audio → Remotion render (scenes + captions) → upload mp4 + poster → upsert `lesson_videos` as `draft`.

## Out of scope
English version, on-demand generation, batch of all lessons, video analytics.
