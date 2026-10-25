# Plan: Gamification giai đoạn 1, phản hồi tức thì

Spec: `docs/superpowers/specs/2026-10-25-gamification-instant-feedback-design.md` (đã duyệt 25/10, giữ công thức `50 × N × (N − 1)`).
Phạm vi: web và `@scipal/types`. Không có migration. Không đổi API. TDD cho phần logic.

## Bước 1: Hàm cấp độ (`@scipal/types`)
- Tạo `packages/types/src/level.ts`:
  - `xpForLevel(n)` trả về `50 * n * (n - 1)`.
  - `levelOfXp(xp)` trả về `{ level, intoLevel, toNext }`. XP âm, NaN hoặc không hữu hạn được tính là 0.
- Export trong `index.ts`.
- Test các mốc 0, 99, 100, 299, 300, 1000 và 10^7.

## Bước 2: Trạng thái phiên (logic thuần)
- Tạo `frontend/features/lessons/practiceSession.ts`. Reducer nhận sự kiện `{ correct, firstTry, xpEarned, provisional }` và trả về `{ sessionXp, combo, bestCombo, right, levelUpTo? }`.
- Combo chỉ tăng khi đúng ngay lần đầu, và trở về 0 khi sai.
- Kết quả tạm (`provisional`) không cộng XP và không làm lên cấp.
- `levelUpTo` được đặt khi `levelOfXp(baseXp + sessionXp)` vượt mốc.
- Test bằng Vitest.

## Bước 3: Tổng XP lúc mở bài
- Thêm hook `useTotalXp()`. Hook đọc `xp_log.delta` của người dùng qua client Supabase, cùng cách `profileQueries.ts`.
- Khách hoặc lỗi trả về `null`. Khi đó tắt tính năng lên cấp, các phần khác vẫn chạy.

## Bước 4: Giao diện trong `PracticeSection`
- Viết CSS keyframes trong `practice.module.css`: `flashRight` (viền `--success`), `shakeWrong` (`--danger`) và `xpFloat`. Tắt chuyển động trong `@media (prefers-reduced-motion: reduce)`.
- Tạo `XpChip` để thay dòng `+N XP` ở `PracticeSection.tsx:571`.
- Thêm thanh phiên ở đầu phần Tự luyện, gồm XP của phiên và nhãn "Chuỗi đúng ×N" (hiện khi N ≥ 3, có `aria-live="polite"`).
- Tạo `LessonSummaryCard` để thay dòng `lesson_completed`. Thẻ hiện số câu đúng/tổng, XP của phiên và combo dài nhất.
- Mọi chữ đều có `{ en, vi }`.
- Viết test tương tác vào `PracticeSection.interaction.test.tsx`: đúng, sai, combo và kết quả tạm.

## Bước 5: Màn lên cấp
- Tạo `frontend/features/lessons/LevelUpOverlay.tsx` dùng `Dialog` sẵn có ở `frontend/components/ui/dialog.tsx` để có bắt focus và đóng bằng Esc.
- Overlay tự đóng sau 2,5 giây và có `aria-live`.
- Test: hiện một lần, đóng được bằng Esc.

## Bước 6: Âm thanh
- Tạo `frontend/lib/sfx.ts` dùng Web Audio để tạo tiếng bíp ngắn, không cần file.
- Thêm cờ `localStorage` `scipal:sfx`, mặc định tắt. Mọi lần đọc/ghi bọc trong try/catch.
- Thêm công tắc trong `AccountSettings.tsx`.
- Test: mặc định tắt, ghi nhớ sau khi bật.

## Bước 7: Cấp trên Profile
- `ProfileCard` hoặc `ProfileHero` hiển thị "Cấp N" và thanh tiến độ, tính từ `stats.totalXP` bằng `levelOfXp`. Thanh tiến độ cần có `role="progressbar"`.

## Bước 8: Kiểm tra
- Chạy `pnpm turbo typecheck`, `pnpm turbo test` và `pnpm turbo build`.
- Thử bằng trình duyệt một bài Tự luyện ở chế độ sáng/tối, màn 375px và có reduced-motion.
- Cập nhật `PROJECT_STATE.md`.
