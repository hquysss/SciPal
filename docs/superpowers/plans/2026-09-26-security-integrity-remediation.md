# SciPal Security & Integrity Remediation Plan (26/09)

> **For agentic workers:** Thực thi từng task theo thứ tự, mỗi task xanh (typecheck + test liên quan) mới chuyển tiếp. Steps dùng checkbox (`- [ ]`).

**Goal:** Sửa các lỗ hổng bảo mật/toàn vẹn dữ liệu và dữ liệu giả được xác nhận trong đợt rà soát toàn repo ngày 26/09, theo thứ tự mức độ nghiêm trọng. Ưu tiên số 1: client đang tự ghi được XP/tiến trình qua PostgREST, phá bất biến #4.

**Quan hệ với plan cũ:** Kế hoạch này **thay thế thứ tự thực thi** của `2026-09-23-existing-web-remediation.md` (chưa task nào được làm). Nội dung Task 1–3, 6–7 của plan cũ được gộp và cập nhật tại đây; Task 5 (hydration), 8 (AI Tutor), 9 (UI) của plan cũ giữ nguyên, làm sau plan này. Điểm plan cũ đã lỗi thời: tên migration `0006_access_hardening.sql` đã bị `0006_lesson_review_workflow.sql` chiếm.

**Architecture:** Không đổi kiến trúc. Next.js chỉ **đọc** Supabase qua RLS; mọi ghi thành tích/lớp/khảo sát đi qua Fastify (service role). Các ghi nhiều bước (progress + xp_log + streaks, exam attempt + XP) gom vào hàm Postgres chỉ `service_role` được EXECUTE, backend gọi qua `rpc()`.

**Status:** Chờ người dùng review. Chưa sửa code, chưa áp migration, chưa deploy.

## Bằng chứng đã xác nhận (đọc code, 26/09)

| # | Vấn đề | Vị trí |
|---|---|---|
| E1 | `progress`, `xp_log`, `streaks`, `user_badges`, `profiles` dùng policy `FOR ALL USING (auth.uid() = user_id)` không `WITH CHECK` → user tự insert/update/delete XP, tự đổi `profiles.role` | `supabase/migrations/0004_rls.sql:12-30` |
| E2 | Migration không bật RLS cho `questions`, `exam_blueprints`, các bảng nội dung → anon có thể đọc đáp án (nếu DB dựng theo migration). `full_schema_and_seed.sql` thì có bật — trạng thái DB thật chưa rõ | `0002_content.sql`, `full_schema_and_seed.sql` |
| E3 | Chấm thi: không khử trùng `question_id`, nộp lại vô hạn, `GET questions` bỏ qua blueprint (`.limit(20)` mọi môn), đề demo `q-demo-*` ở cả backend và frontend | `backend/src/routes/exam.ts:29,33-130,175-250` |
| E4 | Lớp học: không kiểm tra role/sở hữu, fallback `'demo-teacher-id'`, roster trả `profiles(*)` cho bất kỳ ai | `backend/src/routes/classes.ts:8,90-96` |
| E5 | Policy `class_rooms` ↔ `class_members` tham chiếu vòng (nguy cơ infinite recursion) | `0004_rls.sql:32-53` |
| E6 | Survey: route public, `INSERT WITH CHECK (true)`, không kiểm `{error}` → luôn 201 | `backend/src/plugins/auth.ts:6`, `0005_surveys.sql:11`, `routes/survey.ts` |
| E7 | Lesson score: 3 bước ghi không transaction, XP không phụ thuộc quiz | `backend/src/routes/score.ts` |
| E8 | CORS mặc định `'*'` | `backend/src/index.ts:15` |
| E9 | Dữ liệu giả trong luồng thật: `classQueries` gọi `GET /api/classes` không tồn tại + thiếu Authorization; profile/progress trả 350 XP/5 streak khi lỗi | `frontend/features/{classes,profile,progress}/*Queries.ts` |
| E10 | Hai `SubjectProvider`, `--accent` trên `:root`, chuỗi VI hard-code, `QuizBlock` nhận `answer` | `features/subjects/SubjectContext.tsx`, `app/globals.css`, `components/blocks/` |

