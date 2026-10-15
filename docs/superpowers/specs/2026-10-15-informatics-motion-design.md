# Nâng cấp chuyển động cho mô phỏng Tin học (`algorithm-sim`, `complexity-sim`)

> Trạng thái: chờ duyệt bản viết. Yêu cầu: "nâng cấp mô phỏng tin, nhất là giao diện hiệu ứng phải wow cho học sinh trực quan, thỏa sức sáng tạo". Nối tiếp [spec độ phức tạp](2026-10-15-algorithm-complexity-design.md).

## Mục tiêu
Học sinh nhìn là hiểu: phần tử *di chuyển thật* khi đổi chỗ, phép so sánh hiện thành dấu > < =, và "bùng nổ dữ liệu" của O(2ⁿ), O(n!) đổi thành thời gian đời thường. Không mã giả, không đổi schema, bài học có sẵn chạy y như cũ.

Ngoài phạm vi: 3D (khó đọc, nặng trên điện thoại), âm thanh, kiểu mô phỏng mới, thư viện chuyển động mới.

## Ngôn ngữ chuyển động (dùng chung)
- **Tính cách:** vui vừa phải. Thứ xuất hiện thì nảy nhẹ (ease-out-back, vượt khoảng 10%), thứ di chuyển đi theo cung tròn, thứ đang trên màn hình dùng ease-in-out.
- **Ba thời lượng:** nhanh 140 ms (phản hồi), chuẩn 280 ms (nhấc lên, đổi chỗ), chậm 520 ms (về đích). Co lại theo tốc độ chạy.
- **Ba lớp:** chính (phần tử đang xử lý), phụ (bóng, chip so sánh, bộ đếm nảy), nền (vệt sáng mờ dần của phép toán vừa làm). Mỗi lúc chỉ 1–2 thứ chuyển động mạnh.
- **Tiết chế:** glow chỉ ở phần tử vừa xử lý và khoảnh khắc tìm thấy; không gradient, không lưới nền, không emoji; màu chỉ từ token (`--accent`, `--success`, `--warning`, `--action`, `--line`, `--ink`).
- **Kỹ thuật:** chỉ `transform`/`opacity` trên DOM và vẽ canvas; Web Animations API có sẵn trong trình duyệt.
- **Giảm chuyển động:** không bay, không nảy, không rung; mỗi bước hiện ngay trạng thái cuối. `useReducedMotion` chuyển sang file dùng chung `motion.ts`.

## A. `algorithm-sim`: sân khấu thuật toán
- **Mỗi số là một khối có danh tính.** Engine thêm `ids` vào mỗi bước (hoán vị cùng `values`). Khối đặt theo vị trí bằng `translateX`, nên khi đổi chỗ hai khối **bay qua nhau theo hai cung** rồi chạm đất hơi nén. Số in trên khối, đọc được trên điện thoại.
- **So sánh:** hai khối nổi lên 10 px có bóng; giữa chúng hiện chip "5 > 2 · đổi chỗ" hoặc "2 < 9 · giữ nguyên". Tìm kiếm hiện "7 = 7" hoặc "7 ≠ 3".
- **Sắp xếp chọn:** ghim "nhỏ nhất" nhảy sang khối nhỏ nhất mới. **Sắp xếp chèn:** khối đang chèn được nhấc lên, trượt sang trái từng ô, các khối lớn hơn dịch phải bên dưới.
- **Vùng đã xếp:** khối vào chỗ thì "khóa" lại (nảy nhẹ, đổi màu success), gạch chân dài dần theo vùng đã xếp.
- **Về đích:** sóng nhảy từ trái sang phải (mỗi khối trễ khoảng 20 ms, tổng dưới 500 ms), rồi thẻ tổng kết trượt lên: "Xong: 15 phép so sánh, 9 lần đổi chỗ với 6 số."
- **Tìm tuần tự:** khung kính lúp trượt qua từng khối. **Tìm nhị phân:** nửa bị loại chìm xuống và mờ đi, hai ngoặc [ ] co vào, mũi tên "giữa" chỉ phần tử giữa. Tìm thấy: hai vòng sóng tỏa ra từ khối. Không thấy: khung rung nhẹ hai lần.
- **Bộ đếm:** hai chip "So sánh" và "Đổi chỗ" nảy nhẹ mỗi lần tăng.
- **Tốc độ:** nút chọn Chậm / Vừa / Nhanh (1100 / 650 / 220 ms mỗi bước).
- **Đua 3 cách sắp xếp** (chỉ khi đang xem một thuật toán sắp xếp): nút "Đua" chia ba làn Nổi bọt / Chọn / Chèn trên cùng dãy số, một nút chạy chung, mỗi nhịp mỗi làn đi một bước. Làn về đích hiện hạng 1–2–3 kèm số so sánh và đổi chỗ. Học sinh thấy ngay: dãy gần đúng thứ tự thì sắp xếp chèn về nhất.

