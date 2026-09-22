# Current Project State

## Current Goal
Triển khai toàn bộ 12 màn hình (S1–S12) theo **Đặc tả khung chung SciPal v1.5** với môn Tin học (Informatics) làm môn học tham chiếu chuẩn.

## Current Task
**HOÀN THÀNH 100% TOÀN BỘ 12 MÀN HÌNH (S1–S12)** theo Đặc tả khung chung SciPal v1.5:
- **Plan 0: Foundation (12/12 tasks — 100%)**
- **Plan 1: Core Web Screens S1–S7 (10/10 tasks — 100%)**
- **Plan 2: Advanced Screens & Workflows S8–S12 (6/6 tasks — 100%)**
- Nâng cấp toàn diện mỹ học theo ngôn ngữ thiết kế **Warm Editorial Science Lab & Tactile Field Notebook** (`@frontend-design`).

## Completed

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
- Tất cả các tasks của Plan 0, Plan 1, và Plan 2 đã hoàn thành 100%.

## Next Steps
1. Khởi chạy phát triển ứng dụng di động Expo 52 (`mobile/`) đồng bộ các màn hình đã dựng trên Web.
2. Nạp thêm dữ liệu bài giảng mẫu cho môn Toán, Vật lí, Hóa học và Sinh học dựa trên kết quả khảo sát nhu cầu §9.7.
3. Tích hợp thanh toán hoặc chứng chỉ hoàn thành khóa học theo lộ trình tiếp theo.

## Recent Decisions
- **Mỹ học @frontend-design**: Chuẩn hóa phong cách *Warm Editorial Science Lab & Tactile Field Notebook* cho cả 12 màn hình.
- **Server-Authoritative**: Chấm điểm thi và bài học hoàn toàn chạy trên backend Fastify. Không bao giờ gửi answer keys xuống client.
- **Bilingual Standard**: Tất cả màn hình đọc ngôn ngữ đồng bộ qua hook `useLanguage()`.
- **Cấu trúc Monorepo**: `backend/`, `frontend/`, `mobile/` đặt tại root, tuân thủ nghiêm ngặt cô lập bí mật `SUPABASE_SERVICE_ROLE_KEY`.

## Known Issues / Blockers
- Không có lỗi typecheck hay build blocker nào tồn tại.
- Cần cung cấp `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong môi trường sản xuất thực tế.

## Important Files
- `docs/superpowers/specs/2026-09-22-scipal-foundation-design.md` — Đặc tả khung chung v1.5 chính thức.
- `docs/superpowers/plans/2026-09-22-plan-1-screens-s1-s7.md` — Kế hoạch chi tiết Plan 1.
- `docs/superpowers/plans/2026-09-22-plan-2-screens-s8-s12.md` — Kế hoạch chi tiết Plan 2.
- `frontend/components/nav/NavBar.tsx` — Thanh điều hướng chính (S1) hỗ trợ chuyển môn, từ điển, thi thử, hồ sơ.
- `frontend/features/exam/ExamRunner.tsx` — Bộ thi thử trực tuyến bảo mật thời gian thực (S9).
- `frontend/features/authoring/LessonEditor.tsx` — Studio biên soạn bài giảng 2 cột cho giáo viên (S10).
- `frontend/features/classes/ClassList.tsx` & `StudentRoster.tsx` — Quản lý lớp học & học sinh (S11).
- `frontend/features/survey/` — Hệ thống khảo sát vi mô, nhu cầu môn học & đề xuất cộng đồng (S12).
