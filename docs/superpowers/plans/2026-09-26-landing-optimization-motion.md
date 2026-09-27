# Landing Fake-3D & Navbar Implementation Plan

## Revision 2 — yêu cầu mới, thay thế các quyết định xung đột bên dưới

Người dùng yêu cầu bỏ hero 3D thật vì lag, dùng fake 3D và thiết kế navbar đẹp, sinh động hơn. Đây là bản cập nhật plan; chưa triển khai code. Các đoạn mô tả WebGL bên dưới chỉ còn dùng làm baseline của hiện trạng. Revision này thay thế toàn bộ hướng giữ renderer, Task 3 cũ, giới hạn 30 fps/DPR và điều khoản không sửa navbar.

### Hero mới: SVG/CSS giả 3D

- Bỏ WebGL/Three.js khỏi hero trên mọi thiết bị. Không giữ scene như chế độ nâng cao.
- Nâng `HeroFallback.tsx` thành minh hoạ chính: sách mở ở trung tâm, dụng cụ theo cấp xếp quanh. Vẽ chiều sâu bằng mặt bên, lớp giấy, góc phối cảnh, bóng tĩnh và lớp hình chồng nhau. Giữ palette token hiện có.
- Render SVG ngay với aspect-ratio cố định; không chờ tải scene, không chuyển fallback → canvas.
- Entrance một lần: tối đa 3 nhóm hình, opacity và translate 8 px, duration 450 ms, stagger 60 ms. Chữ và CTA luôn hiện ngay.
- Mobile dùng góc nhìn cố định, giảm chi tiết nhỏ. Không pointermove/parallax, float vô hạn, blur động hay requestAnimationFrame loop.
- Reduced motion hiện toàn bộ minh hoạ ngay. Hình truyền tải ý nghĩa có nhãn EN/VI; lớp trang trí aria-hidden.

### Navbar mới: gọn, có chiều sâu và phản hồi rõ

- Navbar dùng chung toàn web: giữ sticky, chiều cao ổn định 64 px, màu `--nav` theo cấp; chia rõ logo / điều hướng / ngôn ngữ và tài khoản. Không blur nền hoặc đổi chiều cao khi cuộn.
- Giữ logo SciPal, bỏ nhãn phụ “EdTech” để gọn. Viền sáng mảnh và bóng tĩnh tạo chiều sâu; màu dẫn xuất từ token.
- Mục đang chọn có nền bo tròn tương phản và chữ đậm; giữ `aria-current`. Hover/focus phản hồi 150 ms, active không phụ thuộc hover.
- Icon SVG/Lucide thống nhất cho nhóm menu, thay ký tự hamburger/đóng mobile. Chevron xoay 160 ms theo trạng thái.
- Dropdown nền surface, viền rõ, bo 14–16 px, bóng tĩnh; mở bằng opacity + translateY 6 px trong 180 ms. Bỏ scaleY kéo giãn chữ, không stagger dài.
- Nút đăng nhập màu đảo nav/nav-ink, phản hồi nhấn scale 0.98. Tên tài khoản dài truncate, không đẩy các nút ra ngoài.
- Mobile: logo, đổi ngôn ngữ, nút menu 44 px; giữ ThemeToggle theo feature flag hiện có. Panel mở dưới thanh, nhóm rõ, item ít nhất 44 px, cuộn được khi màn thấp.
- Kiểm layout 1024/1280 px với EN, admin/teacher và tên dài. Chuyển sang menu compact khi thiếu chỗ thay vì thu chữ nhỏ.
- Giữ menu theo quyền, auth/logout, SubjectSwitcher, URL và prefetch. Escape đóng và trả focus về trigger; bấm ngoài/đổi route đóng; menu đóng không nhận tab focus.
- Chỉ đổi navbar dùng chung, không redesign thân các trang khác. Kiểm hồi quy các route đó vì cùng sử dụng navbar.

### Task 3 thay thế — Chuyển hero sang SVG/CSS

**Modify:** `frontend/features/landing/hero/HeroStage.tsx`, `HeroFallback.tsx`, `hero.module.css`, `HeroStage.test.tsx`, `frontend/scripts/qa-landing.mjs`.

**Interface:** Giữ `HeroStage({ level }: { level: EducationLevel })`; render trực tiếp SVG, không loading/ready/fallback renderer state.

