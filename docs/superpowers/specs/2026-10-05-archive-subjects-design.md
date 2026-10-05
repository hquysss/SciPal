# Archive (delete) subjects, subjects with lessons first (design)

Status: approved in chat 05/10/2026 ("áp dụng cho cả hai, làm luôn"). Scope: admin deletes a subject as a reversible hide; subjects that have published lessons sort first, for admins and learners.

## Decisions (from the user)

- "Xóa môn" **hides** the subject and can be restored. Lessons, questions, terms, exams, XP, streaks and classes of the subject are not touched.
- Subjects with at least one **published** lesson come first. Applies to the admin list and to the learner-facing catalog (landing cards and `/subjects`). Within each group the existing `sort_order` is kept.
- No permanent delete, no create/edit-subject UI in this change.

## Facts that shape the design (verified in code)

- Subjects are seeded content; there is no admin subject UI today (`frontend/app/admin/*` has topics, terms, lessons…).
- The browser reads `subjects` through RLS policy "subjects: public read" (`using (true)`, migration `20260926090000_security_hardening_rls.sql`). The backend uses the service role and bypasses RLS.
- Many tables reference `subjects(id)` without cascade (lessons, questions, exam_blueprints, xp_log, streaks, class_rooms, badges, …), so a hard delete is destructive; hence hide.
- Learner catalog ordering comes from one function, `expandSubjectsByLevel` in `frontend/features/landing/getLandingData.ts`, which already knows which subject/level has published lessons (`status: 'active' | 'upcoming'`). `SubjectsPage` and the landing read its output.
- Admin-only routes use the `requireAdmin` preHandler pattern (`backend/src/routes/adminPlans.ts`). Admin tool pages are listed in `ADMIN_GROUPS` (`frontend/features/admin/AdminHub.tsx`).

## Design

1. **Data.** `subjects.archived_at timestamptz` (null = in use). The public read policy becomes `using (archived_at is null)` for `anon, authenticated`, so every browser query (landing, subject page, glossary, progress) stops seeing an archived subject. Migration is idempotent.
2. **Admin API** (`backend/src/routes/adminSubjects.ts`, admin only, registered in `index.ts`):
   - `GET /api/admin/subjects` returns every subject with `archived_at` and counts `{ topics, lessons_published, lessons_draft, questions, classes }`, sorted by `sortAdminSubjects`: active (not archived) subjects with `lessons_published > 0` first, then the other active subjects, then archived; each group by `sort_order`.
   - `POST /api/admin/subjects/:id/archive` and `.../restore` set/clear `archived_at`; unknown id gives 404; repeating the call is a no-op success. Responses carry bilingual `{ error, error_en }` on failure.
3. **Backend exclusion.** Because the backend ignores RLS, every backend path that serves learners or lets someone create content in a subject must treat an archived subject as missing: public exam list and exam questions/attempt start, public terms list, tutor lesson context, class creation, and creating a topic, lesson, question, exam or term in a subject. Reads return "not found" or omit the row; writes return a bilingual 400 ("Môn học này đã bị xóa." / "This subject was removed."). Staff pickers of subjects exclude archived ones.
4. **Learner ordering.** `expandSubjectsByLevel` returns, within each education level, `active` subjects before `upcoming` ones, keeping `sort_order` inside each group (stable). No change to level order.
5. **Learner pages with a missing subject.** Where a query embeds `subjects(...)` and the row is now hidden (progress page, tutor lessons), rows whose subject is null are omitted instead of crashing.
6. **Admin UI.** `/admin/subjects` (guarded like other admin pages), linked from the "Nội dung" group of `AdminHub`. Active list with counts (published lessons, draft lessons, questions, classes) and a "Xóa môn" button that opens a confirm dialog stating that learners will no longer see the subject, nothing is deleted, and it can be restored. A second section "Đã xóa" lists archived subjects with "Khôi phục". Bilingual, theme tokens only, "bạn", no "Vui lòng".

## Testing

- Pure: `sortAdminSubjects`, `expandSubjectsByLevel` ordering (active before upcoming within a level, `sort_order` kept, level order unchanged).
- Routes: admin only (403 otherwise), list shape and order, archive/restore, 404, idempotence.
- Exclusion: for each backend path in item 3, a test that an archived subject's content is not served or not creatable.
- Migration contract test (regex on SQL like the other migration tests).
- UI: list renders both sections, archive confirm calls the API and moves the row, restore moves it back, error shown bilingual.

## Open items

- Direct fetches of a lesson, topic or term by id (not through the subject) are not blocked by the subject's `archived_at`; learner pages reach lessons through the subject slug, which 404s. Accepted for this change.
- Next.js pages that cache the catalog may show an archived subject until their cache refreshes (`/subjects` is `force-dynamic`; check the landing page).
- Migration is not applied to the remote database by this change.
