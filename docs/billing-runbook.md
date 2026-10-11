# Runbook thanh toán & hạn mức (billing)

Cho chủ dự án/admin vận hành bán gói. Chi tiết thiết kế: `docs/superpowers/specs/2026-09-28-account-pricing-billing-design.md`; tiến độ: `docs/superpowers/plans/2026-09-28-account-pricing-billing.md`.

## 1. Thành phần

| Phần | Ở đâu |
|---|---|
| Bảng giá, gói, hạn mức | Bảng `billing_plans`, `billing_prices`, `billing_plan_limits`; admin sửa ở `/admin/plans` (có lịch sử), không sửa tay trong database |
| Tạo đơn, cấp gói | `billing_create_order`, `billing_apply_payment` (một transaction, cấp tối đa một lần/đơn), `billing_apply_momo_payment` (MoMo ban đầu và gia hạn) |
| API | `backend/src/routes/billingCheckout.ts` (checkout, đơn, lịch sử), `billingMomo.ts` (webhook, hủy, cron), `billingPlans.ts` (catalog, gói của tôi), `billingReconciliation.ts` (admin) |
| payOS | `backend/src/billing/providers/payos.ts` |
| MoMo | `backend/src/billing/providers/momo.ts`; `billing_mandates` và `billing_renewal_attempts` chỉ service role đọc/ghi |
| Trang | `/pricing`, `/checkout/[orderId]`, `/profile/plan`, `/admin/billing`, `/admin/accounts` (hạn mức riêng) |

## 2. Bật bán (một lần)

1. Migration đã áp trên Supabase: `billing_foundation` … `billing_payments`, `billing_reconciliation` (kiểm bằng Supabase → Database → Migrations).
2. Ở môi trường **backend** trên Vercel (không đặt ở frontend): `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `WEB_APP_URL` (địa chỉ web, cho link quay về).
3. Trong trang payOS: khai webhook `https://<backend>/api/billing/webhooks/payos`. payOS gửi thử một webhook; sự kiện thử (không có đơn) sẽ hiện ở `/admin/billing` với lý do "không tìm thấy đơn" — bình thường.
4. Deploy lại backend. `/pricing` đổi từ "Sắp mở bán" sang "Mua bằng QR" khi đủ 3 khóa payOS và không bật công tắc tắt bán.
5. Thử một giao dịch nhỏ bằng tài khoản thật của chủ dự án (payOS không có sandbox), kiểm: trang đơn báo "Thanh toán thành công", `/profile/plan` hiện gói, `/admin/billing` trống.

## 3. Gia hạn MoMo (tự chọn)

1. Migration `20261010120541_momo_auto_renew.sql` đã được áp lên project Supabase SciPal ngày 10/10/2026. Migration history ghi đúng version; không áp lại thủ công.
2. Ở **backend** Vercel, cấu hình `MOMO_ENV`, `MOMO_PARTNER_CODE`, `MOMO_ACCESS_KEY`, `MOMO_SECRET_KEY`, `MOMO_PUBLIC_KEY`, `MOMO_IPN_URL` và `CRON_SECRET`. Để `MOMO_ENV=sandbox` khi thử; chỉ chọn `production` sau khi merchant đã xác nhận hồ sơ production. Không đặt các giá trị này ở frontend.
3. Khai IPN MoMo đúng URL `https://<backend>/api/billing/webhooks/momo`. Vercel gọi `/api/internal/billing/renewals/run` mỗi ngày lúc 17:00 UTC; `CRON_SECRET` bảo vệ endpoint. Worker khóa từng mandate trong database, truy vấn MoMo trước khi retry kết quả chưa rõ và dùng một attempt duy nhất cho mỗi kỳ.
4. Deploy theo thứ tự migration, backend, frontend. `/pricing` chỉ hiện lựa chọn MoMo khi cấu hình MoMo, IPN và cron đủ; checkbox mặc định tắt, ghi nhận giá/kỳ đồng ý. payOS QR tiếp tục là thanh toán một lần. Chọn QR khi đang có mandate sẽ hủy mandate và đợi MoMo xác nhận trước khi tạo link QR.
5. Người dùng hủy tại `/profile/plan`. Quyền hiện tại giữ tới `paid_through`; khi hủy đang chờ xác nhận, worker không tạo lượt thu mới. Nếu một khoản thu đã ở trạng thái đang xử lý tại MoMo, nó có thể hoàn tất trước khi lệnh hủy có hiệu lực.
6. Trước khi bật production, hoàn thành giao dịch thử trên sandbox với success, decline, duplicate IPN, webhook bị trễ, timeout khi charge, hủy thành công và hủy chưa xác nhận. Bộ test local không thay thế bước này.

