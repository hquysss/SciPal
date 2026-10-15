# Mô phỏng thuật toán: bộ đếm và các mẫu độ phức tạp (Tin học 11, chủ đề F)

> Trạng thái: thiết kế đã được duyệt trong hội thoại; mục "Hiệu ứng" thêm theo yêu cầu "thỏa sức sáng tạo, bùng nổ dữ liệu"; chờ duyệt bản viết trước khi lập kế hoạch.

## Mục tiêu
Tin học 11 định hướng KHMT (Kết nối tri thức), chủ đề 6 / F "Kĩ thuật lập trình", bài 17–31. Tìm kiếm và sắp xếp (bài 19–22) đã có mô phỏng `algorithm-sim`. Đợt này thêm hai thứ:
- **A.** Bộ đếm số lần so sánh và đổi chỗ cho mô phỏng sắp xếp, tìm kiếm có sẵn (bài 19–22).
- **B.** Mô phỏng mới `complexity-sim`: hình động các mẫu vòng lặp và Big-O (bài 24–25).

Ngoài phạm vi: mảng một và hai chiều (bài 17–18), làm mịn dần và mô đun (bài 26–29), thuyết minh giọng nói, bài học mới, mã giả hay đoạn mã trên giao diện.

## A. Bộ đếm cho `algorithm-sim`
- `AlgorithmStep` (`engines/algorithm.ts`) thêm `compares` và `swaps`, tính dồn từ bước đầu đến bước đó. Tìm kiếm tuần tự và nhị phân chỉ có `compares`.
- `algorithm.tsx` hiện hai số này dưới dãy cột, cạnh số bước, có nhãn đầy đủ bằng chữ ("So sánh: 7 · Đổi chỗ: 3").
- Schema `algorithm-sim` và các bài học đã có không đổi.

## B. `complexity-sim`
### Bảy mẫu
| Mẫu | Hình động | Big-O | n tối đa |
|---|---|---|---|
| `direct` Tìm trực tiếp | một ô sáng ngay | O(1) | 32 |
| `halving` Chia đôi liên tục | thanh dài bị cắt đôi mỗi bước | O(log n) | 32 |
| `single-loop` Một lần duyệt | con trỏ chạy qua từng ô | O(n) | 32 |
| `divide-conquer` Chia để trị | các tầng chia đôi, mỗi tầng n việc | O(n log n) | 32 |
| `nested-loop` Hai vòng lặp lồng nhau | lưới n×n sáng dần từng hàng | O(n²) | 32 |
| `branching` Đệ quy rẽ nhánh | cây gọi hàm, mỗi tầng nhân đôi | O(2ⁿ) | 12 |
| `permutations` Hoán vị | các dãy hoán vị lần lượt hiện ra | O(n!) | 8 |

Hai mẫu cuối dừng ở n = 12 và n = 8 (8.191 và 40.320 phép toán) là giới hạn vẽ mượt trên một canvas; vượt đó chỉ còn biểu đồ.

### Engine (`engines/complexity.ts`)
- Hàm thuần `operations(pattern, n)` trả danh sách phép toán theo thứ tự, mỗi phép toán là một ô được "chạm". Số phép toán là độ dài danh sách, không đếm riêng để hai con số luôn khớp.
- Hàm `count(pattern, n)` chỉ trả số phép toán bằng công thức (1, ⌈log₂ n⌉ + 1, n, n·⌈log₂ n⌉, n², 2ⁿ⁺¹ − 1, n!) để biểu đồ không phải dựng danh sách. Test kiểm tra `count` bằng `operations(...).length` cho mọi n được phép.

