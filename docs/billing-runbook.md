# Runbook thanh toán & hạn mức (billing)

Cho chủ dự án/admin vận hành bán gói. Chi tiết thiết kế: `docs/superpowers/specs/2026-09-28-account-pricing-billing-design.md`; tiến độ: `docs/superpowers/plans/2026-09-28-account-pricing-billing.md`.

## 1. Thành phần

| Phần | Ở đâu |
|---|---|
| Bảng giá, gói, hạn mức | Bảng `billing_plans`, `billing_prices`, `billing_plan_limits` (dữ liệu, không phải code) |
| Tạo đơn, cấp gói | `billing_create_order`, `billing_apply_payment` (một transaction, cấp tối đa một lần/đơn) |
| API | `backend/src/routes/billingCheckout.ts` (checkout, đơn, lịch sử, webhook), `billingPlans.ts` (catalog, gói của tôi), `billingReconciliation.ts` (admin) |
| payOS | `backend/src/billing/providers/payos.ts` |
| Trang | `/pricing`, `/checkout/[orderId]`, `/profile/plan`, `/admin/billing`, `/admin/accounts` (hạn mức riêng) |

## 2. Bật bán (một lần)

1. Migration đã áp trên Supabase: `billing_foundation` … `billing_payments`, `billing_reconciliation` (kiểm bằng Supabase → Database → Migrations).
2. Ở môi trường **backend** trên Vercel (không đặt ở frontend): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `WEB_APP_URL` (địa chỉ web, cho link quay về).
3. Trong trang payOS: khai webhook `https://<backend>/api/billing/webhooks/payos`. payOS gửi thử một webhook; sự kiện thử (không có đơn) sẽ hiện ở `/admin/billing` với lý do "không tìm thấy đơn" — bình thường.
4. Deploy lại backend. `/pricing` đổi từ "Sắp mở bán" sang "Mua bằng QR" khi đủ 3 khóa payOS và không bật công tắc tắt bán.
5. Thử một giao dịch nhỏ bằng tài khoản thật của chủ dự án (payOS không có sandbox), kiểm: trang đơn báo "Thanh toán thành công", `/profile/plan` hiện gói, `/admin/billing` trống.

## 3. Tắt bán khẩn cấp (rollback)

- Đặt `BILLING_CHECKOUT_DISABLED=true` ở backend rồi deploy lại: không tạo đơn mới (`/pricing` về "Sắp mở bán"), nhưng **webhook và trang đơn vẫn hoạt động** — ai đã chuyển khoản vẫn được cấp gói hoặc vào đối soát.
- **Không** xóa khóa payOS để tắt bán: webhook sẽ trả 503 và tiền đã trả không được ghi nhận cho tới khi bật lại.
- Không xóa dữ liệu bảng `billing_*`, `quota_*` — đó là sổ cái.

## 4. Sự cố thường gặp

| Tình huống | Hệ thống làm gì | Admin làm gì |
|---|---|---|
| Webhook đến trễ/mất | Khi người mua mở trang đơn, server tự hỏi payOS và cấp gói nếu đã trả | Không cần; nếu khách báo, mở `/admin/billing` hoặc bảo khách mở lại trang đơn |
| Webhook trùng / đến cùng lúc | Cấp một lần (kiểm bằng CI: 10 callback đồng thời → 1 lần cấp) | Không cần |
| Chuyển sai số tiền | Không cấp; vào đối soát "Sai số tiền thanh toán" | Liên hệ khách: hoàn tiền hoặc bảo chuyển lại đúng đơn mới; ghi chú xử lý ngoài hệ thống |
| Trả sau khi đơn hết hạn (30 phút) | Không cấp; vào đối soát "Thanh toán sau hạn" | Quyết định cấp tay qua hạn mức riêng (`/admin/accounts`) hoặc hoàn tiền |
| Trả hai lần cho một đơn | Cấp một lần; khoản dư vào đối soát "Đơn đã được thanh toán trước đó" | Hoàn khoản dư |
| Đổi vai trò giữa lúc mua | Không cấp; "Vai trò tài khoản đã đổi" | Đổi lại vai trò đúng rồi bấm "Hỏi lại payOS" ở `/admin/billing` |
| payOS lỗi khi tạo QR | Người mua thấy "Cổng thanh toán chưa tạo được mã QR" (502), bấm lại dùng cùng đơn | Theo dõi trạng thái payOS; tắt bán nếu kéo dài |
| Hết lượt (Tutor, thi, nhập tệp, AI soạn bài) | 429 kèm số lượt và thời điểm làm mới | Cấp hạn mức riêng có hạn và lý do ở `/admin/accounts` nếu cần |
| Không đọc được sổ hạn mức | 503, **không** cho qua | Kiểm Supabase |

- Lượt đang giữ (Tutor 10 phút, lượt thi 3 giờ) tự hết hạn và được trả khi yêu cầu bị bỏ dở; không cần dọn tay.
- `/admin/billing` không có nút "đánh dấu đã trả": chỉ hỏi lại payOS. Cấp quyền ngoài luồng thì dùng hạn mức riêng có lý do (được ghi audit).

## 5. Hoàn tiền

- payOS là chuyển khoản ngân hàng: hoàn tiền bằng chuyển khoản ngược lại từ tài khoản nhận, ngoài hệ thống.
- Hệ thống **chưa có** thao tác thu hồi gói sau hoàn tiền. Khi hoàn toàn bộ tiền của một đơn đã cấp gói: đặt hạn mức riêng về mức gói miễn phí (có lý do "hoàn tiền đơn …") cho tới khi có tính năng thu hồi.
- Chính sách hoàn tiền, chứng từ/thuế: chủ dự án chốt trước khi mở bán rộng (spec §2.1).

## 6. Chưa có (theo plan)

- Thẻ VNPAY (Task 7) — cần hồ sơ và sandbox VNPAY.
- Tự gia hạn (Task 8) — cần dịch vụ trừ tiền định kỳ của VNPAY.
- Thu hồi gói sau hoàn tiền; thông báo email khi thanh toán.
