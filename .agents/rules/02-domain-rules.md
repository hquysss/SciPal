# Domain Rules & Project Constraints

## 1. Nguyên tắc "Nội dung là dữ liệu" (Content-as-Data)
- **CẤM** tạo page hoặc component riêng cho từng môn học (không tạo `MathPage.tsx`, `PhysicsPage.tsx`).
- Tất cả 5 môn học đều dùng chung bộ route động `[subject]/page.tsx` và `[subject]/[lesson]/page.tsx`.
- Thêm môn mới = thêm 1 bản ghi trong bảng `subjects` và khai báo trong `packages/ui/src/tokens.ts`.
- Thêm bài học mới = thêm bản ghi trong `topics` và `lessons` với mảng `blocks` hợp lệ.

## 2. Quy tắc tô màu nhận diện (Theming & Accent Token)
- **CẤM** hard-code màu đại diện cho môn học (ví dụ: cấm viết cứng `bg-green-600` cho thẻ bài học môn Tin học).
- Luôn đọc màu qua CSS variable `--accent` hoặc hàm `useAccent()` / `getAccentColor(slug)` từ `@scipal/ui`.
- Bắt buộc bọc mọi khu vực hiển thị nội dung theo môn trong `<SubjectProvider slug={subjectSlug}>`.
- **Màu thương hiệu (Brand Color)**: `SCIPAL_GREEN` (`#16a34a`) chỉ dùng cho logo cỏ 4 lá. Nền navbar dùng token `nav`, bằng đúng màu giấy (`paper`) của cấp học; màu rực của cấp chỉ ở điểm nhấn (`action`: nút đăng nhập, mục đang chọn).
- **Màu giao diện chỉ qua token**: trong `.tsx` dùng class ngữ nghĩa (`bg-paper`, `text-ink`, `border-edge`, `bg-action`…) từ `packages/ui/src/theme/palettes.ts`; không dùng class màu Tailwind thô, mã hex hay `dark:`. Test `frontend/lib/theme/rawColors.test.ts` chặn tái phạm.
- **Cấp học và chế độ màu** gắn trên `[data-app-shell]` (root layout) hoặc `LevelScope`, không bao giờ trên `:root`/`<html>`. Nội dung portal phải gắn vào trong `[data-app-shell]`.

## 3. Quy chuẩn khối nội dung bài học (Block Schema Validation)
Mọi phần tử trong `lessons.blocks` (JSONB) bắt buộc phải thỏa mãn `BlockSchema` (`packages/types/src/block.ts`). 7 loại block hợp lệ gồm:
1. `theory`: `{ type: 'theory', content: { en, vi } }` (hỗ trợ Markdown + KaTeX).
2. `code`: `{ type: 'code', tabs: [{ lang: 'python'|'cpp'|'javascript', code }] }`.
3. `formula`: `{ type: 'formula', katex: string, caption?: { en, vi } }`.
4. `quiz`: `{ type: 'quiz', question_id: uuid }`.
5. `interactive`: `{ type: 'interactive', kind: 'algorithm-sim'|'function-graph'|'geometry-3d'|'experiment'|'bio-diagram', heading, offline: bool, embed_url?, config }`.
6. `term-ref`: `{ type: 'term-ref', term_id: uuid }` (liên kết sang bảng `terms`).
7. `resource-ref`: `{ type: 'resource-ref', resource_id: uuid }`.

## 4. Chuẩn mực song ngữ (Bilingual Format)
- Toàn bộ chuỗi hiển thị nội dung học tập phải luôn có cặp `{ en: string, vi: string }`.
- Khi render giao diện người dùng, luôn dùng hook `const { lang, t } = useLanguage()` (`packages/hooks`):
  ```tsx
  <span>{t(block.content)}</span>
  // hoặc
  <span>{lang === 'en' ? lesson.title_en : lesson.title_vi}</span>
  ```

## 5. Ranh giới bảo mật & Ẩn đáp án (Exam & Secret Security)
- **Cấm rò rỉ khóa Service Role**: `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/` phải luôn trả về 0 kết quả.
- **Ẩn đáp án đề thi**: Khi người dùng vào làm bài thi (`/exam/[blueprintId]`), API trả về danh sách câu hỏi **BẮT BUỘC** phải xóa bỏ trường `answer` và `answer_key`.
- **Chấm điểm tại Server**: Toàn bộ điểm số, XP, streak chỉ được tính toán và lưu trong backend qua `POST /api/score/lesson` và `POST /api/score/exam`.

## 6. Xử lý khi mất kết nối mạng (Offline Fallback)
- Các khối nội dung văn bản (`theory`, `formula`, `code`) phải đọc được offline khi đã tải về.
- Nút Gia sư AI (`AiTutorButton`) phải tự động disabled và hiện tooltip nhắc nhở khi `navigator.onLine === false`.
- Khối `interactive` có cờ `offline: false` (như mô phỏng PhET nhúng ngoài) phải hiển thị thông báo thay thế yêu cầu kết nối mạng khi offline.

## 7. Quy tắc quản lý Package & Workspace
- Mọi quan hệ phụ thuộc nội bộ giữa các package phải khai báo dạng `"workspace:*"`.
- Cấm cài đặt thư viện vào root `package.json` trừ các công cụ tooling build/lint/test chung.
- Không sửa cấu hình alias `react` trong `mobile/tsconfig.json` (bắt buộc giữ để giải quyết xung đột kiểu giữa React 18 của Expo và React 19 của Web).
