# SciPal — Đặc tả khung chung

**Phiên bản:** 1.9
**Ngày cập nhật:** 2026-09-26
**Ưu tiên:** Tin học (Informatics) first
**Mới trong v1.7:** Khóa catalog đầy đủ theo từng lớp của Chương trình GDPT 2018; lớp là tab trong catalog, không phải bước onboarding; tách rõ `available` / `compiling` / `not_applicable`
**Mới trong v1.8:** Phạm vi sản phẩm = toàn bộ Chương trình GDPT 2018 (không riêng khoa học tự nhiên); nhận diện mọi môn là dữ liệu trong `subjects`; `available` suy từ dữ liệu; định hướng môn (track); trạng thái duyệt cho lesson/question/resource; `topics.grade`; phiên thi `exam_attempts`; idempotency cho đồng bộ offline; đồng ý của người giám hộ; đánh số phần mở rộng thành E1–E12
**Mới trong v1.9:** Icon ảnh theo môn (`subjects.icon_url`, fallback icon chữ); nhãn năng lực số cho mỗi bài (`lessons.digital_competency`); ngôn ngữ lập trình mặc định theo người dùng (`profiles.preferred_code_language`); bảng bài tập lập trình có test ẩn (`coding_exercises`); thứ tự demo Tin học 11 Chủ đề F với Bài 19 làm bài mẫu vàng

**Quan hệ tài liệu:** Đây là đặc tả nền của toàn sản phẩm. [`2026-09-25-public-landing-field-notebook-design.md`](./2026-09-25-public-landing-field-notebook-design.md) là nguồn chuẩn cho bố cục và mỹ thuật S0/S2. Riêng tính hợp lệ của môn theo từng lớp, tab lớp trong catalog và trạng thái học liệu phải tuân theo v1.7 này; không được dùng catalog cấp học rộng để hiện môn sai lớp.

---

## 1. Nguyên tắc

### 1.1 Phạm vi sản phẩm và thứ tự phát triển

Tầm nhìn dài hạn của SciPal là không gian học **toàn bộ Chương trình giáo dục phổ thông 2018** bằng song ngữ EN/VI cho học sinh Việt Nam từ lớp 1 đến lớp 12, có AI hỗ trợ. SciPal không giới hạn ở khoa học tự nhiên: mọi môn học và hoạt động giáo dục trong catalog §2.1 đều thuộc phạm vi sản phẩm và được hiển thị; môn chưa có học liệu dùng trạng thái `compiling` (“Đang biên soạn”). Phạm vi phát hành học liệu phải được trình bày trung thực theo từng giai đoạn:

- **Hiện tại:** THPT (lớp 10–12), ưu tiên Tin học lớp 11 làm môn tham chiếu cho khung chung.
- **Mở rộng kế tiếp:** các môn THPT khác (ưu tiên Toán, Vật lí, Hoá học, Sinh học, rồi các môn còn lại) khi có học liệu đã duyệt.
- **Tương lai:** Tiểu học và THCS. Trước khi có học liệu đã duyệt, hai cấp này vẫn có catalog chính thức theo từng lớp nhưng môn chưa có bài dùng trạng thái `compiling`; không mô phỏng bài học, AI trực tiếp, lớp học hoặc tiến độ như thể đã phát hành.

Nhãn “Đang biên soạn” là cam kết lộ trình, không phải mốc thời gian: không hiển thị ngày dự kiến hoặc tỉ lệ hoàn thành khi chưa có kế hoạch học liệu được duyệt. Với môn có tính thực hành cao (Giáo dục thể chất, Giáo dục quốc phòng và an ninh, Nghệ thuật, Hoạt động trải nghiệm), học liệu SciPal là phần lý thuyết/từ vựng/hỗ trợ, không thay thế hoạt động trên lớp; copy của môn phải nói rõ điều này khi môn chuyển sang `available`.

Việc chọn cấp học là sở thích khám phá nội dung, không tự suy ra lớp chính thức, vai trò tài khoản, quyền truy cập hay tiến độ của người dùng.

### 1.2 Khung dùng chung, nội dung là dữ liệu

Mỗi màn hình được tách làm hai lớp:

- **Phần cố định** — bố cục, cơ chế, thành phần dùng lại. Viết một lần, mọi môn giống nhau.
- **Phần thay theo môn** — chỉ ba thứ: màu nhận diện, icon, và nội dung (bài học, thuật ngữ, câu hỏi). Nạp từ dữ liệu, không sửa code.
- **Cấu hình theo cấp học** — token landing, mật độ nội dung, mức hỗ trợ ngôn ngữ và nhịp tương tác. Đây là cấu hình của khung chung, không phải page/component riêng cho từng môn.

**Nguyên tắc vàng:** Nội dung là dữ liệu, không phải code. Thêm môn hoặc cấp học mới = nạp dữ liệu đã được duyệt + chọn token nhận diện, không dựng lại giao diện. Việc có dữ liệu catalog không tự động bật route hoặc tuyên bố học liệu đã sẵn sàng.

### 1.3 Song ngữ là năng lực học tập, không chỉ là nút đổi ngôn ngữ

- Mọi nội dung học tập có cặp `{ en, vi }` hoặc trường `_en`/`_vi`.
- Thuật ngữ trong bài phải tham chiếu bảng `terms`; không tự dịch lại ở từng bài.
- Giao diện hỗ trợ bốn chế độ đọc: `en`, `vi`, `parallel` (EN–VI song song) và `scaffolded` (ưu tiên EN, mở hỗ trợ VI theo nhu cầu).
- Cấp học điều chỉnh mật độ chữ, ví dụ, nhịp tương tác và mức hỗ trợ ngôn ngữ; không thay đổi schema lõi hoặc tạo component riêng cho từng môn.
- Phát âm, giọng nói và AI là lớp hỗ trợ; nội dung bài học cốt lõi vẫn phải dùng được khi các dịch vụ này không khả dụng.

---

## 2. Biến thể theo môn — màu · icon

Mỗi môn khai báo một bộ nhận diện. Toàn bộ khung đọc biến màu này để tô — không hard-code màu ở bất kỳ màn hình nào. Nhận diện là **dữ liệu** trong bảng `subjects` (`name_en`, `name_vi`, `accent_color`, `icon`, đều `NOT NULL`), không phải hằng số trong code. Vì catalog đầy đủ hiện ngay từ Phase 0 (kể cả ở `compiling`), seed catalog phải cung cấp nhận diện cho **mọi** môn trong §2.1; migration/seed thất bại nếu thiếu. Bảng dưới chỉ là các token tham chiếu đã chốt cho nhóm môn ưu tiên, không phải toàn bộ danh sách; token của các môn còn lại được chọn khi seed, phải đạt tương phản WCAG 2.2 AA trên nền sáng/tối và không trùng `--scipal-green`.

**Icon ảnh (tùy chọn):** `subjects.icon_url` trỏ tới SVG (ưu tiên) hoặc PNG nền trong suốt, khung vuông 256×256, chừa lề an toàn ~15% vì icon hiển thị trong khung tròn. Cả bộ icon dùng một phong cách chung (khuyến nghị flat/line một–hai màu theo accent của môn); cấp Tiểu học có thể dùng bộ minh hoạ riêng nhưng vẫn là dữ liệu, không phải component riêng. Thiếu `icon_url` → dùng `icon` chữ, nên có thể thay dần từng môn. Ảnh phải có `alt` song ngữ bằng tên môn và nguồn/giấy phép rõ ràng nếu không tự vẽ.

| Môn | Tên tiếng Anh | Màu nhận diện | Icon | Status |
|-----|--------------|---------------|------|--------|
| Tin học | Informatics | `#16a34a` (green-600) | `</>` | Tính theo từng lớp |
| Toán | Mathematics | `#2563eb` (blue-600) | `∑` | Tính theo từng lớp |
| Vật lí | Physics | `#7c3aed` (violet-600) | `⚛` | Tính theo từng lớp |
| Hoá học | Chemistry | `#0d9488` (teal-600) | `⚗` | Tính theo từng lớp |
| Sinh học | Biology | `#65a30d` (lime-600) | `❁` | Tính theo từng lớp |

```css
/* CSS variable set by SubjectProvider — consumed by ALL themed components */
--accent: #16a34a;   /* ← thay đổi duy nhất giữa các môn */
```

