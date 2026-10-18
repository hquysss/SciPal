# UI admin cấp/thu hồi danh hiệu danh dự

Backend đã có (`POST /api/admin/badges/award|revoke`, `GET /api/badges/:user_id`). Không đổi backend.

1. `features/admin/badges/adminBadgesApi.ts`: `awardBadge`, `revokeBadge`.
2. `AdminBadgesPage.tsx`: chọn học sinh bằng ô tìm (lọc phía trình duyệt trên `listAccounts`, theo tên hoặc email), rồi hiện các danh hiệu danh dự (`is_system = false`) của người đó từ `getBadges`; mỗi cái có nút Cấp (kèm ô lý do bắt buộc) hoặc Thu hồi. Danh hiệu tự động không hiện nút.
3. Trang `/admin/badges` (chỉ admin) và một dòng trong `AdminHub` mục Người dùng.
4. Test view, typecheck, commit.
