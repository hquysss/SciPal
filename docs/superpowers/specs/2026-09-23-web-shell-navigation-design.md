# SciPal — Thiết kế khung web và điều hướng

Ngày: 23/09/2026

Trạng thái: Thiết kế trong hội thoại đã được người dùng đồng ý; bản văn bản này chờ người dùng duyệt trước khi viết implementation plan. Chưa cho phép triển khai code theo tài liệu này.

## 1. Mục tiêu và nguồn yêu cầu

Hoàn thiện lớp giao diện và điều hướng dùng chung của SciPal để học sinh THPT đi từ trang chủ đến môn, bài học và đăng nhập một cách rõ ràng trên desktop/mobile. Tin học là môn đang mở; bốn môn còn lại hiển thị sắp có.

Nguồn định hướng: `C:/Users/LE CHI AN/Downloads/scipal-shell-spec.html`, bản 1.5. Người dùng chọn đợt đầu là “Khung giao diện và điều hướng”, đồng ý thiết kế trong hội thoại và yêu cầu giữ hiệu ứng form login khi đồng bộ theme.

Tài liệu này cụ thể hóa phần giao diện/điều hướng của HTML, không biến toàn bộ các tính năng trong HTML thành phạm vi triển khai đợt này. Bố cục của trang HTML là bố cục tài liệu, không phải mockup ứng dụng phải sao chép.

## 2. Phạm vi

Bao gồm:

- Token nhận diện thương hiệu/môn, typography, nền, nút, ô nhập, thẻ, focus và khoảng cách của khung web.
- Navbar desktop/mobile, menu môn, menu tài khoản, ngôn ngữ và trạng thái mạng.
- Trang chủ và các mục Cách học/Về AI; lựa chọn khối và môn.
- Khung tiêu đề, breadcrumb, bộ lọc điều hướng của danh sách bài và trang bài học.
- Đồng bộ hình thức login, đường về trang chủ và đường trở về sau đăng nhập.
- Lớp bao ngoài và trạng thái active của các trang Từ điển, Thi thử, Tiến trình, Hồ sơ và giáo viên; không thiết kế lại nghiệp vụ bên trong.
- Nhãn EN/VI, trạng thái tải/rỗng/lỗi phát sinh trong các phần trên.

Ngoài phạm vi: API AI, chấm điểm/XP, dữ liệu hồ sơ/lớp học thật, editor giáo viên, engine đề thi, mô phỏng, cache offline, mở môn mới, app Expo và triển khai production. Không tuyên bố các phần này đã hoàn chỉnh sau khi nghiệm thu shell.

## 3. Hiện trạng làm cơ sở

- `frontend/components/nav/NavBar.tsx` đã có menu mobile và auth state, nhưng navbar hiện xanh đậm, desktop đặt Tiến trình/Hồ sơ trực tiếp trên hàng điều hướng, trạng thái mạng bị ẩn ở một số kích thước.
- `frontend/app/globals.css` đang gán `--accent` ở `:root`. `frontend/features/subjects/SubjectContext.tsx` và `packages/ui/src/SubjectProvider.tsx` cùng cung cấp provider môn học.
- `frontend/lib/subject-config.ts` và `packages/ui/src/tokens.ts` lặp lại màu/tên/icon môn.
- Trang chủ còn chuỗi tiếng Việt cố định và lời giới thiệu vượt khả năng AI/mô phỏng hiện tại.
- Login có thiết kế, chế độ sáng/tối và hiệu ứng riêng cần bảo toàn.
- Worktree có thay đổi ổn định web chưa commit từ đợt trước. Không ghi đè, hoàn nguyên hoặc gom chúng vào commit thiết kế này.

## 4. Hệ thiết kế

### 4.1 Màu

| Token/ngữ nghĩa | Giá trị |
|---|---|
| Thương hiệu SciPal | `#0E8A45` |
| Nền trang | `#F4FBF6` |
| Bề mặt thẻ/menu | `#FFFFFF` |
| Chữ chính | `#16241C` |
| Chữ phụ | `#5F7268` |
| Viền trang trí | `#E1EFE7` |
| Nền nhấn nhẹ | `#EAF6EE` |
| Tin học | `#0E8A45` |
| Toán | `#2F80ED` |
| Vật lí | `#9B51E0` |
| Hoá học | `#12B5A5` |
| Sinh học | `#7CB342` |

Navbar dùng nền xanh nhạt, chữ tối; logo và CTA dùng màu thương hiệu. Login và các trang chung dùng token thương hiệu. Vùng môn học dùng `--accent` được đặt trên wrapper của `SubjectProvider`, tuyệt đối không đặt trên `:root`. Các sắc độ accent phải tính trong cùng phạm vi wrapper để tránh kế thừa giá trị sai.