### 2.1 Catalog chính thức theo từng lớp

Catalog dùng **Chương trình giáo dục phổ thông ban hành kèm Thông tư 32/2018/TT-BGDĐT**, theo văn bản hợp nhất đang áp dụng các sửa đổi của Thông tư 20/2021 và Thông tư 13/2022. Dự thảo chưa được ban hành không được tự động đưa vào dữ liệu sản phẩm. Mỗi lần văn bản nguồn thay đổi phải tạo phiên bản catalog mới, không sửa ngầm dữ liệu cũ.

#### Tiểu học

| Môn học / hoạt động giáo dục | Lớp áp dụng | Vai trò trong chương trình |
|------------------------------|-------------|-----------------------------|
| Tiếng Việt | 1–5 | Bắt buộc |
| Toán | 1–5 | Bắt buộc |
| Ngoại ngữ 1 | 1–2 | Tự chọn |
| Ngoại ngữ 1 | 3–5 | Bắt buộc |
| Đạo đức | 1–5 | Bắt buộc |
| Tự nhiên và Xã hội | 1–3 | Bắt buộc |
| Lịch sử và Địa lí | 4–5 | Bắt buộc |
| Khoa học | 4–5 | Bắt buộc |
| Tin học và Công nghệ | 3–5 | Bắt buộc |
| Giáo dục thể chất | 1–5 | Bắt buộc |
| Nghệ thuật (Âm nhạc, Mĩ thuật) | 1–5 | Bắt buộc |
| Hoạt động trải nghiệm | 1–5 | Hoạt động giáo dục bắt buộc |
| Tiếng dân tộc thiểu số | 1–5 | Tự chọn |

#### Trung học cơ sở

| Môn học / hoạt động giáo dục | Lớp áp dụng | Vai trò trong chương trình |
|------------------------------|-------------|-----------------------------|
| Ngữ văn | 6–9 | Bắt buộc |
| Toán | 6–9 | Bắt buộc |
| Ngoại ngữ 1 | 6–9 | Bắt buộc |
| Giáo dục công dân | 6–9 | Bắt buộc |
| Lịch sử và Địa lí | 6–9 | Bắt buộc |
| Khoa học tự nhiên | 6–9 | Bắt buộc |
| Công nghệ | 6–9 | Bắt buộc |
| Tin học | 6–9 | Bắt buộc |
| Giáo dục thể chất | 6–9 | Bắt buộc |
| Nghệ thuật (Âm nhạc, Mĩ thuật) | 6–9 | Bắt buộc |
| Hoạt động trải nghiệm, hướng nghiệp | 6–9 | Hoạt động giáo dục bắt buộc |
| Nội dung giáo dục của địa phương | 6–9 | Nội dung giáo dục bắt buộc |
| Tiếng dân tộc thiểu số | 6–9 | Tự chọn |
| Ngoại ngữ 2 | 6–9 | Tự chọn |

#### Trung học phổ thông

| Môn học / hoạt động giáo dục | Lớp áp dụng | Vai trò trong chương trình |
|------------------------------|-------------|-----------------------------|
| Ngữ văn | 10–12 | Bắt buộc |
| Toán | 10–12 | Bắt buộc |
| Ngoại ngữ 1 | 10–12 | Bắt buộc |
| Lịch sử | 10–12 | Bắt buộc |
| Giáo dục thể chất | 10–12 | Bắt buộc |
| Giáo dục quốc phòng và an ninh | 10–12 | Bắt buộc |
| Hoạt động trải nghiệm, hướng nghiệp | 10–12 | Hoạt động giáo dục bắt buộc |
| Nội dung giáo dục của địa phương | 10–12 | Nội dung giáo dục bắt buộc |
| Địa lí | 10–12 | Môn lựa chọn |
| Giáo dục kinh tế và pháp luật | 10–12 | Môn lựa chọn |
| Vật lí | 10–12 | Môn lựa chọn |
| Hoá học | 10–12 | Môn lựa chọn |
| Sinh học | 10–12 | Môn lựa chọn |
| Công nghệ | 10–12 | Môn lựa chọn |
| Tin học | 10–12 | Môn lựa chọn |
| Âm nhạc | 10–12 | Môn lựa chọn |
| Mĩ thuật | 10–12 | Môn lựa chọn |
| Tiếng dân tộc thiểu số | 10–12 | Tự chọn |
| Ngoại ngữ 2 | 10–12 | Tự chọn |

Học sinh THPT chọn 4 môn trong nhóm 9 môn lựa chọn theo chương trình hiện hành. SciPal chỉ mô tả catalog; không tự suy ra tổ hợp cá nhân nếu người học chưa chọn.

**Định danh môn qua các cấp:** Một môn giữ cùng `subject_id` khi tên và chương trình liên tục qua các cấp (ví dụ `mathematics` 1–12, `informatics` 6–12, `technology` 6–12). Môn có tên hoặc chương trình khác ở cấp khác là `subject_id` riêng: `informatics-technology` (Tin học và Công nghệ, 3–5) ≠ `informatics`; `science` (Khoa học, 4–5) ≠ `natural-science` (Khoa học tự nhiên, 6–9); `history-geography` (4–9) ≠ `history` / `geography` (10–12); `vietnamese` (1–5) ≠ `literature` (6–12); `ethics` (1–5) ≠ `civic-education` (6–9) ≠ `economic-law-education` (10–12). Slug route lấy từ `subjects.slug`.

**Định hướng môn (track):** Ở THPT, Tin học có hai định hướng *Tin học ứng dụng* (`ict`) và *Khoa học máy tính* (`cs`); Công nghệ có *Công nghệ công nghiệp* (`industrial`) và *Công nghệ nông nghiệp* (`agricultural`). Track là dữ liệu trong `subject_tracks`, không phải môn riêng: catalog vẫn là một card môn–lớp; S3 hiện bộ lọc track khi môn có track ở lớp đó; bài học chung cho mọi track để `track = null`. Chuyên đề học tập lựa chọn của THPT được biểu diễn là topic có `kind = 'elective_topic'`, không phải môn mới.

#### Quy tắc hiển thị và trạng thái

- Catalog là ma trận theo **từng cặp `subject_id + grade`**, không phải một mảng môn chung cho cả cấp học. Dải lớp trong bảng trên phải được bung thành từng lớp khi seed dữ liệu.
- `available`: cặp môn–lớp có ít nhất một bài `status = 'published'` và truy vấn đọc thành công. Route S3/S4 là route chung `/[subject]` cho mọi môn nên không có điều kiện “route hoạt động” riêng theo môn; không dùng danh sách route hard-code hoặc cờ bật tay. Card có link vào S3.
- `compiling`: môn có trong chương trình của đúng lớp đã chọn nhưng chưa có bài xuất bản. Card hiện nhãn **“Đang biên soạn”** / **“In development”**, không giả dữ liệu và không có link vào trang học trống.
- `not_applicable`: môn không thuộc chương trình của lớp đã chọn. Không render card, không đưa vào tìm kiếm và không dùng nhãn “Đang biên soạn”. Ví dụ: lớp 4–5 không hiện `Khoa học tự nhiên` của THCS; lớp 6–7 không hiện `Khoa học` của tiểu học.
- `error`: không xác định được trạng thái do lỗi tải dữ liệu. Hiện thông báo **“Chưa kiểm tra được”** và nút thử lại; tuyệt đối không biến lỗi thành `compiling`.
- Vai trò `required | elective_choice | optional | required_activity` là metadata chương trình, độc lập với trạng thái học liệu. Một môn có thể đổi vai trò giữa các lớp, như Ngoại ngữ 1 tự chọn ở lớp 1–2 nhưng bắt buộc ở lớp 3–5.
- Mọi tên hiển thị phải có EN/VI. Tên tiếng Việt chính thức, lớp áp dụng, vai trò và `source_ref` phải được duyệt trước khi phát hành catalog.

**Ca hồi quy bắt buộc cho catalog:**

