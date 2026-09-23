# SciPal Existing Web Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sửa các vấn đề đã xác nhận trong đợt khảo sát giao diện/frontend/backend ngày 23/09, nâng cấp trên nền SciPal hiện có, không dựng lại web.

**Architecture:** Giữ Next.js, Fastify, Supabase và các package dùng chung. Sửa từng luồng từ quyền truy cập và dữ liệu thật đến trạng thái frontend, rồi hoàn thiện kết nối bài học/AI và tinh chỉnh UI. Những thao tác thành tích cần tính nguyên tử được đưa vào transaction Postgres gọi từ backend; client không tự ghi XP.

**Tech Stack:** pnpm 9, TypeScript, Next.js 15/React 19, Fastify 4, Supabase Postgres/Auth, Vitest hiện có; Expo/React 18 phải tiếp tục typecheck.

**Spec:** `docs/superpowers/specs/2026-09-23-existing-web-remediation-design.md` — phạm vi sửa lỗi theo khảo sát và yêu cầu mới nhất của người dùng. Spec shell ngày 23/09 trước đó là tham khảo, không phải yêu cầu đổi toàn bộ layout/palette.

**Status:** Kế hoạch để người dùng review. Chưa triển khai, chưa áp migration lên database hoặc deploy. Các quyết định nghiệp vụ cụ thể bên dưới là đề xuất của kế hoạch này, không được mô tả là quy chế chấm thi chính thức.

## Global Constraints

- Nâng cấp code hiện có; giữ kiến trúc, route, bố cục chủ đạo, nhận diện xanh và hiệu ứng login.
- Không đổi toàn bộ navbar sang nền sáng, không ép đổi palette để khớp HTML trong đợt sửa lỗi.
- Nội dung là dữ liệu; không tạo component riêng cho từng môn.
- `--accent` chỉ nằm trong wrapper của `SubjectProvider` từ `@scipal/ui`, không ở `:root`.
- Dùng `useLanguage` hiện có; nhãn mới/chỉnh sửa có EN/VI.
- Client không tự tính XP/streak/badge; không gửi `answer`, `answer_key`, `correct` hoặc rubric chấm điểm bí mật xuống client.
- Bí mật chỉ ở backend; không đọc/in giá trị `.env` khi kiểm tra cấu hình.
- Không thay React alias của mobile, không nâng dependency hoặc thêm thư viện UI.
- Giữ nguyên thay đổi chưa commit của đợt trước. Mỗi commit mới chỉ gồm phần đã kiểm tra thuộc task; không `git add .`.
- Migration mới theo hướng bổ sung, không sửa migration cũ đã áp. Chạy local/test trước; áp database đang dùng là bước triển khai riêng.
- Không dùng dữ liệu demo làm fallback khi dịch vụ lỗi; fixture chỉ nằm trong test hoặc chế độ demo được gắn nhãn rõ.

## Review Focus

1. Người đã đăng nhập nhưng sai role/không sở hữu lớp: API phải từ chối trước truy vấn dữ liệu nhạy cảm hoặc ghi dữ liệu — Tasks 1–2.
2. DB trả `{ error }`, HTTP 4xx/5xx hoặc mất mạng: không báo đã lưu/tạo/gửi thành công — Tasks 3–4.
3. Nộp thiếu, trùng, sai đề, quá hạn hoặc gửi đồng thời: kết quả theo đề server và không cộng XP lặp — Tasks 6–7.
4. EN được lưu trước khi SSR, localStorage bị chặn, reload/deep link: không hydration mismatch và không mất ngữ cảnh — Tasks 5, 9.
5. Nội dung chưa hỗ trợ/không đủ câu hỏi, stream bị cắt: có trạng thái rõ, không placeholder giả chức năng và không lộ đáp án — Tasks 6–8.

## Thứ tự và mốc kiểm chứng

| Đợt | Task | Kết quả độc lập |
|---|---|---|
| A — Quyền và kết quả thật | 1–3 | API không cho phép sai quyền, không báo lưu giả; rà chính sách DB |
| B — Nối frontend/backend | 4–5 | Lớp/editor/profile đọc đúng dữ liệu; EN không gây hydration mismatch |
| C — Học và chấm thật | 6–8 | Đề/lượt thi được kiểm soát; quiz/XP nhất quán; AI có giao thức hoạt động |
| D — Hoàn thiện trải nghiệm | 9–10 | Điều hướng, song ngữ và UI hiện có đồng bộ; báo cáo nghiệm thu trung thực |

Một task phải đạt kiểm tra riêng trước khi chuyển tiếp. Task 5 có thể được ưu tiên ngay sau Task 3 nếu cần giảm lỗi giao diện sớm. Không mở rộng sang mô phỏng mới, voice, tổ hợp thi, tạo môn mới hoặc thiết kế lại mobile.

## Task 1: Chặn truy cập sai quyền trong API lớp và soạn bài

