# SciPal Web Design System

## Harmonic motion 3D (08/10)

- Reference: user's 11.81s Bandicam recording of YooBook, extracted frames in the local `yoobook-reference` artifact folder. Reconstruct the classroom board and moving diagram with real meshes; no reference video/image substitutes for simulation geometry. Branding and mascot remain SciPal's surrounding shell.
- Add `harmonic-3d` to the existing physics Lab and lesson simulation registry. The same config drives Studio preview and learner rendering. No account, external iframe, API key or database migration required.
- Scene material tokens scoped to `.stage` in `harmonic3d.module.css`: background `#488780`, board `#17605D`, metal frame `#676B6B`, chalk `#F5F6EE`, point M/velocity `#E8F500`, projection `#302DEA`, acceleration `#35ED12`, x-axis `#E61B3F`, y-axis `#287BBA`, labels `#DCA900`, rotation `#C44BCE`. These are physical illustration materials, not subject accents. Surrounding controls use existing semantic tokens.
- Board 8.4 × 5.1 scene units, raised rods/text/balls with cast shadows. The track radius responds to amplitude with display scale `2.1A/(A+0.4)` (1.5 at the reference default A=1); this bounded illustration scale fits the board while SI readouts remain exact. Title and every label exist in the 3D plane and turn out of sight behind the board. Perspective view can orbit 360°, zoom, and return home; responsive lens fits the whole board on mobile with a minimum 320px scene height.
- M follows uniform circular motion; P is its projection on Ox. `x=A cos(ωt+φ)`, `v=−Aω sin(ωt+φ)`, `a=−ω²x`, `ω=2π/T`. Arrow directions and relative lengths follow these equations; each vector's maximum length is normalized separately for readability. Numeric x/v/a readouts retain physical units.
- Autoplay follows the video; reduced motion starts paused and supports a time slider. Play/pause, restart, period/amplitude, camera controls and keyboard arrow/+/-/Home interactions use 44px controls. Animation pauses when hidden or offscreen; WebGL failure leaves formulas, a 2D diagram and controls usable. Screen readers get numeric state and a static diagram description, not 60 live announcements per second.

Scope: toàn bộ web frontend. Nguồn giá trị màu: `packages/ui/src/theme/palettes.ts`; spec: `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md`.

## 1. Atmosphere & Identity

SciPal should feel like a warm, modern field notebook for curious Vietnamese learners: clear enough to start studying immediately, with enough material depth to invite exploration. The signature is a real learning question drawn through a bilingual notebook diagram; paper, annotations, and the marked midpoint explain the idea instead of acting as decoration. A level choice is the front door to that notebook, and every level must make its actual learning status plain.

## 2. Color

### App-wide level theme

