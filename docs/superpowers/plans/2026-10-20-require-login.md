# Bắt buộc đăng nhập Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khách chưa đăng nhập chỉ vào được các trang công khai; mọi tính năng khác chuyển sang đăng nhập, và cơ chế dùng thử 30 phút bị gỡ.

**Architecture:** `routeAccess` thu về hai loại `public | account`; middleware chỉ còn bảo trì, công tắc tính năng, đăng nhập, vai trò. Phần dùng thử (cookie ký, banner, Giáo sư khách, route backend, công tắc admin) bị xoá.

**Tech Stack:** Next.js 15 middleware (edge), Fastify, Vitest, pnpm/turbo.

**Spec:** `docs/superpowers/specs/2026-10-20-require-login-design.md`

## Global Constraints

- Công khai đúng danh sách: `/`, `/login`, `/reset-password`, `/auth`, `/pricing`, `/help`, `/privacy`, `/terms`, `/newsletter`, `/offline`, `/feature-off`; `/dev` chỉ khi `NODE_ENV === 'development'`.
- `/feedback`, `/lab`, `/tutor`, `/glossary`, `/exam`, `/subjects`, môn học và bài học là `account`.
- Giữ: bảo trì (`/maintenance`), công tắc tính năng admin (`featureVisible`), chặn teacher/admin theo vai trò, `clearLegacyLevelCookie`, cổng chọn cấp học bằng `sessionStorage`.
- Migration cũ và dữ liệu `guest_trials` giữ nguyên; **không** thêm migration (khoá `guest_trial` còn trong JSON `site_settings.features` không ảnh hưởng vì code chỉ đọc khoá đã biết).
- Giao diện: EN/VI, chỉ token màu sẵn có. `pnpm` only. `pnpm turbo typecheck` phải sạch trước khi gọi xong.
- Commit theo `<emoji> [type] scope: subject`, kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Khách mở `/feedback-extra`, `/helpful`, `/pricing-x`: không được lọt vì trùng tiền tố với trang công khai (chỉ khớp chính xác hoặc `prefix/`).
- Khách mở `/exam/<id>` (trước đây đã `account`): vẫn bị chuyển đăng nhập, `redirect` giữ cả query.
- Người đã đăng nhập mở `/glossary`, `/subjects`: qua, không hỏi API khách.
- Biến `GUEST_TRIAL_SECRET` vẫn cần cho newsletter, báo lỗi và đánh giá web (giữ `backend/src/guest/visitor.ts`); chỉ là khách không còn bị chặn vì thiếu biến này.
- Công tắc tính năng admin tắt một tính năng: khách vẫn thấy trang "đang bảo trì" hay chuyển đăng nhập (không lộ trang).

---

### Task 1: `routeAccess` hai loại, đổi tên file

**Files:**
- Create: `frontend/lib/routeAccess.ts`, `frontend/lib/routeAccess.test.ts`
- Delete: `frontend/lib/guestTrial.ts`, `frontend/lib/guestTrial.test.ts`
- Modify: `frontend/features/website-feedback/routeAccess.test.ts` (đổi import và kỳ vọng)

**Interfaces:**
- Produces: `export type RouteAccess = { kind: 'public' } | { kind: 'account' }` và `export function routeAccess(pathname: string): RouteAccess` trong `frontend/lib/routeAccess.ts`. Task 2 import hàm này.

- [ ] **Step 1: Viết `routeAccess.test.ts` (fail trước).** Các assertion: mỗi đường trong danh sách công khai (`/`, `/login`, `/login/x`, `/reset-password`, `/auth/callback`, `/pricing`, `/pricing/checkout`, `/help`, `/privacy`, `/terms`, `/newsletter/confirm`, `/offline`, `/feature-off`) → `{ kind: 'public' }`; mỗi đường `/subjects`, `/informatics`, `/informatics/vong-lap`, `/glossary`, `/exam`, `/exam/abc`, `/lab`, `/lab/wave-3d`, `/feedback`, `/tutor`, `/review`, `/profile`, `/helpful`, `/feedback-extra`, `/pricing-x` → `{ kind: 'account' }`. Riêng `/dev/x`: `public` khi `vi.stubEnv('NODE_ENV','development')`, `account` khi `'production'`.
- [ ] **Step 2: Chạy để thấy fail:** `pnpm --filter @scipal/web test -- lib/routeAccess` → FAIL (module chưa có).
- [ ] **Step 3: Tạo `lib/routeAccess.ts`:** chỉ danh sách công khai ở Global Constraints, khớp `pathname === p || pathname.startsWith(p + '/')` (hàm `under`), còn lại `account`. Không có cookie/HMAC/`TrialFeature`.
- [ ] **Step 4: Xoá `lib/guestTrial.ts` và `lib/guestTrial.test.ts`;** sửa `features/website-feedback/routeAccess.test.ts` import `@/lib/routeAccess` và đổi kỳ vọng thành `/feedback`, `/feedback-extra` đều `{ kind: 'account' }` (đổi tên test cho đúng nghĩa).
- [ ] **Step 5: Chạy** `pnpm --filter @scipal/web test -- lib/routeAccess features/website-feedback/routeAccess` → PASS. (Typecheck chưa sạch tới Task 2/3 vì middleware và banner còn import file cũ; không chạy turbo ở đây.)
- [ ] **Step 6: Commit** `✨ [feat] access: routeAccess has public and account only` (kèm Task 2 nếu typecheck cần cùng commit).

