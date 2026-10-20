# Chấm code kiểu OJ trong Tự luyện Tin học — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Câu hỏi lập trình (Python/C++) trong Tự luyện: học sinh gõ hoặc tải code, chạy thử, nộp; server chấm bằng bộ test ẩn qua Judge0.

**Architecture:** Dạng câu hỏi mới `code` trong `QuestionSchema` (dữ liệu, không code UI). Backend thêm module `judge/` (client Judge0, so output, gộp verdict) và hai route `code/run`, `code/submit` (+ `code/verify` cho giáo viên). Frontend thêm `CodeAnswer` vào `PracticeSection`, bố cục một cột: đề trên, editor dưới.

**Tech Stack:** Fastify 4 + Zod (backend, chạy Vercel serverless), Next.js 15 / React 19, Supabase Postgres, Judge0 CE (máy Linux riêng), vitest.

**Spec:** `docs/superpowers/specs/2026-10-19-code-judge-design.md`

## Global Constraints

- Test ẩn, `expected` của test ẩn, `explanation` không bao giờ nằm trong JSON gửi client trước khi nộp (invariant 4).
- `packages/types/src/question.ts` và `backend/src/schemas/questions.ts` giữ byte-identical (có test so sánh).
- Python và C++ duy nhất. Judge0 language id: Python `71`, C++ `54`.
- Giới hạn: code ≤ 65536 ký tự, `input`/`expected` mỗi test ≤ 65536 ký tự, 1–25 test, `time_limit_ms` 500–5000 (mặc định 2000), `memory_limit_mb` 16–256 (mặc định 128), output đọc về cắt 65536.
- Tần suất theo người dùng: `run` 10 lần/phút, `submit` 5 lần/phút (đếm bảng `code_runs`).
- Chờ Judge0 tối đa 20 giây mỗi request.
- Câu `code` chỉ `usage = 'practice'`. Không cấp XP, không lưu kết quả (giống Tự luyện hiện tại).
- Song ngữ EN/VI mọi chữ hiển thị; chỉ token màu có sẵn (`--accent`, `success`, `danger`…); vùng chạm ≥ 44px; không tràn ngang ở 375px.
- `pnpm turbo typecheck` sạch ở mọi package trước khi báo xong.

## Review Focus

- Học sinh nộp code in ra thừa dòng trống/khoảng trắng cuối dòng: vẫn `AC` (CRLF cũng vậy).
- Code vòng lặp vô hạn / ăn bộ nhớ: `TLE` / `MLE`, không treo request quá 20 giây.
- Judge0 sập hoặc trả 5xx: học sinh thấy "chưa chấm được, thử lại", không bị tính sai.
- Test ẩn có `expected` trùng chuỗi: không rò qua `/lessons/:id/questions`, lỗi biên dịch hay thông báo lỗi.
- Khách chưa đăng nhập bấm Nộp: được mời đăng nhập, backend trả 401, không gọi Judge0.
- Chuyển câu/tab giữa lúc đang chấm: kết quả đến muộn cho bản code đã sửa bị bỏ.

---

### Task 1: Loại câu hỏi `code` (types, schema backend, migration)

**Files:**
- Modify: `packages/types/src/question.ts`, `backend/src/schemas/questions.ts` (giữ y hệt)
- Create: `supabase/migrations/20261019120000_code_questions.sql`
- Modify: `packages/types/src/__fixtures__/questions.json` (+ bản dùng chung của backend nếu có)
- Test: `packages/types/src/question.test.ts` (hoặc file test question hiện có), `backend/src/__tests__/practice.test.ts`