| Lớp chọn | Bắt buộc có | Bắt buộc không có |
|----------|-------------|--------------------|
| 2 | Tự nhiên và Xã hội; Ngoại ngữ 1 ở vai trò tự chọn | Tin học và Công nghệ; Khoa học; Lịch sử và Địa lí |
| 3 | Tự nhiên và Xã hội; Tin học và Công nghệ; Ngoại ngữ 1 bắt buộc | Khoa học; Lịch sử và Địa lí |
| 4–5 | Khoa học; Lịch sử và Địa lí; Tin học và Công nghệ | Tự nhiên và Xã hội; Khoa học tự nhiên |
| 6–9 | Ngữ văn; Giáo dục công dân; Khoa học tự nhiên; Công nghệ; Tin học | Tiếng Việt; Đạo đức; Khoa học; Tin học và Công nghệ |
| 6–9 | Ngoại ngữ 2 và Tiếng dân tộc thiểu số ở vai trò `optional`; Nội dung giáo dục của địa phương ở vai trò `required` | Ngoại ngữ 2 ở vai trò `required` |
| 10–12 | Lịch sử `required`; Địa lí, Giáo dục kinh tế và pháp luật, Vật lí, Hoá học, Sinh học, Công nghệ, Tin học, Âm nhạc, Mĩ thuật đều `elective_choice` (đúng 9 môn) | Lịch sử và Địa lí; Khoa học tự nhiên; Lịch sử ở vai trò `elective_choice` |
| 11 (Tin học) | Track `ict` và `cs` trong cùng một card Tin học | Hai card Tin học riêng |

**Nguồn chuẩn hóa:** [Văn bản hợp nhất Chương trình giáo dục phổ thông](https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-chuong-trinh-tong-the.pdf) và [Văn bản hợp nhất Thông tư 32/2018 cùng các sửa đổi](https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-ttu-322018-202021-132022-ttbgddt.pdf), Bộ Giáo dục và Đào tạo.

---

## 3. Kiến trúc hệ thống

```
scipal/                          ← Turborepo monorepo root
├── backend/                     ← Node.js + Fastify → VM (Docker)
├── frontend/                    ← Next.js 15 (App Router) → Vercel
├── mobile/                      ← Expo 52 (React Native) → EAS
├── packages/
│   ├── ui/                      ← Design tokens, SubjectProvider, shared components
│   ├── types/                   ← Zod schemas: Block, Question, Subject
│   ├── hooks/                   ← useLanguage, useProgress, useStreak
│   └── supabase/                ← Typed Supabase client (browser + server)
└── supabase/
    ├── migrations/              ← Versioned SQL migrations
    └── seed/                    ← Subjects + Informatics sample lesson
```

### Luồng dữ liệu

```
Client (web/mobile)
  ↓ fetch content/progress
Supabase (Postgres + Auth)   ← RLS on all user tables
  ↑ service_role only
backend/ (Fastify on VM)
  ↓ proxies AI calls (key hidden server-side)
Claude API / OpenAI API       ← provider-agnostic interface
```

---

## 4. Danh sách module và màn hình cốt lõi

| # | Màn hình | Dependency chính |
|---|----------|-----------------|
| S0 | Education Level Gate (Chọn cấp học) | landing spec, profile preference |
| S1 | Navigation (Nav Bar) | Design tokens, subject registry |
| S2 | Public Landing (Trang chủ theo cấp, catalog có tab lớp) | S0, S1, subject-grade availability |
| S3 | Lesson List (Danh sách bài học) | S1, lessons + topics |
| S4 | Lesson View (Xem bài học) | S3, block renderer, glossary |
| S5 | AI Tutor (Gia sư AI) | S4, `/api/ai/chat` |
| S6 | Glossary (Từ điển thuật ngữ) | S1, terms |
| S6b | Resources (Tài nguyên học tập) | S1, resources |
| S7 | Progress / Streak / Badges | S4, `/api/score/lesson` |
| S8 | Profile (Hồ sơ) | S7, auth |
| S9 | Exam Mode (Thi thử) | S7, `/api/score/exam`, blueprints |
| S10 | Authoring (Soạn nội dung) | auth role + backend service role |
| S11 | Class Management (Quản lí lớp) | S8, class_rooms, assignments |
| S12 | Survey & Feedback (Khảo sát) | E7, S8 |

---

## 5. Đặc tả từng màn hình

### S0 — Education Level Gate (Chọn cấp học)

**Phạm vi:** Chỉ là cổng trải nghiệm trang chủ, không phải cơ chế phân quyền hay xác nhận lớp học chính thức.

**Hành vi chuẩn:**
- Giá trị hợp lệ: `primary | lower_secondary | upper_secondary | null`.
- `null` → hiển thị vùng chọn ba cấp; không mặc định THPT và không có nút bỏ qua.
- Chọn cấp là thao tác duy nhất của cổng lần đầu. Sau đó landing mở ngay; không hỏi lớp trong onboarding.
- Khách lưu `preferred_education_level` trên thiết bị; user đăng nhập lưu giá trị này vào `profiles` qua phiên Supabase/RLS.
- Lớp 1–12 chỉ xuất hiện thành tab lọc bên trong catalog S2/S3. Tab đang xem không phải lớp học chính thức và không lưu vào hồ sơ người dùng.
- Tiểu học và THCS hiển thị đầy đủ các môn đúng tab lớp; môn chưa có học liệu dùng trạng thái `compiling`, không gom toàn cấp thành một trạng thái chung.
- Chi tiết layout, theme, trạng thái dữ liệu và nghiệm thu tuân theo landing spec ngày 25/09.

### S1 — Navigation Bar

**Cấu trúc:**
- Logo SciPal (4-leaf clover icon + wordmark "SciPal")
- Background: `bg-[--scipal-green]` (light green brand color)
- Menu items: Môn học · Cách học · Về AI
- EN/VI language toggle (pill button)
- Online/Offline status pill (dot + label)
- "Bắt đầu" (Start) CTA button → accent color
- Điều khiển "Đổi cấp học" xuất hiện ở vị trí được landing spec quy định; thay đổi này không đổi role, XP hoặc lớp học chính thức.

**Quy tắc màu:**
- Trong lesson/app shell, nav dùng `--scipal-green` và không thay đổi theo môn. Riêng S0/S2 dùng level token theo landing spec.
- CTA trong subject scope dùng `--accent`; CTA landing dùng `--landing-action`, không lấy màu một môn làm màu thương hiệu
- Subject switcher dropdown hiển thị màu từng môn

**State:**
- Khi offline: Offline pill hiện, AI Tutor + streak sync bị vô hiệu hoá
- Subject switcher: chọn môn → `SubjectProvider` cập nhật `--accent`

---

### S2 — Public Landing (Trang chủ theo cấp, catalog có tab lớp)

**Vai trò:** Cửa vào công khai cho khách mới sau S0. S2 không phải dashboard cá nhân; tiến độ, streak và hồ sơ nằm ở S7/S8.

**Layout và copy:**
- Theo [`2026-09-25-public-landing-field-notebook-design.md`](./2026-09-25-public-landing-field-notebook-design.md).
- Hero và hành trình học thay đổi theo cấp đã chọn. Ngay trên catalog là các tab lớp thuộc cấp đó: `1–5`, `6–9` hoặc `10–12`, theo bố cục tham chiếu trong ảnh người dùng cung cấp.
- Catalog phải có một tab hoạt động ngay khi mở, không tạo thêm bước bắt buộc. Nếu URL có `grade` hợp lệ thì dùng giá trị đó; nếu không, chọn lớp nhỏ nhất trong cấp đang có ít nhất một môn `available`, hoặc lớp đầu dải khi chưa lớp nào có học liệu.
- Mọi cấp đều hiện đầy đủ môn áp dụng cho tab lớp đang hoạt động. Môn có bài xuất bản + route hoạt động là `available`; môn đúng chương trình nhưng chưa có học liệu là `compiling`.
- Không render môn ngoài chương trình của tab lớp, kể cả môn đó có dữ liệu ở lớp khác cùng cấp học.
- Tutor preview là nội dung chuẩn bị sẵn cho tới khi API AI trực tiếp được triển khai và xác minh; không dùng trạng thái online, ô nhập hoặc copy khiến người xem tưởng đây là chat thật.
- Không hiển thị số liệu, lớp/trường, đánh giá, đối tác hoặc năng lực sản phẩm chưa được xác minh.

