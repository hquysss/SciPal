# SciPal Login Katha UI & 10 Effects Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chuyển giao trọn vẹn 100% linh hồn thẩm mỹ và 10 tầng hiệu ứng thị giác của Katha sang trang Login SciPal (`/login`), kết hợp hệ màu Ngọc Lục Bảo (Emerald/Mint/Gold), họa tiết hình thoi học thuật (`DiamondMark`), và cơ chế co giãn tỷ lệ màn hình (Fluid Scaling) không thanh cuộn trên laptop/mobile.

**Architecture:** Mở rộng và hoàn thiện hệ thống token màu bề mặt trong `frontend/app/login/login.css` dựa trên Katha design system; cập nhật `frontend/app/login/page.tsx` và `frontend/app/login/KhmerVine.tsx` để tích hợp 10 hiệu ứng hoạt ảnh (living photo drift, photo sheen sweep, tactile neuromorphic inputs with anti-autofill, button gloss sweep, botanical vine sway, seam jewel node, diamond academic mark, fluid viewport clamp, spring physics dialog); đảm bảo a11y và reduced motion.

**Tech Stack:** Next.js 15 App Router, React 18, Tailwind CSS, Pure CSS Animations & Keyframes, @scipal/hooks, @scipal/ui.

**Spec:** `docs/superpowers/specs/2026-09-23-login-katha-ui-effects-design.md`

## Global Constraints
- Node 20+, pnpm 9.15.4 monorepo.
- Monorepo packages: `@scipal/types`, `@scipal/hooks`, `@scipal/supabase`, `@scipal/ui`, `frontend` (Next.js 15).
- Không hardcode màu sắc trực tiếp — mọi màu phụ thuộc môn học/brand đọc qua biến CSS token (`--lg-gold`, `--lg-primary`, `--lg-field`, etc.).
- Bắt buộc hỗ trợ song ngữ (Bilingual first-class: EN/VI) qua `@scipal/hooks`.
- Mọi hoạt ảnh phức tạp phải bọc trong `@media (prefers-reduced-motion: reduce)`.
- Không gửi `answer_key` hay secret role key xuống frontend.

## Review Focus
1. **Màn hình laptop 1366x768 hoặc Windows scale 125%/150%**: Toàn bộ Folio và popup bubble của Mascot nằm gọn trong viewport (`100dvh`) mà không xuất hiện thanh cuộn dọc không mong muốn.
2. **Trình duyệt tự động điền form (Chromium Autofill)**: Các ô nhập liệu không bị biến thành màu vàng/xanh khó nhìn, giữ nguyên inset shadow và màu ngọc lục bảo.
3. **Hoạt ảnh chuyển động ảnh (Photo Drift 24s & Sheen sweep)**: Chuyển động mượt mà ở 60fps, không gây lag CPU hay layout shift, tự động ngắt khi bật `prefers-reduced-motion: reduce`.
4. **Dark mode toggle**: Hiển thị khối nổi 3D đa tầng (neuromorphic) đúng phong cách Katha Uiverse nhưng với sắc đen vũ trụ và viền ngọc bích dạ quang.
5. **Tiêu đề Đăng nhập**: Hiển thị họa tiết `DiamondMark` đồng điệu với mấu ngọc Seam divider, tuyệt đối không dùng emoji `✨`.

---

## Task Structure

### Task 1: Hệ thống Token Bề mặt & Triệt tiêu Nền Vàng Autofill (`login.css`)

**Files:**
- Modify: `frontend/app/login/login.css`

**Interfaces:**
- Consumes: CSS variables `--lg-*`, dark mode selectors `:root[data-theme='dark'] .katha-login-page`, `.dark .katha-login-page`.
- Produces: `--login-inset`, `--login-glow`, shadow parameters, and Chromium `-webkit-autofill` override rules.

- [ ] **Step 1: Định nghĩa bộ Token Inset & Glow cho Light và Dark Mode**

Cập nhật trong `frontend/app/login/login.css`:
```css
.katha-login-page {
  /* ...existing tokens... */
  --login-inset: inset 4px 4px 8px rgba(15, 23, 42, 0.06), inset -4px -4px 8px #ffffff;
  --login-glow: inset 0 0 10px rgba(5, 150, 105, 0.4), inset 0 0 10px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.25);
}

:root[data-theme='dark'] .katha-login-page,
.dark .katha-login-page {
  /* ...existing dark tokens... */
  --login-inset: inset 5px 5px 10px #040609, inset -5px -5px 10px #18202e;
  --login-glow: inset 0 0 10px rgba(16, 185, 129, 0.5), 0 0 25px rgba(16, 185, 129, 0.4);
}
```

