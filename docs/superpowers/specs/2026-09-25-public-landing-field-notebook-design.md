# SciPal Public Landing — Field Notebook Design

**Ngày:** 25/09/2026
**Cập nhật:** 26/09/2026 — chỉ chọn cấp học ở cổng đầu; lớp là tab lọc trong catalog; khách giữ lựa chọn theo tab, tài khoản lưu trong hồ sơ.
**Trạng thái:** Đã triển khai và QA local; migration/seed từ xa và deploy còn chờ.
**Phạm vi:** Trang chủ công khai `/`, luồng chọn cấp học lần đầu, tab lớp trong catalog, điểm đổi cấp học trong `/profile`, và hợp đồng điều hướng sang danh sách chủ đề/bài học. Màu sắc của mẫu không phải ràng buộc.

## 1. Mục đích và tiêu chí thành công

SciPal đón học sinh Việt Nam lần đầu ghé thăm. Người xem chỉ chọn cấp học một lần để vào landing phù hợp, sau đó dùng tab lớp ngay trong catalog để xem đúng môn của từng lớp. Có thể đổi cấp lại trong Profile; tab lớp không phải dữ liệu hồ sơ. Mỗi card cho biết trung thực học liệu của cặp môn–lớp; Tin học là một lựa chọn bình đẳng và chỉ mở khi lớp đang xem có học liệu sẵn sàng. Cảm giác chủ đạo là **sổ tay trong phòng thí nghiệm ấm áp, hiện đại**: tò mò, rõ ràng, đáng tin và có chiều sâu thị giác.

Ưu tiên được người dùng chọn: **cân bằng vẻ đẹp và việc vào học**. Điểm nhấn thị giác phải giúp hiểu cách học; CTA chính phải dẫn tới nội dung đang dùng được. Thành công không được đo bằng một hiệu ứng đơn lẻ: trang cần kể một câu chuyện gọn, dùng được trên điện thoại, đọc được bằng bàn phím/trình đọc màn hình và không quảng bá tính năng chưa chạy thật.

## 2. Căn cứ hiện trạng và quyết định giữ lại

- `frontend/app/page.tsx` đang render `LandingPage`. Hero có hai CTA neo trang và `TutorDemoCard` về tìm kiếm nhị phân. Bên dưới là marquee năm môn, bốn thẻ tính năng, ba thẻ bước học, CTA cuối, khảo sát và footer. Nhiều section dùng cùng một nhịp card nên trải nghiệm đọc bị lặp.
- `SubjectGrid` lấy `active/upcoming` từ `SUBJECT_CONFIG`; nhãn “Sẵn sàng” hiện chưa phản ánh kết quả truy vấn bài học xuất bản. `/informatics` đọc Supabase và tại lúc khảo sát local đã mở được danh sách bài. Trạng thái local này không bảo đảm dữ liệu ở lần truy cập khác.
- `PROJECT_STATE.md` ngày 25/09 khóa navbar và nhịp demo Tutor: nội dung/hành vi navbar không đổi khi landing đã mở; demo Tutor tự phát theo từng lượt khi card vào viewport và giữ toàn bộ transcript sau đó, không có nút phát lại hay nhãn “Hội thoại minh họa”. Quyết định marquee môn học ngày 25/09 được yêu cầu mới ngày 26/09 thay thế bằng tab lớp + lưới card không nhân bản.
- AI Tutor trong hero là đoạn trả lời chuẩn bị sẵn, chưa kết nối AI trực tiếp. Landing không được diễn đạt nó như chat trực tuyến hoặc hứa “24/7”. Tin học là học liệu tham chiếu, không phải toàn bộ bản sắc SciPal.
- Đặc tả S2 cũ mô tả dashboard cá nhân. Trang `/` hiện được quyết định là cửa vào công khai cho khách mới. Thiết kế này chỉ thay thế cách trình bày S2 cho khách; hồ sơ, tiến trình, thi và quyền truy cập giữ nguyên.
- Mẫu tại `C:\Users\LE CHI AN\Downloads\scipal-web (1)\scipal-web` dùng màn chào với ba cấp Tiểu học (1–5), THCS (6–9), THPT (10–12), nút bỏ qua, lưu lựa chọn trong `localStorage`, rồi đổi bản trang chủ theo cấp. Mẫu có nội dung/AI mô phỏng cho cấp chưa mở; SciPal sẽ mượn mô hình lựa chọn và khả năng đổi lại, không sao chép màu hoặc các lời hứa chưa có căn cứ.
- SciPal hiện chỉ lưu bài học lớp 10–12 (`supabase/migrations/0002_content.sql`), `profiles` chưa có cấp học, và Profile đang in lớp 11A1/ID nhà trường giả. Bộ khảo sát nhu cầu hiện cũng chỉ có lớp 10–12. Luồng mới không được mặc nhận người chọn Tiểu học/THCS có bài, lớp, Tutor hoặc phiếu khảo sát phù hợp.
- Đối chiếu Impeccable với landing hiện tại: lưới trang trí phủ nền và chữ gradient bị detector nhận diện là họa tiết chung; chỉ giữ nét kẻ khi nó diễn đạt sổ tay/sơ đồ học. Thẻ tính năng và bước học lặp một nhịp; việc thêm bộ chọn cấp học phải làm rõ đường vào học thay vì thêm một tầng card vô ích.

