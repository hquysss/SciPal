# SciPal Pricing, Billing & Account Quotas — Design

Ngày: 28/09/2026. Trạng thái: phạm vi, giá và quyền điều chỉnh hạn mức đã được người dùng đồng ý trong chat; tài liệu kỹ thuật để review trước khi code.
Cơ sở khảo sát: origin/main tại 35afa624e5314b1940e6da53552a58a4b1c29355. Đây là snapshot mã nguồn, không phải xác nhận deployment hay schema remote.

## 1. Mục tiêu và phạm vi đã chốt

Thêm pricing cho học sinh/giáo viên, thanh toán thật bằng QR và thẻ, quản lý gói, hạn mức server-side và điều chỉnh hạn mức riêng từng tài khoản bởi admin. Giao diện web trước; không mở rộng sang mua hàng trong ứng dụng Expo ở đợt này.

Bảng mặc định đã chốt:

| Gói | Giá tháng / năm (VND) | Quyền lợi có hạn mức |
|---|---|---|
| student_free | 0 / 0 | 3 lượt thi chấm điểm/tháng; 10 lượt Tutor/tháng |
| student_plus | 39.000 / 390.000 | 30 lượt thi chấm điểm/tháng; 200 lượt Tutor/tháng |
| teacher_free | 0 / 0 | 1 lớp hoạt động; 50 học sinh/lớp; 5 tệp nhập/tháng; 5 đề do giáo viên tạo đang hoạt động; 0 lượt AI soạn bài/tháng |
| teacher_pro | 99.000 / 990.000 | 10 lớp hoạt động; 50 học sinh/lớp; 100 tệp nhập/tháng; 100 đề do giáo viên tạo đang hoạt động; 100 lượt AI soạn bài/tháng |

- Bài học đã xuất bản, EN/VI, tiến trình, XP/streak và lịch sử kết quả không trở thành dữ liệu phải mua lại.
- Soạn bài, gửi duyệt, quản lý lớp và giao bài thuộc cả hai gói giáo viên khi luồng tương ứng hoạt động.
- Giá năm thu trước; hạn mức tháng không nhân 12 hoặc cộng dồn.
- Một tài khoản có một gói theo nhóm role. Teacher Pro không tự bao gồm Student Plus.
- Gói giáo viên không cấp role teacher, không bỏ duyệt bài/đề. Quyền lấy từ app_metadata.app_role đã xác thực.
- Khách xem được cả hai nhóm. Checkout teacher chỉ cho role teacher; admin vận hành không phải đối tượng bán gói.
- Các quyền lợi chưa sẵn sàng phải ghi rõ. Không bật bán một gói với quyền lợi cốt lõi chưa nghiệm thu.

## 2. Những mặc định kỹ thuật đề xuất trong plan

Các quy tắc dưới đây làm rõ phần chưa nói trong chat; được trình bày để review, không ghi thành quyết định kinh doanh đã được duyệt riêng:

1. Giá hiển thị là tổng tiền đơn hàng, không tự cộng phụ phí cổng. Xác nhận cách lập chứng từ/thuế và chính sách hoàn tiền trước mở bán.
2. Hạn mức tháng dùng tháng lịch Asia/Ho_Chi_Minh, reset lúc 00:00 ngày 1. Thời hạn thuê bao tính từ ngày kích hoạt, theo 1 hoặc 12 tháng lịch; chặn ngày về cuối tháng khi cần. Trang gói hiển thị riêng ngày hết hạn và ngày cấp lượt mới.
3. Free lên trả phí có hiệu lực sau xác nhận thanh toán. Cùng nhóm đổi tháng/năm chỉ có hiệu lực kỳ kế tiếp, không prorate đợt đầu. Gia hạn cùng gói nối từ max(now, paid_through), không xóa usage hiện có.
4. Hủy tự gia hạn giữ quyền lợi đến paid_through. Thanh toán gia hạn thất bại không gia hạn thời gian; hết hạn về Free và giữ dữ liệu. Chưa có chính sách ân hạn trả phí.
5. Thay role bởi admin không sửa hợp đồng thanh toán ngầm: cảnh báo và yêu cầu xử lý thuê bao đang tự gia hạn trước khi đổi role; mọi callback vẫn đối soát được.
6. Tutor của teacher/admin và giới hạn dịch ký tự hiện tại không bị suy diễn thành quyền lợi Student Plus. Giữ chính sách vận hành hiện tại cho những trường hợp chưa có hạn mức thương mại; monthly author_ai_requests chỉ tính tính năng AI soạn bài mới.
7. Đề giáo viên ở bảng trên là đề thuộc tác giả chưa lưu trữ, không phải hứa một chế độ chia sẻ riêng tư mới. Trạng thái duyệt và quyền đọc hiện tại vẫn áp dụng.