- Tám bảng màu: Tiểu học (nâu nhạt, bìa vở và bút chì gỗ), THCS (xanh dương, bút bi), THPT (xanh lá, bảng lớp) và trung tính (chưa rõ cấp), mỗi bảng có sáng và tối. Giá trị nằm ở `packages/ui/src/theme/palettes.ts`, CSS sinh bằng `renderThemeCss()` và in trong root layout.
- Vai token (spec §3.2): `paper`, `surface`, `surface-sunken`, `ink`, `ink-muted`, `line` (chỉ trang trí), `edge` (viền điều khiển ≥ 3:1), `action`, `action-hover`, `action-ink`, `focus`, `nav`, `nav-ink`, `danger`/`success`/`warning` và `*-surface`, `pattern-ink`, `pattern-opacity`. Tailwind: `bg-paper`, `text-ink`, `border-edge`…
- Màu phụ theo cấp (`sun`, `coral`, `sky` → `--sun`, `--coral`, `--sky`): vàng nắng, cam san hô và một màu lạnh (Tiểu học xanh ngọc nhạt, THCS tím, THPT xanh trời), hài hoà với màu chính của cấp. Chỉ dùng cho tô điểm: đồ vật trong tranh, quầng sáng, nét highlight, nền nhạt của vùng demo, chip gợi ý. Không bao giờ làm màu chữ; chữ đặt trên chúng là `--ink` (sáng) hoặc `--paper` (tối), test `palettes.test.ts` giữ ≥ 4.5:1. Nút, link và trạng thái điều khiển vẫn dùng `action`; riêng nút đăng nhập (navbar, menu mobile, trang login) là dải `sun` → `coral` chữ `--ink` cho thật nổi. Toàn web: quầng sáng `sun`/`sky`/`coral` cố định sau mọi trang (`[data-app-shell]::after`, tắt khi `prefers-contrast: more`), vạch ba màu dưới tiêu đề trang nội dung, nội dung trang trồi lên lần lượt khi vào (tắt khi giảm chuyển động); thẻ từ điển xoay vòng ba màu ở mép trên, nhãn loại từ và ô ví dụ. Tranh hero: trang phải của sách theo cấp (Tiểu học đếm hình, THCS biểu đồ cột, THPT parabol).
- Accent môn (`--accent`, `--accent-ink`) chỉ là "nhãn vở": nhãn, icon, dải lề, thanh tiến độ; không tô nền trang, thẻ hay nút chính.
- Đỏ (`danger`) chỉ cho lỗi và phần sửa đáp án quiz.
- Hoạ tiết đồ dùng học tập chỉ hiện trên `paper`; tắt bằng `data-pattern="off"` (phòng thi), khi `prefers-contrast: more` và khi in.
- Bốn bộ hoạ tiết ở `frontend/public/patterns/<level>.svg` (`PATTERN_URLS` trong `palettes.ts`): Tiểu học — bút chì, gọt bút chì, thước kẻ, hộp bút, bảng con, phấn màu; THCS — compa, ê-ke, thước đo độ, bút bi, máy tính cầm tay; THPT — phấn và giẻ lau bảng, bình tam giác, máy tính cầm tay, kính lúp, bàn phím và chuột; trung tính — bút chì, thước, ê-ke, compa, máy tính. Quy tắc (test `frontend/lib/theme/patterns.test.ts`): một màu `#000` (dùng làm `mask-image`), < 4 KB, `viewBox="0 0 320 320"`, không `<script>`, ảnh, `foreignObject`, `href` hay thuộc tính `on*`.
- Chế độ tối có sẵn nhưng tắt bằng `DARK_MODE_ENABLED` tới hết giai đoạn 5.
- Landing và cổng chọn cấp chỉ dùng token chung (`--paper`, `--ink`, `--nav`…); `--gate-*` là bí danh trỏ về token chung, không còn màu viết cứng.

### Navbar

- Glass shell (07/10): preserve the level's nav/ink tokens; use a nav tint at 83% opacity (45% nav, 55% dark shade), a restrained 4% nav-ink reflection. The local nav-glass-shade token uses light-dark(ink, paper) with the inherited color-scheme; browsers without it use solid nav. Use 18px backdrop blur and 140% saturation. Double shadow: soft outside elevation plus a thin inset highlight. Dropdown/mobile menus use 94% surface, the same blur and a fine edge. Solid token surfaces replace glass with increased contrast or no backdrop-filter. Active links remain filled pills; no new scroll-linked animation. Use the compact menu below 1536px so all student navigation and account controls fit. Both notification instances have distinct channel/list identifiers.

Navbar tô màu chính của cấp: Tiểu học nâu nhạt `#96693F` (chữ trắng), THCS xanh dương `#2563EB`, THPT xanh lá `#15803D`, chưa chọn cấp `#15803D`. Nút đăng nhập và công tắc đang chọn đảo màu (`bg-nav-ink text-nav`). Mục đang ở được đánh dấu bằng viên thuốc đậm và viền sáng mảnh (`navLink` trong `navbar.module.css`); hover dùng nền kính tối hơn để chữ luôn rõ. Công tắc ngôn ngữ là nhóm viên thuốc cao 32px, vùng bấm mở rộng tới 44px. Nhãn "Ngoại tuyến" chỉ hiện khi mất mạng. Tài khoản: ô chữ cái đầu + tên là link tới Hồ sơ (tên ẩn dưới 1536px; mục "Hồ sơ" không nằm trên thanh desktop, chỉ trong menu mobile) và nút "Đăng xuất" dạng viền; dưới 1536px các mục sát nhau hơn để thanh admin vừa 1280–1366px.

### Trang Môn học