**Files:** Modify `backend/src/routes/classes.ts`, `backend/src/routes/authoring.ts`; Create `backend/src/lib/authorization.ts`; Test `backend/src/__tests__/classes.test.ts`, `backend/src/__tests__/authoring.test.ts`.

**Interfaces:** `authorization.ts` xuất `getAppRole(user): 'student' | 'teacher' | 'admin' | null`; role chỉ lấy từ `app_metadata.app_role` của user đã được authPlugin xác minh. Không tin `profiles.role` hoặc body/client. Quyền teacher hiện là quyền biên soạn dùng chung; không tự tạo mô hình sở hữu bài học chưa có trong schema.

- [ ] Viết test handler với user fixture hợp lệ và DB spy: student tạo lớp =>403, người không sở hữu lớp đọc roster =>403, teacher sở hữu lớp/admin =>200, thiếu user =>401. Roster là API giáo viên; học sinh tham gia lớp không tự có quyền xem danh sách cả lớp.
- [ ] Thêm test student sửa bài dù không có profile =>403 và không gọi `.update`; teacher/admin được xét tiếp, DB thiếu =>503. Kiểm tra block sai schema =>400, bài không tồn tại =>404.
- [ ] Chạy `pnpm --filter @scipal/api exec vitest run src/__tests__/classes.test.ts src/__tests__/authoring.test.ts`; ghi nhận thất bại trước sửa.
- [ ] Dùng guard deny-by-default, ví dụ tại đầu mutation giáo viên:

```ts
const role = getAppRole(user);
if (!user?.id) return reply.code(401).send({ error: 'Authentication required' });
if (role !== 'teacher' && role !== 'admin') {
  return reply.code(403).send({ error: 'Teacher access required' });
}
if (!app.supabase) return reply.code(503).send({ error: 'Database unavailable' });
```

- [ ] Với roster, đọc `class_rooms(id, teacher_id)` trước; so sánh `teacher_id` hoặc admin trước khi đọc members. Select danh sách trường cần dùng, bỏ `profiles(*)`. Khi join, xác thực user thật, chuẩn hóa invite code; thiếu lớp=>404, DB lỗi=>503, đã là thành viên=>200 idempotent.
- [ ] Bỏ nhánh mock response của routes ghi. Validate UUID, tên lớp, blocks qua schema sẵn có; không trả nguyên lỗi DB ra giao diện. Tạo lớp dùng subject UUID, không dùng slug.
- [ ] Chạy lại test; thêm một kiểm tra cùng authPlugin để xác nhận request không token vẫn401. Commit riêng task đã xanh.

**Acceptance:** 403 trước tác dụng phụ cho mọi trường hợp sai quyền; teacher/admin vẫn dùng được chức năng cũ. Test fixture không thay thế kiểm thử auth thật.

## Task 2: Khóa quyền ghi thành tích và đọc đáp án ở tầng database

**Files:** Create `supabase/migrations/0006_access_hardening.sql`, `supabase/tests/access_hardening.sql`; inspect `0002_content.sql`, `0003_user_data.sql`, `0004_rls.sql`, `0005_surveys.sql`; Modify backend reads affected by restricted tables, preserving service-role on server only.

**Interfaces:** anon/authenticated không có quyền ghi progress/xp_log/streaks/user_badges hoặc đọc trực tiếp `questions.data`; service_role giữ khả năng thực hiện nghiệp vụ. Nội dung bài công khai chỉ là published; giáo viên đọc nháp qua backend có guard.

- [ ] Đọc catalog grants/policies trên DB local/test; nếu có kết nối đọc DB đang dùng, chỉ kiểm tra catalog, không sửa. Ghi rõ khác biệt giữa migration repo và môi trường thực tế.
- [ ] Tạo fixture hai học sinh, hai giáo viên, hai lớp trong DB test. Kiểm tra authenticated không thể tự ghi XP, tự đổi role profile, đọc lớp người khác hoặc đọc đáp án qua REST/SQL role.
- [ ] Viết migration thay policy không ghi command bằng SELECT-only và thu hồi ghi thành tích. Mẫu áp dụng riêng cho từng bảng:

```sql
DROP POLICY IF EXISTS "xp_log: own rows" ON public.xp_log;
CREATE POLICY "xp_log: own read" ON public.xp_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.xp_log FROM anon, authenticated;
REVOKE ALL ON public.questions FROM anon, authenticated;
```