Kiểm tra thuận lợi: frontend **chỉ SELECT** các bảng người dùng (`profileQueries.ts`, `progressQueries.ts`), nên thu hồi quyền ghi của `authenticated` không làm gãy UI. Ngoại lệ cần giữ: route web `/api/preferences/education-level` ghi `profiles.preferred_education_level` qua RLS (hiện chỉ có trên máy local của người dùng).

## Global Constraints

- Tuân thủ AGENTS.md và `.agents/rules/00–03`. Không chuyển logic chấm điểm sang Next.js; không đổi alias react của mobile.
- Role chỉ lấy từ `app_metadata.app_role` đã xác minh; không bao giờ tin `profiles.role` hoặc body.
- Migration mới chỉ **bổ sung**, không sửa file đã áp. Đặt tên theo timestamp **sau** `20260925124223` (ví dụ `20260926090000_access_hardening.sql`) để thứ tự đúng với migration landing đang có ở local.
- Backend service role bỏ qua RLS → mỗi route tự kiểm quyền (deny-by-default, 401/403 **trước** mọi truy vấn dữ liệu nhạy cảm).
- Block schema có hai bản (`packages/types/src/block.ts`, `backend/src/schemas/blocks.ts`): sửa một phải sửa cả hai.
- Không `git add .`; mỗi task một commit chỉ chứa file của task.
- Không có fallback demo khi dịch vụ lỗi; fixture chỉ trong test.
- Áp migration lên DB thật là bước triển khai riêng, cần người dùng đồng ý.

## Task 0: Baseline an toàn (không đổi code sản phẩm)

- [ ] **Trên máy người dùng:** commit hoặc tách nhánh working tree đang dirty (~33 file sửa, ~25 untracked: landing theo cấp học, migration `20260925124223_landing_education_levels.sql`, `DESIGN.md`). Branch remote hiện **không** có các file này — plan phải chạy trên code đã được đẩy lên.
- [ ] Chạy `pnpm turbo typecheck` và `pnpm turbo test` để lấy baseline (chấp nhận ghi cache turbo/tsbuildinfo — đã gitignore). Lỗi đã biết: `@scipal/supabase` `src/__tests__/client.test.ts:112` thiếu `created_by, review_status, reviewed_by, reviewed_at` trong fixture lesson; PROJECT_STATE ghi web lỗi TS2786/TS2322 (nghi do lệch `@types/react` ^19.3 vs ^19.0). Ghi kết quả vào PROJECT_STATE, không sửa ở task này.
- [ ] Dùng Supabase MCP **chỉ đọc** (`execute_sql` với SELECT) trên project đang link:

```sql
SELECT c.relname, c.relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public' ORDER BY 1, 2;

SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated') ORDER BY 1, 2, 3;
```

- [ ] Ghi bảng "DB thật vs migration" vào PROJECT_STATE (Known Issues). Nếu DB thật cho anon đọc `questions` → báo người dùng ngay như sự cố, trước khi làm tiếp.
- [ ] Chụp thêm `get_advisors` (security) để đối chiếu.

**Acceptance:** Có baseline typecheck/test và bức tranh RLS/grant thật; không thay đổi DB.

## Task 1: Khóa RLS và grants ở tầng database (E1, E2, E5, E6)

**Files:** Create `supabase/migrations/20260926090000_access_hardening.sql`, `supabase/tests/access_hardening.sql`.

- [ ] Viết `supabase/tests/access_hardening.sql` trước (chạy trong `BEGIN … ROLLBACK`): tạo 2 học sinh, 2 giáo viên, 2 lớp; dùng `SET LOCAL ROLE authenticated` + `set_config('request.jwt.claims', '{"sub":"…"}', true)` để khẳng định:
  - không INSERT/UPDATE/DELETE được `progress`, `xp_log`, `streaks`, `user_badges` (kể cả dòng của chính mình);
  - không UPDATE được `profiles.role`; vẫn UPDATE được `preferred_education_level`, `display_name`, `avatar_url` của chính mình;
  - `anon`/`authenticated` không SELECT được `questions`; SELECT `lessons` chỉ thấy `published = true`;
  - SELECT `class_rooms`/`class_members` không lỗi recursion, chỉ thấy lớp mình dạy/tham gia;
  - `anon` không INSERT được `surveys`.
- [ ] Migration, bảng người dùng — thay `FOR ALL` bằng SELECT-only và thu hồi ghi:

```sql
DROP POLICY IF EXISTS "xp_log: own rows" ON public.xp_log;
CREATE POLICY "xp_log: own read" ON public.xp_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.xp_log FROM anon, authenticated;
-- lặp lại cho progress, streaks, user_badges
```

- [ ] `profiles`: policy SELECT own + UPDATE own có `WITH CHECK (auth.uid() = id)`; `REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon, authenticated;` rồi `GRANT UPDATE (display_name, avatar_url, preferred_education_level) ON public.profiles TO authenticated;` (đối chiếu tên cột thật trong `0003_user_data.sql` và migration landing). Trigger `handle_new_user` là `SECURITY DEFINER` nên không bị ảnh hưởng — xác nhận trong test.
- [ ] Bảng nội dung (`subjects`, `topics`, `lessons`, `terms`, `resources`, `exam_blueprints`, `badges`): `ENABLE ROW LEVEL SECURITY`, policy SELECT cho `anon, authenticated` (`lessons` lọc `published`), `REVOKE INSERT, UPDATE, DELETE … FROM anon, authenticated`. `questions`: bật RLS, `REVOKE ALL … FROM anon, authenticated` (chỉ backend đọc).
- [ ] Lớp học: thay policy vòng bằng helper

```sql
CREATE OR REPLACE FUNCTION public.is_class_member(p_class uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.class_members
                 WHERE class_id = p_class AND student_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_class_member(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_class_member(uuid) TO authenticated;
```

  và `is_class_teacher(p_class)` tương tự; policy chỉ SELECT; mọi ghi lớp đi qua backend (`REVOKE INSERT, UPDATE, DELETE` trên `class_rooms`, `class_members`, `assignments`).
- [ ] `surveys`: `DROP POLICY "surveys_insert_anon"` (và policy tên khác tương đương trên DB thật — xem Task 0), `REVOKE INSERT ON public.surveys FROM anon, authenticated`.
- [ ] Chạy test SQL trên DB test/branch (Supabase MCP `create_branch` hoặc local nếu có Docker); **không** chạy trên production. Nếu không có môi trường test, dừng và báo người dùng.
- [ ] Commit migration + test.

**Acceptance:** Mọi case trong test SQL đạt; trang `/progress`, `/profile`, landing LevelGate vẫn đọc/ghi đúng trên branch DB.

## Task 2: Ghi thành tích nguyên tử qua hàm Postgres (E3, E7)

**Files:** Create `supabase/migrations/20260926091000_award_functions.sql`; Modify `backend/src/routes/score.ts`, `backend/src/routes/exam.ts`; Test `backend/src/__tests__/{score,exam}.test.ts`.

- [ ] Thêm bảng `exam_attempts(id, user_id, blueprint_id, score, correct_count, total, submitted_at)` với RLS SELECT own, và `UNIQUE(user_id, blueprint_id)` cho **lần được tính XP** (các lần sau vẫn chấm, `xp_earned = 0`). Đây là đề xuất nghiệp vụ — xác nhận với người dùng (xem Câu hỏi mở).
- [ ] Hàm `award_lesson_completion(p_user uuid, p_lesson uuid)` và `record_exam_attempt(p_user, p_blueprint, p_score, p_correct, p_total, p_xp)`: `SECURITY DEFINER`, `SET search_path = public`, một transaction, idempotent (dựa unique `progress(user_id, lesson_id)`), trả `{ xp_earned, already_completed }`. `REVOKE EXECUTE … FROM public, anon, authenticated; GRANT EXECUTE … TO service_role;`
- [ ] Test backend trước (fail trước khi sửa):
  - exam: gửi trùng `question_id` → chỉ tính 1 lần; `question_id` không thuộc blueprint → bỏ qua/400; nộp lần 2 → `xp_earned = 0`; blueprint không tồn tại → 404; không còn `q-demo-*`.
  - `GET /api/exam/:id/questions`: chỉ trả câu theo blueprint (subject + số câu), không có `answer`/`answer_key`/`correct`; blueprint không có câu → 404/409 rõ ràng, không fallback demo.
  - lesson: hoàn thành lần 2 → `already_completed`, không cộng XP; lỗi RPC → 503, không báo XP.
