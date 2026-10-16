# Khung code và dòng đang chạy (Tin học 11)

> Trạng thái: hướng đã duyệt trong hội thoại (bản mẫu `.tmp/code-sim-mock.html` cho khung code, `.tmp/code-sim-mock-light.html` cho màu phần còn lại); chờ duyệt bản viết trước khi lập kế hoạch. Spec Tin 10 (`code-trace`) và Tin 12 (`web-preview`) dùng lại khung code ở đây.

## Mục tiêu
1. Một **khung code** chung, nền tối kiểu trình soạn thảo, tô màu cú pháp, có số dòng và tab ngôn ngữ. Khung này thay Monaco trong khối `code` của bài học, nên mọi bài Tin (Tin 11 Bài 21–27 đã nạp) hiện code giống bản mẫu mà không nạp lại dữ liệu.
2. Trong khối `algorithm-sim`, khung code đứng cạnh hình cột: **chữ của dòng đang chạy nổi lên và phát sáng**, đồng bộ với từng bước.

Ngoài phạm vi: chạy code bất kỳ trên trình duyệt (Pyodide), thuật toán mới, đổi chế độ "Đua 3 cách sắp xếp", vệt sáng chạy theo luồng chương trình.

## 1. Khung code (`frontend/components/code/`)
### `highlight.ts`
- Bộ tách từ nhỏ, thuần, không thư viện: Python, C++, JavaScript, HTML, CSS. Loại token: từ khoá, hàm/thẻ, chuỗi, số, chú thích, toán tử, chữ thường. Một dòng nguồn → một dòng token, để giữ số dòng.
- Không cần đúng như trình biên dịch; chỉ cần tô đúng các mẫu trong SGK. Test bằng các đoạn code của Tin 11 Bài 21–27.

### `CodePanel.tsx`
- Props: `tabs: { lang, code }[]`, `activeLine?: number` (theo tab đang chọn), `lineExtra?: ReactNode` (chip kết quả gắn cuối dòng đang chạy), `children` (hàng chip biến hoặc khung màn hình ở đáy), `tab`/`onTab` khi bên ngoài cần giữ tab.
- Nền tối ở cả hai chế độ, lấy từ token: chế độ sáng `color-mix(in oklch, var(--ink) 92%, black)`, chế độ tối `var(--surface-sunken)`; chữ thường sáng tương ứng. Cách chọn chế độ dùng `useShellDark` sẵn có.
- Màu cú pháp pha từ token với trắng để đọc rõ trên nền tối: từ khoá `--sky`, hàm/thẻ `--accent`, số `--coral`, chuỗi `--sun`, chú thích `--ink-muted` mờ. Kiểm tra tương phản ≥ 4.5:1 cho cả ba cấp học và hai chế độ (test tính tương phản từ `THEME_PALETTES`).
- Tab ngôn ngữ dạng viên thuốc: tab chọn có viền và nền `--accent` pha mờ. Số dòng mờ ở cột trái. Chữ `--font-mono` 14px, dòng cao 32px. Dòng dài cuộn ngang trong khung; trang không tràn ngang ở 375px.
- **Dòng đang chạy** (`activeLine`):
  - chữ của dòng nổi lên và phát sáng, không có khung hay nền: `transform: translateY(-3px) scale(1.07)` (gốc trái), đậm, chữ trắng, `text-shadow` gồm quầng sáng `--accent` và bóng đổ bên dưới; các dòng khác mờ còn khoảng 60%;
  - số dòng đổi màu `--accent` kèm dấu ▶; dòng có `aria-current="step"`;
  - dòng mới nảy lên trong 280 ms (đường cong có nảy nhẹ), chỉ dùng `transform`, `opacity`, `text-shadow`; giảm chuyển động thì đổi tức thì, vẫn giữ chữ sáng và đậm;
  - khung chừa lề trên và phải để chữ phóng to và quầng sáng không bị cắt.
- Không có `activeLine` thì khung chỉ để đọc, mọi dòng rõ như nhau.

### Khối `code` của bài học
- `CodeRenderer` dùng `CodePanel` thay Monaco: nhẹ hơn nhiều, hiện ngay khi tải, giống bản mẫu. Bỏ phụ thuộc `@monaco-editor/react` (chỉ `CodeRenderer` dùng).
- Thêm nút sao chép code (có nhãn song ngữ, báo "Đã chép" qua `aria-live`).

## 2. `algorithm-sim` thấy dòng đang chạy
### Engine (`engines/algorithm.ts`)
- `AlgorithmStep` thêm `line` (khoá dòng theo nghĩa, ví dụ `'outer' | 'inner' | 'compare' | 'swap' | 'done'`) và `vars` (ví dụ `{ n: 6, i: 0, j: 2 }`; tìm nhị phân dùng `lo`, `mid`, `hi`).
- Thêm bước ở dòng vòng lặp ngoài và trong, để dòng sáng đi qua `for` → `if` → đổi chỗ đúng thứ tự máy chạy. Bộ đếm so sánh và đổi chỗ không đổi. Giới hạn 2500 bước giữ nguyên (32 số nổi bọt khoảng 2000 bước). Bước dòng vòng lặp có ghi chú ngắn ("Vòng lặp: j = 2").

### Code mẫu (`algorithmCode.ts`)
- Mỗi thuật toán có code Python và C++ cùng ý với SGK KNTT và giáo án Tin 11 đã nạp. Mỗi dòng là `{ text, line? }`; hai ngôn ngữ dùng chung một chuỗi bước, đổi tab chỉ đổi cách hiển thị.

### Giao diện (`algorithm.tsx`)
- `CodePanel` dưới hình cột (điện thoại) hoặc bên phải (≥1024px), mặc định Python.
- Ở dòng `if`, chip cuối dòng: `5 > 2 → True` (C++ `true`), nền `--success` pha hoặc `--coral` pha, có chữ.
- Chip biến dưới khung code, mỗi biến một màu xoay vòng `--coral`, `--sun`, `--sky` pha nhạt, chữ sáng; chip vừa đổi giá trị nảy nhẹ (dùng lại `bump`).
- Màu cột theo bản mẫu nền sáng: cột thường `--accent` nhạt, đang so sánh `--sky` có quầng sáng, đang đổi chỗ `--sun` có quầng sáng, đã đúng chỗ `--accent` đậm. Con trỏ `j` là nhãn viên thuốc trên cột.
- Nút "Ẩn code / Hiện code" (mặc định hiện). Chế độ đua không hiện khung code.

## Kiểm thử
- `highlight.ts`: mỗi ngôn ngữ một bộ mẫu; số dòng ra bằng số dòng vào; ghép lại token ra đúng chuỗi gốc.
- Tương phản màu cú pháp ≥ 4.5:1 trên nền khung ở mọi cấp học và chế độ.
- Engine: với mỗi thuật toán và các dãy ngẫu nhiên, đã sắp, sắp ngược, có trùng, tìm thấy và không thấy: mọi `step.line` có đúng một dòng ở cả Python và C++; `vars.j`/`mid` khớp `compare`; bộ đếm cuối bằng giá trị cũ.
- Chạy thật code Python và C++ mẫu (g++ ở `C:\msys64\ucrt64\bin`) trên cùng dãy, so kết quả với engine.
- Giao diện: `aria-current` đổi theo bước; đổi tab giữ bước; ẩn code ẩn khung; `CodeRenderer` hiện đủ tab và nút sao chép.
- `pnpm turbo typecheck`, test `@scipal/web`; xem trình duyệt ở 1280px và 375px, sáng và tối, trên bài Tin 11 đã nạp.
