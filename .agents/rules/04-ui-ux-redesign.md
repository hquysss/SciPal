# 🤖 Agent System Rules: UI/UX Redesign & Design Directives

Tài liệu này quy định mục tiêu, nguyên tắc cốt lõi, checklist chuẩn bị và quy trình thực thi 6 bước bắt buộc khi Agent tiến hành tái thiết kế (redesign) hoặc cải tiến giao diện người dùng (UI/UX) trên SciPal.

---

## 1. Nguyên tắc cốt lõi (Core Directives)

- **Mục đích Redesign:** Tái thiết kế giao diện giúp làm mới hệ thống phân cấp thị giác (*visual hierarchy*), nâng cao khả năng sử dụng (*usability*) và củng cố thông điệp của sản phẩm.
- **Tạo giá trị qua chi tiết:** Các tinh chỉnh nhỏ về UI và chuyển động (*animation*) chỉn chu giúp cải thiện đáng kể chất lượng cảm nhận và mức độ tương tác của người dùng.
- **Lấy người dùng làm trung tâm:** Mọi thay đổi về mặt thị giác đều phải hỗ trợ cho một tác vụ cụ thể hoặc làm rõ nội dung.
- **Nâng cao kỹ năng:** Áp dụng các mẹo thiết kế cốt lõi để tối ưu trải nghiệm thiết kế UI/UX và đáp ứng tiêu chuẩn sản phẩm cao nhất.
- **Ràng buộc hệ thống SciPal:**
  - Tuyệt đối tuân thủ quy tắc token ngữ nghĩa (`palettes.ts`), không hard-code mã màu hay dùng màu Tailwind thô (`02-domain-rules.md`).
  - Đảm bảo tính nhất quán song ngữ EN/VI (`useLanguage`).
  - Bắt buộc hỗ trợ `prefers-reduced-motion` và tuân thủ các chuẩn khả năng truy cập (a11y).

---

## 2. Checklist chuẩn bị trước khi Redesign (Pre-Redesign Checklist)

Trước khi tiến hành sửa đổi giao diện, Agent bắt buộc phải hoàn thành 3 bước chuẩn bị:

1. **Xác định vấn đề (Define the problem):** Ghi nhận các lỗi về khả năng sử dụng, luồng người dùng (*user flow*) chưa rõ ràng hoặc sự thiếu nhất quán về mặt thị giác.
2. **Thu thập mẫu tham chiếu (Gather examples):** Tham khảo các mẫu thiết kế web hiện đại và các phương án hiệu ứng chuyển động phù hợp.
3. **Thiết lập mục tiêu (Set goals):** Tập trung nâng cao độ rõ ràng, giảm ma sát/trở ngại thao tác và tăng tính thẩm mỹ.

---

## 3. Quy trình 6 bước thực thi Redesign cốt lõi (Core Redesign Steps)

### Bước 1: Kiểm tra giao diện hiện tại (Audit Existing UI)
- **Hành động:** Rà soát các màn hình để phát hiện khoảng cách không đều, xung đột màu sắc, nút kêu gọi hành động (CTA) thiếu rõ ràng và yếu tố dư thừa.
- **Đầu ra:** Ghi chép lại những chi tiết gây khó hiểu cho người dùng và các thành phần có thể đơn giản hóa.

### Bước 2: Tái cấu trúc phân cấp thông tin (Rework Information Hierarchy)
- **Hành động:** Sắp xếp nội dung theo độ ưu tiên:
  - Làm nổi bật các hành động chính (*primary actions*).
  - Làm dịu các hành động phụ (*secondary actions*).
  - Sử dụng kích thước, màu sắc và vị trí đặt để định hướng sự chú ý của người dùng.

### Bước 3: Làm mới yếu tố thị giác (Refresh Visuals)
- **Hành động:**
  - Lựa chọn bảng màu đồng nhất, kiểu chữ dễ đọc và hệ thống khoảng cách nhất quán (bám sát Semantic Tokens trong `packages/ui`).
  - Thay thế đường viền dày hoặc hình nền gây nhiễu bằng bề mặt sạch sẽ, tối giản để tối ưu sự tập trung.

### Bước 4: Tối ưu hóa tương tác và trạng thái (Improve Interactions and States)
- **Hành động:** Thiết kế rõ ràng các trạng thái di chuột (*hover*), tiêu điểm (*focus*), kích hoạt (*active*) và vô hiệu hóa (*disabled*).
- **Yêu cầu:** Đảm bảo nút bấm và ô nhập liệu truyền tải rõ khả năng tương tác (*affordance*) và phản hồi đúng dự đoán (chuẩn a11y: focus ring rõ ràng, min tap target 44px).

### Bước 5: Bổ sung hiệu ứng chuyển động có mục đích (Add Purposeful Animation)
- **Hành động:** Tận dụng chuyển động nhẹ nhàng để củng cố hệ thống phân cấp và cung cấp phản hồi:
  - Vi tương tác (*micro-interactions*) cho các nút bấm.
  - Chuyển cảnh mượt mà giữa các trạng thái.
  - Hiệu ứng xuất hiện phân lớp (*staggered entrance animations*) cho danh sách.
- **Ràng buộc:** Giữ hiệu ứng chuyển động **ngắn gọn và có ý nghĩa** để tránh gây xao nhãng cho người dùng. Bắt buộc hỗ trợ chế độ giảm chuyển động (`prefers-reduced-motion: reduce`).

### Bước 6: Kiểm thử và lặp lại (Test and Iterate)
- **Hành động:** Đánh giá hiệu quả thay đổi bằng kiểm thử khả năng sử dụng nhanh hoặc so sánh A/B (trước & sau redesign).
- **Sửa lỗi:** Khắc phục ngay bất kỳ điểm nào gây nhầm lẫn hoặc làm chậm tiến độ thực hiện tác vụ của người dùng.
- **Xác thực tự động:** Chạy kiểm tra kiểu dữ liệu (`pnpm turbo typecheck`) và bộ kiểm thử (`pnpm turbo test`) để đảm bảo không có regression.
