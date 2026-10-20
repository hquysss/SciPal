# Thi thử offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Học sinh tải một đề khi có mạng (tiêu một lượt thi), làm và nộp khi mất mạng, thấy điểm tạm ngay; có mạng lại thì server chấm lại, lưu điểm và XP theo lúc nộp.

**Architecture:** Hàm chấm thi chuyển vào `packages/types/src/examScoring.ts` (bản sao byte ở backend, import `./examFormat.js` vốn đã là bản sao ở cả hai bên). Tải đề = `startExamAttempt` (route sẵn có, giữ một lượt) rồi `GET /api/exam/attempts/:id/offline` trả đề kèm đáp án của đúng phiên đó. Bài làm offline vào hàng đợi; `PendingSync` gửi qua `POST /api/score/exam` sẵn có, thêm `finished_at`.

**Spec:** `docs/superpowers/specs/2026-10-20-practice-xp-replaces-lesson-complete-design.md` mục 14–19 và 10b. Plan (a): `plans/2026-10-20-practice-xp-offline.md` (đã xong).

## Global Constraints

- Đề chỉ tải được khi phiên thi thuộc người gọi và còn `started`; không có phiên thì không có đáp án. Header `Cache-Control: no-store`.
- Giờ nộp tính theo `finished_at` của máy, kẹp trong `[exam_attempts.created_at, giờ server]`; không gửi `finished_at` thì dùng giờ server như hiện nay. XP thi (`correct_count × 15`, một lần mỗi đề) ghi `created_at` = giờ nộp đã kẹp.
- Nộp lại cùng `attempt_id` vẫn trả kết quả đã lưu (đã có), không cộng XP hay trừ lượt thêm.
- Nhãn kết quả tạm: vi `Kết quả tạm · chờ đồng bộ`, en `Provisional · waiting to sync`. XP tạm `correct_count × 15` chỉ để xem.
- Đề giao lớp: tải và thi offline như mọi đề, giáo viên không thấy dấu "offline".
- Gói đề trong `localStorage` theo người dùng và đề, xoá khi đăng xuất (cùng lúc với gói Tự luyện). Bài đang làm lưu theo `attempt_id` mỗi khi đổi đáp án.
- Service worker: chỉ `/exam/manage` còn trong `NOT_KEPT`; `VERSION` lên `v4` cả `sw.js` và `cacheNames.ts`.
- Câu lập trình HSG không có ở đề thi (đề chỉ gồm `mc`, `truefalse`, `short`), không làm offline.

## Review Focus

1. Mất mạng giữa lúc nộp (fetch ném lỗi): bài vào hàng đợi, điểm tạm hiện, không mất đáp án. Test ở Task 4.
2. Đồng hồ máy chỉnh lùi trước lúc bắt đầu phiên: `submitted_at` = `created_at` của phiên, không sớm hơn. Test ở Task 2.
3. Đóng tab rồi mở lại khi offline: đề, phiên và đáp án đang làm còn nguyên (không dựa vào `sessionStorage`). Test ở Task 4.
4. Đề bị gỡ trước khi đồng bộ (404): bỏ khỏi hàng đợi và báo học sinh; các bài khác vẫn gửi. Test ở Task 4.
5. HTML `/exam/<id>` được giữ trong cache không chứa dữ liệu riêng của người dùng. Kiểm ở Task 5.

---

### Task 1: Hàm chấm thi dùng chung

**Files:** Create `packages/types/src/examScoring.ts` + bản sao `backend/src/schemas/examScoring.ts`; Modify `backend/src/exam/scoring.ts` (re-export), `backend/src/routes/exam.ts` (`isCorrectAnswer` và `normalizeShortAnswer` chuyển đi, import lại), `packages/types/src/index.ts`, `backend/src/__tests__/simulations.test.ts` (thêm `'examScoring.ts'` vào danh sách so byte); Test `packages/types/src/__tests__/examScoring.test.ts`.

**Produces:** `scoreExam`, `trueFalseCredit`, `isEstimatedFormat`, `isCorrectAnswer(question: { type: string; data: Record<string, any> }, answer: ExamAnswer): boolean`, kiểu `ExamAnswer`, `ScoredSection`, `ExamScore`. Chỉ import `./examFormat.js`.

- [ ] Test: vài ca từ `backend/src/exam/scoring.test.ts` (generic 10 điểm, đúng-sai thang 0.1/0.25/0.5/1, `0,12` = `0.12`) chạy trên bản types; so byte.
- [ ] Chạy, thấy FAIL. Chuyển code. Chạy `pnpm --filter @scipal/types test` và `pnpm --filter @scipal/api test -- scoring exam simulations`: PASS.
- [ ] Commit `♻️ [refactor] exam: one scoring module shared by the server and the device`.

### Task 2: Route gói đề offline và giờ nộp

**Files:** Modify `backend/src/routes/exam.ts`; Test `backend/src/__tests__/exam-offline.test.ts`.

**Produces:**
- `GET /api/exam/attempts/:attemptId/offline` → 401 chưa đăng nhập; 404 khi phiên không thuộc người gọi, đã nộp, hoặc đề không còn (`loadBlueprint` với `viewer`). Trả `{ attempt_id, blueprint: BlueprintSummary, questions: <đã bỏ đáp án như route questions>, keys: Record<id, { type, data }> }`, `no-store`.
- `POST /api/score/exam` nhận thêm `finished_at?: string` (≤ 40 ký tự). `submitted_at` và `xp_log.created_at` = `clampFinishedAt(finished_at, attempt.created_at, now)` (export từ `routes/exam.ts`): không đọc được hoặc không gửi → now; > now + 5 phút → now; < created_at → created_at. `ATTEMPT_COLUMNS` thêm `created_at`.

