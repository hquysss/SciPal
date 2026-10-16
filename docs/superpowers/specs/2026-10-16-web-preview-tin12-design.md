# Mô phỏng `web-preview`: HTML/CSS dựng trang từng dòng (Tin học 12)

> Trạng thái: hướng đã duyệt trong hội thoại; chờ duyệt bản viết. Dùng `CodePanel` của spec `2026-10-16-algorithm-code-trace-design.md`; làm sau Tin 10.

## Mục tiêu
Tin 12 KNTT định hướng Tin học ứng dụng: chủ đề 4 / F (Bài 7–18, HTML và CSS) và chủ đề 7 (Bài 23–28, xây dựng trang web). Mỗi đoạn HTML/CSS mẫu là một khối mô phỏng có hai nửa: code và trang web thật. Bấm chạy, trang được dựng dần theo từng dòng; chữ của dòng đang chạy nổi lên và phát sáng, đồng thời phần tử trên trang do dòng đó tạo ra cũng nổi lên và phát sáng. Học sinh có thể bấm "Thử sửa" để sửa code và xem trang đổi ngay.

Ngoài phạm vi: JavaScript trong trang, nhiều tệp, ảnh tải lên, lưu bài làm, chấm điểm.

## Dữ liệu (kind mới `web-preview` trong `@scipal/types`)
```ts
{ html: string; css: string; height?: number }   // mỗi phần ≤ 20 000 kí tự; height 200–800, mặc định 360
```
- `html` là phần thân trang (có thể có `<header>`, `<form>`…); `css` có thể rỗng. Bước chạy tính ở client, không lưu.

## Dựng trang (`webPreview.ts`, thuần, có test)
- Tách `html` thành thẻ mở kèm dòng nguồn bằng bộ tách nhỏ (bỏ qua chú thích, thẻ đóng, nội dung `<style>`/`<script>`). Chèn `data-sp-line="n"` vào mỗi thẻ mở; bỏ mọi `<script>` và thuộc tính `on*`.
- Tách `css` thành quy tắc kèm dòng của bộ chọn (`h1, p { … }` → dòng của `h1, p`); `@media` giữ nguyên làm một quy tắc.
- Các bước: trước hết từng dòng HTML có thẻ mở, theo thứ tự; sau đó từng quy tắc CSS. Mỗi bước có `{ panel: 'html' | 'css', line, select }`, với `select` là `[data-sp-line="n"]` hoặc bộ chọn của quy tắc.

## Hiển thị trang
- `<iframe sandbox="allow-same-origin">` (không `allow-scripts`, không `allow-forms`, không `allow-popups`), `srcdoc` ghép `html` đã xử lí với một `<style>` cho từng quy tắc CSS và một `<style>` của SciPal.
- Ở bước k:
  - Phần tử có dòng HTML sau bước hiện tại bị ẩn (`visibility: hidden`), nên trang mọc dần.
  - Quy tắc CSS sau bước hiện tại bị tắt (`style.disabled`), nên kiểu dáng phủ dần lên (thấy rõ thứ tự ưu tiên ở Bài 17).
- Phần tử của bước hiện tại (`querySelectorAll(select)`, tối đa 50) được gắn `data-sp-on`:
  - `transform: translateY(-4px) scale(1.03)`;
  - `outline` và `box-shadow` quầng sáng `--accent` (màu truyền vào iframe bằng biến CSS lúc dựng);
  - hiệu ứng nảy 280 ms; giảm chuyển động thì không di chuyển, chỉ giữ quầng sáng.
- Bộ chọn CSS sai thì bỏ qua phần tô sáng, không làm hỏng trang.
- Liên kết trong trang không mở được; biểu mẫu không gửi được; ảnh ngoài vẫn hiện.

## Giao diện (`webPreview.tsx`)
- ≥1024px hai cột: trái `CodePanel` tab `HTML | CSS` (tab tự chuyển theo bước, người dùng vẫn bấm đổi được), phải là trang trong khung trình duyệt giả (thanh địa chỉ "index.html"). Điện thoại xếp dọc: trang trước, code sau.
- Điều khiển như `algorithm-sim`; ghi chú bước: "Dòng 4: thẻ `<h1>` tạo tiêu đề", "Dòng 2 (CSS): `p { color: … }` áp cho 3 phần tử". Tên thẻ thường gặp có câu giải thích song ngữ ngắn trong bảng tra (`h1`–`h6`, `p`, `a`, `img`, `ul`, `ol`, `li`, `table`, `tr`, `td`, `form`, `input`, `label`, `button`, `iframe`, `video`, `audio`, `header`, `nav`, `main`, `footer`, `div`, `span`); thẻ khác dùng câu chung.
- **Thử sửa**: chuyển khung code thành ô soạn (`textarea` mono cùng màu khung, có số dòng), trang cập nhật sau 300 ms ngừng gõ, tắt chế độ bước; nút "Khôi phục" trả code gốc. Không lưu.
- Editor của giáo viên: hai ô soạn HTML và CSS có xem trước, kiểm độ dài như Zod.

## Kiểm thử
- `webPreview.ts`: dòng của thẻ mở đúng với nhiều dòng, thẻ lồng, chú thích, thuộc tính nhiều dòng; `<script>` và `on*` bị bỏ; quy tắc CSS và `@media` đúng dòng.
- Giao diện: bước tiếp đổi dòng sáng và gắn `data-sp-on` đúng phần tử; trang ẩn phần tử phía sau; "Thử sửa" cập nhật `srcdoc`; "Khôi phục" trả lại code gốc.
- Bảo mật: test khẳng định `sandbox` không có `allow-scripts`, và `srcdoc` không còn `<script>` hay `onclick`.
- `pnpm turbo typecheck`, test `@scipal/types` và `@scipal/web`; xem trình duyệt ở 1280px và 375px với mẫu của Bài 9 (danh sách, bảng) và Bài 16 (định dạng khung).
