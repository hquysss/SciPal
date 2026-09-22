# Current Project State

## Current Goal
Triển khai toàn bộ 12 màn hình (S1–S12) theo **Đặc tả khung chung SciPal v1.5** với môn Tin học (Informatics) làm môn học tham chiếu chuẩn.

## Current Task
Hoàn tất 100% **Plan 1: Core Web Screens (S1–S7)** kèm nâng cấp giao diện chuẩn `@frontend-design`. Sẵn sàng bước sang **Plan 2 (S8–S12: Advanced Screens & Workflows)**.

## Completed
- **Plan 1: Core Web Screens (S1–S7) (Hoàn tất 10/10 tasks — 100%)**:
  - **Task 1: Cấu trúc Frontend, Design Tokens & Subject Context**: Root layout, font Inter + JetBrains Mono, CSS variables scoped cho 5 môn học, shadcn UI components.
  - **Task 2: S1 Navigation Bar**: Brand logo SciPal, `SubjectSwitcher` (dropdown 5 môn học), `LanguageToggle` (song ngữ VI/EN), `OnlinePill` trực tuyến.
  - **Task 3: S2 Trang chủ (Home Page)**: Hero banner khoa học tự nhiên, lưới môn học `SubjectGrid` với nhận diện màu sắc riêng từng môn, dải highlight tính năng.
  - **Task 4: S3 Danh sách bài học**: Route `/[subject]`, danh mục chủ đề & bài giảng `TopicAccordion` với chỉ số bài học và chuyển hướng trực tiếp.
  - **Task 5: S4 Xem bài học & Bộ render 7 loại block nội dung**: Route `/[subject]/[lesson]`, hỗ trợ khối Lý thuyết (Markdown/GFM), Công thức (KaTeX), Mã nguồn (Monaco Editor tabs), Câu hỏi trắc nghiệm (Quiz), Mô phỏng tương tác (Interactive), Thẻ thuật ngữ (`TermRefCard`), Tài nguyên liên kết (`ResourceRefCard`).
  - **Task 6: S5 Panel Gia sư AI**: `AiTutorButton` nút nổi cố định, `AiTutorPanel` khung chat trượt lên kết nối luồng SSE streaming từ backend Fastify.
  - **Task 7: S6 Từ điển thuật ngữ**: Route `/glossary`, thanh tra cứu `GlossarySearch` song ngữ Anh – Việt kèm bộ lọc nhanh theo môn học và thẻ ngữ nghĩa.
  - **Task 8: S7 Trang tiến trình học tập**: Route `/progress`, thẻ tổng điểm XP cấp độ học viên, biểu đồ nhiệt chuỗi ngày học `StreakCalendar` 7 ngày, bức tường thành tựu `BadgeWall`.
  - **Task 9: Backend Scoring & Survey API**: `POST /api/score/lesson` (chấm điểm, cấp XP, cập nhật streak) và `POST /api/survey` (khảo sát & thu thập nhu cầu môn học §9.7).
  - **Task 10: Tích hợp & Kiểm thử toàn diện**: Build production hoàn tất 11/11 pages, 36/36 tests passed, 7/7 packages strict typecheck passed.
  - **Elevate `@frontend-design`**: Tinh chỉnh toàn diện mỹ học theo phong cách *Warm Editorial Science Lab & Tactile Field Notebook* (texture grid giấy kẻ ô, frosted-glass header, card nổi xúc giác, bảng 404 tùy biến).
- **Plan 0: Foundation (12/12 tasks hoàn tất 100%)**:
  - Monorepo Turborepo 2 + pnpm workspaces được thiết lập chuẩn xác.
  - 4 shared packages hoạt động trơn tru:
    - `@scipal/types`: Định nghĩa Zod schemas cho 7 loại block nội dung, questions, subjects.
    - `@scipal/ui`: Hệ thống design tokens, `SubjectProvider` inject biến `--accent`, `useAccent()`.
    - `@scipal/hooks`: `useLanguage` hỗ trợ song ngữ EN/VI và tự động lưu `localStorage`.
    - `@scipal/supabase`: Bộ thư viện kết nối Supabase chuẩn hoá cho Browser và Next.js SSR.
  - Database Supabase Migrations (0001–0004) hoàn chỉnh kèm Row-Level Security (RLS) bảo vệ dữ liệu người dùng.
  - Dữ liệu mẫu (Seed): Khởi tạo 5 môn học và bài học mẫu Tin học (Binary Search với 4 khối nội dung).
  - Backend Fastify (`backend/`) hoàn chỉnh với `authPlugin` xác thực Bearer JWT, `supabasePlugin` và factory `createAIProvider` (Claude 3.5 Haiku + GPT-4o-mini).
  - Frontend (`frontend/`) Next.js 15 App Router shell & Mobile (`mobile/`) Expo 52 NativeWind shell đã build thành công.
  - CI Workflow GitHub Actions cấu hình chạy typecheck/test/build.
  - Tái cấu trúc thư mục monorepo sang `backend/`, `frontend/`, `mobile/` ở root (commit `eabe185`).
  - Toàn bộ 33/33 unit tests pass, 7/7 packages typecheck pass, Next.js build pass.