- [ ] Test: offline cần phiên (401), từ chối phiên người khác / đã nộp (404), không lộ đáp án ở `questions`, có đáp án ở `keys`, `no-store`; `clampFinishedAt` 4 ca; nộp với `finished_at` hôm qua ghi `submitted_at` hôm qua; nộp lại trả kết quả cũ, không chèn XP.
- [ ] FAIL, viết, PASS (`pnpm --filter @scipal/api test -- exam`).
- [ ] Commit `✨ [feat] exam: offline package of a started attempt; submit time from the device, clamped`.

### Task 3: Gói đề và hàng đợi bài thi (frontend lib)

**Files:** Create `frontend/lib/pwa/examPacks.ts`; Modify `frontend/lib/pwa/pendingPractice.ts` (hàng đợi bài thi cùng file), `frontend/lib/pwa/practicePacks.ts` (`clearPacks` xoá cả gói đề); Test `frontend/lib/pwa/examPacks.test.ts`, `pendingPractice.test.ts`.

**Produces:**
- `type ExamPack = { user_id; blueprint_id; attempt_id; blueprint: BlueprintSummary; questions; keys }`; `saveExamPack`, `loadExamPack(userId, blueprintId)`, `saveDraft(attemptId, answers)`, `loadDraft(attemptId)`, `dropExam(userId, blueprintId, attemptId)`.
- `type PendingExam = { user_id; attempt_id; blueprint_id; answers: SubmittedAnswer[]; finished_at }`; `queueExam(row): 'queued' | 'kept' | 'failed'` (một lần mỗi `attempt_id`); `pendingExamsFor(userId)`; `flushExams(userId, post) → { synced; results: Array<{ blueprint_id; attempt_id; result?; gone?: true }> }`: 404 bỏ và trả `gone`; lỗi mạng/401/5xx dừng, giữ nguyên.

- [ ] Test: lưu/đọc gói theo người dùng; nháp theo phiên; hàng đợi một lần mỗi phiên; flush giữ khi lỗi mạng, bỏ khi 404, xoá khi thành công; `clearPacks` xoá gói đề.
- [ ] FAIL, viết, PASS.
- [ ] Commit `✨ [feat] offline: exam packs and a queue of exams submitted offline`.

### Task 4: ExamRunner offline

**Files:** Modify `frontend/features/exam/ExamRunner.tsx`, `ExamStart.tsx`, `frontend/features/exam/examAttempt.ts` (`fetchExamPack(attemptId, token)`), `frontend/components/pwa/PendingSync.tsx` (gửi cả bài thi, phát `EXAM_SYNCED`); Test `ExamRunner.view.test.tsx`, `PendingSync.test.tsx`.

- `ExamStart` thêm nút "Tải đề để thi offline" (vi) / "Save this exam for offline" (en), chỉ khi đã đăng nhập và có mạng: `startExamAttempt` → `fetchExamPack` → `saveExamPack` → `savePagesOffline(['/exam/<id>'])`. Xong: "Đã lưu đề. Bạn có thể thi khi không có mạng; lượt thi đã được tính." / "Exam saved. You can take it without a connection; the attempt is counted."
- `ExamRunner`: có gói của (người dùng, đề) thì dùng `attempt_id` của gói, không gọi `startExamAttempt`; lưu nháp mỗi lần đổi đáp án, mở lại thì nạp nháp. Nộp khi offline hoặc fetch ném lỗi mạng mà có gói: chấm bằng `scoreExam` + `isCorrectAnswer` với `keys`, `queueExam`, hiện `ExamResultView` với nhãn tạm và XP tạm. Có `EXAM_SYNCED` cho phiên đang hiện thì thay bằng kết quả server, bỏ nhãn.
- Không có gói mà offline: "Tải đề này khi có mạng để thi offline." / "Save this exam while online to take it offline."
- `PendingSync` gửi `postExamSubmit(blueprintId, attemptId, answers, finishedAt, token)`; đề bị gỡ thì báo "Một đề đã bị gỡ nên bài làm offline không được chấm." / "An exam was removed, so the answers made offline could not be graded."

- [ ] Test: nộp offline có gói → điểm tạm + nhãn, bài vào hàng đợi; fetch ném lỗi → như offline; mở lại nạp nháp và phiên từ gói; `EXAM_SYNCED` thay kết quả; PendingSync gửi bài thi, 404 hiện thông báo.
- [ ] FAIL, viết, PASS (`pnpm --filter @scipal/web test -- features/exam components/pwa lib/pwa`).
- [ ] Commit `✨ [feat] exam: take a saved exam offline with a provisional score that syncs`.

### Task 5: Service worker và kiểm tra

- [ ] `public/sw.js`: `NOT_KEPT` thay `'/exam'` bằng `'/exam/manage'`; `VERSION` `v4` ở `sw.js` và `cacheNames.ts`; test `lib/pwa/pwa.test.ts` thêm `isKept('/exam/abc') === true`, `isKept('/exam/manage') === false` (theo hàm sẵn có trong sw).
- [ ] Kiểm HTML `/exam/<id>` (bản build): tìm email, tên hiển thị, token trong HTML trả về; nếu có thì tách phần đó ra client trước khi bỏ `/exam` khỏi `NOT_KEPT`.
- [ ] `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`.
- [ ] Thử bằng Browser trên bản production (cần đăng nhập): tải đề, tắt mạng, thi và nộp, thấy điểm tạm; bật mạng, thấy điểm server.
- [ ] Cập nhật `PROJECT_STATE.md`. Commit `📝 [docs] state: offline exams`.