Màu nhận diện không tự động là màu chữ: các accent sáng như Hoá/Sinh dùng làm trang trí hoặc nền nhạt với chữ tối; nút/chip phải đạt tương phản chữ thường tối thiểu 4.5:1. Viền trang trí không được dùng thay chỉ báo focus hoặc ranh giới điều khiển cần tương phản rõ.

Quyết định đã được người dùng chấp thuận về bảng màu thay thế các giá trị cũ trong foundation spec và quy tắc domain liên quan màu. Khi triển khai, đồng bộ các tài liệu này trong phạm vi màu; giữ nguyên các ràng buộc kiến trúc/nghiệp vụ còn lại.

### 4.2 Chữ, hình khối và chuyển động

- Dùng Inter hiện có cho giao diện/nội dung, JetBrains Mono cho code. Không cài thêm font hoặc thư viện UI.
- Chữ nội dung mặc định 16px, line-height khoảng 1.6; tiêu đề trang 28–36px trên desktop, 24–30px trên mobile; nhãn điều khiển tối thiểu 14px.
- Thang khoảng cách 4, 8, 12, 16, 24, 32, 48px. Container shell tối đa 1200px, padding ngang 16px mobile và 24px desktop.
- Bo góc điều khiển 12px, thẻ 16px, pill 999px. Các khối nội dung chuyên dụng hiện có có thể giữ bố cục riêng.
- Giữ biểu tượng cỏ bốn lá và wordmark SciPal; không tạo bộ nhận diện mới. Hoạ tiết nền chỉ ở vùng trang trí, không gây nhiễu nền đọc bài.
- Hover/focus/chuyển menu dùng chuyển động ngắn 150–200ms. Tôn trọng `prefers-reduced-motion`. Không loại bỏ hiệu ứng login để đạt đồng bộ màu.
- Shell mới dùng giao diện sáng; giữ chế độ tối hiện có của login. Không bổ sung hệ thống dark mode toàn web trong đợt này.

## 5. Điều hướng và hành vi

### 5.1 Desktop và mobile

Từ 1024px dùng navbar desktop cao 64px. Các phần chính: logo về `/`, Môn học, Từ điển `/glossary`, Thi thử `/exam`; phía phải là trạng thái mạng, EN/VI và tài khoản. Liên kết Cách học/Về AI đặt ở trang chủ/footer và trong menu mobile để navbar không quá tải.

Dưới 1024px giữ logo, EN/VI và nút menu có vùng chạm tối thiểu 44×44px. Panel mở xuống dưới navbar, có chiều cao tối đa theo viewport và cuộn riêng khi cần. Trạng thái mạng xuất hiện trong panel; không hứa hiển thị thường trực ở thanh mobile đóng.

Menu mobile là disclosure không modal, không khóa cuộn trang hay trap focus. Khi đóng, nội dung menu không còn trong thứ tự Tab. Escape đóng menu và trả focus về nút mở; chọn liên kết đóng menu; đổi route đóng menu; chuyển sang breakpoint desktop đóng trạng thái mobile. Tab/Shift+Tab theo thứ tự DOM hợp lý.

Menu tài khoản/môn dùng nút với `aria-expanded`, danh sách liên kết thông thường; click ngoài hoặc Escape đóng. Không gán ARIA menu nếu chưa triển khai đầy đủ mô hình phím của menu.

Trang hiện tại có cả nền/chữ nhấn và `aria-current`. Route con của bài học vẫn thể hiện môn hiện tại; `/exam/*` thể hiện Thi thử. Menu tài khoản phản ánh trang Hồ sơ/Tiến trình khi một trong hai đang mở.

### 5.2 Tài khoản và login

- Khách có Đăng nhập, không hiển thị thông tin tài khoản giả.
- Trong lúc xác định phiên, giữ vùng tài khoản có kích thước ổn định và nhãn trạng thái; không chớp menu giáo viên hoặc tên người dùng mẫu.
- Có phiên thật: menu gồm Hồ sơ và Tiến trình; người có `app_metadata.app_role` teacher/admin có lối vào các route giáo viên hiện có. Giữ đăng xuất tại Hồ sơ để không tạo thêm luồng auth ở navbar.
- Quyền truy cập vẫn do middleware/backend xác minh; ẩn menu không thay thế kiểm tra quyền.
- Giữ login ở layout tập trung riêng, không thêm toàn bộ navbar vào form. Có logo/link về `/` và EN/VI.
- Link đăng nhập từ trang đang xem mang return URL nội bộ. Truy cập route được bảo vệ giữ pathname/query trong tham số `redirect`.
- Chấp nhận return URL nội bộ an toàn; từ chối URL ngoài, protocol-relative, backslash và đích tự quay lại login. Giá trị không hợp lệ về `/`. Đăng nhập thất bại ở lại form, thông báo lỗi thật; đăng nhập thành công quay lại đích và giữ bộ lọc.
- Giữ các hiệu ứng focus, inset/glow, hover CTA và chuyển cảnh hiện có của login ở cả sáng/tối. Kiểm tra trực quan trước/sau ở cùng viewport và theme.

