# Nhắc học: vận hành

Spec: `docs/superpowers/specs/2026-10-26-study-reminders-design.md`.

## Cần có ở backend (Vercel)
- `CRON_SECRET`: bảo vệ endpoint chạy nhắc.
- `RESEND_API_KEY`, `EMAIL_FROM`: gửi email. Thiếu thì nhắc qua email bị bỏ qua, nhắc trong app vẫn chạy và ô "Qua email" trong Hồ sơ bị khoá.
- `GUEST_TRIAL_SECRET`: ký link huỷ email nhắc (dùng chung với newsletter). Thiếu thì không gửi email nhắc.
- `WEB_APP_URL`: gốc của link trong email.

## Áp migration
`supabase/migrations/20261026110000_study_reminders.sql` (thêm 4 cột vào `profiles` và hàm `claim_study_reminders`). Áp trước khi bật job.

## Tạo job trên cron-job.org
1. URL: `https://<backend>/api/internal/reminders/run`, phương thức GET.
2. Header: `Authorization: Bearer <CRON_SECRET>`.
3. Chu kỳ: mỗi giờ, vào phút 0. Múi giờ của job không quan trọng, server tự tính giờ Việt Nam.
4. Kết quả mong đợi: HTTP 200 với `{"claimed": n, "in_app": n, "emailed": n}`. 401 là sai secret, 500 là lỗi claim.

## Chạy lại có an toàn không
Có. Mỗi lần chạy "nhận" người dùng bằng cách đặt `last_reminded_on` trong một câu lệnh, nên chạy lặp hoặc hai lần chồng nhau không gửi trùng trong cùng một ngày. Nếu một lần chạy bị hỏng sau khi nhận, người đó không được nhắc lại hôm đó.

## Rollback
Tắt job trên cron-job.org. Muốn gỡ hẳn: `drop function public.claim_study_reminders(date, int, int);` rồi bỏ 4 cột `reminder_*` và `last_reminded_on`.