- [ ] Áp dụng tương tự progress/streaks/user_badges. Profile chỉ SELECT own; cập nhật tên/avatar qua API hiện có, không cấp quyền sửa role trực tiếp. Class tables chỉ đọc theo quyền cần thiết; mọi mutation qua backend. Tránh policy lớp/thành viên tham chiếu vòng gây infinite recursion: dùng helper SQL `SECURITY DEFINER` với `search_path` cố định, định danh bảng đầy đủ, chỉ trả boolean quyền truy cập, không nhận userId do client tự chọn.
- [ ] Bật RLS public content thích hợp và chỉ cấp SELECT cần thiết; lessons SELECT lọc `published`. Xác minh query topic/lesson hiện có không bị gãy. Survey chỉ ghi qua API, thu hồi insert anon trực tiếp để không vượt validation/rate limit.
- [ ] Chạy `psql "$env:SCIPAL_TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/access_hardening.sql` với DB test đã áp migration; script dùng transaction và rollback fixture. Không in URL hoặc token vào log. Không chạy nếu biến test chưa được cấu hình; báo bước tích hợp chưa xác minh, không tự chuyển sang DB production.
- [ ] Commit migration/test sau khi kiểm tra. Không sửa dữ liệu lịch sử, không áp lên DB đang dùng trong bước này.

**Acceptance:** RLS và grants đều chặn ghi/đọc trái phép; không dựa vào việc ẩn nút frontend. Thiếu DB test là giới hạn kiểm chứng phải ghi nhận.

## Task 3: Loại bỏ báo thành công giả và dữ liệu cá nhân mẫu

**Files:** Modify `backend/src/routes/survey.ts`, `frontend/lib/api.ts`, `frontend/features/survey/{PostLessonSurvey,SubjectDemandModal,FeatureRequestBoard}.tsx`, `frontend/features/classes/{CreateClassModal,JoinClassModal}.tsx`, `frontend/features/authoring/LessonEditor.tsx`, `frontend/features/profile/profileQueries.ts`, `frontend/features/progress/progressQueries.ts`; Create `backend/src/__tests__/survey.test.ts`.

**Interfaces:** mutation resolve chỉ khi server xác nhận thành công. Query trả trạng thái phân biệt `ready`, `empty`, `error`; không trả 350 XP/4 bài/5 ngày khi lỗi. Giữ shape dữ liệu thành công, thêm trạng thái lỗi để trang render có chủ đích.

- [ ] Test survey không DB=>503; insert trả `{error}`=>503; payload sai=>400; insert thành công=>201. Survey ẩn danh không gắn `user_id`, kể cả khi có session. Dùng schema giới hạn type, rating 1–5 và feedback tối đa 2000 ký tự; type frontend đang dùng phải được đối chiếu và liệt kê trong schema trước sửa.
- [ ] Chạy `pnpm --filter @scipal/api exec vitest run src/__tests__/survey.test.ts`; xác nhận các case lỗi đang thất bại.
- [ ] Sửa API kiểm tra `error` từ Supabase, không chỉ `catch`. Thêm giới hạn tần suất API survey theo địa chỉ từ kết nối tin cậy: 10 lần/phút mỗi process, map có TTL và dọn định kỳ; ghi rõ đây là giới hạn một instance, không coi là rate limiter toàn cụm.
- [ ] Sửa `postSurvey` kiểm tra status:

```ts
const res = await fetch(`${API_BASE}/api/survey`, {
  method: 'POST', headers, body: JSON.stringify(body),
});
if (!res.ok) throw new Error(`survey failed: ${res.status}`);
```

- [ ] Chỉ `setSubmitted(true)` trong nhánh thành công; lỗi giữ nội dung nhập và hiện retry. Xóa `onCreated(mock)`/`onJoined(class-demo...)` khỏi catch. Editor giữ nội dung đang sửa, báo chưa lưu; không gọi state RAM là bản lưu offline.
- [ ] Profile/progress kiểm tra lỗi Supabase tường minh; lỗi không biến thành zero hoặc dữ liệu mẫu. Zero chỉ khi truy vấn thành công và không có bản ghi. Role hiển thị từ app_metadata đã xác minh.
- [ ] Chạy lại test survey. Trong trình duyệt dùng backend local hoặc fixture không ghi dữ liệu thật: 503 và ngắt mạng phải giữ form, không có thông báo thành công; retry thành công hiển thị đúng. Commit task.

**Acceptance:** Không còn mutation giả thành công khi mạng/DB lỗi trong các file nêu trên; thống kê cá nhân không dùng fallback mẫu.

## Task 4: Nối đúng API và phiên cho lớp học, editor, hồ sơ

**Files:** Modify `backend/src/routes/{classes,authoring}.ts`, `frontend/features/classes/classQueries.ts`, `frontend/features/authoring/authoringQueries.ts`, `frontend/app/teacher/classes/page.tsx`, `frontend/app/teacher/classes/[id]/page.tsx`, `frontend/app/teacher/lessons/page.tsx`, `frontend/app/teacher/lessons/[id]/page.tsx`, `frontend/app/profile/page.tsx`, `frontend/features/profile/AccountSettings.tsx`; Test existing classes/authoring tests.

**Interfaces:**

```ts
// Authenticated teacher/admin endpoints, guarded as Task 1.
// GET /api/classes => { classes: ClassRoomItem[] }
// GET /api/authoring/lessons => { lessons: AuthoringLessonData[] }
// GET /api/authoring/lessons/:id => { lesson: AuthoringLessonData }
// POST /api/authoring/lessons => { lesson: AuthoringLessonData }, HTTP 201
// PATCH /api/authoring/lessons/:id remains the existing save endpoint.
```