**Tương tác:**
- Chọn cấp → landing mở ngay → đổi tab lớp trong catalog khi cần; đổi cấp/tab không làm thay đổi dữ liệu học tập hoặc hồ sơ lớp chính thức.
- Đổi tab cập nhật `grade` trong URL để back/forward và link chia sẻ giữ đúng danh sách, nhưng không ghi `preferred_grade` vào profile.
- Click thẻ môn `available` → `SubjectProvider` set `--accent` trong phạm vi môn → điều hướng S3 với `grade` hiện tại, ví dụ `/informatics?grade=11`.
- `compiling` → card không có link và hiện “Đang biên soạn”; `error` phải khác `compiling`, có copy và nút tải lại phù hợp.

---

### S3 — Lesson List (Danh sách bài học)

**Layout:**
- Header: tên môn + icon + màu `--accent`
- Tab lớp của cấp đang xem; tab ban đầu đọc từ `grade` hợp lệ trên URL do S2 truyền sang.
- Topic accordion: mỗi topic là một accordion group
  - Lesson cards bên trong: tiêu đề + status chip (chưa học / đang học / hoàn thành)
  - Progress bar theo màu `--accent`
- Grade filter lấy từ `subject_grade_catalog`; chỉ cho chọn lớp có bản ghi áp dụng của môn. Cấp đang xem suy ra từ `grade` trên URL (deep link không cần trạng thái S0). Nếu URL thiếu/sai `grade`, chọn lớp nhỏ nhất có bài xuất bản, hoặc lớp áp dụng đầu tiên của môn.
- Track filter (chỉ khi môn có `subject_tracks` ở lớp đó), đọc/ghi `track` trên URL; bài `track = null` luôn hiện.
- Chỉ truy vấn `topics` và `lessons` của đúng `subject_id + grade`; không trộn bài của lớp khác để lấp trạng thái trống. Topic không có bài đã xuất bản không được render.
- Search bar (client-side filter)

**Luồng nội dung:** Click một môn không mở thẳng bài. S3 luôn hiển thị danh sách `lớp → chủ đề → bài học`; người dùng chọn bài trong topic để vào S4.

**Data:**
```
topics (subject_id, grade) → lessons (topic_id, status = 'published', track?)
```

---

### S4 — Lesson View (Xem bài học)

**Layout:**
- Breadcrumb: Môn → Topic → Bài học
- Block renderer: render từng block theo thứ tự trong `lessons.blocks`
- Floating: AI Tutor button (bottom-right), language toggle (top-right)
- Footer nav: Bài trước / Bài tiếp theo

**Chế độ song ngữ:**
- `en`: nội dung tiếng Anh; thuật ngữ có hỗ trợ tra cứu/phát âm.
- `vi`: nội dung tiếng Việt.
- `parallel`: hiển thị EN–VI song song trên màn hình đủ rộng, xếp tuần tự trên mobile.
- `scaffolded`: ưu tiên tiếng Anh, cho phép mở từng phần hỗ trợ tiếng Việt; không giấu nội dung thiết yếu khỏi công nghệ hỗ trợ.

**Điều chỉnh theo lứa tuổi:** Dùng cùng block schema nhưng cấu hình mật độ chữ, độ dài đoạn, kiểu phản hồi và nhịp tương tác theo `education_level`. Tiểu học không dùng nguyên xi bố cục, copy hoặc khối lượng đọc của THPT.

**8 loại block:**

| Block type | Mô tả |
|-----------|-------|
| `theory` | Văn bản lý thuyết song ngữ, hỗ trợ Markdown + KaTeX inline |
| `code` | Code editor multi-tab: Python / C++ / JavaScript. Tab mở đầu = `profiles.preferred_code_language` (khách: lưu trên thiết bị), đổi tab thì ghi nhớ lựa chọn; chỉ là tùy chọn hiển thị, không ảnh hưởng chấm điểm |
| `exercise` | Bài tập lập trình tham chiếu `coding_exercises` (xem E9); client chỉ nhận đề + test mẫu công khai |
| `formula` | Công thức KaTeX độc lập + caption song ngữ |
| `quiz` | Câu hỏi nhúng (tham chiếu ID → bảng questions) |
| `interactive` | Mô phỏng tương tác (xem bên dưới) |
| `term-ref` | Thẻ thuật ngữ inline → liên kết sang Glossary |
| `resource-ref` | Thẻ tài nguyên: link, ảnh thu nhỏ, mô tả |

**Interactive block — 5 loại kind:**

| Kind | Mô tả | Offline? |
|------|-------|---------|
| `algorithm-sim` | Mô phỏng thuật toán bước từng bước (dùng D3 / custom) | ✅ |
| `function-graph` | Đồ thị hàm số kéo-thả (Desmos-style) | ✅ |
| `geometry-3d` | Khám phá hình học 3D (Three.js) | ✅ |
| `experiment` | Thí nghiệm ảo (PhET embed, online-only) | ❌ |
| `bio-diagram` | Sơ đồ sinh học có nhãn tương tác | ✅ |

**Hoàn thành bài học:**
- Khi user cuộn tới cuối + trả lời đủ quiz → gọi `POST /api/score/lesson` kèm `idempotency_key` sinh ở client (dùng lại khi retry/đồng bộ offline)
- Server ghi `progress`, `xp_log`, kiểm tra `streak`, trả về badges mới
- Client hiển thị "Chúc mừng" modal với XP + badge

---

### S5 — AI Tutor (Gia sư AI)

**Trigger:** Floating button ở S4, hoặc menu "AI Tutor" trực tiếp

**Layout:**
- Chat panel (slide-up on mobile, side panel on web)
- Header: avatar bot + tên môn + badge "AI" màu `--accent`
- Message list: bubble chat song ngữ
- Input: text field + mic button (E6 voice Q&A)
- Suggested prompts: 3–4 gợi ý dựa trên bài học hiện tại

**API:**
```
POST /api/ai/chat
Body: { lesson_id?, subject_id?, grade?, messages, language_mode: 'en'|'vi'|'parallel'|'scaffolded' }
→ Stream SSE response
```

Mở từ S4 → gửi `lesson_id`; backend tự suy subject/grade/objectives từ bài và bỏ qua `subject_id`/`grade` client gửi. Mở từ menu → không có `lesson_id`; gửi `subject_id` + `grade` (đã kiểm tra với catalog) làm ngữ cảnh chung, RAG chỉ lấy từ bài đã xuất bản của cặp đó. Thiếu cả hai → tutor chung, không RAG.

**RAG context:**
- Backend fetch lesson blocks + related terms từ Supabase
- Build system prompt theo `education_level`, grade, subject, lesson, language và learning objectives. Một provider có thể đảm nhiệm nhiều vai môn học; không cần một API riêng cho mỗi môn.
- Stream Claude/OpenAI response → SSE chunks

**Quy tắc sư phạm và an toàn:**
- Ưu tiên gợi ý từng bước, câu hỏi dẫn dắt và giải thích; không đưa đáp án hoàn chỉnh ngay khi bài đang được chấm.
- Không hoạt động trong phiên thi: backend từ chối `/api/ai/chat` khi user có `exam_attempts` đang `in_progress` và chưa hết hạn.
- Câu trả lời phải phân biệt nội dung trong học liệu với kiến thức bổ sung; không tự nhận là nguồn chính thức.
- Áp dụng giới hạn nội dung theo lứa tuổi, cơ chế báo phản hồi và logging tối thiểu không chứa bí mật hoặc âm thanh thô.
- UI chỉ gọi là AI trực tiếp khi `/api/ai/chat` đã đăng ký, xác thực và được kiểm thử end-to-end.

**Offline:** Button disabled, tooltip "Cần kết nối mạng để dùng AI Tutor"

---

### S6 — Glossary (Từ điển thuật ngữ)

**Layout:**
- Search bar + alphabet quick-jump (A–Z hoặc theo tiếng Việt)
- Filter: Tất cả môn / Tin học / Toán / ...
- Term card: term_en / term_vi · part_of_speech · definition (song ngữ) · ví dụ
- Audio button (E6): phát âm term_en → TTS pre-generated URL
- "Xem trong bài học" link → S4 scroll tới block chứa term này

**Nguồn chuẩn:** `terms` là nguồn dịch thuật ngữ duy nhất trong app. Mỗi mục từ có nguồn tham chiếu, trạng thái duyệt và ngày rà soát; tài liệu từ điển/SGK có bản quyền chỉ dùng để đối chiếu, không sao chép nguyên văn thành kho công khai.

