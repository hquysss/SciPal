# Gamification giai đoạn 2: streak và thói quen

Ngày: 25/10/2026 · Trạng thái: đã duyệt 25/10 (A, B: có) · Phạm vi: backend, 1 migration bổ sung (additive), web

## Hiện trạng

- Mỗi học sinh có streak riêng cho từng môn (bảng `streaks`, ghi bởi `backend/src/streaks/touchStreak.ts`). Chưa có streak chung cho tất cả các môn.
- Ngày học được tính theo **UTC**. Ở Việt Nam, ngày mới bắt đầu lúc 7 giờ sáng: học lúc 6 giờ sáng và học lúc 20 giờ tối hôm trước bị tính là cùng một ngày.
- Lịch streak (`StreakCalendar`) phải đoán ngày đã học từ `last_active` và `current_streak`, vì không lưu dữ liệu theo từng ngày.
- Chưa có mục tiêu ngày, chưa có cách đóng băng streak, chưa có lời nhắc học. Repo cũng chưa có hạ tầng push.

## Mục tiêu

Học sinh biết hôm nay đã học đủ chưa, và chuỗi ngày học không bị mất chỉ vì bỏ lỡ một ngày.

## Giải pháp

1. **Ngày học theo giờ Việt Nam.** `touchStreak` và mọi phép tính ngày khác đều dùng múi giờ `Asia/Ho_Chi_Minh`. Các dòng cũ giữ nguyên. Ngày đổi múi giờ có thể bị tính trùng hoặc lệch tối đa 1 ngày; chấp nhận, không sửa dữ liệu cũ.
2. **Bảng `study_days`** (migration bổ sung): `(user_id, day date, xp int, freeze bool)`, khoá chính `(user_id, day)`, bật RLS cho phép học sinh chỉ đọc dòng của mình. `touchStreak` ghi ngày hôm nay ở cùng chỗ đang ghi `streaks`. XP trong ngày được cộng ở cùng chỗ đang ghi `xp_log`. Bảng này là nguồn dữ liệu cho streak chung, lịch và mục tiêu ngày.
3. **Streak chung.** Đếm số ngày liên tiếp có dòng trong `study_days` (dòng `freeze` cũng được tính), kết thúc ở hôm nay hoặc hôm qua. Server trả về `GET /api/me/habit` gồm `{ streak, longest, today_xp, goal_xp, freezes, days: [...] }` (`days` là 35 ngày gần nhất). Streak theo từng môn vẫn giữ như cũ.
4. **Mục tiêu ngày.** Cột `profiles.daily_goal_xp`, nhận một trong các giá trị 20, 50, 100, mặc định 20. Học sinh chọn trong Cài đặt qua `PATCH /api/me/habit`. Web có vòng tiến độ "Hôm nay X/Y XP" ở đầu phần Tự luyện và ở trang Tiến trình. Khi đạt mục tiêu, web hiện hiệu ứng một lần trong ngày, dựa trên số server trả về.
5. **Đóng băng streak.** Cột `profiles.streak_freezes`, tối đa 2. Học sinh nhận +1 lần đóng băng mỗi khi streak chung chạm bội số của 7. Khi học sinh quay lại học sau một khoảng nghỉ, server dùng mỗi lần đóng băng để lấp một ngày đã lỡ, chèn dòng `freeze = true`. Nếu số lần đóng băng còn lại không đủ lấp hết khoảng nghỉ thì streak về 1 và không tiêu lần nào. Toàn bộ việc này do server quyết định (bất biến #4).
6. **Nhắc trong app.** Không có push. Nếu hôm nay chưa học mà streak chung ≥ 2, trang chủ và trang Tiến trình hiện banner "Học hôm nay để giữ chuỗi N ngày", kèm số lần đóng băng còn lại. Web push để sau.
7. **Lịch streak** đọc `days` từ API: màu ô theo XP của ngày, ngày được đóng băng có biểu tượng ❄ và chú thích bằng chữ (không chỉ dựa vào màu). Thay `activeSubjectsOn`.

## Ràng buộc

- Chỉ server ghi `study_days`, `streak_freezes` và streak (bất biến #4). Client chỉ có quyền đọc qua RLS hoặc API.
- Offline: hàng đợi đồng bộ đang dùng `touchStreak` với thời điểm đã kẹp, nên `study_days` đi theo cùng thời điểm đó. Ngày cũ hơn ngày học gần nhất không làm streak chung lùi lại.
- Màu chỉ dùng token. Chữ song ngữ. Vùng chạm 44px.
- Migration chỉ bổ sung (bảng và cột mới). Áp lên DB thật cần bạn duyệt 🙋.

## Ngoài phạm vi

Web push và email nhắc học, mua lần đóng băng bằng XP, badge mới (giai đoạn 3).

## Cần chốt

- **A.** Badge streak (`streak_3`, `streak_7`, `streak_30`) đang xét theo streak tốt nhất của từng môn. Chuyển sang xét theo streak chung? Đề xuất: **có**, vì học sinh hiểu "học liên tục" là học bất kỳ môn nào.
- **B.** Có điền `study_days` từ `xp_log` cũ để lịch có dữ liệu ngay không? Đề xuất: **có**, chạy một lần trong migration, nhóm theo ngày giờ Việt Nam.

## Tiêu chí nghiệm thu

- [ ] Học lúc 6:30 và lúc 23:00 giờ Việt Nam cùng một ngày lịch được tính là 1 ngày. Học lúc 23:59 và lúc 00:01 hôm sau được tính là 2 ngày liên tiếp.
- [ ] Bỏ 1 ngày khi còn 1 lần đóng băng: streak giữ nguyên, ngày bỏ lỡ hiện ❄, lần đóng băng còn 0.
- [ ] Bỏ 2 ngày khi chỉ còn 1 lần đóng băng: streak về 1, lần đóng băng vẫn còn 1.
- [ ] Streak chạm 7 thì được +1 lần đóng băng, không vượt quá 2.
- [ ] "Hôm nay X/Y XP" khớp với tổng `xp_log` của ngày hôm nay (giờ Việt Nam). Hiệu ứng đạt mục tiêu chỉ hiện một lần.
- [ ] Đổi mục tiêu ngày trong Cài đặt thì lưu được. Giá trị ngoài 20, 50, 100 bị trả về 400.
- [ ] Client không ghi được `study_days` hay `streak_freezes` (có test RLS).
- [ ] Đồng bộ một câu trả lời offline của ngày cũ không làm streak chung lùi lại.
- [ ] `pnpm turbo typecheck`, `test`, `build` đạt. Đã thử bằng trình duyệt trang Tiến trình và Tự luyện.

## Rủi ro

- Đổi sang giờ Việt Nam làm lệch streak của ngày chuyển đổi. Đã chấp nhận ở mục 1.
- `touchStreak` ghi thêm một bảng. Nếu ghi `study_days` thất bại thì chỉ log cảnh báo, giống cách xử lý streak hiện nay.