- [ ] Add GET tests: teacher chỉ nhận lớp mình, admin có thể đọc tất cả; unknown lesson=>404; unauthenticated=>401; DB error=>503. Draft lesson chỉ được trả qua API teacher/admin.
- [ ] Add POST lesson validation tests: subject/topic phải tồn tại và khớp; title EN/VI bắt buộc; slug hợp lệ và không trùng trong môn; grade 10/11/12; blocks theo BlockSchema; tạo mặc định published=false.
- [ ] Chạy tests để thấy GET/POST hiện thiếu. Implement routes nhỏ trong module hiện có; select trường cụ thể, không lộ đáp án từ questions.
- [ ] Server page xác minh user, lấy session qua Supabase client đã có và chỉ truyền token vào request backend. Không đưa token vào HTML, URL, log hoặc prop serializable của server page. Client mutation lấy session lúc bấm thao tác.
- [ ] `getTeacherClasses` gửi Authorization; sửa URL editor từ `/api/lessons/:id` sang `/api/authoring/lessons/:id`. Bỏ fallback demo. Lấy subject UUID từ registry/DB trước create; không gửi `informatics` vào cột UUID.
- [ ] Nút tạo bài tạo draft thật rồi mở ID thật. Không dùng `new-lesson` như ID và render bản binary-search bất kể ID.
- [ ] Loại lựa chọn role có thể hiểu nhầm là tự cấp quyền trong AccountSettings; quyền đến từ server. Giữ settings ngôn ngữ/đăng xuất hiện có.
- [ ] Chạy tests; nghiệm thu hai user fixture khác role rồi tài khoản test thật khi có sẵn. Không tự tạo/xóa tài khoản production. Commit task.

**Acceptance:** Mỗi request frontend có endpoint tương ứng, phiên hợp lệ và trạng thái dữ liệu thật; reload sau lưu phản ánh dữ liệu đã lưu.

## Task 5: Sửa hydration ngôn ngữ và EN/VI không đồng đều

**Files:** Modify `packages/hooks/src/useLanguage.ts`, `packages/hooks/src/__tests__/useLanguage.test.ts`, `frontend/app/layout.tsx`; Create `frontend/components/localized/{HomeContent,SubjectHeader,LessonHeader,GlossaryHeader,ExamHeader}.tsx`; Modify các page tương ứng để truyền dữ liệu đã đọc từ server vào các component này; Modify `frontend/features/lessons/LessonCompletionBar.tsx`, `frontend/features/ai-tutor/AiTutorPanel.tsx`.

**Interfaces:** Giữ nguyên `{lang,setLang,t}` và storage key `scipal-lang`; không đổi consumer contract hoặc mobile React alias.

- [ ] Thêm test SSR bằng `renderToString`: localStorage chứa EN nhưng initial HTML server/client cùng VI; sau effect chuyển EN. Test hai hook đồng bộ, storage bị từ chối không làm crash, lựa chọn VI/EN không reset route.
- [ ] Chạy `pnpm --filter @scipal/hooks test`; xác nhận regression trước sửa.
- [ ] Khởi tạo state bằng `DEFAULT_LANG` ở cả server/client, đọc giá trị đã lưu trong effect; bọc storage get/set trong try/catch. Giữ broadcast subscribers. Đây là sửa tối thiểu; chấp nhận đổi nhãn sau hydration, không dùng `suppressHydrationWarning` che lỗi.

```ts
const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);
// The existing mount effect reads storage after hydration.
// Storage failure falls back to the in-memory selection/default.
```

- [ ] Đồng bộ `document.documentElement.lang` với ngôn ngữ đã mount bằng một component client nhỏ trong root layout. Không client hóa toàn bộ page/truy vấn server.
- [ ] Thay chuỗi cố định trong các header/CTA/trạng thái đang được audit bằng cặp EN/VI; giữ nguyên nội dung bài từ DB. Sửa “Gửi/Đóng/Hoàn thành”, breadcrumb và nhãn ví dụ trong từ điển.
- [ ] Browser: chọn EN, reload home/glossary/exam, xem console không còn hydration error; client navigation vẫn EN. Kiểm tra VI, storage bị chặn qua unit test. Commit task.

**Acceptance:** Không còn lỗi mismatch do ngôn ngữ; các phần đã rà không trộn nhãn EN/VI ngoài nội dung song ngữ cố ý.

## Task 6: Ràng buộc chấm thi với đề và lượt thi server

**Files:** Modify `backend/src/routes/exam.ts`, `backend/src/__tests__/exam.test.ts`, `frontend/features/exam/examQueries.ts`, `frontend/features/exam/ExamRunner.tsx`, `backend/src/plugins/auth.ts`, `frontend/app/exam/page.tsx`, `frontend/app/exam/[blueprintId]/page.tsx`; Create `backend/src/services/exam-attempts.ts`, `supabase/migrations/0007_exam_attempts.sql`, `supabase/tests/exam_attempts.sql`, `packages/types/src/exam-contract.ts`, `packages/types/src/public-question.ts`; Modify `packages/types/src/index.ts` để export contracts.

