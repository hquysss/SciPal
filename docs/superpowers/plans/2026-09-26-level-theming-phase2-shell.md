# Level Theming — Giai đoạn 2 (phần còn lại): Login, trang lỗi, loading, hoạ tiết theo cấp

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất giai đoạn 2 của spec: login, not-found, loading, thông báo lỗi và phần sót của navbar dùng token cấp học; sửa lỗi login gắn theme lên `<html>`; vẽ bốn bộ hoạ tiết đồ dùng học tập theo cấp.

**Architecture:** Không thêm cơ chế mới — dùng lại token, `ThemeToggle`, primitive `Alert`/`Button` và test ratchet `frontend/lib/theme/rawColors.test.ts` từ giai đoạn 0–1. Login giữ bố cục/hiệu ứng Katha, chỉ trỏ bộ `--lg-*` và màu minh hoạ về token. Hoạ tiết là SVG tĩnh dùng làm `mask-image`.

**Tech Stack:** Next.js 15.5, React 19, Tailwind CSS 3.4.19, Vitest 5, pnpm 9 + Turbo 2.

**Spec:** `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md` (§2.4 hoạ tiết, §4.1 không gắn theme lên `:root`, §7 giai đoạn 2). Giai đoạn 0–1 đã merge (PR #4); bảng màu hiện tại trong `packages/ui/src/theme/palettes.ts` (Tiểu học nâu, THCS xanh dương, THPT xanh lá) là nguồn đúng, không theo bảng màu cũ trong spec §2.1.

## Quyết định đã chốt (26/09)

- Login: **giữ bố cục, mascot, slide và hiệu ứng**, nối vào token chung. Bỏ `LoginThemeToggle` (tự gắn `data-theme`/`.dark` lên `<html>`), dùng `ThemeToggle` chung (đang ẩn theo `DARK_MODE_ENABLED`).
- Slide minh hoạ login chuyển thành **hai tông theo màu `nav` của cấp** (không còn xanh ngọc/xanh trời/hổ phách riêng từng môn).
- Xoá code chết: `app/login/KathaMascot.tsx`, `KhmerMotifs.tsx`, `KhmerVine.tsx`, `features/auth/AuthCard.tsx`, `features/auth/ScienceShowcase.tsx` (không file nào import, kiểm 26/09).
- Không tạo spec mới.

## Global Constraints

- Không gắn `data-theme`, `data-level`, class `dark` hay biến màu lên `:root`/`<html>`/`document.documentElement`.
- `.tsx` trong phạm vi plan này về **0 màu thô** (class màu Tailwind, hex, `dark:`); ratchet chỉ được giảm.
- Tailwind 3.4: không dùng opacity modifier với token (`bg-action/50`); dùng `bg-[color-mix(in_srgb,var(--x)_N%,transparent)]`.
- Chuỗi hiển thị song ngữ qua `useLanguage().t({ en, vi })`.
- Vùng chạm ≥ 44px, focus nhìn thấy (`outline-focus`).
- File được test import dùng import tương đối (vitest không có alias `@/`).
- Không thêm dependency.
- Cập nhật baseline ratchet: Bash `UPDATE_THEME_BASELINE=1 pnpm --filter @scipal/web test -- lib/theme/rawColors`; PowerShell `$env:UPDATE_THEME_BASELINE='1'; pnpm --filter @scipal/web test -- lib/theme/rawColors; Remove-Item Env:UPDATE_THEME_BASELINE`.

## Bảng đổi màu dùng chung

Mọi task chuyển class theo bảng này; chỗ nào bảng không phủ thì chọn token theo **vai trò** (chữ chính, chữ phụ, nền, viền điều khiển, hành động, lỗi), không theo sắc độ.

| Class thô | Token |
|---|---|
| `text-gray-950/900/800`, `text-slate-900` | `text-ink` |
| `text-gray-700/600/500/400` | `text-ink-muted` |
| `bg-white`, `bg-white/90` | `bg-surface` |
| `bg-gray-50`, `bg-gray-100`, `bg-emerald-50`, `bg-emerald-100` | `bg-surface-sunken` |
| `border-gray-100/200/…` quanh thẻ, vạch chia | `border-line` |
| viền ô nhập, nút viền | `border-edge` |
| `bg-emerald-600/700` (nút chính) | `bg-action hover:bg-action-hover` |
| `text-white` trên nền action | `text-action-ink` |
| `text-emerald-600/700/800`, `border-emerald-700` | `text-action`, `border-action` |
| `bg-red-50`, `text-red-700/800`, `border-red-200`, `outline-red-600` | `bg-danger-surface`, `text-danger`, `border-[color-mix(in_srgb,var(--danger)_30%,transparent)]`, `outline-danger` |
| `bg-gray-950/60` (nền mờ sau modal) | `bg-[color-mix(in_srgb,var(--ink)_60%,transparent)]` |
| `hover:bg-gray-50/100/800` | `hover:bg-surface-sunken` |
| mọi `dark:…` | xoá (token tự đổi theo chế độ) |

## Review Focus

1. **Máy để chế độ tối vào `/login` rồi đăng nhập**: sau khi rời login, app vẫn phải sáng (cờ tắt). → test "không ghi theme lên documentElement" ở Task 1 + kiểm trình duyệt Task 1 Step 7.
2. **Khách chưa chọn cấp mở `/login`**: login dùng bảng trung tính, không lỗi, nút/field vẫn đạt tương phản. → kiểm trình duyệt Task 2 Step 6.
3. **Slide minh hoạ trên nền `nav` nâu Tiểu học (`#96693F`)**: chữ badge/caption vẫn đọc được. → kiểm trình duyệt Task 2 Step 6 ở cả 3 cấp.
4. **SVG hoạ tiết lọt `<script>`/`href` hoặc quá nặng**: phải bị test chặn. → Task 5 Step 1.
5. **Loading hiển thị trước khi script boot chạy** (tab mới): phải dùng token của thẻ bao, không nền xanh cứng. → kiểm trình duyệt Task 4 Step 5.

---

### Task 1: Sửa lỗi login gắn theme lên `<html>` và xoá code chết

**Files:**
- Create: `frontend/lib/theme/rootTheme.test.ts`
- Delete: `frontend/app/login/LoginThemeToggle.tsx`, `frontend/app/login/KathaMascot.tsx`, `frontend/app/login/KhmerMotifs.tsx`, `frontend/app/login/KhmerVine.tsx`, `frontend/features/auth/AuthCard.tsx`, `frontend/features/auth/ScienceShowcase.tsx`
- Modify: `frontend/app/login/page.tsx:10,248`
- Modify: `frontend/app/login/login.css` (mọi selector `:root[data-theme='dark']`, khối biến `--lg-*` dòng 25–66)

**Interfaces:**
- Consumes: `ThemeToggle({ tone?: 'nav' | 'surface'; enabled?: boolean })` từ `frontend/components/nav/ThemeToggle.tsx`.

- [ ] **Step 1: Viết test thất bại**

`frontend/lib/theme/rootTheme.test.ts`:

```ts
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const SCANNED_DIRS = ['app', 'components', 'features', 'lib'];
const ROOT_THEME_WRITE =
  /documentElement\s*\.\s*(?:setAttribute\(\s*['"]data-(?:theme|level)['"]|classList\s*\.\s*(?:add|toggle|remove)\(\s*['"]dark['"]|style\s*\.\s*setProperty\(\s*['"]--)/;
const ROOT_THEME_SELECTOR = /:root\s*\[\s*data-(?:theme|level)/;

function sourceFiles(pattern: RegExp): string[] {
  return SCANNED_DIRS.flatMap((dir) =>
    readdirSync(join(FRONTEND_ROOT, dir), { recursive: true, encoding: 'utf8' })
      .map((entry) => `${dir}/${entry.replaceAll('\\', '/')}`)
      .filter((rel) => pattern.test(rel) && !rel.endsWith('.test.ts') && !rel.endsWith('.test.tsx')),
  );
}

describe('theme stays off the document root', () => {
  it('no script writes theme, level or colour variables on <html>', () => {
    const offenders = sourceFiles(/\.(ts|tsx)$/).filter((rel) =>
      ROOT_THEME_WRITE.test(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('no stylesheet keys theme rules off :root attributes', () => {
    const offenders = sourceFiles(/\.css$/).filter((rel) =>
      ROOT_THEME_SELECTOR.test(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- lib/theme/rootTheme`
Expected: FAIL — case 1 liệt kê `app/login/LoginThemeToggle.tsx`; case 2 liệt kê `app/login/login.css`.

- [ ] **Step 2b: Kiểm trước khi xoá**

Run (Grep): `KathaMascot|KhmerMotifs|KhmerVine|AuthCard|ScienceShowcase` trong `frontend/app`, `frontend/features`, `frontend/components`, `frontend/lib`.
Expected: chỉ khớp bên trong chính các file sẽ xoá (và `KathaMascot.tsx` import `SciPalMascot` — `SciPalMascot.tsx` được `page.tsx` dùng, **giữ**). Nếu có file khác import, dừng và báo lại.

- [ ] **Step 3: Thay nút sáng/tối và xoá file**

Trong `frontend/app/login/page.tsx`:
- Dòng 10 đổi thành `import { ThemeToggle } from '@/components/nav/ThemeToggle';`
- Dòng 248 `<LoginThemeToggle />` đổi thành `<ThemeToggle tone="surface" />`

Xoá sáu file liệt kê ở mục Files.

- [ ] **Step 4: Đổi selector và biến trong `login.css`**

- Thay mọi `:root[data-theme='dark']` bằng `[data-app-shell][data-theme='dark']` (khoảng 20 chỗ; dùng tìm-thay toàn file).
- Trong khối biến sáng (dòng 25–39) và khối tối (dòng 52–66), đổi các dòng dùng `--accent`:

```css
  --lg-gold: var(--action);
  --lg-gold-soft: var(--surface-sunken);
  --lg-primary: var(--action);
  --lg-field-focus-line: var(--focus);
  --lg-field-focus-ring: color-mix(in srgb, var(--focus) 22%, transparent);
```

- Các dòng `var(--background, #…)`, `var(--card, #…)`, `var(--foreground, #…)` giữ nguyên (bí danh shadcn đã trỏ về token cấp học).

- [ ] **Step 5: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- lib/theme/rootTheme`
Expected: PASS.

- [ ] **Step 6: Typecheck, cập nhật baseline**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Cập nhật baseline (lệnh ở Global Constraints) — các file bị xoá biến khỏi baseline.
Run: `pnpm --filter @scipal/web test` — Expected: PASS.

- [ ] **Step 7: Kiểm trình duyệt**

`pnpm --filter @scipal/web dev`. DevTools → Rendering → giả lập `prefers-color-scheme: dark`. Mở `/login`, rồi `/glossary`:
- `document.documentElement.getAttribute('data-theme')` là `null`; `document.documentElement.classList.contains('dark')` là `false` ở cả hai trang.
- `/glossary` vẫn nền sáng.
- Login không có nút sáng/tối (cờ tắt).

- [ ] **Step 8: Commit**

```bash
git add -A frontend/app/login frontend/features/auth frontend/lib/theme/rootTheme.test.ts frontend/theme-baseline.json
git commit -m "fix(web): stop the login page theming <html> and remove dead login files"
```

---

### Task 2: Login dùng token (page, minh hoạ, modal trợ giúp)

**Files:**
- Modify: `frontend/app/login/page.tsx` (dòng 64, 77, 90 `bgGradient`; dòng 300; dòng 264; dòng 539)
- Modify: `frontend/app/login/login.css` (thêm khối `.katha-login-slide-bg` và biến `--art-*`)
- Modify: `frontend/app/login/ScienceSlideIllustrations.tsx` (75 mã hex)
- Modify: `frontend/app/login/ScienceHelixes.tsx:64`, `frontend/app/login/ScienceMotifs.tsx:142`
- Modify: `frontend/features/auth/AccountHelpModal.tsx`

- [ ] **Step 1: Nền slide theo `nav`**

Trong `page.tsx`, xoá thuộc tính `bgGradient` khỏi cả ba slide (dòng 64, 77, 90) và thay dòng 300:

```tsx
                    <div className="katha-login-slide-bg absolute inset-0" />
```

Thêm vào cuối `login.css`:

```css
/* Slide art: two tones of the level's navbar colour. */
.katha-login-slide {
  --art-1: var(--nav-ink);
  --art-2: color-mix(in srgb, var(--nav-ink) 78%, var(--nav));
  --art-3: color-mix(in srgb, var(--nav-ink) 55%, var(--nav));
  --art-4: color-mix(in srgb, var(--nav-ink) 30%, var(--nav));
  --art-deep: color-mix(in srgb, var(--nav) 62%, #000);
}

.katha-login-slide-bg {
  background: linear-gradient(135deg, var(--nav), var(--art-deep));
  opacity: 0.97;
}
```

- [ ] **Step 2: Màu minh hoạ theo vai**

Trong `ScienceSlideIllustrations.tsx`, thay mọi mã hex (trong `fill`, `stroke`, `stopColor`, `floodColor`, `style`) theo bảng:

| Hex hiện có | Thay bằng |
|---|---|
| `#ecfdf5` `#a7f3d0` `#bae6fd` `#fde68a` | `var(--art-1)` |
| `#6ee7b7` `#7dd3fc` `#fcd34d` `#c084fc` | `var(--art-2)` |
| `#34d399` `#38bdf8` `#fbbf24` `#818cf8` `#f59e0b` `#d97706` | `var(--art-3)` |
| `#059669` `#0f766e` `#047857` `#065f46` | `var(--art-4)` |
| `#064e3b` `#022c22` `#78350f` `#451a03` `#082f49` | `var(--art-deep)` |

Giữ nguyên `opacity`/`fillOpacity`/`strokeOpacity` hiện có.

`ScienceHelixes.tsx:64` và `ScienceMotifs.tsx:142`: `fill="#ffffff"` đổi thành `fill="var(--surface)"`.

- [ ] **Step 3: Eyebrow mark**

`page.tsx:264` và `page.tsx:539`: `text-emerald-600 dark:text-emerald-400` đổi thành `text-action`.

- [ ] **Step 4: `AccountHelpModal`**

Chuyển toàn bộ class theo **Bảng đổi màu dùng chung**; xoá mọi `dark:`. Nút chính (`bg-emerald-600`/`bg-emerald-700`) → `bg-action text-action-ink hover:bg-action-hover`; nếu nút có chiều cao < 44px thì thêm `min-h-11`. Nền mờ `bg-gray-950/60` → `bg-[color-mix(in_srgb,var(--ink)_60%,transparent)]`.

- [ ] **Step 5: Kiểm số màu thô**

Cập nhật baseline rồi mở `frontend/theme-baseline.json`.
Expected: không còn mục nào cho `app/login/page.tsx`, `app/login/ScienceSlideIllustrations.tsx`, `app/login/ScienceHelixes.tsx`, `app/login/ScienceMotifs.tsx`, `features/auth/AccountHelpModal.tsx`. Nếu còn, tìm bằng Grep và đổi tiếp theo bảng.

- [ ] **Step 6: Kiểm trình duyệt**

`/login` ở 375px và 1280px, lần lượt với khách chưa chọn cấp (tab mới), rồi chọn Tiểu học / THCS / THPT ở cổng landing và quay lại `/login` cùng tab:
- Slide mang tông `nav` của cấp (nâu / xanh dương / xanh lá; trung tính xanh `#15803D`), minh hoạ nhìn rõ trên nền.
- Chữ badge và caption slide đọc được trên nền nâu Tiểu học.
- Nút đăng nhập, ô nhập, focus ring theo `action`/`focus` của cấp.
- Mở modal trợ giúp: nền mờ, nút đóng dùng bàn phím được.
- Chụp ảnh 4 trạng thái.

- [ ] **Step 7: Typecheck, test, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7. Run: `pnpm --filter @scipal/web test` — Expected: PASS.

```bash
git add frontend/app/login frontend/features/auth/AccountHelpModal.tsx frontend/theme-baseline.json
git commit -m "feat(web): login art, controls and help modal follow the level theme"
```

---

### Task 3: Trang 404, thông báo lỗi tải, phần sót của navbar

**Files:**
- Modify (thay toàn bộ): `frontend/app/not-found.tsx`, `frontend/components/feedback/LoadErrorNotice.tsx`
- Modify: `frontend/components/nav/NavBar.tsx:452`, `frontend/components/nav/SubjectSwitcher.tsx:50-56`, `frontend/features/landing/DeferredLandingPage.tsx:11`
- Test: `frontend/components/feedback/LoadErrorNotice.test.tsx`

**Interfaces:**
- Consumes: `Alert({ tone?, title?, children, className? })` từ `frontend/components/ui/alert.tsx`; `buttonVariants` từ `frontend/components/ui/button.tsx`.
- Produces: `LoadErrorNotice({ message: { en: string; vi: string }; retryHref?: string })` — API giữ nguyên.

- [ ] **Step 1: Viết test thất bại**

`frontend/components/feedback/LoadErrorNotice.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LoadErrorNotice } from './LoadErrorNotice';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string; vi: string }) => o.vi, lang: 'vi' }),
}));

describe('LoadErrorNotice', () => {
  it('announces the error and offers a retry link with a 44px target', () => {
    const html = renderToStaticMarkup(
      <LoadErrorNotice message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }} retryHref="/informatics/bai-3" />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('Chưa tải được bài học.');
    expect(html).toContain('href="/informatics/bai-3"');
    expect(html).toContain('Thử lại');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
  });

  it('omits the link without a retry target', () => {
    const html = renderToStaticMarkup(<LoadErrorNotice message={{ en: 'x', vi: 'Lỗi' }} />);
    expect(html).not.toContain('<a');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- LoadErrorNotice`
Expected: FAIL — HTML có `dark:`/`red-` và không có `min-h-11`.

- [ ] **Step 3: Viết lại `LoadErrorNotice.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '../ui/alert';
import { buttonVariants } from '../ui/button';

export function LoadErrorNotice({ message, retryHref }: { message: { en: string; vi: string }; retryHref?: string }) {
  const { t } = useLanguage();
  return (
    <Alert tone="danger">
      <span>{t(message)}</span>
      {retryHref && (
        <Link href={retryHref} className={buttonVariants({ variant: 'outline', className: 'mt-3 flex w-fit' })}>
          {t({ en: 'Try again', vi: 'Thử lại' })}
        </Link>
      )}
    </Alert>
  );
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- LoadErrorNotice`
Expected: PASS.

- [ ] **Step 5: Viết lại `not-found.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-line bg-surface p-8">
        <p className="text-sm font-semibold text-ink-muted">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          {t({ en: 'This page does not exist', vi: 'Không có trang này' })}
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          {t({
            en: 'The link may be mistyped or the page has moved. Go back to the home page to pick a subject.',
            vi: 'Đường dẫn có thể gõ sai hoặc trang đã được chuyển. Về trang chủ để chọn môn học.',
          })}
        </p>
        <Link href="/" className={buttonVariants({ className: 'mt-6' })}>
          {t({ en: 'Go to home page', vi: 'Về trang chủ' })}
        </Link>
      </section>
    </main>
  );
}
```

- [ ] **Step 6: Phần sót của navbar và landing**

`NavBar.tsx:452` (nút đăng xuất trong menu mobile), `className` đổi thành:

```tsx
                  className="min-h-11 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-danger-surface px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-[color-mix(in_srgb,var(--danger-surface),var(--danger)_10%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger disabled:cursor-wait disabled:opacity-60"
```

`SubjectSwitcher.tsx:50-56`: ô icon môn là "nhãn vở", không tô accent đặc. Đổi thẻ `<span>` thành:

```tsx
        <span
          data-subject-scope=""
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-xs font-black text-accent-ink"
          style={{ '--accent': subject.accentColor } as React.CSSProperties}
          aria-hidden="true"
        >
```

(thêm `import type React from 'react';` nếu file chưa có). `data-subject-scope` làm rule `[data-subject-scope]` sinh `--accent-ink` cho chính phần tử này.

`DeferredLandingPage.tsx:11`: `text-gray-600` → `text-ink-muted`.

- [ ] **Step 7: Kiểm trình duyệt, typecheck, baseline, commit**

- `/khong-ton-tai`: thẻ 404 song ngữ (đổi EN/VI), nút "Về trang chủ" theo `action` của cấp.
- Menu môn học: ô icon mỗi môn là nền nhạt + chữ màu môn, đọc rõ.
- Tắt mạng rồi mở `/informatics`: thông báo lỗi đỏ với nút "Thử lại".

Run: `pnpm turbo typecheck` — Expected: 7/7. Cập nhật baseline; Run: `pnpm --filter @scipal/web test` — Expected: PASS; baseline không còn `app/not-found.tsx`, `components/feedback/LoadErrorNotice.tsx`, `components/nav/*`, `features/landing/DeferredLandingPage.tsx`.

```bash
git add frontend/app/not-found.tsx frontend/components/feedback frontend/components/nav frontend/features/landing/DeferredLandingPage.tsx frontend/theme-baseline.json
git commit -m "feat(web): token-based 404, load error notice and remaining navbar colours"
```

---

### Task 4: Màn hình loading dùng token

**Files:**
- Modify: `frontend/app/loading.module.css`

`loading.tsx` render bên trong `[data-app-shell]`, nên biến token có sẵn; `.screen` là `position: fixed` nhưng vẫn thừa kế biến từ thẻ bao.

- [ ] **Step 1: Nền và chữ**

Trong `frontend/app/loading.module.css`:

```css
.screen {
  position: fixed;
  z-index: 10000;
  inset: 0;
  display: grid;
  overflow: hidden;
  place-items: center;
  background:
    radial-gradient(ellipse at 50% 38%, color-mix(in srgb, var(--action) 12%, transparent), transparent 36rem),
    var(--paper);
  color: var(--ink);
}
```

Trong `.grid`, hai `rgba(18, 79, 46, 0.045)` đổi thành `color-mix(in srgb, var(--line) 70%, transparent)` (giữ `mask-image … #000 …` — đó là mặt nạ, không phải màu hiển thị).

- [ ] **Step 2: Các màu còn lại**

| Selector | Thuộc tính | Giá trị mới |
|---|---|---|
| `.mark` | `border` | `1px solid var(--line)` |
| `.mark` | `background` | `var(--surface-sunken)` |
| `.mark` | `color` | `var(--action)` |
| `.brand` | `color` | `var(--ink-muted)` |
| `.brand > span:first-child` | `color` | `var(--action)` |
| `.brandDivider` | `color` | `var(--line)` |
| `.content h1` | `color` | `var(--ink)` |
| `.message` | `color` | `var(--ink-muted)` |
| `.progressTrack` | `border` | `1px solid var(--line)` |
| `.progressTrack` | `background` | `var(--surface-sunken)` |
| `.progressFill` | `background` | `var(--action)` |
| `.progressMeta` | `color` | `var(--ink-muted)` |
| `.progressMeta span:last-child` | `color` | `var(--action)` |
| `.loadingDots span` | `background` | `color-mix(in srgb, var(--action) 45%, var(--paper))` |

Sau đó Grep `#[0-9a-fA-F]{3,8}|rgba?\(` trong file: chỉ còn `#000` trong `mask-image`.

- [ ] **Step 3: Kiểm trình duyệt**

Thêm tạm `await new Promise((r) => setTimeout(r, 3000));` đầu `frontend/app/glossary/page.tsx` (không commit), mở `/glossary` ở tab mới rồi ở tab đã chọn THCS:
- Tab mới: loading nền trung tính, thanh tiến trình màu `action` trung tính (`#275B42`).
- Tab THCS: thanh tiến trình xanh dương, không có khung nền xanh lá cứng nào.
- Bật `prefers-reduced-motion`: thanh đứng ở 88%, chấm không nhảy.

Gỡ dòng chờ tạm.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/loading.module.css
git commit -m "feat(web): loading screen follows the level theme"
```

---

### Task 5: Bốn bộ hoạ tiết đồ dùng học tập

**Files:**
- Create: `frontend/public/patterns/primary.svg`, `lower_secondary.svg`, `upper_secondary.svg`
- Keep: `frontend/public/patterns/neutral.svg` (đã lẫn bút chì, thước, ê-ke, compa, máy tính — đúng bộ trung tính của spec §2)
- Modify: `packages/ui/src/theme/palettes.ts` (`PATTERN_URLS`)
- Test: `frontend/lib/theme/patterns.test.ts`, `packages/ui/src/__tests__/renderThemeCss.test.ts`

**Interfaces:**
- Consumes: `PATTERN_URLS`, `THEME_LEVELS` từ `@scipal/ui`.
- Produces: `PATTERN_URLS[level] === '/patterns/<level>.svg'` cho cả bốn cấp.

- [ ] **Step 1: Viết test thất bại**

`frontend/lib/theme/patterns.test.ts`:

```ts
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PATTERN_URLS, THEME_LEVELS } from '@scipal/ui';

const PUBLIC_DIR = fileURLToPath(new URL('../../public', import.meta.url));

describe.each(THEME_LEVELS)('pattern for %s', (level) => {
  const url = PATTERN_URLS[level];
  const file = `${PUBLIC_DIR}${url}`;

  it('has its own file', () => {
    expect(url).toBe(`/patterns/${level}.svg`);
    expect(existsSync(file)).toBe(true);
  });

  it('is a small, static, single-colour 320px mask tile', () => {
    const svg = readFileSync(file, 'utf8');
    expect(statSync(file).size).toBeLessThan(4096);
    expect(svg).toMatch(/viewBox="0 0 320 320"/);
    expect(svg).not.toMatch(/<script|<image|<foreignObject|href=|on[a-z]+=/i);
    const colours = new Set((svg.match(/#[0-9a-fA-F]{3,6}\b/g) ?? []).map((c) => c.toLowerCase()));
    expect([...colours]).toEqual(['#000']);
  });
});
```

Trong `packages/ui/src/__tests__/renderThemeCss.test.ts`, case `'puts palette values into custom properties'`, đổi kỳ vọng `pattern-url` thành:

```ts
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--pattern-url:url\("\/patterns\/primary\.svg"\);/);
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- lib/theme/patterns` — Expected: FAIL (URL vẫn là `neutral.svg`; file chưa có).
Run: `pnpm --filter @scipal/ui test -- renderThemeCss` — Expected: FAIL.

- [ ] **Step 3: Trỏ `PATTERN_URLS` về từng file**

Trong `packages/ui/src/theme/palettes.ts`:

```ts
/** School-supply motif per level, drawn as a single-colour mask tile. */
export const PATTERN_URLS: Record<ThemeLevel, string> = {
  primary: '/patterns/primary.svg',
  lower_secondary: '/patterns/lower_secondary.svg',
  upper_secondary: '/patterns/upper_secondary.svg',
  neutral: '/patterns/neutral.svg',
};
```

- [ ] **Step 4: Vẽ `primary.svg` (Tiểu học)**

Bút chì, gọt bút chì, thước kẻ, hộp bút, bảng con, phấn màu.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(28 48) rotate(-24)">
    <rect x="0" y="0" width="92" height="14" rx="2"/>
    <path d="M92 0 L112 7 L92 14 M104 4 L112 7 L104 10 M0 0 V14 M10 0 V14"/>
  </g>
  <g transform="translate(206 28) rotate(10)">
    <rect x="0" y="0" width="34" height="26" rx="4"/>
    <circle cx="13" cy="13" r="6"/>
    <path d="M24 5 V21"/>
  </g>
  <g transform="translate(176 92) rotate(-8)">
    <rect x="0" y="0" width="112" height="20" rx="2"/>
    <path d="M10 0 V7 M20 0 V11 M30 0 V7 M40 0 V11 M50 0 V7 M60 0 V11 M70 0 V7 M80 0 V11 M90 0 V7 M100 0 V11"/>
  </g>
  <g transform="translate(36 150) rotate(6)">
    <rect x="0" y="0" width="100" height="40" rx="12"/>
    <path d="M10 10 H90"/>
    <circle cx="92" cy="10" r="3"/>
  </g>
  <g transform="translate(196 196) rotate(-6)">
    <rect x="0" y="0" width="84" height="60" rx="4"/>
    <rect x="8" y="8" width="68" height="44" rx="2"/>
    <path d="M18 34 Q28 22 38 32 T58 28"/>
  </g>
  <g transform="translate(60 250) rotate(-30)">
    <rect x="0" y="0" width="34" height="9" rx="4"/>
    <rect x="0" y="16" width="26" height="9" rx="4"/>
  </g>
</svg>
```

- [ ] **Step 5: Vẽ `lower_secondary.svg` (THCS)**

Compa, ê-ke, thước đo độ, bút bi, máy tính cầm tay.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(40 28) rotate(-10)">
    <circle cx="24" cy="6" r="6"/>
    <path d="M20 12 L0 88 M28 12 L46 88 M46 88 L42 96 M10 50 H36"/>
  </g>
  <g transform="translate(176 36) rotate(12)">
    <path d="M0 84 L0 0 L84 84 Z"/>
    <path d="M12 72 L12 30 L54 72 Z"/>
    <path d="M0 16 H6 M0 32 H8 M0 48 H6 M0 64 H8"/>
  </g>
  <g transform="translate(40 170) rotate(-4)">
    <path d="M0 60 A60 60 0 0 1 120 60 Z"/>
    <path d="M30 60 A30 30 0 0 1 90 60"/>
    <path d="M60 0 V10 M18 18 L25 25 M102 18 L95 25 M0 60 H10 M110 60 H120"/>
  </g>
  <g transform="translate(206 176) rotate(-38)">
    <rect x="0" y="0" width="96" height="12" rx="5"/>
    <path d="M96 3 L108 6 L96 9 M14 0 V-8 H40"/>
  </g>
  <g transform="translate(236 244) rotate(8)">
    <rect x="0" y="0" width="44" height="58" rx="6"/>
    <rect x="7" y="7" width="30" height="12" rx="2"/>
    <path d="M9 30 h4 M20 30 h4 M31 30 h4 M9 40 h4 M20 40 h4 M31 40 h4 M9 50 h4 M20 50 h4 M31 50 h4"/>
  </g>
</svg>
```

- [ ] **Step 6: Vẽ `upper_secondary.svg` (THPT)**

Phấn và giẻ lau bảng, bình tam giác, máy tính cầm tay, kính lúp, bàn phím và chuột.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(30 40) rotate(-12)">
    <rect x="0" y="0" width="70" height="26" rx="4"/>
    <path d="M0 16 H70"/>
    <rect x="84" y="6" width="36" height="10" rx="4"/>
  </g>
  <g transform="translate(206 26) rotate(6)">
    <path d="M22 0 H44 M26 0 V30 L2 78 H64 L40 30 V0"/>
    <path d="M12 58 H54"/>
  </g>
  <g transform="translate(46 134) rotate(-8)">
    <rect x="0" y="0" width="44" height="58" rx="6"/>
    <rect x="7" y="7" width="30" height="12" rx="2"/>
    <path d="M9 30 h4 M20 30 h4 M31 30 h4 M9 40 h4 M20 40 h4 M31 40 h4 M9 50 h4 M20 50 h4 M31 50 h4"/>
  </g>
  <g transform="translate(170 128) rotate(-20)">
    <circle cx="26" cy="26" r="24"/>
    <path d="M44 44 L70 70"/>
    <path d="M14 20 A14 14 0 0 1 26 10"/>
  </g>
  <g transform="translate(34 244) rotate(4)">
    <rect x="0" y="0" width="128" height="44" rx="5"/>
    <path d="M10 12 h8 M24 12 h8 M38 12 h8 M52 12 h8 M66 12 h8 M80 12 h8 M94 12 h8 M108 12 h8 M14 22 h8 M28 22 h8 M42 22 h8 M56 22 h8 M70 22 h8 M84 22 h8 M98 22 h8 M30 32 H96"/>
  </g>
  <g transform="translate(232 232) rotate(-14)">
    <path d="M18 0 C34 0 36 14 36 26 V40 C36 52 28 58 18 58 C8 58 0 52 0 40 V26 C0 14 2 0 18 0 Z"/>
    <path d="M18 0 V20 M0 20 H36"/>
  </g>
</svg>
```

- [ ] **Step 7: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- lib/theme/patterns` — Expected: PASS (4 cấp).
Run: `pnpm --filter @scipal/ui test` — Expected: PASS.

- [ ] **Step 8: Kiểm trình duyệt**

Mở `/glossary` lần lượt với khách ở từng cấp và tab mới (trung tính): hoạ tiết khác nhau theo cấp, mờ, không cản chữ; zoom 200% vẫn sắc nét; `/exam/<id>` không có hoạ tiết. Nếu một món đồ khó nhận ra ở độ mờ thật, chỉnh nét trong SVG (giữ một màu `#000`, < 4 KB) và chạy lại Step 7.

- [ ] **Step 9: Commit**

```bash
git add frontend/public/patterns packages/ui/src/theme/palettes.ts packages/ui/src/__tests__/renderThemeCss.test.ts frontend/lib/theme/patterns.test.ts
git commit -m "feat(web): school-supply background motifs for each level"
```

---

### Task 6: Nghiệm thu và cập nhật trạng thái

**Files:**
- Modify: `PROJECT_STATE.md`, `DESIGN.md`

- [ ] **Step 1: Nghiệm thu toàn workspace**

Run: `pnpm turbo typecheck` — Expected: 7/7, 0 lỗi.
Run: `pnpm turbo test` — Expected: toàn bộ PASS.
Run: `pnpm turbo build` — Expected: thành công.
Run (Grep): `SERVICE_ROLE` trong `frontend/`, `mobile/`, `packages/` — Expected: 0.
Run (Grep): `scipal-theme-v1|LoginThemeToggle` trong `frontend/app`, `frontend/features`, `frontend/components` — Expected: 0.

- [ ] **Step 2: `DESIGN.md`**

- Mục hoạ tiết: liệt kê bốn file `frontend/public/patterns/<level>.svg`, món đồ mỗi cấp, quy tắc "một màu `#000`, < 4 KB, viewBox 320, không script/ảnh".
- Thêm mục "Login": giữ bố cục Katha; `--lg-*` trỏ về token; minh hoạ slide dùng `--art-1…4`, `--art-deep` dẫn xuất từ `nav`/`nav-ink`.

- [ ] **Step 3: `PROJECT_STATE.md`**

Thêm vào đầu "Recent Decisions":

```markdown
- **26/09 — Giao diện theo cấp học, giai đoạn 2 hoàn tất:** Login giữ bố cục Katha nhưng dùng token cấp học (slide minh hoạ hai tông theo `nav`); bỏ `LoginThemeToggle` vì nó gắn `data-theme`/`.dark` lên `<html>` khiến cả app chuyển tối với máy để chế độ tối — test `frontend/lib/theme/rootTheme.test.ts` chặn tái phạm. 404, thông báo lỗi tải, loading, phần sót của navbar dùng token và song ngữ. Bốn bộ hoạ tiết đồ dùng học tập theo cấp trong `frontend/public/patterns/`. Xoá code chết `KathaMascot`, `KhmerMotifs`, `KhmerVine`, `AuthCard`, `ScienceShowcase`.
```

Trong "Next Steps", mục giao diện đổi thành: "Giai đoạn 3–5 của spec giao diện theo cấp học (luồng học → cá nhân → giáo viên/admin; bật `DARK_MODE_ENABLED` cuối giai đoạn 5). Ngoài phạm vi giao diện: quiz bài học thật (API ẩn đáp án, chấm server), nối thẻ thuật ngữ/tài liệu với dữ liệu thật, API AI Tutor."

- [ ] **Step 4: Commit**

```bash
git add PROJECT_STATE.md DESIGN.md
git commit -m "docs: record level theming phase 2 completion"
```
