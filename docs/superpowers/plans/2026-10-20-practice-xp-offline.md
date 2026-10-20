# Tự luyện XP + Tự luyện offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** XP của bài học chỉ đến từ câu trả lời đầu tiên của mỗi câu Tự luyện, bỏ nút "Đánh dấu hoàn thành", và Tự luyện làm được khi mất mạng (chấm tại máy, server chấm lại khi đồng bộ, tính theo lúc làm).

**Architecture:** Một hàm chấm dùng chung (`practiceGrading.ts`, bản ở `@scipal/types` và bản sao byte ở backend). Backend có một hàm `recordPractice` duy nhất ghi `practice_attempts`, XP, streak, `progress`; route `/check` (online) và `/sync` (offline) cùng gọi nó, khác nhau ở thời điểm `at`. Frontend lưu gói bài và hàng đợi câu trả lời trong `localStorage`; `checkPractice` tự rơi về chấm tại máy khi không có mạng.

**Tech Stack:** Fastify 4, Supabase Postgres (RLS), Next.js 15 / React 19, vitest, zod.

**Spec:** `docs/superpowers/specs/2026-10-20-practice-xp-replaces-lesson-complete-design.md` (mục 1–13 và 10b). Thi thử offline (mục 14–19) là plan (b), không làm ở đây.

## Global Constraints

- `PRACTICE_XP = {1: 10, 2: 15, 3: 25}`; `xp_log.reason = 'practice_ok:<question_id>'`; unique index `xp_log_practice_once_idx`.
- Hoàn thành bài: số câu hợp lệ đúng-lần-đầu ≥ 80% số câu hợp lệ của bài; `progress.score` = phần trăm đó, ghi một lần.
- Câu hợp lệ: `status = 'published'`, `usage = 'practice'`, nằm trong khối `quiz` của bài đã xuất bản, `type <> 'code'`, không phải HSG. Tác giả (`user.id === row.created_by`) và câu chưa xuất bản: chấm nhưng không ghi gì.
- Gói offline: chỉ `mc`, `truefalse`, `short`, `writing`; `Cache-Control: no-store`; cần đăng nhập.
- Thời điểm (10b): `at = answered_at`, nhưng giờ tương lai quá 5 phút → giờ server; sớm hơn `offline_downloads.downloaded_at` → `downloaded_at`; không có dòng tải → giờ server.
- Sync: tối đa 100 mục mỗi lần; xử lý theo `answered_at` tăng dần.
- Bất biến #4 sửa lần 2, chữ y nguyên spec mục 13, vào `AGENTS.md` và `.agents/rules/02-domain-rules.md` §5.
- Chữ hiển thị song ngữ, gọi người dùng là "bạn", không "Vui lòng", không gạch dài; chỉ class màu ngữ nghĩa (test `rawColors.test.ts`).
- Bản sao backend phải khớp byte (sau khi bỏ `\r`) với `packages/types/src`; vì tên file khác nhau (`question.ts` / `questions.ts`) nên `practiceGrading.ts` **không import gì**, tự khai báo kiểu cấu trúc tối thiểu.
- `VERSION` của `frontend/public/sw.js` và `frontend/lib/pwa/cacheNames.ts` lên `v3` cùng lúc.

## Review Focus

1. Hai tab cùng gửi câu đầu tiên một lúc: chỉ một dòng `practice_attempts`, XP cộng một lần (khoá chính + `ignoreDuplicates`, unique index xp_log). Test ở Task 3.
2. Mất mạng giữa chừng khi đang đồng bộ (fetch ném lỗi): hàng đợi giữ nguyên, không mất câu nào. Test ở Task 6.
3. Ngày làm cũ hơn `last_active` (đồng bộ bài hôm qua sau khi hôm nay đã học online): streak không lùi, không ghi đè `last_active`. Test ở Task 2.
4. Câu đã bị gỡ khỏi bài hoặc bỏ xuất bản trước khi đồng bộ: mục đó trả `gone`, client xoá khỏi hàng đợi, các mục khác vẫn được tính. Test ở Task 4.
5. Học sinh đăng xuất rồi người khác đăng nhập cùng máy: gói của người trước bị xoá; hàng đợi gắn `user_id` nên không gửi nhầm tài khoản. Test ở Task 6.