## 3. Giao diện

### /pricing (public)

- H1: “Chọn gói phù hợp với cách bạn học và dạy.”, bản EN tương đương.
- Hai lựa chọn đối tượng Học sinh/Giáo viên và Tháng/Năm, trạng thái hỗ trợ bàn phím.
- Hai thẻ Free/trả phí của nhóm được chọn; giá năm hiển thị tổng phải trả trước, có thể thêm giá quy đổi mỗi tháng với nhãn rõ.
- Bảng quyền lợi và FAQ; không dùng nhãn “Phổ biến nhất” khi chưa có dữ liệu.
- Gói hiện tại lấy từ backend; khách được dẫn đăng nhập với return path nội bộ hợp lệ.
- Trước thanh toán hiển thị gói, chu kỳ, tổng VND, phương thức và trạng thái tự gia hạn.
- Catalog lỗi: có thông báo/thử lại; không dùng giá fallback khác giá backend.

### /account/billing và /checkout/[orderId]

- Billing yêu cầu đăng nhập: gói hiện tại, paid_through, ngày reset, đã dùng/tổng từng metric, nguồn mặc định/riêng, lịch sử giao dịch phân trang và thao tác gia hạn/hủy.
- Lịch sử là giao dịch/biên nhận thanh toán, không tự gọi là hóa đơn thuế.
- Checkout chỉ chủ đơn xem: QR hoặc chuyển sang hosted checkout thẻ; chờ xác nhận, thành công, thất bại, hết hạn và cần đối soát.
- Chờ xác nhận dùng polling có giới hạn và nút kiểm tra lại. Chỉ đọc trạng thái backend; không cấp gói từ query của return URL.
- Hủy tự gia hạn hiển thị ngày kết thúc quyền lợi và trạng thái đang xử lý nếu nhà cung cấp chưa xác nhận.

### /admin/accounts → Hạn mức

- Tận dụng danh sách tài khoản hiện tại; mở dialog có gói, usage, mặc định, hiệu lực riêng và ngày hết hạn.
- Mỗi metric: “Theo gói” hoặc tổng số nguyên >= 0; 0 nghĩa là không được sử dụng, không nghĩa là unlimited. Bỏ trường khỏi PATCH nghĩa là không đổi, reset phải explicit.
- Sửa nhiều metric một lần, có lý do 1–500 ký tự và expires_at riêng hoặc null (đến khi thu hồi).
- “Khôi phục theo gói” cho một mục hoặc tất cả; thao tác này giữ lịch sử usage.
- Ngày giờ hiển thị giờ Việt Nam; payload ISO UTC. Không đặt expires_at ở quá khứ.
- Cảnh báo khi hạ dưới usage; vẫn cho admin lưu. Hai admin sửa cùng lúc: version conflict 409, tải lại trước khi lưu.
- Nhật ký ai sửa, trước/sau, lý do, thời gian; chỉ admin xem.

Tái sử dụng tokens, useLanguage, Button/Card/Dialog/Table. Shell nhận cấp học hiện tại hoặc neutral, sáng/tối hiện có; không gán màu lên html/root. Dialog portal nằm trong data-app-shell. Mobile 375px, desktop 1280/1440px, touch 44px, giảm chuyển động, focus và nhãn đọc màn hình.

## 4. Nguồn dữ liệu và schema

Nội dung giá/quyền lợi có cấu trúc EN/VI trong DB, frontend đọc public DTO. packages/types chứa schema/DTO, không chứa secret hoặc giá quyết định giao dịch.

