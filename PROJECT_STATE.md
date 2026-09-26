# Current Project State

## Current Goal
Triển khai toàn bộ 12 màn hình (S1–S12) theo **Đặc tả khung chung SciPal v1.5** với môn Tin học (Informatics) làm môn học tham chiếu chuẩn.

## Current Task
**Ổn định web và nghiệm thu chức năng thực tế (23/09/2026).** Các route S1–S12 đã có giao diện, nhưng trạng thái “100%” của lần bàn giao trước chỉ phản ánh việc có mã màn hình và build được; chưa chứng minh toàn bộ luồng hoạt động end-to-end.
- Đã sửa navbar mobile bị tràn ngang, menu môn học dùng click/bàn phím, và đường đi của khách giữa trang chủ, bài học, từ điển.
- Đã giới hạn các trang cá nhân/thi/giáo viên theo phiên Supabase đã xác minh; bỏ đăng nhập demo tự nhận mọi tài khoản khi lỗi.
- Đã bỏ thông báo XP/điểm giả trên client khi API thất bại; API bài học chỉ báo XP khi lưu được dữ liệu và không cộng lại bài đã hoàn thành.
- Đang tiếp tục đối chiếu các màn hình với dữ liệu và API thật trước khi gọi web hoàn chỉnh.
- **26/09 — Landing theo cấp học:** Đã triển khai cổng chọn Tiểu học/THCS/THPT, lưu lựa chọn khách trong `sessionStorage` của tab đến khi đóng tab, và ghi lựa chọn tài khoản vào `profiles` qua RLS; thêm đổi cấp trong Profile và catalog riêng theo cấp. Navbar cùng switch EN/VI luôn hiện; khách tải lại tab vẫn giữ lựa chọn, tab mới hiện cổng chọn. QA local xác nhận THPT có 5 môn, hai cấp nhỏ có trạng thái danh mục trống hợp lệ. Hạng mục local đã kiểm tra; chưa áp migration/seed từ xa hoặc deploy.

## Completed

Các mục Plan 0–2 dưới đây là **ghi nhận triển khai ban đầu**, không phải kết quả nghiệm thu end-to-end. Những điểm chưa đúng thực tế được ghi ở “Known Issues / Blockers”.

### 1. Plan 2: Advanced Screens & Workflows (S8–S12) (6/6 tasks — 100%):
- **Task 1: S8 — Hồ sơ cá nhân & Cài đặt (Profile & User Settings)**:
  - Route `/profile` (`frontend/app/profile/page.tsx`).
  - Thẻ người dùng xúc giác `ProfileCard` hiển thị avatar, role (Học sinh / Giáo viên), chỉ số tổng XP, bài đã học, chuỗi kỉ lục.
  - Khung `AccountSettings` chọn ngôn ngữ song ngữ EN/VI, chuyển đổi góc nhìn vai trò (Student vs Teacher perspective), và đăng xuất.
  - Lối tắt trực tiếp đến bộ công cụ giảng dạy sư phạm cho giáo viên (S10, S11).
- **Task 2: S9 — Phòng thi thử trực tuyến & Chấm điểm Server-Authoritative (Exam Mode)**:
  - Route `/exam` (Danh sách đề thi) và `/exam/[blueprintId]` (Phòng thi trực tuyến).
  - API `GET /api/exam/:blueprintId/questions`: Lọc và xóa hoàn toàn đáp án (`answer`, `answer_key`), học sinh không bao giờ nhận được đáp án xuống client.
  - Bộ runner `ExamRunner`: Đồng hồ đếm ngược với cảnh báo khẩn cấp khi dưới 5 phút, tự động nộp bài khi hết giờ.
  - Bảng điều hướng câu hỏi trực quan `AnswerPalette` phản hồi xúc giác theo thời gian thực.
  - API `POST /api/score/exam`: Chấm điểm độc quyền phía máy chủ Fastify, quy đổi thang điểm 10 và tích lũy XP.
- **Task 3: S10 — Studio Soạn thảo bài giảng cho giáo viên (Authoring Tool)**:
  - Route `/teacher/lessons` và `/teacher/lessons/[id]`.
  - Bộ thanh công cụ `BlockPalette` thêm nhanh cả 7 loại khối nội dung chuẩn hóa (`theory`, `code`, `formula`, `quiz`, `interactive`, `term-ref`, `resource-ref`).
  - Giao diện 2 cột `LessonEditor`: Cột trái biên soạn nội dung & điều chỉnh thứ tự, cột phải Preview trực tiếp chính xác những gì học sinh nhìn thấy.
  - API `PATCH /api/authoring/lessons/:id`: Xác thực quyền giáo viên server-side và lưu bài giảng / chuyển trạng thái xuất bản.