- [ ] Test minh hoạ của cả 3 cấp, token/nhãn đúng và không canvas.
- [ ] Nâng SVG theo thiết kế trên; thêm entrance CSS hữu hạn và reduced motion.
- [ ] Gỡ dynamic import scene và runtime WebGL. Kiểm consumer trước khi gỡ các file renderer/helper và test riêng của chúng; giữ dữ liệu bố cục SVG còn cần.
- [ ] Thay test hợp đồng renderer đã hết hiệu lực bằng kiểm hợp đồng SVG; không xoá test để che lỗi còn tồn tại.
- [ ] Tìm toàn repo nơi dùng `three`/`@types/three`; chỉ gỡ dependency và cập nhật lockfile nếu không còn consumer.
- [ ] Cập nhật QA script: bỏ kỳ vọng canvas/hero-ready và cờ SwiftShader bắt buộc; kiểm SVG và network không tải chunk Three.js khi chọn cấp/cuộn.
- [ ] Chạy `pnpm --filter @scipal/web test features/landing/hero`; QA SVG ở 375/768/1280 px và cả 3 cấp.

**Done:** Hero có chiều sâu giả 3D, không canvas, WebGL context, scene chunk hay loop JS.

### Task 3B mới — Navbar dùng chung

**Modify:** `frontend/components/nav/NavBar.tsx`, `SubjectSwitcher.tsx`, `LanguageToggle.tsx`, `navToggleStyles.ts` chỉ phần trình bày cần đồng bộ.
**Create:** `frontend/components/nav/navbar.module.css`, `frontend/components/nav/NavBar.test.tsx`.
**Interfaces:** Giữ props/callback hiện có; không refactor auth hoặc thay quyền trong task thiết kế.

- [ ] Ghi fixture guest/student/teacher/admin; test đúng menu/link, active route con, expanded state. Kiểm interaction bằng browser, không chỉ SSR snapshot.
- [ ] Áp thiết kế navbar trên; gom style lặp vào CSS module; dùng token theo cấp.
- [ ] Đổi icon và animation menu; kiểm keyboard, Escape, click ngoài, đổi route, trả focus và menu đóng không nhận tab.
- [ ] Chạy `pnpm --filter @scipal/web test components/nav`; QA 375/768/1024/1280 px, EN/VI, 3 palette, tên dài, reduced motion.
- [ ] Smoke test `/`, `/glossary`, route môn thật và route theo role bằng fixture; `/login` tiếp tục không hiện navbar. Không báo fixture là auth production đã kiểm chứng.

**Done:** Navbar đẹp, có active/hover/open states rõ và không hồi quy điều hướng/phân quyền.

### Nghiệm thu và thứ tự mới

- Thứ tự: Task 1 → Task 2 → Task 3 thay thế → Task 3B → Task 4 → Task 5.
- Task 1 vẫn đo bản WebGL hiện tại làm baseline; không cần xác nhận nguyên nhân lag mới được bỏ WebGL vì người dùng đã chọn giải pháp.
- Task 5 bỏ test context-loss/fallback/30 fps. Thay bằng SVG hiện ngay, không canvas/scene chunk, reduced motion, không loop JS, đổi cấp/ngôn ngữ đúng và navbar đầy đủ role/route.
- Thêm test navbar vào tập kiểm tra liên quan; giữ typecheck/build frontend và so sánh before/after cùng preset. Không hứa mức tăng tốc trước khi đo.
- Các phần copy, catalog và motion phụ bên dưới tiếp tục là đề xuất. Phạm vi mới bao gồm navbar dùng chung; backend, auth, schema và thân trang khác giữ nguyên.

---

## Bản nền v1 — đọc cùng Revision 2; không thực thi Task 3 cũ

> **For agentic workers:** Use `superpowers:executing-plans` to implement task-by-task after the user approves this proposal. Steps use checkboxes. No implementation is authorized by this document alone.

**Goal:** Làm landing SciPal bắt mắt hơn, dễ đi vào học hơn và giữ trải nghiệm mượt trên điện thoại.

**Architecture:** SVG/CSS giả 3D render trực tiếp; navbar dùng CSS Modules và token hiện tại; giữ luồng cấp học/catalog và auth.

**Tech Stack:** Next.js 15, React 19, TypeScript, CSS Modules, SVG, Vitest.

**Spec / authority:** AGENTS.md; `.agents/rules/`; implementation hiện tại; `DESIGN.md`; `docs/superpowers/specs/2026-09-26-landing-redesign-design.md`. Các đề xuất mới bên dưới là phần bổ sung chờ duyệt, không phải thiết kế đã được duyệt. Khi tài liệu cũ mâu thuẫn về nhận diện, ưu tiên toàn bộ Chương trình GDPT 2018 theo yêu cầu hiện tại.