- `/subjects` là tab "Môn học" của navbar (link; không còn menu thả trên desktop và không còn danh sách môn trong menu mobile). Mục navbar được đánh dấu cả khi đang ở trong một môn hay bài học.
- Chọn **lớp**, đồng bộ theo cấp đang chọn (cấp tài khoản, rồi cấp đã chọn trong phiên): chỉ hiện các lớp của cấp đó (THPT → 10–12), mặc định lớp đầu. Chưa chọn cấp thì hiện đủ 1–12 theo nhóm Tiểu học / THCS / THPT, mặc định lớp 10. Đổi lớp không đổi cấp đã lưu.
- Thẻ môn của lớp đó: chỉ có link "Vào học" khi lớp có bài đã xuất bản (`liveGrades`), dẫn thẳng tới `/<môn>#lop-<lớp>` (tiêu đề nhóm lớp trên trang môn có `id="lop-N"`); còn lại hiện "Đang biên soạn".

### Portal

Menu, popover hay dialog render qua portal phải gắn vào trong `[data-app-shell]` để nhận token; gắn thẳng vào `body` sẽ mất màu.

### Login

- Giữ bố cục Katha (mascot, slide minh hoạ, hiệu ứng); bộ biến `--lg-*` trong `frontend/app/login/login.css` trỏ về token chung (`--lg-gold`/`--lg-primary` → `action`, focus → `focus`). Nút sáng/tối dùng `ThemeToggle` chung; không trang nào được gắn `data-theme`, `data-level`, `.dark` hay biến màu lên `<html>` (test `frontend/lib/theme/rootTheme.test.ts`).
- Minh hoạ slide dùng `--art-1…4` và `--art-deep`, dẫn xuất từ `nav`/`nav-ink` của cấp (khai báo trên `.katha-login-slide`); nền slide là gradient `nav` → `--art-deep`.

### Trang bài học

- Nội dung bài nằm trên một tờ vở `surface` có dải lề màu môn (`--accent`) ở mép trái: component `LessonSheet` (class `sheet` trong `frontend/components/blocks/notebook.module.css`); nền đặc của tờ vở che hoạ tiết. Không gắn `data-pattern="off"` lên tờ vở — theme tô thuộc tính đó bằng `--paper`, đè mất `--surface`.
- Khối lý thuyết tự kẻ dòng cách nhau `1.75rem` (class `rules`); bài Tiểu học kẻ ô li — chọn theo lớp của bài (`data-paper="squared"` trên `LessonSheet`), không theo cấp của người đọc. Mọi khoảng cách dọc trong khối là bội của `1.75rem` (`leading-7`, `mb-7`, tiêu đề `pt-7 leading-7`) để chữ ngồi trên dòng; từ dài không ngắt, công thức rộng, bảng và code cuộn trong khối chứ không kéo ngang trang. Khi in thì bỏ dòng kẻ.
- Markdown được gán kiểu bằng `components` của `react-markdown` trong `TheoryRenderer` (không dùng plugin typography); bảng và `pre` cuộn ngang trong khối, link ngoài mở tab mới với `rel="noopener noreferrer"`.
- Trang bài bọc `LevelScope` theo lớp của bài (`levelOfGrade(lesson.grade)`), đặt **ngoài** `SubjectProvider`: bài lớp 5 mở bởi học sinh THPT có vùng bài tông Tiểu học, navbar vẫn tông THPT. Trang môn bọc từng nhóm lớp trong `LevelScope` riêng.
- Accent môn chỉ là nhãn vở (nhãn môn, ô icon, dải lề, gạch chân tab code, viền thẻ thuật ngữ): chữ dùng `text-accent-ink`, nền nhạt `color-mix(accent 12%, surface)`; nút chính luôn `bg-action`.

### Khu vực cá nhân (hồ sơ, tiến trình, thi thử, khảo sát)

