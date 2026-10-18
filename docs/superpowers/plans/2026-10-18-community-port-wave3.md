# Cộng đồng — đợt 3: danh hiệu

Spec: `docs/superpowers/specs/2026-10-18-community-port-design.md`. Dùng bảng `badges`/`user_badges` hiện có (chưa có dòng nào, `BadgeWall` đã đọc chúng).

Khác BrainBench: điều kiện nằm trong cột `badges.condition` (dữ liệu, không phải SQL cứng); bỏ `top_1_week` (cần bảng xếp hạng tuần theo môn, để sau); icon là emoji như `BadgeWall`.

1. Migration `20261018140000_badges_community.sql`: `badges` thêm `slug` (unique), `category`, `tier`, `description_vi/en`, `is_system`, `sort_order`; `user_badges` thêm `awarded_by`, `reason`; seed 12 danh hiệu (chuỗi 3/7/30 ngày, thi thử 5/20/50, điểm 10, bạn bè 1/5, ba danh hiệu danh dự cấp tay).
2. Backend: `badges/evaluate.ts` (hàm thuần: điều kiện + số liệu → slug đạt, có test); `routes/badges.ts`: `GET /api/badges/:user_id` (với "me" thì tự cấp danh hiệu mới đạt rồi trả danh sách), `POST /api/admin/badges/award|revoke` (admin, chỉ danh hiệu cấp tay, bắt buộc lý do).
3. Web: `BadgeShowcase` trên trang hồ sơ công khai (khóa mờ nếu chưa đạt). Giao diện admin cấp tay để sau; trước mắt gọi qua API.
4. Typecheck, test backend + frontend, commit.