### 2.1 Rà soát theo Impeccable

Detector trên `frontend/features/landing` ghi hai tín hiệu: `gradient-text` (warning, `landing.module.css:107`) và `codex-grid-background` (advisory, `landing.module.css:9`). Detector trên `frontend/features/profile` không ghi lỗi; điều đó không xác nhận nội dung Profile là thật. Đọc mã và xem màn hình cho thấy bốn rủi ro cần xử lý trong thiết kế: (1) bước chọn cấp bắt buộc thêm một thao tác trước lối vào học, nên phải hoàn tất chỉ bằng một lần chọn; (2) các cấp chưa có bài dễ bị trình bày như đang mở; (3) chữ “AI online”, lớp/ID trường và khảo sát báo thành công dù gửi lỗi tạo kỳ vọng sai; (4) các dãy thẻ và nền lưới lặp nhau làm SciPal thiếu điểm nhận diện. Vùng chào phản hồi ngay, trạng thái dữ liệu thật, copy trung thực và trang sổ tay gắn với sơ đồ học là câu trả lời cho bốn rủi ro này. Đây là review phục vụ đặc tả, không phải điểm số kiểm định UI sau triển khai.

## 3. Câu chuyện và thứ tự nội dung

### 3.0 Chọn cấp học lần đầu và chọn lại

Khách chưa chọn trong tab hiện tại, hoặc tài khoản đã đăng nhập chưa có preference trong Profile, đều thấy cổng chọn. Lựa chọn tab chỉ áp dụng cho khách chưa đăng nhập; tài khoản chỉ dùng giá trị trong `profiles`, nên phiên tài khoản không tự nhận lựa chọn tạm của khách. `/` hiển thị một **vùng chào cao gần một màn hình** mang ba lựa chọn như mẫu. Đây là trạng thái của trang, không phải overlay phủ cố định; landing theo cấp xuất hiện ngay sau khi chọn. Navbar luôn hiện ở cả cổng chọn và landing; switch EN/VI chỉ xuất hiện trên navbar, không nhân đôi trong hero hoặc cổng. Các route học công khai vẫn truy cập được bằng URL trực tiếp; đây là cổng trải nghiệm trang chủ, không phải thay đổi quyền truy cập. Các thẻ ghi rõ:

| Cấp | Dải lớp | Trạng thái ở SciPal |
|---|---|---|
| Tiểu học / Primary | 1–5 | Đang chuẩn bị / In development |
| THCS / Lower secondary | 6–9 | Đang chuẩn bị / In development |
| THPT / Upper secondary | 10–12 | Catalog riêng; từng môn thể hiện trạng thái theo học liệu công khai, Tin học chỉ sẵn sàng khi có bài xuất bản |

