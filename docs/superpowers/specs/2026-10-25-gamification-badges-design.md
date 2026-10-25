# Gamification giai đoạn 3: badge và thành tựu

Ngày: 25/10/2026 · Trạng thái: đã duyệt 25/10 (A, B: có) · Phạm vi: backend, 1 migration bổ sung (chỉ thêm dữ liệu và cột), web

## Hiện trạng

- Badge là dữ liệu (`badges.condition`), được chấm bằng `backend/src/badges/evaluate.ts`. Có 5 loại điều kiện: `streak`, `exam_count`, `perfect_score`, `friends`, `manual`. Có 12 badge, chưa badge nào gắn với việc học bài hay làm Tự luyện.
- **Badge chỉ được trao khi học sinh mở `GET /api/badges/me`** (trang Profile). Vì vậy học sinh không thấy khoảnh khắc mở khoá ngay lúc đạt.
- `BadgeWall` ở trang Tiến trình còn hiện 3 badge "chưa mở khoá" **viết cứng làm mẫu** (`SAMPLE_LOCKED_BADGES`: "Kỷ nguyên Thuật toán", "Nhà Toán học trẻ", "Chiến binh Bền bỉ"). Các badge này không có trong database và không thể đạt được, tức là giao diện giả.
- Badge chưa mở khoá chỉ có mô tả, không cho biết học sinh đã đi được bao xa.

## Mục tiêu

Học sinh thấy badge mở khoá đúng lúc vừa đạt, biết còn bao xa tới badge tiếp theo, và có badge cho việc học hằng ngày chứ không chỉ cho thi và kết bạn.

## Giải pháp

1. **Thêm loại điều kiện** trong `evaluate.ts`, tính từ dữ liệu server sẵn có:
   - `lessons_done` (min): số bài trong `progress` đã hoàn thành.
   - `practice_right` (min): số câu Tự luyện đúng ngay lần đầu (`practice_attempts`).
   - `level` (min): cấp tính bằng `levelOfXp` trên tổng XP.
   - `goal_days` (min): số ngày đạt mục tiêu XP (`study_days.xp >= profiles.daily_goal_xp` lúc chấm). Phụ thuộc giai đoạn 2.
   - `code_ac` (min): số bài lập trình đã AC lần đầu (`xp_log` reason `code_ac:`).
2. **Migration thêm badge mới** (upsert theo `slug`, cùng kiểu migration 20261018140000), khoảng 12 badge:
   - Bài học: 1, 10, 50.
   - Câu đúng ngay lần đầu: 50, 250, 1000.
   - Cấp: 5, 10, 20.
   - Ngày đạt mục tiêu: 7, 30.
   - Bài lập trình AC: 10.

   Mỗi badge có tên và mô tả song ngữ, `icon`, `tier`. Thêm `category` `learning`, nên phải sửa `check` của cột `category`.
3. **Trao badge ngay khi đạt.** Tách phần chấm và trao trong `routes/badges.ts` thành `awardBadges(supabase, userId)` (`backend/src/badges/award.ts`), trả về các badge **mới** vừa trao. Gọi hàm này sau khi ghi XP ở 4 chỗ đang gọi `touchStreak` (Tự luyện, thi, lập trình, ôn từ), và cả khi kết bạn. Response trả thêm `new_badges: [{ slug, name_vi, name_en, icon, tier }]`. `GET /api/badges/me` vẫn chấm như cũ để không bỏ sót. Nếu lỗi thì chỉ log, không chặn câu trả lời.
4. **Tiến độ tới badge.** `GET /api/badges/me` trả thêm `progress: { current, target }` cho badge chưa mở khoá có `min`. Giao diện hiện thanh "7/10 bài". Trang hồ sơ công khai của người khác không có trường này.
5. **Màn mở khoá badge** (web): khi response có `new_badges`, hiện thẻ "Mở khoá huy hiệu" có icon, tên và tier. Nếu đạt nhiều badge một lúc thì hiện lần lượt từng thẻ. Dùng lại `Dialog`, có `aria-live`, đóng bằng Esc, tôn trọng reduced-motion, kèm tiếng `levelUp` nếu đã bật âm thanh. Nếu cùng lúc có màn lên cấp thì hiện màn lên cấp trước.
6. **Bộ sưu tập badge.** `BadgeWall` (Tiến trình) và `BadgeShowcase` (Profile) đọc cùng một nguồn là `GET /api/badges/me`:
   - Bỏ `SAMPLE_LOCKED_BADGES`.
   - Nhóm theo `category`.
   - Badge đã mở khoá có màu và ngày đạt.
   - Badge chưa mở khoá mờ đi, có thanh tiến độ.
   - Lọc "Tất cả / Đã mở / Chưa mở".