- **Tài liệu đặc tả & Kế hoạch**:
  - Cập nhật đặc tả v1.5 tại `docs/superpowers/specs/2026-09-22-scipal-foundation-design.md`.
  - Phê duyệt Plan 1 (S1–S7) tại `docs/superpowers/plans/2026-09-22-plan-1-screens-s1-s7.md`.
  - Phê duyệt Plan 2 (S8–S12) tại `docs/superpowers/plans/2026-09-22-plan-2-screens-s8-s12.md`.
  - Thiết lập hệ thống Project Memory (`AGENTS.md`, `PROJECT_STATE.md`, `.agents/rules/*`).

## In Progress
- Hoàn tất Task 2; dừng lại chờ phê duyệt trước khi bắt đầu Task 3 (S2 Trang chủ).

## Next Steps
1. **Plan 1 — Task 3**: Xây dựng S2 Trang chủ (`SubjectGrid.tsx` 5 môn học, Hero banner).
2. **Plan 1 — Task 4**: Xây dựng S3 Danh sách bài học (`TopicAccordion.tsx`, truy vấn Supabase).
3. **Plan 1 — Task 5**: Xây dựng S4 Xem bài học & Bộ render 7 loại block nội dung.
4. **Plan 1 — Task 6**: Xây dựng S5 Panel Gia sư AI kết nối SSE stream từ backend.
5. **Plan 1 — Task 7**: Xây dựng S6 Từ điển thuật ngữ song ngữ có tìm kiếm.
6. **Plan 1 — Task 8 & 9**: Xây dựng S7 Trang tiến trình học tập và hoàn thiện API backend chấm điểm bài học.

## Recent Decisions
- **Cấu trúc thư mục gốc**: Duy trì `backend/`, `frontend/`, `mobile/` ở thư mục gốc (không gom vào `apps/`) để thuận lợi cho triển khai độc lập (Vercel cho frontend, Docker VM cho backend).
- **Backend Stack**: Kiên định sử dụng Node.js Fastify (không đổi sang Python FastAPI).
- **Phân tách Plan**: Tách toàn bộ 12 màn hình thành 2 plan: Plan 1 (S1–S7: Học sinh cơ bản) và Plan 2 (S8–S12: Nâng cao, thi thử, giáo viên, khảo sát).
- **Khảo sát người dùng §9.7**: Được quy hoạch vào S12 với migration `0005_surveys.sql` và API endpoint `POST /api/survey`.

## Known Issues / Blockers
- Warning peer dependency giữa React 18 (Expo 52) và React 19 (Web): Đã được giải quyết triệt để bằng path mapping trong `mobile/tsconfig.json`, không ảnh hưởng tới runtime hay typecheck.
- Cần cung cấp biến môi trường `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` khi chạy thử nghiệm kết nối Supabase thực tế.

## Important Files
- `docs/superpowers/specs/2026-09-22-scipal-foundation-design.md` — Đặc tả khung chung v1.5 chính thức.
- `docs/superpowers/plans/2026-09-22-plan-1-screens-s1-s7.md` — Kế hoạch chi tiết 10 task triển khai màn hình S1–S7.
- `docs/superpowers/plans/2026-09-22-plan-2-screens-s8-s12.md` — Kế hoạch chi tiết 6 task triển khai màn hình S8–S12.
- `packages/types/src/block.ts` — Discriminated union `BlockSchema` bắt buộc cho mọi block nội dung.
- `packages/ui/src/tokens.ts` & `SubjectProvider.tsx` — Nguồn chân lý biến `--accent` và token nhận diện môn học.
- `packages/hooks/src/useLanguage.ts` — Hook song ngữ EN/VI dùng chung cho toàn bộ app.
- `packages/supabase/src/client.ts` — Thư viện khởi tạo client Supabase chuẩn hóa cho client & server.
- `backend/src/plugins/auth.ts` — Middleware Fastify xác thực Bearer token từ Supabase.
- `backend/src/providers/ai.ts` — Factory chuyển đổi linh hoạt Claude và OpenAI.

## Do Not Redo
- **KHÔNG** tạo lại scaffold Turborepo hay khởi tạo lại các shared packages (`types`, `ui`, `hooks`, `supabase`).
- **KHÔNG** sửa đổi cấu trúc monorepo đã chuyển về `backend/`, `frontend/`, `mobile/`.
- **KHÔNG** chỉnh sửa các file migrations cơ sở `supabase/migrations/0001–0004` (đã test kỹ).
- **KHÔNG** tạo thêm abstraction xác thực hay AI provider mới khi `backend/src/` đã có sẵn.
- **KHÔNG** xóa alias `"react"` trong `mobile/tsconfig.json`.