**Interfaces:**
- Produces (từ `@scipal/types` và `schemas/questions.ts`):
  - `QUESTION_TYPES` thêm `'code'`; `EXAM_QUESTION_TYPES` không đổi.
  - `CODE_LANGUAGES = ['python','cpp'] as const`, `type CodeLanguage`.
  - Hằng: `MAX_CODE_CHARS = 65536`, `MAX_CODE_TESTS = 25`.
  - `type CodeTest = { input: string; expected: string; sample: boolean; points: number }`.
  - `type CodeVerdict = 'AC'|'WA'|'TLE'|'MLE'|'RE'|'CE'`.
  - `type CodeTestResult = { verdict: CodeVerdict; time_ms: number; memory_kb: number; stdout?: string; expected?: string }` (`stdout`/`expected` chỉ cho test mẫu).
  - `PracticeCheckResult.code?: { status: CodeVerdict; compile_message?: string; tests: CodeTestResult[] }`.
  - `PracticeResponseSchema` thêm `code: z.object({ language: z.enum(CODE_LANGUAGES), source: z.string().max(MAX_CODE_CHARS) }).optional()`.
  - `PublicPracticeQuestion.data` cho `code`: `{ stem; input_spec; output_spec; time_limit_ms; memory_limit_mb; starter: {python?: string; cpp?: string}; samples: Array<{input: string; expected: string}> }`.
  - `validateQuestionInput` nhận `type: 'code'`.

- [ ] **Step 1: Viết test thất bại**
  - `validateQuestionInput` chấp nhận câu `code` hợp lệ (1 test mẫu, `points ≥ 1`, giới hạn trong khoảng); từ chối: `usage: 'exam'`, không có test `sample: true`, 26 test, `time_limit_ms: 100`, `input` dài 65537 ký tự.
  - `toPublicPracticeQuestion({type:'code', data})` trả `samples` chỉ gồm test `sample: true`; `JSON.stringify` kết quả KHÔNG chứa `expected` của test ẩn và không chứa `explanation` (dùng chuỗi dấu `HIDDEN-EXPECTED-7`).
  - `PracticeResponseSchema` nhận `{ code: { language: 'cpp', source: 'x' } }`, từ chối `language: 'java'`.
  - Test so byte hai file schema đã có phải vẫn đạt; fixture `questions.json` thêm một câu `code` hợp lệ và một câu sai.
- [ ] **Step 2: Chạy `pnpm --filter @scipal/types test` và `pnpm --filter @scipal/api test -- practice`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt trong `packages/types/src/question.ts`**: thêm `CodeData` vào `AuthorQuestionSchema` (discriminated union), nhánh `code` trong `validateQuestionInput` (chặn `usage !== 'practice'` giống `writing`, bắt buộc có ≥ 1 test mẫu, `FIELD_NAMES` thêm `input_spec`, `output_spec`, `tests`, `time_limit_ms`, `memory_limit_mb`, `starter` song ngữ), `questionIncomplete` kiểm `input_spec`/`output_spec` có tiếng Anh, `toPublicPracticeQuestion` dựng từng trường (không spread). Sao chép nguyên file sang `backend/src/schemas/questions.ts`.
- [ ] **Step 4: Viết migration `20261019120000_code_questions.sql`**: mở rộng check `questions_type_check` thêm `'code'` (theo mẫu `20261013200000_writing_questions.sql`), constraint `questions_code_practice_only` (`type <> 'code' or usage = 'practice'`), bảng `public.code_runs (id uuid pk default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, kind text not null check (kind in ('run','submit','verify')), created_at timestamptz not null default now())` + index `(user_id, kind, created_at desc)`, `enable row level security` không policy (chỉ service role). Có test SQL PGlite cạnh test migration hiện có nếu repo có (theo mẫu `writing_questions`).
- [ ] **Step 5: Chạy lại hai lệnh test, xác nhận PASS; `pnpm turbo typecheck`**
- [ ] **Step 6: Commit** `✨ [feat] questions: code question type, schema and migration`

---

### Task 2: Lõi chấm (`backend/src/judge/`)

**Files:**
- Create: `backend/src/judge/compare.ts`, `backend/src/judge/judge0.ts`, `backend/src/judge/grade.ts`
- Test: `backend/src/__tests__/judge-compare.test.ts`, `backend/src/__tests__/judge-grade.test.ts`