Không có nút “Bỏ qua, xem SciPal” hoặc lối vào nội dung trước khi chọn cấp học. Khách phải chọn một trong ba cấp để theme và nội dung landing hiển thị; không tự chọn THPT. Đây là lựa chọn bắt buộc duy nhất: không hỏi tiếp “Bạn học lớp mấy?”. Chọn cấp sẽ lưu lựa chọn, cập nhật giao diện phù hợp và chuyển focus tới tiêu đề vùng nội dung tiếp theo. Catalog bên dưới tự mở một tab lớp hợp lệ và cho đổi bằng các tab như mẫu người dùng cung cấp. Card môn dùng `available | compiling | error`; chỉ `available` có link. Một điều khiển “Đổi cấp học” gần phần môn học cho phép khách chọn lại. Trong `/profile`, mục “Cấp học khi khám phá” hiển thị cấp hiện tại và ba lựa chọn để đổi; không lưu tab lớp. Đây là sở thích xem nội dung, không phải lớp học chính thức hay vai trò tài khoản. Profile không hiển thị lớp/ID trường giả như giá trị đã được xác minh.

### 3.1 Màn hình đầu: từ câu hỏi tới bài học

Sau khi chọn cấp, hero dùng bố cục bất đối xứng hai vùng trên desktop, xếp chữ/CTA trước preview trên mobile. Trạng thái THPT dùng câu chữ chính:

| Vai trò | Tiếng Việt | English |
|---|---|---|
| Eyebrow THPT | Không gian học khoa học cho học sinh THPT | A science study space for high school students |
| Headline | Hiểu khoa học từ câu hỏi đầu tiên. | Make sense of science, one question at a time. |
| Mô tả | Khám phá khoa học qua câu hỏi, bằng chứng và bài học song ngữ. Chọn một môn để xem học liệu hiện có. | Explore science through questions, evidence, and bilingual lessons. Choose a subject to see what is available. |
| CTA chính | Xem các môn học | Explore subjects |
| CTA phụ | Xem cách học | See how learning works |

CTA chính cuộn tới catalog của cấp đã chọn; CTA phụ cuộn tới hành trình học. Với Tiểu học/THCS, hero nói rõ học liệu đang được chuẩn bị, không mời xem thử bài THPT và không mô phỏng đã có bài cho cấp đó. Trạng thái dữ liệu khác dùng hành vi ở mục 5.

### 3.2 Điểm nhấn thị giác: trang sổ tay học tập

Khi cấp đang xem là THPT, giữ `TutorDemoCard` nhưng chuyển transcript sang một câu hỏi khoa học tự nhiên chung, ví dụ “Vì sao bóng của một vật dài ngắn khác nhau trong ngày?” / “Why does an object's shadow change length during the day?”. Trình bày như một trang sổ tay quan sát: câu hỏi, hiện tượng cần quan sát, lời giải thích và câu hỏi tiếp theo; không gắn nhãn môn/lớp Tin học. Chiều sâu đến từ giấy xếp lớp, nét phác sơ đồ và chú giải song ngữ; sơ đồ là nội dung khoa học, không phải vật trang trí vô nghĩa. Không thêm ô nhập hoặc trạng thái online giả. Với Tiểu học/THCS, thay Tutor preview bằng một tờ báo học liệu của đúng cấp đang được chuẩn bị; không chèn tài liệu THPT hoặc CTA xem thử THPT.

Ghi chú nhỏ, luôn đọc được ở chân preview:

- VI: “Câu trả lời trong bản xem trước được chuẩn bị sẵn; gia sư AI trực tiếp chưa kết nối ở đây.”
- EN: “This preview uses a prepared answer; live AI tutoring is not connected here yet.”

Demo vẫn tự phát khi card vào viewport mỗi lần ghé landing, hiện lần lượt từng lượt thoại, giữ transcript đầy đủ sau khi phát, và không có điều khiển phát lại. Với `prefers-reduced-motion: reduce`, toàn bộ nội dung hiện ngay.

### 3.3 Môn học và lối vào học

Ngay sau hero là mục “Chọn nơi bắt đầu” / “Choose where to begin”. Đầu mục có một hàng tab lớp đúng dải của cấp đã chọn: `1–5`, `6–9` hoặc `10–12`. Đây là bộ lọc catalog, không phải bước thiết lập hồ sơ. Catalog luôn có đúng một tab hoạt động: ưu tiên `grade` hợp lệ trên URL; nếu không có, chọn lớp nhỏ nhất trong cấp đang có ít nhất một môn `available`, hoặc lớp đầu dải khi toàn cấp chưa có học liệu. Đổi tab cập nhật URL để back/forward và link chia sẻ giữ đúng trạng thái.