- [ ] **Step 2: Triệt tiêu nền vàng/xanh Autofill của Chrome**

Thêm rules xử lý `-webkit-autofill`:
```css
.katha-login-input-wrap input:-webkit-autofill,
.katha-login-input-wrap input:-webkit-autofill:hover,
.katha-login-input-wrap input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--lg-ink);
  -webkit-box-shadow: var(--login-inset), 0 0 0 1000px var(--lg-field) inset !important;
  box-shadow: var(--login-inset), 0 0 0 1000px var(--lg-field) inset !important;
  transition: background-color 9999s ease-out;
}
```

- [ ] **Step 3: Kiểm tra biên dịch CSS và typecheck**

Chạy:
```bash
pnpm turbo typecheck
```
Kỳ vọng: PASS (7/7 packages).

- [ ] **Step 4: Commit**

```bash
git add frontend/app/login/login.css
git commit -m "style(login): add tactile tokens and anti-autofill overrides"
```

---

### Task 2: Living Photo Cinematic Drift (24s) & Photo Sheen Sweep

**Files:**
- Modify: `frontend/app/login/login.css`

**Interfaces:**
- Consumes: `.katha-login-figure`, `.katha-login-photo`, `.katha-login-photo-img`.
- Produces: `@keyframes katha-login-photo-drift`, `.katha-login-photo::after` (112° sheen sweep).

- [ ] **Step 1: Cấu hình hoạt ảnh Living Photo Drift 24s**

Thêm keyframes và gắn vào ảnh hero:
```css
@keyframes katha-login-photo-drift {
  from {
    transform: scale(1.02) translate3d(-0.35%, 0.2%, 0);
  }
  to {
    transform: scale(1.08) translate3d(0.45%, -0.35%, 0);
  }
}

.katha-login-photo-img {
  transform-origin: center 56%;
  animation: katha-login-photo-drift 24s ease-in-out infinite alternate;
}
```

- [ ] **Step 2: Cấu hình vệt sáng quang phổ góc 112° (Photo Sheen Sweep)**

Thêm pseudo-element `::after` cho `.katha-login-photo`:
```css
.katha-login-photo::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(
    112deg,
    transparent 28%,
    color-mix(in srgb, #d1fae5 24%, transparent) 47%,
    transparent 65%
  );
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: translateX(-75%);
  transition: opacity 700ms ease, transform 1.6s ease;
}

.katha-login-photo:hover::after,
.katha-login-photo:focus-within::after {
  opacity: 1;
  transform: translateX(45%);
}
```

- [ ] **Step 3: Bổ sung Prefers-Reduced-Motion**

```css
@media (prefers-reduced-motion: reduce) {
  .katha-login-photo-img {
    animation: none;
  }
  .katha-login-photo::after {
    display: none;
    transition: none;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/app/login/login.css
git commit -m "feat(login): add living photo drift 24s and sheen sweep"
```

---

### Task 3: Botanical Vine Sway & Seam Divider Jewel Glow

**Files:**
- Modify: `frontend/app/login/login.css`
- Modify: `frontend/app/login/KhmerVine.tsx`

**Interfaces:**
- Consumes: `.katha-login-vine`, `.katha-login-vine-left`, `.katha-login-vine-right`, `.katha-login-seam`.
- Produces: `@keyframes login-vine-sway` (12s alternate cycle), Seam hairline with diamond jewel center.

- [ ] **Step 1: Hoàn thiện KhmerVine component và CSS animation**

Trong `frontend/app/login/login.css`:
```css
.katha-login-vine {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 5.5rem;
  opacity: 0.28;
  color: var(--lg-gold);
  pointer-events: none;
  animation: login-vine-sway 12s ease-in-out infinite alternate;
}

.katha-login-vine-left {
  left: -1.6rem;
}

.katha-login-vine-right {
  right: -1.6rem;
  rotate: 180deg;
  animation-delay: -6s;
}

@keyframes login-vine-sway {
  from { transform: translateY(-8px); }
  to { transform: translateY(8px); }
}

@media (prefers-reduced-motion: reduce) {
  .katha-login-vine {
    animation: none;
  }
}
```

- [ ] **Step 2: Tinh chỉnh Seam Divider và Mấu Ngọc Hình Thoi**

Đảm bảo đường phân cách 1px sắc nét và viên ngọc ở tâm:
```css
.katha-login-seam {
  position: absolute;
  top: 4%;
  bottom: 4%;
  left: 56%;
  z-index: 4;
  width: 1px;
  background: linear-gradient(
    to bottom,
    transparent,
    color-mix(in srgb, var(--lg-gold) 50%, transparent) 20%,
    color-mix(in srgb, var(--lg-gold) 50%, transparent) 80%,
    transparent
  );
  pointer-events: none;
}

.katha-login-seam span {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 9px;
  height: 9px;
  background: var(--lg-gold);
  border-radius: 2px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--lg-gold) 24%, transparent), 0 0 12px var(--lg-gold);
  transform: translate(-50%, -50%) rotate(45deg);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/login.css frontend/app/login/KhmerVine.tsx
git commit -m "feat(login): implement botanical vine sway and glowing seam jewel"
```