**Interfaces:**

```ts
type ExamAnswer = {
  question_id: string;
  selected_option?: string;
  items?: { id: string; selected: boolean }[];
  short_answer?: string;
};
// POST /api/exam/:blueprintId/attempts
// => { attempt_id, expires_at, questions: PublicQuestion[] }
// POST /api/score/exam body: { attempt_id, answers: ExamAnswer[] }
// => { score, correct_count, total_questions, xp_earned }
// GET /api/exam/attempts/:attemptId returns own attempt/status/public questions.
// GET /api/exam-blueprints returns only real, usable blueprints.
```

- [ ] Sửa authPlugin để whitelist theo METHOD + route cụ thể: GET health, GET exam-blueprints, GET lesson public questions, POST survey được công khai; start/read attempt và score bắt buộc auth. Bỏ miễn auth theo toàn bộ prefix `/api/exam/`. Test POST start và GET attempt không token=>401, cả khi route có query string.
- [ ] Test unknown blueprint=>404; bank insufficient=>422; questions chọn theo subject/type/difficulty/count trong blueprint, không `.limit(20)` toàn ngân hàng.
- [ ] Add tests: trả đúng 1/5 câu =>2/10; bỏ trống tính sai; duplicate IDs=>400; câu ngoài lượt thi=>400; người khác submit=>403; legacy body chỉ blueprint_id không attempt=>400. Short answer trim/NFKC/case normalization rồi so exact key; không tự dùng AI chấm tự luận.
- [ ] Chạy focused exam tests để ghi nhận các failure. Tạo PublicQuestion bằng allowlist stem/options/item text; tuyệt đối không spread raw JSON có answer/rubric/explanation bí mật.
- [ ] Migration thêm duration_minutes (mặc định 45, kiểm tra >0) cho blueprint, bảng exam_attempts và exam_attempt_questions. Lưu owner, blueprint, started/expires/submitted, kết quả; snapshot câu hỏi/đáp án chỉ server đọc, để sửa ngân hàng không đổi đề đã giao. Không xóa dữ liệu thi lịch sử.
- [ ] Chỉ cho một lượt đang mở mỗi user/blueprint; POST start retry trả lại lượt còn hạn. Dùng thời gian DB; server không tin timer/score/subject_id client. Hết hạn và chưa chấm thì trả409 EXAM_EXPIRED, không cấp XP; client hiển thị kết thúc và có thể bắt đầu lượt mới. Retry một lượt đã chấm trả cùng kết quả trước khi xét hết hạn.
- [ ] Điểm luyện tập: mỗi câu trọng số bằng nhau; true/false đúng đủ ý mới tính đúng; score = số đúng/tổng số câu snapshot ×10. Đây là quy tắc luyện tập hiện tại, không quảng bá là thang thi tốt nghiệp. Khuôn grade12 chưa được xác minh thì chưa mở.
- [ ] Function Postgres finalize khóa row attempt, tính/lưu kết quả và ghi xp_log trong cùng transaction; không nhận điểm/XP do client gửi. Quyền execute chỉ service_role. Thêm unique theo attempt cho log; hai request đồng thời không thể ghi hai lần. Tạm thời XP chỉ cấp cho lần hoàn thành đầu tiên của user/blueprint để tránh farm bằng cách mở lại lượt; các lượt sau vẫn chấm điểm và xp=0.
- [ ] Frontend giữ runner/timer/palette; start attempt thật, dùng expires_at, nộp attempt_id; URL query `attempt` giữ lượt khi reload. Không còn ba đề mẫu khi API lỗi; danh sách rỗng hiển thị chưa có đề. Đồng hồ frontend chỉ hỗ trợ hiển thị.
- [ ] Chạy unit/injection tests, DB concurrency test và trình duyệt reload/timeout/retry. Chưa có DB test thì không gọi tính nguyên tử là đã chứng minh. Commit task.

**Acceptance:** Một câu không thể thành 10/10 trong đề năm câu, sai blueprint không sinh đề demo, replay/concurrency không cấp XP lặp, client không có đáp án.

## Task 7: Nối quiz bài học, tài nguyên và lưu tiến độ nguyên tử

**Files:** Modify `frontend/components/blocks/{BlockRenderer,QuizBlock,ResourceRefCard,InteractiveRenderer}.tsx`, `frontend/features/lessons/lessonDetailQuery.ts`, `frontend/features/lessons/LessonCompletionBar.tsx`, `backend/src/routes/score.ts`, `backend/src/__tests__/score.test.ts`; Create `backend/src/routes/lesson-questions.ts`, `supabase/migrations/0008_lesson_completion.sql`, `supabase/tests/lesson_completion.sql`; Modify `backend/src/index.ts`.

