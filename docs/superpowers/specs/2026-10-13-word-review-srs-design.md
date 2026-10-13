# Ôn từ bằng flashcard SRS (giai đoạn 2)

Ngày: 13/10/2026. Dựa trên sổ từ của giai đoạn 1 (`2026-10-13-vocabulary-notebook-design.md`).

## Dữ liệu
Migration thêm vào `user_terms`: `due_at timestamptz not null default now()`, `interval_days real not null default 0`, `ease real not null default 2.5`, `reps int not null default 0`, `lapses int not null default 0`; index `(user_id, due_at)`. Từ mới lưu đến hạn ngay.

## Lịch ôn (server tính)
`nextReview(state, grade, now)` trong `backend/src/terms/review.ts`:
- `again`: `reps = 0`, `lapses + 1`, `ease = max(1.3, ease − 0.2)`, `interval_days = 0`, `due_at = now + 10 phút`.
- `hard`: `ease = max(1.3, ease − 0.15)`, `interval_days = max(1, interval_days × 1.2)`, `reps + 1`.
- `good`: `interval_days = reps 0 → 1, reps 1 → 3, sau đó interval_days × ease`; `reps + 1`.
- `hard`/`good`: `due_at = now + interval_days ngày`.

`POST /api/me/terms/:termId/review { grade }` (cần đăng nhập; chỉ dòng của mình, không có → 404; grade sai → 400) trả `{ due_at, xp_earned }`. Chỉ chấm được thẻ đến hạn (`due_at <= now`, điều kiện nằm trong lệnh update nên bấm đúp chỉ tính một lần); thẻ chưa đến hạn → 409.

**XP** (người dùng yêu cầu thêm): +2 XP vào `xp_log` (`reason = 'word_review'`, `subject_id` của thuật ngữ) cho mỗi thẻ đến hạn chấm Khó/Nhớ; Quên không có XP; tối đa 40 XP/ngày (theo ngày UTC).

**Streak** (người dùng yêu cầu thêm): mọi thẻ đến hạn được chấm, kể cả Quên, đánh dấu hôm nay là ngày học của môn đó (`touchStreak`, dùng chung với chấm bài học); trả `new_streak`.

## Giao diện `/review` — "Ôn từ" / "Review words"
- Đọc qua RLS tối đa 20 thẻ `due_at <= now()` kèm thuật ngữ, sắp theo `due_at`.
- Mặt trước: từ EN, IPA, nút nghe. "Lật thẻ" (Space) → nghĩa VI, định nghĩa, ví dụ; nút Quên / Khó / Nhớ (phím 1/2/3).
- Chấm lỗi: giữ thẻ, báo "Chưa lưu được. Thử lại nhé."
- Hết thẻ: "Xong phần ôn hôm nay" và lần đến hạn kế tiếp (nếu có). Sổ trống: chỉ cách tra từ trong bài.
- Khách: mời đăng nhập.
- Lối vào: Profile ("Ôn từ") và cạnh chip "Sổ từ của tôi" ở `/glossary` khi đăng nhập, kèm số thẻ đến hạn.

## Ngoài phạm vi
Nhắc ôn, thống kê, thẻ chiều VI → EN.

## Kiểm thử
Unit `nextReview`; route review (401/400/404/200, chỉ theo `user_id`); trang ôn (lật, chấm, phím, lỗi, hết thẻ, khách); test SQL cột mới.