---

### Task 4: Tactile Neuromorphic Inputs & Glowing Focus Rings

**Files:**
- Modify: `frontend/app/login/login.css`

**Interfaces:**
- Consumes: `.katha-login-input-wrap`, `input`, `.katha-login-input-icon`, `.katha-login-password-toggle`.
- Produces: Dual inset shadows for light mode, 3D raised container + inset field for dark mode, glowing focus rings.

- [ ] **Step 1: Viết cấu hình Neuromorphic Inputs trong `login.css`**

```css
.katha-login-input-wrap input {
  height: 3.5rem;
  border-radius: 0.82rem;
  background: color-mix(in srgb, var(--lg-field) 94%, var(--lg-page));
  box-shadow: var(--login-inset);
  transition: border-color 200ms ease-in-out, box-shadow 200ms ease-in-out;
}

.katha-login-input-wrap input:focus {
  border-color: var(--lg-field-focus-line);
  outline: none;
  box-shadow: var(--login-glow);
}

:root[data-theme='dark'] .katha-login-page .katha-login-input-wrap,
.dark .katha-login-page .katha-login-input-wrap {
  --lg-field: #111622;
  padding: 0.25rem;
  border-radius: 1rem;
  background: linear-gradient(135deg, #18202e 0%, #0e121a 100%);
  box-shadow: 7px 7px 16px rgba(0, 0, 0, 0.4), -5px -5px 14px rgba(255, 255, 255, 0.03);
}

:root[data-theme='dark'] .katha-login-page .katha-login-input-wrap input,
.dark .katha-login-page .katha-login-input-wrap input {
  height: 3.35rem;
  border-radius: 0.75rem;
  background: #090d16;
  box-shadow: var(--login-inset);
}
```

- [ ] **Step 2: Hoàn thiện hiệu ứng hiển thị lỗi đầu vào (`katha-login-field-error`)**

```css
.katha-login-field-error {
  margin: 0.25rem 0 0 0;
  font-size: 0.78rem;
  color: #ef4444;
  font-weight: 500;
  line-height: 1.35;
  animation: katha-login-error-enter 220ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes katha-login-error-enter {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/login.css
git commit -m "feat(login): implement tactile neuromorphic inputs with glowing rings"
```

---

### Task 5: Button Dynamic Gloss Sweep & Radiant Aura

**Files:**
- Modify: `frontend/app/login/login.css`

**Interfaces:**
- Consumes: `.katha-login-submit`.
- Produces: `@keyframes katha-login-button-gloss`, gloss sweep overlay on hover/focus, and radiant shadow.

- [ ] **Step 1: Viết cấu hình Button Dynamic Gloss Sweep**

```css
.katha-login-submit {
  position: relative;
  overflow: hidden;
  min-height: 3.5rem;
  border-radius: 0.85rem;
  border: 1px solid transparent;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  font-weight: 700;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
  transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
}

.katha-login-submit::before {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: linear-gradient(
    112deg,
    transparent 25%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 75%
  );
  content: '';
  opacity: 0;
  pointer-events: none;
  transform: translateX(-125%);
}

.katha-login-submit > * {
  position: relative;
  z-index: 1;
}

.katha-login-submit:hover:not(:disabled)::before,
.katha-login-submit:focus-visible::before {
  opacity: 1;
  animation: katha-login-button-gloss 1.1s ease-out both;
}

.katha-login-submit:hover:not(:disabled) {
  box-shadow: 0 0 35px rgba(16, 185, 129, 0.5), 0 8px 24px rgba(5, 150, 105, 0.4);
  transform: translateY(-1px);
}

.katha-login-submit:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px var(--lg-field-focus-ring),
    0 0 35px rgba(16, 185, 129, 0.5);
}

@keyframes katha-login-button-gloss {
  from { transform: translateX(-125%); }
  to { transform: translateX(125%); }
}

@media (prefers-reduced-motion: reduce) {
  .katha-login-submit::before {
    display: none;
    animation: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/app/login/login.css
git commit -m "feat(login): implement button dynamic gloss sweep and radiant aura"
```

---

### Task 6: Academic Diamond Mark & Fluid Viewport Height Scaling

**Files:**
- Modify: `frontend/app/login/page.tsx`
- Modify: `frontend/app/login/login.css`