- **Heatmap chuỗi ngày** (`StreakCalendar`): 4 mức ấm — `streakCellClass()`: 0 → `bg-surface-sunken`, 1 → `sun` 45% trên `surface`, 2–3 → `bg-sun`, ≥ 4 → `bg-coral`; số trong ô luôn `text-ink`. Trang Tiến trình: thẻ XP nền `sun`→`coral` nhạt, thanh cấp độ gradient `sun`→`coral`; mỗi khối có mép trên một màu phụ; huy hiệu xoay vòng ba màu phụ. Số trong ô là số môn có chuỗi phủ ngày đó (`activeSubjectsOn()`, tính từ `last_active` lùi `current_streak` ngày). Mỗi ô có `title`/`aria-label` song ngữ nêu ngày + số môn; chú giải "Ít → Nhiều" bằng chữ. Hôm nay có viền `outline-focus`.
- **Đồng hồ thi** (`ExamRunner`): 3 mức theo `timerTone()` — > 300 giây `normal` (`bg-surface text-ink border-line`), 61–300 `warning` (`bg-warning-surface text-warning`), ≤ 60 `danger` (`bg-danger-surface text-danger`). Mức cảnh báo luôn kèm chữ "Còn dưới 5 phút / Còn dưới 1 phút" trong vùng `aria-live="polite"`, không chỉ đổi màu.
- **Bảng câu hỏi** (`AnswerPalette`): 3 trạng thái — đã trả lời `bg-action text-action-ink`, chưa trả lời `border-edge bg-surface text-ink`, đang xem thêm `outline-focus`; ô `min-h-11 min-w-11`; `aria-label` "Câu 3, đã trả lời"; chú giải ba trạng thái bằng chữ bên dưới.
- Lựa chọn trong đề là radio thật trong `fieldset`/`legend`; kết quả chỉ dùng số liệu server trả về (điểm, số câu đúng), câu đúng/sai kèm `CircleCheck`/`CircleX`.
- Khảo sát: đánh giá sao là `radiogroup` (phím mũi tên), sao chọn `text-action`; modal khảo sát dùng nền mờ `color-mix(ink 60%)`, Escape đóng và trả focus; ô icon môn theo quy tắc nhãn accent.

### Sáng/tối

- Ba lựa chọn: Theo hệ thống (mặc định), Sáng, Tối — nút trên navbar desktop, trong menu mobile, ở Profile và trang đăng nhập; lưu `localStorage['scipal-theme']`, script boot áp lên `[data-app-shell]` trước khi vẽ. Không bao giờ gắn `data-theme`/`.dark` lên `<html>`.
- Ở chế độ tối `action` là màu sáng, nên chữ trên nền `action` luôn dùng `action-ink` (không viết cứng trắng). Mảng đặt cố định trên ảnh minh hoạ (huy hiệu slide đăng nhập) giữ chữ sáng cố định.
- Khối code (Monaco) chuyển `vs-dark` theo `useShellDark()`.
- Chế độ tối có chiều sâu (28/09): `surface` sáng hơn `paper` ≥ 1,18:1 và `line` trên `surface` ≥ 1,35:1 để thẻ tách khỏi nền; hoạ tiết mờ hơn (`patternOpacity` ≤ 0,04); màu nhấn khác xa màu chữ (Tiểu học vàng mật ong `#F2B45C`); `--accent-ink` lấy 50% màu môn (đủ 4,5:1 với mọi màu môn trong `subjects`). `--glow-scale` (sáng 1, tối 1,6) nhân độ đậm quầng sáng nền; `--tint-scale` (sáng 1, tối 2) nhân các nền/viền pha màu môn trên thẻ môn. Test ở `packages/ui/src/__tests__/palettes.test.ts`. Nền tối nâng thêm một bậc (29/09 — THPT `#12271D`, THCS `#131B30`, Tiểu học `#221B15`, chưa chọn cấp `#1A201C`). Tranh minh hoạ dùng `--art-paper`/`--art-surface`/`--art-ink` = màu giấy của bảng **sáng**: trang sách, ô giấy và nét vẽ trên giấy giữ sáng ở chế độ tối.

### Trạng thái bài giảng

Một nguồn: `LessonStatusBadge` (`features/authoring/lessonStatusBadge.tsx`) — bản nháp `secondary`, chờ duyệt `warning`, đã xuất bản `success`, cần chỉnh sửa `destructive`; nhãn song ngữ lấy từ `lessonStatus.ts`. Trạng thái lạ hiện nguyên giá trị với `secondary`.

### Khu giáo viên/admin

Bảng (`Table`) cho danh sách tài khoản và học sinh, cuộn ngang trong khung ở 375px; hộp thoại dùng `Dialog` (Esc đóng, focus vào ô đầu, trả focus khi đóng); `font-mono` chỉ cho mã mời lớp và khối code. Trang server dùng `PageBreadcrumb` và `Bi` để song ngữ.

### Palette

