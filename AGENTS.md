# SciPal — Agent Entry Point

> **SciPal** là nền tảng học tập song ngữ (EN/VI) theo toàn bộ Chương trình GDPT 2018 cho học sinh Việt Nam lớp 1–12 (hiện phát hành THPT, ưu tiên môn Tin học; môn chưa có học liệu hiển thị "Đang biên soạn"), xây dựng trên kiến trúc monorepo: Web (Next.js 15), Mobile (Expo 52), Backend (Fastify 4), cơ sở dữ liệu Supabase Postgres + RLS.

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
   - [`.agents/rules/04-ui-ux-redesign.md`](.agents/rules/04-ui-ux-redesign.md) — Hướng dẫn & quy tắc thiết kế lại giao diện UI/UX (Checklist chuẩn bị & quy trình 6 bước thực thi).
2. **Trạng thái công việc hiện tại**:
   - [`PROJECT_STATE.md`](PROJECT_STATE.md) — Mục tiêu đang làm, task dở dang, quyết định gần nhất và phần "Do Not Redo".
3. **Kế hoạch thực thi chi tiết**:
   - [`docs/superpowers/plans/`](docs/superpowers/plans/) — Bám sát plan đã được approve (Plan 0 hoàn tất, Plan 1: S1–S7, Plan 2: S8–S12).

<!-- super-board:begin v3.1.2 (managed; edits inside are overwritten on upgrade) -->
## Super Board

Board: Backlog · Ready · Building · QA · Review · Blocked · Done. Labels route: `qa` skips Building · `bug`, `feature`, none → built first.

| When | Use | NEVER |
|---|---|---|
| Set up / repair the board | `/super-board onboard` | DON'T hand-edit config mid-run |
| Check tickets before a run | `/super-board lint` | NEVER run with AC-less tickets |
| Drain the board | `/super-board run` | NEVER build, test or merge from the orchestrator |
| Board state / halt | `/super-board status` · `/super-board stop` | |
| Build one ticket | `/super-build` | NEVER build outside the card's worktree |
| QA a branch, or a live URL alone | `/super-qa` · `/super-qa <url>` | NEVER mark QA pass without evidence |
| Review a PR, merge | `/super-review` | NEVER `gh pr merge` direct — merge gate only |
| File bugs from Sentry, PostHog, PRs | `/super-collect` | DON'T file without a verifier pass |
| UI polish | `/ui-refine-loop` (human runs it) | board NEVER runs it |
| Diagram / explainer page | `/visual` | |
| Commit, pull, push this branch | `/git-sync` | NEVER force push or rebase shared history |

| Rule | Value |
|---|---|
| Config | `.claude/super-board/configs/<slug>.json` |
| Isolation | 1 card · 1 worktree · 1 branch |
| Merge | auto for normal changes · money, auth, destructive schema (DROP/TRUNCATE/RENAME) → human · PR > 400 changed lines → human |
| Migrations | additive → robot migrates allowed DBs only · live DB ALWAYS → 🙋 needs you |
| Blocked card | block-template comment · last line `blocked-by:` · 🙋 = needs you |
| Secrets | NEVER read `.env`; key names via `.claude/bin/super-board-env-check.sh` |

## Writing (super-board)

| Thing | Format → `.claude/skills/super-board/references/writing-standard.md` |
|---|---|
| Commit, PR title | `<emoji> [type] scope: subject` + short bullets · ✨ feat 🐛 fix 🔧 chore ♻️ refactor 🧪 test 📝 docs |
| PR body | blocks: status · Problem · Solution · AC + proof · history · Before\|After · Risk — `super-board-pr-body.sh` |
| Ticket | Problem · Context · Fix · AC · Risk · Blocked by → `docs/agents/issue-tracker.md` |
| Comment | `[role] [label] status` · Did · ✅ Done · ❌ Not done · Next · ≤ 8 lines |
| PR author notes | file + critical inline review comments: Purpose · What changed · Why it matters → `pr-author-notes.md` |

- NEVER chain steps with arrows. One step per line, lettered under Where.
- NEVER link screenshots. Embed a raw URL pinned to a sha.
- DON'T repeat file lists in status comments. DON'T write "Not verified" or "Next" in a PR body.
<!-- super-board:end -->