**Status:** Proposal — chỉ lập plan. Đã khảo sát code; chưa chạy browser audit, baseline hiệu năng hoặc test trong phiên lập plan. Người dùng đã chọn: cân bằng đẹp và mượt trên điện thoại; giữ nhận diện theo cấp học. Các chi tiết thiết kế bên dưới vẫn là đề xuất chờ duyệt. Không sửa rule, DESIGN.md, PROJECT_STATE.md hay code ứng dụng trong bước này.

## 1. Những gì đã có, không xây lại

- `LandingPage.tsx`: hero → môn học → cách học → Tutor → CTA → khảo sát → footer; scroll reveal đã có.
- `hero/HeroStage.tsx`: SVG hiện trước, chỉ yêu cầu chunk 3D khi hero vào viewport và trình duyệt rảnh.
- `hero/createHeroScene.ts`: giới hạn render 30 fps, DPR tối đa 1.5, dispose renderer; dừng khi hero khuất hoặc tab ẩn thông qua `HeroScene.tsx`.
- `hero/canRunHeroScene.ts`: fallback khi reduced motion, Save-Data, RAM/CPU thấp hoặc WebGL không dùng được.
- `HowItWorks.tsx`: đổi câu EN/VI và mở định nghĩa thuật ngữ đã có.
- `SubjectGrid.tsx`: THPT dùng marquee với nhóm thẻ lặp; hai cấp còn lại dùng grid. Cần xem trực tiếp khả năng chọn môn khi số lượng tăng.
- `LevelGate`: cổng chọn cấp dạng sách đã có. Giữ hành vi chọn cấp, chỉ kiểm hồi quy giao điểm gate → landing.

Các nhận xét trên là bằng chứng từ source, không chứng minh hiệu năng hoặc chất lượng hiển thị thực tế.

## 2. Hướng thiết kế đề xuất

Giữ palette theo cấp, Be Vietnam Pro, nét minh hoạ học tập và chiều sâu hiện tại. Người mới phải hiểu SciPal là nền tảng học song ngữ theo CTGDPT 2018 và thấy ngay lối vào môn học.

### Phản hồi phụ

| Vị trí | Hiệu ứng đề xuất | Giới hạn |
|---|---|---|
| CTA | Nhấn scale 0.98, mũi tên tiến 3 px khi hover/focus | 120–160 ms; vùng bấm giữ nguyên |
| Thẻ môn có link | Nhô 2 px, viền và biểu tượng phản hồi | 160–200 ms; môn đang biên soạn không giả khả năng mở bài |
| Đổi câu EN/VI | Crossfade câu trong khung ổn định | 160–200 ms; giữ nội dung thật, không typewriter |
| Thuật ngữ | Lật/mở định nghĩa có chủ đích khi bấm | 220–280 ms; keyboard tương đương chuột, trạng thái ARIA đúng |
| Section đi vào màn hình | Opacity + dịch tối đa 12 px | 300–400 ms, một lần; tổng stagger ≤ 160 ms |
| Reduced motion | Nội dung và trạng thái hiện trực tiếp | Không 3D, parallax, lật hay chờ hiệu ứng |

Không lặp lại màn xuất hiện khi đổi ngôn ngữ. Chuyển động không được trì hoãn navigation hoặc cập nhật dữ liệu.

### Nội dung và bố cục

- Đề xuất đổi tiêu đề THPT thành **“Hiểu từng bài / tiến từng bước.”**, EN **“Understand each lesson. / Move forward step by step.”** để không thu hẹp thương hiệu vào khoa học.
- Subline chung đề xuất: **“Học song ngữ Anh–Việt theo Chương trình GDPT 2018.”**, EN **“Learn in Vietnamese and English with Vietnam’s 2018 national curriculum.”**
- Giữ CTA chính “Xem môn học”; “Đổi cấp” là phụ. Mobile đặt CTA trước minh hoạ; điều chỉnh độ cao hero sau khi xem viewport thực tế.
- Đề xuất dùng grid tĩnh cho THPT như hai cấp còn lại, để người học tìm/chọn môn ổn định khi catalog lớn. Đây là thay đổi so với marquee hiện tại, cần duyệt cùng plan; thẻ vẫn có phản hồi tương tác.
- Giữ dữ liệu môn, trạng thái available/compiling/error và thông tin Tutor chuẩn bị sẵn. Không thêm số người dùng, thành tích, lời chứng thực hoặc AI hoạt động thật khi chưa có bằng chứng.

