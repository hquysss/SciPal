# Làm lại cổng chọn cấp và landing (3D, ít chữ)

Ngày: 26/09/2026 · Trạng thái: chờ duyệt spec

## 1. Mục tiêu

Gây ấn tượng và thu hút người mới lần đầu vào SciPal. Hiện cổng chọn cấp và landing nhiều chữ; bản mới nói bằng hình, chuyển động 3D và tương tác, mỗi section chỉ một tiêu đề và tối đa một câu phụ.

**Người dùng đã chốt:**
- Giữ luồng: khách vẫn chọn cấp trước rồi mới vào landing (quyết định "bắt buộc chọn cấp" không đổi).
- Hướng hình ảnh: sổ tay khoa học nâng cấp (giữ hệ token/hoạ tiết theo cấp), có 3D.
- 3D kết hợp: cổng chọn cấp dùng CSS 3D; hero landing có một cảnh WebGL tải sau.
- Một cảnh bàn học, đổi đồ vật theo cấp, dựng bằng khối hình học low-poly trong code.
- Cả ba cấp **đã ra mắt**: không nhãn "Sắp ra mắt"/"Đã mở" ở cổng; "Đang biên soạn" chỉ hiện ở môn/bài khi vào tới đó.
- Giữ gia sư AI (`TutorDemoCard`); trang Tutor sẽ được làm sau.

**Giả định:** giữ nguyên lưu cấp (`sessionStorage` cho khách, `profiles.preferred_education_level` qua RLS cho tài khoản), form POST `/api/preferences/education-level`, song ngữ EN/VI, token theo cấp trong `packages/ui/src/theme/palettes.ts`. Chỉ web; mobile (Expo) ngoài phạm vi. Không bịa số liệu.

**Ngoài phạm vi:** trang Tutor, API AI chat, dark mode (vẫn tắt bằng `DARK_MODE_ENABLED`), thay đổi `SubjectGrid` ngoài hiệu ứng xuất hiện.

## 2. Cổng chọn cấp (`LevelGate`)

Bố cục vừa một màn hình, không cuộn:
- Trên: logo SciPal + công tắc EN/VI (navbar như hiện tại).
- Tiêu đề một dòng: **"Bạn học lớp mấy?"** / *"What grade are you in?"*
- Giữa: ba cuốn vở CSS 3D đứng nghiêng như trên kệ; bìa tô màu chính của cấp (token `nav`/`nav-ink` trong `LevelScope` của từng cấp) với hoạ tiết đồ dùng in chìm (`frontend/public/patterns/<level>.svg`). Bìa chỉ ghi tên cấp (to) và khoảng lớp (nhỏ). Không nhãn trạng thái học liệu.
- Dưới: một dòng nhỏ "Đổi được sau trong Hồ sơ." / "You can change this later in Profile."

Bỏ: kicker "01 · CHỌN LỐI VÀO HỌC TẬP", đoạn mô tả, dòng "lưu trong tab này", `InformaticsStatus`, link "Tải lại trạng thái học liệu". Legend fieldset và ghi chú lưu trữ giữ dưới dạng `sr-only`/`aria-describedby`.

Tương tác:
- Desktop (`pointer: fine`): vở nghiêng theo chuột (tối đa ~8°); hover/focus thì vở nhô ra và bìa hé ~20°.
- Mobile / `pointer: coarse`: ba vở xếp dọc nằm ngang như gáy sách; chạm thì lún xuống. Không dùng gyroscope.
- Chọn: bìa lật mở (~400 ms), trang giấy phóng to phủ màn hình, rồi chuyển. `prefers-reduced-motion`: chuyển ngay, không hiệu ứng.

Giữ nguyên: mỗi vở là `<button name="level" value=…>` trong `<form method="post">`; tài khoản `type="submit"` + `scope=account`; khách `type="button"` + `onGuestSelect`. `saveError` vẫn hiện `role="alert"`. Nhãn "Đang chọn" cho `currentLevel`. Vùng chạm ≥ 44 px, focus nhìn thấy (`outline-focus`).

Prop `informatics` không còn cần trong `LevelGate`; bỏ khỏi props và nơi gọi (`app/page.tsx`, `GuestLandingFlow`).

Token: bảng `--gate-*` trong `level-gate.module.css` chuyển thành bí danh trỏ về token chung (trả nợ giai đoạn 2); số màu thô trong `theme-baseline.json` chỉ được giảm.

## 3. Landing (`LandingPage`)

Cả ba cấp dùng cùng một landing; khác nhau ở token màu, nhãn cấp, câu tiêu đề và đồ vật trên bàn 3D. Bỏ `DevelopmentPreview` và mọi câu "đang chuẩn bị".

Thứ tự:

1. **Hero** (một màn hình): trái — nhãn cấp nhỏ (*THPT · Lớp 10–12*), tiêu đề hai dòng, một câu phụ, nút chính **Xem môn học** (`#mon-hoc`) và nút phụ **Đổi cấp** (`/?chooseLevel=1`). Phải/nền — cảnh bàn học WebGL (mục 4) với SVG tĩnh giữ chỗ. Bỏ `LandingHeroNotes` và eyebrow thừa.
2. **Môn học** (`#mon-hoc`): tiêu đề "Môn học của bạn" + link nhỏ "Đổi cấp"; `SubjectGrid` giữ nguyên dữ liệu và trạng thái `compiling` ("Đang biên soạn"); thẻ xuất hiện kiểu pop-up khi cuộn tới. Bỏ câu mô tả và khối "Đã lưu trong tab này".
3. **Học thế nào** (`#cach-hoc`): ba thẻ giấy nổi CSS 3D, mỗi thẻ icon + 2–4 chữ:
   - **Hỏi** — một câu hỏi thật ("Vì sao bóng ngắn lại?").
   - **Song ngữ** — một câu có công tắc EN ⇄ VI bấm được trên thẻ (`aria-pressed`), cục bộ trong thẻ, không đổi ngôn ngữ toàn app.
   - **Tra thuật ngữ** — thẻ lật (mặt sau là định nghĩa; nút có `aria-expanded`), kèm link "Mở từ điển" → `/glossary`.
4. **Gia sư AI**: tiêu đề "Hỏi bất cứ lúc nào" / "Ask anytime"; `TutorDemoCard` là màn chat mẫu, tin nhắn hiện lần lượt khi cuộn tới, card nghiêng nhẹ theo chuột. Component `TutorSection` nhận `href?: string`; có `href` thì hiện nút "Thử ngay", không có thì ẩn (hiện chưa truyền).
5. **Kêu gọi cuối**: "Sẵn sàng chưa?" + nút **Bắt đầu học** (`#mon-hoc`); `DemandPollBanner` hiện ở mọi cấp, gọn một dòng.
6. **Footer**: giữ nguyên.

Chuyển động: dùng lại cơ chế `data-landing-reveal` (IntersectionObserver) có thêm độ sâu 3D (`translateZ`/`rotateX` nhỏ). Tắt hết khi `prefers-reduced-motion`.

Chữ (VI/EN) cụ thể của tiêu đề hero theo cấp:
- Tiểu học: "Bắt đầu từ / điều em tò mò." — "Start with / what you wonder."
- THCS: "Từng câu hỏi / mở rộng hiểu biết." — "Every question / grows understanding."
- THPT: "Hiểu khoa học / từ câu hỏi đầu tiên." — "Make sense of science, / one question at a time."

Câu phụ chung: "Bài học song ngữ, theo đúng chương trình của em." — "Bilingual lessons that follow your curriculum."

## 3b. Công tắc ngôn ngữ bằng cờ

Thay chữ "EN"/"VI" bằng hai lá cờ ở **cả hai** công tắc: `components/nav/LanguageToggle.tsx` (navbar, toàn app) và công tắc trên thẻ "Song ngữ" (mục 3). Tiếng Việt: cờ Việt Nam; tiếng Anh: cờ Anh (Union Jack).

- Cờ là SVG tĩnh `frontend/public/flags/vn.svg`, `frontend/public/flags/gb.svg` (< 2 KB mỗi file, không script/href), render bằng `<img alt="">` cỡ ~20×14 px, bo góc nhẹ. Không dùng emoji cờ (Windows hiện "VN"/"GB").
- Mỗi nút giữ tên truy cập bằng chữ: `aria-label="Tiếng Việt"` / `"English"`, `aria-pressed` cho lựa chọn đang bật; `title` cùng nội dung để hiện tooltip. Vùng chạm ≥ 44 px, trạng thái chọn thể hiện bằng viền/nền token (`bg-nav-ink` như hiện tại), không chỉ bằng độ mờ của cờ.
- Màu quốc kỳ nằm trong file SVG ở `public/`; ratchet màu thô chỉ quét `.tsx` trong `app/`, `components/`, `features/` nên không cần ngoại lệ.

## 4. Cảnh 3D hero

Nội dung: một mặt bàn nhìn chéo từ trên, cuốn vở mở ở giữa, đồ vật quanh vở theo cấp (khớp bộ hoạ tiết):
- `primary`: bút chì, thước kẻ, hộp phấn.
- `lower_secondary`: compa, ê-ke, máy tính cầm tay.
- `upper_secondary`: bình tam giác, kính lúp, bàn phím.

Chuyển động: đồ vật trôi nhẹ; camera lệch theo chuột (desktop) trong biên độ nhỏ. Không tương tác bấm.

