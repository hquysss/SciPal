# SciPal — Agent Entry Point

> **SciPal** là nền tảng học tập khoa học tự nhiên song ngữ (EN/VI) dành cho học sinh THPT Việt Nam (ưu tiên môn Tin học), xây dựng trên kiến trúc monorepo: Web (Next.js 15), Mobile (Expo 52), Backend (Fastify 4), cơ sở dữ liệu Supabase Postgres + RLS.

## Nguyên tắc bất biến (Core Invariants)

1. **Nội dung là dữ liệu, không phải code**: Thêm môn học/bài học mới chỉ nạp dữ liệu vào database/JSONB, tuyệt đối không dựng lại hay sửa code giao diện.
2. **Không hard-code màu môn học**: Mọi thành phần phụ thuộc môn học đều đọc qua biến `--accent` được định phạm vi qua `SubjectProvider` (`packages/ui`). Không gán `--accent` lên `:root`.
3. **Song ngữ chuẩn hóa (Bilingual First-Class)**: Toàn bộ nội dung và thuật ngữ có cấu trúc `{ en: string, vi: string }` hoặc cột `_en`/`_vi`.
4. **Chấm điểm & XP do Server quyết định (Server-Authoritative)**: Client không bao giờ tự tính XP, streak hay tự cấp badge. Đáp án câu hỏi (`answer`, `answer_key`) không bao giờ được gửi xuống client.
5. **Cô lập bí mật tuyệt đối**: `SUPABASE_SERVICE_ROLE_KEY` và các AI API keys chỉ tồn tại ở `backend/.env`. Cấm xuất hiện trong `frontend/`, `mobile/` hoặc `packages/`.

## Hướng dẫn định hướng (Navigation)

Mọi agent bắt đầu phiên làm việc **BẮT BUỘC** đọc theo thứ tự:

1. **Quy tắc dự án**:
   - [`.agents/rules/00-project-context.md`](.agents/rules/00-project-context.md) — Tổng quan repo, packages, commands và tech stack thực tế.
   - [`.agents/rules/01-architecture.md`](.agents/rules/01-architecture.md) — Kiến trúc hệ thống, data flow, boundaries và quyết định kiến trúc đã khóa.
   - [`.agents/rules/02-domain-rules.md`](.agents/rules/02-domain-rules.md) — Quy tắc nghiệp vụ đặc thù (content blocks, RLS, tokens, React 18/19 constraints).
   - [`.agents/rules/03-agent-workflow.md`](.agents/rules/03-agent-workflow.md) — Quy trình làm việc bắt buộc của agent (verify, TDD, review).
2. **Trạng thái công việc hiện tại**:
   - [`PROJECT_STATE.md`](PROJECT_STATE.md) — Mục tiêu đang làm, task dở dang, quyết định gần nhất và phần "Do Not Redo".
3. **Kế hoạch thực thi chi tiết**:
   - [`docs/superpowers/plans/`](docs/superpowers/plans/) — Bám sát plan đã được approve (Plan 0 hoàn tất, Plan 1: S1–S7, Plan 2: S8–S12).