### 5.3 Trang chủ và ngữ cảnh học

Thứ tự nội dung: hero song ngữ + CTA Bắt đầu học → chọn khối 10/11/12 và năm thẻ môn → Cách học ba bước → Về AI. Hero có thể dùng minh hoạ chat tĩnh có nhãn “Minh hoạ”, không giả làm phiên AI đang chạy.

CTA Bắt đầu học dẫn đến vùng chọn môn trên cùng trang, không bắt đăng nhập để xem bài công khai. Khối mặc định 11 cho bản mẫu Tin học; người dùng có thể chọn 10/12. Chọn môn Tin học dẫn tới `/informatics?grade=11` hoặc khối đã chọn. Các môn upcoming không có link dẫn vào nội dung chưa mở, có nhãn EN/VI rõ ràng.

“Cách học” liên kết `/#how-it-works`; “Về AI” liên kết `/#about-ai`. Nội dung ba bước: chọn khối/môn → mở bài và tra thuật ngữ → luyện tập, đăng nhập để lưu tiến độ khi chức năng hỗ trợ. Phần AI giải thích vai trò hỗ trợ và trạng thái đang hoàn thiện; bỏ lời hứa AI 24/7 hoặc mô phỏng đã hoạt động khi chưa nghiệm thu.

Ở danh sách bài, dùng query `grade` (10/11/12), `topic` (ID chủ đề) và `q` (tìm kiếm) làm nguồn ngữ cảnh chia sẻ được. Query không hợp lệ được chuẩn hóa: grade về 11, topic không thuộc môn về tất cả. Không bịa bài học để lấp danh sách rỗng. Gõ tìm kiếm dùng replace/debounce; đổi môn/khối hoặc mở bài dùng lịch sử điều hướng phù hợp để Back hoạt động tự nhiên.

Link bài giữ query bộ lọc; breadcrumb “Danh sách bài” dựng lại URL môn và bộ lọc đã giữ. Không phụ thuộc duy nhất vào `router.back()` vì người học có thể mở URL trực tiếp. Bài mở trực tiếp thiếu query dùng khối từ metadata bài nếu có, nếu không về danh sách môn mặc định. Query điều hướng không được làm thay đổi nội dung/chấm điểm của bài.

Tên môn, chủ đề và bài trong breadcrumb đọc từ dữ liệu hiện có. Tiêu đề dài được wrap/truncate phù hợp, không làm tràn navbar hay che nút quay lại. Bộ lọc theo khối chỉ hiển thị bài phù hợp dữ liệu, thông báo rõ nếu chưa có bài.

## 6. Thành phần và dữ liệu

- `packages/ui/src/tokens.ts`: nguồn chung cho màu/tên/icon môn và màu thương hiệu.
- `packages/ui/src/SubjectProvider.tsx`: cơ chế duy nhất cấp accent. Provider cục bộ của frontend được thay bằng provider chung; nếu cần metadata môn, lớp adapter chỉ cung cấp metadata, không tự thiết lập màu lần hai.
- `frontend/lib/subject-config.ts`: giữ registry route/status, lấy token nhận diện từ package UI; không lặp mã màu.
- `frontend/components/nav/`: trách nhiệm navbar, menu môn, menu tài khoản, ngôn ngữ và trạng thái mạng. Tách thành phần theo trách nhiệm nếu Navbar quá lớn.
- `frontend/app/globals.css` và layout: token shell, font và container; không áp selector toàn cục làm hỏng login hoặc bộ điều khiển bài thi/editor.
- `frontend/app/page.tsx` và thành phần home: nội dung trình bày có `{ en, vi }`, dùng `useLanguage` qua ranh giới client phù hợp.
- `frontend/features/lessons/` và route `[subject]`: header/breadcrumb và chuyển tiếp query; không thay renderer nội dung, API chấm điểm hoặc schema bài.
- `frontend/app/login/`: chỉ điều chỉnh theme, nhãn và liên kết cần thiết; bảo toàn form/animation.