**Interfaces:**
- Consumes: kiểu `CodeTest`, `CodeVerdict`, `CodeTestResult`, `CodeLanguage` (Task 1).
- Produces:
  - `outputsMatch(actual: string, expected: string): boolean` — chuẩn hoá `\r\n`→`\n`, bỏ khoảng trắng cuối mỗi dòng và các dòng trống cuối, rồi so bằng nhau.
  - `interface Judge0Client { runBatch(jobs: RunJob[]): Promise<RunOutcome[]> }` với `RunJob = { language: CodeLanguage; source: string; stdin: string; time_limit_ms: number; memory_limit_mb: number }` và `RunOutcome = { status_id: number; stdout: string; stderr: string; compile_output: string; time_ms: number; memory_kb: number }`; `class Judge0Unavailable extends Error`.
  - `createJudge0Client(opts: { url: string; token?: string; fetch?: typeof fetch; waitMs?: number }): Judge0Client` — POST `/submissions/batch?base64_encoded=true`, rồi poll `GET /submissions/batch?tokens=…&base64_encoded=true&fields=…` mỗi 500 ms đến khi mọi bài hết trạng thái 1–2 hoặc quá `waitMs` (mặc định 20000) → ném `Judge0Unavailable`; mọi lỗi mạng/5xx cũng thành `Judge0Unavailable`; header `X-Auth-Token` khi có token; `cpu_time_limit` = giây, `memory_limit` = KB, `enable_network=false` không cần gửi (mặc định).
  - `verdictOf(outcome: RunOutcome, limits: { memory_limit_mb: number }, matches: boolean): CodeVerdict` — status 3 → `AC` nếu `matches` else `WA`; 4 → `WA`; 5 → `TLE`; 6 → `CE`; 7–12 → `MLE` nếu `memory_kb ≥ memory_limit_mb*1024*0.95` else `RE`; còn lại ném `Judge0Unavailable`.
  - `gradeSubmission(args: { client: Judge0Client; language: CodeLanguage; source: string; tests: CodeTest[]; time_limit_ms: number; memory_limit_mb: number; reveal: 'samples' | 'all' }): Promise<{ status: CodeVerdict; compile_message?: string; tests: CodeTestResult[]; correct: boolean }>` — `status` là verdict đầu tiên khác `AC` theo thứ tự test (hoặc `AC`); `reveal: 'samples'` chỉ gắn `stdout`/`expected` cho test `sample`; `'all'` (giáo viên verify) gắn cho mọi test; `compile_message` cắt 2048 ký tự khi có `CE`; output cắt 65536.

- [ ] **Step 1: Viết test thất bại**
  - `outputsMatch`: `'1 2\r\n\r\n'` khớp `'1 2'`; `'1  2'` không khớp `'1 2'`; `'a \nb'` khớp `'a\nb'`; `''` khớp `''`.
  - `verdictOf`: bảng 3→AC/WA, 4→WA, 5→TLE, 6→CE, 11 với bộ nhớ vượt 95% → MLE, 11 bộ nhớ thấp → RE, 13 → ném `Judge0Unavailable`.
  - `gradeSubmission` với client giả: 3 test AC/WA/AC → `status: 'WA'`, `correct: false`; test ẩn WA không có `stdout`/`expected` trong kết quả (kiểm bằng `JSON.stringify`); `CE` ở test đầu → `status: 'CE'` và `compile_message` ≤ 2048; client ném `Judge0Unavailable` → hàm ném lại (không trả verdict).
  - `createJudge0Client` với `fetch` giả: gửi `X-Auth-Token`, dữ liệu base64, poll hai lần rồi trả kết quả; `fetch` trả 502 → `Judge0Unavailable`; hết `waitMs` (đặt 50) → `Judge0Unavailable`.
- [ ] **Step 2: Chạy `pnpm --filter @scipal/api test -- judge`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt ba file theo chữ ký trên.** `grade.ts` gom mọi test vào một `runBatch` (một lượt gọi Judge0).
- [ ] **Step 4: Chạy lại, xác nhận PASS; `pnpm --filter @scipal/api typecheck`**
- [ ] **Step 5: Commit** `✨ [feat] judge: Judge0 client, output compare and grading`

---

### Task 3: Routes `code/run`, `code/submit`, `code/verify`