| Role | Token | Value | Usage |
|---|---|---:|---|
| Brand | `--scipal-brand-green` | `#16A34A` | Existing logo and navbar only |
| Primary paper | `--landing-paper` | `#FFF8EF` | Primary landing canvas |
| Primary surface | `--landing-surface` | `#FFFFFF` | Notebook and choice surfaces |
| Primary ink | `--landing-ink` | `#35271E` | Headings and body |
| Primary secondary ink | `--landing-muted` | `#5E493B` | Supporting copy and labels |
| Primary rule | `--landing-line` | `#E6D2BD` | Notebook rules and separators |
| Primary action | `--landing-action` | `#8A3E1F` | Primary-level actions and focus |
| Primary action hover | `--landing-action-hover` | `#703117` | Hover and pressed actions |
| Lower-secondary paper | `--landing-paper` | `#F3F7FD` | Lower-secondary canvas |
| Lower-secondary surface | `--landing-surface` | `#FFFFFF` | Cards and panels |
| Lower-secondary ink | `--landing-ink` | `#1D2C45` | Headings and body |
| Lower-secondary secondary ink | `--landing-muted` | `#415571` | Supporting copy and labels |
| Lower-secondary rule | `--landing-line` | `#D4E0F0` | Measurement lines and separators |
| Lower-secondary action | `--landing-action` | `#245398` | Actions and focus |
| Lower-secondary action hover | `--landing-action-hover` | `#1C3F76` | Hover and pressed actions |
| Upper-secondary paper | `--landing-paper` | `#F7F8F3` | Upper-secondary canvas |
| Upper-secondary surface | `--landing-surface` | `#FFFFFF` | Notebook and learning panels |
| Upper-secondary ink | `--landing-ink` | `#17251D` | Headings and body |
| Upper-secondary secondary ink | `--landing-muted` | `#4B6052` | Supporting copy and labels |
| Upper-secondary rule | `--landing-line` | `#D8E5DC` | Notebook rules and separators |
| Upper-secondary action | `--landing-action` | `#0C633B` | Actions and focus |
| Upper-secondary action hover | `--landing-action-hover` | `#084D2E` | Hover and pressed actions |
| Error text | `--landing-error-ink` | `#96352D` | Save and load errors |
| Error surface | `--landing-error-surface` | `#FFF1EE` | Inline error feedback |
| Error rule | `--landing-error-line` | `#E8B8AF` | Error outline |

### Rules

- Apply level tokens on the landing root using `data-level`; never place a level palette or subject color on `:root`.
- Keep `--accent` scoped by `SubjectProvider` on supported subject content. Never use a subject accent as a landing theme.
- The existing brand green remains reserved for the logo and navbar; the landing actions use their level token.
- Use token-derived gradients or light only where they explain paper depth or the learning diagram. No full-page grid, gradient headline, or decorative subject color.
- All new text/surface combinations must meet WCAG AA: 4.5:1 for body text and 3:1 for large text and UI edges.

### Level choice gate

Spec: `docs/superpowers/specs/2026-09-26-landing-redesign-design.md`.

- Một tiêu đề một dòng ("Bạn học lớp mấy?") và ba cuốn vở CSS 3D trên kệ. Bìa vở chỉ có tên cấp và khoảng lớp; không nhãn trạng thái học liệu (cả ba cấp đã ra mắt, "Đang biên soạn" chỉ hiện ở môn/bài).
- Mỗi cuốn vở nằm trong `LevelScope` của cấp đó: bìa `--nav`, chữ `--nav-ink`, hoạ tiết `--pattern-url` làm `mask-image`; nhãn tên dán trên bìa là `--surface` có dòng kẻ `--line`.
- Máy có chuột: vở nghiêng theo chuột (tối đa 8°), hover/focus thì nhô ra và bìa hé ~22°. Màn ≤ 640px: ba vở nằm ngang xếp dọc, chạm thì lún. Chọn: bìa lật mở 400 ms (`GATE_FLIP_MS`), trang giấy phóng to; `prefers-reduced-motion` bỏ hết chuyển động và áp dụng ngay.
- Vẫn là `<form method="post">` với ba `<button name="level">`; tài khoản gửi form ngay (hiệu ứng không làm chậm POST), khách chọn qua `createGateSelection` — lần bấm đầu thắng, bấm lặp bị bỏ qua. Ghi chú lưu trữ và legend chỉ dành cho trình đọc màn hình.

### Landing

