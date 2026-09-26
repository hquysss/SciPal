# SciPal — Đăng bài học từ database, bỏ dữ liệu demo

**Ngày:** 2026-09-26
**Trạng thái:** Chờ duyệt
**Quan hệ tài liệu:** Bổ sung cho [đặc tả khung chung v1.9](./2026-09-22-scipal-foundation-design.md) (S3, S4, S9, S10). Spec này làm trên **schema hiện tại** (`published` + `review_status`), chưa triển khai schema v1.8/v1.9 (`status` bốn trạng thái, `subject_grade_catalog`, `subject_tracks`). Khi schema đó được làm, các quy tắc ở đây chuyển theo mà không đổi hành vi với người dùng.

---

## 1. Mục tiêu

1. Nội dung học tập chỉ đến từ database. Không seed, fixture hay hằng số nào trong code đóng vai trò bài học, chủ đề, thuật ngữ mẫu hay đề thi mẫu.
2. Giáo viên tự đăng được bài cho **mọi môn và mọi lớp 1–12** khi database chưa có gì, kể cả khi chưa có chủ đề nào.
3. Nội dung bài soạn sẵn nạp được từ file JSON, được kiểm tra đúng định dạng trước khi lưu.
4. Bài được admin duyệt thì hiện cho học sinh mà không cần sửa code hay bật cờ môn học.

## 2. Phạm vi

**Trong phạm vi**
- Migration nới lớp học và thêm lớp cho chủ đề.
- API authoring: tuỳ chọn soạn bài, tạo chủ đề, tạo bài.
- API danh sách đề thi.
- Form tạo bài, nhập JSON trong trình soạn thảo.
- Trang môn `/[subject]`, trang bài `/[subject]/[lesson]`, trang `/exam`.
- Xoá seed demo khỏi repo, hướng dẫn dọn dữ liệu demo trên Supabase.

**Ngoài phạm vi** (việc sau, ghi vào PROJECT_STATE)
- `subject_grade_catalog`, track, trạng thái `status` bốn giá trị của v1.8.
- Landing (`getLandingData`), NavBar, SubjectSwitcher, CreateClassModal, Glossary vẫn đọc `SUBJECT_CONFIG`; chuyển sang DB ở đợt sau.
- Upload hàng loạt nhiều bài một lần, soạn câu hỏi `questions` và đề thi.
- Ảnh/tệp đính kèm trong bài.

## 3. Hiện trạng

| Vấn đề | Vị trí |
|---|---|
| Seed chủ đề "Topic F", thuật ngữ "algorithm" và bài "Binary Search" demo | `supabase/seed/informatics_sample.sql` |
| Trang môn và trang bài trả 404 với mọi môn khác Tin học vì gate bằng hằng số | `frontend/lib/subject-config.ts`, `frontend/app/[subject]/**` |
| Danh sách đề thi viết cứng | `DEMO_BLUEPRINTS` trong `frontend/app/exam/page.tsx` |
| Giáo viên không tạo được chủ đề; bỏ seed thì không tạo được bài | `backend/src/routes/authoring.ts` |
| Chỉ nhận lớp 10–12 ở form, API và DB | `LessonCreateForm.tsx`, `authoring.ts`, `lessons.grade CHECK (10,11,12)` |
| Chỉ thêm bài vào môn `status = 'active'` | `GET /api/authoring/options`, `POST /api/authoring/lessons` |
| Truy vấn lỗi bị gộp thành 404 | `lessonQueries.ts`, `lessonDetailQuery.ts` trả `null` cho cả lỗi lẫn không tìm thấy |

## 4. Thiết kế

### 4.1 Database — migration mới

```sql
ALTER TABLE lessons DROP CONSTRAINT <tên check grade hiện tại>;
ALTER TABLE lessons ADD CONSTRAINT lessons_grade_range CHECK (grade BETWEEN 1 AND 12);

ALTER TABLE topics ADD COLUMN grade int CHECK (grade BETWEEN 1 AND 12);
CREATE INDEX topics_subject_grade_sort_idx ON topics (subject_id, grade, sort_order);
```

- Tên constraint hiện tại được tra trong migration/`pg_constraint` khi viết migration, không đoán.
- `topics.grade` cho phép `null` để không vỡ dữ liệu cũ; chủ đề tạo mới qua API luôn có `grade`.
- Không thêm dữ liệu nào trong migration.
- RLS không đổi: `topics` public read, ghi chỉ qua backend service role.

### 4.2 Khoảng lớp theo cấp học

Một hàm dùng chung ở backend:

| `subjects.education_level` | Lớp hợp lệ |
|---|---|
| `primary` | 1–5 |
| `lower_secondary` | 6–9 |
| `upper_secondary` | 10–12 |

Đây là khoảng tối đa theo cấp; khi có `subject_grade_catalog` sẽ thay bằng tra catalog theo từng lớp.

### 4.3 Backend API (`backend/src/routes/authoring.ts`, `exam.ts`)