Migration mới, không sửa lịch sử migration:
- billing_plans: code, audience, tên/mô tả EN/VI, active, version. Free được suy từ role khi không có quyền trả phí, không tạo checkout hoặc order giá 0.
- billing_prices: id, plan_code, interval month/year, amount_vnd integer, active; phiên bản giá đã bán là bất biến.
- billing_plan_limits: plan_code + metric unique, limit_value integer >= 0, kind monthly/capacity.
- billing_orders: UUID, user_id, price snapshot, purpose, status, idempotency_key + payload hash, expires_at, created_at.
- billing_payment_attempts: order_id, provider, provider_reference unique, status, provider transaction id unique khi có; nhiều attempt không đồng nghĩa nhiều lần cấp gói.
- billing_events: provider + event/transaction fingerprint unique, verification/result metadata tối thiểu; không lưu toàn bộ payload có PII/token.
- billing_subscriptions: một dòng/user, plan_code, paid_through, pending_price_id, renewal_mode, mandate_id nullable, version.
- billing_grants: khoảng quyền lợi do một order đã thanh toán cấp; order_id unique. Dùng để đối soát/refund đúng kỳ, không cắt nhầm quyền từ đơn khác.
- billing_mandates: user_id, provider reference đã bảo vệ, consent_at, consent_version, status; không lưu số thẻ/CVV.
- account_quota_versions: user_id unique, version; khóa và tăng version một lần cho toàn bộ batch set/reset, kể cả khi reset xóa hết override.
- account_quota_overrides: user_id + metric unique, limit_value, expires_at, version, updated_by.
- account_quota_audit: actor_id, target_id, before/after, reason, created_at, bất biến.
- quota_usage: user_id + metric + period_start unique, used, reserved.
- quota_operations: user_id + metric + operation_id unique; request hash, units, state reserved/committed/released, lease expiry.

RLS và grant:
- anon chỉ đọc catalog public qua API, không đọc bảng billing nội bộ.
- authenticated không ghi billing/usage/override/audit, không gọi RPC đặc quyền; cá nhân chỉ đọc bản projection của mình qua backend.
- RPC đặc quyền thu hồi execute từ public/anon/authenticated, chỉ service_role; search_path cố định, kiểm quyền trong API.
- Atomic transaction cho xác nhận trả tiền + cấp gói, giữ/chốt lượt, override + audit. Unique constraints bảo vệ đồng thời.
- Giữ lịch sử thanh toán khi xóa tài khoản: không cascade mù; kế hoạch xóa phải vô hiệu mandate, xử lý đơn đang chờ và ẩn danh dữ liệu phù hợp chính sách được duyệt trước launch.

## 5. Hạn mức: ưu tiên và cách đếm

effective_limit = override còn hiệu lực nếu có, ngược lại limit của gói hiện có (Free khi hết hạn). Override không cấp tính năng chưa mở hoặc role. Override còn hiệu lực tồn tại qua đổi gói; hết hạn áp mặc định ngay khi đọc, không phụ thuộc cron.

Monthly metrics:
- tutor_requests: 10/200 cho học sinh. Một câu trả lời hoàn tất và lưu thành công = 1. Provider lỗi/stream dang dở không trừ; client ngắt kết nối hủy công việc, không phát done thành công. Retry có operation_id không trừ hai lần.
- graded_exam_attempts: 3/30 cho học sinh. Tạo attempt xác thực trước khi lấy đề; chốt một lượt khi kết quả được lưu thành công. Submit lại cùng attempt trả cùng kết quả, không trừ/cộng XP lần hai; bắt đầu lần mới có id mới.
- import_files: 5/100 cho giáo viên. Một tệp hợp lệ được lưu thành công = 1; preview/lỗi/retry cùng import không trừ thêm. Backend phải xác thực source file và import receipt, không tin fileCount do client gửi.
- author_ai_requests: 0/100 cho giáo viên. Một kết quả soạn bài thành công = 1. Tách khỏi dịch tự động hiện có đang đếm ký tự/ngày.

Capacity metrics:
- active_classes 1/10; students_per_class 50/50 theo quyền của chủ lớp.
- active_authored_exams 5/100; đếm cả draft/pending/published chưa archived để không né bằng đổi trạng thái.
- Lưu trữ/reactivate cần kiểm hạn mức trong cùng transaction. Không xóa lớp, bài, đề hay học sinh khi hạ gói.
- Vượt capacity được đọc/xuất/chỉnh nội dung hiện có nhưng không tạo thêm, thêm thành viên hoặc reactivate vượt trần.
- Gói hết hạn hoặc admin hạ mức trong lúc operation đã được giữ lượt: operation được hoàn tất trong lease ban đầu, không cấp reservation mới vượt trần. Audit hiển thị reserved.
- Hạn mức AI vận hành theo ngày và công tắc tắt AI vẫn có hiệu lực; UI thông báo phân biệt hết lượt tháng với giới hạn ngày/tạm ngừng. Override tháng không vượt công tắc tắt toàn cục.
- Không tính usage bằng đếm message có thể xóa. Metering là ledger độc lập, giữ atomic cả giới hạn ngày lẫn tháng.