Bên dưới tab là lưới card các môn đúng chương trình của lớp đang xem, bám cấu trúc mẫu người dùng cung cấp: card tự xuống hàng theo viewport, không chạy marquee và không nhân bản item. Card có trọng lượng ngang nhau; không render môn chỉ thuộc lớp khác. Tin học là card bình thường và chỉ có link khi có bài đã xuất bản cho đúng lớp cùng route hoạt động. Môn đúng chương trình nhưng chưa có học liệu hiện “Đang biên soạn” / “In development”, không có link. Click card `available` mở route môn kèm lớp, ví dụ `/informatics?grade=11`; trang môn sau đó hiển thị `chủ đề → bài học` của lớp ấy, không mở thẳng một bài.

Các thẻ môn đã có route dùng `SubjectProvider` và `--accent` trong phạm vi thẻ. Danh sách tên, icon, trạng thái, màu và quan hệ lớp lấy từ `subjects` + `subject_grade_catalog`; các môn mới chưa có route dùng thẻ trung tính, không tự gán màu môn trong CSS. Không đưa `--accent` lên `:root`. Màu xanh thương hiệu `SCIPAL_GREEN` chỉ dành cho logo và navbar theo quy tắc dự án. Landing dùng token bề mặt riêng, không hard-code màu từng môn.

### 3.4 Một hành trình học thay cho các dãy card lặp

Thay bốn thẻ tính năng và ba thẻ bước học đồng dạng bằng một section biên tập có ba nhịp nối nhau:

1. **Bắt đầu từ một câu hỏi** — dùng hiện tượng khoa học chung làm ví dụ; CTA dẫn về catalog của cấp, không quảng bá một môn riêng.
2. **Quan sát và giải thích** — hiển thị một trích đoạn ngắn hai ngôn ngữ cạnh nhau hoặc xếp dọc trên mobile; ghi “Bản xem trước” nếu là nội dung tĩnh.
3. **Tra thuật ngữ** — dẫn tới `/glossary` bằng một thuật ngữ minh họa rõ ngữ cảnh, không giả lập kết quả tìm kiếm.

Hình thức là một đường đọc theo chiều dọc với một panel sản phẩm chính và các ghi chú nhỏ, không phải hàng thẻ bằng nhau. Các đoạn chữ ngắn, có cặp `{ en, vi }` và đổi theo `useLanguage()`. Không đặt nhãn “Ví dụ từ THPT” trên landing Tiểu học/THCS và không đưa ví dụ môn như học liệu đã phát hành khi chúng đang biên soạn.

### 3.5 Đoạn kết

CTA cuối ở mọi cấp mời xem catalog tương ứng và từ điển song ngữ; không biến Tin học thành CTA riêng. Chỉ THPT hiện `DemandPollBanner` vì biểu mẫu hiện có hỏi lớp 10–12. Khảo sát nói rằng phản hồi giúp SciPal hiểu nhu cầu, không cam kết môn nhiều phiếu sẽ được phát triển trước nếu chưa có chính sách đã xác minh. Nếu gửi khảo sát lỗi, modal không báo “đã ghi nhận”. Giữ địa chỉ liên hệ và hành vi navbar hiện tại, đổi nền navbar theo cấp đang chọn. Không thêm số liệu, lời chứng thực, đánh giá sao hay đối tác không có nguồn.

## 4. Hệ thị giác cho landing

Đặc tả này là nguồn thiết kế riêng cho landing và vùng cài đặt cấp học trong Profile. Nó kế thừa nhận diện SciPal và tham khảo chất giấy, nhịp chữ, đường viền nhẹ của hướng editorial; không sao chép màu, logo hay bố cục của mẫu. Không thay theme của toàn app.