**`GET /api/authoring/options`** (teacher, admin)
- Trả **mọi** môn: `id, slug, name_en, name_vi, education_level, sort_order`, không lọc `status`.
- Trả chủ đề: `id, subject_id, grade, name_en, name_vi, sort_order`.
- Admin được gọi (hiện chỉ teacher), vì admin cũng cần tạo chủ đề và bài.

**`POST /api/authoring/topics`** (teacher, admin) — mới
- Body: `{ subject_id, grade, name_en, name_vi, sort_order? }`.
- Kiểm tra: `subject_id` là UUID và tồn tại; `grade` thuộc khoảng của cấp học môn đó; hai tên bắt buộc, tối đa 200 ký tự.
- Đã có chủ đề cùng `subject_id + grade` và trùng `name_en` hoặc `name_vi` (không phân biệt hoa thường) → `409`, trả về chủ đề sẵn có để form chọn luôn.
- `slug` = `g{grade}-{slug(name_en)}`, thêm hậu tố `-2`, `-3`… nếu trùng trong môn (khoá `UNIQUE(subject_id, slug)` hiện có).
- `sort_order` mặc định = lớn nhất trong `subject_id + grade` + 1.
- Trả `201 { topic }`.

**`POST /api/authoring/lessons`** (teacher, như hiện tại)
- Bỏ yêu cầu môn `status = 'active'`.
- `grade` bắt buộc, phải thuộc khoảng của cấp học môn chứa chủ đề.
- Nếu `topic.grade` khác `null` thì phải bằng `grade` của bài; khác → `400`.
- Các kiểm tra còn lại (tiêu đề, slug, `created_by`, `review_status = 'draft'`) giữ nguyên.

**`GET /api/exam/blueprints`** — mới, public như các route `/api/exam/*`
- Trả `id, name, grade, subject_id, subject_slug, subject_name_en, subject_name_vi, question_count` (tổng `count` trong `sections`).
- Không trả `sections` chi tiết hay câu hỏi.
- Lỗi DB → `500`; không có đề → `200 { blueprints: [] }`.

Luồng gửi duyệt, duyệt, từ chối và `PATCH` giữ nguyên. Bài chỉ hiện cho học sinh khi admin duyệt (`published = true`).

### 4.4 Form tạo bài (`LessonCreateForm.tsx`)

Thứ tự trường:
1. **Môn học**: mọi môn, nhóm theo cấp học (Tiểu học / THCS / THPT).
2. **Lớp**: chỉ các lớp thuộc cấp của môn đã chọn; đổi môn thì xoá lớp và chủ đề đã chọn.
3. **Chủ đề**: chủ đề của đúng môn + lớp, cùng lựa chọn **"+ Tạo chủ đề mới"**. Chọn lựa chọn này thì hiện hai ô tên EN/VI và nút "Tạo chủ đề"; tạo xong thì chủ đề mới được chọn sẵn. Nếu API trả `409`, chọn chủ đề đang có và báo "Chủ đề này đã có".
4. **Tiêu đề** VI/EN.

Nút "Tạo bản nháp" chỉ bật khi đủ môn, lớp, chủ đề và hai tiêu đề. Mọi thông báo EN/VI qua `useLanguage`. Chỉ báo thành công sau khi API trả về bài hợp lệ, giữ nguyên như hiện tại.

### 4.5 Nhập nội dung từ JSON (`LessonEditor.tsx`)

- Nút **"Nhập từ JSON"** cạnh bảng khối, chỉ bật khi bài được phép sửa (`draft`/`rejected`, hoặc admin).
- Chọn tệp `.json`, tối đa 1 MB, đọc hoàn toàn ở trình duyệt.
- Định dạng tệp:

```json
{
  "title_en": "Binary search",
  "title_vi": "Tìm kiếm nhị phân",
  "blocks": [ { "type": "theory", "content": { "en": "…", "vi": "…" } } ]
}
```

  `blocks` bắt buộc, không rỗng, mỗi phần tử qua `BlockSchema` của `@scipal/types`. `title_en`/`title_vi` tuỳ chọn, cùng quy tắc độ dài như form. Tệp chỉ là mảng khối cũng được chấp nhận.
- Sai định dạng → không đổi gì trong trình soạn thảo; hiện lỗi kèm vị trí khối và trường sai đầu tiên (ví dụ `blocks[3].content.vi: bắt buộc`).
- Hợp lệ → hỏi xác nhận **thay toàn bộ khối hiện có** (hiện số khối cũ và mới); đồng ý thì nạp vào trình soạn thảo ở trạng thái chưa lưu. Lưu vẫn đi qua `PATCH` hiện có, nên backend kiểm tra lại bằng `BlockSchema` và `expected_updated_at`.
- Không tự gửi duyệt sau khi nhập.

### 4.6 Trang môn và trang bài