## 6. API và trust boundaries

Public:
- GET /api/billing/plans
- POST /api/billing/webhooks/payos
- GET /api/billing/webhooks/vnpay
Chỉ thêm đúng các đường dẫn này vào public allowlist authPlugin; callback tự kiểm chữ ký, không mở toàn bộ /api/billing.

Authenticated, chủ tài khoản:
- POST /api/billing/checkout: { priceId, provider: payos|vnpay, idempotencyKey, autoRenew: boolean }. Không nhận amount/userId/role từ client.
- GET /api/billing/orders/:id
- GET /api/billing/me: subscription + usage + effective limits + provider capabilities.
- GET /api/billing/transactions?cursor=...
- POST /api/billing/renewal/cancel, /renewal/resume (resume cần mandate hợp lệ và consent).
- POST /api/billing/plan-change: đổi chu kỳ kỳ sau; role/audience/price kiểm server.

Admin:
- GET /api/admin/accounts/:id/quotas
- PATCH /api/admin/accounts/:id/quotas: { expectedVersion, changes, reason }; changes có set/reset tường minh.
- GET /api/admin/accounts/:id/quota-audit?cursor=...
- GET /api/admin/billing/reconciliation; POST /api/admin/billing/orders/:id/reconcile: truy vấn provider, không nút “đánh dấu đã trả” tùy ý.

Error chung: { code, error, error_en, metric?, used?, reserved?, limit?, resetsAt? }. 401 chưa đăng nhập, 403 thiếu role/ownership, 409 xung đột/idempotency payload khác, 429 hết quota, 503 không kiểm tra được dữ liệu. Không fail-open cấp trả phí.

## 7. QR và thẻ

payOS cho QR; VNPAY hosted checkout cho thẻ. Đây là lựa chọn kỹ thuật đề xuất; cần tài khoản merchant và phương thức được nhà cung cấp bật trước khi mở thật.

- Backend lưu order giá snapshot trước khi gọi provider. Idempotency key gắn user + request hash; tạo link bị timeout thì reconcile reference cũ trước, không tạo thanh toán trùng.
- QR trả tiền thủ công mỗi kỳ. Khi đổi phương thức, tạo attempt theo cùng order; nếu hai attempt đều có tiền, chỉ cấp một grant và đưa khoản dư vào đối soát/hoàn tiền, không bỏ qua tiền đã nhận.
- Callback kiểm signature, merchant, reference, trạng thái, số tiền, currency khi protocol có. Đơn vị tiền được chuẩn hóa trong adapter.
- Return URL chỉ phục vụ UI. IPN/webhook xác minh hoặc query provider server-to-server mới được xác nhận tiền.
- Callback lặp/đến ngược thứ tự không kéo trạng thái paid về failed, không kéo dài gói hai lần.
- Callback đến trễ nhưng provider xác nhận trả đúng hạn vẫn có thể cấp gói; tiền thật đến sau hạn/khác số tiền/đơn đã thay thế vào reconciliation, không tự bỏ hoặc tự cấp.
- Worker reconciliation có khóa DB và idempotency, được gọi bằng scheduler endpoint có service authentication riêng (không JWT học sinh), không dùng setInterval trong Vercel function.
- Không ghi secret, card data, bearer token, checksum key vào log/DB public/frontend. Agent không đọc, copy hoặc in .env. Runtime secret do chủ dự án cấu hình ở backend theo môi trường.

### Tự gia hạn