---

### S6b — Resources (Tài nguyên học tập)

**Layout:**
- Filter: môn + category (practice / reference / simulation)
- Resource card: tiêu đề + mô tả song ngữ + thumbnail + nút "Mở"
- Simulation resources → mở PhET embed trong modal (online-only)

---

### S7 — Progress / Streak / Badges

**Layout:**
- Header: tổng XP + level badge
- Streak calendar: 7 ngày gần nhất của **streak tổng** (ô màu `--scipal-green` nếu có học bất kỳ môn nào)
- Subject progress bars: mỗi môn 1 thanh tiến trình màu `--accent` của môn đó, kèm streak theo môn
- Badge wall: grid huy hiệu (earned = màu, unearned = grayscale)
- "Mục tiêu tuần này" (Weekly Goal) mini-section

**Data source:**
- `progress` + `xp_log` + `streaks` + `user_badges` → Supabase RLS queries
- XP/streak/badge chỉ được cập nhật bởi backend (`/api/score/*`), không phải client

---

### S8 — Profile (Hồ sơ)

**Layout:**
- Avatar + display_name + role (student / teacher)
- Thống kê: tổng bài hoàn thành · XP · ngày học liên tiếp dài nhất (streak tổng)
- Cài đặt: ngôn ngữ mặc định, thông báo, tài khoản
- Đăng xuất
- Nếu role = teacher → link sang S11 Class Management

---

### S9 — Exam Mode (Thi thử)

**Layout:**
- Chọn đề: theo grade + môn + blueprint_id
- Bắt đầu → `POST /api/exam/:blueprintId/attempts` tạo `exam_attempts` với `started_at`, `expires_at` do server tính từ blueprint
- Timer countdown hiển thị theo `expires_at` của server; bài nộp sau `expires_at` + grace period nhỏ bị từ chối hoặc chấm theo quy tắc blueprint, không tin đồng hồ client
- Question view: 1 câu / trang (có thể switch)
  - MC: 4 options
  - TrueFalse: 4 sub-statements
  - Short: text input
- Answer palette: grid ô câu (màu: chưa làm / đã làm / đánh dấu)
- Submit → `POST /api/score/exam` → kết quả breakdown

**Bảo mật:**
- Đáp án không bao giờ gửi xuống client
- Short answer: graded server-side, rubric optional

**Khuôn đề là dữ liệu:**
- Khối 10–11 dùng blueprint mặc định gồm 18 câu trắc nghiệm 4 lựa chọn, 3 câu đúng/sai (mỗi câu 4 ý) và 3 câu trả lời ngắn, trừ khi nguồn chương trình đã duyệt quy định khác.
- Khối 12 dùng blueprint riêng theo môn, năm áp dụng và tài liệu chính thức; không hard-code một cấu trúc vĩnh viễn trong code.
- Mỗi blueprint có `version`, `academic_year`, `source_ref`, `status` và quy tắc tính điểm.
- Mỗi question gắn `objective_id`, subject, grade, difficulty và nguồn để sinh ma trận đề có thể kiểm tra.
- Luyện tổ hợp ghép các môn THPT có trong catalog và có blueprint `published`; môn chưa có blueprint không xuất hiện trong lựa chọn tổ hợp. Tổ hợp là dữ liệu cập nhật theo năm, dùng chung engine đề; không tự gán mã xét tuyển hoặc tuyên bố được một trường chấp nhận khi chưa có nguồn.

---

### S10 — Authoring Tool (Soạn nội dung — Teacher)

**Phạm vi:** User đăng nhập bằng Supabase JWT. Backend xác minh `app_metadata.app_role` và quyền trên tài nguyên trước khi thực hiện hành động quản trị. `service_role` chỉ tồn tại trong backend, không bao giờ được cấp cho teacher, trình duyệt hoặc mobile.

**Layout:**
- Lesson editor: drag-drop block builder (8 block types)
- Block palette: click to add block type
- Theory block: rich text editor song ngữ (en/vi tabs)
- Code block: Monaco editor với syntax highlight
- Formula block: KaTeX live preview
- Quiz block: form tạo câu hỏi MC / TrueFalse / Short
- Interactive block: chọn kind + nhập config JSON
- Preview mode: xem bài như student
- Review action: teacher gửi `draft/rejected` → `pending_review`; admin duyệt hoặc từ chối

**Data flow:**
- Save draft → `PATCH /api/authoring/lessons/:id` (backend xác minh role rồi mới dùng service role nội bộ)
- Approve bởi admin → `status = 'published'`, ghi `reviewed_by`, `reviewed_at`, `published_at`; reject → `status = 'rejected'` kèm `review_note`
- Sửa bài đã `published` tạo bản nháp mới; bản đang xuất bản vẫn hiển thị cho tới khi bản mới được duyệt

**Xuất bản:** Lesson, question, term và resource dùng chung vòng đời `status: draft | pending_review | published | rejected` cùng `reviewed_by`, `reviewed_at`, `review_note`. Người soạn không mặc nhiên được tự duyệt nếu chính sách triển khai yêu cầu admin phê duyệt.

---

### S11 — Class Management (Quản lí lớp — Teacher)

**Layout:**
- Danh sách lớp: tên + môn + số học sinh + invite_code (copy button)
- Tạo lớp mới: form chọn môn + tên lớp → server tạo invite_code ngẫu nhiên
- Chi tiết lớp:
  - Danh sách học sinh (từ class_members)
  - Progress overview: mỗi học sinh đã hoàn thành bao nhiêu bài
  - Giao bài (assignment): chọn lesson hoặc exam_blueprint + due_at
- Assignment list: danh sách bài đã giao + trạng thái nộp
- Báo cáo theo học sinh, bài học và `objective_id`; export CSV/XLSX chỉ gồm dữ liệu giáo viên được phép xem và ghi nhận thời điểm xuất

---

### S12 — Survey & Feedback (Khảo sát nhu cầu & Phản hồi — E7)

**Mục đích:**
- Thu thập dữ liệu nhu cầu người dùng (môn nào muốn học trước, tính năng nào cần nhất)
- Nhận phản hồi sau mỗi bài học / sau mỗi phiên học

**Layout:**
- **Post-lesson micro-survey** (hiện sau khi hoàn thành S4):
  - Rating 1–5 sao cho bài học
  - "Bài này khó / vừa / dễ?" (3 option)
  - Optional text feedback (max 200 ký tự)
  - Dismiss after 2 seconds nếu user không tương tác
- **Subject demand survey** (lần đầu vào app, hoặc trigger từ S2):
  - "Bạn muốn học môn nào nhất?" (checkbox, multiple)
  - "Bạn học lớp mấy?" (1–12, tùy chọn; chỉ lưu trong `surveys.payload` để thống kê nhu cầu, không ghi vào `profiles` và không dùng làm lớp chính thức)
  - "Mục tiêu của bạn?" (thi THPT / học thêm / yêu thích)
- **Feature request** (trong S8 Profile):
  - Danh sách tính năng → vote up/down
  - Free-text "Tính năng bạn mong muốn"

**Database:**
```sql
surveys (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES profiles(id),  -- null = anonymous
  type        text NOT NULL,  -- 'post_lesson' | 'demand' | 'feature_request'
  payload     jsonb NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

**API:**
```
POST /api/survey
Body: { type, payload }
→ writes to surveys table (anon allowed for demand survey)
```

**Quyền riêng tư:**
- Khảo sát là tùy chọn, nêu rõ mục đích và không chặn việc học.
- Chỉ thu thập dữ liệu tối thiểu; feedback ẩn danh không được nối ngược với hồ sơ nếu không có căn cứ và thông báo rõ.
- UI chỉ báo gửi thành công sau khi server xác nhận; lỗi phải cho phép thử lại mà không nhân đôi bản ghi.

---

## 6. Content Block Schema (chi tiết)

```typescript
// Theory text — bilingual
type TheoryBlock = {
  type: 'theory';
  content: { en: string; vi: string };   // Markdown + KaTeX inline
};

// Code block with multiple language tabs
type CodeBlock = {
  type: 'code';
  tabs: Array<{ lang: 'python' | 'cpp' | 'javascript'; code: string }>;
};