---

### Task 1: Hàm chấm dùng chung

**Files:**
- Create: `packages/types/src/practiceGrading.ts`, `backend/src/schemas/practiceGrading.ts` (bản sao byte)
- Modify: `packages/types/src/index.ts` (export), `packages/types/src/progress.ts` + `backend/src/schemas/progress.ts` (thêm `PRACTICE_XP`, giữ `LESSON_COMPLETE_XP` tới Task 5), `backend/src/routes/practice.ts` (xoá `normalize`, `normalizeShort`, `keyTermsUsed`, `explanationOf`, `responseProblem`, `checkPracticeAnswer`; re-export từ `../schemas/practiceGrading.js` để `games.ts`, `practiceCode.ts` và test cũ không đổi import)
- Test: `backend/src/__tests__/simulations.test.ts` (thêm `'practiceGrading.ts'` vào danh sách so byte), `packages/types/src/__tests__/practiceGrading.test.ts`

**Interfaces:**
- Produces:
  - `type GradedQuestion = { type: string; data: unknown }`
  - `type GradingResponse = { selected_option?: string; items?: Array<{ id: string; selected: boolean }>; short_answer?: string; writing_answer?: string; code?: unknown }`
  - `type GradingResult = { correct: boolean; items?: Array<{ id: string; correct: boolean }>; explanation?: { en: string; vi: string }; writing?: { used: string[]; missing: string[]; sample_answer: string } }` (gán được cho `PracticeCheckResult`)
  - `checkPracticeAnswer(row: GradedQuestion, response: GradingResponse): GradingResult`
  - `responseProblem(row: GradedQuestion, response: GradingResponse): { error: string; error_en: string } | null`
  - `keyTermsUsed(answer: string, terms: string[])`, `explanationOf(data: Record<string, unknown>)`
  - `PRACTICE_XP: Record<number, number>` trong `progress.ts`

- [ ] **Step 1:** Thêm `'practiceGrading.ts'` vào mảng file của test "backend mirror" trong `simulations.test.ts`; viết `practiceGrading.test.ts` (types) với vài ca y như `practice.test.ts` (mc đúng/sai, truefalse thiếu ý, short `'  hà   NỘI '` khớp `'Hà Nội'`, `0,12` khớp `0.12`, writing thiếu key term) và `expect(PRACTICE_XP).toEqual({ 1: 10, 2: 15, 3: 25 })`.
- [ ] **Step 2:** Chạy `pnpm --filter @scipal/api test -- simulations` và `pnpm --filter @scipal/types test -- practiceGrading`. Expected: FAIL (file chưa có).
- [ ] **Step 3:** Chuyển nguyên thân các hàm từ `practice.ts` sang `packages/types/src/practiceGrading.ts`, thay kiểu import bằng kiểu cấu trúc ở trên, tự định nghĩa `msg` cục bộ; copy y hệt sang backend; `practice.ts` re-export.
- [ ] **Step 4:** Chạy lại hai lệnh trên và `pnpm --filter @scipal/api test -- practice writing-practice games`. Expected: PASS.
- [ ] **Step 5:** Commit `♻️ [refactor] practice: one grading module shared by the server and the device`.

### Task 2: Migration và streak không lùi

**Files:**
- Create: `supabase/migrations/20261021090000_practice_attempts.sql`
- Modify: `backend/src/streaks/touchStreak.ts`
- Test: `backend/src/__tests__/streaks.test.ts`

**Interfaces:**
- Produces: bảng `practice_attempts (user_id uuid references profiles on delete cascade, question_id uuid references questions on delete cascade, correct boolean not null, created_at timestamptz not null default now(), primary key (user_id, question_id))`; bảng `offline_downloads (user_id uuid references profiles on delete cascade, lesson_id uuid references lessons on delete cascade, downloaded_at timestamptz not null default now(), primary key (user_id, lesson_id))`; cả hai `enable row level security`, chỉ policy `select` cho `auth.uid() = user_id`, không policy ghi. Index `create unique index if not exists xp_log_practice_once_idx on public.xp_log (user_id, reason) where reason like 'practice_ok:%';` (theo mẫu `20261020090000_code_xp_once.sql`).
- `touchStreak(supabase, userId, subjectId, now, log)` giữ chữ ký; thêm luật: nếu `row.last_active > today` thì trả `row.current_streak`, không ghi.