## 3b. VNPAY (thanh toán một lần và tự gia hạn, mặc định đóng)

- Bật thanh toán một lần: `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_ENV` (`sandbox` hoặc `production`) ở `backend/.env`. Thiếu một biến thì VNPAY đóng; `sandbox` hiện nhãn "chế độ thử nghiệm" trên trang giá.
- Bật tự gia hạn (riêng, opt-in): `VNPAY_RECURRING_ENABLED=true`, `VNPAY_RECURRING_BASE_URL`, `VNPAY_RECURRING_CLIENT_ID`, `VNPAY_RECURRING_CLIENT_SECRET`, `VNPAY_RECURRING_USERNAME`, `VNPAY_RECURRING_PASSWORD`, `VNPAY_RECURRING_IPN_ENCODING`, và `VNPAY_PUBLIC_API_URL` (https, URL công khai của backend cho IPN/redirect).
- Return URL không cấp gói; chỉ IPN có chữ ký hoặc truy vấn giao dịch được xác minh mới cấp, một lần. Một tài khoản chỉ có một ủy quyền gia hạn (MoMo hoặc VNPAY); đổi cổng phải hủy cái cũ trước, hủy chưa xác nhận thì giữ trạng thái chờ hủy và gói đã trả.
- Migration `momo_cancellation_ambiguity` và `vnpay_gateway` đã áp lên Supabase SciPal ngày 11/10 (theo thứ tự đó); VNPAY vẫn đóng cho tới khi có biến môi trường. Chưa có giao dịch VNPAY sandbox/production thật nào được xác minh, và SQL test chưa chạy.

## 3c. Gói 3 tháng và 6 tháng

- Chu kỳ: `month`, `quarter` (3 tháng), `half_year` (6 tháng), `year`. Gói 3 và 6 tháng chỉ thanh toán một lần (payOS/VNPAY), không tự gia hạn; checkout từ chối MoMo hoặc tự gia hạn cho hai chu kỳ này.
- Admin đổi giá ở `/admin/plans`; để trống giá 3 hoặc 6 tháng để ngừng bán. Giá tháng và năm luôn phải có.
- Migration `billing_quarter_half_year` đã áp lên Supabase SciPal ngày 11/10; các hàm gia hạn MoMo/VNPAY cũng dùng `billing_interval_months`.

## 4. Tắt bán khẩn cấp (rollback)

- Đặt `BILLING_CHECKOUT_DISABLED=true` ở backend rồi deploy lại: không tạo checkout mới và cron không bắt đầu lần gia hạn nào; **webhook, hủy mandate và trang đơn vẫn hoạt động** — khoản MoMo/payOS đã nhận vẫn được ghi nhận hoặc đưa vào đối soát.
- **Không** xóa khóa payOS để tắt bán: webhook sẽ trả 503 và tiền đã trả không được ghi nhận cho tới khi bật lại.
- Không xóa dữ liệu bảng `billing_*`, `quota_*` — đó là sổ cái.

## 5. Sự cố thường gặp