// Standalone KaTeX formula
type FormulaBlock = {
  type: 'formula';
  katex: string;
  caption?: { en: string; vi: string };
};

// Embedded quiz question (reference by ID)
type QuizBlock = {
  type: 'quiz';
  question_id: string;   // uuid → questions table
};

// Interactive simulation / experiment
type InteractiveBlock = {
  type: 'interactive';
  kind: 'algorithm-sim' | 'function-graph' | 'geometry-3d' | 'experiment' | 'bio-diagram';
  heading: { en: string; vi: string };
  caption?: { en: string; vi: string };
  offline: boolean;
  embed_url?: string;    // PhET or similar, online only
  config: Record<string, unknown>;  // kind-specific params
};

// Term reference → links to Glossary
type TermRefBlock = {
  type: 'term-ref';
  term_id: string;       // uuid → terms table
};

// Programming exercise → coding_exercises (hidden tests stay server-side)
type ExerciseBlock = {
  type: 'exercise';
  exercise_id: string;   // uuid → coding_exercises table
};

// External resource card
type ResourceRefBlock = {
  type: 'resource-ref';
  resource_id: string;   // uuid → resources table
};

type Block =
  | TheoryBlock
  | CodeBlock
  | FormulaBlock
  | QuizBlock
  | InteractiveBlock
  | TermRefBlock
  | ResourceRefBlock
  | ExerciseBlock;
```

---

## 7. Question Schema

```typescript
type SourceRef = {
  title: string;
  organization_or_author?: string;
  year?: number;
  url_or_document_id?: string;
  referenced_scope?: string;
  usage_note?: string;
};

// Multiple-choice (4 options)
type MCData = {
  stem: { en: string; vi: string };
  options: Array<{ id: string; text: { en: string; vi: string } }>;
  answer: string;            // option id
  explanation?: { en: string; vi: string };
};

// True/False with 4 sub-statements
type TrueFalseData = {
  stem: { en: string; vi: string };
  items: Array<{ id: string; text: { en: string; vi: string }; correct: boolean }>;
  explanation?: { en: string; vi: string };
};

// Short answer
type ShortData = {
  stem: { en: string; vi: string };
  answer_key: string;        // kept server-side only
  rubric?: { en: string; vi: string };
};

type QuestionRecord = {
  id: string;
  subject_id: string;
  lesson_id?: string;
  objective_id: string;
  grade: number;
  type: 'mc' | 'truefalse' | 'short';
  difficulty: 'recognize' | 'understand' | 'apply' | 'advanced';
  data: MCData | TrueFalseData | ShortData;  // server-side source of truth
  source_refs: SourceRef[];
};
```

`QuestionRecord` là dạng lưu trữ phía server. DTO gửi cho học sinh phải loại `answer`, `answer_key`, `correct`, rubric chấm và mọi metadata có thể suy ra đáp án. Không cho client đọc trực tiếp JSONB nguồn của bảng `questions`.

---

## 8. Design Tokens

```css
/* Global — never changes */
--font-sans: 'Inter', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
--radius: 0.5rem;
--scipal-green: #16a34a;   /* brand color — 4-leaf clover logo */

--surface: #ffffff;          /* redefined in dark theme */

/* Per-subject — set by SubjectProvider on a scope element from subjects.accent_color.
   Values below are reference seeds only; the source of truth is the subjects table. */
--accent: #16a34a;          /* Informatics (green)   */
/* --accent: #2563eb; */    /* Mathematics (blue)    */
/* --accent: #7c3aed; */    /* Physics (violet)      */
/* --accent: #0d9488; */    /* Chemistry (teal)      */
/* --accent: #65a30d; */    /* Biology (lime)        */

/* Derived semantic tokens (always from --accent; mix with surface so dark mode works) */
--accent-10: color-mix(in srgb, var(--accent) 10%, var(--surface));
--accent-20: color-mix(in srgb, var(--accent) 20%, var(--surface));
--btn-primary-bg: var(--accent);
--progress-fill: var(--accent);
--badge-border: var(--accent);
```

---

## 9. Database Schema

### 9.1 Content tables

```sql
curriculum_versions (id, code, name_vi, issued_by, source_ref jsonb, effective_from, effective_to, status, created_at)
subjects (id, slug, name_en, name_vi, accent_color, icon, icon_url, sort_order, created_at)   -- name/accent/icon NOT NULL; icon_url nullable
subject_grade_catalog (id, curriculum_version_id, subject_id, grade, curriculum_role, source_ref jsonb, sort_order, active, created_at)
subject_tracks (id, subject_id, slug, name_en, name_vi, grades int[], sort_order)
topics (id, subject_id, grade, kind, slug, name_en, name_vi, sort_order)   -- kind: 'core' | 'elective_topic'
lessons (id, topic_id, subject_id, track_id, slug, title_en, title_vi, grade, objectives jsonb, digital_competency jsonb, blocks jsonb, source_refs jsonb, sort_order,
         status, reviewed_by, reviewed_at, review_note, published_at, created_at, updated_at)
terms (id, subject_id, term_en, term_vi, part_of_speech, definition_en, definition_vi, example_en, example_vi, audio_url, source_refs jsonb,
       status, reviewed_by, reviewed_at, review_note, tags)
questions (id, subject_id, lesson_id, type, difficulty, objective_id, grade, data jsonb, source_refs jsonb,
           status, reviewed_by, reviewed_at, review_note, created_at)
exam_blueprints (id, name, grade, subject_id, version, academic_year, source_ref jsonb, sections jsonb, scoring_rules jsonb, duration_seconds, status)
exam_combinations (id, slug, name_en, name_vi, subject_ids uuid[], academic_year, source_ref jsonb, active)
coding_exercises (id, lesson_id, subject_id, grade, prompt jsonb, starter_code jsonb, sample_tests jsonb, hidden_tests jsonb,
                  limits jsonb, languages text[], source_refs jsonb, status, reviewed_by, reviewed_at, review_note)
resources (id, subject_id, url, title_en, title_vi, description_en, description_vi, category, license_note, sort_order,
           status, reviewed_by, reviewed_at, review_note)