**Files:**
- Create: `backend/src/practice/servable.ts` (tách `servableQuestion` ra khỏi closure), `backend/src/routes/practiceCode.ts`, `backend/src/judge/rateLimit.ts`
- Modify: `backend/src/routes/practice.ts` (dùng `servable.ts`; `responseProblem` trả lỗi "dùng nút Nộp bài code" cho `type === 'code'`; `checkPracticeAnswer` không xử lý code), `backend/src/index.ts` (đăng ký `practiceCodeRoutes`), `backend/src/routes/games.ts` (bỏ qua câu `code` như `writing`), `backend/src/routes/examImport.ts` (không nhập `code`)
- Test: `backend/src/__tests__/practice-code.test.ts`; test hiện có `practice.test.ts` vẫn đạt

**Interfaces:**
- Consumes: `gradeSubmission`, `createJudge0Client`, `Judge0Unavailable` (Task 2); `PracticeRow` và `servableQuestion`.
- Produces:
  - `servableQuestion(app: FastifyInstance, request: FastifyRequest, reply: FastifyReply, questionId: string, failure: {error: string; error_en: string}): Promise<PracticeRow | null>` (hành vi cũ, không đổi).
  - `consumeRateSlot(supabase, userId: string, kind: 'run'|'submit'|'verify', limitPerMinute: number): Promise<boolean>` — đếm `code_runs` 60 giây gần nhất; đủ chỗ thì chèn một dòng và trả `true`.
  - `practiceCodeRoutes: FastifyPluginAsync`, `bodyLimit` 160 KB:
    - `POST /api/practice/code/run` body `{ question_id, language, source, stdin }` (`stdin` ≤ 65536) → `{ status, stdout, stderr, time_ms, memory_kb }`.
    - `POST /api/practice/code/submit` body `{ question_id, language, source }` → `PracticeCheckResult` (`correct`, `code`, `explanation` chỉ khi `correct`).
    - `POST /api/practice/code/verify` body `{ language, source, tests, time_limit_ms, memory_limit_mb }` (chỉ `app_role` là `teacher` hoặc `admin`; `reveal: 'all'`).
  - Mã lỗi: 401 chưa đăng nhập; 400 body sai; 404 câu không dùng được hoặc không phải `code`; 429 hết lượt/phút; 503 thiếu `JUDGE0_URL`; 502 `Judge0Unavailable` (thông điệp song ngữ "chưa chấm được, thử lại, không bị tính sai").

- [ ] **Step 1: Viết test thất bại** (Fastify inject + `mockSupabase` như `writing-practice.test.ts`, client Judge0 giả được truyền qua `app.decorate('judge0', fake)`)
  - 401 khi không có user; 503 khi không có `judge0`; 404 với câu `mc`; 400 với `source` rỗng hoặc `language: 'java'`.
  - `submit` đủ test AC → `correct: true`, có `explanation`; có test WA → `correct: false`, không có `explanation`; phản hồi (`JSON.stringify`) không chứa `HIDDEN-EXPECTED-7`.
  - Lần thứ 6 `submit` trong cùng phút → 429 và client giả KHÔNG được gọi thêm.
  - Client ném `Judge0Unavailable` → 502, và không chèn thêm dòng `code_runs` thành "đã dùng" nào sai logic (chấp nhận dòng đã chèn).
  - `verify`: học sinh → 403; giáo viên → 200 kèm `stdout`/`expected` của mọi test.
  - `/api/practice/check` với câu `code` → 400.
  - `games.ts`: câu `code` không xuất hiện trong bộ câu đố (test hiện có của games bổ sung một ca).
- [ ] **Step 2: Chạy `pnpm --filter @scipal/api test -- practice-code`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt.** Trong `backend/src/index.ts`, khi có `JUDGE0_URL` thì `app.decorate('judge0', createJudge0Client({ url, token: process.env.JUDGE0_TOKEN }))`; khai báo kiểu `judge0?: Judge0Client` trong module augmentation Fastify hiện có. Trần 25 test lấy từ `MAX_CODE_TESTS`.
- [ ] **Step 4: Chạy toàn bộ `pnpm --filter @scipal/api test` và typecheck, xác nhận PASS**
- [ ] **Step 5: Commit** `✨ [feat] practice: code run, submit and verify routes`

