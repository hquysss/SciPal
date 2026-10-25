# Game Ô chữ: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Một loại game thứ tư `crossword` trong Gamification: ô chữ dựng từ thuật ngữ của bài, server chấm, 20 XP cho lần giải xong đầu tiên.

**Architecture:** Server dựng lưới bằng hàm thuần lúc tạo game, lưu lưới và đáp án vào bảng `game_crosswords` mà chỉ backend đọc được. Lượt chơi dùng lại `/start` và `/submit` của `routes/games.ts`. Riêng crossword, `/submit` cho nộp lại nhiều lần và giữ điểm cao nhất.

**Tech Stack:** Fastify + zod (backend), Supabase Postgres, Next.js 15 / React 19 (web), vitest, PGlite.

**Spec:** `docs/superpowers/specs/2026-10-26-crossword-game-design.md`

## Global Constraints

- Đáp án không bao giờ có trong response của `/start` hay `/submit`.
- XP 20, `reason = 'crossword:<game_id>'`, một lần mỗi học sinh mỗi game (unique index một phần).
- Số từ 5–15 (mặc định 10). Chữ điền sau chuẩn hoá dài 2–15. Lưới tối đa 15 × 15. Xếp được dưới 4 từ thì trả 400.
- Kiểu gợi ý: `en_from_vi`, `vi_from_en`, `term_from_def`.
- Song ngữ, chỉ token màu, vùng chạm 44px, dùng được bằng bàn phím.

## Khác với spec (theo code hiện có)

- Mở lượt chơi là `POST /api/games/:id/start`, chấm là `POST /api/games/:id/submit` với `{ playId, answers }`. Spec ghi tên đường khác.
- Màn chơi hiện chip `+N XP` và `BadgeUnlockQueue`, giống Thi thử. Không có màn "Lên cấp" (Thi thử cũng không có).

## Review Focus

1. Hai lần nộp đúng hết cùng lúc: chỉ một dòng `xp_log` (index `23505` bỏ qua), response thứ hai `xp_earned = 0`.
2. Nộp sau hết giờ: điểm 0, không XP.
3. Câu trả lời có chữ thường, dấu hoặc dấu cách: chuẩn hoá rồi mới so, vẫn đúng.
4. Bài toàn thuật ngữ dài hoặc không giao nhau: 400 với lời nhắc, không tạo game rỗng.
5. Thuật ngữ bị sửa hoặc gỡ xuất bản sau khi tạo game: lưới vẫn chơi được như lúc tạo. Vì vậy `clue` (song ngữ) lưu luôn trong `words` lúc tạo và `/start` không đọc `terms` (khác spec, spec ghi đọc gợi ý mỗi lần mở).

---

### Task 1: Migration và PGlite

**Files:** Create `supabase/migrations/20261026090000_crossword_games.sql`, `supabase/tests/crossword_cases.sql`; Modify `supabase/tests/billing.sql` (thêm `\ir crossword_cases.sql`); Create `backend/src/__tests__/crossword-migration.test.ts`.

- [ ] `games_kind_check` và check nội dung của `games`: `drop constraint if exists` rồi `add` lại, thêm `crossword` (cần `lesson_id is not null and cardinality(term_ids) between 4 and 15`). Lấy tên constraint thật bằng truy vấn trên DB trước khi viết.
- [ ] Bảng `game_crosswords (game_id uuid pk references games on delete cascade, mode text check in 3 giá trị, rows int check 1..15, cols int check 1..15, words jsonb not null)`. RLS bật, không policy, `revoke all` khỏi anon, authenticated.
- [ ] `create unique index xp_log_crossword_once_idx on xp_log (user_id, reason) where reason like 'crossword:%'`.
- [ ] PGlite: authenticated đọc `game_crosswords` bị từ chối; hai insert `xp_log` cùng `crossword:<id>` thì lần hai `unique_violation`.
- [ ] Test hợp đồng: có revoke, không có policy trên `game_crosswords`, có index.

### Task 2: Hàm thuần `backend/src/games/crossword.ts`

**Interfaces (Produces):**
- `type Mode = 'en_from_vi' | 'vi_from_en' | 'term_from_def'`
- `type Term = { id: string; term_en: string; term_vi: string; definition_en: string; definition_vi: string }`
- `type Word = { term_id: string; number: number; row: number; col: number; dir: 'across' | 'down'; answer: string; clue: { vi: string; en: string } }`
- `type Crossword = { rows: number; cols: number; words: Word[] }`
- `normalizeAnswer(s: string): string`
- `clueOf(term: Term, mode: Mode): { vi: string; en: string }`, `answerOf(term: Term, mode: Mode): string`
- `buildCrossword(terms: Term[], mode: Mode, max: number): Crossword | null` (null khi dưới 4 từ)
- `publicGrid(c: Crossword)`: bỏ `answer`, thêm `length`
- `gradeCrossword(c: Crossword, answers: Record<string, string>): { correct: string[]; score: number; max: number }`; khoá là `${number}-${dir}`

