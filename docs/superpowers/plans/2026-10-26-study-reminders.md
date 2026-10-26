# Plan: nhắc học (thông báo trong app + email)

Spec: `docs/superpowers/specs/2026-10-26-study-reminders-design.md`. Đã chốt: mỗi người tự chọn giờ, mặc định tắt.

## Task 1: Migration `20261026110000_study_reminders.sql`
- `profiles`: `reminder_hour smallint check (0..23)` (null = tắt), `reminder_in_app bool default true`, `reminder_email bool default false`, `last_reminded_on date`.
- Bật nhắc = đặt `reminder_hour`; kênh chọn bằng hai cờ. Cả bốn cột nằm ngoài grant của client, chỉ backend ghi.
- RPC `claim_study_reminders(p_day date, p_hour int, p_limit int)` (service_role): một câu `update ... set last_reminded_on = p_day where reminder_hour = p_hour and (last_reminded_on is null or last_reminded_on < p_day) and not exists (study_days hôm nay có xp > 0 hoặc freeze) returning id, reminder_in_app, reminder_email`. Claim nguyên tử nên chạy lặp, hai cron chồng nhau không gửi trùng.
- Test PGlite: đúng giờ, đã học, đã nhắc, tắt.

## Task 2: Backend
- `reminders/reminders.ts`: `runReminders(supabase, now, log)`: tính ngày/giờ VN (`vnDay`, thêm `vnHour`), claim, lấy streak từ `study_days` (`currentStreak`) cho nhóm được claim, chọn nội dung (streak >= 2 hoặc thường), gọi `notifyUsers` cho nhóm trong app và `sendEmails` cho nhóm email.
- `notify.ts`: tách phần email khỏi `notifyUsers` (thêm tuỳ chọn `channels`), giữ nguyên hành vi cũ.
- Email song ngữ kèm link huỷ nhắc: mở rộng `newsletter/tokens.ts` thêm purpose `reminder-off`; header `List-Unsubscribe`.
- `routes/reminders.ts`:
  - `GET /api/internal/reminders/run` (cron, `cronAuthorized`, thêm vào `isPublicPath`).
  - `GET/PATCH /api/me/reminders` (`{hour|null, in_app, email}`, kiểm tra 0..23).
  - `POST /api/reminders/unsubscribe` (token, công khai như newsletter, chỉ tắt `reminder_email`).
- Không sửa `vercel.json`: cron-job.org gọi `GET <API>/api/internal/reminders/run` mỗi giờ (phút 0, múi giờ bất kỳ vì server tự tính giờ VN) kèm header `Authorization: Bearer <CRON_SECRET>`.
- Test: chọn đúng người, hai nội dung, chạy lặp không trùng, email lỗi không chặn trong app, token sai bị từ chối, PATCH sai giờ bị 400.

## Task 3: Web
- `features/reminders/`: `remindersApi.ts` (`useReminders`), `ReminderSettings.tsx` (công tắc, chọn giờ, hai ô kênh, hộp báo khi email chưa cấu hình không cần), gắn vào `AccountSettings.tsx`.
- Trang `/reminders/unsubscribe` (POST khi bấm, như newsletter).
- Chuông: hiện kind `reminder` (xem `NotificationBell`), link `/progress`.
- Test: cài đặt lưu/hiện đúng, tắt thì ẩn giờ và kênh, trang huỷ nhắc.

## Task 4: Kiểm tra
`pnpm turbo typecheck`, test backend + frontend liên quan, `next build` nếu động tới route.

## Rủi ro
- Cron nằm ngoài repo: bạn tạo job trên cron-job.org sau khi deploy (URL, header Bearer, chu kỳ mỗi giờ). Job bị tắt thì không ai được nhắc.
- Migration chỉ thêm cột/hàm, chưa áp lên DB thật cho tới khi bạn nói.
