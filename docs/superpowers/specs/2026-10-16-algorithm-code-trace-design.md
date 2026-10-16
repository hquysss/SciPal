# Mô phỏng thuật toán: thấy dòng code đang chạy (Tin học 11)

> Trạng thái: hướng đã duyệt trong hội thoại ("làm sao cho người ta biết dòng đó chạy tới là được"); chờ duyệt bản viết trước khi lập kế hoạch.

## Mục tiêu
Trong khối `algorithm-sim` của bài Tin (Tin 11 chủ đề 6, Bài 21–27 đã nạp), học sinh nhìn thấy máy đang chạy dòng code nào ở mỗi bước, đồng bộ với hình cột số đang có. Bài đã nạp tự có tính năng này, không nạp lại dữ liệu.

Ngoài phạm vi (dự án con 2, spec riêng): chạy một đoạn code bất kỳ do giáo viên hay học sinh gõ (Pyodide). Không thêm thuật toán mới, không đổi chế độ "Đua 3 cách sắp xếp", không có vệt sáng chạy theo luồng chương trình hay nền tối riêng (khung code dùng token theme).

## Engine (`engines/algorithm.ts`)
- `AlgorithmStep` thêm:
  - `line`: khoá dòng theo nghĩa, ví dụ `'outer' | 'inner' | 'compare' | 'swap' | 'done'` cho nổi bọt; mỗi thuật toán có tập khoá riêng.
  - `vars`: biến lúc đó, ví dụ `{ n: 6, i: 0, j: 2 }`; tìm nhị phân dùng `lo`, `mid`, `hi`.
- Các bước chi tiết hơn hiện nay: thêm bước ở dòng vòng lặp ngoài và trong, để dòng đang chạy đi qua `for` → `if` → đổi chỗ đúng thứ tự máy chạy. Bộ đếm so sánh và đổi chỗ không đổi (bước dòng `for` không cộng gì). Giới hạn 2500 bước giữ nguyên; 32 số nổi bọt khoảng 2000 bước.
- Ghi chú (`note`) giữ như cũ cho bước so sánh và đổi chỗ; bước dòng vòng lặp có ghi chú ngắn ("Vòng lặp: j = 2").

## Code mẫu (`algorithmCode.ts`, mới)
- Mỗi thuật toán có code Python và C++ cùng ý với SGK KNTT và giáo án Tin 11 đã nạp. Mỗi dòng là `{ text, line? }`; dòng có `line` là dòng engine có thể dừng ở đó.
- Hai ngôn ngữ dùng chung một chuỗi bước; đổi tab chỉ đổi cách hiển thị.

## Giao diện (`algorithmCode.tsx`, mới; sửa `algorithm.tsx`)
- Khung code dưới hình cột (điện thoại) hoặc bên phải (≥1024px), tab `Python | C++` (mặc định Python), chữ `--font-mono`, có số dòng. Dòng dài cuộn ngang trong khung, trang không tràn ngang ở 375px.
- **Dòng đang chạy** phải nhận ra ngay, không chỉ bằng màu:
  - dòng **nổi lên và phát sáng**: `transform: translateY(-2px) scale(1.035)` (gốc bên trái), bo góc, nền `--accent` pha đậm, viền 1px `--accent`, đổ bóng sâu cộng quầng sáng `--accent` (box-shadow pha bằng `color-mix`), chữ sáng và đậm hơn; các dòng khác hơi mờ đi;
  - dấu ▶ ở cột số dòng;
  - `aria-current="step"`; vùng ghi chú `aria-live` sẵn có đọc ghi chú bước.
  - Dòng mới nảy lên trong 250 ms (đường cong có nảy nhẹ), dòng cũ hạ xuống; chỉ dùng `transform` và `box-shadow`. Giảm chuyển động thì đổi tức thì, vẫn giữ nền, viền và quầng sáng.
  - Khung code có chừa lề để phần phóng to và quầng sáng không bị cắt.
- Ở dòng `if`, cuối dòng hiện kết quả so sánh: `5 > 2 → True` (C++: `true`), chip `--success` hoặc `--warning` kèm chữ.
- Hàng chip biến dưới khung code: `i = 0`, `j = 2`…; chip vừa đổi giá trị nảy nhẹ (dùng lại `bump` của bộ đếm).
- Nút "Ẩn code / Hiện code" (mặc định hiện) cho lúc chỉ chiếu hình. Chế độ đua không hiện khung code.
- Song ngữ cho mọi nhãn; code và tên biến giữ nguyên.

## Kiểm thử
- Với mỗi thuật toán và vài dãy (ngẫu nhiên, đã sắp, sắp ngược, có trùng, tìm thấy và không thấy): mọi `step.line` có đúng một dòng trong cả Python lẫn C++; `vars.j`/`mid` khớp với `compare` của bước.
- Bộ đếm cuối cùng bằng giá trị trước khi đổi (không đổi kết quả cũ).
- Chạy thật code Python và C++ mẫu (g++ ở `C:\msys64\ucrt64\bin`) trên cùng dãy, so kết quả với engine.
- Test giao diện: dòng có `aria-current` đổi khi bấm bước tiếp; đổi tab giữ nguyên bước; ẩn code ẩn khung.
- `pnpm turbo typecheck`, test `@scipal/web`; xem trên trình duyệt ở 1280px và 375px.