---

### Task 4: Frontend — API, trạng thái và logic câu `code`

**Files:**
- Modify: `frontend/features/lessons/practiceApi.ts`, `frontend/features/lessons/PracticeSection.tsx` (chỉ phần logic: `responseOf`, `submitAll`, `PART_ORDER/PART_TITLE`)
- Test: `frontend/features/lessons/PracticeSection.test.tsx` (thêm ca), `frontend/features/lessons/practiceApi.test.ts` (tạo nếu chưa có)

**Interfaces:**
- Consumes: `PracticeCheckResult.code`, `PracticeResponse.code` (Task 1); route Task 3.
- Produces:
  - `runCode(questionId: string, code: { language: CodeLanguage; source: string }, stdin: string): Promise<ApiResult<{ status: string; stdout: string; stderr: string; time_ms: number; memory_kb: number }>>`
  - `submitCode(questionId: string, code: { language: CodeLanguage; source: string }): Promise<PracticeCheck>` (cùng kiểu `PracticeCheck` hiện có; dùng `authoringCall` để gắn token; khách chưa có token nhận 401 → lỗi song ngữ "Đăng nhập để chạy và nộp code").
  - `responseOf` cho `code`: trả `{ code }` khi `source.trim()` không rỗng, ngược lại `null`.
  - Nút "Nộp bài (n câu)" (`submitAll`) bỏ qua câu `type === 'code'`.
  - `PART_TITLE.code = { en: 'Programming', vi: 'Lập trình' }`.

- [ ] **Step 1: Viết test thất bại**
  - `responseOf` với câu `code`: rỗng/chỉ khoảng trắng → `null`; có code → `{ code: { language, source } }`.
  - `questionStatus` của câu `code` đã có code là `answered`; có result `correct` là `right`.
  - Một lesson có 1 câu mc đã làm + 1 câu code đã có code: `pending` của nút Nộp bài chỉ đếm 1 (mc).
  - `submitCode` gọi `/api/practice/code/submit` với `Authorization` và body `{question_id, language, source}`; 401 → `{ ok: false, error: {vi:'Đăng nhập…', en:'Sign in…'} }`.
- [ ] **Step 2: Chạy `pnpm --filter @scipal/web test -- PracticeSection practiceApi`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt theo chữ ký trên.**
- [ ] **Step 4: Chạy lại, xác nhận PASS**
- [ ] **Step 5: Commit** `✨ [feat] practice: code answer state and API client`

---

### Task 5: Frontend — giao diện `CodeAnswer`

**Files:**
- Create: `frontend/features/lessons/CodeAnswer.tsx`, `frontend/features/lessons/CodeEditor.tsx`, `frontend/features/lessons/CodeResults.tsx`
- Modify: `frontend/features/lessons/PracticeSection.tsx` (`QuestionCard` hiển thị `CodeAnswer` cho `question.type === 'code'` và không vẽ `checkRow`), `frontend/features/lessons/practice.module.css` nếu cần
- Test: `frontend/features/lessons/CodeAnswer.test.tsx`