```

`status` của lesson/term/question/resource chỉ nhận `draft | pending_review | published | rejected`; không còn cột `published` boolean hay `review_status` riêng. `lessons.track_id` null = dùng chung mọi track; nếu khác null phải thuộc `subject_tracks` của cùng môn và lớp. `topics.grade` phải khớp `lessons.grade` của các bài bên trong.

`subject_grade_catalog` có unique key `(curriculum_version_id, subject_id, grade)`. `grade` chỉ nhận 1–12; `curriculum_role` chỉ nhận `required | elective_choice | optional | required_activity`. Không dùng `subjects.education_level`, `min_grade/max_grade` hoặc một cờ `status` cấp môn làm nguồn quyết định vì chúng không biểu diễn được các thay đổi theo từng lớp.

Trạng thái card là projection ở lớp đọc dữ liệu, không phải cờ biên tập thủ công: catalog đang hiệu lực + có bài cùng lớp `status = 'published'` → `available`; catalog đang hiệu lực nhưng chưa có bài xuất bản → `compiling`; không có catalog row → `not_applicable`; truy vấn thất bại → `error`. Seed bắt buộc bung mọi dải lớp thành các row riêng và có test chống trùng/thiếu cặp môn–lớp.

`source_refs` lưu dữ liệu thư mục tối thiểu: tên nguồn, cơ quan/tác giả, năm, URL hoặc mã tài liệu, phạm vi đã tham chiếu và ghi chú quyền sử dụng. Không lưu bản sao toàn văn chỉ vì tài liệu đã được dùng để đối chiếu.

### 9.2 User tables

```sql
profiles (id, display_name, role, avatar_url, preferred_education_level, default_language_mode, preferred_code_language, created_at)   -- preferred_code_language: 'python' | 'cpp' | null
progress (id, user_id, lesson_id, completed_at, score)
xp_log (id, user_id, subject_id, delta, reason, idempotency_key, created_at)   -- unique (user_id, idempotency_key)
streaks (user_id, subject_id, current_streak, longest_streak, last_active)   -- subject_id null = streak tổng
exam_attempts (id, user_id, blueprint_id, status, started_at, expires_at, submitted_at, score, answers jsonb)   -- status: in_progress | submitted | expired
badges (id, subject_id, name_en, name_vi, icon, condition jsonb)
user_badges (user_id, badge_id, earned_at)
class_rooms (id, teacher_id, subject_id, name, invite_code, created_at)
class_members (class_id, student_id, joined_at)
assignments (id, class_id, lesson_id, blueprint_id, due_at, created_at)
surveys (id, user_id, type, payload jsonb, created_at)   -- E7
consent_records (id, user_id, policy_version, consent_type, granted_by, guardian_contact_hash, granted_at, revoked_at)
```

`consent_records.granted_by` nhận `self | guardian`. Người dùng dưới 16 tuổi cần đồng ý của cha mẹ/người giám hộ theo Nghị định 13/2023/NĐ-CP trước khi xử lý dữ liệu cá nhân ngoài mức tối thiểu để vận hành tài khoản; chỉ lưu hash liên hệ người giám hộ, không lưu thêm thông tin phụ huynh nếu tính năng không cần.

Tab lớp đang xem là navigation state của S2/S3, lấy từ `grade` trên URL và không lưu vào `profiles`. Chỉ `preferred_education_level` là sở thích khám phá được đồng bộ cho tài khoản; cả hai đều không phải hồ sơ lớp học đã xác minh.

### 9.3 RLS summary

- `profiles`, `progress`, `xp_log`, `streaks`, `user_badges`: user sees own rows only
- `class_rooms`: teacher sees own; students see joined rooms
- `class_members`, `assignments`: class members see
- `exam_attempts`: user thấy attempt của mình; tạo/nộp chỉ qua backend
- `curriculum_versions`, `subject_grade_catalog`, `subjects`, `subject_tracks`, `topics`, và `lessons`/`terms`/`resources` có `status = 'published'`: public read theo đúng trường cần thiết; write = backend service role sau authorization
- `coding_exercises`: không public read trực tiếp; học sinh nhận DTO không chứa `hidden_tests`/lời giải qua backend
- `questions`: không public read trực tiếp. Học sinh chỉ nhận DTO đã lọc qua backend hoặc safe view không chứa đáp án
- `surveys`: anon insert allowed (for demand survey); read = service_role only
- `consent_records`: user thấy bản ghi của mình; tạo/thu hồi qua luồng có audit, không public read

---

## 10. API Design

Base URL: `https://api.scipal.vn` / `http://localhost:3001` (dev)

All routes require `Authorization: Bearer <supabase_jwt>` except `/health` and `POST /api/survey` (anonymous allowed).

```
GET  /health                       → { status: 'ok' }

GET  /api/exam/:blueprintId/questions
  → student-safe DTO; strips answer, answer_key, correct, rubric

POST /api/exam/:blueprintId/attempts → { attempt_id, expires_at }  (server-owned timer)

POST /api/ai/chat                  → SSE stream AI tutor response
  Body: { lesson_id?, subject_id?, grade?, messages, language_mode: 'en'|'vi'|'parallel'|'scaffolded' }
  With lesson_id, backend derives subject, grade and objectives and ignores client context fields;
  subject_id/grade are validated against the catalog; rejected while an exam attempt is in progress

POST /api/tts                      → { url } (E6 voice)
  Body: { text, language: 'en'|'vi' }

POST /api/score/lesson             → server-authoritative XP grant
  Body: { lesson_id, answers: Answer[], idempotency_key, client_completed_at? }
  → { xp_earned, new_streak, badges_unlocked[] }
  Same idempotency_key → trả lại kết quả cũ, không cấp XP lần hai (dùng cho retry và đồng bộ offline)

POST /api/score/exam               → server-authoritative exam scoring
  Body: { attempt_id, answers: Answer[] }
  → { score, breakdown_by_topic[] }

POST /api/exercises/:id/submit     → chạy code trong Judge sandbox với hidden tests
  Body: { language: 'python'|'cpp', source, idempotency_key }
  → { passed, total, results[] }   (không trả input/expected của hidden tests)

POST /api/survey                   → write survey response (E7)
  Body: { type: 'post_lesson'|'demand'|'feature_request', payload }

PATCH /api/authoring/lessons/:id   → update lesson (authorized teacher/admin; service_role backend-only)
  Body: { title_en?, title_vi?, blocks?, expected_updated_at? }

POST /api/authoring/lessons/:id/submit → submit draft for review (teacher)

POST /api/admin/lessons/:id/review → approve or reject (admin only)
  Body: { action: 'approve'|'reject', note? }
```

Trong dòng mô tả API, `service_role` luôn có nghĩa là credential nội bộ của backend sau khi JWT/role/resource authorization thành công; không phải phương thức đăng nhập của teacher.

---

## 11. Offline Strategy

| Layer | Mechanism |
|-------|-----------|
| Web (Next.js) | Serwist service worker — caches lesson pages after first visit |
| Mobile (Expo) | Content fetched at lesson-list open time, stored in MMKV |
| Interactive blocks | Run in-browser (no network). PhET embeds = online-only (`offline: false`) |
| AI Tutor | Disabled UI when offline; shows "Cần kết nối mạng" tooltip |
| Progress event sync | Queued locally với `idempotency_key`, phát lại tuần tự qua `POST /api/score/lesson` khi reconnect; backend xác minh và khử trùng |

Offline không tự cấp XP, badge hoặc streak. Client có thể hiển thị tiến độ cục bộ đang chờ đồng bộ, nhưng thành tích chính thức chỉ đổi sau phản hồi thành công từ backend.

---

## 12. Security

- AI API key never leaves the VM
- XP/badges granted only by `backend/` (never client-side)
- `questions` source table không public read; student DTO loại toàn bộ answer fields trước khi gửi
- Exam answers submitted to `/api/score/exam`; correct answers never returned to client
- `SERVICE_ROLE` key referenced only in `backend/src/`, never in `frontend/`, `mobile/`, `packages/`
- Teacher/admin dùng JWT thường; backend xác minh `app_metadata.app_role` và quyền trên tài nguyên trước mọi thao tác service-role
- Dữ liệu trẻ vị thành niên tuân theo nguyên tắc tối thiểu hoá, mục đích rõ ràng, thời hạn lưu, khả năng xuất/xoá và phiên bản chính sách đồng ý phù hợp với cách triển khai thực tế
- Quyền micro phải được xin tại thời điểm sử dụng; mặc định không lưu âm thanh thô. Transcript chỉ lưu khi có mục đích được công bố và quyền truy cập phù hợp
- AI áp dụng giới hạn theo lứa tuổi, chống prompt injection từ nội dung/RAG, rate limit, lọc dữ liệu nhạy cảm và cơ chế báo nội dung không phù hợp
- Log không chứa JWT, API key, service-role key, đáp án đề thi, âm thanh thô hoặc dữ liệu cá nhân không cần thiết

---

## 13. Thứ tự xây dựng khuyến nghị

**Phase 0 — Public entry:**
S0 → S1 → S2 theo landing spec; seed catalog GDPT 2018 đầy đủ theo từng lớp **kèm nhận diện (tên EN/VI, icon, accent) cho mọi môn** trước khi render card, môn chưa có học liệu hiện `compiling`

**Phase 1 — Core web THPT (Tin học reference):**
S3 → S4 → S6 → S7; chỉ bật S5 sau khi API AI được kiểm thử end-to-end

Nội dung demo: Tin học 11, Chủ đề F *Giải quyết vấn đề với sự trợ giúp của máy tính* (Bài 17–31, kĩ thuật lập trình Python/C++) làm trước các chủ đề khác. **Bài 19 — Bài toán tìm kiếm** là bài mẫu vàng: đủ `theory`, `code` (Python + C++), `interactive` (`algorithm-sim` tìm kiếm tuần tự/nhị phân), `exercise`, quiz đủ ba dạng MC/TrueFalse/Short và `digital_competency`. Duyệt xong khuôn Bài 19 mới nhân ra các bài còn lại, ưu tiên cụm mảng (17–18) và sắp xếp (21–22).

**Phase 2 — Auth & Gamification:**
S8 → S7 (hoàn chỉnh) → S9

**Phase 3 — Teacher tools:**
S10 → S11

**Phase 4 — Survey & Expansion:**
S12 → thêm học liệu các môn THPT còn lại (ưu tiên Toán, Vật lí, Hoá học, Sinh học; thứ tự sau đó theo dữ liệu khảo sát E7) bằng dữ liệu đã duyệt

