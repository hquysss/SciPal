# Current Project State

## Current Goal
Triển khai toàn bộ 12 màn hình (S1–S12) theo **Đặc tả khung chung SciPal v1.5** với môn Tin học (Informatics) làm môn học tham chiếu chuẩn.

## Current Task
**Ổn định web và nghiệm thu chức năng thực tế (23/09/2026).** Các route S1–S12 đã có giao diện, nhưng trạng thái “100%” của lần bàn giao trước chỉ phản ánh việc có mã màn hình và build được; chưa chứng minh toàn bộ luồng hoạt động end-to-end.
- Đã sửa navbar mobile bị tràn ngang, menu môn học dùng click/bàn phím, và đường đi của khách giữa trang chủ, bài học, từ điển.
- Đã giới hạn các trang cá nhân/thi/giáo viên theo phiên Supabase đã xác minh; bỏ đăng nhập demo tự nhận mọi tài khoản khi lỗi.
- Đã bỏ thông báo XP/điểm giả trên client khi API thất bại; API bài học chỉ báo XP khi lưu được dữ liệu và không cộng lại bài đã hoàn thành.
- Đang tiếp tục đối chiếu các màn hình với dữ liệu và API thật trước khi gọi web hoàn chỉnh.

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

## Next Steps
1. Hoàn thiện `POST /api/ai/chat`, truyền token thật và kiểm thử luồng SSE trước khi quảng bá AI Tutor là hoạt động.
2. Thay danh sách đề thi và câu hỏi demo bằng blueprint thật; kiểm tra đáp án, chấm điểm toàn bộ đề và ghi XP một cách nguyên tử/idempotent.
3. Thay dữ liệu giả trong trang giáo viên, lớp học, hồ sơ/tiến trình bằng dữ liệu Supabase hoặc trạng thái rỗng/lỗi rõ ràng; nghiệm thu với tài khoản học sinh và giáo viên thật.
4. Rà song ngữ EN/VI trên toàn bộ màn hình và bỏ `--accent` khỏi `:root` để tuân thủ SubjectProvider.

## Recent Decisions
- **25/09 — Navbar theo quyền**: Mục cần đăng nhập chỉ hiện khi có user; menu Môn học, Teacher, Admin và thanh điều hướng mobile mở/đóng theo trục dọc từ mép trên. Menu theo role tự đóng khi nhấn Escape, bấm ngoài hoặc đổi trang. Navbar hiển thị tên tài khoản và nút đăng xuất ở mép phải.
- **24/09 — Quản lý tài khoản admin**: Thêm trang `/admin/accounts` để admin tạo tài khoản học sinh/giáo viên, đổi role và xóa tài khoản; route và API đều kiểm tra quyền admin.
- **24/09 — S10 duyệt bài**: Giáo viên tạo/sửa bản nháp hoặc bài bị từ chối rồi gửi vào hàng chờ; nội dung chờ duyệt bị khóa. Chỉ `app_metadata.app_role = admin` mới duyệt/từ chối; duyệt sẽ đặt `published = true`.
- **23/09 — Điều hướng/auth**: Trang học công khai cho khách; trang tiến trình, hồ sơ, phòng thi và studio cần phiên Supabase thật. Quyền giáo viên lấy từ `app_metadata.app_role`.
- **23/09 — Kết quả thật**: Client không tự giả lập XP/điểm khi API lỗi; lỗi lưu phải hiển thị để người học thử lại.
- **Mỹ học @frontend-design**: Chuẩn hóa phong cách *Warm Editorial Science Lab & Tactile Field Notebook* cho cả 12 màn hình.
- **Server-Authoritative**: Chấm điểm thi và bài học hoàn toàn chạy trên backend Fastify. Không bao giờ gửi answer keys xuống client.
- **Bilingual Standard**: Tất cả màn hình đọc ngôn ngữ đồng bộ qua hook `useLanguage()`.
- **Cấu trúc Monorepo**: `backend/`, `frontend/`, `mobile/` đặt tại root, tuân thủ nghiêm ngặt cô lập bí mật `SUPABASE_SERVICE_ROLE_KEY`.

## Known Issues / Blockers
- Luồng duyệt S10 cần áp dụng migration `0006_lesson_review_workflow.sql` vào Supabase đang cấu hình trước khi API dùng các cột `created_by`, `review_status`, `reviewed_by`, `reviewed_at`.
- S10 verification: backend API and shared types typecheck passed. `https://sci-pal-backend.vercel.app/health` responds HTTP 200 and CORS allows `http://localhost:3000`; authenticated lesson flows remain unverified because migration `0006` is not applied to the remote Supabase schema. Web typecheck currently reports React typing mismatches (TS2786/TS2322 in login, TheoryRenderer, UI primitives, and SubjectContext).
- Backend chưa đăng ký route `/api/ai/chat`; nút AI Tutor trên bài học hiện chưa có luồng hoàn chỉnh.
- Đề thi, hồ sơ, lớp học và một số khu vực chưa chuyển dữ liệu thật vẫn còn dữ liệu/fallback demo; không được xem là dữ liệu cá nhân thật.
- Chấm điểm bài học hiện dùng mốc 100 XP phía server nhưng chưa xác minh quiz theo đặc tả; thao tác ghi `progress`/`xp_log` chưa ở một transaction DB.
- Một số nội dung giao diện chưa đổi theo ngôn ngữ EN; `frontend/app/globals.css` còn đặt `--accent` trên `:root` trái quy tắc dự án.

## Important Files
- `docs/superpowers/specs/2026-09-22-scipal-foundation-design.md` — Đặc tả khung chung v1.5 chính thức.
- `docs/superpowers/plans/2026-09-22-plan-1-screens-s1-s7.md` — Kế hoạch chi tiết Plan 1.
- `docs/superpowers/plans/2026-09-22-plan-2-screens-s8-s12.md` — Kế hoạch chi tiết Plan 2.
- `frontend/components/nav/NavBar.tsx` — Thanh điều hướng chính (S1) hỗ trợ chuyển môn, từ điển, thi thử, hồ sơ.
- `frontend/features/exam/ExamRunner.tsx` — Bộ thi thử trực tuyến bảo mật thời gian thực (S9).
- `frontend/features/authoring/LessonEditor.tsx` — Studio biên soạn bài giảng 2 cột cho giáo viên (S10).
- `frontend/features/classes/ClassList.tsx` & `StudentRoster.tsx` — Quản lý lớp học & học sinh (S11).
- `frontend/features/survey/` — Hệ thống khảo sát vi mô, nhu cầu môn học & đề xuất cộng đồng (S12).
