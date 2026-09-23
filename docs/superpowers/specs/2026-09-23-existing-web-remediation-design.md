# SciPal — Nâng cấp web hiện có theo khảo sát 23/09/2026

Trạng thái: Bản thiết kế và kế hoạch để review theo yêu cầu “plan mấy cái vấn đề nãy mới tìm thấy”; chưa phải chấp thuận triển khai.

## Mục tiêu đã được người dùng xác định

Rà và nâng cấp cả giao diện, frontend và backend. Giữ web hiện có, chỉ sửa lỗi/nối phần còn thiếu; không làm lại toàn bộ. Bản shell HTML là hướng sản phẩm dài hạn, không là mệnh lệnh thay toàn bộ layout hoặc palette.

## Giữ lại

Kiến trúc Next.js + Fastify + Supabase, monorepo, route động môn/bài, dữ liệu blocks, renderer lý thuyết/code/công thức, UI lớp/editor/exam hiện có, nhận diện xanh, bố cục và hiệu ứng login. Tái sử dụng shared packages, không nâng stack/dependency trong đợt này.

## Các phát hiện làm đầu vào

1. Handler lớp học thiếu role/ownership checks; handler authoring cho qua khi profile không tồn tại. Đã tái hiện bằng Fastify injection với fixture, chưa chứng minh truy cập dữ liệu thật production.
2. Migration RLS dùng policy không giới hạn command cho thành tích; cần kiểm tra grants thực tế và chặn ghi trực tiếp/đọc đáp án. Chưa xác minh deployment database.
3. Mutation và query có fallback demo/success khi lỗi; khảo sát không có DB vẫn201. Đã tái hiện survey bằng fixture; các nhánh UI được xác nhận qua code.
4. Frontend gọi GET classes/lesson chưa có route backend tương ứng và thiếu token ở một số query; role profile không thống nhất metadata.
5. Trình duyệt tái hiện hydration mismatch khi EN đã lưu; nhiều header/CTA vẫn VI khi chọn EN.
6. Chấm thi dùng số câu client gửi làm mẫu số và không ràng buộc blueprint/lượt thi. Fixture một câu đúng với blueprint không tồn tại trả10/10, xp0.
7. Quiz/interactive placeholder; resource URL cố định; hoàn thành bài ghi score100/XP100 chưa chấm quiz và chưa có transaction progress/XP/streak.
8. AI panel tồn tại nhưng route backend chưa đăng ký; thiếu token thật và parser SSE chuẩn.
9. Màu/provider lặp, root accent, active navigation/bộ lọc/nhãn kỹ thuật cần tinh chỉnh. Những vấn đề này không đòi hỏi đổi toàn bộ giao diện.

## Thiết kế khắc phục

Sửa theo luồng hiện có: guard API deny-by-default và policy DB → kết quả thật và API contracts → hydration → exam attempts/quiz completion → AI route → UI. Chỉ server quyết định quyền, điểm, XP. Các thao tác liên quan nhiều bảng thành tích dùng transaction Postgres; chỉ backend được gọi function ghi. Frontend trình bày loading/empty/error/success phân biệt và giữ form khi lỗi.

Role lấy từ app_metadata đã được Supabase xác minh. Roster thuộc teacher-owner/admin; teacher có quyền biên soạn chung vì schema chưa có owner bài. Bài công khai chỉ published, answer keys chỉ phía server.

Chấm luyện tập đề xuất: mỗi câu trọng số đều; true/false đúng đủ ý; short answer so đáp án chuẩn hóa exact. Không quảng bá đây là quy chế thi tốt nghiệp. Lượt thi server có hạn giờ, owner, snapshot và kết quả idempotent. XP thi chỉ lần hoàn thành đầu/user/blueprint; bài hoàn thành đủ quiz vẫn giữ mốc100 XP lần đầu, bài không quiz score=null. Đây là các quyết định cần review, không phải chính sách đã triển khai.

Ngôn ngữ sửa ở hook shared giữ contract, server/client initial render giống nhau; đọc preference sau mount. UI nâng cấp tại chỗ, giữ navbar xanh/hiệu ứng login, không bắt buộc palette mới. Dữ liệu và filter dùng query có thể reload/back; không bịa content khi empty/error.

AI dùng provider hiện có, server lấy ngữ cảnh an toàn, SSE có schema thống nhất, token thật, timeout/cancel và chặn trong lượt thi còn hạn. Mô phỏng chưa làm thì hiển thị chưa hỗ trợ, không tạo mini-app mới trong đợt sửa lỗi.

## Ngoài phạm vi

Redesign toàn bộ, thay framework, thay monorepo, app mobile mới, voice, mô phỏng mới, mở môn, tổ hợp thi, deployment production và áp migration vào database đang dùng. Không sửa/xóa dữ liệu học sinh thật để kiểm thử.

## Kiểm chứng

Regression tests bám các lỗi đã tái hiện; DB test riêng cho RLS/transaction/concurrency; browser QA cho EN reload, menu, login và flow học/thi. Báo cáo tách fixture/local/DB thật/provider thật. Chỉ sửa source docs/plan ở lượt lập kế hoạch; không báo lỗi sản phẩm đã được sửa.

Kế hoạch thực thi: `../plans/2026-09-23-existing-web-remediation.md`.