**Interfaces:** `PublicQuestion` do Task 6 xuất từ `packages/types/src/public-question.ts`, chỉ chứa id/type/stem/options hoặc item text. `GET /api/lessons/:id/questions` trả câu tham chiếu trong blocks của bài published. `POST /api/score/lesson` giữ body `{lesson_id, answers}`, server kiểm tra quiz của bài trước finalize. Quiz state nằm ở wrapper client của bài, không ở từng renderer riêng lẻ mất khi nộp.

- [ ] Test bài chưa published=>404; ID câu ngoài bài/trùng ID=>400; thiếu câu bắt buộc=>422; câu trả lời sai có điểm thấp hơn nhưng không tự coi đã làm đúng. Bài không có quiz chỉ ghi nhận đã đọc, không ghi `score:100` như chứng nhận đúng toàn bộ; score=null.
- [ ] Test PublicQuestion không có answer/answer_key/correct/rubric; QuizBlock chọn đáp án chỉ ghi lựa chọn, không đọc `data.answer` hay tự tô đúng/sai từ key client.
- [ ] Nối quiz renderer với câu hỏi thật, state câu trả lời và API. Server xác định bộ câu từ bài, tính score cho quiz bằng cùng quy tắc luyện tập Task 6; hoàn thành khi trả lời đủ, không bắt buộc tất cả đúng. Giữ mốc 100 XP/lần hoàn thành đầu tiên như hiện tại; nhãn phân biệt hoàn thành với đạt điểm tuyệt đối.
- [ ] Migration function hoàn thành bài khóa theo user/lesson, ghi progress/XP/streak trong một transaction. Ngày học dùng `Asia/Ho_Chi_Minh`; serialize cập nhật streak theo user/subject. Duplicate/retry trả xp0 và streak thật, không reset về0. Không cấp badge khi chưa có evaluator được kiểm chứng.
- [ ] Bài có reference câu sai/mất thì báo nội dung cần cập nhật và chặn hoàn thành, không bỏ qua quiz. Resource đọc bảng resources qua resource_id; URL thiếu/không hợp lệ hiển thị unavailable, không thay bằng VisuAlgo cố định. Link ngoài có nhãn và `rel="noopener noreferrer"`.
- [ ] Interactive chưa có implementation hiển thị “Mô phỏng này đang được hoàn thiện”, không nói sẵn sàng ở chế độ khác. Không dựng mini-app mô phỏng trong đợt này.
- [ ] Chạy score/public DTO tests, DB simultaneous completion test, browser quiz→submit→reload. Guest đọc bài được; lưu cần login với return URL gồm query. Commit task.

**Acceptance:** Bài có quiz dùng được; tiến độ/XP nhất quán và không có điểm100 giả cho bài chưa chấm; resource theo dữ liệu thật.

## Task 8: Hoàn thiện kết nối AI Tutor hiện có

**Files:** Create `backend/src/routes/ai.ts`, `backend/src/__tests__/ai.test.ts`, `frontend/features/ai-tutor/sse.ts`; Modify `backend/src/index.ts`, `backend/src/providers/ai.ts`, `frontend/features/ai-tutor/useAiChat.ts`, `frontend/features/ai-tutor/AiTutorButton.tsx`, `frontend/features/ai-tutor/AiTutorPanel.tsx`, `frontend/lib/api.ts`, lesson page.

**Interfaces:** Giữ `POST /api/ai/chat` body hiện có. SSE frames UTF-8: `event: delta` + `data: {"text":"..."}`, `event: done` + `data: {}`, hoặc `event: error` + `data: {"code":"AI_UNAVAILABLE"}`; mỗi frame kết thúc bằng dòng trống. Không stream raw provider packet sang client.

- [ ] Add tests 401 không token, 404 bài không published, 400 ngôn ngữ/message sai, 409 khi user đang có lượt thi còn hạn, 503 chưa cấu hình provider. Fake provider stream hai chunks và lỗi giữa chừng; không gọi nhà cung cấp thật trong unit tests.
- [ ] Validate tối đa 20 messages, 4000 ký tự/message, role user/assistant, request body 128KB. Backend tự lấy bài/thuật ngữ theo lesson và xác minh subject; không tin system prompt client. Context loại quiz answer/explanation/rubric bí mật.
- [ ] Register route trong index; dùng factory provider hiện có, xác minh model cấu hình lúc triển khai qua tài liệu nhà cung cấp nếu cần đổi, không tự nâng SDK. Một stream/user, tối đa10 request/phút/user và deadline60s; giải phóng khóa khi disconnect/error/finally. Đây là limiter một instance, ghi rõ giới hạn triển khai.
- [ ] Truyền session token thật khi gửi, xử lý401 bằng yêu cầu đăng nhập có return URL; AbortController hủy request khi đóng/unmount. Extend provider interface với optional `{signal?: AbortSignal}` và truyền signal tới request SDK để hủy upstream.
- [ ] Parser giữ buffer qua chunks, chỉ parse frame hoàn chỉnh, hỗ trợ CRLF và ký tự Unicode bị chia byte; không nối raw `data:` vào câu trả lời. Lỗi giữa chừng giữ phần đã nhận và hiện trạng thái chưa hoàn tất; retry không nhân đôi message user.
- [ ] Khi offline disable gửi, giải thích lý do; chưa cấu hình AI thì hiện chưa khả dụng. Bỏ lời quảng bá “24/7” trước nghiệm thu thật.
- [ ] Chạy API tests với fake provider; kiểm tra parser split frames/Unicode và browser đóng panel khi đang stream. Kiểm thử nhà cung cấp thật là bước riêng có cấu hình hợp lệ, không cần để chạy bộ tests. Commit task.