**Phase 5 — Tiểu học và THCS:**
Catalog lớp–môn đã hiện ở trạng thái `compiling` → bài mẫu vàng theo cấp → QA sư phạm/song ngữ → mới bật route và chuyển đúng cặp sang `available`

---

## 14. Mở rộng (E1–E12)

### E1 — Nội dung theo chuẩn chương trình
- Mỗi question có `objective_id` → chuẩn CTGDPT 2018
- Exam blueprint ánh xạ theo phân phối chuẩn (số câu theo chủ đề)

### E2 — Spaced Repetition
- Thuật toán SM-2 (hoặc FSRS) chạy trên backend
- `POST /api/review` → trả về flashcard queue ngày hôm nay

### E3 — Gamification nâng cao
- XP levels (1–50), leaderboard tuần (class + global)
- Seasonal badges (chuỗi 7 ngày / 30 ngày)

### E4 — Offline-first nâng cao
- Background sync queue (IndexedDB cho web, MMKV cho mobile)
- Conflict resolution: server wins cho XP/streak

### E5 — Đa ngôn ngữ mở rộng
- Thêm ngôn ngữ thứ 3 (ví dụ: Khmer, Lao) — cùng pattern `{ en, vi, km? }`

### E6 — Hỏi/Đáp bằng giọng nói
- Mic button ở S5 AI Tutor → Web Speech API (web) / expo-av (mobile)
- STT → text → gửi POST /api/ai/chat
- TTS: `POST /api/tts` → trả URL → play
- Glossary: audio button → phát TTS pre-generated cho term_en

### E7 — Khảo sát nhu cầu & Phản hồi người dùng (S12)
- Post-lesson micro-survey: rating + độ khó + optional feedback
- Subject demand survey: môn nào / lớp mấy / mục tiêu
- Feature request voting (trong Profile)
- Anonymous option cho demand survey
- Data dùng để ưu tiên lộ trình phát triển môn học tiếp theo

### E8 — Sư phạm song ngữ và thích nghi theo độ tuổi
- Đánh giá riêng khả năng hiểu kiến thức và khả năng dùng thuật ngữ tiếng Anh; không lấy trình độ tiếng Anh làm đại diện duy nhất cho năng lực khoa học
- Cho phép chuyển `en | vi | parallel | scaffolded` mà không mất vị trí đọc hoặc câu trả lời đang làm
- Mỗi bài có thể gắn nhãn năng lực số (`digital_competency` `{ en, vi }`, ví dụ đặt prompt, gỡ lỗi với AI) lấy từ kế hoạch dạy học; hiển thị ở đầu S4 cùng yêu cầu cần đạt
- Mỗi bài có chỉ báo mức ngôn ngữ, thuật ngữ trọng tâm và gợi ý phát âm; Tiểu học ưu tiên câu ngắn, âm thanh/hình ảnh có mục đích, THCS tăng dần giải thích, THPT dùng văn phong học thuật
- Bài mẫu vàng của mỗi cấp phải qua review sư phạm, song ngữ, khả năng tiếp cận và thiết bị yếu trước khi nhân rộng

### E9 — Chạy code và luyện tập trực tuyến
- Code mẫu Python/C++ có thể chạy trong sandbox phù hợp; trình soạn thảo trên client không phải môi trường chấm an toàn
- Bài chấm tự động đi qua backend/Judge service, giới hạn CPU, RAM, thời gian, network và kích thước output; test ẩn không gửi xuống client
- `coding_exercises.hidden_tests` và lời giải mẫu không public read (như `questions`); DTO học sinh chỉ gồm `prompt`, `starter_code`, `sample_tests`, `limits`, `languages`. Đề song ngữ `{ en, vi }`, mỗi ngôn ngữ trong `languages` phải có starter code và lời giải đã chạy qua toàn bộ test trước khi `published`
- Liên kết Codeforces/VNOI/LQDOJ hoặc dịch vụ ngoài được lưu ở `resources`, mở như tài nguyên bên ngoài và tuân thủ điều khoản/bản quyền; không sao chép đề hoặc lời giải về SciPal

### E10 — Quyền riêng tư và quản trị dữ liệu học sinh
- Công bố dữ liệu nào được thu thập, mục đích, thời hạn lưu và bên có quyền xem
- Có luồng xuất/xoá dữ liệu và thu hồi đồng ý phù hợp với cách triển khai ở trường; không thu thập trường/lớp/phụ huynh nếu tính năng không cần
- Báo cáo, leaderboard và khảo sát dùng định danh tối thiểu; không công khai thành tích cá nhân mặc định

### E11 — Nguồn học liệu và bản quyền
- Nội dung bám yêu cầu cần đạt của CTGDPT 2018 nhưng được biên soạn lại; không chép nguyên văn SGK, từ điển, đề hoặc hình có bản quyền khi chưa có quyền sử dụng
- Mọi lesson, term, question, resource có `source_refs` và trạng thái review
- Cấu trúc đề, tổ hợp và danh mục chương trình là dữ liệu có phiên bản; rà soát lại trước mỗi năm học/mùa thi

### E12 — Khả năng tiếp cận và thiết bị yếu
- Luồng chính dùng được bằng bàn phím và trình đọc màn hình; focus rõ, thứ tự đọc hợp lý, semantic HTML và nhãn EN/VI đúng ngôn ngữ
- Vùng chạm tối thiểu 44×44px, nội dung chịu được phóng chữ 200%, tương phản đạt WCAG 2.2 AA và không dùng màu làm tín hiệu duy nhất
- Tôn trọng `prefers-reduced-motion`; bài học không phụ thuộc animation, WebGL hoặc âm thanh để hiểu kiến thức cốt lõi
- Có chế độ giảm hiệu ứng/tài nguyên cho máy yếu; interactive nặng phải có fallback văn bản hoặc hình tĩnh có ý nghĩa

---

## 15. Component Library (packages/ui)

### Shared components (web + mobile via NativeWind)

| Component | Props | Ghi chú |
|-----------|-------|---------|
| `SubjectProvider` | `subject: Subject` | Sets `--accent` on scope div |
| `AccentButton` | `variant: primary\|outline` | Uses `--accent` for bg/border |
| `ProgressBar` | `value: 0–100` | Fill = `--accent` |
| `BadgeChip` | `badge: Badge, earned: bool` | Earned = color, unearned = gray |
| `StreakFlame` | `streak: number` | Flame icon + count |
| `LanguageToggle` | `lang, setLang` | EN/VI pill switcher |
| `LanguageModeToggle` | `mode, setMode` | EN / VI / parallel / scaffolded |
| `EducationLevelGate` | `value, onSelect` | S0; null requires an explicit choice |
| `GradeTabs` | `educationLevel, value, onChange` | S2/S3; tab lọc nội dung, không phải gate hoặc profile preference |
| `SubjectCatalogCard` | `subject, grade, curriculumRole, availability` | Chỉ render cặp áp dụng; `compiling` không có link; `error` có retry; hiện `icon_url` nếu có, không thì `icon` chữ |
| `BlockRenderer` | `blocks: Block[]` | Routes to sub-renderer by type |
| `TheoryRenderer` | `block: TheoryBlock` | Markdown + KaTeX |
| `CodeRenderer` | `block: CodeBlock` | Multi-tab Monaco/Prism; tab mặc định theo ngôn ngữ lập trình ưa thích |
| `ExerciseRenderer` | `exercise: StudentExerciseDTO` | Đề + test mẫu; nộp bài qua backend, không nhận hidden tests |
| `FormulaRenderer` | `block: FormulaBlock` | KaTeX display |
| `QuizBlock` | `question: Question` | MC / TrueFalse / Short |
| `ExamQuestionView` | `question: StudentQuestionDTO` | Never accepts server answer fields |
| `InteractiveRenderer` | `block: InteractiveBlock` | Routes to kind |
| `TermRefCard` | `term: Term` | Inline card + link |
| `ResourceRefCard` | `resource: Resource` | Thumbnail + CTA |
| `OnlinePill` | `online: boolean` | Green/red dot + label |
| `SurveyModal` | `type, onSubmit` | E7 survey UI |

---

*Spec này là tài liệu sống — cập nhật theo từng phase xây dựng.*
