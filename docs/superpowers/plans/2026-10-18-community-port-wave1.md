# Cộng đồng — đợt 1: phòng theo khối, trả lời, reaction

Spec: `docs/superpowers/specs/2026-10-18-community-port-design.md`. Đã chốt: danh hiệu dùng bảng `badges` hiện có, phòng khối chỉ 10/11/12.

Thay đổi so với spec (SciPal đã có sẵn):
- Bật/tắt Cộng đồng: dùng `site_settings.features` hiện có, không thêm.
- Giãn cách gửi tin: giữ giới hạn 10 tin/10 giây của `routes/chat.ts`, không thêm cài đặt admin. Ảnh vẫn chỉ trong tin riêng.

## Các bước

1. Migration `20261018120000_chat_grade_rooms.sql` (additive): `profiles.grade`; `chat_messages.room_grade`, `reply_to`; ràng buộc đích gồm `room_grade`; hàm `chat_can_enter_grade`; policy đọc thêm nhánh khối; bảng `chat_reactions` + RLS + Realtime.
2. Backend `routes/chat.ts`: `room_grade` là đích thứ tư (kiểm khối của người gửi, giáo viên/admin vào mọi khối); `reply_to` phải cùng đích; `GET /api/chat/rooms`, `PUT /api/chat/grade`, `POST /api/chat/reactions` (bật/tắt); báo cáo hỗ trợ phòng khối. Test cho từng nhánh.
3. Frontend `features/community`: `chatApi` + `useChatRoom` (đích khối, `reply_to`, reaction), `ChatPaneView` (trả lời, chip reaction), `CommunityRoom` có chọn phòng Tất cả/Khối và chọn khối lần đầu. Test hook và view.
4. `pnpm turbo typecheck` và test của `@scipal/api`, `@scipal/web`.