**Acceptance:** Panel hiện có nói chuyện qua backend với framing đúng và lỗi rõ ràng; không gửi secret hoặc đáp án xuống client, không cho dùng AI khi đang có lượt thi còn hạn.

## Task 9: Tinh chỉnh giao diện/điều hướng trên component hiện có

**Files:** Modify `frontend/components/nav/{NavBar,SubjectSwitcher,LanguageToggle,OnlinePill}.tsx`, `frontend/app/globals.css`, `frontend/features/subjects/SubjectContext.tsx`, `frontend/lib/subject-config.ts`, `frontend/features/lessons/TopicAccordion.tsx`, home/subject/lesson/glossary/exam pages, `frontend/app/login/page.tsx`; reuse `packages/ui/src/tokens.ts`, `packages/ui/src/SubjectProvider.tsx`.

**Interfaces:** Giữ route hiện tại. Bộ lọc danh sách dùng query `grade=10|11|12`, `topic=<id>`, `q=<text>`; metadata thật quyết định danh sách. Missing grade mặc định11; invalid grade chuẩn hóa11; unknown topic về tất cả. Breadcrumb giữ query; login return URL giữ pathname+query và chỉ cho nội bộ an toàn.

- [ ] Chụp baseline cùng viewport/theme cho home, danh sách, bài, glossary, exam và login trước khi sửa. Giữ layout, navbar xanh và hiệu ứng form làm tiêu chí đối chiếu.
- [ ] Hợp nhất nguồn token/provider; bỏ accent ở root, chuyển màu phụ thuộc môn về wrapper. Giữ bảng màu đang có ở đợt này; chỉ chỉnh cặp màu không đạt tương phản, không đổi palette hàng loạt.
- [ ] Bổ sung trạng thái active cho route con, focus-visible, Escape/click outside, đóng menu khi đổi route/breakpoint. Menu mobile cuộn trong viewport; giữ ngôn ngữ/nút mở dễ bấm.
- [ ] Dùng query cho bộ lọc hiện có/bổ sung tối thiểu; không viết lại accordion. Back/Forward/reload giữ ngữ cảnh; empty khác error. Return URL từ chối URL ngoài, `//`, backslash và vòng lặp `/login`.
- [ ] Bỏ “S9”, “§9.7”, “SERVER-AUTHORITATIVE” khỏi copy học sinh; giữ tính năng đúng trạng thái thực tế. Đồng bộ font/khoảng cách/header/nút qua token chung, không thay nội dung bài và luồng editor.
- [ ] Test browser 320/390/768/1024/1440px, EN/VI, zoom200%, Tab/Escape, reduced motion; không tràn ngang shell. So login trước/sau cả sáng/tối: inset/focus glow, CTA hover và chuyển cảnh còn hoạt động.
- [ ] Commit chỉ phần nâng cấp đã chứng minh. Không coi lỗi nghiệp vụ còn lại là lý do thay toàn bộ UI.

**Acceptance:** Web vẫn nhận ra là SciPal hiện tại, điều hướng rõ hơn, EN/VI đồng bộ và không mất hiệu ứng login.

## Task 10: Nghiệm thu và cập nhật trạng thái thực tế

**Files:** Modify `PROJECT_STATE.md`, `docs/superpowers/specs/2026-09-23-existing-web-remediation-design.md`; Create `docs/superpowers/reviews/2026-09-23-existing-web-remediation-verification.md` khi thực thi xong.

- [ ] Chạy các test của task vừa thay đổi trong suốt quá trình. Trước bàn giao module chạy `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build` theo workflow repo và `git diff --check`.
- [ ] Kiểm tra toàn bộ request trong các luồng đã sửa: khách, học sinh, giáo viên, admin; phiên hết hạn; mạng lỗi; DB lỗi; dữ liệu rỗng. Chỉ dùng tài khoản/dataset test, không sửa dữ liệu học sinh thật để thử.
- [ ] Đối chiếu policy/grants và kiểm thử transaction ở DB test. Ghi rõ migration nào chỉ mới chuẩn bị và migration nào đã áp trong môi trường nào.
- [ ] Ghi bảng before/after cho mỗi phát hiện khảo sát; phân biệt browser observation, handler fixture, integration DB, auth/provider thật. Tests pass không tương đương production đã hoạt động.
- [ ] Cập nhật PROJECT_STATE theo kết quả, giữ danh sách phần chưa triển khai. Spec shell cũ được đánh dấu không dùng để redesign; quyết định mới là nâng cấp tại chỗ. Không ghi “100% toàn web” nếu còn luồng chưa nghiệm thu.
- [ ] Review diff và đưa người dùng xem kết quả trước bước triển khai. Không tự push/deploy hoặc áp DB đang dùng trong task lập kế hoạch này.

