# Mô phỏng thuật toán: bộ đếm và các mẫu độ phức tạp (Tin học 11, chủ đề F)

> Trạng thái: thiết kế đã được duyệt trong hội thoại, chờ duyệt bản viết trước khi lập kế hoạch.

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
| `branching` Đệ quy rẽ nhánh | cây gọi hàm, mỗi tầng nhân đôi | O(2ⁿ) | 10 |
| `permutations` Hoán vị | các dãy hoán vị lần lượt hiện ra | O(n!) | 7 |

Hai mẫu cuối dừng ở n = 10 và n = 7 vì tới 1.024 và 5.040 phép toán là giới hạn vẽ được từng bước.

### Engine (`engines/complexity.ts`)
- Hàm thuần `operations(pattern, n)` trả danh sách phép toán theo thứ tự, mỗi phép toán là một ô được "chạm". Số phép toán là độ dài danh sách, không đếm riêng để hai con số luôn khớp.
- Hàm `count(pattern, n)` chỉ trả số phép toán bằng công thức (1, ⌈log₂ n⌉ + 1, n, n·⌈log₂ n⌉, n², 2ⁿ⁺¹ − 1, n!) để biểu đồ không phải dựng danh sách. Test kiểm tra `count` bằng `operations(...).length` cho mọi n được phép.

### Giao diện (`complexity.tsx`)
- Chọn mẫu (nút chọn), thanh kéo n (giới hạn theo mẫu), chạy / dừng / bước trước / bước sau / làm lại như `algorithm-sim`.
- Vùng hình động của mẫu, bộ đếm "Phép toán: k / tổng", nhãn Big-O và một câu giải thích; câu nói thuật toán nào trong bài thuộc mẫu này (ví dụ chia đôi: tìm kiếm nhị phân; hai vòng lặp lồng nhau: sắp xếp nổi bọt, chọn).
- Biểu đồ đường so sánh số phép toán theo n của bảy mẫu, thang logarit, đường của mẫu đang chọn đậm; kèm bảng số liệu cho người đọc màn hình. Màu chỉ dùng token theme, mỗi đường có nhãn chữ trực tiếp, không dựa vào màu.
- Hình động tôn trọng "giảm chuyển động": hiện kết quả cuối ngay, vẫn có bộ đếm.
- Phép toán hiện theo nhịp cố định mỗi bước; mẫu có hàng nghìn phép toán gom nhiều phép toán vào một khung để chạy hết trong tối đa khoảng 10 giây.

### Cấu hình và đăng ký
- Config: `{ pattern: <mẫu>, n: số nguyên }`, mặc định `single-loop` và 8; `n` bị cắt theo giới hạn của mẫu khi đọc.
- Thêm `'complexity-sim'` vào `SIMULATION_KINDS`, `SIMULATION_CONFIGS` và thông báo lỗi trong `packages/types/src/simulations.ts`, sao y sang schema của backend như các kiểu khác, đăng ký trong `registry.ts`.
- Editor chỉ có hai ô: mẫu mặc định và n mặc định.

## Kiểm thử
- `complexity.test.ts`: `count` bằng độ dài `operations` cho mọi mẫu và n; các giá trị mốc (n² với n = 5 là 25, n! với n = 5 là 120, 2ⁿ⁺¹ − 1 với n = 4 là 31); n vượt giới hạn bị cắt.
- `algorithm`: bộ đếm cuối của nổi bọt trên dãy giảm dần n phần tử là n(n−1)/2 so sánh và n(n−1)/2 đổi chỗ; sắp xếp chèn trên dãy đã sắp có n−1 so sánh, 0 đổi chỗ.
- Test hiển thị: đổi mẫu và n thì bộ đếm và biểu đồ đổi theo; giảm chuyển động hiện kết quả cuối.
- Typecheck và test các gói `@scipal/types`, `@scipal/web`, `@scipal/api`.