| Vai trò | Token landing dự kiến | Giá trị | Cách dùng |
|---|---|---|---|
| Giấy nền | `--landing-paper` | `#F7F8F3` | Canvas chính |
| Giấy nổi | `--landing-surface` | `#FFFFFF` | Preview và vùng học |
| Mực chính | `--landing-ink` | `#17251D` | Tiêu đề, nội dung |
| Mực phụ | `--landing-muted` | `#4B6052` | Mô tả và chú thích |
| Nét kẻ | `--landing-line` | `#D8E5DC` | Chia lớp giấy, border nhẹ |
| Hành động | `--landing-action` | `#0C633B` | CTA landing có chữ trắng |
| Hành động hover | `--landing-action-hover` | `#084D2E` | Hover/pressed |
| Vùng tối | `--landing-deep` | `#123D2B` | Một panel kết thúc có chủ đích |

Đây là bộ token THPT. Ba cấp dùng chung cấu trúc sổ tay nhưng đổi palette và nhịp hình để landing thật sự phản ánh cấp đã chọn; token được đặt trên vùng landing `data-level`, không đặt `--accent` lên `:root` và không đổi màu môn học:

| Cấp | Giấy / mực / hành động | Cách thể hiện |
|---|---|---|
| Tiểu học | `#FFF8EF` / `#35271E` / `#8A3E1F` | Giấy ấm, nét cắt mềm, số lớp và dấu quan sát lớn; không dùng emoji làm hình chính hay mô phỏng bài học chưa có. |
| THCS | `#F3F7FD` / `#1D2C45` / `#245398` | Sổ thí nghiệm xanh nhạt, đường đo và khối thông tin rõ; không gắn nhãn AI trực tiếp. |
| THPT | `#F7F8F3` / `#17251D` / `#0C633B` | Sổ tay chính xác với sơ đồ quan sát hiện tượng khoa học và chú giải song ngữ. |

Màu chữ phụ và nét kẻ cũng thay theo cấp: Tiểu học `#5E493B`/`#E6D2BD`, THCS `#415571`/`#D4E0F0`, THPT dùng bảng trên. Trên nền giấy tương ứng, chữ phụ đạt ít nhất `6.3:1` và chữ trắng trên màu hành động đạt ít nhất `7.3:1` theo phép tính token; kiểm tra lại trên giao diện thật sau triển khai.

Font display dùng **Be Vietnam Pro** hiện đã tải ở `app/layout.tsx`; body dùng Inter hiện có; JetBrains Mono chỉ cho số/sơ đồ và nhãn kỹ thuật ngắn. Display desktop khoảng `clamp(3.5rem, 5.6vw, 5.5rem)`, mobile khoảng `clamp(2.45rem, 10vw, 3.6rem)`, line-height `1.04–1.1`; body tối thiểu `1rem`, chú thích tối thiểu `0.875rem`. Content width tối đa `1280px`, gutter mobile tối thiểu `16px`, section gap từ `64px` tới `96px` theo viewport. Preview dùng một lớp nổi rõ; các phần thông tin còn lại ưu tiên tương phản nền và khoảng trắng hơn nhiều card có viền/bóng.

Điểm nhận ra SciPal khi bỏ logo là **sơ đồ học trên trang sổ tay**: câu hỏi, quan sát, lời giải thích Việt–Anh và ghi chú đều nối thành một trải nghiệm. Thẻ chọn cấp học dùng số lớp và nhãn cấp thay cho emoji làm dấu nhận diện chính; không cấp nào hoặc môn nào được nâng thành trọng tâm bằng màu rực riêng. Không dùng chữ gradient làm tiêu đề hoặc nền lưới phủ toàn trang chỉ để trang trí. Đồ họa dùng SVG/CSS nhẹ hoặc asset nội bộ có kiểm tra kích thước; không thêm thư viện animation/3D.

## 5. Trạng thái dữ liệu và hành vi

### 5.1 Cấp học và quyền sở hữu lựa chọn

Giá trị cấp học là `primary | lower_secondary | upper_secondary | null`; `null` nghĩa là chưa chọn và bắt buộc hiện vùng chào, không được diễn giải thành THPT. Tài khoản lấy lựa chọn từ `profiles.preferred_education_level`; khách lấy lựa chọn từ `sessionStorage` với khóa `scipal_education_level_tab`. Lựa chọn khách giữ qua tải lại và điều hướng trong cùng tab, không dùng chung với tab khác và mất khi đóng tab. Không lưu cấp học trong cookie hoặc `localStorage`; middleware xóa cookie `scipal_education_level` cũ nếu còn. Giá trị không hợp lệ bị bỏ qua an toàn và quay lại vùng chào. Không có trạng thái “đã xem nhưng chưa chọn”.