- **Task 4: S11 — Quản lý lớp học & Danh sách học sinh (Class Management)**:
  - Route `/teacher/classes` và `/teacher/classes/[id]`.
  - Khởi tạo lớp học với mã mời 6 ký tự ngẫu nhiên bảo mật (`CreateClassModal`).
  - Học sinh tham gia lớp tức thì qua mã mời 6 ký tự (`JoinClassModal`).
  - Danh sách lớp học xúc giác `ClassList` kèm nút sao chép mã mời 1 chạm.
  - Bảng học viên `StudentRoster` hiển thị chi tiết điểm XP, bài đã hoàn thành và nút phát động bài tập mới cho cả lớp.
- **Task 5: S12 — Khảo sát & Thu thập nhu cầu người học (§9.7) (Survey Subsystem)**:
  - Khảo sát vi mô sau bài học `PostLessonSurvey`: Đánh giá sao, chip độ khó (Dễ / Vừa sức / Khó) và góp ý, tích hợp trực tiếp vào thanh hoàn thành bài `LessonCompletionBar`.
  - Khảo sát nhu cầu môn học `SubjectDemandModal`: Bình chọn môn KHTN tiếp theo (Toán, Vật lí, Hóa học, Sinh học) kèm khối lớp, gắn trigger tại `DemandPollBanner` trang chủ.
  - Bảng đề xuất cộng đồng `FeatureRequestBoard`: Gợi ý tính năng mới và bình chọn upvote ý tưởng tại trang cá nhân `/profile`.
  - API `POST /api/survey` & Migration `0005_surveys.sql`.
- **Task 6: Kiểm thử toàn diện & Build hoàn tất (End-to-End Build & Release Check)**:
  - Strict TypeScript: 7/7 packages typecheck passed (0 errors).
  - Test suites: 43/43 unit tests passed across types, ui, hooks, supabase, and api.
  - Production build: Next.js 15 build biên dịch thành công toàn bộ 14 routes/pages (`/`, `/[subject]` x 5, `/[subject]/[lesson]`, `/glossary`, `/progress`, `/profile`, `/exam`, `/exam/[blueprintId]`, `/teacher/classes`, `/teacher/classes/[id]`, `/teacher/lessons`, `/teacher/lessons/[id]`, `/_not-found`).

### 2. Plan 1: Core Web Screens (S1–S7) (10/10 tasks — 100%):
- S1 Navigation Bar, S2 Home Page, S3 Lesson List, S4 Lesson View (7 block renderers), S5 AI Tutor Panel (SSE streaming), S6 Glossary, S7 Progress & Gamification.

### 3. Plan 0: Foundation (12/12 tasks — 100%):
- Turborepo 2 + pnpm, 4 shared packages (`@scipal/types`, `@scipal/ui`, `@scipal/hooks`, `@scipal/supabase`), Supabase Postgres migrations 0001–0004 + RLS, Fastify backend với multi-AI provider (Claude/OpenAI).

## In Progress
- Rà và hoàn thiện những luồng còn dựa vào dữ liệu mẫu hoặc thiếu API thật; ưu tiên AI Tutor, thi thử, studio giáo viên và trạng thái dữ liệu cá nhân.
- Landing cấp học đã qua build và QA local. Còn xác minh đồng bộ tài khoản bằng người dùng/thiết bị thật và quy trình phát hành sau khi duyệt migration/seed.

## Next Steps
1. Hoàn thiện `POST /api/ai/chat`, truyền token thật và kiểm thử luồng SSE trước khi quảng bá AI Tutor là hoạt động.
2. Thay danh sách đề thi và câu hỏi demo bằng blueprint thật; kiểm tra đáp án, chấm điểm toàn bộ đề và ghi XP một cách nguyên tử/idempotent.
3. Thay dữ liệu giả trong trang giáo viên, lớp học, hồ sơ/tiến trình bằng dữ liệu Supabase hoặc trạng thái rỗng/lỗi rõ ràng; nghiệm thu với tài khoản học sinh và giáo viên thật.
4. Rà song ngữ EN/VI trên toàn bộ màn hình và bỏ `--accent` khỏi `:root` để tuân thủ SubjectProvider.
5. Deploy backend + frontend của nhánh v1.9 (đợt 1 + đợt 2), rồi áp `20260927090200_v19_drop_legacy_columns.sql`; sau đó chạy tay `supabase/manual/remove_demo_content.sql` (xem trước, rồi đổi `rollback` → `commit`).
6. Admin chưa có giao diện tạo chủ đề/bài (API đã cho phép tạo chủ đề).
7. Hiệu năng: sau khi merge, kiểm tra deployment của `sci-pal-frontend` và `sci-pal-backend` báo region `sin1` (cấu hình trong `frontend/vercel.json`, `backend/vercel.json`); trang môn/bài còn render động mỗi lượt xem — cân nhắc ISR nếu vẫn chậm.