- Thẻ một lần là phần bắt buộc của bản đầu cùng QR.
- Auto-renew là phần có điều kiện: merchant được bật recurring/token và sandbox xác nhận đủ create/cancel/status/callback. Không suy ra từ PAY một lần.
- Tắt mặc định, consent tường minh về số tiền, kỳ, thời điểm thu và hủy. Dùng provider-managed schedule nếu hợp đồng hỗ trợ.
- Khi cần merchant scheduler: claim duy nhất (subscription_id, renewal_period), truy vấn giao dịch chưa rõ kết quả trước retry; không có charge thứ hai vì timeout.
- Hủy trong khi đang thu được xử lý bằng state/version và đối soát; không báo “đã hủy” trước khi xác nhận.
- Còn quyền đến cuối kỳ đã trả; không charge tiếp sau khi hủy được xác nhận. Nếu kết quả hủy không rõ, UI hiện pending và worker kiểm lại.
- Đổi sang QR dừng mandate tương lai đã xác nhận trước khi khởi tạo kỳ thanh toán QR tiếp theo.

## 8. Điểm nối hiện có và khoảng trống cần xử lý

- backend/src/index.ts đăng ký route Fastify; plugins/auth.ts bảo vệ request.
- routes/tutor.ts đã có /api/tutor/chat, stream + quota ngày, hiện chấp nhận race vượt một lượt: phải thay bằng atomic ledger khi thương mại hóa.
- tutor/settings.ts, routes/aiSettings.ts và routes/translate.ts giữ điều khiển provider/model/giới hạn dịch hiện có; không tạo hệ thống cấu hình AI thứ hai.
- routes/exam.ts chấm thi nhưng cần attempt bền vững/idempotent để tính lượt và lịch sử.
- routes/exams.ts đã có quản lý đề tác giả và review; thêm capacity/archival, không xây lại studio.
- routes/classes.ts có tạo/vào lớp; giao bài thực tế vẫn là dependency trước khi quảng cáo quyền lợi đó.
- routes/examImport.ts có cả /api/authoring/content-import và /api/authoring/exam-import: cần cùng guard. lessonDocument.ts/examWorkbook.ts hiện parse trong browser; không thể coi số file client khai là quota thật.
- Chưa có tính năng AI soạn bài tương ứng 100 lượt/tháng: cần PR riêng để có output xem trước/áp dụng thủ công, không xuất bản tự động.
- Hạn mức nhập file và AI soạn bài là phần xây dựng bổ sung, phải hoàn tất trước bật bán Teacher Pro theo bảng này.
- frontend/features/admin/AdminAccountsPage.tsx, accountsApi.ts; profile/AccountSettings.tsx; components/nav/NavBar.tsx là các điểm UI mở rộng.

## 9. Điều kiện nghiệm thu và mở bán

- TDD có kiểm concurrency DB thật trên database thử nghiệm, không chỉ Supabase mocks.
- Hai provider qua kiểm thử đúng môi trường nhà cung cấp; chưa có xác nhận payOS sandbox thì không mô tả mock là sandbox. Giao dịch tiền thật cần user cho phép riêng.
- Free/paid + expired + override + admin lowering + midnight + disconnect/retry + callback duplication đã kiểm.
- RLS từ anon, user A, user B, admin và service_role đúng giới hạn.
- 375/768/1280/1440px, VI/EN, 4 level themes, sáng/tối, bàn phím và reduced motion.
- Giá/điều khoản đã chốt; AI cost với provider/model đang dùng nằm trong ngân sách; quyền lợi gói đã hoạt động.
- Migration remote, secrets, merchant onboarding và bật production checkout là bước phát hành riêng; PR docs không cấp quyền tự thu tiền hoặc đổi DB thật.
- Chạy npx turbo run typecheck test lint xong mới npx turbo run build. Không Prettier. Nếu package không có lint script thì báo rõ thiếu coverage, không gọi đó là lint pass.
- Mỗi PR thực thi chỉ nhận một phần hoàn chỉnh theo plan; user tự merge.

## 10. Tài liệu provider đã đối chiếu 28/09/2026

- [payOS webhook](https://payos.vn/docs/du-lieu-tra-ve/webhook/): signature và merchant webhook.
- [payOS Node SDK](https://payos.vn/docs/sdks/back-end/node/): tạo payment request và verify webhook.
- [VNPAY PAY](https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html): hosted URL, IPN, return URL, VND nhân 100 trong protocol.
- [VNPAY tài liệu tích hợp](https://sandbox.vnpayment.vn/apis/downloads/): PAY, token và recurring là các bộ tài liệu riêng.

Tài liệu công khai không chứng minh tài khoản SciPal được bật recurring, không thay thế xác nhận thương mại.