Sau cổng cấp học, `catalogGrade` là trạng thái điều hướng của tab lớp, không phải preference hay bước onboarding. Giá trị hợp lệ bị giới hạn theo cấp: `1–5`, `6–9`, `10–12`. URL query `grade` giữ tab hiện tại; query thiếu/sai dùng quy tắc mặc định ở §3.3. Đổi cấp xóa `grade` không thuộc dải mới và chọn lại mặc định, không hỏi người dùng bằng một màn gate thứ hai. Không thêm `preferred_grade` vào profile, cookie tài khoản hoặc metadata auth.

**Đã được người dùng chọn:** thêm `profiles.preferred_education_level` nullable, có ràng buộc ba giá trị. Tài khoản đăng nhập chỉ đọc/ghi lựa chọn vào hàng `profiles` của chính họ qua phiên Supabase/RLS; không sao chép lựa chọn tài khoản vào cookie hoặc bộ nhớ trình duyệt. Khách lưu lựa chọn trong `sessionStorage` của tab hiện tại, giữ qua tải lại trong tab đó và mất khi đóng tab. Nếu ghi tài khoản thất bại, giao diện báo lỗi và giữ lựa chọn trước đó, không báo đã lưu. Tài khoản chưa có preference sẽ cần chọn; không dùng lựa chọn khách để tự điền preference tài khoản. Lựa chọn của tài khoản A không được hiện như đã đồng bộ trong tài khoản B. Không dùng service-role key ở frontend.

Profile đọc giá trị thực từ DB/cookie, hiển thị nhãn “Sở thích khám phá” và trạng thái chưa chọn khi phù hợp. Đổi cấp không sửa role, lớp học, XP, tiến độ, quyền truy cập hay dữ liệu bài học. Nhãn “Lớp 11A1 · THPT Chuyên”, ID học sinh/trường và câu “được nhà trường xác thực” hiện là dữ liệu mẫu, phải bỏ khỏi vùng Profile gắn với lựa chọn cấp học để tránh hiểu nhầm đây là hồ sơ đã xác minh.

### 5.2 Học liệu công khai

Đọc trạng thái học liệu công khai bằng quyền anon và chỉ trường cần thiết của `curriculum_versions/subject_grade_catalog/subjects/topics/lessons` đã xuất bản. Không gửi dữ liệu người dùng, đáp án, khóa service role hay AI key xuống landing. Mô hình hiển thị là ba trạng thái phân biệt cho từng cặp môn–lớp:

| Trạng thái cặp môn–lớp | Card trong catalog | Quy tắc |
|---|---|---|
| `available` — có ít nhất một bài cùng lớp đã xuất bản | Card có lối mở `/{subject}?grade={grade}` | Chỉ gọi “Sẵn sàng” khi truy vấn thành công và route đang mở; vẫn có trọng lượng ngang các môn khác |
| `compiling` — môn áp dụng cho lớp nhưng chưa có bài xuất bản | “Đang biên soạn” | Không hiển thị số bài giả hoặc CTA “Bắt đầu” |
| `error` — không kiểm tra được | “Chưa kiểm tra được bài học” và nút “Thử lại” | Không biến lỗi thành `compiling`; nút thử lại phải kích hoạt tải lại trạng thái |

Catalog landing lấy từ ma trận `subject_grade_catalog` của phiên bản chương trình đang hiệu lực. Mỗi tab chỉ render cặp áp dụng cho đúng lớp; không dùng `subjects.education_level` hoặc union toàn cấp làm nguồn quyết định. Thêm môn/lớp về sau là thao tác nạp dữ liệu, không thêm card vào mã giao diện. Dữ liệu catalog riêng lẻ không tự bật link: chỉ `available` khi bài cùng lớp đã xuất bản và route hoạt động. Nếu truy vấn catalog lỗi, hiển thị lỗi/tải lại, không biến lỗi thành “Đang biên soạn”; nếu catalog thực sự rỗng, hiển thị trạng thái rỗng. Việc kích hoạt môn mới qua dữ liệu cần được xử lý đồng bộ với route; landing không tạo link có thể dẫn tới 404.