- Bỏ `SUBJECT_CONFIG` khỏi `app/[subject]/page.tsx` và `app/[subject]/[lesson]/page.tsx`. Tên, màu, icon môn lấy từ bảng `subjects` theo `slug`; `SubjectProvider` nhận dữ liệu từ hàng DB (vẫn đặt `--accent` trên phần tử phạm vi, không trên `:root`).
- Bỏ `generateStaticParams` dựa trên hằng số; trang render động.
- Truy vấn trả kết quả có phân biệt: `ok` / `not_found` / `error`.
  - `not_found` (không có môn hoặc không có bài đã xuất bản với slug đó) → 404.
  - `error` → trạng thái **"Chưa tải được dữ liệu"** / "Could not load" kèm nút thử lại; không 404, không coi là rỗng.
- Trang môn chỉ hiện chủ đề có ít nhất một bài `published = true`, nhóm theo lớp (dùng `topics.grade`, nếu `null` thì lấy `lessons.grade`), sắp theo `sort_order`.
- Môn có trong DB nhưng chưa có bài xuất bản → trang môn hiện **"Đang biên soạn"** / "In development", không có danh sách bài giả.
- Bỏ dòng mô tả cứng "Chương trình khoa học tự nhiên THPT…"; thay bằng cấp học của môn lấy từ `education_level`.

### 4.7 Trang thi thử (`/exam`)

- Bỏ `DEMO_BLUEPRINTS`; gọi `GET /api/exam/blueprints`.
- Có đề → danh sách như hiện tại. Không có đề → "Chưa có đề thi" / "No exams yet". Lỗi → thông báo lỗi + thử lại.

### 4.8 Dữ liệu demo

- Xoá `supabase/seed/informatics_sample.sql` khỏi repo. `supabase/seed/subjects.sql` giữ lại vì đó là danh mục môn, không phải học liệu.
- `supabase/full_schema_and_seed.sql` là snapshot lịch sử: thêm dòng cảnh báo ở đầu tệp rằng không được chạy để tạo môi trường mới vì chứa dữ liệu demo.
- **Dữ liệu demo đã nằm trên Supabase không bị xoá tự động.** Kèm tệp `supabase/manual/remove_demo_content.sql`, gồm:
  1. Các câu `SELECT` liệt kê bài `binary-search`, chủ đề `topic-f-algorithms`, thuật ngữ `algorithm` của Tin học, và mọi đề thi đang có, để người phụ trách kiểm tra trước.
  2. Các câu `DELETE` tương ứng trong một transaction, để người phụ trách tự chạy sau khi xác nhận. Xoá bài kéo theo `progress` liên quan nếu có khoá ngoại; điều này được ghi rõ trong tệp.

## 5. Kiểm thử và nghiệm thu

**Backend (vitest, `helpers/supabaseMock`)**
- `POST /api/authoring/topics`: 401 khi thiếu token; 403 với học sinh; 400 khi lớp ngoài khoảng cấp học; 409 khi trùng tên, trả chủ đề sẵn có; 201 và slug có tiền tố lớp.
- `POST /api/authoring/lessons`: nhận môn `upcoming`; 400 khi lớp khác lớp của chủ đề; 400 khi lớp ngoài khoảng cấp học.
- `GET /api/authoring/options`: trả cả môn `upcoming`; admin được gọi.
- `GET /api/exam/blueprints`: trả danh sách rỗng khi không có đề; 500 khi DB lỗi; không có `sections` trong phản hồi.
- Test migration (theo mẫu `rls-migration.test.ts`): có constraint lớp 1–12 và cột `topics.grade`.

**Frontend**
- Hàm kiểm tra tệp JSON nhập bài: tệp hợp lệ, mảng khối trần, khối sai kiểu, `blocks` rỗng, tệp quá 1 MB, JSON hỏng.
- Hàm phân loại truy vấn trang môn: `ok` / `not_found` / `error` / môn rỗng.

**Lệnh bắt buộc:** `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`. Lỗi typecheck có sẵn từ trước (ghi trong PROJECT_STATE) được báo riêng, không tính là lỗi mới.

**Nghiệm thu thủ công** trên DB đã dọn demo và đã áp migration:
1. Tài khoản giáo viên tạo chủ đề lớp 4 cho môn Tiểu học, tạo bài, nhập JSON, gửi duyệt.
2. Admin duyệt; học sinh/khách mở được `/<slug-môn>` và bài vừa duyệt.
3. Môn chưa có bài hiện "Đang biên soạn"; `grep` trong `frontend/` không còn `DEMO_` hay dữ liệu bài học viết cứng.

## 6. Câu hỏi mở

1. Giáo viên có được tạo chủ đề không, hay chỉ admin? Spec đang cho cả hai, vì bài vẫn phải qua admin duyệt.
2. Có cần nhập JSON ngay lúc tạo bài (một bước) thay vì tạo nháp rồi nhập trong trình soạn thảo không? Spec đang chọn hai bước để giữ nguyên luồng tạo và kiểm tra hiện có.
