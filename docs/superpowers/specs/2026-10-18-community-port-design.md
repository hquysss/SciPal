# Bê Cộng đồng từ BrainBench sang SciPal — Spec

Nguồn: `D:\Khởi Nghiệp` (BrainBench, Next.js, gọi Supabase RPC thẳng từ trình duyệt). Đích: SciPal (Fastify làm chủ ghi dữ liệu, grading/XP/badge do server quyết định).

## Phạm vi (đã duyệt: phần còn thiếu, qua backend)

SciPal đã có: `friendships`, `chat_messages` (DM, phòng chung `community`, phòng lớp), `chat_blocks`, `chat_reports`, `profiles.chat_banned`, admin duyệt report + ban, UI `features/community`, `features/friends`.

Chỉ thêm phần BrainBench có mà SciPal chưa có. Làm theo 3 đợt, mỗi đợt một PR con vào cùng PR đang mở.

| Đợt | Nội dung | Nguồn BrainBench |
|---|---|---|
| 1 Phòng & tin nhắn | Phòng theo lớp (`all`, `g10`, `g11`, `g12`); trả lời tin (`reply_to`); reaction emoji; giãn cách gửi tin/ảnh (do server ép); bật/tắt Cộng đồng + cài đặt admin có lý do ghi audit | migration `room*`, `core`, `roles_and_enable`; `RoomThread`, `RoomMessageItem`, `Composer`, `GradePicker`, `CommunitySettings` |
| 2 Hồ sơ công khai | `profiles`: `cover_path`, `grade`, `school`, `bio`, `show_school`, `show_bio`; trang hồ sơ người khác; sửa hồ sơ; bucket ảnh bìa/avatar | migration `profiles`, `profile_grade_rpc`; `ProfilePanel`, `UserProfileView`, `EditProfileDialog` |
| 3 Danh hiệu | Dùng bảng `badges`/`user_badges` SciPal đã có, bổ sung danh hiệu BrainBench (streak, thi thử, xuất sắc, cộng đồng, vinh danh); server tự cấp theo streak/kết quả thi, admin cấp/thu hồi tay; hiện trên hồ sơ | migration `badges`; `BadgeShowcase`, `AdminBadgesTab`, `AwardBadgeDialog` |

Không làm: thay chat/friends hiện có, DM kiểu pending/accept (đã có bạn bè), port `lib/community*.ts` gọi RPC từ client.

## Chuyển kiến trúc

- Mỗi RPC `community_*` của BrainBench thành route Fastify `backend/src/community/*` (service role, kiểm quyền và giãn cách ở server). Không để client gọi RPC hay tự cấp badge (bất biến 4).
- Bảng mới bật RLS, client chỉ đọc phần cần; ghi qua backend. Schema Zod đặt ở `@scipal/types`.
- Khóa của BrainBench là `profiles.user_id`; SciPal dùng khóa của mình, đổi khi chép SQL.
- Màu danh hiệu/phòng đọc từ token, không hard-code (bất biến 2). Chuỗi song ngữ `{ en, vi }` (bất biến 3): BrainBench chỉ có tiếng Việt, cần thêm bản EN.
- Migration thêm vào `supabase/migrations/` theo ngày, chỉ additive. Không áp lên DB live trong phiên này.

## Kiểm chứng

`pnpm turbo typecheck` + `pnpm turbo test`; mỗi đợt có test backend (giãn cách, quyền, ban) và test UI chính; `pnpm turbo build` sau đợt cuối. BrainBench có sẵn `tests/community-*.test.ts` làm mẫu.

## Điểm cần bạn chốt

1. Danh hiệu: dùng chung bảng `badges` hiện có (khuyến nghị) hay tạo `community_badges` riêng như BrainBench?
2. Phòng lớp 10/11/12 chỉ cho học sinh THPT, hay bật cả Tiểu học/THCS khi có học liệu?