Lưới card không nhân bản item và giữ thứ tự đọc DOM trùng với thứ tự nhìn thấy. Trên mobile card xếp một cột hoặc hai cột khi đủ rộng; hàng tab được cuộn ngang có kiểm soát nếu không đủ chỗ nhưng không làm toàn trang cuộn ngang. Các phần reveal luôn hiện được khi JavaScript, `IntersectionObserver` hoặc animation bị tắt; không để vùng nội dung trắng vì chưa được quan sát.

## 6. Responsive, accessibility và hiệu năng

- Kiểm tra tại `320`, `390`, `768`, `1024`, `1440px`. Ba lựa chọn cấp học xếp một cột trên điện thoại, vẫn đọc được khi phóng chữ 200% và xoay ngang. Tại mobile: hero chữ/CTA trước preview; lưới môn xếp theo bề rộng khả dụng; không cuộn ngang toàn trang; chỉ hàng tab lớp được cuộn ngang khi thật sự thiếu chỗ. Tablet không để hai cột ép chữ hoặc preview tràn.
- Tất cả CTA/điều khiển, gồm thẻ cấp học và nút đổi lại, có vùng chạm tối thiểu `44×44px`, trạng thái focus rõ, thứ tự tab theo thứ tự đọc, nhãn liên kết nêu đích đến. Màu chữ thân đạt ít nhất `4.5:1`, chữ lớn và thành phần UI ít nhất `3:1` trên bề mặt thực tế. Khi vùng chào xuất hiện, tiêu đề của nó là `h1`; sau khi chọn cấp, hero là `h1`. Chọn cấp chuyển focus hợp lý, không có bẫy focus. Hero và hành trình không dựa vào màu để giải thích.
- `lang` của vùng landing, vùng chào và mục Profile khớp ngôn ngữ đã chọn. Mọi chuỗi mới có đủ EN/VI và dùng `useLanguage()`; đoạn preview trình bày đồng thời hai ngôn ngữ phải gắn `lang` tương ứng cho từng trích đoạn.
- Motion chỉ ở transcript, phản hồi CTA và reveal nhẹ của vùng phụ. Dùng `transform/opacity`; reduced motion bỏ chuyển động mà không bỏ nội dung. Không dùng cuộn quán tính tùy biến hay hiệu ứng giữ scroll.
- Trước khi đổi UI, đo baseline trang `/` ở mobile và desktop trên production build; ghi LCP, CLS, lượng JS/ảnh truyền tải và số request. Sau đổi, đo cùng cấu hình ít nhất ba lần lấy median cho khách lần đầu và khách quay lại. Luồng tùy chọn không được làm hero chớp/đổi vị trí sau hydrate. Không chấp nhận CLS vượt `0.1`, nội dung đầu trang bị che bởi animation, hay tăng tài nguyên mà không có giá trị thị giác đã được kiểm chứng. Chỉ kết luận từ phép đo đã chạy.

## 7. Ranh giới triển khai

Được sửa: `frontend/app/page.tsx` (tải trạng thái công khai, sở thích cấp học, tab lớp từ URL và metadata riêng cho `/`), `frontend/features/landing/*` (bố cục, vùng chọn cấp, copy, token cục bộ và hàm đọc trạng thái), `frontend/features/subjects/SubjectGrid.tsx` cùng CSS của nó (tab lớp, trạng thái và lối vào thẻ môn), route/trang danh sách môn hiện có ở phạm vi cần thiết để nhận `grade` và hiển thị `chủ đề → bài học`, `packages/ui/src/SubjectProvider.tsx` chỉ để nhận màu môn từ dữ liệu trên phạm vi thẻ và giữ màu mặc định cho các nơi dùng cũ, `frontend/app/profile/page.tsx` và các thành phần Profile liên quan (đổi cấp và bỏ thông tin trường/lớp giả), cùng `frontend/features/survey/DemandPollBanner.tsx`/`SubjectDemandModal.tsx` ở phần dùng bởi landing (copy trung thực và không báo thành công khi gửi lỗi). Hàm đọc học liệu dùng `createServerClient` hiện có từ `@scipal/supabase`, chỉ đọc nội dung công khai và trả về `available | compiling | error`; có kiểm thử tập trung cho ba trạng thái.