Luồng dữ liệu: route + query → xác định môn/khối/bộ lọc → truy vấn/lọc nội dung hiện có → render danh sách/breadcrumb. Hook ngôn ngữ hiện có cung cấp nhãn EN/VI; client Supabase hiện có cung cấp trạng thái phiên; sự kiện online/offline cung cấp trạng thái kết nối trình duyệt.

Không thêm dependency, không đổi API, database schema, backend Fastify, cấu trúc monorepo hoặc alias React của mobile. Thay token dùng chung có thể đổi màu nơi mobile đã tiêu thụ token; không coi đó là một đợt thiết kế lại mobile và phải kiểm tra tương thích kiểu.

## 7. Trạng thái và khả năng tiếp cận

- Loading có nhãn/skeleton ổn định; không dùng dữ liệu mẫu thay cho thông tin cá nhân.
- Danh sách không có kết quả: giải thích theo khối/tìm kiếm và cho phép xóa bộ lọc.
- Lỗi đọc nội dung: thông báo lỗi, nút thử lại khi truy vấn hỗ trợ, và đường về danh sách/trang chủ. Không báo thành công giả.
- `navigator.onLine` chỉ là tín hiệu kết nối trình duyệt; Online không có nghĩa Supabase/AI đang hoạt động. Pill không được hứa khả năng tải bài offline.
- Nhãn, trạng thái, aria-label của các phần được sửa đều EN/VI; chuyển ngôn ngữ không reset bộ lọc hoặc mất route.
- Có skip link tới nội dung chính, landmark và heading hợp lý. Focus nhìn thấy rõ, không bị sticky header che; anchor trang chủ có scroll margin.
- Không tràn ngang toàn trang từ 320px. Khối code/bảng chuyên dụng được cuộn trong vùng riêng khi cần. Zoom 200% vẫn sử dụng được menu và form.

## 8. Nghiệm thu

1. Kiểm tra 320, 390, 768, 1024 và 1440px, EN/VI; không tràn ngang shell, menu/CTA không bị cắt, nhãn dài không phá bố cục.
2. Khách: Trang chủ → chọn khối 11/Tin → lọc bài → mở bài → breadcrumb về đúng danh sách; Back/Forward và reload giữ query.
3. Link trực tiếp tới bài, khối không có nội dung, query grade/topic không hợp lệ có hành vi xác định như mục 5.3.
4. Khách mở trang được bảo vệ → login → phiên hợp lệ → đúng return URL. Lỗi đăng nhập ở lại form. Return URL không an toàn hoặc login tự lặp về `/`.
5. Phiên học sinh chỉ thấy mục phù hợp; teacher/admin thấy lối vào giáo viên. Kiểm tra middleware thật riêng với kiểm thử UI dùng fixture; không gọi fixture là nghiệm thu Supabase thật.
6. Menu dùng click, Tab/Shift+Tab, Escape và click ngoài; đóng khi điều hướng, focus trở về trigger khi Escape, không còn phần tử ẩn nhận Tab.
7. Chuyển môn/về trang chung không làm lem màu. Nhiều thẻ môn cạnh nhau dùng đúng palette và tương phản; `:root` không khai báo `--accent`.
8. Login trước/sau cùng viewport/theme còn đủ hiệu ứng form; reduced motion giảm chuyển động mà không làm mất nội dung/chức năng.
9. Mất mạng hiển thị trạng thái chính xác, vẫn đóng/mở menu được; lỗi dữ liệu không biến thành thông báo đã lưu.
10. Các trang chưa hoàn thiện nghiệp vụ giữ route truy cập được theo quyền hiện có; nội dung quảng bá không tuyên bố chúng đã hoàn chỉnh.

Khi triển khai: kiểm thử hồi quy tập trung vào query/return URL và tương tác menu, kiểm tra trực quan bằng trình duyệt cho responsive/login. Chạy typecheck/test/build theo quy tắc repo trước khi bàn giao module; ghi rõ các kiểm thử dựa vào fixture, kiểm thử với tài khoản thật, và phần chưa xác minh. Lượt viết tài liệu không chạy lại test/build sản phẩm.

## 9. Chuyển sang lập kế hoạch

Sau khi người dùng duyệt bản spec này, dùng writing-plans tạo kế hoạch theo nhóm: token/provider → shell/menu → home và ngữ cảnh bài → login → nghiệm thu. Mỗi task phải xác định file, giao diện phụ thuộc và bằng chứng kiểm chứng. Không gộp các hệ thống AI/thi/giáo viên còn thiếu vào plan này.

Khi triển khai và bàn giao, cập nhật PROJECT_STATE và phần tài liệu cũ liên quan để loại mâu thuẫn về bảng màu, navbar và phạm vi nghiệm thu. Không sửa lịch sử thành “đã hoàn thành toàn web”.
