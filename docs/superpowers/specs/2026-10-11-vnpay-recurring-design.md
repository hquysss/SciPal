# SciPal: thêm VNPAY trước khi đăng ký merchant

Trạng thái: bản thiết kế để người dùng review; chưa triển khai.

## Mục tiêu và phạm vi

Thêm cổng VNPAY vào hệ thống billing đang có, phục vụ mục tiêu tự thu tiền định kỳ mà không cần MoMo Business. Có thể hoàn thiện mã nguồn và kiểm thử với fixture trước khi có tài khoản VNPAY. Thu tiền thật chỉ bật sau khi được nhà cung cấp duyệt và xác minh trên môi trường của họ.

Phạm vi gồm checkout VNPAY, xác minh thanh toán, đăng ký/hủy Recurring, xử lý kỳ tiếp theo, trạng thái Gói của tôi và đối soát admin. Thanh toán từng lần không được trình bày là đã hoàn thành mục tiêu tự gia hạn. Giữ payOS và MoMo hiện có; không tự chuyển ủy quyền của người dùng giữa các nhà cung cấp.

## Bằng chứng trong checkout hiện tại

- `backend/src/routes/billingCheckout.ts` chỉ chấp nhận payOS và MoMo.
- `packages/types/src/billing.ts` đã khai báo tên provider VNPAY, nhưng chưa có adapter VNPAY.
- `billing_mandates.provider` trong migration `20261010120541_momo_auto_renew.sql` chỉ cho phép MoMo; các RPC và worker gia hạn hiện cũng riêng cho MoMo.
- `frontend/features/billing/PricingPage.tsx` chọn MoMo khi opt-in và payOS khi thanh toán một lần.
- Một số file billing/frontend đã có thay đổi chưa commit của người dùng. Chỉ thêm thay đổi liên quan VNPAY, không ghi đè hay hoàn tác các thay đổi đó.

## Thiết kế đề xuất

### Adapter và giới hạn cấu hình

Tạo adapter VNPAY trong `backend/src/billing/providers/vnpay.ts`, theo protocol chính thức cho thanh toán và Recurring. Phân biệt rõ cấu hình sandbox/production, và khả năng thanh toán một lần/Recurring; có credential thanh toán thường không có nghĩa đã được bật Recurring.

Chỉ backend giữ khóa ký và token. Dữ liệu thẻ được nhập tại trang hosted của VNPAY, không đi qua SciPal. Không ghi khóa, token hoặc toàn bộ payload nhạy cảm vào log. Khi thiếu cấu hình, API trả lỗi đóng checkout trước khi tạo đơn; UI không cho bắt đầu thanh toán VNPAY.

### Đơn và xác nhận thanh toán

Tái sử dụng `billing_create_order`, giá từ database, idempotency và ledger hiện có. Lưu payment attempt trước khi chuyển khách sang VNPAY. Frontend chỉ gửi lựa chọn giá/provider/consent, không quyết định số tiền hay quyền được cấp.

ReturnURL chỉ hiển thị trạng thái. Chỉ callback/IPN được kiểm chữ ký hoặc truy vấn server có kết quả xác thực mới được cấp gói. Kiểm merchant, tham chiếu đơn, tiền tệ, số tiền và trạng thái giao dịch. Chuyển giao dịch trùng, sai số tiền, trả muộn hoặc đơn đã được trả qua provider khác vào logic duplicate/reconciliation hiện có.

### Recurring và hủy

Đọc toàn bộ tài liệu Recurring chính thức và xác định bên thực sự lập lịch thu trước khi triển khai worker. Không áp mô hình cron của MoMo lên VNPAY bằng suy đoán. Chuẩn hóa kết quả vào ledger SciPal; mỗi khoản thu phải gắn đúng ủy quyền, kỳ và giao dịch provider.

Viết migration mới để hỗ trợ mandate VNPAY, không sửa migration đã áp. Duy trì RLS/service-role-only cho token và bảo vệ chuyển trạng thái bằng transaction/unique constraints. Giữ RPC MoMo tương thích; những RPC đang đọc mandate phải lọc provider để không xử lý nhầm VNPAY.

Opt-in mặc định tắt, hiển thị số tiền và chu kỳ trước khi khách ủy quyền. Hủy gia hạn giữ quyền tới hết kỳ đã trả. Khi chuyển provider, chặn tạo ủy quyền thu mới cho tới khi việc hủy ủy quyền cũ được xác nhận. Timeout hoặc kết quả chưa rõ phải truy vấn lại trước khi thử thu thêm; không cấp gói khi chỉ mới đăng ký ủy quyền.

### UI và vận hành

Mở rộng `billingApi.ts`, `PricingFrame.tsx`, `PricingPage.tsx`, `MyPlan.tsx` và admin reconciliation hiện có. Hiển thị đúng nhà cung cấp, consent, ngày/kỳ thu và trạng thái hủy bằng EN/VI, sử dụng token và component hiện tại.

Cập nhật route registration, auth/maintenance allowlist và `docs/billing-runbook.md`. Công tắc tắt bán chặn checkout và tạo khoản thu mới nhưng vẫn nhận callback, truy vấn và hủy. Không tự áp migration từ xa, cấu hình Vercel, đăng ký tài khoản hoặc bật bán trong tác vụ này.

## Kiểm thử và tiêu chí chấp nhận

- Adapter: canonical signature chính thức, chữ ký giả bị từ chối, quy đổi 39.000 VND thành giá trị protocol chính xác, dữ liệu malformed/timeout không được coi là đã trả.
- API/SQL: ReturnURL không cấp gói; IPN/query hợp lệ cấp một lần; callback đồng thời và cross-provider không cấp trùng; đúng quyền chủ đơn; thiếu cấu hình không tạo đơn.
- Recurring: opt-in bắt buộc; sai mandate/kỳ/số tiền không cấp; timeout không tạo khoản thu thứ hai; hủy thành công/pending và thay provider không tạo hai lịch thu.
- UI: chọn phương thức, consent, trạng thái đóng cổng, hủy và đối soát; EN/VI, desktop/mobile; giữ các thay đổi frontend hiện có.
- Chạy test liên quan tới billing cùng typecheck/build phù hợp. Kiểm SQL local/CI nếu có môi trường; báo rõ nếu chưa chạy được.
- Test fixture chứng minh mã nguồn; sandbox/production thực tế chỉ xác minh khi có thông tin kết nối Recurring do VNPAY cấp. Không thông báo đã tự thu tiền thật trước bước đó.

## Nguồn protocol và yêu cầu bên ngoài

- Thanh toán: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
- Recurring: https://sandbox.vnpayment.vn/apis/files/VNPAYGW_RecurringPayment_Techspec2.1.0-VN.pdf
- Tài liệu và liên hệ: https://sandbox.vnpayment.vn/apis/downloads/
- Điều khoản: https://vnpay.vn/chinh-sach/dieu-khoan-dieu-kien-sddv-vnpay-bsddv.html

Việc người dùng dưới 18 tuổi có thể đứng tên merchant hay cần người đại diện phải được VNPAY xác nhận; thiết kế kỹ thuật không xác nhận hoặc thay thế điều kiện đăng ký.