- [ ] Test `normalizeAnswer`: `'Đường truyền'` ra `'DUONGTRUYEN'`; `'e-mail'` ra `'EMAIL'`; `'C++'` ra `'C'`.
- [ ] Test `buildCrossword` (chạy 50 lần với thứ tự ngẫu nhiên): mọi ô có nhiều từ đi qua cùng một chữ; không hai từ cùng chiều chạm đầu/cuối hay nằm sát song song; mỗi từ trong `rows × cols` ≤ 15; số thứ tự tăng theo hàng rồi cột; trả null khi chỉ có 3 từ xếp được.
- [ ] Test `gradeCrossword`: câu trả lời chữ thường có dấu vẫn đúng; khoá lạ bị bỏ qua.
- [ ] Cài đặt: xếp từ dài trước, thử mọi vị trí giao với ô đã có, chọn vị trí giữ lưới gọn nhất, rồi dời lưới về gốc (0,0).

### Task 3: Backend `routes/games.ts`

- [ ] `NewGame`: thêm `'crossword'` vào `kind`, `words: z.number().int().min(5).max(15).optional()`, `mode: z.enum([...]).optional()`.
- [ ] `POST /api/games` với crossword: đọc thuật ngữ đã xuất bản của môn (kèm định nghĩa), `buildCrossword(shuffle(terms), mode, words ?? 10)`; null thì 400 `NO_CROSSWORD` (bilingual: chọn bài khác hoặc tăng số từ). Insert `games` (`lesson_id`, `term_ids` = các `term_id` đã xếp), rồi insert `game_crosswords`; lỗi thì xoá game vừa tạo.
- [ ] `/start` với crossword: đọc `game_crosswords`, trả `{ playId, kind, timeLimitS, mode, rows, cols, words: publicGrid(...) }`.
- [ ] `/submit` với crossword: zod `{ playId, answers: z.record(z.string().max(32)).default({}) }` (≤ 30 khoá). Không yêu cầu `finished_at` null. Chấm, `late` thì score 0. Cập nhật `game_plays` khi score mới cao hơn hoặc lần đầu (`finished_at` = bây giờ). Đúng hết và không trễ: insert `xp_log` 20 (subject của bài), bỏ qua `23505`; nếu insert được thì `touchStreak(..., 20)` và `awardBadges({ xp: 20 })`. Trả `{ score, maxScore, late, correct, xp_earned, new_badges }`.
- [ ] Test (`backend/src/routes/games.crossword.test.ts`, `fakeDb`): tạo 400 khi xếp không đủ; `/start` không chứa chữ đáp án nào trong JSON; `/submit` đúng hết lần đầu `xp_earned 20`, lần sau (insert `23505`) `xp_earned 0`; trễ thì 0 điểm và không insert `xp_log`.

### Task 4: Web

- [ ] `gamesApi.ts`: `GameKind` thêm `'crossword'`; `PlayStart` thêm nhánh crossword; `PlayResult` thêm `correct?`, `xp_earned?`, `new_badges?`; `NewGame` thêm `words?`, `mode?`; `KIND_LABEL.crossword = { en: 'Crossword', vi: 'Ô chữ' }`.
- [ ] `CreateGameDialog`: thêm loại Ô chữ, ô "Số từ" (5–15), nhóm chọn kiểu gợi ý (3 nút `aria-pressed`).
- [ ] `features/games/CrosswordPlay.tsx`: lưới ô `input` một chữ, gõ tự nhảy, Backspace lùi, mũi tên di chuyển, bấm lại đổi chiều, danh sách Ngang/Dọc, gợi ý đang chọn ở trên lưới. Nộp gửi `answers`, tô từ đúng theo `correct`, giữ nguyên chữ để sửa và nộp lại. Hiện chip `+N XP` và `BadgeUnlockQueue`.
- [ ] `GamePlayer`: crossword không đóng lượt khi nộp (cho nộp lại); các loại khác giữ như cũ.
- [ ] Test `CrosswordPlay.test.tsx` (jsdom): gõ chữ nhảy ô; mũi tên; nộp gửi đúng khoá `${number}-${dir}`; từ đúng được đánh dấu.
- [ ] Trang dev `/dev/crossword` với lưới mẫu để xem trên trình duyệt.

### Task 5: Kiểm tra

- [ ] `pnpm turbo typecheck`, `pnpm turbo test`, `node supabase/tests/check-sql.mjs`, `next build`.
- [ ] Xem `/dev/crossword` ở 375px và 1280px: không tràn ngang trang, chơi bằng bàn phím được.
- [ ] Cập nhật `PROJECT_STATE.md`, ghi migration CHƯA áp.