- Thứ tự: hero (nhãn cấp, tiêu đề hai dòng, một câu phụ, "Xem môn học" + "Đổi cấp", tranh bàn học SVG) → "Môn học của bạn" (`SubjectGrid`) → "Học thế nào" (ba thẻ demo Tin học theo cấp, mỗi thẻ là một vùng giấy kẻ chấm có demo chạy được + tiêu đề + một câu: tìm kiếm nhị phân chạy từng bước khi thẻ vào màn hình, có nút "Xem lại" (Tiểu học là trò đoán số 1–8); câu song ngữ đổi bằng cờ, tự đổi sang tiếng Anh rồi quay lại một lần, thuật ngữ chính được tô dấu; thuật ngữ trong từ điển mở ra định nghĩa và ví dụ. Hover: thẻ nhô 6px, viền và nền demo ngả màu `action`) → "Hỏi bất cứ lúc nào" (`TutorDemoCard`; nút "Thử ngay" chỉ khi truyền `href` cho `TutorSection`) → "Sẵn sàng chưa?" trên nền `--nav` → khảo sát một dòng → footer.
- Mỗi section một tiêu đề, tối đa một câu phụ; không đoạn văn.
- Tranh hero (`features/landing/hero/`): SVG tĩnh (`HeroIllustration`) render phía server, màu chỉ lấy từ token. Chiều sâu được vẽ bằng mặt bên tối hơn (`color-mix` với `--ink`), chồng giấy và bóng đổ mờ, không xoay cả khung bằng CSS và không đóng khung thẻ. Một vùng `--paper` mờ dần phía sau làm dịu hoạ tiết nền. Tranh tự dựng một lần khi vào trang (~1,8 s, chỉ CSS): sách trồi lên, hai trang mở từ gáy, dòng kẻ và đồ thị tự vẽ (`pathLength=1` + `stroke-dashoffset`), điểm đánh dấu nảy, dải đánh dấu buông xuống, rồi đồ vật rơi xuống có độ nảy và bóng đổ lớn dần. Đổi cấp thì dựng lại (`key={level}`). Máy có chuột: `HeroStage` ghi vị trí con trỏ trên hero vào `--px`/`--py` (một khung hình mỗi lần di chuột, không vòng lặp); tranh nghiêng tối đa 5–7° và ba lớp (sách, đồ vật sau, đồ vật trước) dịch lệch nhau. Tiêu đề hiện từng dòng từ mờ sang rõ, rồi câu phụ và nút. Tất cả tắt khi `prefers-reduced-motion`. Đồ vật theo cấp là dữ liệu trong `levelObjects.ts`. Không dùng `three`/WebGL hay canvas.
- Hiệu ứng hiện khi cuộn (700 ms: trượt lên 1,75rem, thu nhỏ 0,97 và bỏ mờ 6px, lệch 80 ms theo cột) dùng thuộc tính `translate`/`scale` riêng để không đè `transform` của thẻ; bật giảm chuyển động giữa chừng thì mọi khối hiện ngay.

### Language switch

Công tắc ngôn ngữ ở navbar và trên thẻ song ngữ dùng cờ SVG `public/flags/vn.svg` và `gb.svg` (`FlagIcon`), không dùng emoji; mỗi nút có `aria-label` "Tiếng Việt"/"English" và `aria-pressed`. Test `lib/theme/flags.test.ts` giữ file cờ < 2 KB và không có script/href.

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Usage |
|---|---|---:|---:|---|
| Display | `clamp(2.25rem, 6.4vw, 4.75rem)` (gate), `clamp(2.6rem, 5.4vw, 4.6rem)` (landing hero) | 800 | 1.02–1.05 | Landing and gate heading |
| H1 | `2.25rem` | 700 | 1.15 | Profile section heading |
| H2 | `1.75rem` | 600–700 | 1.25 | Section heading |
| H3 | `1.25rem` | 600 | 1.35 | Choice and notebook title |
| Lead | `1.125rem` | 400–500 | 1.65 | Hero description |
| Body | `1rem` | 400 | 1.65 | Default copy |
| Small | `0.875rem` | 400–600 | 1.5 | Status and supporting copy |

### Font Stack

- Display: Be Vietnam Pro, already loaded by the root layout.
- Body: Be Vietnam Pro (one family for the whole app; Inter was removed).
- Code: JetBrains Mono, chỉ cho khối code.

### Rules

- The third family is limited to measurement and code because the notebook diagram uses numeric and technical labels.
- Body text never falls below `0.875rem`; paragraphs stay near 65–75 characters per line.
- Balance display headings and keep them to three lines or fewer at supported widths.

## 4. Spacing & Layout

### Base Unit

All spacing intent derives from 4px.

