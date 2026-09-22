# Architecture & System Design

## 1. High-Level Architecture & Data Flow

```text
[ Web (Next.js 15) ]    [ Mobile (Expo 52) ]
        │                       │
        ├───────────────────────┴────────────────────────┐
        ▼                                               ▼
[ Supabase (Postgres + Auth) ]                [ Fastify API (backend/) ]
  - Public read: content tables (RLS)           - Auth validation: Bearer JWT
  - User read/write: user tables (RLS)          - Proxy AI Tutor (Claude/OpenAI)
  - Sessions: JWT cookie / Auth Header          - Chấm điểm & ghi nhận XP, Streak
                                                - Authoring Tool (Teacher only)
                                                        │
                                                        ▼
                                              [ Supabase (service_role) ]
                                              [ Claude / OpenAI APIs ]
```

- **Đọc dữ liệu nội dung & tiến trình người dùng**: Client truy vấn trực tiếp Supabase qua `@scipal/supabase` (`createBrowserClient` / `createServerClient`) tận dụng RLS.
- **Nghiệp vụ nhạy cảm & AI**: Bắt buộc đi qua `backend/` (`POST /api/ai/chat`, `POST /api/score/*`, `PATCH /api/authoring/*`).

## 2. Ranh giới Frontend / Backend (Boundaries)
- **Frontend (`frontend/`, `mobile/`)**:
  - Chỉ giữ `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  - Không bao giờ chứa API keys của AI hoặc `SERVICE_ROLE_KEY`.
  - Không bao giờ nhận đáp án trắc nghiệm (`answer`, `answer_key`) của bài thi hoặc quiz.
- **Backend (`backend/`)**:
  - Giữ `SUPABASE_SERVICE_ROLE_KEY`, `CLAUDE_API_KEY`, `OPENAI_API_KEY`.
  - Middleware `authPlugin` (`backend/src/plugins/auth.ts`) xác thực token người dùng qua `supabase.auth.getUser(token)`.

## 3. Shared Packages & Tái sử dụng
- `@scipal/types` (`packages/types`):
  - Khai báo Zod schema cho 7 loại block nội dung (`BlockSchema`), câu hỏi (`QuestionSchema`), và môn học (`SubjectSchema`).
  - Source of truth cho kiểu dữ liệu của toàn bộ repo.
- `@scipal/ui` (`packages/ui`):
  - Quản lý token màu sắc (`tokens.ts`): `SCIPAL_GREEN` (#16a34a) và `SUBJECT_TOKENS`.
  - Cung cấp `SubjectProvider`, `useSubject()`, `useAccent()`.
- `@scipal/hooks` (`packages/hooks`):
  - `useLanguage`: Quản lý ngôn ngữ `lang` ('en' | 'vi'), hàm dịch `t({ en, vi })`, lưu trữ `localStorage`.
- `@scipal/supabase` (`packages/supabase`):
  - Khởi tạo client Supabase chuẩn hóa cho cả client-side và SSR (`@supabase/ssr`).
  - Chứa TypeScript definition cho 16 bảng cơ sở dữ liệu (`types.ts`).

## 4. State & Theming Patterns
- **Theming qua Scoped CSS Variable**:
  - Màu nhận diện môn học `--accent` được đặt trực tiếp trên thẻ bao bọc (wrapper div) bởi `SubjectProvider` (`packages/ui/src/SubjectProvider.tsx`).
  - **Cấm** gán `--accent` lên `:root` toàn cục để tránh lem màu (accent bleed) khi render nhiều môn học hoặc chuyển trang.
- **Quản lý ngôn ngữ**:
  - Hook `useLanguage()` (`packages/hooks/src/useLanguage.ts`) là cơ chế duy nhất để đọc và chuyển đổi ngôn ngữ giao diện.

## 5. Abstraction & Extensibility Patterns
- **AI Provider Swappable**:
  - `backend/src/providers/ai.ts` định nghĩa `AIProvider` interface (`chat(messages, systemPrompt): AsyncIterable<string>`).
  - Triển khai sẵn `ClaudeProvider` (`claude-3-5-haiku-20241022`) và `OpenAIProvider` (`gpt-4o-mini`). Lựa chọn qua biến môi trường `AI_PROVIDER`.
- **Content Blocks dạng Discriminated Union**:
  - `BlockSchema` phân biệt các khối qua thuộc tính `type`: `theory`, `code`, `formula`, `quiz`, `interactive`, `term-ref`, `resource-ref`.

## 6. Existing Decisions (Quyết định kiến trúc đã khóa — CẤM tự ý thay đổi)

1. **Ngôn ngữ Backend**: Giữ nguyên Node.js + Fastify trong thư mục `backend/`. Không chuyển sang Python/FastAPI và không chuyển logic AI/scoring vào Next.js Route Handlers.
2. **Cấu trúc thư mục gốc**: Duy trì `backend/`, `frontend/`, `mobile/` ở root (đã chuẩn hóa theo phong cách Katha). Không gộp ngược lại vào `apps/`.
3. **Nguồn chân lý thuật ngữ (Glossary Source of Truth)**: Thuật ngữ khoa học nằm tại bảng `terms`. Trong bài học, các từ khóa bắt buộc dùng block `term-ref` tham chiếu `term_id`, không viết cứng bản dịch inline.
4. **Quyền chấm điểm**: Client không được phép ghi trực tiếp vào bảng `progress`, `xp_log` hay `streaks`. Mọi hành động hoàn thành bài học/bài thi phải gọi API backend.
5. **Xung đột phiên bản React (Mobile vs Web)**: Web dùng React 19, Mobile dùng React 18. `mobile/tsconfig.json` đã map alias `"react": ["./node_modules/@types/react"]` để tránh xung đột type. Giữ nguyên cấu hình này.