- [ ] Sửa `exam.ts`: đọc blueprint trước, lấy câu theo `subject_id`/cấu hình blueprint, khử trùng answers bằng `Map`, chấm theo danh sách câu của blueprint, gọi `rpc('record_exam_attempt')`. Xóa toàn bộ đề/đáp án demo. Cân nhắc bỏ `/api/exam/` khỏi danh sách public của `auth.ts` (middleware web đã yêu cầu đăng nhập cho `/exam/*`).
- [ ] Sửa `score.ts`: thay 3 lệnh ghi + rollback tay bằng `rpc('award_lesson_completion')`.
- [ ] Xóa đề demo phía frontend (`features/exam/`) — trang danh sách đề đọc `exam_blueprints` thật, rỗng thì hiện trạng thái rỗng.
- [ ] `pnpm --filter @scipal/api test`, typecheck; commit.

**Acceptance:** Không thể cày XP bằng trùng câu/nộp lại/hoàn thành lại; ghi thành tích là một transaction.

## Task 3: Kiểm tra quyền route lớp học + nối frontend (E4, E9-lớp)

**Files:** Create `backend/src/lib/authorization.ts`; Modify `backend/src/routes/classes.ts`, `frontend/features/classes/classQueries.ts`; Test `backend/src/__tests__/classes.test.ts`.

- [ ] `authorization.ts`: `getAppRole(user)` và `requireRole(reply, user, roles)`; tái dùng logic đang có ở `authoring.ts`/`accounts.ts` thay vì viết lại (đọc trước, gom về một chỗ).
- [ ] Test: student tạo lớp → 403; teacher không sở hữu đọc roster → 403; chủ lớp/admin → 200; không user → 401 (không còn `'demo-teacher-id'`); join với mã sai → 404; join lại → 200 idempotent.
- [ ] Thêm `GET /api/classes` (teacher: lớp mình dạy; admin: tất cả; student: lớp đã tham gia). Roster select cột cụ thể (`id, display_name, avatar_url` + XP tổng), không `profiles(*)`.
- [ ] `classQueries.ts`: gửi `Authorization: Bearer` từ `getSession()`, bỏ lớp demo; lỗi → trạng thái lỗi có nút thử lại.
- [ ] Test + typecheck; commit.

## Task 4: Survey trung thực (E6)

**Files:** Modify `backend/src/routes/survey.ts`, `frontend/lib/api.ts`, `frontend/features/survey/*`; Create `backend/src/__tests__/survey.test.ts`.

- [ ] Test: payload sai → 400; không DB → 503; insert trả `{error}` → 503; OK → 201; có Bearer hợp lệ → gắn `user_id`, không có → `null` (không bao giờ lấy `user_id` từ body).
- [ ] Route vẫn public nhưng tự xác minh token nếu có; kiểm tra `{ error }` của supabase-js; Zod giới hạn type/rating 1–5/feedback ≤ 2000; rate limit đơn giản theo IP (10/phút, một instance — ghi rõ giới hạn).
- [ ] `postSurvey` kiểm `res.ok`; component chỉ `setSubmitted(true)` khi thành công, lỗi giữ nội dung + retry.
- [ ] Commit.

## Task 5: Gỡ dữ liệu giả khỏi luồng thật (E9)

**Files:** `frontend/features/profile/profileQueries.ts`, `frontend/features/progress/progressQueries.ts`, `frontend/features/classes/{CreateClassModal,JoinClassModal}.tsx`, trang dùng chúng.

- [ ] Query trả union `{ status: 'ready', data } | { status: 'empty' } | { status: 'error' }`; kiểm tra `{ error }` tường minh; zero chỉ khi truy vấn thành công.
- [ ] Bỏ `onCreated(mock)` / `onJoined(class-demo…)` trong catch.
- [ ] Tổng XP: thêm view/hàm `user_xp_total` (SELECT own qua RLS) thay vì tải cả `xp_log` rồi `reduce` — có thể gộp vào migration Task 2.
- [ ] Kiểm tra trình duyệt với backend tắt: không hiện số liệu giả hay "đã lưu". Commit.

## Task 6: Cứng hóa backend nhỏ (E8)

- [ ] `index.ts`: CORS không có `CORS_ORIGINS` → production từ chối (chỉ cho `http://localhost:3000` khi `NODE_ENV !== 'production'`). Xác nhận biến `CORS_ORIGINS` đã đặt trên Vercel **trước** khi deploy (hỏi người dùng, không đọc giá trị secret).
- [ ] `plugins/auth.ts`: tái dùng một Supabase client cho `getUser` thay vì tạo mới mỗi request.
- [ ] `accounts.ts`: `listUsers()` phân trang.
- [ ] Commit.

