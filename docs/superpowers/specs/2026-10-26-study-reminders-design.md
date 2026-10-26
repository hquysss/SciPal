# Nhắc học: thông báo trong app và email

Trạng thái: chờ duyệt. Nhánh `feat/study-reminders`.

## Có sẵn
- `notifications` + chuông (`NotificationBell`, `LiveToasts`), realtime.
- `notifyUsers()` (`backend/src/notify.ts`): lưu thông báo và gửi email qua Resend, lỗi không làm hỏng request.
- Streak theo ngày Việt Nam: `study_days`, `currentStreak`, mục tiêu ngày `daily_goal_xp`, banner nhắc trong app.
- Cron Vercel gọi `/api/internal/...` bằng `CRON_SECRET`; token huỷ đăng ký ký HMAC (newsletter).
- Chưa có: cài đặt nhắc, job gửi nhắc, huỷ đăng ký email nhắc, chống gửi trùng.

## Làm gì
1. **Cài đặt nhắc** trong Hồ sơ > Tài khoản: bật/tắt nhắc học (mặc định **tắt**), giờ nhắc (giờ VN, mặc định 20:00), kênh thông báo trong app và email (tách riêng).
2. **Job nhắc** `GET /api/internal/reminders/run`, cron mỗi giờ. Với mỗi người bật nhắc và đúng giờ của họ, hôm nay (ngày VN) chưa có XP:
   - có streak ≥ 2: "Học hôm nay để giữ chuỗi N ngày" (nhắc streak sắp mất);
   - còn lại: "Hôm nay bạn chưa học, 5 phút là đủ" (nhắc thường).
   Tối đa **1 nhắc/người/ngày** (cột `last_reminded_on`, cập nhật có điều kiện nên chạy lặp vẫn không trùng).
3. **Kênh:** thông báo trong app (kind `reminder`, link `/progress`) và/hoặc email theo cài đặt. Email song ngữ, có nút học và link huỷ nhắc ký HMAC (một lần bấm tắt email nhắc, không cần đăng nhập).
4. **Dọn:** người dùng đã học hôm nay hoặc đã dùng đóng băng thì không nhắc; tài khoản không có email chỉ nhận trong app.

## Quyết định cần bạn chốt
- **A. Giờ nhắc:** mỗi người tự chọn giờ (cron mỗi giờ), hay một giờ chung 20:00 VN (cron 1 lần/ngày, đơn giản hơn, Vercel Hobby chỉ cho cron mỗi ngày)? Đề xuất: **tự chọn giờ**, nếu gói Vercel cho cron theo giờ; không thì giờ chung.
- **B. Mặc định:** tắt cho mọi người (đề xuất, an toàn về quyền riêng tư và chống spam) hay bật sẵn thông báo trong app, email vẫn tắt?

## Ngoài phạm vi
Web push / mobile push (cần hạ tầng riêng), nhắc theo lịch học tuỳ biến, email tuần, nhắc cho giáo viên.

## Kiểm tra
Test backend: chọn đúng người theo giờ + chưa học + chưa nhắc hôm nay, hai loại nội dung, chạy lặp không gửi trùng, email lỗi không chặn thông báo trong app, token huỷ sai bị từ chối. Web: cài đặt lưu và hiện đúng. Migration thêm cột vào `profiles` (không phá dữ liệu).
