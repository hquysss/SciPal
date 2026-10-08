# UI/UX Redesign Agent Instructions & Rules

Tài liệu này quy định mục tiêu, checklist chuẩn bị và quy trình thực thi 6 bước bắt buộc khi Agent tiến hành tái thiết kế (redesign) hoặc cải tiến giao diện người dùng (UI/UX) trên SciPal.

---

## 🎯 Mục tiêu và Nguyên tắc cốt lõi

- **Mục đích:** Tái thiết kế giao diện nhằm làm mới hệ thống phân cấp thị giác, cải thiện khả năng sử dụng và tăng cường thông điệp sản phẩm. Các tinh chỉnh nhỏ và hiệu ứng chuyển động chỉn chu sẽ nâng cao chất lượng cảm nhận và mức độ tương tác của người dùng.
- **Nguyên tắc vàng:** Mọi thay đổi về mặt thị giác đều phải lấy người dùng làm trung tâm, phục vụ trực tiếp cho một tác vụ hoặc làm rõ nội dung.
- **Ràng buộc hệ thống SciPal:**
  - Tuyệt đối tuân thủ quy tắc token ngữ nghĩa (`palettes.ts`), không hard-code mã màu hay dùng màu Tailwind thô (`02-domain-rules.md`).
  - Đảm bảo tính nhất quán song ngữ EN/VI (`useLanguage`).
  - Hỗ trợ đầy đủ `prefers-reduced-motion` và tương thích khả năng truy cập (a11y).

---

## 📋 Giai đoạn 1: Checklist chuẩn bị (Pre-Redesign Checklist)

Trước khi tiến hành sửa đổi, Agent bắt buộc phải thực hiện đủ 3 bước kiểm tra:

1. **Xác định vấn đề (Define the problem):** Ghi chép chi tiết các lỗi về khả năng sử dụng, luồng người dùng chưa rõ ràng hoặc sự thiếu nhất quán về mặt thị giác.
2. **Thu thập mẫu tham chiếu (Gather examples):** Tìm kiếm và đối chiếu các mẫu thiết kế web hiện đại cùng phương án hiệu ứng chuyển động phù hợp.
3. **Thiết lập mục tiêu (Set goals):** Tập trung vào việc tăng độ rõ ràng, giảm ma sát/trở ngại thao tác và nâng cao tính thẩm mỹ.

---

## ⚙️ Giai đoạn 2: Quy trình thực thi 6 bước (Core Redesign Steps)

### Bước 1: Kiểm tra giao diện hiện tại (Audit Existing UI)
- **Hành động:** Rà soát toàn bộ màn hình để phát hiện khoảng cách không đồng nhất, xung đột màu sắc, nút kêu gọi hành động (CTA) thiếu rõ ràng và yếu tố dư thừa.
- **Đầu ra:** Báo cáo ghi nhận những điểm gây khó hiểu cho người dùng và các chi tiết cần đơn giản hóa.

### Bước 2: Tái cấu trúc phân cấp thông tin (Rework Information Hierarchy)
- **Hành động:** Sắp xếp nội dung theo độ ưu tiên:
  - Làm nổi bật các hành động chính (primary actions).
  - Giảm bớt sự chú ý của các hành động phụ (secondary actions).
  - Điều hướng sự chú ý bằng cách kết hợp kích thước, màu sắc và vị trí đặt.

### Bước 3: Làm mới yếu tố thị giác (Refresh Visuals)
- **Hành động:**
  - Lựa chọn bảng màu đồng nhất, kiểu chữ dễ đọc và hệ thống khoảng cách nhất quán (bám sát Semantic Tokens trong `packages/ui`).
  - Thay thế các đường viền dày hoặc nền nhiễu bằng các bề mặt sạch sẽ, tối giản để tối ưu sự tập trung.

### Bước 4: Tối ưu hóa tương tác và trạng thái (Improve Interactions and States)
- **Hành động:** Thiết kế rõ ràng các trạng thái hover (di chuột), focus (tiêu điểm), active (nhấn giữ) và disabled (vô hiệu hóa).
- **Yêu cầu:** Đảm bảo nút bấm và ô nhập liệu giao tiếp rõ khả năng tương tác (affordance) và phản hồi đúng như dự đoán (đáp ứng a11y: focus ring rõ ràng, kích thước bấm tối thiểu 44px).

### Bước 5: Bổ sung hiệu ứng chuyển động có mục đích (Add Purposeful Animation)
- **Hành động:** Tận dụng chuyển động nhẹ nhàng để củng cố hệ thống phân cấp và cung cấp phản hồi:
  - Sử dụng vi tương tác (micro-interactions) cho các nút bấm.
  - Chuyển cảnh mượt mà giữa các trạng thái.
  - Áp dụng hiệu ứng xuất hiện phân lớp (staggered entrance animations) cho danh sách.
- **Ràng buộc:** Giữ hiệu ứng chuyển động **ngắn gọn và có ý nghĩa** để tránh gây xao nhãng cho người dùng. Bắt buộc tương thích chế độ giảm chuyển động (`prefers-reduced-motion: reduce`).

### Bước 6: Kiểm thử và lặp lại (Test and Iterate)
- **Hành động:** Đánh giá các thay đổi bằng kiểm thử khả năng sử dụng nhanh hoặc so sánh trước/sau (A/B testing / trước & sau redesign).
- **Sửa lỗi:** Khắc phục ngay bất kỳ điểm nào gây nhầm lẫn hoặc làm chậm tiến độ thực hiện tác vụ của người dùng.
- **Xác thực:** Chạy kiểm thử tự động (`pnpm turbo typecheck`, `pnpm turbo test`) để đảm bảo không phát sinh lỗi hay regression.
