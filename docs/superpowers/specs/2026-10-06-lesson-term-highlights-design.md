# Từ vựng và địa danh tô màu trong bài học — Design

Ngày: 2026-10-06 · Trạng thái: chờ duyệt

## Mục tiêu

Trong bài học, giáo viên tô màu sẵn một số từ vựng hoặc địa danh. Học sinh hover (desktop) hoặc chạm (điện thoại) vào từ đó để xem popover:

- **Từ vựng**: thuật ngữ EN/VI, từ loại, định nghĩa, ví dụ, phát âm nếu có.
- **Địa danh**: ảnh, tên, đoạn giới thiệu, nguồn ảnh.

Cuối bước Bài học có mục **"Từ vựng trong bài"** liệt kê các từ đã tô, tự sinh từ nội dung bài.

Không dùng Google Dịch: nghĩa lấy từ bảng `terms` do giáo viên viết và admin duyệt, nên đúng thuật ngữ GDPT 2018 và đọc được khi đã có dữ liệu.

## Ràng buộc (từ `.agents/rules`)

- Nội dung là dữ liệu: không tạo component riêng cho từng môn.
- Màu chỉ qua token (`--accent`, `text-accent-ink`, `bg-surface`…), không hex, không class màu Tailwind thô.
- Song ngữ `{en, vi}` / cột `_en`/`_vi`; render qua `useLanguage`.
- Portal của popover gắn trong `[data-app-shell]`.
- Ảnh nằm trên storage của dự án, không hotlink.

## Thiết kế

### 1. Marker trong bài

Cú pháp `{term:<uuid>:chữ hiển thị}` trong khối `theory`, xử lý bởi `remarkTerm` (mô phỏng `remarkColor.ts`). Dùng `:` chứ không dùng `|` vì GFM tách ô bảng theo `|` trước khi đọc inline, nên marker trong ô bảng sẽ vỡ; uuid dài cố định 36 ký tự nên `:` không gây nhập nhằng.

- Chỉ xét node `text`, nên marker trong code hoặc công thức giữ nguyên.
- Chữ hiển thị theo ngôn ngữ của đoạn văn.
- Id không hợp lệ hoặc term không tải được: hiện chữ thường, không gạch chân, không lỗi.
- Khối `term-ref` giữ nguyên.
- Trình soạn bài có nút "Gắn thuật ngữ": bôi chữ, tìm term, chèn marker. Giáo viên không gõ uuid.

### 2. Dữ liệu

Một migration mở rộng `public.terms`:

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `kind` | text, not null, default `'word'` | check in (`'word'`, `'place'`) |
| `image_url` | text null | chỉ nhận URL storage của dự án |
| `image_alt_en`, `image_alt_vi` | text null | bắt buộc nếu có `image_url` |
| `image_credit` | text null | tối đa 200 ký tự |

- Địa danh dùng `definition_en/vi` làm đoạn giới thiệu.
- Quy trình duyệt hiện có (giáo viên nhập → admin duyệt → published) áp dụng cho cả hai loại; RLS "public read published" giữ nguyên.
- Ảnh nằm trên kho R2 công khai do `app.mediaStore` quản lý (`backend/src/plugins/mediaStore.ts`), không phải Supabase Storage. Popover hiện ảnh bất cứ khi nào term có `image_url`, dù là từ vựng hay địa danh.
- Backend `readTerm` (`backend/src/routes/terms.ts`) nhận thêm `kind`, `image_*`; từ chối `image_url` không bắt đầu bằng `app.mediaStore.publicUrl('')`; batch import dùng chung `readTerm`.

### 3. Tải dữ liệu

`LessonTermsProvider` bọc bước Bài học: quét marker trong các khối `theory`, gom id (bỏ trùng, giữ thứ tự xuất hiện đầu tiên), tải **một lần** `terms where id in (...)` (chỉ bản published), cache trong context. `TermMark` và mục cuối bài đọc từ context này, không có truy vấn từng từ.

### 4. Popover (`TermMark`)

- Phần tử `<button>` tô `--accent`, gạch chân chấm; `aria-expanded`, `aria-haspopup="dialog"`.
- Hover mở sau ~150 ms, rời thì đóng; chạm mở/đóng; focus + Enter/Space mở; Esc hoặc bấm ra ngoài đóng.
- Tự lật vị trí khi gần mép; render trong `[data-app-shell]`.
- Nội dung: xem Mục tiêu. Link "Xem trong từ điển" → `/glossary#<id>`.
- Ảnh `loading="lazy"`, có `alt` song ngữ, có credit.

### 5. Mục "Từ vựng trong bài"

- Nằm cuối bước Bài học (sau khối cuối, trước nút "Tiếp theo: Tự luyện"); không thành tab riêng.
- Ẩn khi bài không có marker hợp lệ.
- Mỗi term là một thẻ hiện sẵn nội dung (không cần hover); bấm mở `/glossary#id`.
- Trình soạn bài xem trước cùng bước Bài học (`part='lesson'`).

### 6. Form nhập thuật ngữ

Thêm công tắc "Từ vựng / Địa danh" và ô tải ảnh (dùng lại cơ chế tải ảnh của khối `image`) vào form thuật ngữ hiện có.

## Ngoài phạm vi

Bản đồ, toạ độ, tự lấy dữ liệu từ Wikipedia, tự gắn từ cho cả bài, hỗ trợ marker trong importer tài liệu (`ContentImportStudio`).

## Kiểm thử

- `remarkTerm`: tách đúng marker; bỏ qua code và công thức; marker hỏng giữ nguyên chữ.
- Hàm gom term của bài: bỏ trùng, đúng thứ tự, bỏ qua khối không phải `theory`.
- `TermMark`: hover, chạm, bàn phím, Esc, term thiếu; từ thường và địa danh.
- Mục cuối bài: ẩn khi không có term; hiện đủ khi có cả hai loại.
- Backend: validate `kind`, `image_url` ngoài storage bị từ chối, thiếu `alt` bị từ chối; batch.
- Theme: `rawColors.test.ts` vẫn qua.
