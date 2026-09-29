# Giao bài cho lớp — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (chủ dự án chọn làm trực tiếp). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Giáo viên giao bài học/đề đã xuất bản cho lớp; học sinh thấy, mở đúng bài và thấy "Đã làm"; giáo viên thấy n/m em đã làm.

**Architecture:** Migration nhỏ trên bảng `assignments` có sẵn; route Fastify mới `routes/assignments.ts` (service role, tự kiểm quyền chủ lớp/thành viên); "đã làm" đọc từ `progress.completed_at` và `exam_attempts.status='submitted'`. Frontend: mục trong trang lớp của giáo viên và trang `/classes` cho học sinh.

**Tech Stack:** Fastify 4, Supabase Postgres, Zod, Next.js 15 / React 19, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-29-class-assignments-design.md`

## Global Constraints

- Chỉ nội dung đã xuất bản: `lessons.status = 'published'`, `exam_blueprints.status = 'published'`.
- API không gửi đáp án/nội dung câu hỏi; chỉ tiêu đề, loại, link, hạn nộp, trạng thái.
- Link: bài học `/{subjects.slug}/{lessons.slug}`, đề `/exam/{blueprint.id}`.
- Lỗi `{ code, error, error_en }`; 404 cho lớp không phải của mình (không lộ lớp tồn tại).
- EN/VI qua `t()`, tokens sẵn có, không màu thô, 375px không cuộn ngang. TDD, không Prettier; `npx turbo run typecheck test lint` rồi `npx turbo run build`. Không đọc `.env`; hỏi trước khi áp migration.

## Review Focus

1. Giáo viên khác đoán id lớp: GET/POST/DELETE đều 404 — test ở Task 2.
2. Bài bị gỡ xuất bản sau khi giao: học sinh không thấy, giáo viên thấy `published: false` — test Task 2 và 3.
3. Học sinh thuộc nhiều lớp, cùng bài giao ở hai lớp: mỗi lớp một dòng, `done` giống nhau — test Task 3.
4. Hạn nộp đã qua lúc giao hoặc chuỗi không phải thời gian: 400 — test Task 2.
5. Lớp trống (0 học sinh): `memberCount 0`, không truy vấn `in ()` rỗng — test Task 2.

---

### Task 1: Migration ràng buộc giao bài

**Files:** Create `supabase/migrations/20260929120000_class_assignments.sql`; Modify `supabase/tests/billing.sql` (thêm `\ir` + khối test; bảng `assignments` stub cần tạo trong phần stub đầu file).

- [ ] Test SQL: chèn dòng có cả lesson_id và blueprint_id → lỗi check; chèn trùng (class, lesson) → lỗi unique; `authenticated` không insert được.
- [ ] Migration: `alter table public.assignments add column if not exists created_by uuid references auth.users(id) on delete set null;` + `check (num_nonnulls(lesson_id, blueprint_id) = 1)` (tên `assignments_one_content_check`, `not valid` rồi `validate`), unique index `(class_id, lesson_id) where lesson_id is not null` và `(class_id, blueprint_id) where blueprint_id is not null`, index `(class_id, created_at desc)`.
- [ ] Commit.

### Task 2: API giáo viên

**Files:** Create `backend/src/routes/assignments.ts`, `backend/src/__tests__/assignments.test.ts`; Modify `backend/src/index.ts`.

**Produces:** `assignmentRoutes: FastifyPluginAsync`; item DTO `AssignmentItem = { id, kind: 'lesson'|'exam', contentId, title: {en, vi}, href: string|null, published: boolean, dueAt: string|null, createdAt, doneCount: number, memberCount: number }`.

- [ ] Test: chủ lớp GET → items với doneCount từ progress/exam_attempts; giáo viên khác → 404; POST lesson đã xuất bản → 201, lesson nháp → 400 `CONTENT_NOT_PUBLISHED`, cả hai id hoặc không id → 400, dueAt quá khứ → 400, trùng (23505) → 409 `ALREADY_ASSIGNED`; DELETE → 204, id lạ → 404; `assignable?kind=lesson&q=` chỉ trả nội dung published (lọc theo môn của lớp nếu có).
- [ ] Implement: `requireTeacher` như classes.ts; `ownedClass(id, user)` đọc `class_rooms(id, teacher_id, subject_id)`; tra nội dung bằng `.in('id', ids)`; bỏ qua truy vấn done khi lớp trống.
- [ ] Commit.

### Task 3: API học sinh `GET /api/classes/mine`

**Files:** Modify `backend/src/routes/assignments.ts`, `backend/src/__tests__/assignments.test.ts`.

**Produces:** `{ classes: Array<{ id, name, teacherName: string|null, subject: {en, vi}|null, assignments: Array<AssignmentItem without doneCount/memberCount> & { done: boolean } }> }`.

- [ ] Test: chỉ lớp mình là thành viên; bài gỡ xuất bản bị ẩn; done đúng cho bài học (completed_at) và đề (submitted); không có lớp → `classes: []`.
- [ ] Implement, commit.

### Task 4: UI giáo viên

**Files:** Create `frontend/features/classes/assignmentsApi.ts`, `ClassAssignments.tsx`, `AssignDialog.tsx`, `ClassAssignments.test.tsx`; Modify `frontend/app/teacher/classes/[id]/page.tsx`.

- [ ] Test render: danh sách hiện "n/m em đã làm", hạn nộp, "Không còn xuất bản", trạng thái trống; không màu thô.
- [ ] Implement (client component, dùng `authoringCall`), hộp thoại dùng portal/primitives sẵn có của `CreateClassModal`; gỡ có xác nhận. Commit.

### Task 5: UI học sinh `/classes`

**Files:** Create `frontend/app/classes/page.tsx`, `frontend/features/classes/MyClasses.tsx`, `MyClasses.test.tsx`; Modify `frontend/middleware.ts` (+test), `frontend/components/nav/NavBar.tsx` (+test).

- [ ] Test render: lớp + bài, "Đã làm", "Quá hạn", trống ("Chưa vào lớp nào" + nút vào lớp), lỗi; middleware chuyển khách tới login; NavBar học sinh có "Lớp của em".
- [ ] Implement (dùng `JoinClassModal`, tải lại sau khi vào lớp). Commit.

### Task 6: Hoàn tất

- [ ] Full gate + build; QA trình duyệt 375/1280 sáng/tối nếu chạy được; cập nhật PROJECT_STATE + ghi chú 5c trong plan billing; push, PR.
