# Giữ bài chưa nộp, theo dõi chuyển tab, tiến độ Tự luyện — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans (inline). TDD: test trước, thấy đỏ, rồi code.

**Goal:** Không mất bài Tự luyện/Thi thử khi quên bấm nút; thi thử đếm lần rời tab (3 lần tự nộp); trang Tiến độ nói bài nào còn mấy câu Tự luyện chưa làm.
**Architecture:** Phần lớn ở trình duyệt (`localStorage`): nháp Tự luyện, bản ghi chạy bài thi (`started_at`, số lần rời trang). Backend chỉ thêm một route đọc `GET /api/practice/remaining`.
**Specs:** `docs/superpowers/specs/2026-10-21-dont-lose-unsubmitted-work-design.md`, `2026-10-21-practice-remaining-on-progress-design.md`

## Global Constraints
- Server quyết định chấm/XP/streak; client không tự "kiểm tra" thay người học.
- Song ngữ `{vi,en}`; `--accent`; không migration; đăng xuất xoá nháp và bản ghi chạy bài (`clearPacks`).
- Nhánh `feat/keep-unsubmitted-work` (từ `main` sau #233). Chỉ commit khi chủ dự án bảo.

## Rulings
- Bản ghi chạy bài thi: `scipal-exam-run:<attemptId>` = `{ started_at, leaves }`; mã lượt online đổi từ `sessionStorage` sang `localStorage`.
- Quá giờ + không nháp khi mở lại: bỏ lượt cũ và mở lượt mới (không nộp bài rỗng).
- Rời trang đếm bằng `visibilitychange` (hidden→visible); `blur` không đếm; lần 3 tự nộp.
- Danh sách "Bài đang làm dở": bài đã làm ≥ 1 câu và còn ≥ 1 câu chưa làm, tối đa 20.

## Review Focus
- Mở lại đề quá giờ có nháp: nộp một lần, không lặp; không nháp: không nộp bài rỗng.
- Đếm rời trang không cộng đôi khi sự kiện nổ hai lần; tải lại không đặt về 0.
- Nháp Tự luyện không làm hiện kết quả "đã kiểm tra" giả, và bị xoá khi đã kiểm tra.
- `/api/practice/remaining` không lộ dữ liệu người khác; câu lập trình/chưa đăng không tính.

### Task 1: Thi thử — bản ghi chạy bài, cảnh báo rời trang, hết giờ khi đã đóng
**Files:** Create `frontend/lib/pwa/examRun.ts` (+ test); Modify `features/exam/examAttempt.ts` (mã lượt vào `localStorage`), `features/exam/ExamRunner.tsx`, `lib/pwa/examPacks.ts` (`dropExam` xoá bản ghi), `lib/pwa/practicePacks.ts` (`clearPacks` xoá `scipal-exam-run:` và `scipal-exam-attempt:`); Test `ExamRunner.keep.test.tsx`.
**Interfaces:** Produces `loadRun`, `ensureRun(attemptId, startedAt?)`, `addLeave(attemptId)`, `dropRun`, `secondsLeft(run, minutes, now?)`, `MAX_LEAVES = 3`.
- [ ] Test (đỏ): `examRun` (tạo/đọc/đếm/xoá, `secondsLeft`); runner: đếm 1 lần cho mỗi hidden→visible, `blur` không đếm, cảnh báo "N/3", lần 3 nộp, số lần sống sau khi dựng lại, `beforeunload` chặn khi đang làm và không khi có kết quả, quá giờ có nháp tự nộp bản nháp, chưa quá giờ thì đồng hồ đúng, quá giờ không nháp mở lượt mới, màn kết quả hiện số lần rời trang.
- [ ] Cài; `pnpm --filter @scipal/web test -- features/exam lib/pwa` xanh.

### Task 2: Tự luyện — nháp, dải nhắc, "Kiểm tra N câu", cảnh báo rời trang
**Files:** Create `frontend/lib/pwa/practiceDraft.ts` (+ test); Modify `features/lessons/PracticeSection.tsx`, `lib/pwa/practicePacks.ts` (`clearPacks` xoá `scipal-practice-draft:`); Test `PracticeSection` tests.
**Interfaces:** Produces `loadPracticeDraft(lessonId)`, `savePracticeDraft(lessonId, answers)`, `dropPracticeDraft`.
- [ ] Test (đỏ): nháp lưu đáp án chưa kiểm tra và khôi phục; câu đã kiểm tra bị gỡ khỏi nháp; dải nhắc "Còn N câu chưa kiểm tra" và nút kiểm tra tất cả gọi `checkPractice` cho từng câu; `beforeunload` chỉ khi còn câu chưa kiểm tra.
- [ ] Cài; test xanh.

### Task 3: Backend — `GET /api/practice/remaining`
**Files:** Create `backend/src/practice/remaining.ts`; Modify `backend/src/routes/practice.ts`; Test `backend/src/__tests__/practice-remaining.test.ts`.
**Interfaces:** Produces `GET /api/practice/remaining` → `{ lessons: [{ lesson_id, slug, subject_slug, title, total, done, remaining, last_at }] }`.
- [ ] Test (đỏ): 3/5 làm → còn 2; đủ → không hiện; chưa làm câu nào → không hiện; câu `code`/chưa đăng không tính; tối đa 20, mới nhất trước; 401 khách; chỉ dữ liệu của người gọi.
- [ ] Cài; `pnpm --filter @scipal/api test` xanh.

### Task 4: Web — khối "Bài đang làm dở" ở Tiến độ
**Files:** Modify `frontend/features/progress/progressQueries.ts`, `ProgressView.tsx`, `app/progress/page.tsx`; Test `progressQueries.test.ts`, view test.
- [ ] Test (đỏ): lấy token từ phiên, gọi route, lỗi thì trả rỗng; khối hiện "còn Z câu", link tới bài, ẩn khi rỗng.
- [ ] Cài; test xanh.

### Task 5: Tài liệu và cổng
**Files:** `PROJECT_STATE.md`, spec (đã duyệt).
- [ ] `pnpm turbo typecheck`, `test`, `build` xanh; ghi kết quả.