## Ràng buộc

- Chỉ server trao badge (bất biến #4). Client chỉ hiển thị `new_badges` và `progress` mà server trả về. Kết quả tạm khi offline không bao giờ mở khoá badge. Khi đồng bộ, server trao badge, và lần sau mở trang thì badge hiện ra.
- Thêm badge mới chỉ cần nạp dữ liệu, không sửa giao diện (bất biến #1). Riêng loại điều kiện mới thì cần code ở `evaluate.ts`.
- Màu tier chỉ dùng token. Chữ song ngữ. Vùng chạm 44px.
- `awardBadges` đọc 5–6 bảng mỗi lần chạy. Mỗi câu trả lời chỉ gọi hàm này một lần, sau khi ghi XP.

## Ngoài phạm vi

Badge theo từng môn (ví dụ "Hoàn thành Tin học 10"), chia sẻ badge ra mạng xã hội, giáo viên tự tạo badge. Bảng xếp hạng thuộc giai đoạn 4.

## Cần chốt

- **A.** Badge `goal_days` phụ thuộc migration giai đoạn 2. Đề xuất: **giữ trong giai đoạn này**, và ghi rõ hai migration phải áp theo thứ tự.
- **B.** Badge mới có trao **bù** cho học sinh đã đạt từ trước không? Đề xuất: **có, nhưng im lặng**. Badge sẽ được trao khi học sinh mở Profile hoặc trả lời câu tiếp theo; trao bù thì không hiện màn mở khoá, chỉ thêm vào bộ sưu tập. Cách phân biệt: badge mới đạt nhờ chính câu trả lời vừa rồi mới hiện màn.

## Tiêu chí nghiệm thu

- [ ] Trả lời đúng câu Tự luyện thứ 50 (đúng ngay lần đầu) thì response có `new_badges` chứa `practice_right_50`, và web hiện màn mở khoá một lần.
- [ ] Đạt 2 badge cùng lúc thì hai màn hiện lần lượt. Esc đóng được từng màn.
- [ ] Kết quả tạm khi offline không có `new_badges`.
- [ ] Không còn `SAMPLE_LOCKED_BADGES`. Bộ sưu tập chỉ hiện badge có trong database.
- [ ] Badge chưa mở khoá có `min` hiện "x/y". Trang hồ sơ công khai của người khác không có tiến độ.
- [ ] `isEarned` có test cho 5 loại điều kiện mới, gồm cả dữ liệu thiếu hoặc lỗi (không trao badge khi đang đoán).
- [ ] Lỗi khi trao badge không làm câu trả lời bị lỗi.
- [ ] `pnpm turbo typecheck`, `test`, `build` đạt. Đã thử bằng trình duyệt trang Tiến trình và Profile (dùng trang dựng tạm nếu thiếu tài khoản).

## Rủi ro

- Thêm việc đọc database ở mỗi câu trả lời có XP. Nếu chậm thì chỉ chấm các loại điều kiện liên quan tới hành động vừa làm.
- Sửa `check` của cột `category` là thay đổi ràng buộc trên bảng có dữ liệu. Việc này chỉ nới rộng thêm giá trị, nhưng vẫn cần bạn duyệt khi áp.
