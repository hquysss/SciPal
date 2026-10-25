# Plan: Gamification giai đoạn 3, badge và thành tựu

Spec: `docs/superpowers/specs/2026-10-25-gamification-badges-design.md` (đã duyệt 25/10, đồng ý cả A và B).
Nhánh: tiếp tục trên PR #250. Làm theo TDD.

**Thứ tự áp migration** (cần bạn duyệt 🙋): `20261025090000_study_days.sql` trước, rồi `20261025100000_learning_badges.sql`. Cả hai phải áp trước khi deploy backend.

## Bước 1: Migration `20261025100000_learning_badges.sql`
- Thay ràng buộc `badges_category_check` bằng một ràng buộc mới có thêm giá trị `learning`. Viết dạng `drop constraint if exists` rồi `add constraint`, và ghi cách rollback trong comment.
- Upsert theo `slug` 12 badge, mỗi badge có tên và mô tả song ngữ, `icon`, `tier`, `sort_order` (đặt sau các badge cũ):
  - `lessons_1`, `lessons_10`, `lessons_50`
  - `practice_right_50`, `practice_right_250`, `practice_right_1000`
  - `level_5`, `level_10`, `level_20`
  - `goal_days_7`, `goal_days_30`
  - `code_ac_10`
- Test hợp đồng `backend/src/__tests__/learning-badges-migration.test.ts`: có đủ 12 slug, mọi `condition` thuộc loại đã biết, ràng buộc mới có `learning`.

## Bước 2: Điều kiện mới (`badges/evaluate.ts`)
- Thêm vào `BadgeStats` các trường `lessonsDone`, `practiceRight`, `level`, `goalDays`, `codeAc`.
- `isEarned` xử lý 5 loại điều kiện mới. Thêm `progressOf(condition, stats)` trả về `{ current, target }` khi điều kiện có `min`, không có thì trả về null.
- Unit test cho từng loại, kể cả `min` thiếu (không trao badge).

## Bước 3: `badges/award.ts`
- Chuyển `statsFor` từ `routes/badges.ts` sang đây và đọc thêm dữ liệu:
  - `progress` có `completed_at` khác null (đếm).
  - `practice_attempts` có `correct = true` (đếm).
  - Tổng `xp_log` rồi tính `levelOfXp`.
  - `study_days` cùng `profiles.daily_goal_xp` để đếm ngày đạt mục tiêu.
  - `xp_log` có reason bắt đầu bằng `code_ac:` (đếm).
- Nếu một truy vấn bất kỳ lỗi thì trả về null và không trao badge nào.
- `awardBadges(supabase, userId, gained?: Partial<BadgeStats>)`:
  - Upsert các badge mới đạt vào `user_badges`.
  - Trả về `shown`: các badge mới đạt mà **trước hành động thì chưa đạt**. "Trước hành động" tính bằng stats trừ đi `gained`. Badge đạt bù (điểm B) vẫn được trao nhưng không nằm trong `shown`.
  - Nếu lỗi thì chỉ log và trả về rỗng.
- `routes/badges.ts` dùng `awardBadges` (không truyền `gained`) và trả thêm `progress` cho badge chưa mở khoá, chỉ khi người xem là chủ tài khoản.
- Test với `fakeDb`.

## Bước 4: Gọi `awardBadges` sau hành động
- Tự luyện (`practice/record.ts`, khi được cộng XP): `gained = { practiceRight: 1, level: số cấp tăng thêm, lessonsDone: lesson_completed ? 1 : 0 }`.
- Thi (`routes/exam.ts`), lập trình (`routes/practiceCode.ts`, `codeAc: 1`), ôn từ (`routes/terms.ts`), chấp nhận kết bạn (`routes/friends.ts`, `friends: 1`).
- Các response này trả thêm `new_badges: [{ slug, name_vi, name_en, icon, tier }]`.
- Ngày đạt mục tiêu: `gained.goalDays = 1` khi XP hôm nay vừa vượt mục tiêu. Lấy thông tin này từ `touchStudyDay`: cho hàm trả về `{ goalCrossed }`.
- Đồng bộ offline (`/api/practice/sync`) chỉ trao badge, không trả `new_badges` (badge sẽ hiện khi mở trang).
- Cập nhật type `PracticeCheckResult` trong `@scipal/types` (thêm `new_badges?`).
- Test: response có `new_badges`. Nếu trao badge lỗi thì response vẫn 200.

## Bước 5: Màn mở khoá (web)
- Tạo `frontend/features/badges/BadgeUnlockQueue.tsx`, nhận danh sách badge và hiện lần lượt bằng `Dialog`, có tiếng `levelUp`, có `aria-live`, tôn trọng reduced-motion.
- `PracticeSection` gom `new_badges` từ các câu trả lời vào `PracticeSession` (reducer của giai đoạn 1, bỏ qua kết quả tạm). Hiện hàng đợi này sau màn lên cấp.
- Ôn từ (`ReviewSession`) và thi (`ExamRunner`) dùng cùng component nếu response có `new_badges`.
- Viết test.

## Bước 6: Bộ sưu tập
- Tạo `frontend/features/badges/BadgeCollection.tsx`, đọc `GET /api/badges/me` (có `progress`):
  - Nhóm theo `category`.
  - Lọc "Tất cả / Đã mở / Chưa mở" (radio group).
  - Badge đã mở có ngày đạt. Badge chưa mở mờ đi và có thanh tiến độ "x/y" (`role="progressbar"`).
- `BadgeWall` (Tiến trình) dùng `BadgeCollection` và xoá `SAMPLE_LOCKED_BADGES`.
- `BadgeShowcase` (Profile) dùng cùng component. `PublicProfile` giữ nguyên, không có tiến độ.
- Cập nhật `/dev/progress-showcase` dùng dữ liệu mẫu đúng kiểu mới.
- Viết test.

## Bước 7: Kiểm tra
- Chạy `pnpm turbo typecheck` và `pnpm turbo test`.
- Build web bằng `next build`, sau khi tắt dev server và xoá `.next`.
- Xem trên trình duyệt `/dev/progress-showcase` và `/dev/profile-showcase`.
- Cập nhật `PROJECT_STATE.md`, ghi thứ tự 2 migration CHƯA áp.