### Task 2: Middleware không còn dùng thử

**Files:**
- Modify: `frontend/middleware.ts`, `frontend/middleware.test.ts`

**Interfaces:**
- Consumes: `routeAccess` từ `./lib/routeAccess` (Task 1).
- Produces: `middleware(request)` giữ nguyên chữ ký; `loginRedirect(request)` không còn tham số `reason`.

- [ ] **Step 1: Sửa `middleware.test.ts` (fail trước).** Xoá `describe('guest trials')` cùng import `readTrials, signTrials`. Thay bằng `describe('login required')` với `visit(path)`: khách mở `/`, `/login`, `/pricing`, `/help`, `/auth/callback` → 200; khách mở `/glossary`, `/subjects`, `/informatics/vong-lap`, `/tutor`, `/lab`, `/feedback`, `/progress` → 307 với `location` chứa `/login?redirect=` + đường đã mở và **không** chứa `reason=trial`; `fetch` không bao giờ được gọi cho trang (không còn API khách). Một test: khách mở `/subjects?grade=10` thì `redirect` mang cả `?grade=10` (đã mã hoá). Giữ nguyên các test dọn cookie cũ, đơn hàng/lớp và bảo trì; test "chạy trên mọi trang" giữ.
- [ ] **Step 2: Chạy để thấy fail:** `pnpm --filter @scipal/web test -- middleware` → FAIL ở các trang trước đây là trial.
- [ ] **Step 3: Sửa `middleware.ts`:** xoá `guestTrial`, `rememberTrials`, `visitorIp`, `subjectExists` + `subjectCache` + import `fetchSubjectSlugs`, hằng `TRIAL_COOKIE_DAYS`, `API_BASE`, import từ `guestTrial`. `loginRedirect(request)` bỏ tham số `reason`. Nhánh `!user` còn một dòng: `response = loginRedirect(request)`. Điều kiện đọc `siteSettings()` chỉ khi `feature` khác null. Giữ phần còn lại.
- [ ] **Step 4: Chạy** `pnpm --filter @scipal/web test -- middleware` → PASS.
- [ ] **Step 5: Commit** `✨ [feat] middleware: visitors sign in for every feature page`.

### Task 3: Gỡ Giáo sư khách và banner dùng thử ở giao diện

**Files:**
- Delete: `frontend/features/guest/` (cả thư mục: `GuestTrialBanner.tsx`, `GuestTutor.tsx`, `TrialEndedNote.tsx`, `useGuestTutor.ts`, `guest.test.tsx`)
- Modify: `frontend/app/layout.tsx` (bỏ import và `<GuestTrialBanner />`), `frontend/app/login/page.tsx` (bỏ `TrialEndedNote`, `reason === 'trial'`), `frontend/app/tutor/page.tsx`, `frontend/features/ai-tutor/AiTutorPanel.tsx`, `frontend/features/ai-tutor/TutorSession.tsx`, `frontend/features/ai-tutor/TutorSession.test.tsx`, `frontend/features/landing/LandingTutor.tsx`

**Interfaces:**
- Produces: `AiTutorPanel` không còn prop `guest`; context `TutorSession` bỏ khoá `guest`; `/tutor` khách không bao giờ tới trang (middleware chặn), nhưng nếu `user` null vẫn `redirect('/login?redirect=%2Ftutor')`.

- [ ] **Step 1: Viết/điều chỉnh test (fail trước).** Trong `TutorSession.test.tsx` xoá test `GuestTutorView` và import của nó. Thêm vào `features/ai-tutor/` (hoặc test sẵn của `AiTutorPanel` nếu có) một test: render `AiTutorPanel` với `signedIn={false}` → có chữ "Đăng nhập để hỏi thầy" và liên kết `/login?redirect=`, **không** có `textbox`.
- [ ] **Step 2: Chạy để thấy fail:** `pnpm --filter @scipal/web test -- features/ai-tutor` → FAIL (còn nhánh khách / import hỏng sau khi xoá thư mục sẽ báo ở bước 4).
- [ ] **Step 3: Sửa code.** `AiTutorPanel`: bỏ prop `guest`, import `GuestTutor`; điều kiện `: guest || session ? … : (…)` còn nhánh lời mời đăng nhập (khối hiện có). `TutorSession.tsx`: bỏ `useGuestTutor`, `guest` khỏi kiểu context/giá trị và `reset` dựa vào nó (xem `const { reset } = guest;` — dùng reset của chat nếu cần, nếu `reset` chỉ dành cho khách thì bỏ). `LandingTutor`: bỏ prop `guest` khi gọi `AiTutorPanel`, sửa chú thích đầu hàm. `tutor/page.tsx`: nhánh `!user` thành `redirect('/login?redirect=%2Ftutor')` (import `redirect` từ `next/navigation`), xoá `GuestTutor` và JSX khách. `layout.tsx`, `login/page.tsx`: bỏ phần dùng thử; `mode` mặc định chỉ theo `?mode=signup`.
- [ ] **Step 4: Xoá thư mục `features/guest/`.**
- [ ] **Step 5: Chạy** `pnpm --filter @scipal/web test -- features/ai-tutor features/landing app` rồi `pnpm --filter @scipal/web typecheck` → PASS, 0 lỗi.
- [ ] **Step 6: Commit** `♻️ [refactor] web: remove guest trial banner and guest tutor`.