## 3. Global constraints

- Phạm vi `/` và component landing; SubjectGrid chỉ thay cách trình bày, không đổi hợp đồng dữ liệu hoặc logic availability.
- Bao gồm thiết kế navbar dùng chung; không đổi auth, backend, schema, cơ chế lưu cấp hoặc thân trang khác.
- Khách giữ cấp trong tab; tài khoản dùng luồng hiện có. Không đổi persistence vì lý do animation.
- Text mới có EN/VI; màu dùng token hiện tại, accent môn tiếp tục scoped bằng SubjectProvider.
- Không thêm phụ thuộc; hero không canvas, WebGL hoặc vòng render JS.
- Minimum hit target 44×44 px; focus rõ; reduced motion, keyboard, touch đều dùng được.
- Nội dung mặc định hiển thị; lỗi JS/observer không để lại các section vô hình.
- Chỉ test phần thay đổi theo từng task. Không chạy toàn bộ monorepo test suite trong phạm vi này.

## 4. Các task triển khai

### Task 1 — Baseline để chốt điểm tối ưu

**Files đọc:** `frontend/app/page.tsx`, `frontend/features/landing/GuestLandingFlow.tsx`, `DeferredLandingPage.tsx`, `hero/*`, `frontend/scripts/qa-landing.mjs`.

**Artifact mới:** `docs/qa/landing-optimization/baseline.md` cùng ảnh và trace đo được.

- [ ] Build production frontend; phục vụ trên cổng trống, không đè server đang chạy.
- [ ] Chụp gate và landing 375×812, 768×1024, 1280×800; cả 3 cấp × EN/VI. Dùng fixture hiện có cho state có dữ liệu/trống/lỗi; ghi rõ fixture hay live.
- [ ] Đo 3 lần cold load cùng CPU/network preset: LCP, CLS, initial JS gzip, chunk 3D, long tasks và hoạt động render. Lấy median; ghi máy, browser, commit, preset.
- [ ] Đo riêng thời gian từ chọn cấp tới tiêu đề/CTA dùng được. LCP của gate không được báo thành LCP của landing sau lựa chọn.
- [ ] Kiểm network và CPU trước/sau hero vào viewport, khi rời viewport và tab ẩn. Không dùng SwiftShader trong script QA hiện có làm bằng chứng FPS GPU thật.
- [ ] Chỉ ưu tiên tối ưu theo trace: render liên tục, tải chunk sau gate, hoặc server/catalog. Nếu nút thắt ngoài landing, ghi rõ và tách khỏi scope.

**Done:** Có số và ảnh baseline có thể tái lập; không dùng số đo từ phiên trước.

### Task 2 — Hierarchy, copy và lối vào môn học

**Modify:** `frontend/features/landing/LandingPage.tsx`, `landing.module.css`, `frontend/features/subjects/SubjectGrid.tsx`, `subject-grid.module.css`.
**Tests:** cập nhật `LandingPage.test.tsx`; thêm `frontend/features/subjects/SubjectGrid.test.tsx` cho hành vi catalog nếu đổi marquee sang grid.
**Interfaces:** Giữ `LandingPageProps`, `SubjectGridProps`, `LandingCatalog` và route của từng môn.

- [ ] Chốt copy đề xuất và grid tĩnh theo phần 2 khi duyệt plan.
- [ ] Cập nhật tests bảo vệ một thẻ/môn, link chỉ đúng trạng thái available, error khác empty, và cả EN/VI.
- [ ] Sửa copy, spacing và grid; không đổi dữ liệu hay ưu tiên Tin học thành nhận diện sản phẩm.
- [ ] Kiểm CTA trên mobile, tiêu đề tiếng Anh dài, tên môn dài, catalog lớn, anchor không bị navbar che và focus không ra ngoài màn hình.
- [ ] Chạy `pnpm --filter @scipal/web test features/landing/LandingPage.test.tsx features/subjects/SubjectGrid.test.tsx features/subjects/subjectAvailability.test.ts`.

**Done:** Chọn môn ổn định, bố cục không tràn và định vị GDPT 2018 rõ.

### Task 4 — Motion cho thao tác và khả năng truy cập

**Modify:** `LandingPage.tsx` (reveal hook), `landing.module.css`, `HowItWorks.tsx`, `sections.module.css`, `subject-grid.module.css`.
**Tests:** `HowItWorks.test.tsx`, `LandingPage.test.tsx`; browser interaction bổ sung vào `frontend/scripts/qa-landing.mjs`.
**Interfaces:** Giữ BilingualCard/TermCard public props, ngôn ngữ demo không đổi ngôn ngữ toàn app.