| Token | Value | Usage |
|---|---:|---|
| `--space-1` | 4px | Icon and label |
| `--space-2` | 8px | Compact related controls |
| `--space-3` | 12px | Inline groups |
| `--space-4` | 16px | Mobile gutter and control padding |
| `--space-5` | 20px | Choice contents |
| `--space-6` | 24px | Standard panel spacing |
| `--space-8` | 32px | Related section groups |
| `--space-10` | 40px | Section interior |
| `--space-12` | 48px | Compact section separation |
| `--space-16` | 64px | Section separation |
| `--space-20` | 80px | Major page rhythm |
| `--space-24` | 96px | Maximum section separation |

### Grid

- Content maximum: 1280px.
- Mobile gutter: 16px; desktop gutter: 28px.
- Breakpoints: 640px, 768px, 1024px, 1280px, and 1536px; choose layout from content fit, not device names.
- Three level choices stack at 320–767px and form a measured row or asymmetric grid when each label still fits.
- Mobile reading order is heading and action before the notebook preview.
- Use intrinsic sizing, `minmax()`, and `clamp()` as layout mechanics; keep named spacing intent on the 4px scale.

## 5. Components

### Education level choice
- **Structure**: Native form, fieldset, legend, and three submit buttons; each button names the level and grade range.
- **Variants**: Primary, lower-secondary, upper-secondary; upcoming content and available Informatics status.
- **Spacing**: `--space-4` to `--space-6` inside; `--space-3` between choices.
- **States**: Default, hover, pressed, keyboard focus, selected/current, disabled only while submitting, error alert.
- **Accessibility**: One page `h1`; full button label includes level and grades; minimum 44×44px hit area; form works without JavaScript.
- **Motion**: Short opacity/transform feedback; no delayed navigation or focus trap.
- **Layout**: Stack on mobile; one row or uneven grid on wide screens; document scroll owns scrolling.

### Notebook preview
- **Structure**: Article with lesson context, labeled diagram, bilingual question and prepared response, disclosure.
- **Variants**: Upper-secondary binary-search example; younger-level in-development page with a clearly labeled upper-secondary example link.
- **Spacing**: Diagram labels align to `--space-2` to `--space-4`; panel uses `--space-6`.
- **States**: Prepared transcript entering, complete transcript, reduced-motion complete transcript, unavailable-data fallback.
- **Accessibility**: The diagram has a useful `role=img` label; text remains available as text; the prepared-answer disclosure is always present.
- **Motion**: One authored transcript entrance; reveal the full transcript with reduced motion or without `IntersectionObserver`.
- **Layout**: One elevated paper panel beside hero copy on desktop and after CTA on mobile.

### Subject availability entry
- **Structure**: Data-backed subject name, level, truthful status, optional real link.
- **Variants**: Available Informatics, upcoming subject, catalog error, catalog empty.
- **Spacing**: Inline status follows `--space-2`; group follows `--space-4`.
- **States**: Available, upcoming, empty, error, retrying.
- **Accessibility**: Links exist only for supported routes and real published content; status is text, not color alone.
- **Motion**: No motion required; marquee movement is disabled for reduced motion.
- **Layout**: Static Informatics entry precedes its secondary marquee; younger-level subjects form a simple readable list.

### Profile level preference
- **Structure**: Labeled three-choice control with current value and ownership status.
- **Variants**: Account-synced and device-only.
- **Spacing**: `--space-4` between controls; 44×44px minimum target.
- **States**: Current, saving, saved, error; old selection remains visible until save succeeds.
- **Accessibility**: Each choice exposes selected state and a concise error with recovery guidance.
- **Motion**: No optimistic state transition; use a brief status change only after persistence resolves.
- **Layout**: Single-column in Profile and responsive at 200% text zoom.

### Shared Professor widget (07/10)
- One root-layout session serves the floating panel, lesson entries and /tutor. Route navigation and minimising preserve messages, draft, current conversation and in-flight text. Authentication changes reset local private state; saved server conversations remain intact. Guest trial state also survives navigation.
- The trigger reuses the landing Professor avatar in a 60px circular surface, with a visible focus ring and a soft tinted shadow. Only hover/press and actual answering states animate. A single panel has a 26rem desktop width and fits within the mobile viewport above safe-area insets; it owns its message scroll.
- Lesson registration supplies bilingual title/level. Suggested questions use lessonQuestions(title) and update even after earlier messages exist. Outside lessons use landing questions; /tutor uses the selected lesson. Switching suggestions never creates a new conversation.
- Panel header shows the current reading context, minimise and expand controls. Expand uses Next client navigation to preserve the root session. Escape closes and returns focus to the trigger; this is a non-modal dialog, so the page remains usable.
- Quota is fetched from /api/tutor/quota before a question; floating/full views share loading, unavailable, unlimited, daily/monthly, exhausted and refunded states. No speculative number or client deduction.
- Motion reference: beui.dev feedback-widget, adapted to CSS only: bottom-right origin, 240ms opacity/translate/scale reveal, 160ms close, retargetable transitions. Reduced motion removes transforms and transitions; high contrast uses solid surfaces.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|---|---:|---|---|
| Micro | 120–160ms | ease-out | Press and focus feedback |
| Standard | 200–280ms | ease-in-out | Small content reveal |
| Emphasis | 400–600ms | cubic-bezier(0.16, 1, 0.3, 1) | One hero or notebook entrance |