**Interfaces:**
- Consumes: `runCode`, `submitCode` (Task 4); `highlight(code, lang)` và `LANG_LABEL` từ `@/components/code/highlight` / `CodePanel`.
- Produces:
  - `CodeEditor({ value: string; onChange(v: string): void; language: CodeLanguage; label: string })` — `<textarea>` monospace trong suốt phủ lên `<pre>` tô màu bằng `highlight` (đồng bộ cuộn), Tab chèn 4 khoảng trắng và Escape trả focus ra ngoài (không bẫy bàn phím), `spellCheck=false`.
  - `CodeResults({ result: PracticeCheckResult['code']; t })` — dòng tổng ("7/10 test đạt" / "7/10 tests passed"), danh sách test: biểu tượng + chữ verdict (không chỉ màu), thời gian, bộ nhớ; test mẫu sai mở ra "Output của em" và "Kết quả đúng"; `CE` hiện `compile_message` trong `<pre>`.
  - `CodeAnswer({ question, answer, result, onAnswer(a: PracticeResponse), onResult(r: PracticeCheckResult, checked: PracticeResponse | undefined), t, lang })` — theo thứ tự trên xuống: đề (`MathText`) + `input_spec`/`output_spec` + giới hạn + ví dụ mẫu; tab Python/C++ (đổi ngôn ngữ nạp `starter` nếu chưa sửa); `CodeEditor`; hàng nút "Tải file" (`<input type="file" accept=".py,.cpp,.txt">`, `FileReader`, từ chối > 64 KB với thông báo), "Đặt lại code mẫu"; ô input + "Chạy thử"; "Nộp bài"; `CodeResults`. Đang chấm: nút khoá, hiện "Đang chấm…"; kết quả đến muộn cho bản code đã sửa bị bỏ (so `answer` đã nộp với `answer` hiện tại, như `withResult`). Khách chưa đăng nhập nhận lỗi 401 hiện lời mời đăng nhập có liên kết `/login`. Một cột ở mọi cỡ màn hình.

- [ ] **Step 1: Viết test thất bại** (Testing Library, `runCode`/`submitCode` mock)
  - Hiển thị đề, ví dụ mẫu, `starter` Python mặc định; đổi sang C++ nạp `starter.cpp`.
  - Tải file `.py` 10 byte đổ vào editor; file 70 KB bị từ chối với thông báo và editor không đổi.
  - Bấm "Nộp bài" gọi `submitCode` đúng một lần (bấm đúp không gọi hai lần); khi đang chấm nút bị `disabled`.
  - Sửa code trong lúc đang chấm rồi kết quả về: `onResult` KHÔNG được gọi.
  - `CodeResults` với `tests` AC/WA/TLE: có chữ "Đạt/Sai/Quá thời gian" (không chỉ màu); test ẩn không có vùng "Output của em".
  - Lỗi 401: hiện liên kết đăng nhập.
- [ ] **Step 2: Chạy `pnpm --filter @scipal/web test -- CodeAnswer`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt ba component và nối vào `QuestionCard`.**
- [ ] **Step 4: Chạy test, `pnpm --filter @scipal/web typecheck`, xác nhận PASS**
- [ ] **Step 5: Xem trên Browser pane ở 375/768/1280px** bằng trang dev tạm với dữ liệu giả (xóa sau khi xem): một cột, không tràn ngang, tab Tab/Escape hoạt động, sáng/tối đều đọc được; chụp 1 ảnh làm bằng chứng.
- [ ] **Step 6: Commit** `✨ [feat] practice: code editor, run and results UI`

---

### Task 6: Soạn đề trong Studio

**Files:**
- Modify: `frontend/features/authoring/practice/questionDraft.ts`, `frontend/features/authoring/practice/QuestionEditor.tsx`, `frontend/features/authoring/practice/api.ts` (`verifyCode`), `frontend/features/content-import/ContentImportStudio.tsx` và `examWorkbook.ts` (đảm bảo `code` không xuất hiện ở nhập Excel/đề thi, theo cách `writing` đang được xử lý)
- Test: `frontend/features/authoring/practice/questionDraft.test.ts`, `QuestionEditor.test.tsx`

**Interfaces:**
- Consumes: `/api/practice/code/verify` (Task 3), `validateQuestionInput` (Task 1).
- Produces:
  - `QuestionDraft.data` thêm `input_spec?: Bilingual; output_spec?: Bilingual; time_limit_ms?: number; memory_limit_mb?: number; starter?: { python?: string; cpp?: string }; tests?: CodeTest[]`.
  - `QUESTION_TYPE_LABEL.code = { en: 'Programming', vi: 'Lập trình' }`; `answerFields('code')` trả bản nháp có 1 test mẫu trống, 2000 ms, 128 MB; `questionInput` đưa đúng các trường của `code`.
  - `verifyCode(body: { language: CodeLanguage; source: string; tests: CodeTest[]; time_limit_ms: number; memory_limit_mb: number }): Promise<ApiResult<{ status: string; tests: CodeTestResult[]; compile_message?: string }>>`.
  - Editor "Lập trình": ô đề/mô tả vào/ra song ngữ, giới hạn, code mẫu theo ngôn ngữ, bảng test (thêm/xoá dòng, tích "test mẫu", điểm), khung "Kiểm tra bộ test" (ngôn ngữ + ô lời giải mẫu + nút, hiện `CodeResults` đầy đủ). Xem trước (preview) bằng `PracticeSection` dùng chung nên tự có giao diện học sinh.