Kỹ thuật:
- Chỉ thêm dependency `three` (không R3F/drei). Import theo module để tree-shake; chunk riêng, không nằm trong bundle đầu. Mục tiêu ≤ 160 KB gzip cho chunk cảnh.
- `HeroScene` tải bằng `next/dynamic({ ssr: false })`, chỉ bắt đầu sau `requestIdleCallback` (fallback `setTimeout`) khi hero trong viewport.
- `HeroFallback` là SVG tĩnh cùng bố cục, luôn render trước; khung hero có kích thước cố định (`aspect-ratio`) nên CLS = 0. Khi cảnh vẽ khung đầu tiên thì cross-fade.
- `canRunHeroScene(env)` là hàm thuần trả `false` khi: `prefers-reduced-motion: reduce`; `navigator.connection.saveData`; `deviceMemory ≤ 2`; `hardwareConcurrency ≤ 2`; không tạo được WebGL context. Khi `false`, giữ SVG.
- Khi chạy: `setPixelRatio(min(devicePixelRatio, 1.5))`; dừng vòng vẽ khi hero ra khỏi viewport (IntersectionObserver) hoặc `document.hidden`; unmount thì `dispose()` geometry, material, renderer và gỡ listener. Mất WebGL context (`webglcontextlost`) → quay về SVG.
- Màu: đọc token của cấp (`--paper`, `--surface`, `--ink`, `--line`, `--nav`, `--action`, `--accent` nếu có) qua `getComputedStyle` trên phần tử hero; không viết mã màu trong code cảnh. Hàm `readSceneColors(el)` trả về bảng màu đã parse, có giá trị trung tính dự phòng lấy từ token `neutral` khi đọc lỗi.
- Đồ vật là dữ liệu: `sceneObjects: Record<EducationLevel, SceneObject[]>` (kiểu hình khối, kích thước, vị trí, vai màu token). Code dựng cảnh không rẽ nhánh theo cấp.
- Canvas có `aria-hidden="true"`; hero có ý nghĩa đầy đủ không cần cảnh.

## 5. File

Trong `frontend/features/landing/`:
- Viết lại: `LevelGate.tsx`, `level-gate.module.css`, `LandingPage.tsx`, `landing.module.css`.
- Mới: `hero/HeroScene.tsx`, `hero/HeroFallback.tsx`, `hero/sceneObjects.ts`, `hero/canRunHeroScene.ts`, `hero/readSceneColors.ts`, `HowItWorks.tsx`, `TutorSection.tsx`.
- Sửa ngoài landing: `frontend/components/nav/LanguageToggle.tsx` (cờ); mới `frontend/public/flags/vn.svg`, `gb.svg`.
- Sửa: `TutorDemoCard.tsx` (hiện lần lượt khi vào viewport), `GuestLandingFlow.tsx`, `frontend/app/page.tsx` (bỏ `informatics` khỏi `LevelGate`).
- Xoá: `LandingHeroNotes.tsx`, `landing-hero-notes.module.css`, `DevelopmentPreview`, CSS không dùng.
- Cập nhật trang QA: `frontend/app/dev/landing-showcase`, `frontend/app/dev/landing-level-gate`.
- Tài liệu: `DESIGN.md` (mục landing/cổng), `PROJECT_STATE.md` (quyết định "cả ba cấp đã ra mắt" thay "hai cấp nhỏ hiển thị Sắp ra mắt").

## 6. Kiểm thử

Unit (vitest):
- `canRunHeroScene`: từng điều kiện tắt và trường hợp bật.
- `sceneObjects`: đủ ba cấp, mỗi cấp ≥ 3 đồ vật, vai màu chỉ là token hợp lệ.
- `readSceneColors`: parse token; dùng dự phòng khi thiếu.
- `LevelGate`: form POST, ba nút `name="level"` đúng giá trị, không còn chữ "Sắp ra mắt"/"Chưa có bài học", `saveError` hiện alert, "Đang chọn" đúng cấp.
- `TutorSection`: nút chỉ hiện khi có `href`.
- `LanguageToggle`: hai nút có `aria-label` "Tiếng Việt"/"English", đúng `aria-pressed`, dùng ảnh cờ, không còn chữ "EN"/"VI" hiển thị.
- `HowItWorks`: công tắc song ngữ đổi câu và `aria-pressed`; thẻ lật đổi `aria-expanded`.

Test sẵn có phải qua: ratchet màu thô (`theme-baseline.json` không tăng), `rootTheme.test.ts`, `patterns.test.ts`, typecheck toàn repo, `next build`.

QA thủ công (Playwright/Chromium): cổng và landing ở 1280 px và 375 px × ba cấp × VI/EN; không cuộn ngang; điều khiển bằng bàn phím; `prefers-reduced-motion` hiện SVG và không có hiệu ứng lật; chunk `three` không nằm trong JS tải đầu của `/`; không cảnh báo hydration.

## 7. Rủi ro

- WebGL giật trên máy yếu → `canRunHeroScene` + giới hạn DPR + dừng khi khuất.
- Kích thước bundle → chunk riêng, tải khi rảnh, đo trong QA.
- Model low-poly trông thô → giữ phong cách phẳng màu có chủ đích, đồng bộ với hoạ tiết vẽ tay; SVG dự phòng dùng cùng bố cục.