**Interfaces:**
- Consumes: `DiamondMark` from `./KhmerMotifs`.
- Produces: Thay thế emoji `✨` thành `<DiamondMark />` học thuật; hoàn thiện bộ media queries `@media (max-height: 840px)` và `@media (max-height: 680px)` để triệt tiêu thanh cuộn trên laptop.

- [ ] **Step 1: Cập nhật tiêu đề trong `frontend/app/login/page.tsx`**

Thay thế dòng:
```tsx
              <h2 id="katha-login-form-title">
                {lang === 'en' ? 'Sign In' : 'Đăng nhập'}{' '}
                <span className="katha-login-sparkle" aria-hidden="true">
                  ✨
                </span>
              </h2>
```
Bằng:
```tsx
              <h2 id="katha-login-form-title" className="flex items-center gap-2">
                <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
                <span className="katha-login-academic-mark text-emerald-600 dark:text-emerald-400 inline-flex items-center" aria-hidden="true">
                  <DiamondMark className="size-3.5" />
                </span>
              </h2>
```

- [ ] **Step 2: Thêm style cho Academic Diamond Mark & Fluid Height Scaling trong `login.css`**

Trong `frontend/app/login/login.css`:
```css
.katha-login-academic-mark {
  display: inline-flex;
  align-items: center;
  filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.4));
  transition: transform 300ms ease;
}

.katha-login-academic-mark:hover {
  transform: rotate(45deg) scale(1.15);
}

/* Fluid Viewport Height Scaling: Triệt tiêu thanh cuộn dọc trên laptop 768p và thu nhỏ */
@media (max-height: 840px) {
  .katha-login-hero {
    padding-top: clamp(1rem, 2vh, 1.5rem);
    padding-bottom: clamp(1rem, 2.5vh, 2rem);
  }
  .katha-login-pane {
    padding-top: clamp(1.2rem, 2.5vh, 2rem);
    padding-bottom: clamp(1.2rem, 2.5vh, 2rem);
  }
  .katha-login-form {
    gap: 0.85rem;
    margin-top: 1rem;
  }
  .katha-login-input-wrap input {
    height: 3.15rem;
  }
  .katha-login-submit {
    min-height: 3.15rem;
  }
  .katha-login-brand {
    padding-bottom: 0.65rem;
  }
  .katha-login-figure {
    min-height: 9rem;
    margin-top: 0.8rem;
  }
}

@media (max-height: 680px) {
  .katha-login-hero-body {
    padding-top: 0.5rem;
  }
  .katha-login-hero-title {
    font-size: clamp(1.6rem, 2.4vw, 2.2rem);
  }
  .katha-login-hero-note {
    margin-top: 0.4rem;
    font-size: 0.82rem;
  }
  .katha-login-form {
    gap: 0.65rem;
    margin-top: 0.75rem;
  }
  .katha-login-input-wrap input {
    height: 2.85rem;
  }
  .katha-login-submit {
    min-height: 2.85rem;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/login/page.tsx frontend/app/login/login.css
git commit -m "feat(login): replace star with academic diamond mark and add fluid height scaling"
```

---

### Task 7: Toàn Diện Kiểm Thử & Xác Minh Đa Màn Hình

**Files:**
- Toàn bộ workspace `frontend`

- [ ] **Step 1: Chạy Typecheck kiểm tra TypeScript**

```bash
pnpm turbo typecheck
```
Kỳ vọng: 7/7 packages clean (0 errors).

- [ ] **Step 2: Chạy Monorepo Unit Tests**

```bash
pnpm turbo test
```
Kỳ vọng: 43/43 tests PASS.

- [ ] **Step 3: Kiểm tra trực quan trên trình duyệt**

Mở `http://localhost:3000/login`:
1. Kiểm tra ảnh sống 24s trôi êm ái, hover chuột tạo vệt sáng 112° sheen sweep.
2. Kiểm tra dây leo 2 bên sườn lắc lư nhẹ nhàng.
3. Kiểm tra ô input có đổ bóng lòng sâu (neuromorphic) và phát sáng ngọc bích khi click.
4. Kiểm tra nút Đăng nhập có vệt bóng lóa sáng khi rê chuột.
5. Kiểm tra tiêu đề Đăng nhập hiển thị `DiamondMark` thanh nhã, không còn emoji `✨`.
6. Thử thu nhỏ chiều cao trình duyệt xuống 680px: Giao diện co giãn mượt mà, không xuất hiện scrollbar dọc, bong bóng mascot pop lên trên trọn vẹn.

- [ ] **Step 4: Commit hoàn tất**

```bash
git commit --allow-empty -m "chore(login): verify all 10 katha effects and fluid scaling"
```