## B. `complexity-sim`: bùng nổ dữ liệu
- **Đồng hồ số cuộn:** bộ đếm hiện đủ chữ số có phân cách (40.320), từng cột số cuộn như công tơ mét; dạng gọn (40,3 nghìn) ở dòng nhỏ bên dưới. Vượt 1.000 và 10.000 thì một vòng sóng tỏa ra từ bộ đếm và khung hình động giật nhẹ một nhịp. Trình đọc màn hình vẫn đọc dạng chữ.
- **Cánh đồng phép toán sống theo từng mẫu** (canvas, ô vừa sáng nảy lên):
  - O(1), O(n): ô lớn có số thứ tự, con trỏ trượt qua từng ô.
  - O(n²): dải sáng theo hàng (vòng ngoài) và con trỏ chạy trong hàng (vòng trong); dòng chữ dưới khung "Vòng ngoài i = 3 · vòng trong j = 5".
  - O(log n): các hàng ngắn dần như cũ, nhưng mỗi lần cắt thì nửa bị bỏ rơi xuống, nghiêng và mờ đi.
  - O(n log n): mỗi tầng chia thành 2ᵏ đoạn có khe hở, quét sáng từng tầng.
  - O(2ⁿ): cạnh mọc từ cha xuống con; đường gọi hiện tại (gốc đến nút đang chạy) sáng đậm như chồng lời gọi; dòng chữ "Độ sâu: 5".
  - O(n!): hàng ô số 1…n trên khung đổi chỗ thật cho từng hoán vị khi chạy chậm, khi nhanh thì nhấp nháy theo; cánh đồng tràn chấm.
  - Tia lửa nhỏ bắn ra từ phép toán mới nhất (tối đa khoảng 150 hạt cùng lúc, mỗi hạt khoảng 300 ms).
- **"Máy tính cần bao lâu?":** thẻ đổi số phép toán của mẫu đang chọn ra thời gian, với máy làm 1 tỉ phép toán mỗi giây, cho n = 10, 20, 50, 100, kèm mốc đời thường: nhanh hơn một cái chớp mắt, lâu hơn một đời người, lâu hơn tuổi Trái Đất, lâu hơn tuổi vũ trụ. Ô vượt tuổi vũ trụ được nhấn mạnh; các ô lật vào lần lượt khi đổi mẫu. Ví dụ: O(n!) với n = 20 mất khoảng 77 năm; O(n²) với n = 100 mất 10 micro giây.
- **Biểu đồ:** đường của mẫu đang chọn vượt khỏi khung (trên 10¹²) thì có mũi tên "vượt khỏi biểu đồ" ở mép trên.

## Kiểm thử
- Engine: ở mọi bước, `ids` là một hoán vị của 0…n−1 và `values[k]` bằng giá trị gốc của `ids[k]` (tìm nhị phân: theo dãy đã sắp).
- Hàm thuần đổi thời gian: các mốc (n! với n = 20 khoảng 77 năm; mốc chớp mắt, đời người, tuổi vũ trụ).
- View: chip so sánh đúng dấu; đổi tốc độ; chế độ đua có 3 làn và xếp hạng đúng theo số bước; giảm chuyển động không gọi `animate`; đồng hồ số vẫn có chữ cho trình đọc màn hình.
- Gộp luôn ba mục dở dang từ lần review trước: ô lớn có số, `useReducedMotion` dùng chung, test chạy đến hết và n = 1.
- Typecheck, test `@scipal/web`, xem trên trình duyệt ở 375 px, giao diện sáng và tối.