### Task 4: Gỡ route khách và công tắc `guest_trial` ở backend và admin

**Files:**
- Delete: `backend/src/routes/guest.ts`, `backend/src/__tests__/guest-trials.test.ts`
- Modify: `backend/src/index.ts` (bỏ import và `app.register(guestRoutes)`), `backend/src/plugins/auth.ts` (bỏ dòng `/api/guest/trial`, `/api/tutor/guest` và chú thích), `backend/src/site/features.ts`, `backend/src/__tests__/siteSettings.test.ts`, `frontend/lib/siteSettings.ts`, `frontend/lib/siteSettings.test.ts`, `frontend/features/admin-site/SiteSwitches.tsx`

**Interfaces:**
- Produces: `SITE_FEATURES = ['glossary','exam','pricing','classes','tutor'] as const` ở **cả** `backend/src/site/features.ts` và `frontend/lib/siteSettings.ts` (hai bản phải khớp); `ALL_ON` và nhãn/mô tả công tắc bỏ `guest_trial`.

- [ ] **Step 1: Sửa test trước (fail).** `siteSettings.test.ts` (backend) và `lib/siteSettings.test.ts` (frontend): bỏ `guest_trial` khỏi mọi `features` kỳ vọng; thêm một assertion: `resolveSiteSettings({ features: { guest_trial: false } , ... })` không có khoá `guest_trial` trong kết quả (khoá lạ bị bỏ qua). Thêm test auth: `POST /api/guest/trial` và `POST /api/tutor/guest` không còn là route công khai (trả 401 hoặc 404, không 200) — đặt trong test auth sẵn có của backend nếu có, hoặc `siteSettings`-cạnh nhất.
- [ ] **Step 2: Chạy để thấy fail:** `pnpm --filter @scipal/api test -- siteSettings` và `pnpm --filter @scipal/web test -- lib/siteSettings` → FAIL.
- [ ] **Step 3: Sửa code** theo danh sách file ở trên. `SiteSwitches.tsx`: bỏ dòng mô tả `guest_trial`. Kiểm tra `grep -rn "guest_trial\|GUEST_TUTOR\|GUEST_TRIAL" backend/src frontend packages` còn sót thì xử lý; tài liệu `.env.example` nếu có nhắc `GUEST_TRIAL_SECRET`/`GUEST_TUTOR_DAILY_CAP` thì xoá dòng.
- [ ] **Step 4: Chạy** `pnpm --filter @scipal/api test` và `pnpm --filter @scipal/web test -- lib/siteSettings features/admin-site` → PASS.
- [ ] **Step 5: Commit** `♻️ [refactor] api: remove guest trial routes and the guest_trial switch`.

### Task 5: Cache của service worker lên v2, kiểm tra toàn bộ

**Files:**
- Modify: `frontend/public/sw.js` (`VERSION = 'v2'`), `frontend/lib/pwa/cacheNames.ts` (`scipal-pages-v2`, `scipal-static-v2`)
- Modify: `PROJECT_STATE.md` (ghi mục 20/10: bắt buộc đăng nhập, danh sách công khai, những gì đã xoá, thứ tự triển khai)

- [ ] **Step 1: Sửa `sw.js` và `cacheNames.ts`** cho khớp; test `lib/pwa/pwa.test.ts` đang kiểm hai bên bằng nhau.
- [ ] **Step 2: Chạy toàn bộ:** `pnpm turbo typecheck` (7/7 sạch), `pnpm --filter @scipal/web test -- lib middleware features/ai-tutor features/landing features/admin-site features/website-feedback`, `pnpm --filter @scipal/api test` → PASS.
- [ ] **Step 3: Kiểm tay bằng Browser** (dev server, chưa đăng nhập): `/`, `/pricing`, `/help` mở được; `/glossary`, `/subjects`, `/tutor`, `/lab` chuyển `/login?redirect=…`; đăng nhập rồi về đúng trang; nút Giáo sư nổi ở landing mở lời mời đăng nhập. Ghi kết quả vào báo cáo.
- [ ] **Step 4: Commit** `🔧 [chore] pwa: cache v2 after guests lose public pages` và commit `PROJECT_STATE.md`.

## Triển khai
Backend và frontend cùng nhịp; không có migration. Sau khi deploy, thiết bị đã cache trang cũ sẽ bỏ cache v1 khi service worker v2 kích hoạt.

## Còn lại có chủ đích
API backend công khai cho tra từ điển, `/api/exam/*` danh sách… vẫn mở (landing và bảng giá cần một phần); cổng là middleware web. Nếu muốn chặn cả API cho khách, đó là việc riêng.