## Self-review và giới hạn kế hoạch

- Bao phủ các phát hiện: quyền classes/authoring (1), RLS/grants (2), false success/demo (3), missing endpoints/tokens (4), hydration/bilingual (5), blueprint/scoring/idempotency (6), quiz/XP/resources/placeholder (7), AI route/SSE (8), UI/navigation/theme scope (9), bằng chứng bàn giao (10).
- Các quyết định nghiệp vụ cần người dùng review cùng plan: roster chỉ teacher-owner/admin; teacher biên soạn chung; chấm luyện tập trọng số đều; quá hạn chưa nộp không cấp XP; XP thi chỉ lần đầu/user/blueprint; bài không quiz là ghi nhận đã đọc với score=null.
- Tách commit/task theo deliverable nhưng các task 6–8 có giao diện liên quan: PublicQuestion được tạo trong Task 6 và dùng lại Task 7; không tạo hai type khác nhau. Task 8 đọc attempt status từ Task 6.
- Không tự đánh giá compliance/pháp lý; không coi policy migration trong repo là trạng thái DB đang chạy. Không mở rộng bài toán sang thiết kế lại toàn hệ thống.

## Regression test code khởi đầu cho các lỗi đã tái hiện

Các test dưới đây dùng handler thật với dữ liệu fixture và không kết nối database. Đặt vào test file của task tương ứng, chạy đỏ trước sửa. Những ma trận ownership, concurrency và integration đã nêu trong từng task vẫn bắt buộc; các test này không thay thế chúng.

Task 1, `backend/src/__tests__/classes.test.ts`:

```ts
it('rejects a student before trying to create a classroom', async () => {
  const app = Fastify();
  app.addHook('onRequest', async request => {
    Object.assign(request, {
      user: { id: '11111111-1111-4111-8111-111111111111',
        app_metadata: { app_role: 'student' } },
    });
  });
  await app.register(classRoutes);
  try {
    const res = await app.inject({ method: 'POST', url: '/api/classes',
      payload: { name: 'Fixture class',
        subject_id: '22222222-2222-4222-8222-222222222222' } });
    expect(res.statusCode).toBe(403);
  } finally { await app.close(); }
});
```

Task 3, toàn bộ test khởi đầu `backend/src/__tests__/survey.test.ts`:

```ts
import { it, expect } from 'vitest';
import Fastify from 'fastify';
import { surveyRoutes } from '../routes/survey.js';

it('does not acknowledge a survey that has no persistence', async () => {
  const app = Fastify();
  await app.register(surveyRoutes);
  try {
    const res = await app.inject({ method: 'POST', url: '/api/survey',
      payload: { type: 'post_lesson', payload: {
        lesson_id: '22222222-2222-4222-8222-222222222222',
        rating: 5, difficulty: 'medium', feedback: 'Fixture',
      } } });
    expect(res.statusCode).toBe(503);
    expect(res.json()).not.toHaveProperty('ok', true);
  } finally { await app.close(); }
});
```

Task 6, `backend/src/__tests__/exam.test.ts`:

```ts
it('rejects scoring without a server-issued attempt', async () => {
  const app = Fastify();
  app.addHook('onRequest', async request => {
    Object.assign(request, {
      user: { id: '11111111-1111-4111-8111-111111111111' },
    });
  });
  await app.register(examRoutes);
  try {
    const res = await app.inject({ method: 'POST', url: '/api/score/exam',
      payload: { blueprint_id: 'does-not-exist',
        answers: [{ question_id: 'q-demo-1', selected_option: 'opt-b' }] } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).not.toHaveProperty('score', 10);
  } finally { await app.close(); }
});
```

Task 5, thêm `createElement` từ React và `renderToString` từ react-dom/server vào test hook hiện có:

```ts
it('uses the same initial language for SSR regardless of browser storage', () => {
  localStorage.setItem('scipal-lang', 'en');
  function Probe() {
    const { lang } = useLanguage();
    return createElement('span', null, lang);
  }
  expect(renderToString(createElement(Probe))).toBe('<span>vi</span>');
});
```

Chạy các file backend nói trên bằng `pnpm --filter @scipal/api exec vitest run src/__tests__/classes.test.ts src/__tests__/survey.test.ts src/__tests__/exam.test.ts`, và hook bằng `pnpm --filter @scipal/hooks test`. Khi thay đổi contract attempt, cập nhật test legacy mong200 thành test từ chối400; không xóa test chỉ để làm suite xanh.