## Recent Decisions
- **26/09 — Vùng server Vercel:** Frontend và backend chạy `iad1` (Mỹ) trong khi Supabase ở `ap-southeast-1` (Singapore) và người dùng ở Việt Nam; chuyển function region sang `sin1` bằng `vercel.json` ở mỗi project. Đo cục bộ bằng Chromium: không có giật phía trình duyệt (~60 fps, CPU nhàn rỗi 1,5–4%), nên độ trễ server ↔ DB là nguyên nhân chính.
- **26/09 — v1.9 đợt 2 (đăng bài từ DB):** Giáo viên/admin tạo chủ đề theo catalog (`POST /api/authoring/topics`), giáo viên tạo bài mọi lớp 1–12 có trong catalog, track tuỳ chọn, nhập khối từ JSON ≤ 1 MB. Trang môn/bài đọc DB và phân biệt 404 với lỗi tải; phòng thi đọc `GET /api/exam/blueprints`; không còn đề/bài demo trong code. Dữ liệu demo trên Supabase dọn bằng `supabase/manual/remove_demo_content.sql` (chạy tay, mặc định rollback; tự gỡ mọi khoá ngoại không cascade tới `lessons`/`exam_blueprints`). Lưu ý: chủ đề demo `topic-f-algorithms` trên DB thật chứa cả bài `test` — sẽ bị xoá theo.
- **27/09 — v1.9 đợt 1 (schema nội dung):** Thêm `curriculum_versions`, `subject_grade_catalog` (29 môn, sinh từ `supabase/catalog/gdpt2018.json` bằng `backend/scripts/generate-catalog-migration.ts`), `subject_tracks`; `lessons.status` bốn trạng thái thay `published`/`review_status`; `topics.grade/kind`; `digital_competency`, `icon_url`, `preferred_code_language`. Landing suy cấp học từ catalog. 26/09: đã áp `20260927090000` và `20260927090100` lên Supabase (chạy thử trong transaction huỷ trước, ghi lịch sử đúng số phiên bản; 29 môn, 163 dòng catalog, 4 track, 2 bài chuyển `published`). **`20260927090200` (xoá cột cũ) chưa áp**: code trên `main` còn đọc `published`/`review_status`, chỉ áp sau khi deploy code nhánh v1.9. Đã chạy thử cả chuỗi migration trên Postgres 16 cục bộ (có seed cũ và DB trống). Seed `supabase/seed/*` đã gỡ.
- **26/09 — Siết bảo mật & toàn vẹn dữ liệu:** Client chỉ còn quyền đọc `progress`/`xp_log`/`streaks`/`user_badges`; `profiles` chỉ cho sửa `display_name`, `avatar_url`, `preferred_education_level`. `questions`/`exam_blueprints` chỉ backend đọc. Policy lớp học dùng hàm `private.is_class_teacher/is_class_member` để hết đệ quy. XP bài thi chỉ được cộng khi `blueprint_id` là UUID có thật trong `exam_blueprints`, một lần mỗi (user, đề) qua `xp_log_exam_once_idx`, reason `exam_complete:<uuid viết thường>`; đề demo/không tồn tại vẫn được chấm điểm nhưng không cộng XP. API lớp học kiểm tra role và quyền sở hữu; khảo sát gắn user khi có token và báo lỗi khi không lưu được. Trang lớp/hồ sơ/tiến trình hiện lỗi thay vì dữ liệu demo. `supabase/full_schema_and_seed.sql` chỉ còn là snapshot lịch sử.
- **26/09 — Phạm vi toàn bộ GDPT 2018 (spec v1.8)**: SciPal không còn giới hạn ở khoa học tự nhiên; catalog hiển thị đầy đủ mọi môn/hoạt động giáo dục theo từng lớp 1–12, môn chưa có học liệu ở trạng thái `compiling` (“Đang biên soạn”). Thay thế định vị “nhiều môn khoa học tự nhiên” của quyết định 25/09 và nhãn “Sắp ra mắt”/seed `upcoming` của quyết định 26/09 bên dưới. Nhận diện môn (tên EN/VI, icon, accent) là dữ liệu bắt buộc cho mọi môn trong `subjects`. Các thay đổi schema của v1.8 (`status` duyệt thay cho `published` boolean, `topics.grade`, `subject_tracks`, `exam_attempts`, `idempotency_key`, consent người giám hộ) chưa được triển khai.
- **26/09 — Landing theo cấp học:** Bắt buộc chọn Tiểu học, THCS hoặc THPT; hai cấp nhỏ hiển thị “Sắp ra mắt” cho tới khi có học liệu/route thật. Mỗi cấp có catalog riêng, không lấy Tin học làm nhận diện sản phẩm. Khách giữ cấp trong `sessionStorage` của tab đến khi đóng; không dùng cookie hoặc `localStorage`. Tài khoản chỉ đọc/ghi `preferred_education_level` qua DB/RLS; có thể đổi cấp trong Profile. Navbar giữ switch EN/VI duy nhất cả khi cổng chọn hiện. Production local QA đã kiểm tra VI/EN, tải lại cùng tab và tab mới. Tắt prefetch tự động ở navbar trên `/`: request count 40 → 32 so với bản ngay trước đó; các phép đo LCP lab dao động và không chứng minh cải thiện CWV.
- **25/09 — Liên hệ footer và thẻ môn học**: Đưa Contact us vào footer với liên kết Facebook/email để thay thông tin sau; marquee môn học cho phép bấm cả bản sao đang hiển thị, dừng khi hover/focus/touch và fade hai mép. Tôn trọng `prefers-reduced-motion`.
- **25/09 — Loading toàn cục**: Thêm fallback `frontend/app/loading.tsx` ở cấp root để mọi route dùng chung màn hình tải toàn trang với thanh tiến trình EN/VI; route content được thay vào sau khi segment sẵn sàng. Tiến trình là ước lượng giao diện và tuân thủ `prefers-reduced-motion`.
- **25/09 — Trang chủ công khai**: Giới thiệu SciPal như không gian học nhiều môn khoa học tự nhiên. Tin học là môn đang có học liệu và dữ liệu ví dụ cho chat Tutor, không phải chủ đề chính của thương hiệu. Chat tự phát theo từng lượt khi card vào khung nhìn mỗi lần ghé landing, giữ transcript đầy đủ sau đó, không có nút phát lại hoặc nhãn “Hội thoại minh họa”. Ghi chú nhỏ vẫn nêu câu trả lời được chuẩn bị sẵn và chưa kết nối AI trực tiếp. Navbar giữ nguyên.
- **25/09 — Lối vào trang chủ**: Thêm liên kết `Trang chủ` / `Home` tới `/` trong menu navbar desktop và mobile; các mục và hành vi khác giữ nguyên.
- **25/09 — Navbar theo quyền**: Mục cần đăng nhập chỉ hiện khi có user; menu Môn học, Teacher, Admin và thanh điều hướng mobile mở/đóng theo trục dọc từ mép trên. Menu theo role tự đóng khi nhấn Escape, bấm ngoài hoặc đổi trang. Navbar hiển thị tên tài khoản và nút đăng xuất ở mép phải.
- **25/09 — Họa tiết navbar**: Dùng `frontend/public/clover.svg` làm họa tiết cỏ bốn lá lặp mờ trên nền navbar xanh; giữ nguyên logo và các mục điều hướng.
- **24/09 — Quản lý tài khoản admin**: Thêm trang `/admin/accounts` để admin tạo tài khoản học sinh/giáo viên, đổi role và xóa tài khoản; route và API đều kiểm tra quyền admin.
- **24/09 — S10 duyệt bài**: Giáo viên tạo/sửa bản nháp hoặc bài bị từ chối rồi gửi vào hàng chờ; nội dung chờ duyệt bị khóa. Chỉ `app_metadata.app_role = admin` mới duyệt/từ chối; duyệt sẽ đặt `published = true`.
- **23/09 — Điều hướng/auth**: Trang học công khai cho khách; trang tiến trình, hồ sơ, phòng thi và studio cần phiên Supabase thật. Quyền giáo viên lấy từ `app_metadata.app_role`.
- **23/09 — Kết quả thật**: Client không tự giả lập XP/điểm khi API lỗi; lỗi lưu phải hiển thị để người học thử lại.
- **Mỹ học @frontend-design**: Chuẩn hóa phong cách *Warm Editorial Science Lab & Tactile Field Notebook* cho cả 12 màn hình.
- **Server-Authoritative**: Chấm điểm thi và bài học hoàn toàn chạy trên backend Fastify. Không bao giờ gửi answer keys xuống client.
- **Bilingual Standard**: Tất cả màn hình đọc ngôn ngữ đồng bộ qua hook `useLanguage()`.
- **Cấu trúc Monorepo**: `backend/`, `frontend/`, `mobile/` đặt tại root, tuân thủ nghiêm ngặt cô lập bí mật `SUPABASE_SERVICE_ROLE_KEY`.