| Tình huống | Hệ thống làm gì | Admin làm gì |
|---|---|---|
| Webhook đến trễ/mất | Khi người mua mở trang đơn, server tự hỏi payOS và cấp gói nếu đã trả | Không cần; nếu khách báo, mở `/admin/billing` hoặc bảo khách mở lại trang đơn |
| Webhook trùng / đến cùng lúc | Cấp một lần (kiểm bằng CI: 10 callback đồng thời → 1 lần cấp) | Không cần |
| Chuyển sai số tiền | Không cấp; vào đối soát "Sai số tiền thanh toán" | Liên hệ khách: hoàn tiền hoặc bảo chuyển lại đúng đơn mới; ghi chú xử lý ngoài hệ thống |
| Trả sau khi đơn hết hạn (30 phút) | Không cấp; vào đối soát "Thanh toán sau hạn" | Quyết định cấp tay qua hạn mức riêng (`/admin/accounts`) hoặc hoàn tiền |
| Trả hai lần cho một đơn | Cấp một lần; khoản dư vào đối soát "Đơn đã được thanh toán trước đó" | Hoàn khoản dư |
| Đổi vai trò giữa lúc mua | Không cấp; "Vai trò tài khoản đã đổi" | Đổi lại vai trò đúng rồi bấm "Hỏi lại payOS" ở `/admin/billing` |
| payOS lỗi khi tạo QR | Người mua thấy "Cổng thanh toán chưa tạo được mã QR" (502), bấm lại dùng cùng đơn | Theo dõi trạng thái payOS; tắt bán nếu kéo dài |
| MoMo chưa xác nhận giao dịch do timeout | Renewal chuyển `unknown`; lượt cron kế tiếp hỏi trạng thái trước khi gửi lại cùng request ID | Kiểm tra giao dịch/mandate trong MoMo; nếu quá số lần truy vấn an toàn, trạng thái chuyển đối soát và tự gia hạn tắt |
| Hủy MoMo còn chờ xác nhận | `renewal_mode` chuyển manual ngay, không tạo lượt thu tiếp; UI hiện trạng thái chờ | Mở `/profile/plan` và bấm kiểm tra lại; không tạo QR mới trước khi MoMo xác nhận |
| VNPAY gửi IPN sai chữ ký hoặc sai số tiền/merchant | Từ chối (`RspCode 97`), không cấp gói, không ghi nhận như đã trả | Kiểm tra giao dịch trong cổng VNPAY; nếu tiền thật đã trừ thì xử lý như "Chuyển sai số tiền" |
| VNPAY hủy gia hạn chưa được xác nhận | Giữ trạng thái chờ hủy, không tạo lượt thu mới, giữ gói đã trả (HTTP 202) | Mở `/profile/plan` và kiểm tra lại; không tạo thanh toán một lần mới cho tới khi VNPAY xác nhận |
| Khách khiếu nại/chargeback qua thẻ | Hệ thống không tự thu hồi gói | Làm theo mục 6: đặt hạn mức riêng về mức Free có lý do "chargeback đơn …"; giữ nguyên sổ cái, ghi lại mã giao dịch |
| Hết lượt (Tutor, thi, nhập tệp, AI soạn bài) | 429 kèm số lượt và thời điểm làm mới | Cấp hạn mức riêng có hạn và lý do ở `/admin/accounts` nếu cần |
| Không đọc được sổ hạn mức | 503, **không** cho qua | Kiểm Supabase |

- Lượt đang giữ (Tutor 10 phút, lượt thi 3 giờ) tự hết hạn và được trả khi yêu cầu bị bỏ dở; không cần dọn tay.
- `/admin/billing` không có nút "đánh dấu đã trả": chỉ hỏi lại payOS. Cấp quyền ngoài luồng thì dùng hạn mức riêng có lý do (được ghi audit).

## 6. Hoàn tiền

- payOS là chuyển khoản ngân hàng: hoàn tiền bằng chuyển khoản ngược lại từ tài khoản nhận, ngoài hệ thống.
- Hệ thống **chưa có** thao tác thu hồi gói sau hoàn tiền. Khi hoàn toàn bộ tiền của một đơn đã cấp gói: đặt hạn mức riêng về mức gói miễn phí (có lý do "hoàn tiền đơn …") cho tới khi có tính năng thu hồi.
- Chính sách hoàn tiền, chứng từ/thuế: chủ dự án chốt trước khi mở bán rộng (spec §2.1).

## 6b. Kiểm tra trước khi mở bán (Task 10)

Bằng chứng đã có: SQL kiểm trên PostgreSQL thật (PGlite, `supabase/tests/check-sql.mjs`, cài `@electric-sql/pglite` một lần bằng `npm i --no-save` trong thư mục đó); backend và web test, typecheck, build đều đạt; migration chain trên Supabase SciPal đã áp đủ. Việc **chỉ chủ dự án làm được**, xác nhận riêng từng việc:

1. Credentials merchant (payOS, MoMo, VNPAY) đặt trong backend, không vào PR.
2. Giao dịch sandbox/thật: payOS (tiền nhỏ), MoMo (success, decline, duplicate IPN, timeout, hủy), VNPAY (một lần và tự gia hạn).
3. Chính sách hoàn tiền, chứng từ/thuế, giá gói 3/6 tháng và hiệu quả kinh tế quota AI.
4. Bật checkout: deploy DB, rồi backend, rồi web; bật từng cổng riêng bằng biến môi trường. Tắt khẩn cấp: mục 4.

## 7. Chưa có (theo plan)

- VNPAY (Task 7): code và migration đã có (migration đã áp), mặc định đóng; cần hồ sơ merchant và sandbox trước khi mở.
- Giao dịch MoMo sandbox/production thật chưa được xác minh trong lần triển khai code này.
- Thu hồi gói sau hoàn tiền; thông báo email khi thanh toán.