- [ ] Áp duration/amplitude ở bảng motion; giới hạn reveal, không chồng nhiều góc nghiêng.
- [ ] Nếu người dùng bật reduced motion sau khi trang đã mount, dừng chuyển động và hiện ngay mọi reveal đang chờ; cleanup observer/listener.
- [ ] Đảm bảo bấm nhanh đổi EN/VI hoặc mở/đóng thuật ngữ kết thúc ở trạng thái mới nhất, không có text biến mất hoặc vùng focus bị lật khỏi màn hình.
- [ ] Test bằng keyboard và touch; giữ aria-live vừa đủ, không đọc mỗi frame; kiểm thiếu IntersectionObserver và reduced motion ngay từ lần tải đầu.
- [ ] Chạy `pnpm --filter @scipal/web test features/landing/HowItWorks.test.tsx features/landing/LandingPage.test.tsx`.

**Done:** Mỗi hiệu ứng phản hồi một thao tác/trạng thái; reduced motion không mất nội dung hay tính năng.

### Task 5 — Đo lại và nghiệm thu landing

**Modify:** `frontend/scripts/qa-landing.mjs` nếu cần mở rộng 768 px và các case mới.
**Artifact mới:** `docs/qa/landing-optimization/results.md` và ảnh/trace sau thay đổi.

- [ ] Chạy test landing, navbar, subjects, theme liên quan; `pnpm --filter @scipal/web typecheck`; `pnpm --filter @scipal/web build`; `git diff --check`. Phân biệt lỗi sẵn có với lỗi do thay đổi.
- [ ] QA cùng ma trận baseline: 3 cấp × 2 ngôn ngữ × 3 viewport; reduced motion, SVG tĩnh, catalog error/empty/compiling, double-click gate, đổi cấp, reload cùng tab và tab mới.
- [ ] Đo lại cùng cấu hình và 3 lượt; báo before/after thay vì chỉ Lighthouse score. Mục tiêu dự án: median LCP ≤ 2.5 s, CLS ≤ 0.1 ở preset đã ghi; nếu baseline chưa đạt, ghi phần nguyên nhân và mức cải thiện thực tế.
- [ ] Giới hạn hồi quy: initial JS tăng không quá 5 KB gzip; mục tiêu không tăng; median thời gian gate → landing không chậm hơn baseline quá 10%. Không giữ hiệu ứng làm phát sinh long task > 50 ms do chính hiệu ứng đó.
- [ ] Xác nhận hero không canvas/chunk Three.js/loop JS; kiểm cuộn và mở menu trên mobile.
- [ ] Review một lượt ảnh desktop/mobile/tablet, sửa theo một batch, xác nhận lại phần sửa. Bàn giao bảng kết quả và hạn chế; không suy diễn INP thực tế hoặc production từ lab.

**Done:** Mọi hành vi yêu cầu đã quan sát trong browser, có dữ liệu so sánh và không hồi quy luồng vào học.

## 5. Review focus

1. Lần chọn cấp đầu trên mạng chậm: CTA xuất hiện và dùng được, animation không kéo dài chờ chunk — Task 1/5.
2. Thay reduced motion khi đang reveal: không còn nội dung opacity 0 hoặc menu còn chuyển động — Task 4.
3. Đổi cấp nhiều lần: SVG/token đúng và không tải scene; menu navbar giữ đúng trạng thái/focus — Task 3/3B.
4. Catalog nhiều môn/tên dài/trống/lỗi: không che môn hoặc bịa trạng thái — Task 2/5.
5. Bấm nhanh, keyboard, tiếng Anh trên 375 px: trạng thái cuối đúng, không mất focus/tràn ngang — Task 2/4/5.

## 6. Thứ tự và bàn giao

Thực hiện Task 1 → 2 → 3 → 3B → 4 → 5. Hoàn tất và kiểm đúng phần vừa sửa trước khi chuyển task. Nếu chỉ làm một đợt nhỏ, chọn Task 1–2 trước; không tuyên bố hoàn tất toàn plan khi các task motion chưa xong.

Đề xuất triển khai trực tiếp trong chat sau khi duyệt, vì các task cùng chạm landing và CSS, không cần chia nhiều agent. Không tự commit, deploy hoặc cập nhật rule trong bước lập plan.
