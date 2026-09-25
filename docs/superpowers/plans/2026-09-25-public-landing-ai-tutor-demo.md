# SciPal Public Landing — Reference-Inspired Upgrade Plan

**Ngày:** 25/09/2026
**Trạng thái:** Bản kế hoạch, chưa triển khai
**Phạm vi:** Chỉ landing page công khai `/` và các component chỉ phục vụ landing.

## 1. Mục tiêu

Nâng trang chủ để học sinh THPT lần đầu ghé SciPal hiểu nhanh sản phẩm, thấy một bài học mẫu, chọn môn và đi vào học. Lấy cấu trúc và sắc xanh mint của mẫu trong `C:\Users\LE CHI AN\Downloads\scipal-web (1)\scipal-web` làm tham khảo, rồi hoàn thiện theo nhận diện và chức năng thật của SciPal.

Đoạn chat AI Tutor trong hero chỉ phát nội dung đã viết sẵn trong giao diện. Nó không gọi AI, không gửi request và không lưu tin nhắn. Nhãn “Hội thoại minh họa” phải luôn hiển thị.

## 2. Căn cứ từ Production và source hiện tại

Production `/` hiện hiển thị hero, hai CTA, ba thẻ lợi ích, năm thẻ môn và khảo sát. Nội dung hero đang nói AI Tutor đồng hành 24/7; cần thay để khớp với khả năng hiện tại. `PROJECT_STATE.md` ghi backend chưa đăng ký `/api/ai/chat`, còn chat trên bài học chưa có luồng hoàn chỉnh.

`frontend/app/page.tsx` hiện ghép các section trực tiếp. `SubjectGrid` đọc trạng thái từ `SUBJECT_CONFIG`: Tin học đang sẵn sàng, bốn môn còn lại đang biên soạn. CTA Tin học hiện đi tới route `/informatics`.

Mẫu tham khảo có navbar màu mint với họa tiết cỏ bốn lá, hero hai cột với chat card, hàng môn học, bốn thẻ lợi ích, ba bước học và footer. Chỉ lấy cảm hứng từ các section của landing; navbar SciPal giữ nguyên hoàn toàn. Mẫu còn mở màn chào bắt buộc chọn cấp học trước khi vào trang. Mẫu cũng dùng nhãn chat “online”, ô nhập giả cùng đánh giá sao; landing mới giữ bố cục trực quan nhưng đổi các chi tiết đó thành trạng thái trung thực, điều khiển dùng được và nội dung có căn cứ.

## 3. Bố cục đề xuất

```text
Navbar SciPal hiện tại (giữ nguyên)
Hero hai cột: thông điệp + CTA | card hội thoại AI Tutor minh họa
Tin học nổi bật → các môn đang biên soạn
4 thẻ tính năng: nội dung song ngữ · bài học Tin học · tự kiểm tra · xem demo AI Tutor
3 bước học: chọn môn → học bài → luyện tập và xem gợi ý
Khảo sát môn tiếp theo
Footer với các đường dẫn đang hoạt động
```

- Navbar ở trên landing giữ nguyên giao diện và hành vi hiện tại; landing bắt đầu bên dưới navbar và tính khoảng cách phù hợp với chiều cao của nó.
- Hero dùng nền xanh lá rất nhạt, tiêu đề lớn có một dòng gradient, mô tả ngắn và CTA chính “Học thử Tin học”; bên phải là card chat. Ở mobile, chữ và CTA đứng trước card.
- Không thêm màn chào hoặc bộ chọn cấp học chặn nội dung. Landing tiếp tục dùng đường vào môn hiện có.
- Card chat trông như một đoạn hội thoại trong sản phẩm, có ngữ cảnh “Tin học · Lớp 11”, avatar và bong bóng hai phía. Nhãn demo đặt ngay trong header card; không dùng đèn xanh hay từ “online” để mô tả AI.
- Giữ nền giấy sáng, lưới khoa học mờ, xanh SciPal, radius mềm và bóng nhẹ. Dùng logo, clover, mascot và font hiện có; màu từng môn lấy từ cấu hình/token của SciPal.
- Các thẻ tính năng và ba bước dùng card sáng, nhiều khoảng trắng, icon/đồ họa gọn; tránh emoji làm nội dung chính và không tạo số liệu, rating hay lời chứng thực.
- Gỡ các khẳng định chưa xác minh như AI “24/7” và mô phỏng tương tác đang hoạt động. Preview bài học cũng mang nhãn “Minh họa”.

## 4. Hành vi đoạn chat mô phỏng

Hiển thị một cuộc hội thoại ngắn về Tin học trong card hero, ví dụ:

- Học sinh: “Vì sao tìm kiếm nhị phân cần dãy đã sắp xếp?”
- Gia sư: “Mỗi bước ta so sánh với phần tử ở giữa. Thứ tự của dãy cho biết có thể bỏ nửa nào; nếu dãy chưa sắp xếp, kết luận đó không còn đúng.”
- Gợi mở: “Nếu phần tử ở giữa nhỏ hơn giá trị cần tìm, em sẽ tìm tiếp ở nửa nào?”