- [ ] **Step 1:** Test `keeps the streak when the day is older than last_active`: streak `{current_streak: 4, longest_streak: 6, last_active: '2026-10-21'}`, gọi với `now = 2026-10-20T10:00Z` → trả `4`, mock `upsert` không được gọi.
- [ ] **Step 2:** `pnpm --filter @scipal/api test -- streaks`. Expected: FAIL.
- [ ] **Step 3:** Viết migration và sửa `touchStreak`.
- [ ] **Step 4:** Chạy lại. Expected: PASS. Đọc lại migration theo skill `supabase-postgres-best-practices` (RLS, khoá ngoại có index nhờ khoá chính).
- [ ] **Step 5:** Commit `✨ [feat] practice: tables for first answers and offline downloads`.

### Task 3: Ghi câu trả lời đầu tiên khi chấm online

**Files:**
- Create: `backend/src/practice/record.ts`
- Modify: `backend/src/routes/practice.ts` (route `/check`), `packages/types/src/question.ts` + `backend/src/schemas/questions.ts` (thêm `lesson_completed?: boolean`, `new_streak?: number` vào `PracticeCheckResult`)
- Test: `backend/src/__tests__/practice-record.test.ts`, `backend/src/__tests__/practice.test.ts`

**Interfaces:**
- Produces:
  - `recordPractice(supabase: SupabaseClient, input: { userId: string; row: PracticeRow; correct: boolean; at: Date }, log): Promise<{ counted: boolean; xp_earned: number; new_streak: number; lesson_completed: boolean }>`
    1. `upsert` vào `practice_attempts` `{user_id, question_id, correct, created_at: at}` với `{ onConflict: 'user_id,question_id', ignoreDuplicates: true }` rồi `.select('question_id')`; mảng rỗng → `counted: false`, trả về toàn 0/false.
    2. `correct` → insert `xp_log {user_id, subject_id, delta: PRACTICE_XP[difficulty] ?? PRACTICE_XP[1], reason: 'practice_ok:<id>', created_at: at}`; lỗi `23505` → 0 XP; lỗi khác log và 0 XP. Có XP thì `touchStreak(..., at, log)`.
    3. Hoàn thành bài: tìm các bài đã xuất bản chứa câu (cùng truy vấn `contains` của `servable.ts`), với mỗi bài tính câu hợp lệ (`quizQuestionIds` + lọc `questions` published/practice/không code), đếm `practice_attempts` đúng của người này trên các id đó; ≥ 80% → `upsert progress {user_id, lesson_id, completed_at: at, score}` với `ignoreDuplicates: true` trên `user_id,lesson_id`; `lesson_completed` = có dòng mới được chèn.
  - Hằng `LESSON_DONE_SHARE = 0.8` trong `record.ts`.
- Route `/check`: sau khi chấm, nếu có `user.id`, `row.status === 'published'`, `user.id !== row.created_by`, `row.type !== 'code'` và không HSG → `recordPractice(..., at: new Date())`, gộp `xp_earned`, `new_streak`, `lesson_completed` vào phản hồi. Khách: phản hồi như cũ.

- [ ] **Step 1:** Viết test (mock theo `helpers/supabaseMock.js`):
  - `first right answer gives PRACTICE_XP by difficulty and touches the streak` (difficulty 2 → `xp_earned: 15`, xp_log nhận `reason: 'practice_ok:<Q>'`).
  - `first answer wrong, later right: 0 XP` (upsert trả `[]`).
  - `a duplicate xp_log (23505) gives 0 XP without an error`.
  - `the author and an unpublished preview record nothing` (không gọi `practice_attempts`).
  - `reaching 80% writes progress once and says lesson_completed` (4/5 đúng → `score: 80`); `3/5 does not`.
  - `uses at for every timestamp` (created_at của attempt, xp_log, progress = `at.toISOString()`).
  - Trong `practice.test.ts`: phản hồi `/check` của học sinh có `xp_earned`, `lesson_completed`; của khách không có và không chạm bảng nào.
