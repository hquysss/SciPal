# Chưa có pháp lý: giữ bảng giá, khóa mua, admin sửa mô tả

## Vấn đề

SciPal chưa đủ pháp lý để bán gói. Cần vẫn cho xem giá, nhưng không ai mua được, và admin tự bật lại khi sẵn sàng, không cần deploy.

## Hiện có

- `checkoutOpen` trong `/api/billing/plans` đã làm nút mua thành "Sắp mở bán" (landing `PricingSection`, trang `/pricing` `PricingPage`). Nó chỉ phụ thuộc biến môi trường (khóa nhà cung cấp, `BILLING_CHECKOUT_DISABLED`), admin không chỉnh được.
- `POST /api/billing/checkout` đã từ chối khi `checkoutDisabled()` hoặc thiếu nhà cung cấp.
- `/admin/site` + bảng `site_settings` là chỗ admin chỉnh công tắc (mẫu: `free_access`).

## Thiết kế

1. **Migration** (cộng thêm, không phá): `site_settings.sales_open boolean not null default false` và `sales_note jsonb not null default '{}'` dạng `{ en, vi }`, mỗi ngôn ngữ tối đa 400 ký tự. Mặc định đóng, vì đó là tình trạng hiện tại; admin bật khi có pháp lý.
2. **Backend**
   - `SiteSettings` thêm `salesOpen`, `salesNote`; `GET/PATCH /api/admin/site-settings` đọc và ghi hai trường (validate kiểu và độ dài).
   - `/api/billing/plans`: `checkoutOpen` chỉ đúng khi `salesOpen` và có nhà cung cấp; trả thêm `salesNote`.
   - `POST /api/billing/checkout`: khi `salesOpen` tắt trả lỗi song ngữ như `CLOSED`. Admin vẫn mua thử được (giống `featureAllowed`).
   - Không đụng webhook và job tự gia hạn của người đã mua.
3. **Frontend**
   - `Catalog.salesNote`; dưới nút "Sắp mở bán" ở landing và `/pricing` hiện mô tả của admin; để trống thì dùng câu mặc định song ngữ.
   - `/admin/site` (`SiteSwitches`): một công tắc "Mở bán" và hai ô nhập mô tả (VI, EN).
4. **Kiểm thử**: test backend (plans, checkout bị chặn, admin qua được, PATCH hợp lệ/không hợp lệ), test frontend (có mô tả, không có mô tả, đang mở).

## Lưu ý

- `/api/billing/plans` cache công khai 5 phút, và trang web revalidate 300s: đổi công tắc có hiệu lực sau tối đa vài phút. Chỉ chặn tạo đơn ở backend là tức thì.
- Áp dụng migration trước khi deploy backend mới (cột có mặc định, backend cũ vẫn chạy).
- Gỡ: bật công tắc; muốn bỏ hẳn thì `drop column`.
