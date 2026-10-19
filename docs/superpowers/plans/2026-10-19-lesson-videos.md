# Lesson videos — plan (spec: ../specs/2026-10-19-lesson-videos-design.md)

Branch: new branch off main (not the open landing PR).

1. **DB** — migration `lesson_videos` + private bucket `lesson-videos`, RLS on. Additive only.
2. **Types** — Zod schemas in `@scipal/types` for the video response and admin patch.
3. **Backend (TDD)** — `GET /api/lessons/:id/video` with the access rule (global switch free / Plus student / admin, signed URL); `PATCH /api/admin/lesson-videos/:lessonId` (publish/draft). Tests: locked, free, plus, admin, no video.
3b. **Global switch** — `lesson_videos_access` (`free`|`plus`) in the site settings/features store + admin endpoint and switch; the access rule in step 3 reads it. Tests: `free` lets any viewer in, `plus` blocks non-Plus students.
4. **Frontend** — "Video" tab on the lesson page, locked state with upgrade link, admin Miễn phí / Plus switch. Vitest for the three states.
5. **Generator** — `backend/scripts/generate-lesson-video.ts` + Remotion composition (title, per-block scene, captions). ElevenLabs key in `backend/.env` only.
6. **Pilot** — generate one Tin học lesson, review the result by hand, publish.
7. **Verify** — `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`.

Needs from the user before step 5: ElevenLabs API key in `backend/.env` and a chosen Vietnamese voice id.