- [ ] **Step 2:** `pnpm --filter @scipal/api test -- practice`. Expected: FAIL.
- [ ] **Step 3:** Viết `record.ts`, nối vào `/check`.
- [ ] **Step 4:** Chạy lại. Expected: PASS.
- [ ] **Step 5:** Commit `✨ [feat] practice: XP for the first answer to each question`.

### Task 4: Gói offline và đồng bộ

**Files:**
- Modify: `backend/src/routes/practice.ts`
- Test: `backend/src/__tests__/practice-offline.test.ts`

**Interfaces:**
- Consumes: `recordPractice` (Task 3), `checkPracticeAnswer`/`responseProblem` (Task 1).
- Produces:
  - `GET /api/practice/lessons/:lessonId/offline` → 401 nếu chưa đăng nhập; 404 như route `questions`. Trả `{ lesson_id, subject_id, downloaded_at, questions: PublicPracticeQuestion[], keys: Record<question_id, { type, difficulty, data }> }`, chỉ câu `mc|truefalse|short|writing` đã xuất bản (không dùng chế độ xem trước). `data` của key giữ nguyên `data` của câu (đủ `answer`, `items[].correct`, `answer_key`, `key_terms`, `sample_answer`, `explanation`). Header `Cache-Control: no-store`. Ghi `offline_downloads` bằng `upsert ... ignoreDuplicates: true` (giữ lần tải đầu); `downloaded_at` trả về là giá trị đã lưu.
  - `POST /api/practice/sync` body `{ attempts: Array<{ question_id: uuid, response: PracticeResponse, answered_at: ISO string }> }`, 1–100 mục (zod; sai → 400 cả lô). 401 nếu chưa đăng nhập. Mỗi mục, theo `answered_at` tăng dần: tải câu bằng `servableQuestion` bản không gửi reply (tách hàm `loadPracticeRow(app, user, id): Promise<PracticeRow | 'gone' | 'error'>` trong `servable.ts`, `servableQuestion` dùng lại nó); `gone` hoặc `code`/HSG → `{question_id, status: 'gone'}`; `responseProblem` → `{question_id, status: 'rejected'}`; lỗi DB → `{question_id, status: 'error'}`; còn lại chấm, `at = clampAnsweredAt(answered_at, downloadedAt, now)`, `recordPractice` → `{question_id, status: 'ok', ...checkResult, counted, xp_earned, new_streak, lesson_completed}`.
  - `clampAnsweredAt(answeredAt: string, downloadedAt: string | null, now: Date): Date` (xuất từ `backend/src/practice/record.ts`): không parse được hoặc không có `downloadedAt` → `now`; > `now + 5 phút` → `now`; < `downloadedAt` → `downloadedAt`.
  - `downloadedAt` lấy theo bài: một truy vấn `offline_downloads` cho người dùng ở đầu request, ánh xạ câu → bài qua `row.lesson_id` hoặc bài chứa câu (bài đầu tiên có dòng tải).

- [ ] **Step 1:** Test:
  - `offline package needs a session`, `has keys only for mc/truefalse/short/writing`, `sends no-store`, `records the first download only`.
  - `sync grades each attempt and returns server results`; `a gone question is reported and the rest still count`; `a malformed response is rejected per item`; `more than 100 attempts → 400`; `sync without a session → 401`.
  - `clampAnsweredAt`: tương lai 10 phút → now; trước lúc tải → lúc tải; không có dòng tải → now; hôm qua hợp lệ → giữ nguyên.
  - `yesterday's offline answer counts on yesterday`: `recordPractice` được gọi với `at` = `answered_at`.