- Motion communicates a state change or reading order and uses transform/opacity where possible.
- Tutor transcript auto-reveals once per landing visit when visible, keeps the full transcript, and has no replay control.
- `prefers-reduced-motion` shows all content immediately. Missing JavaScript or `IntersectionObserver` never hides content.
- Preserve native page scrolling; keep marquee controls operable by touch, pointer, and keyboard.

## 7. Depth & Surface

Strategy: mixed paper layers with restrained, tinted shadows. The page canvas is level-specific paper; a real notebook preview sits one layer above it with a fine rule and a soft shadow tinted from the active level ink. Use rounded corners between 12px and 16px for panels; reserve pill geometry for compact status or language controls. No shadow stack under every section and no repeated same-sized card grid.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- WCAG 2.2 AA target: at least 4.5:1 for body text and 3:1 for large text and interactive boundaries.
- Visible keyboard focus on all controls, logical reading and tab order, 44×44px touch targets, and 200% zoom support.
- Language attributes follow the active language; bilingual excerpts label their own language.
- Reduced motion retains all content; errors name the problem and the next action. Feedback keeps a non-spatial form: a waiting spinner pulses in opacity instead of rotating, new messages fade in instead of sliding.
- First tab stop on every page is the skip link (`components/nav/SkipLink.tsx`) to `<main>`. Focus rings use `:focus-visible` with a transparent outline plus the ring, so Windows forced-colors repaints a real outline (`globals.css`).
- Text fields share one recipe, `INPUT_CLASS` in `components/ui/input.tsx`; do not redeclare it per feature. The smallest text size is `text-xs` (12px).
- Mascot sprite sheets under `/mascots/` ship `-324` and `-648` siblings next to the 1080px master; `Mascot` picks one by pixel density. Generate both when adding a character.
- No account preference leaks between users; no level is inferred when neither account nor device has a valid choice.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| Legacy global `--accent` is assigned at the root | `frontend/app/globals.css` | Existing app-wide issue is outside this landing/Profile scope; new level and subject styles do not depend on it. | Project design-system follow-up; remove only in a separately scoped theme task. |

### Cinematic 404 (Katha port, 06/10/2026)

- `frontend/features/not-found/`: reuse Katha's WebGL black hole, warped 404, particle disk and Endurance spacecraft. SciPal's navbar remains available for EN/VI and theme controls; the scene fills the viewport below its 4.625rem header (4rem bar plus 0.625rem top padding).
- The scene uses a local cinematic palette, independent of subject and education-level colors: void `#03040a`, text `#f3f3f5`, muted `rgba(222,225,240,.67)`, violet `#a6a0ff`, orange `#ea6c2a`, recovery button `#efb272` to `#f4d0a6`. Text variables use `--nf-*` and never override app tokens. Shader light colors and text-texture gradients retain the source rendering.
- Be Vietnam Pro, 760px compact breakpoint, DPR caps 1 compact / 1.25 desktop. Buttons have at least 44px touch targets and visible keyboard focus. Short landscape screens may scroll to reach the recovery actions.
- Lazy-load Three.js only on missing pages. Render a static CSS scene if WebGL fails or loses its context; stop the frame loop in hidden tabs and freeze the scene for reduced motion. Soundtrack is loaded and played only after the user taps its control; never autoplay on page entry.

- The complete 404 UI color palette is centralized as named `--nf-*` properties at the top of `NotFoundExperience.module.css`: atmosphere/vignette, fallback, audio, recovery actions, focus and status. All consuming CSS rules reference these tokens; resolving them yields the exact original colors. Procedural shader illumination remains source-identical artwork.
