# Tải đề thi không trừ lượt — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). Steps use checkbox syntax. TDD: test trước, thấy đỏ, rồi code.

**Goal:** Tải đề thi (từng đề và cả loạt) không bắt đầu lượt thi; lượt, XP và streak tính khi nộp.
**Architecture:** Gói đề tải bằng route mới không cần lượt. Thiết bị tự sinh `attempt_id` và `started_at`. `POST /api/score/exam` tạo lượt (giữ quota) khi `attempt_id` chưa có, rồi chấm, cộng XP, cộng streak.
**Tech Stack:** Fastify + Supabase, Next.js, vitest, service worker.
**Spec:** `docs/superpowers/specs/2026-10-21-exam-download-no-attempt-design.md`

## Global Constraints
- Server quyết định chấm, XP, streak, quota (invariant #4); client chỉ hiện "tạm tính".
- Song ngữ `{vi,en}`; không màu cứng; không migration.
- Nhánh `fix/close-public-api` (PR #233), không mở PR khác. Chỉ commit khi chủ dự án bảo.
- `packages/types` có bản sao byte-giống ở backend: không đụng `examScoring`/`practiceGrading`.

## Rulings (đã quyết, ghi để duyệt)
- Hết lượt khi nộp trả **409** `QUOTA_EXCEEDED` (không dùng 429 để hàng đợi không nhầm với giới hạn tốc độ).
- `started_at` do máy gửi: kẹp vào `[now − 7 ngày, finished_at]`; ngoài khoảng đó coi là `now`. Lượt tạo lúc nộp được ghi `created_at = started_at` đã kẹp để `finished_at` không bị kéo về giờ nộp.
- Đề của giáo viên/admin không tính quota (như hiện nay); vẫn cộng XP/streak.

## Review Focus
- Nộp hai lần cùng `attempt_id` (hai tab, hoặc gửi lại sau mất mạng): một lượt, một lần XP, một lần streak.
- Hết lượt khi nộp: không XP, không streak, không tạo `exam_attempts`, quota không giữ.
- Đề nhiều môn: có điểm, không XP, không streak.
- `finished_at` ở tương lai xa hoặc `started_at` rất cũ: bị kẹp.
- Đăng xuất: gói đề và trang `/exam`, `/exam/<id>` đã lưu bị xóa.

---

### Task 1: Backend — nộp bài tạo lượt, XP và streak
**Files:** Modify `backend/src/routes/exam.ts`; Test `backend/src/__tests__/exam.test.ts`.
**Interfaces:** Produces `openAttempt(app, user, blueprintId, attemptId, startedAt?)` trả `{ ok: true; remaining; period } | { ok: false; reply }`; `POST /api/score/exam` nhận thêm `started_at?: string`, trả thêm `new_streak`; 409 `{ code: 'QUOTA_EXCEEDED', ...bi }` khi hết lượt.
- [ ] Viết test (đỏ trước): (a) nộp `attempt_id` mới tạo đúng một `exam_attempts` + giữ và commit quota một lần; (b) nộp lại cùng id trả kết quả đã lưu, không thêm XP/streak/quota; (c) hết lượt → 409, không XP, không dòng `exam_attempts`; (d) đề một môn gọi streak với ngày `finished_at` đã kẹp, đề nhiều môn không; (e) `started_at` ngoài khoảng bị kẹp; (f) giáo viên không bị trừ quota.
- [ ] Tách thân route `POST /api/exam/:blueprintId/attempts` (quyền tính năng, `loadBlueprint` với viewer, `reserveQuota`, insert) thành `openAttempt`; route cũ gọi lại nó, hành vi cũ giữ nguyên (test cũ phải xanh).
- [ ] Trong `/api/score/exam`: khi chưa có lượt và `blueprint` tồn tại, gọi `openAttempt(..., startedAtClamped)`; lỗi quota → 409. Sau khi lưu kết quả lần đầu: `touchStreak(supabase, uid, subjectId, submittedAt, log)` khi đề một môn; thêm `new_streak` vào kết quả.
- [ ] Chạy `pnpm --filter @scipal/api test -- exam` xanh.

### Task 2: Backend — gói đề không cần lượt
**Files:** Modify `backend/src/routes/exam.ts`; Test `exam.test.ts`.
**Interfaces:** Produces `GET /api/exam/:blueprintId/offline` → `{ blueprint, questions, keys }`, `Cache-Control: no-store`. Bỏ `GET /api/exam/attempts/:attemptId/offline`.
- [ ] Test (đỏ): khách 401; không có quyền tính năng 403; đề không tồn tại/không xem được 404; trả đủ `keys` mọi câu; **không** tạo `exam_attempts`, không gọi `reserveQuota`/`settleQuota`; đường cũ 404.
- [ ] Cài route mới dùng `loadBlueprint({ viewer })` + `loadExamQuestions` + `toLearnerQuestion`; xóa route cũ và test cũ của nó.
- [ ] `pnpm --filter @scipal/api test` xanh.

### Task 3: Frontend — tải không lượt, nộp mang `started_at`, hết lượt
**Files:** Modify `frontend/features/exam/examAttempt.ts` (`fetchExamPack(blueprintId, token)`), `offlineExam.ts` (`saveExamForOffline` không gọi `start`; sinh `attempt_id` bằng `crypto.randomUUID()`; `postExamSubmit` gửi `started_at`), `lib/pwa/pendingPractice.ts` (`PendingExam.started_at?`; `flushExams`: 409 → bỏ khỏi hàng đợi, kết quả `{ not_counted: true }`; `ExamSyncResult.not_counted?`), `ExamRunner.tsx` (đưa `pack.started_at` vào hàng đợi và vào body nộp online khi dùng gói; 409 → thông báo "chưa được tính vì hết lượt", giữ câu trả lời; `EXAM_SYNCED` có `not_counted` → thông báo), `components/pwa/PendingSync.tsx` (đếm/thông báo `not_counted`), `ExamStart.tsx` (đổi chữ). Test: `offlineExam.test.ts`, `examAttempt.test.ts`, `pendingPractice.test.ts`, `ExamRunner` tests.
**Interfaces:** Consumes Task 1–2.
- [ ] Test (đỏ): `saveExamForOffline` không gọi `start` và lưu gói có `attempt_id` hợp lệ; `flushExams` 409 → `not_counted`, 404/400 → `gone`, lỗi khác giữ hàng đợi; `postExamSubmit` gửi `started_at`; runner hiện thông báo hết lượt, không mất bài.
- [ ] Cài như trên; chữ "Tải đề sẽ tính một lượt thi ngay" thành "Tải đề không trừ lượt; lượt tính khi bạn nộp bài." (song ngữ), cả `SaveExamOffline` và `ExamStart`.
- [ ] `pnpm --filter @scipal/web test -- features/exam components/pwa lib/pwa` xanh.

### Task 4: Frontend — "Lưu các đề" và trang `/exam` offline
**Files:** Create `frontend/features/exam/SaveExamsButton.tsx` (+ test); Modify `app/exam/page.tsx` hoặc `ExamBlueprintList` để đặt nút; `lib/pwa/examPacks.ts` (`clearExamPages` xóa cả `/exam`); `public/sw.js` + `lib/pwa/cacheNames.ts` (`v5`, giữ `/exam`; test cache name).
**Interfaces:** Produces `saveExamsOffline(blueprintIds, onProgress, deps?)` trả `{ saved: number; failed: number }`, theo mẫu `saveLessonsOffline`.
- [ ] Test (đỏ): lưu N đề báo tiến trình x/N, một đề lỗi không dừng cả loạt, đề đã lưu bỏ qua, không gọi `start`; `pageKept('/exam')` đúng; `clearExamPages` xóa `/exam` và `/exam/<id>`.
- [ ] Cài nút (chỉ hiện khi trình duyệt hỗ trợ và đang online, giống `SaveOfflineButton`); bump cache `v5`.
- [ ] Test xanh.

### Task 5: Tài liệu và cổng
**Files:** `AGENTS.md` (#4: gói đề thi cũng là ngoại lệ đáp án xuống máy, không cần lượt), `.agents/rules/02-domain-rules.md` §5, `PROJECT_STATE.md` (mục 21/10), spec (trạng thái đã duyệt; 409/7 ngày).
- [ ] `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build` đều xanh; ghi kết quả; commit khi chủ dự án bảo.
