# Project Context

## 1. Mục đích dự án (Project Purpose)
SciPal là nền tảng học tập khoa học tự nhiên song ngữ (EN/VI) cho học sinh THPT Việt Nam (lớp 10, 11, 12).
- Môn học tham chiếu đầu tiên: **Tin học (Informatics)**.
- Mở rộng theo kiến trúc "Cắm dữ liệu": Toán, Vật lí, Hoá học, Sinh học.
- Triết lý cốt lõi: **Xây dựng bộ khung giao diện 1 lần, nạp nội dung theo môn qua dữ liệu**.

## 2. Tech Stack thực tế (Verified)
- **Runtime**: Node.js `>= 20.0.0` (được verify tương thích với Node 24).
- **Package Manager**: `pnpm@9.15.9` (sử dụng pnpm workspaces).
- **Monorepo Engine**: `turbo@2.11.2`.
- **Backend (`backend/`)**: Fastify 4.29, `@fastify/cors`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `openai`, `tsx`, `vitest`.
- **Web Frontend (`frontend/`)**: Next.js 15.5.25 (App Router), React 19.0.0, Tailwind CSS 3.4, `@supabase/ssr`.
- **Mobile (`mobile/`)**: Expo 52.0.0, React Native 0.76.7, React 18.3.1, `expo-router` 4, NativeWind 4.0.1.
- **Shared Packages (`packages/*`)**: TypeScript 5.5, Zod 3.23 (validation), Vitest 5.0.1 (testing).
- **Database & Auth**: Supabase Postgres (Row-Level Security bật 100% trên bảng người dùng), Supabase Auth.

## 3. Cấu trúc Repository & Phân nhiệm thư mục
```text
d:\Code\SciPal\
├── backend/            # @scipal/api — Fastify API chạy trên VM (Docker), proxy AI và chấm điểm
├── frontend/           # @scipal/web — Next.js 15 Web App (triển khai Vercel)
├── mobile/             # @scipal/mobile — Expo 52 Native Mobile App (EAS)
├── packages/
│   ├── types/          # @scipal/types — Zod schemas (BlockSchema, QuestionSchema, SubjectSchema)
│   ├── ui/             # @scipal/ui — Tokens (SCIPAL_GREEN, SUBJECT_TOKENS), SubjectProvider, useAccent
│   ├── hooks/          # @scipal/hooks — useLanguage (EN/VI toggle, persisted localStorage)
│   └── supabase/       # @scipal/supabase — Typed clients (createBrowserClient, createServerClient)
├── supabase/
│   ├── migrations/     # SQL migrations: 0001_subjects, 0002_content, 0003_user_data, 0004_rls
│   └── seed/           # Seed data: 5 môn học (subjects.sql), bài mẫu Tin học (informatics_sample.sql)
├── docs/
│   └── superpowers/    # Specs (v1.5) và implementation plans (Plan 0, Plan 1, Plan 2)
├── AGENTS.md           # Entry point chỉ mục cho AI agents
├── PROJECT_STATE.md    # Trạng thái công việc và task hiện tại (dynamic)
├── package.json        # Root scripts & devDependencies
├── pnpm-workspace.yaml # Workspace definitions (backend, frontend, mobile, packages/*)
└── turbo.json          # Turbo build/test/typecheck pipeline
```

## 4. Dịch vụ bên ngoài (External Services)
- **Supabase**: Cơ sở dữ liệu Postgres + Storage + Authentication.
- **Anthropic Claude API & OpenAI API**: Kết nối qua backend Fastify (`backend/src/providers/ai.ts`), không bao giờ gọi trực tiếp từ client.

## 5. Lệnh thực thi thực tế (Commands)
Tất cả chạy từ root repository:
```bash
# Kiểm tra TypeScript toàn bộ workspace (7 packages/apps)
pnpm turbo typecheck

# Chạy toàn bộ test suites (Vitest 33 tests hiện tại)
pnpm turbo test

# Build toàn bộ workspace
pnpm turbo build

# Chạy dev server
pnpm turbo dev

# Quản lý dependency (KHÔNG dùng npm/yarn)
pnpm install
pnpm --filter @scipal/web add <package>
pnpm --filter @scipal/api add <package>
```

## 6. Ràng buộc quan trọng của sản phẩm (Constraints)
- **Không hard-code màu**: Biến màu `--accent` được điều khiển bằng `SubjectProvider`.
- **Song ngữ bắt buộc**: Tất cả trường văn bản người dùng đọc được phải ở dạng `{ en, vi }` hoặc cột `_en`/`_vi`.
- **Bảo mật**: `SERVICE_ROLE` key và AI API keys chỉ được đặt trong `backend/.env`.
- **Server-authoritative**: XP, Streak, Badges và kết quả thi chỉ được ghi nhận bởi server (`backend/src/routes/`), cấm client tự cập nhật.