- [ ] **Step 2:** `pnpm --filter @scipal/api test -- practice-offline`. Expected: FAIL.
- [ ] **Step 3:** Viết `loadPracticeRow`, `clampAnsweredAt`, hai route.
- [ ] **Step 4:** Chạy `pnpm --filter @scipal/api test`. Expected: PASS toàn bộ backend.
- [ ] **Step 5:** Commit `✨ [feat] practice: offline packages and sync, counted at the time of answering`.

### Task 5: Bỏ "Đánh dấu hoàn thành" và sửa bất biến #4

**Files:**
- Delete: `backend/src/routes/score.ts` (chỉ chứa `/api/score/lesson`), `backend/src/__tests__/score.test.ts`, `frontend/features/lessons/LessonCompletionBar.tsx` + `.test.tsx`
- Modify: `backend/src/index.ts` (bỏ `scoreRoutes`), `packages/types/src/progress.ts` + bản sao (bỏ `LESSON_COMPLETE_XP`), `frontend/lib/api.ts` (bỏ `postScoreLesson`), `frontend/app/[subject]/[lesson]/page.tsx` (bỏ prop `completion`), `LessonPartsView.tsx` (bỏ prop `completion` nếu không còn ai dùng), `AGENTS.md` (bất biến #4), `.agents/rules/02-domain-rules.md` §5 (bỏ dòng `/api/score/lesson` và ngoại lệ `pendingCompletions`, thay bằng chữ mục 13 của spec; ghi XP Tự luyện qua `/api/practice/check` và `/api/practice/sync`)

- [ ] **Step 1:** `grep -rn "score/lesson\|LESSON_COMPLETE_XP\|postScoreLesson\|LessonCompletionBar" backend/src frontend packages --include=*.ts --include=*.tsx` để lấy danh sách chỗ dùng (bỏ qua `node_modules`).
- [ ] **Step 2:** Xoá/sửa theo danh sách. `PendingSync` và `pendingCompletions` còn dùng `postScoreLesson`; tạm để hai file này cho Task 6 viết lại (Task 5 và 6 commit liền nhau nếu typecheck chưa qua giữa chừng).
- [ ] **Step 3:** `pnpm turbo typecheck` sau Task 6. Expected: 7/7.
- [ ] **Step 4:** Commit `♻️ [refactor] lessons: drop the mark-complete button; XP comes from practice`.

### Task 6: Gói bài, hàng đợi và chấm tại máy (frontend)

**Files:**
- Create: `frontend/lib/pwa/practicePacks.ts`
- Rewrite: `frontend/lib/pwa/pendingCompletions.ts` → `frontend/lib/pwa/pendingPractice.ts` (giữ `recordStreak`, `estimateStreak`, `read`/`write`, nhưng khoá streak theo `subject_id`)
- Modify: `frontend/features/lessons/practiceApi.ts`
- Test: `frontend/lib/pwa/practicePacks.test.ts`, `frontend/lib/pwa/pendingPractice.test.ts` (thay `pendingCompletions.test.ts`), `frontend/features/lessons/practiceApi.test.ts`

**Interfaces:**
- Consumes: `checkPracticeAnswer`, `responseProblem`, `PRACTICE_XP` từ `@scipal/types`; route Task 4.
- Produces:
  - `type PracticePack = { user_id: string; lesson_id: string; subject_id: string; downloaded_at: string; questions: PublicPracticeQuestion[]; keys: Record<string, { type: string; difficulty: number; data: unknown }> }`
  - `practicePacks.ts`: `savePack(pack, store?)` (khoá `scipal-practice-pack:<user_id>:<lesson_id>`, trả `false` khi đầy), `loadPack(userId, lessonId, store?)`, `clearPacks(store?)` (xoá mọi khoá có tiền tố), `downloadPacks(lessonIds: string[], token: string, userId: string, fetcher?) : Promise<{ saved: number; failed: number }>`.
  - `pendingPractice.ts`: `type PendingAnswer = { user_id; question_id; lesson_id; subject_id; response: PracticeResponse; answered_at: string }`; `queueFirstAnswer(row, store?): boolean` (đã có mục cùng `user_id+question_id` thì không thay, trả `true`); `pendingFor(userId, store?)`; `flushPractice(userId, post: (attempts) => Promise<SyncResult[]>, now?, store?) : Promise<{ synced: number; xp: number; results: SyncResult[] }>` gửi theo lô 100, xếp theo `answered_at`; mục `ok|gone|rejected` rời hàng đợi, `error` ở lại; `post` ném lỗi có `status` 401/≥500 hoặc không có `status` → dừng, giữ nguyên hàng đợi. `ok` có `new_streak` → `recordStreak(userId, subject_id, new_streak, now)`.
  - `type SyncResult = { question_id: string; status: 'ok' | 'gone' | 'rejected' | 'error'; correct?: boolean; xp_earned?: number; new_streak?: number; lesson_completed?: boolean } & Partial<PracticeCheckResult>`
  - `practiceApi.ts`: `checkPractice(lessonId: string | undefined, questionId: string, response: PracticeResponse): Promise<PracticeCheck>`; `PracticeCheck` thêm `provisional?: { xp: number; streak: number | null }` ở nhánh `ok`. Khi `navigator.onLine === false` hoặc fetch ném lỗi mạng: có gói của bài và câu có trong `keys` → kiểm `responseProblem` (lỗi → `{ok:false}`), chấm `checkPracticeAnswer`, `queueFirstAnswer`, phát `PENDING_CHANGED`, trả `{ ok: true, result, provisional: { xp: correct && đây là mục mới ? PRACTICE_XP[difficulty] : 0, streak: estimateStreak(...) } }`; không có gói → `{ ok: false, error: { vi: 'Tải bài này khi có mạng để làm offline.', en: 'Save this lesson while online to practise offline.' } }`. `postPracticeSync(attempts, token): Promise<SyncResult[]>`, `fetchPracticePack(lessonId, token)`.
  - Chuyển hằng `PENDING_CHANGED` sang `pendingPractice.ts` (PendingSync import lại).

- [ ] **Step 1:** Test:
  - `queueFirstAnswer keeps the first answer of a question` (lần hai khác response → hàng đợi vẫn response đầu).
  - `flushPractice drops ok/gone/rejected, keeps error`; `a thrown network error keeps the whole queue` (Review Focus 2); `a 401 keeps the queue`; `sends in answered_at order, 100 per batch` (150 mục → 2 lần `post`).
  - `pendingFor only returns this user's answers` và `clearPacks removes every pack, the queue stays` (Review Focus 5).
  - `savePack returns false when storage is full` (store ném `QuotaExceededError`).
  - `checkPractice offline with a pack grades on the device and queues` (provisional xp = 15 với difficulty 2, đúng); `offline without a pack says to save the lesson`; `a network error online falls back the same way`.
- [ ] **Step 2:** `pnpm --filter @scipal/web test -- lib/pwa features/lessons/practiceApi`. Expected: FAIL.
- [ ] **Step 3:** Viết ba module.
- [ ] **Step 4:** Chạy lại. Expected: PASS.
- [ ] **Step 5:** Commit `✨ [feat] offline: practice packs and a queue of first answers`.

### Task 7: Giao diện Tự luyện, đồng bộ, nút tải

**Files:**
- Modify: `frontend/features/lessons/PracticeSection.tsx` (prop `lessonId`, gọi `checkPractice(lessonId, …)` ở cả hai chỗ, nhãn tạm, XP), `LessonPartsView.tsx` (truyền `lessonId`), `frontend/components/pwa/PendingSync.tsx`, `frontend/features/lessons/SaveOfflineButton.tsx`, `frontend/app/[subject]/page.tsx`, `frontend/features/lessons/WritingAnswer.tsx` (nút nhận xét AI tắt khi offline, nếu chưa), `frontend/public/sw.js` + `frontend/lib/pwa/cacheNames.ts` (`v3`)
- Test: `PracticeSection.test.tsx`, `PracticeSection.interaction.test.tsx`, `frontend/components/pwa/pwa.test.tsx`, test của `SaveOfflineView`

**Interfaces:**
- Consumes: Task 6.
- `PracticeState` thêm `provisional?: Record<string, { xp: number; streak: number | null }>`; `withResult` nhận thêm `provisional?`. `usePracticeState` lắng nghe sự kiện `PRACTICE_SYNCED = 'scipal:practice-synced'` (detail `SyncResult[]`, phát từ `PendingSync`) và thay kết quả + xoá nhãn tạm cho các câu có `status: 'ok'`.
- Chữ (y nguyên):
  - Nhãn tạm: vi `Kết quả tạm · chờ đồng bộ`, en `Provisional · waiting to sync`; kèm `+{xp} XP tạm tính` / `+{xp} XP (estimate)` khi xp > 0.
  - Online có XP: vi `+{xp} XP`, en `+{xp} XP`.
  - Hoàn thành bài: vi `Bạn đã hoàn thành bài này.`, en `You have completed this lesson.`
  - Bài không có câu hợp lệ: giữ thông báo "chưa sẵn sàng" hiện có (spec: "Chưa có bài tập") → đổi thành vi `Bài này chưa có bài tập.`, en `This lesson has no practice yet.`
  - PendingSync: vi `{n} câu đang chờ đồng bộ.` / `Đã đồng bộ {n} câu, +{xp} XP (theo máy chủ).`; en `{n} answer(s) waiting to sync.` / `Synced {n} answer(s), +{xp} XP (from the server).`
- `PendingSync`: dùng `flushPractice` với `postPracticeSync`; sau khi chạy phát `PRACTICE_SYNCED`; `onAuthStateChange` gặp `SIGNED_OUT` → `clearPacks()`.
- `SaveOfflineButton({ lessons }: { lessons: Array<{ url: string; id: string }> })`: lưu trang như cũ rồi `downloadPacks(ids, token, userId)`; `saved`/`failed` tính theo bài (một bài lỗi khi trang hoặc gói lỗi). Trang môn truyền `{ url, id: lesson.id }`.

- [ ] **Step 1:** Test:
  - `shows the provisional label and estimated XP for an offline result`; `a PRACTICE_SYNCED event replaces it with the server result`.
  - `shows +XP and the completed message from the server`.
  - `PendingSync sends queued answers when back online and shows the server XP`; `signing out clears the packs`.
  - `SaveOfflineView counts a lesson as failed when its pack fails`.
  - `pwa.test.ts`: kiểm tra hiện có hai `VERSION` khớp, sửa giá trị mong đợi thành `v3`.
- [ ] **Step 2:** `pnpm --filter @scipal/web test -- features/lessons components/pwa lib/pwa`. Expected: FAIL.
- [ ] **Step 3:** Viết phần giao diện.
- [ ] **Step 4:** Chạy lại, rồi `pnpm --filter @scipal/web test -- rawColors`. Expected: PASS.
- [ ] **Step 5:** Commit `✨ [feat] lessons: practise offline with provisional results that sync to the server`.

### Task 8: Kiểm tra toàn bộ

- [ ] **Step 1:** `pnpm turbo typecheck` → 7/7. `pnpm turbo test` → PASS (ghi lại các `verify_*.test.ts` chưa theo dõi nếu fail vì thiếu file xuất, có từ trước).
- [ ] **Step 2:** `pnpm turbo build` → PASS.
- [ ] **Step 3:** Áp migration lên DB dev (live DB: hỏi chủ dự án trước). Chạy bản production (`next start`) với backend local, đăng nhập học sinh thử, trong Browser: trang môn bấm "Tải … bài để học offline"; mở một bài, tắt mạng (DevTools offline), làm 2 câu (1 đúng, 1 sai), thấy nhãn tạm và XP tạm; làm lại câu sai thành đúng, hàng đợi vẫn giữ câu đầu; bật mạng, thấy "Đã đồng bộ 2 câu, +… XP (theo máy chủ)" và nhãn tạm biến mất. Chụp màn hình làm bằng chứng.
- [ ] **Step 4:** Cập nhật `PROJECT_STATE.md` (mục 21/10: Tự luyện XP + offline; bỏ các dòng nói về hàng đợi hoàn thành bài). Commit `📝 [docs] state: practice XP and offline practice`.