## Task 7: Tuân thủ nguyên tắc dự án (E10)

- [ ] Gộp về một `SubjectProvider` của `@scipal/ui`; xóa `features/subjects/SubjectContext.tsx` sau khi chuyển trang môn/bài; `--accent` đặt bằng inline style trên wrapper ngay lần render đầu.
- [ ] Bỏ `--accent` khỏi `:root` trong `frontend/app/globals.css`; thay fallback cứng `#16a34a` ngoài navbar/logo bằng `var(--accent)`.
- [ ] Chuỗi VI hard-code ở trang môn, trang bài, `LessonCompletionBar` → `t({ en, vi })`.
- [ ] `QuizBlock`: bỏ `answer` khỏi props, chấm qua backend (hoặc ẩn khối đến khi có API) — không để component sẵn sàng rò rỉ đáp án.
- [ ] Route `/[subject]` kiểm trạng thái môn từ DB (`subjects`), không từ `SUBJECT_CONFIG.status` tĩnh.
- [ ] Test UI/typecheck; commit.

## Task 8: Dọn dẹp & đồng bộ phiên bản

- [ ] Sửa fixture `packages/supabase/src/__tests__/client.test.ts` thêm cột duyệt bài (lỗi typecheck đã biết).
- [ ] Căn `@types/react` giữa packages và web (một version), rồi xác minh lỗi TS2786/TS2322 hết. Không động vào alias react của mobile.
- [ ] Thay package `cn@0.4.0` bằng helper `cn` chuẩn shadcn (`clsx` + `tailwind-merge`) — **cần người dùng đồng ý vì thêm dependency**.
- [ ] Xóa component chết (`AuthCard`, `ScienceShowcase`, `KathaMascot`, `KhmerVine`, `KhmerMotifs`, `ScienceHelixes`) sau khi grep xác nhận không import; bỏ xóa cookie `scipal_demo_user`/`scipal_session` trong NavBar.
- [ ] Server Component dùng `createServerClient(cookies())` thay `createBrowserClient()` (`lessonQueries`, `lessonDetailQuery`).
- [ ] `git rm --cached -r supabase/.temp` + thêm vào `.gitignore`; chuyển `backend/PassSupabase.txt` ra ngoài repo (người dùng tự làm).
- [ ] Quyết định số phận `supabase/full_schema_and_seed.sql` (đánh dấu deprecated hoặc sinh lại từ migration) — hỏi người dùng.
- [ ] Commit theo nhóm nhỏ.

## Task 9: Nghiệm thu & cập nhật trạng thái

- [ ] `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build` đều xanh (CI chạy đúng 3 lệnh này).
- [ ] `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/` → 0 kết quả.
- [ ] Thử thủ công bằng anon key + JWT học sinh gọi PostgREST: insert `xp_log` → bị từ chối; select `questions` → rỗng/403.
- [ ] Áp migration lên DB thật **chỉ khi người dùng đồng ý**, sau khi đã chạy trên branch.
- [ ] Cập nhật PROJECT_STATE: Completed, Known Issues còn lại, quyết định mới.

## Ngoài phạm vi (backlog, plan sau)

- AI Tutor (`/api/ai/chat`, SSE parse, token thật) — Task 8 plan 23/09.
- Hydration ngôn ngữ — Task 5 plan 23/09.
- Hiệu năng: NavBar gọi `getUser()` mỗi lần đổi route, `body:has(...)`, landing `force-dynamic`, CSS lớn, `generateStaticParams` vs ISR, lazy-load KaTeX/Monaco, vòng lặp 100 query kiểm slug.
- Quiz quyết định XP bài học (cần đặc tả nghiệp vụ).
- `resource-ref` đọc `resource_id` thật, `InteractiveRenderer` thật.

## Câu hỏi mở cho người dùng

1. Nộp lại bài thi: chỉ lần đầu được XP (đề xuất), hay lần có điểm cao nhất, hay giới hạn N lần/ngày?
2. Học sinh có được xem danh sách bạn cùng lớp không (hiện plan: chỉ giáo viên chủ lớp/admin)?
3. Có môi trường DB test (Supabase branch hoặc Docker local) để chạy Task 1 trước khi áp production không?
4. Đồng ý thêm `clsx` + `tailwind-merge` (Task 8)?