Phạm vi dữ liệu bổ sung migration có kiểm soát: thêm `preferred_education_level` vào `profiles`; thêm `curriculum_versions` và `subject_grade_catalog` theo đặc tả nền v1.7; nạp đầy đủ cặp môn–lớp GDPT 2018 với tên EN/VI, vai trò chương trình và thứ tự hiển thị; cập nhật kiểu tương ứng trong `packages/supabase/src/types.ts` và seed hiện có. Không thêm `preferred_grade`. Route/action web ghi sở thích cấp học qua phiên người dùng đã xác thực và chính sách RLS chỉ cho cập nhật hàng của mình. `topics/lessons` giữ `grade` làm nguồn lọc bài; không đổi role hay dữ liệu tiến độ. Navbar luôn hiện và chứa switch EN/VI duy nhất ở mọi trạng thái của `/`; không đổi mục, quyền hay hành vi navbar trên route khác. Trên `/`, tắt prefetch tự động của các liên kết navbar để cổng chọn không tải route chưa được yêu cầu. Không đổi login, backend Fastify, hệ auth, điểm/XP, mobile app hay theme toàn cục. Không thêm dependency khi stack hiện tại đủ dùng. Lỗi `--accent` trên `:root` trong `globals.css` được ghi nhận là tồn đọng hiện hữu; phần landing mới không dựa vào nó và không mở refactor toàn cục trong việc này.

## 8. Điều kiện nghiệm thu

1. Tài khoản đã có preference vào landing đúng cấp từ DB. Tài khoản chưa có preference và khách ở tab mới thấy ba cấp, chọn một lần để vào landing; khách tải lại cùng tab giữ lựa chọn, tab mới quay lại cổng và đóng tab xóa lựa chọn. Cookie cấp học cũ không mở landing. Không có gate chọn lớp hoặc nút bỏ qua.
2. Ba cấp có theme riêng áp dụng lên landing và navbar, nội dung phân biệt nhưng cùng nhận diện SciPal. Catalog có tab đúng dải lớp, luôn có một tab hoạt động, hỗ trợ bàn phím và giữ trạng thái hợp lệ qua URL. Mỗi tab chỉ hiện môn thuộc chương trình của lớp đó; không có Tin học nổi bật hoặc môn sai lớp.
3. Đổi cấp ở landing hoạt động với khách. Đổi trong Profile có trạng thái lưu/lỗi rõ; lựa chọn tài khoản chỉ lưu trong Profile và giữ được khi đăng nhập trên thiết bị khác, không rò giữa hai tài khoản. Lựa chọn khách chỉ có hiệu lực trong tab hiện tại. Tab lớp không được ghi vào Profile. Không hiện lớp 11A1/ID trường giả là thông tin được xác thực.
4. `available/compiling/error` phân biệt rõ theo từng cặp môn–lớp. Card `available` mở `/{subject}?grade={grade}` và trang đích hiện đúng danh sách `chủ đề → bài học`; card `compiling` không có link; lỗi không bị giả thành đang biên soạn.
5. Preview Tutor ở nhánh THPT minh họa câu hỏi khoa học tự nhiên chung, giữ đúng nhịp tự phát theo viewport, transcript đầy đủ sau khi phát, ghi chú nội dung chuẩn bị sẵn và reduced motion hiện ngay toàn bộ.
6. Catalog dùng tab lớp + lưới card responsive như mẫu, không marquee hoặc item nhân bản; thứ tự bàn phím/trình đọc màn hình khớp thứ tự thị giác và các section quan trọng không biến mất khi observer thiếu.
7. Nội dung VI/EN đầy đủ; CTA, glossary, khảo sát và footer đi đúng đích; khảo sát lỗi không báo thành công; kiểm tra keyboard, focus, tương phản, vùng chạm và responsive ở các kích thước trên.
8. So sánh baseline/sau thay đổi bằng phép đo production build; báo rõ số đo, môi trường và mọi giới hạn. Chỉ chạy test tập trung vào luồng đã đổi; build/typecheck web khi hoàn tất trang, ghi riêng lỗi có sẵn nếu còn.