## Known Issues / Blockers
- Migration `20260926090000_security_hardening_rls.sql` và `20260926090100_exam_xp_once.sql` đã áp lên Supabase từ xa ngày 26/09; kiểm tra phía khách (anon) đạt. Còn thiếu: chạy `backend/scripts/verify-rls.ts` với một tài khoản học sinh thử nghiệm để xác nhận phía người dùng đã đăng nhập (lưu cấp học, không ghi được XP/role, không lỗi đệ quy lớp học).
- Landing cấp học: migration `20260925124223_landing_education_levels.sql` và 10 dòng môn `upcoming` chưa áp dụng vào Supabase từ xa; đồng bộ tài khoản đa thiết bị chưa được kiểm chứng bằng test account thật. Khách được kiểm tra cùng tab giữ lựa chọn khi tải lại và tab mới quay về gate. Catalog-error đã được kiểm tra bằng fixture dev; trạng thái dữ liệu production vẫn là live THPT và catalog trống cho hai cấp nhỏ.
- Supabase migration history sync (25/09): linked project already contains the `0006` lesson review columns. Remote migration history was repaired for local versions `0001`–`0006`; `pnpm exec supabase migration list --linked` now matches and `pnpm exec supabase db push --dry-run --linked` reports no pending migrations. This repaired tracking only; it did not re-run the SQL files.
- The live schema still differs from the old migration chain: `resources` uses `type`/`is_external` instead of `category`, `assignments` uses `due_date` instead of `due_at`, and the survey insert policy has a different name. A reproducible local reset remains unverified; `supabase db pull` could not generate the reconciliation migration because Docker/Podman is unavailable.
- S10 verification: backend API and shared types typecheck passed. `https://sci-pal-backend.vercel.app/health` responds HTTP 200 and CORS allows `http://localhost:3000`; authenticated lesson flows remain unverified. Web typecheck currently reports React typing mismatches (TS2786/TS2322 in login, TheoryRenderer, UI primitives, and SubjectContext).
- Backend chưa đăng ký route `/api/ai/chat`; nút AI Tutor trên bài học hiện chưa có luồng hoàn chỉnh.
- Đề thi, hồ sơ, lớp học và một số khu vực chưa chuyển dữ liệu thật vẫn còn dữ liệu/fallback demo; không được xem là dữ liệu cá nhân thật.
- Chấm điểm bài học hiện dùng mốc 100 XP phía server nhưng chưa xác minh quiz theo đặc tả; thao tác ghi `progress`/`xp_log` chưa ở một transaction DB.
- Một số nội dung giao diện chưa đổi theo ngôn ngữ EN; `frontend/app/globals.css` còn đặt `--accent` trên `:root` trái quy tắc dự án.
- Thi thử: XP bài thi đã chặn đề không tồn tại và chỉ cộng một lần mỗi đề, nhưng chưa kiểm tra câu hỏi có thuộc đề hay không, và `/api/score/exam` vẫn cho biết đúng/sai từng câu (có thể dò đáp án). Trước khi seed đề thật: kiểm tra câu hỏi theo `exam_blueprints.sections`, giới hạn XP theo số câu của đề, và áp migration `20260926090100_exam_xp_once.sql` không muộn hơn lúc deploy backend.

## Important Files
- `docs/superpowers/specs/2026-09-22-scipal-foundation-design.md` — Đặc tả khung chung v1.9 chính thức.
- `docs/superpowers/plans/2026-09-22-plan-1-screens-s1-s7.md` — Kế hoạch chi tiết Plan 1.
- `docs/superpowers/plans/2026-09-22-plan-2-screens-s8-s12.md` — Kế hoạch chi tiết Plan 2.
- `frontend/components/nav/NavBar.tsx` — Thanh điều hướng chính (S1) hỗ trợ chuyển môn, từ điển, thi thử, hồ sơ.
- `frontend/features/exam/ExamRunner.tsx` — Bộ thi thử trực tuyến bảo mật thời gian thực (S9).
- `frontend/features/authoring/LessonEditor.tsx` — Studio biên soạn bài giảng 2 cột cho giáo viên (S10).
- `frontend/features/classes/ClassList.tsx` & `StudentRoster.tsx` — Quản lý lớp học & học sinh (S11).
- `frontend/features/survey/` — Hệ thống khảo sát vi mô, nhu cầu môn học & đề xuất cộng đồng (S12).
