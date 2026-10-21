# Hỗ trợ vùng cao: đơn xin hỗ trợ và mã cấp gói miễn phí

## Vấn đề

Học sinh và giáo viên ở vùng cao, vùng sóng yếu hoặc hoàn cảnh khó khăn không trả được gói trả phí. SciPal muốn tặng gói sau khi duyệt thủ công, và đây là một phần câu chuyện trong hồ sơ dự thi. Hai đường, cùng một cơ chế cấp gói:

1. **Đơn xin hỗ trợ**: học sinh hoặc giáo viên đã đăng nhập gửi đơn trên web, admin xem xét.
2. **Mã**: admin tạo mã, đưa cho người được hỗ trợ qua kênh riêng, người đó nhập mã (cho trường hợp duyệt ngoài hệ thống, hoặc người chưa có tài khoản lúc được duyệt).

## Mục tiêu

- Học sinh, giáo viên gửi đơn; admin duyệt hoặc từ chối kèm lý do; duyệt xong thì tài khoản có gói ngay.
- Admin tạo mã; người nhận nhập mã thì tài khoản có gói trong N tháng.
- Học sinh nhận Học sinh Plus, giáo viên nhận Giáo viên Pro.
- Chạy được khi **chưa mở bán**: không phụ thuộc công tắc `sales_open`, nhà cung cấp thanh toán hay đơn hàng.

## Không làm

- Không tự xác minh hoàn cảnh, không nhận giấy tờ hay ảnh tải lên (admin tự xác minh ngoài hệ thống).
- Không gửi email; người gửi đơn xem kết quả ngay trên web.
- Không thu hồi thời gian đã cấp khi thu hồi mã hay khi đổi ý về một đơn.

## Thiết kế

**Dữ liệu** (migration cộng thêm; hai bảng chỉ `service_role` đọc/ghi, RLS bật):

- `billing_access_codes`: `id`, `code_hash` (sha256, duy nhất), `code_hint` (4 ký tự cuối), `plan_code` (`student_plus` hoặc `teacher_pro`; người nhập phải đúng vai trò), `months` (1–12), `max_uses` (mặc định 1), `expires_at` (hạn nhập mã, tùy chọn), `note` (ghi chú ngắn của admin), `revoked_at`, `created_by`, `created_at`.
- `billing_code_redemptions`: `code_id`, `user_id`, `granted_from`, `granted_through`, `redeemed_at`; duy nhất `(code_id, user_id)`.
- `support_applications`: `id`, `user_id`, `role` (student/teacher, lấy từ tài khoản, không do người gửi khai), `full_name`, `school`, `area` (xã/huyện/tỉnh), `reason` (tối đa 1000 ký tự), `status` (`pending` | `approved` | `rejected`), `decision_note`, `granted_months`, `decided_by`, `decided_at`, `created_at`. Mỗi tài khoản chỉ có tối đa 1 đơn `pending` (chỉ mục duy nhất một phần). RLS: người gửi đọc được đơn của mình; mọi ghi qua backend.

**Nhập mã**: hàm SQL `billing_redeem_code(p_user_id, p_code_hash)` làm trong một giao dịch: khóa dòng mã, kiểm tra chưa thu hồi, chưa hết hạn, còn lượt, người này chưa dùng mã này; rồi cộng `months` vào `billing_subscriptions.paid_through` từ `greatest(paid_through hiện có, now())` (gói `student_plus`, `renewal_mode` giữ `manual`) và ghi một dòng redemption. Người đã có gói trả phí thì được cộng nối tiếp, không mất ngày đã trả. Gói cấp theo `plan_code` của mã và phải khớp vai trò tài khoản (học sinh `student_plus`, giáo viên `teacher_pro`); admin bị từ chối. Việc cộng ngày dùng chung một hàm nội bộ `billing_grant_support_time(user, plan, months)` với việc duyệt đơn, để chỉ có một chỗ thay đổi `billing_subscriptions`.

**Duyệt đơn**: hàm SQL `support_decide_application(p_id, p_admin, p_approve, p_months, p_note)` trong một giao dịch: khóa đơn, chỉ xử lý đơn `pending`, nếu duyệt thì gọi `billing_grant_support_time` và ghi `granted_months`.

**Backend**:

- `POST /api/billing/codes/redeem { code }`: phải đăng nhập; chuẩn hóa mã (bỏ khoảng trắng, chữ hoa) rồi băm; giới hạn 5 lần sai mỗi giờ mỗi tài khoản; trả lỗi song ngữ chung chung ("Mã không hợp lệ hoặc đã hết hạn") cho mọi trường hợp sai, để không dò được mã.
- `POST /api/support/applications` (đăng nhập, học sinh hoặc giáo viên): tạo đơn; từ chối khi đã có đơn `pending`; giới hạn 3 đơn mỗi 30 ngày mỗi tài khoản. `GET /api/support/applications/mine`: đơn gần nhất và trạng thái.
- `GET /api/admin/support/applications?status=`, `POST /api/admin/support/applications/:id/decision { approve, months, note }`: chỉ admin.
- `POST/GET /api/admin/billing/codes`, `POST /api/admin/billing/codes/:id/revoke`: chỉ admin. Mã thô (12 ký tự, bảng chữ không nhầm 0/O, 1/I) **chỉ hiện một lần lúc tạo**; sau đó danh sách chỉ thấy `code_hint`, ghi chú, số lượt dùng, trạng thái.

**Web**:

- Trang "Xin hỗ trợ" (liên kết từ `/pricing` và trang gói của tài khoản): biểu mẫu ngắn, sau khi gửi hiện trạng thái đơn (đang xem xét, đã duyệt đến ngày …, bị từ chối kèm lý do). Cũng chạy khi chưa mở bán.
- Ô "Nhập mã hỗ trợ" trên `/pricing` (chỗ nút "Sắp mở bán" vẫn hiện) và trang gói của tài khoản; thành công thì báo "Gói Plus đến ngày …".
- Trang admin "Hỗ trợ vùng cao": hai tab, "Đơn" (danh sách theo trạng thái, duyệt kèm số tháng hoặc từ chối kèm lý do) và "Mã" (tạo mã cho học sinh hoặc giáo viên, danh sách, thu hồi, sao chép mã mới).

## Quyết định của mình (bạn sửa nếu không hợp)

1. Lưu băm của mã, không lưu mã thô; admin phải đưa mã cho học sinh ngay lúc tạo.
2. Ghi chú của admin trên mã dạng nhắn ngắn, giao diện nhắc **không ghi tên hay hoàn cảnh của học sinh**, chỉ mã hồ sơ nội bộ.
2b. Đơn chỉ hỏi những gì cần để duyệt (họ tên, trường, nơi ở theo xã/huyện/tỉnh, lý do ngắn), không hỏi địa chỉ chi tiết, số điện thoại hay giấy tờ. Chỉ admin đọc được nội dung đơn; trang gửi đơn có dòng giải thích dữ liệu dùng để làm gì và ai xem. Đơn đã xử lý xóa `reason` sau 12 tháng (chưa làm trong đợt này, ghi lại như việc sau).
2c. Admin chọn số tháng khi duyệt (mặc định 3 cho học sinh, 3 cho giáo viên); người đã được duyệt có thể gửi đơn mới sau 30 ngày để gia hạn.
3. Mặc định 1 mã dùng cho 1 học sinh, 3 tháng; admin đổi được.
4. Thu hồi mã chỉ chặn lượt nhập sau đó.

## Kiểm thử

SQL/backend: đơn: tạo được, chỉ 1 đơn `pending`, giới hạn 3 đơn/30 ngày, người khác không đọc được đơn của mình, duyệt một đơn hai lần chỉ cộng ngày một lần, duyệt đúng gói theo vai trò, từ chối không cấp gì, không phải admin thì không duyệt được; mã đúng cộng ngày; mã sai, hết hạn, thu hồi, hết lượt, dùng lại, giáo viên dùng, đều bị từ chối bằng cùng một lỗi; cộng nối tiếp khi đã có gói; nhập đồng thời hai lần không vượt `max_uses`; chặn sau 5 lần sai; admin mới tạo được mã. Web: ô nhập mã hiện cả khi chưa mở bán; trang admin chỉ hiện mã thô một lần.

## Lưu ý khi áp dụng

Áp migration trước khi deploy backend mới. Cần kiểm tra trong lúc làm: `billing_apply_payment` khi một đơn trả phí đến lúc học sinh đang dùng gói từ mã phải cộng nối tiếp từ `paid_through`, không ghi đè.