### Giao diện (`complexity.tsx`)
- Chọn mẫu (nút chọn), thanh kéo n (giới hạn theo mẫu), chạy / dừng / bước trước / bước sau / làm lại như `algorithm-sim`.
- Vùng hình động của mẫu, bộ đếm "Phép toán: k / tổng", nhãn Big-O và một câu giải thích; câu nói thuật toán nào trong bài thuộc mẫu này (ví dụ chia đôi: tìm kiếm nhị phân; hai vòng lặp lồng nhau: sắp xếp nổi bọt, chọn).
- Biểu đồ đường so sánh số phép toán theo n của bảy mẫu, thang logarit, đường của mẫu đang chọn đậm; kèm bảng số liệu cho người đọc màn hình. Màu chỉ dùng token theme, mỗi đường có nhãn chữ trực tiếp, không dựa vào màu.
- Hình động tôn trọng "giảm chuyển động": hiện kết quả cuối ngay, vẫn có bộ đếm.
- Phép toán hiện theo nhịp cố định mỗi bước; mẫu có hàng nghìn phép toán gom nhiều phép toán vào một khung để chạy hết trong tối đa khoảng 10 giây.

### Hiệu ứng và "bùng nổ dữ liệu"
Mục tiêu: học sinh *thấy* O(n) êm ả còn O(2ⁿ), O(n!) nổ tung. Chỉ dùng `transform`/`opacity`/canvas, màu từ token theme, mọi hiệu ứng tắt khi "giảm chuyển động".
- **Cánh đồng phép toán:** mỗi phép toán là một chấm trên canvas. Mẫu nhỏ vẽ ô lớn có chữ; mẫu O(2ⁿ), O(n!) vẽ hàng nghìn chấm tràn dần khỏi khung, tốc độ gom tăng theo cấp số để thấy "bùng nổ", chấm mới sáng rồi dịu thành vệt mờ.
- **Bộ đếm cuộn số** (tabular figures) tăng theo nhịp, đổi sang dạng gọn (8,2 nghìn, 40,3 nghìn) và rung nhẹ khi vượt mốc 1.000 và 10.000; luôn kèm chữ "Phép toán" nên không dựa vào hiệu ứng.
- **Thanh so sánh trực tiếp:** dưới hình động có thanh ngang "phép toán của mẫu này" đặt cạnh "n = cùng cỡ dữ liệu", để thấy khoảng cách; mẫu bùng nổ làm thanh vọt ra ngoài kèm nhãn "×1.200 lần so với O(n)".
- **Biểu đồ sống:** đường của mẫu đang chọn vẽ dần theo n như được kéo ra, chấm đánh dấu n hiện tại chạy theo thanh kéo; vùng "quá 1 triệu phép toán" tô mờ và có nhãn chữ.
- **Chuyển mẫu:** chấm cũ tan ra (fade, 200 ms), mẫu mới dựng lại từ giữa; điều khiển luôn ngắt được giữa chừng.
- **Hiệu năng:** canvas vẽ theo lô trong `requestAnimationFrame`, tối đa ~16 ms mỗi khung; không dựng DOM cho từng chấm. Giảm chuyển động hiện ngay kết quả cuối.

### Cấu hình và đăng ký
- Config: `{ pattern: <mẫu>, n: số nguyên }`, mặc định `single-loop` và 8; `n` bị cắt theo giới hạn của mẫu khi đọc.
- Thêm `'complexity-sim'` vào `SIMULATION_KINDS`, `SIMULATION_CONFIGS` và thông báo lỗi trong `packages/types/src/simulations.ts`, sao y sang schema của backend như các kiểu khác, đăng ký trong `registry.ts`.
- Editor chỉ có hai ô: mẫu mặc định và n mặc định.

## Kiểm thử
- `complexity.test.ts`: `count` bằng độ dài `operations` cho mọi mẫu và n; các giá trị mốc (n² với n = 5 là 25, n! với n = 5 là 120, 2ⁿ⁺¹ − 1 với n = 4 là 31); n vượt giới hạn bị cắt.
- `algorithm`: bộ đếm cuối của nổi bọt trên dãy giảm dần n phần tử là n(n−1)/2 so sánh và n(n−1)/2 đổi chỗ; sắp xếp chèn trên dãy đã sắp có n−1 so sánh, 0 đổi chỗ.
- Test hiển thị: bộ đếm gọn và nhãn "×N lần" đúng với `count`; đổi mẫu và n thì bộ đếm và biểu đồ đổi theo; giảm chuyển động hiện kết quả cuối.
- Typecheck và test các gói `@scipal/types`, `@scipal/web`, `@scipal/api`.