Hành vi:

1. Header card ghi “AI Tutor · Hội thoại minh họa” và chủ đề đang trao đổi; không hiển thị badge “online”.
2. Hiện trước câu hỏi của học sinh và nút “Xem gia sư gợi ý”. Khi nhấn, lần lượt hiện câu trả lời và câu hỏi gợi mở; nút đổi thành “Phát lại”.
3. Không có ô nhập tin nhắn tự do hay nút gửi; không hiển thị trạng thái “đang kết nối” hoặc thời gian chờ. EN/VI đổi cùng `useLanguage()`.
4. Chuyển động ngắn, chỉ chạy theo thao tác người dùng; `prefers-reduced-motion` hiển thị ngay toàn bộ hội thoại. Có thể dùng bàn phím và trình đọc màn hình.

## 5. Các bước triển khai

### Bước 1 — Áp dụng khung landing theo mẫu

- Tạo `frontend/features/landing/` cho Hero, chat demo, phần môn học, tính năng và các bước học.
- Để `frontend/app/page.tsx` làm nhiệm vụ ghép các section.
- Đưa toàn bộ chữ hiển thị và transcript vào dữ liệu có cặp `{ en, vi }`; dùng `useLanguage()` cho component tương tác.

### Bước 2 — Dựng hero và chat card mẫu

- Tạo hero desktop hai cột, CTA đến môn Tin học và anchor xuống phần môn học.
- Dựng chat card theo tỉ lệ/bố cục mẫu; dùng hội thoại binary search song ngữ, có ngữ cảnh môn và lớp.
- Thực hiện phát tiếp/phát lại transcript từ state local; không gắn `useAiChat` hoặc gọi route backend.

### Bước 3 — Làm mới khu vực môn học

- Làm nổi bật Tin học và CTA tới route `/informatics` hiện tại.
- Bốn môn còn lại tiếp tục mang trạng thái “Đang biên soạn” và không mở route chưa sẵn sàng.
- Dùng dữ liệu `SUBJECT_CONFIG` hiện có; không thêm query hoặc thay đổi route môn học trong phạm vi landing.

### Bước 4 — Hoàn thiện thẻ tính năng, ba bước và nội dung thật

- Thêm bốn thẻ tính năng theo nhịp của mẫu, chỉ mô tả phần đã có hoặc ghi rõ demo/đang biên soạn.
- Thêm ba bước ngắn: chọn môn, học nội dung Anh–Việt, luyện câu hỏi.
- Dùng ảnh/chữ minh họa sản phẩm tĩnh, không gắn nút giả cho các mô phỏng chưa chạy.
- Đổi nội dung card Gia sư AI để dẫn vào hội thoại minh họa thay vì nói AI luôn sẵn sàng.
- Giữ lại khảo sát môn tiếp theo hiện có và bổ sung footer với các route đang hoạt động.

### Bước 5 — Hoàn thiện giao diện và nghiệm thu

- Dùng CSS module hoặc class có phạm vi cho landing; không sửa component hay style của navbar.
- Màu nhận diện từng môn lấy từ cấu hình/token trong phạm vi card; không thêm `--accent` lên `:root`.
- Kiểm tra giao diện ở 320, 390, 768, 1024 và 1440 px; rà song ngữ, keyboard/focus, vùng chạm 44 px và reduced motion.
- Kiểm tra CTA Tin học, anchor tới phần môn học, trạng thái môn đang biên soạn và các kích thước responsive.
- Xác nhận chat demo chỉ đổi trạng thái local, không tạo request mạng.

## 6. File dự kiến

- Sửa `frontend/app/page.tsx`.
- Tạo các component và dữ liệu trong `frontend/features/landing/`.
- Điều chỉnh `frontend/features/subjects/SubjectGrid.tsx` về bố cục landing nếu cần; giữ nguyên dữ liệu và route.
- Có thể thêm CSS module riêng trong `frontend/features/landing/`.
- Tái sử dụng ngôn ngữ hiện có qua `useLanguage()`.

## 7. Tiêu chí hoàn thành

- Khách mới hiểu SciPal dành cho học sinh THPT, biết Tin học đang học được và có CTA rõ để vào học.
- CTA Tin học mở route hiện tại; các môn đang biên soạn không dẫn tới trang lỗi.
- Nội dung landing và transcript có đủ VI/EN.
- Chat có nhãn minh họa xuyên suốt; chỉ phát transcript tĩnh và không gọi backend/AI.
- Hero, CTA, subject cards và chat dùng được trên mobile lẫn desktop, không tràn ngang; keyboard/focus và reduced motion hoạt động.
- Navbar giữ nguyên; thay đổi chỉ nằm ở landing `/` và component chuyên biệt được landing sử dụng. Không đổi login, route môn học, backend hoặc dữ liệu tiến trình người học.

**Ghi chú:** Đây là plan triển khai, chưa sửa giao diện sản phẩm và chưa chạy kiểm tra mã.