- [ ] **Step 1: Viết test thất bại**
  - `emptyQuestion('code')` hợp lệ về hình dạng nhưng `draftProblem` báo thiếu đề; điền đủ thì `draftProblem` trả `null`.
  - `questionTypesFor('exam')` không chứa `code`; `questionTypesFor('practice')` chứa.
  - `switchQuestionType` từ `code` sang `mc` bỏ `tests`, giữ đề và giải thích.
  - `QuestionEditor` chọn "Lập trình": thêm test, xoá test (tối thiểu 1), tích mẫu; nút "Kiểm tra bộ test" gọi `verifyCode` với `tests` hiện tại và hiện kết quả.
- [ ] **Step 2: Chạy `pnpm --filter @scipal/web test -- authoring/practice`, xác nhận FAIL**
- [ ] **Step 3: Cài đặt.** Chạy `grep -rn "'writing'"` ở `ContentImportStudio.tsx`, `examWorkbook.ts` để xác nhận `code` bị loại giống `writing` (không nhập được từ Excel, không vào đề thi).
- [ ] **Step 4: Chạy test, `pnpm turbo typecheck`, xác nhận PASS**
- [ ] **Step 5: Commit** `✨ [feat] studio: authoring for programming questions`

---

### Task 7: Judge0 vận hành, tích hợp thật, tài liệu

**Files:**
- Create: `docs/ops/judge0/docker-compose.yml`, `docs/ops/judge0/judge0.conf.example`, `docs/ops/judge0/README.md`, `backend/src/__tests__/judge-integration.test.ts`
- Modify: `backend/.env.example` (nếu có; không đọc `.env`), `PROJECT_STATE.md`

**Interfaces:**
- Consumes: `createJudge0Client`, `gradeSubmission` (Task 2).
- Produces: hướng dẫn dựng Judge0 và biến môi trường `JUDGE0_URL`, `JUDGE0_TOKEN` cho backend Vercel.

- [ ] **Step 1: Viết test tích hợp** `describe.skipIf(!process.env.JUDGE0_URL)`: chấm thật 3 chương trình mẫu — Python `print(int(input())*2)` đạt, C++ lặp vô hạn `TLE`, C++ lỗi cú pháp `CE` — với client thật.
- [ ] **Step 2: Viết compose + README**: Judge0 CE 1.13.x (ghim phiên bản, không `latest`), `server` + `workers` `privileged: true`, Postgres/Redis kèm theo, `AUTHN_TOKEN` trong `judge0.conf`, cgroup v1 (hướng dẫn chuyển GRUB trên Ubuntu 22.04+), reverse proxy HTTPS (Caddy mẫu), firewall chỉ 443, kiểm tra bằng `curl /languages` có `X-Auth-Token`, ghi cách tắt bằng bỏ `JUDGE0_URL`.
- [ ] **Step 3: Triển khai kiểm tra thủ công** (người vận hành): dựng Judge0, đặt `JUDGE0_URL`/`JUDGE0_TOKEN` ở local, chạy test tích hợp, xác nhận PASS; kiểm tra giới hạn thời gian function của project backend trên Vercel ≥ 25 giây rồi mới bật ở production.
- [ ] **Step 4: Ghi `PROJECT_STATE.md`** (mục Completed): thứ tự triển khai bắt buộc — Judge0 → migration `20261019120000_code_questions.sql` → backend → frontend; rollback: bỏ `JUDGE0_URL`.
- [ ] **Step 5: Chạy `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`**, ghi kết quả thật vào báo cáo.
- [ ] **Step 6: Commit** `📝 [docs] judge0: ops guide, integration test, project state`
