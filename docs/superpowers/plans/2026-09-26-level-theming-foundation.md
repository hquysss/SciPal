# Level Theming Foundation (Giai đoạn 0–1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng nền tảng hệ token theo cấp học (bảng màu, CSS sinh từ TS, thẻ bao app-shell, script chống nháy, đồng bộ cấp, nút sáng/tối sau cờ, hoạ tiết nền, test chặn màu thô) và viết lại các primitive `components/ui` bằng token.

**Architecture:** Bảng màu khai báo bằng TypeScript trong `@scipal/ui`; `renderThemeCss()` sinh CSS và root layout in vào `<head>`. Token gắn trên phần tử có `data-level` (thẻ bao app-shell hoặc `LevelScope`), không bao giờ trên `:root`. Tailwind ánh xạ class ngữ nghĩa (`bg-paper`, `text-ink`…) sang biến CSS; một test ratchet trong `frontend` đảm bảo số màu thô chỉ giảm.

**Tech Stack:** Next.js 15.5 (App Router), React 19, Tailwind CSS 3.4.19, Vitest 5, `@base-ui/react`, `class-variance-authority`, `lucide-react`, pnpm 9 + Turbo 2.

**Spec:** `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md`

## Global Constraints

- Không gán `--accent`, bảng màu cấp học, hay `data-theme`/`data-level` lên `:root`/`<html>` (AGENTS.md invariant 2, spec §4.1).
- Màu trong `.tsx` chỉ qua token (`bg-paper`, `text-ink`, `border-edge`…); file `.tsx` mới phải có 0 màu thô.
- Tailwind 3.4: **opacity modifier (`bg-action/50`) không hoạt động với biến hex** — dùng `bg-[color-mix(in_srgb,var(--x)_N%,transparent)]` hoặc token riêng. Không dùng cú pháp Tailwind v4 (`gap-(--x)`, `data-horizontal:`, `ring-3`, `rounded-4xl`, `--spacing(4)`).
- Một họ chữ: Be Vietnam Pro (`--font-be-vietnam`); JetBrains Mono chỉ cho khối code. Bỏ Inter.
- Mọi chuỗi hiển thị song ngữ qua `useLanguage().t({ en, vi })`.
- Điều khiển tương tác: vùng chạm ≥ 44px (`min-h-11`), focus nhìn thấy bằng `outline-focus` (hoặc `outline-nav-ink` trên navbar).
- `DARK_MODE_ENABLED = false` trong suốt plan này (spec §4.4).
- File được test import (trực tiếp hoặc gián tiếp) dùng import tương đối, không dùng `@/` — `frontend/vitest.config.mts` không khai báo alias.
- Storage (`sessionStorage`/`localStorage`) luôn trong try/catch; lỗi thì về `neutral` + theo hệ thống.
- Không thêm dependency mới.
- Lệnh kiểm tra chạy từ root: `pnpm turbo typecheck`, `pnpm turbo test`, `pnpm turbo build`.

## Review Focus

1. **Storage bị chặn** (Safari private, cookie bị tắt): script boot, `ThemeToggle`, `adoptAccountLevel` không được ném lỗi; trang vẫn hiển thị bảng `neutral`. → test trong Task 5 (`buildBootScript` với storage ném lỗi) và Task 6 (`adoptAccountLevel` với storage ném lỗi).
2. **Giá trị storage rác** (`'__proto__'`, `'dark; x'`, `'Primary'`): bị bỏ qua, không đặt thuộc tính. → test trong Task 5.
3. **Accent môn không phải hex 6 số** từ DB: `SubjectProvider` đã fallback; `data-subject-scope` vẫn phải có để `--accent-ink` tính được. → test trong Task 2.
4. **Hydration**: script đổi `data-level` trước khi React hydrate — thẻ bao phải có `suppressHydrationWarning`, nếu không console báo lỗi mismatch trên mọi trang. → kiểm tra trong Task 5 Step 8 (console trình duyệt không có lỗi hydration).
5. **Nội dung portal ra ngoài thẻ bao** (menu/popover `@base-ui` gắn vào `body`): sẽ mất token. Plan này chưa có portal; ghi vào `DESIGN.md` quy tắc "portal phải gắn vào `[data-app-shell]`". → Task 10.

---

## File Structure

| File | Trách nhiệm |
|---|---|
| `packages/ui/src/theme/contrast.ts` | Hàm màu thuần: `hexToRgb`, `relativeLuminance`, `contrastRatio`, `mixHex` |
| `packages/ui/src/theme/palettes.ts` | Kiểu `ThemeLevel`, `ThemeMode`, `ThemePalette`; `THEME_PALETTES`, `ACCENT_INK_RATIO`, `PATTERN_URLS` |
| `packages/ui/src/theme/renderThemeCss.ts` | Sinh chuỗi CSS từ bảng màu |
| `packages/ui/src/theme/LevelScope.tsx` | Thẻ bao đặt `data-level` cho cây con |
| `packages/ui/src/theme/index.ts` | Export gom |
| `packages/ui/src/SubjectProvider.tsx` | Thêm `data-subject-scope` |
| `packages/ui/tailwind.config.ts` | Màu ngữ nghĩa, font |
| `frontend/tailwind.config.ts` | `darkMode` selector |
| `frontend/lib/theme/rawColors.ts` (+ test) | Đếm màu thô; ratchet với `frontend/theme-baseline.json` |
| `frontend/lib/theme/accentContrast.test.ts` | Test `accent-ink` với 29 accent trong migration catalog |
| `frontend/lib/theme/shellTheme.ts` (+ test) | Cờ dark mode, đọc/ghi preference, áp thuộc tính shell, script boot, `adoptAccountLevel` |
| `frontend/app/layout.tsx` | `<style>` theme, thẻ bao, script boot, font |
| `frontend/app/globals.css` | Bỏ `:root` accent/shadcn, bỏ override navbar |
| `frontend/public/patterns/neutral.svg` | Hoạ tiết mẫu |
| `frontend/components/nav/navToggleStyles.ts` | Class dùng chung cho công tắc trên navbar |
| `frontend/components/nav/ThemeToggle.tsx` (+ test) | Nút Theo hệ thống / Sáng / Tối |
| `frontend/components/ui/*.tsx` (+ test) | Primitive viết lại/mới |
| `frontend/app/dev/theme/page.tsx` | Trang xem primitive × cấp × chế độ |

---

### Task 1: Hàm tương phản và bảng màu

**Files:**
- Create: `packages/ui/src/theme/contrast.ts`
- Create: `packages/ui/src/theme/palettes.ts`
- Create: `packages/ui/src/theme/index.ts`
- Modify: `packages/ui/src/index.ts`
- Test: `packages/ui/src/__tests__/palettes.test.ts`

**Interfaces:**
- Produces: `hexToRgb(hex: string): [number, number, number]`, `relativeLuminance(hex: string): number`, `contrastRatio(a: string, b: string): number`, `mixHex(fg: string, bg: string, fgWeight: number): string` (trả về `#rrggbb` thường); `type ThemeLevel = 'primary' | 'lower_secondary' | 'upper_secondary' | 'neutral'`; `type ThemeMode = 'light' | 'dark'`; `interface ThemePalette`; `THEME_LEVELS: readonly ThemeLevel[]`; `THEME_MODES: readonly ThemeMode[]`; `THEME_PALETTES: Record<ThemeLevel, Record<ThemeMode, ThemePalette>>`; `ACCENT_INK_RATIO: Record<ThemeMode, number>`; `PATTERN_URLS: Record<ThemeLevel, string>`.

- [ ] **Step 1: Viết test thất bại**

`packages/ui/src/__tests__/palettes.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  mixHex,
  THEME_LEVELS,
  THEME_MODES,
  THEME_PALETTES,
  type ThemePalette,
} from '../theme';

describe('contrast helpers', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('mixes two colors in sRGB', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mixHex('#ff0000', '#0000ff', 1)).toBe('#ff0000');
    expect(mixHex('#ff0000', '#0000ff', 0)).toBe('#0000ff');
  });
});

const TEXT_ON: (keyof ThemePalette)[] = ['paper', 'surface', 'surfaceSunken'];

describe.each(THEME_LEVELS.flatMap((level) => THEME_MODES.map((mode) => [level, mode] as const)))(
  'palette %s / %s',
  (level, mode) => {
    const p = THEME_PALETTES[level][mode];
    const ratio = (fg: keyof ThemePalette, bg: string) => contrastRatio(p[fg] as string, bg);

    it.each(['ink', 'muted'] as const)('%s text reaches 4.5:1 on every background', (fg) => {
      for (const bg of TEXT_ON) expect(ratio(fg, p[bg] as string)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps ink, muted and action readable over the pattern at full strength', () => {
      const patterned = mixHex(p.patternInk, p.paper, p.patternOpacity);
      for (const fg of ['ink', 'muted', 'action'] as const) {
        expect(ratio(fg, patterned)).toBeGreaterThanOrEqual(4.5);
      }
    });

    it.each(['danger', 'success', 'warning'] as const)('%s reaches 4.5:1 on paper, surface and its own surface', (tone) => {
      const own = p[`${tone}Surface` as keyof ThemePalette] as string;
      for (const bg of [p.paper, p.surface, own]) expect(ratio(tone, bg)).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps action text, edges and focus visible', () => {
      for (const bg of [p.paper, p.surface]) {
        expect(ratio('action', bg)).toBeGreaterThanOrEqual(4.5);
        expect(ratio('edge', bg)).toBeGreaterThanOrEqual(3);
        expect(ratio('focus', bg)).toBeGreaterThanOrEqual(3);
      }
      expect(ratio('actionInk', p.action)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('actionInk', p.actionHover)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('navInk', p.nav)).toBeGreaterThanOrEqual(4.5);
    });

    it('uses six-digit hex colors and a small pattern opacity', () => {
      for (const [key, value] of Object.entries(p)) {
        if (key === 'patternOpacity') continue;
        expect(value).toMatch(/^#[0-9A-F]{6}$/);
      }
      expect(p.patternOpacity).toBeGreaterThan(0);
      expect(p.patternOpacity).toBeLessThanOrEqual(0.08);
    });
  },
);
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/ui test -- palettes`
Expected: FAIL — `Failed to resolve import "../theme"`.

- [ ] **Step 3: Viết `contrast.ts`**

`packages/ui/src/theme/contrast.ts`:

```ts
/** Pure color math for WCAG checks. Inputs are #rrggbb strings. */
export function hexToRgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) throw new Error(`Expected #rrggbb color, got ${hex}`);
  const value = match[1];
  return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) as [number, number, number];
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Same result as CSS `color-mix(in srgb, fg <fgWeight*100>%, bg)`. */
export function mixHex(fg: string, bg: string, fgWeight: number): string {
  const a = hexToRgb(fg);
  const b = hexToRgb(bg);
  return `#${a
    .map((v, i) => Math.round(v * fgWeight + b[i] * (1 - fgWeight)).toString(16).padStart(2, '0'))
    .join('')}`;
}
```

- [ ] **Step 4: Viết `palettes.ts`**

Các giá trị dưới đây đã được kiểm bằng script ngày 26/09 (spec §2.1). Không đổi giá trị nào mà không chạy lại test.

`packages/ui/src/theme/palettes.ts`:

```ts
export type ThemeLevel = 'primary' | 'lower_secondary' | 'upper_secondary' | 'neutral';
export type ThemeMode = 'light' | 'dark';

export interface ThemePalette {
  paper: string;
  surface: string;
  surfaceSunken: string;
  ink: string;
  /** Secondary text. Emitted as --ink-muted because shadcn's --muted is a background. */
  muted: string;
  /** Decorative rules only (notebook lines). Never a control border. */
  line: string;
  /** Control borders; at least 3:1 on paper and surface. */
  edge: string;
  action: string;
  actionHover: string;
  actionInk: string;
  focus: string;
  nav: string;
  navInk: string;
  danger: string;
  dangerSurface: string;
  success: string;
  successSurface: string;
  warning: string;
  warningSurface: string;
  patternInk: string;
  patternOpacity: number;
}

export const THEME_LEVELS = ['primary', 'lower_secondary', 'upper_secondary', 'neutral'] as const satisfies readonly ThemeLevel[];
export const THEME_MODES = ['light', 'dark'] as const satisfies readonly ThemeMode[];

const LIGHT_STATUS = {
  danger: '#B3261E', dangerSurface: '#FCEDEB',
  success: '#2F6E3A', successSurface: '#EAF4EC',
  warning: '#8A5A00', warningSurface: '#FBF1DC',
} as const;

const DARK_STATUS = {
  danger: '#FF9C8F', dangerSurface: '#3A1A1F',
  success: '#8FD19E', successSurface: '#17301F',
  warning: '#F2C66D', warningSurface: '#33280F',
} as const;

export const THEME_PALETTES: Record<ThemeLevel, Record<ThemeMode, ThemePalette>> = {
  // Vở ô li kẻ tím, mực tím
  primary: {
    light: {
      paper: '#FBFAFE', surface: '#FFFFFF', surfaceSunken: '#F3F0FB',
      ink: '#231B3A', muted: '#5A5078', line: '#D9D2F0', edge: '#8C80B3',
      action: '#5B3FB3', actionHover: '#4A3296', actionInk: '#FFFFFF', focus: '#5B3FB3',
      nav: '#4A3296', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#5B3FB3', patternOpacity: 0.06,
    },
    dark: {
      paper: '#15122A', surface: '#1E1A38', surfaceSunken: '#110E22',
      ink: '#ECE8F8', muted: '#B4ACD2', line: '#3A3363', edge: '#7B70A8',
      action: '#B9A6F7', actionHover: '#CFC1FA', actionInk: '#15122A', focus: '#B9A6F7',
      nav: '#231D45', navInk: '#ECE8F8',
      ...DARK_STATUS,
      patternInk: '#B9A6F7', patternOpacity: 0.07,
    },
  },
  // Giấy kẻ, bút bi xanh
  lower_secondary: {
    light: {
      paper: '#F5F8FC', surface: '#FFFFFF', surfaceSunken: '#EAF0F8',
      ink: '#14233D', muted: '#44566F', line: '#CFDCEC', edge: '#7A8DA8',
      action: '#1F4FA8', actionHover: '#183F87', actionInk: '#FFFFFF', focus: '#1F4FA8',
      nav: '#183F87', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#1F4FA8', patternOpacity: 0.06,
    },
    dark: {
      paper: '#0F1826', surface: '#172336', surfaceSunken: '#0B121D',
      ink: '#E6EDF7', muted: '#A9B8CC', line: '#2C3D57', edge: '#6A7E9C',
      action: '#8DB3F2', actionHover: '#AEC9F6', actionInk: '#0F1826', focus: '#8DB3F2',
      nav: '#14223A', navInk: '#E6EDF7',
      ...DARK_STATUS,
      patternInk: '#8DB3F2', patternOpacity: 0.07,
    },
  },
  // Bảng xanh, phấn trắng
  upper_secondary: {
    light: {
      paper: '#F4F7F3', surface: '#FFFFFF', surfaceSunken: '#E9F0EA',
      ink: '#13241B', muted: '#46594D', line: '#D3E0D6', edge: '#7A9282',
      action: '#1D5C45', actionHover: '#164A37', actionInk: '#FFFFFF', focus: '#1D5C45',
      nav: '#1C3329', navInk: '#EEF2EC',
      ...LIGHT_STATUS,
      patternInk: '#1D5C45', patternOpacity: 0.06,
    },
    dark: {
      paper: '#1C3329', surface: '#234034', surfaceSunken: '#172B22',
      ink: '#EEF2EC', muted: '#BCCBC1', line: '#3B5A4B', edge: '#7D9A89',
      action: '#F2E3A0', actionHover: '#F7ECC0', actionInk: '#1C3329', focus: '#F2E3A0',
      nav: '#152820', navInk: '#EEF2EC',
      danger: '#FFB0A5', dangerSurface: '#3F2226',
      success: '#9EDBAB', successSurface: '#1B3A26',
      warning: '#F2C66D', warningSurface: '#3A2F12',
      patternInk: '#EEF2EC', patternOpacity: 0.06,
    },
  },
  // Chưa rõ cấp: giấy trắng, xanh thương hiệu trên navbar
  neutral: {
    light: {
      paper: '#F7F7F3', surface: '#FFFFFF', surfaceSunken: '#EEF0EB',
      ink: '#202922', muted: '#49574E', line: '#D8DED8', edge: '#7F8B83',
      action: '#275B42', actionHover: '#1B4934', actionInk: '#FFFFFF', focus: '#275B42',
      nav: '#15803D', navInk: '#FFFFFF',
      ...LIGHT_STATUS,
      patternInk: '#275B42', patternOpacity: 0.05,
    },
    dark: {
      paper: '#151A17', surface: '#1D2420', surfaceSunken: '#101412',
      ink: '#E9EEEA', muted: '#AAB6AE', line: '#323B35', edge: '#737F77',
      action: '#8FD3AE', actionHover: '#AEE0C3', actionInk: '#151A17', focus: '#8FD3AE',
      nav: '#123821', navInk: '#E9EEEA',
      ...DARK_STATUS,
      patternInk: '#8FD3AE', patternOpacity: 0.06,
    },
  },
};

/** Share of the subject accent in --accent-ink; the rest is --ink. */
export const ACCENT_INK_RATIO: Record<ThemeMode, number> = { light: 0.6, dark: 0.4 };

/** One sample motif until phase 2 draws a set per level. */
export const PATTERN_URLS: Record<ThemeLevel, string> = {
  primary: '/patterns/neutral.svg',
  lower_secondary: '/patterns/neutral.svg',
  upper_secondary: '/patterns/neutral.svg',
  neutral: '/patterns/neutral.svg',
};
```

- [ ] **Step 5: Export**

`packages/ui/src/theme/index.ts`:

```ts
export * from './contrast';
export * from './palettes';
```

Thêm vào cuối `packages/ui/src/index.ts`:

```ts
export * from './theme';
```

- [ ] **Step 6: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/ui test -- palettes`
Expected: PASS (mọi case của 8 bảng màu).

- [ ] **Step 7: Typecheck và commit**

Run: `pnpm --filter @scipal/ui typecheck` — Expected: 0 lỗi.

```bash
git add packages/ui/src/theme packages/ui/src/index.ts packages/ui/src/__tests__/palettes.test.ts
git commit -m "feat(ui): level theme palettes with WCAG contrast tests"
```

---

### Task 2: `renderThemeCss`, `LevelScope`, `data-subject-scope`

**Files:**
- Create: `packages/ui/src/theme/renderThemeCss.ts`
- Create: `packages/ui/src/theme/LevelScope.tsx`
- Modify: `packages/ui/src/theme/index.ts`
- Modify: `packages/ui/src/SubjectProvider.tsx` (thẻ `<div style=…>`)
- Test: `packages/ui/src/__tests__/renderThemeCss.test.ts`, `packages/ui/src/__tests__/LevelScope.test.tsx`, `packages/ui/src/__tests__/SubjectProvider.test.tsx`

**Interfaces:**
- Consumes: `THEME_LEVELS`, `THEME_PALETTES`, `ACCENT_INK_RATIO`, `PATTERN_URLS`, `ThemeLevel`, `ThemeMode` (Task 1).
- Produces: `renderThemeCss(options: { systemDark: boolean }): string`; `THEME_CSS_VARS: Record<Exclude<keyof ThemePalette, 'patternOpacity'>, string>`; `LevelScope(props: { level: ThemeLevel; className?: string; children: ReactNode })`; thẻ bao của `SubjectProvider` có thuộc tính `data-subject-scope=""`.

CSS variables sinh ra (Task 4, 5, 8, 9 dùng): `--paper --surface --surface-sunken --ink --ink-muted --line --edge --action --action-hover --action-ink --focus --nav --nav-ink --danger --danger-surface --success --success-surface --warning --warning-surface --pattern-ink --pattern-opacity --pattern-url --accent-ink-ratio`, `--accent-ink` (trên `[data-subject-scope]`), và bí danh shadcn `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --border --input --ring --destructive --destructive-foreground`.

- [ ] **Step 1: Viết test thất bại cho `renderThemeCss`**

`packages/ui/src/__tests__/renderThemeCss.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { renderThemeCss, THEME_LEVELS } from '../theme';

describe('renderThemeCss', () => {
  const css = renderThemeCss({ systemDark: true });

  it('never targets the document root', () => {
    expect(css).not.toMatch(/:root/);
    expect(css).not.toMatch(/(^|[\s,{}])html[\s,{[.:]/);
  });

  it.each(THEME_LEVELS)('emits light, explicit dark and explicit light rules for %s', (level) => {
    expect(css).toContain(`[data-level="${level}"]{`);
    expect(css).toContain(`[data-theme="dark"][data-level="${level}"],[data-theme="dark"] [data-level="${level}"]{`);
    expect(css).toContain(`[data-theme="light"][data-level="${level}"],[data-theme="light"] [data-level="${level}"]{`);
  });

  it('puts palette values into custom properties', () => {
    expect(css).toMatch(/\[data-level="neutral"\]\{[^}]*--nav:#15803D;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--ink-muted:#5A5078;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--pattern-url:url\("\/patterns\/neutral\.svg"\);/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*--accent-ink-ratio:60%;/);
    expect(css).toMatch(/\[data-level="primary"\]\{[^}]*color-scheme:light;/);
  });

  it('maps shadcn aliases onto every level scope', () => {
    expect(css).toContain('[data-level]{--background:var(--paper);');
    expect(css).toContain('--muted-foreground:var(--ink-muted);');
    expect(css).toContain('--border:var(--edge);');
  });

  it('derives accent ink where the subject accent is declared', () => {
    expect(css).toContain(
      '[data-subject-scope]{--accent-ink:color-mix(in srgb,var(--accent) var(--accent-ink-ratio),var(--ink));}',
    );
  });

  it('paints the shell and its pattern layer, hiding the pattern for high contrast and print', () => {
    expect(css).toContain('[data-app-shell]::before{');
    expect(css).toContain('mask-image:var(--pattern-url);');
    expect(css).toContain('[data-pattern="off"]{background-color:var(--paper);}');
    expect(css).toMatch(/@media \(prefers-contrast: more\),print\{\[data-app-shell\]::before\{display:none;\}\}/);
  });

  it('follows the system color scheme only when enabled', () => {
    expect(css).toContain('@media (prefers-color-scheme: dark){');
    expect(renderThemeCss({ systemDark: false })).not.toContain('prefers-color-scheme');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/ui test -- renderThemeCss`
Expected: FAIL — `renderThemeCss is not a function` / không export.

- [ ] **Step 3: Viết `renderThemeCss.ts`**

`packages/ui/src/theme/renderThemeCss.ts`:

```ts
import {
  ACCENT_INK_RATIO,
  PATTERN_URLS,
  THEME_LEVELS,
  THEME_PALETTES,
  type ThemeLevel,
  type ThemeMode,
  type ThemePalette,
} from './palettes';

export const THEME_CSS_VARS: Record<Exclude<keyof ThemePalette, 'patternOpacity'>, string> = {
  paper: '--paper',
  surface: '--surface',
  surfaceSunken: '--surface-sunken',
  ink: '--ink',
  muted: '--ink-muted',
  line: '--line',
  edge: '--edge',
  action: '--action',
  actionHover: '--action-hover',
  actionInk: '--action-ink',
  focus: '--focus',
  nav: '--nav',
  navInk: '--nav-ink',
  danger: '--danger',
  dangerSurface: '--danger-surface',
  success: '--success',
  successSurface: '--success-surface',
  warning: '--warning',
  warningSurface: '--warning-surface',
  patternInk: '--pattern-ink',
};

const SHADCN_ALIASES =
  '[data-level]{--background:var(--paper);--foreground:var(--ink);' +
  '--card:var(--surface);--card-foreground:var(--ink);' +
  '--popover:var(--surface);--popover-foreground:var(--ink);' +
  '--primary:var(--action);--primary-foreground:var(--action-ink);' +
  '--secondary:var(--surface-sunken);--secondary-foreground:var(--ink);' +
  '--muted:var(--surface-sunken);--muted-foreground:var(--ink-muted);' +
  '--border:var(--edge);--input:var(--edge);--ring:var(--focus);' +
  '--destructive:var(--danger);--destructive-foreground:var(--surface);}';

const SUBJECT_SCOPE =
  '[data-subject-scope]{--accent-ink:color-mix(in srgb,var(--accent) var(--accent-ink-ratio),var(--ink));}';

const SHELL =
  '[data-app-shell]{position:relative;isolation:isolate;background-color:var(--paper);color:var(--ink);}' +
  '[data-app-shell]::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;' +
  'background-color:var(--pattern-ink);opacity:var(--pattern-opacity);' +
  '-webkit-mask-image:var(--pattern-url);mask-image:var(--pattern-url);' +
  '-webkit-mask-size:320px 320px;mask-size:320px 320px;' +
  '-webkit-mask-repeat:repeat;mask-repeat:repeat;}' +
  '[data-pattern="off"]{background-color:var(--paper);}' +
  '@media (prefers-contrast: more),print{[data-app-shell]::before{display:none;}}';

function declarations(level: ThemeLevel, mode: ThemeMode): string {
  const palette = THEME_PALETTES[level][mode];
  const vars = (Object.keys(THEME_CSS_VARS) as (keyof typeof THEME_CSS_VARS)[])
    .map((key) => `${THEME_CSS_VARS[key]}:${palette[key]};`)
    .join('');
  return (
    vars +
    `--pattern-opacity:${palette.patternOpacity};` +
    `--pattern-url:url("${PATTERN_URLS[level]}");` +
    `--accent-ink-ratio:${Math.round(ACCENT_INK_RATIO[mode] * 100)}%;` +
    `color-scheme:${mode};`
  );
}

const self = (attr: string, level: ThemeLevel) => `${attr}[data-level="${level}"]`;
const inside = (attr: string, level: ThemeLevel) => `${attr} [data-level="${level}"]`;

/**
 * CSS for every level x mode. Specificity plan:
 * light (0,1,0) < system dark (0,1,0, later) < explicit dark (0,2,0) < explicit light (0,2,0, later).
 */
export function renderThemeCss({ systemDark }: { systemDark: boolean }): string {
  const light = THEME_LEVELS.map((level) => `[data-level="${level}"]{${declarations(level, 'light')}}`).join('');

  const system = systemDark
    ? '@media (prefers-color-scheme: dark){' +
      THEME_LEVELS.map((level) => {
        const shell = ':where([data-app-shell]:not([data-theme="light"]))';
        return `${self(shell, level)},${inside(shell, level)}{${declarations(level, 'dark')}}`;
      }).join('') +
      '}'
    : '';

  const explicit = (mode: ThemeMode) =>
    THEME_LEVELS.map((level) => {
      const attr = `[data-theme="${mode}"]`;
      return `${self(attr, level)},${inside(attr, level)}{${declarations(level, mode)}}`;
    }).join('');

  return SHADCN_ALIASES + SUBJECT_SCOPE + SHELL + light + system + explicit('dark') + explicit('light');
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/ui test -- renderThemeCss`
Expected: PASS.

- [ ] **Step 5: Viết test thất bại cho `LevelScope` và `data-subject-scope`**

`packages/ui/src/__tests__/LevelScope.test.tsx`:

```tsx
import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { LevelScope } from '../theme';

describe('LevelScope', () => {
  it('re-scopes theme tokens for its subtree without painting a background', () => {
    const output = LevelScope({ level: 'primary', className: 'lesson', children: 'grade 5 lesson' });
    if (!isValidElement<{ 'data-level': string; className?: string; children: ReactNode; style?: unknown }>(output)) {
      throw new Error('LevelScope did not return an element');
    }
    expect(output.type).toBe('div');
    expect(output.props['data-level']).toBe('primary');
    expect(output.props.className).toBe('lesson');
    expect(output.props.children).toBe('grade 5 lesson');
    expect(output.props.style).toBeUndefined();
  });
});
```

Thêm vào cuối `describe` trong `packages/ui/src/__tests__/SubjectProvider.test.tsx`:

```tsx
  it.each([undefined, '#245398', 'red'])('marks the wrapper as a subject scope (accent %s)', (accentColor) => {
    const output = SubjectProvider({ slug: 'informatics', accentColor, children: 'subject content' });
    if (!isValidElement<{ children: ReactNode }>(output)) throw new Error('SubjectProvider did not return an element');
    const wrapper = output.props.children;
    if (!isValidElement<{ 'data-subject-scope'?: string }>(wrapper)) throw new Error('SubjectProvider wrapper is missing');
    expect(wrapper.props['data-subject-scope']).toBe('');
  });
```

- [ ] **Step 6: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/ui test -- LevelScope SubjectProvider`
Expected: FAIL — `LevelScope` không export; `data-subject-scope` là `undefined`.

- [ ] **Step 7: Viết `LevelScope.tsx`, sửa `SubjectProvider`, export**

`packages/ui/src/theme/LevelScope.tsx`:

```tsx
import type { ReactNode } from 'react';
import type { ThemeLevel } from './palettes';

interface LevelScopeProps {
  level: ThemeLevel;
  className?: string;
  children: ReactNode;
}

/**
 * Re-scopes theme tokens to a content level (e.g. a grade 5 lesson shown to a THPT student).
 * Place it outside SubjectProvider so --accent-ink mixes with this level's ink.
 */
export function LevelScope({ level, className, children }: LevelScopeProps) {
  return (
    <div data-level={level} className={className}>
      {children}
    </div>
  );
}
```

`packages/ui/src/theme/index.ts`:

```ts
export * from './contrast';
export * from './palettes';
export * from './renderThemeCss';
export * from './LevelScope';
```

Trong `packages/ui/src/SubjectProvider.tsx`, đổi thẻ bao:

```tsx
      <div data-subject-scope="" style={{ '--accent': accentColor } as React.CSSProperties}>
```

- [ ] **Step 8: Chạy toàn bộ test package**

Run: `pnpm --filter @scipal/ui test` — Expected: PASS toàn bộ (kể cả test cũ).
Run: `pnpm --filter @scipal/ui typecheck` — Expected: 0 lỗi.

- [ ] **Step 9: Commit**

```bash
git add packages/ui/src
git commit -m "feat(ui): render level theme CSS, LevelScope and subject scope marker"
```

---

### Task 3: Test chặn màu thô (ratchet) và test accent của catalog

**Files:**
- Create: `frontend/lib/theme/rawColors.ts`
- Create: `frontend/lib/theme/rawColors.test.ts`
- Create: `frontend/lib/theme/accentContrast.test.ts`
- Create: `frontend/theme-baseline.json` (sinh bởi test)

**Interfaces:**
- Consumes: `THEME_LEVELS`, `THEME_MODES`, `THEME_PALETTES`, `ACCENT_INK_RATIO`, `contrastRatio`, `mixHex` từ `@scipal/ui`.
- Produces: `countRawColors(source: string): { palette: number; hex: number; dark: number; total: number }`; `frontend/theme-baseline.json` dạng `{ "<đường dẫn tương đối từ frontend/, dấu />": <total> }`. Mọi task sau sửa `.tsx` chạy lại cập nhật baseline khi số giảm.

- [ ] **Step 1: Viết test thất bại**

`frontend/lib/theme/rawColors.test.ts`:

```ts
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { countRawColors } from './rawColors';

describe('countRawColors', () => {
  it('counts Tailwind palette classes including variants, sides and opacity', () => {
    expect(countRawColors('className="bg-emerald-700/95 hover:text-gray-900 border-t-slate-200"').palette).toBe(3);
    expect(countRawColors('className="text-white bg-black"').palette).toBe(2);
  });

  it('ignores semantic tokens', () => {
    expect(countRawColors('className="bg-paper text-ink-muted border-edge bg-action text-danger"').total).toBe(0);
  });

  it('counts hex colors and dark variants', () => {
    const result = countRawColors(`style={{ color: '#16a34a' }} className="bg-[#fafaf9] dark:bg-card"`);
    expect(result.hex).toBe(2);
    expect(result.dark).toBe(1);
    expect(result.total).toBe(3);
  });
});

const FRONTEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASELINE_PATH = join(FRONTEND_ROOT, 'theme-baseline.json');
const SCANNED_DIRS = ['app', 'components', 'features'];

function scan(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const dir of SCANNED_DIRS) {
    const entries = readdirSync(join(FRONTEND_ROOT, dir), { recursive: true, encoding: 'utf8' });
    for (const entry of entries) {
      const rel = `${dir}/${entry.replaceAll('\\', '/')}`;
      if (!rel.endsWith('.tsx') || rel.endsWith('.test.tsx')) continue;
      const total = countRawColors(readFileSync(join(FRONTEND_ROOT, rel), 'utf8')).total;
      if (total > 0) counts[rel] = total;
    }
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

describe('raw color ratchet', () => {
  it('never adds raw colors and locks in every reduction', () => {
    const current = scan();
    if (process.env.UPDATE_THEME_BASELINE === '1') {
      writeFileSync(BASELINE_PATH, `${JSON.stringify(current, null, 2)}\n`);
      return;
    }
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as Record<string, number>;
    const files = new Set([...Object.keys(current), ...Object.keys(baseline)]);
    const increased: string[] = [];
    const reduced: string[] = [];
    for (const file of files) {
      const now = current[file] ?? 0;
      const allowed = baseline[file] ?? 0;
      if (now > allowed) increased.push(`${file}: ${allowed} -> ${now}`);
      if (now < allowed) reduced.push(`${file}: ${allowed} -> ${now}`);
    }
    expect(increased, 'Use theme tokens (bg-paper, text-ink, border-edge...) instead of raw colors').toEqual([]);
    expect(reduced, 'Raw colors went down: rerun with UPDATE_THEME_BASELINE=1 to lock the gain').toEqual([]);
  });
});
```

`frontend/lib/theme/accentContrast.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ACCENT_INK_RATIO, contrastRatio, mixHex, THEME_LEVELS, THEME_MODES, THEME_PALETTES } from '@scipal/ui';

const CATALOG_SQL = fileURLToPath(
  new URL('../../../supabase/migrations/20260927090100_gdpt2018_catalog.sql', import.meta.url),
);
const accents = [...new Set(readFileSync(CATALOG_SQL, 'utf8').match(/#[0-9a-fA-F]{6}/g) ?? [])];

describe('subject accent ink', () => {
  it('reads every catalog accent', () => {
    expect(accents.length).toBeGreaterThanOrEqual(29);
  });

  it.each(THEME_LEVELS.flatMap((level) => THEME_MODES.map((mode) => [level, mode] as const)))(
    'stays readable on %s / %s surfaces',
    (level, mode) => {
      const p = THEME_PALETTES[level][mode];
      const failures = accents.flatMap((accent) => {
        const ink = mixHex(accent, p.ink, ACCENT_INK_RATIO[mode]);
        return [p.surface, p.surfaceSunken]
          .filter((bg) => contrastRatio(ink, bg) < 4.5)
          .map((bg) => `${accent} on ${bg}`);
      });
      expect(failures).toEqual([]);
    },
  );
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- lib/theme`
Expected: FAIL — `Failed to resolve import "./rawColors"`.

- [ ] **Step 3: Viết `rawColors.ts`**

`frontend/lib/theme/rawColors.ts`:

```ts
const COLOR_NAMES =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const UTILITIES =
  'bg|text|border(?:-[trblxyse])?|from|via|to|ring|ring-offset|outline|fill|stroke|divide|placeholder|decoration|shadow|caret|accent';

const PALETTE_CLASS = new RegExp(
  `(?<![\\w-])(?:${UTILITIES})-(?:(?:${COLOR_NAMES})-(?:50|[1-9]00|950)|white|black)(?![\\w-])`,
  'g',
);
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
const DARK_VARIANT = /(?<![\w-])dark:/g;

export function countRawColors(source: string) {
  const palette = source.match(PALETTE_CLASS)?.length ?? 0;
  const hex = source.match(HEX_COLOR)?.length ?? 0;
  const dark = source.match(DARK_VARIANT)?.length ?? 0;
  return { palette, hex, dark, total: palette + hex + dark };
}
```

- [ ] **Step 4: Sinh baseline ban đầu**

Bash: `UPDATE_THEME_BASELINE=1 pnpm --filter @scipal/web test -- lib/theme/rawColors`
PowerShell: `$env:UPDATE_THEME_BASELINE='1'; pnpm --filter @scipal/web test -- lib/theme/rawColors; Remove-Item Env:UPDATE_THEME_BASELINE`

Expected: PASS; `frontend/theme-baseline.json` được tạo, có mục cho `components/nav/NavBar.tsx`, `components/ui/button.tsx`… Tổng các giá trị xấp xỉ 1.450 + 99 + 358 (đo 26/09).

- [ ] **Step 5: Chạy lại không có biến môi trường**

Run: `pnpm --filter @scipal/web test -- lib/theme`
Expected: PASS (ratchet khớp; 8 case accent qua).

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/theme frontend/theme-baseline.json
git commit -m "test(web): ratchet raw colors and check catalog accent ink contrast"
```

---

### Task 4: Ánh xạ Tailwind sang token và một họ chữ

**Files:**
- Modify: `packages/ui/tailwind.config.ts`
- Modify: `frontend/tailwind.config.ts` (dòng `darkMode`)
- Modify: `frontend/app/layout.tsx` (import font, class `<body>`)
- Modify: `frontend/app/globals.css` (dòng `--font-sans`)
- Modify: `frontend/features/landing/landing.module.css:12`, `frontend/features/landing/level-gate.module.css:44`

**Interfaces:**
- Consumes: tên biến CSS từ Task 2.
- Produces: class Tailwind `bg-paper`, `bg-surface`, `bg-surface-sunken`, `text-ink`, `text-ink-muted`, `border-line`, `border-edge`, `bg-action`, `hover:bg-action-hover`, `text-action-ink`, `text-action`, `outline-focus`, `bg-nav`, `text-nav-ink`, `bg-nav-ink`, `text-nav`, `outline-nav-ink`, `text-danger`, `bg-danger-surface`, `text-success`, `bg-success-surface`, `text-warning`, `bg-warning-surface`, `bg-accent`, `text-accent-ink`; `font-sans` = Be Vietnam Pro.

- [ ] **Step 1: Sửa `packages/ui/tailwind.config.ts`**

Thay toàn bộ file:

```ts
import type { Config } from 'tailwindcss';

/** Shared Tailwind config — extend in each app's tailwind.config.ts. Colors read theme tokens. */
const config: Config = {
  content: [], // overridden in each app
  theme: {
    extend: {
      colors: {
        'scipal-green': '#16a34a',
        paper: 'var(--paper)',
        surface: { DEFAULT: 'var(--surface)', sunken: 'var(--surface-sunken)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)' },
        line: 'var(--line)',
        edge: 'var(--edge)',
        action: { DEFAULT: 'var(--action)', hover: 'var(--action-hover)', ink: 'var(--action-ink)' },
        focus: 'var(--focus)',
        nav: { DEFAULT: 'var(--nav)', ink: 'var(--nav-ink)' },
        danger: { DEFAULT: 'var(--danger)', surface: 'var(--danger-surface)' },
        success: { DEFAULT: 'var(--success)', surface: 'var(--success-surface)' },
        warning: { DEFAULT: 'var(--warning)', surface: 'var(--warning-surface)' },
        // Subject accent: only inside SubjectProvider; falls back to the level action color.
        accent: { DEFAULT: 'var(--accent, var(--action))', ink: 'var(--accent-ink, var(--action))' },
      },
      fontFamily: {
        sans: ['var(--font-be-vietnam)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Sửa `frontend/tailwind.config.ts`**

Đổi `darkMode: ['class'],` thành:

```ts
  darkMode: ['selector', '[data-theme="dark"]'],
```

Giữ nguyên khối màu shadcn (`border`, `background`, `primary`…): các biến đó giờ là bí danh do Task 2 sinh.

- [ ] **Step 3: Bỏ Inter**

Trong `frontend/app/layout.tsx`:
- Đổi import font thành `import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';`
- Xoá dòng `const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });`
- Trong `className` của `<body>`, xoá `${inter.variable} `.

Trong `frontend/app/globals.css`, đổi dòng `--font-sans`:

```css
  --font-sans: var(--font-be-vietnam), 'Be Vietnam Pro', system-ui, sans-serif;
```

Trong `frontend/features/landing/landing.module.css:12`:

```css
  --landing-font-body: var(--font-be-vietnam), 'Be Vietnam Pro', sans-serif;
```

Trong `frontend/features/landing/level-gate.module.css:44`:

```css
  --gate-font-body: var(--font-be-vietnam), 'Be Vietnam Pro', sans-serif;
```

- [ ] **Step 4: Kiểm tra không còn Inter**

Run (Grep): tìm `font-inter|Inter\(` trong `frontend/app`, `frontend/features`, `frontend/components`.
Expected: 0 kết quả.

- [ ] **Step 5: Typecheck, test**

Run: `pnpm turbo typecheck` — Expected: 7/7 thành công.
Run: `pnpm --filter @scipal/web test` — Expected: PASS. Nếu ratchet báo `layout.tsx` giảm thì chạy lại lệnh cập nhật baseline ở Task 3 Step 4.

- [ ] **Step 6: Commit**

```bash
git add packages/ui/tailwind.config.ts frontend/tailwind.config.ts frontend/app/layout.tsx frontend/app/globals.css frontend/features/landing/landing.module.css frontend/features/landing/level-gate.module.css frontend/theme-baseline.json
git commit -m "feat(web): map Tailwind colors to theme tokens and use Be Vietnam Pro only"
```

---

### Task 5: Thẻ bao app-shell, script boot, dọn `globals.css`, navbar, hoạ tiết mẫu

**Files:**
- Create: `frontend/lib/theme/shellTheme.ts`
- Test: `frontend/lib/theme/shellTheme.test.ts`
- Create: `frontend/public/patterns/neutral.svg`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/globals.css`
- Modify: `frontend/components/nav/NavBar.tsx:170-180` (thẻ `<header>` và khối nền cỏ bốn lá)
- Modify: `frontend/app/exam/[blueprintId]/page.tsx` (hai thẻ `<div className="relative min-h-[calc(100vh-3.5rem)] …">`)

**Interfaces:**
- Consumes: `renderThemeCss` (Task 2); `LEVEL_SESSION_KEY`, `parseEducationLevel`, `writeSessionEducationLevel`, `type EducationLevel` từ `frontend/features/landing/educationLevel.ts`.
- Produces (từ `frontend/lib/theme/shellTheme.ts`, dùng ở Task 6, 7):
  - `DARK_MODE_ENABLED: boolean` (= `false`)
  - `THEME_STORAGE_KEY = 'scipal-theme'`
  - `type ThemePreference = 'system' | 'light' | 'dark'`
  - `type ShellElement = Pick<HTMLElement, 'setAttribute' | 'removeAttribute'>`
  - `parseThemePreference(value: unknown): ThemePreference`
  - `readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference`
  - `writeThemePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void`
  - `applyShellTheme(shell: ShellElement | null, preference: ThemePreference): void`
  - `applyShellLevel(shell: ShellElement | null, level: EducationLevel | null): void`
  - `getShell(): HTMLElement | null`
  - `safeSessionStorage(): Storage | null`, `safeLocalStorage(): Storage | null`
  - `buildBootScript(options: { darkMode: boolean }): string`

- [ ] **Step 1: Viết test thất bại**

`frontend/lib/theme/shellTheme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  applyShellLevel,
  applyShellTheme,
  buildBootScript,
  parseThemePreference,
  readThemePreference,
  THEME_STORAGE_KEY,
  writeThemePreference,
} from './shellTheme';
import { LEVEL_SESSION_KEY } from '../../features/landing/educationLevel';

function fakeShell() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute: (name: string, value: string) => void attrs.set(name, value),
    removeAttribute: (name: string) => void attrs.delete(name),
  };
}

function fakeStorage(values: Record<string, string>) {
  return { getItem: (key: string) => values[key] ?? null, setItem: (key: string, value: string) => void (values[key] = value) };
}

const throwingStorage = {
  getItem: () => { throw new Error('SecurityError'); },
  setItem: () => { throw new Error('SecurityError'); },
};

function runBoot(script: string, session: unknown, local: unknown) {
  const shell = fakeShell();
  const document = { currentScript: { parentElement: shell } };
  const window = {
    get sessionStorage() { if (session === 'throw') throw new Error('SecurityError'); return session; },
    get localStorage() { if (local === 'throw') throw new Error('SecurityError'); return local; },
  };
  new Function('document', 'window', script)(document, window);
  return shell.attrs;
}

describe('theme preference', () => {
  it.each([['light', 'light'], ['dark', 'dark'], ['system', 'system'], ['Dark', 'system'], ['dark; x', 'system'], [null, 'system']])(
    'parses %s as %s',
    (raw, expected) => expect(parseThemePreference(raw)).toBe(expected),
  );

  it('survives blocked storage', () => {
    expect(readThemePreference(throwingStorage)).toBe('system');
    expect(() => writeThemePreference(throwingStorage, 'dark')).not.toThrow();
    expect(readThemePreference(null)).toBe('system');
  });

  it('round-trips through storage', () => {
    const storage = fakeStorage({});
    writeThemePreference(storage, 'dark');
    expect(readThemePreference(storage)).toBe('dark');
  });
});

describe('shell attributes', () => {
  it('sets data-theme only for explicit choices', () => {
    const shell = fakeShell();
    applyShellTheme(shell, 'dark');
    expect(shell.attrs.get('data-theme')).toBe('dark');
    applyShellTheme(shell, 'system');
    expect(shell.attrs.has('data-theme')).toBe(false);
  });

  it('falls back to neutral when no level is known', () => {
    const shell = fakeShell();
    applyShellLevel(shell, 'primary');
    expect(shell.attrs.get('data-level')).toBe('primary');
    applyShellLevel(shell, null);
    expect(shell.attrs.get('data-level')).toBe('neutral');
    expect(() => applyShellLevel(null, 'primary')).not.toThrow();
  });
});

describe('boot script', () => {
  it('applies a stored level and theme before paint', () => {
    const attrs = runBoot(
      buildBootScript({ darkMode: true }),
      fakeStorage({ [LEVEL_SESSION_KEY]: 'upper_secondary' }),
      fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }),
    );
    expect(attrs.get('data-level')).toBe('upper_secondary');
    expect(attrs.get('data-theme')).toBe('dark');
  });

  it('ignores the theme while dark mode is disabled', () => {
    const attrs = runBoot(buildBootScript({ darkMode: false }), fakeStorage({}), fakeStorage({ [THEME_STORAGE_KEY]: 'dark' }));
    expect(attrs.has('data-theme')).toBe(false);
  });

  it.each(['__proto__', 'Primary', 'neutral', 'upper_secondary " onload="x'])('ignores junk level %s', (junk) => {
    const attrs = runBoot(buildBootScript({ darkMode: true }), fakeStorage({ [LEVEL_SESSION_KEY]: junk }), fakeStorage({}));
    expect(attrs.has('data-level')).toBe(false);
  });

  it('does not throw when storage is blocked', () => {
    expect(() => runBoot(buildBootScript({ darkMode: true }), 'throw', 'throw')).not.toThrow();
    const attrs = runBoot(buildBootScript({ darkMode: true }), throwingStorage, throwingStorage);
    expect(attrs.size).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- lib/theme/shellTheme`
Expected: FAIL — `Failed to resolve import "./shellTheme"`.

- [ ] **Step 3: Viết `shellTheme.ts`**

`frontend/lib/theme/shellTheme.ts`:

```ts
import {
  LEVEL_SESSION_KEY,
  type EducationLevel,
} from '../../features/landing/educationLevel';

/** Off until every screen uses tokens (spec §4.4, phase 5). */
export const DARK_MODE_ENABLED = false;

export const THEME_STORAGE_KEY = 'scipal-theme';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ShellElement = Pick<HTMLElement, 'setAttribute' | 'removeAttribute'>;

export function parseThemePreference(value: unknown): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function readThemePreference(storage: Pick<Storage, 'getItem'> | null): ThemePreference {
  if (!storage) return 'system';
  try {
    return parseThemePreference(storage.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function writeThemePreference(storage: Pick<Storage, 'setItem'> | null, preference: ThemePreference): void {
  if (!storage) return;
  try {
    storage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

export function applyShellTheme(shell: ShellElement | null, preference: ThemePreference): void {
  if (!shell) return;
  if (preference === 'system') shell.removeAttribute('data-theme');
  else shell.setAttribute('data-theme', preference);
}

export function applyShellLevel(shell: ShellElement | null, level: EducationLevel | null): void {
  shell?.setAttribute('data-level', level ?? 'neutral');
}

export function getShell(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>('[data-app-shell]');
}

export function safeSessionStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Inline script placed as the first child of [data-app-shell]. Runs before the shell paints,
 * so the level and theme are right on first frame. Must stay self-contained ES5.
 */
export function buildBootScript({ darkMode }: { darkMode: boolean }): string {
  const levelKey = JSON.stringify(LEVEL_SESSION_KEY);
  const themeKey = JSON.stringify(THEME_STORAGE_KEY);
  const themePart = darkMode
    ? `var t=null;try{t=window.localStorage.getItem(${themeKey})}catch(e){}` +
      `if(t==='light'||t==='dark')s.setAttribute('data-theme',t);`
    : '';
  return (
    '(function(){var s=document.currentScript&&document.currentScript.parentElement;if(!s)return;' +
    `var l=null;try{l=window.sessionStorage.getItem(${levelKey})}catch(e){}` +
    "if(l==='primary'||l==='lower_secondary'||l==='upper_secondary')s.setAttribute('data-level',l);" +
    themePart +
    '})();'
  );
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- lib/theme/shellTheme`
Expected: PASS.

- [ ] **Step 5: Gắn thẻ bao vào layout**

Trong `frontend/app/layout.tsx` thêm import:

```tsx
import { renderThemeCss } from '@scipal/ui';
import { buildBootScript, DARK_MODE_ENABLED } from '@/lib/theme/shellTheme';
```

Trong `<head>`, ngay sau thẻ mở `<head>`:

```tsx
        <style id="scipal-theme" dangerouslySetInnerHTML={{ __html: renderThemeCss({ systemDark: DARK_MODE_ENABLED }) }} />
```

Thay `<body …>…</body>` bằng:

```tsx
      <body className={`${jetbrainsMono.variable} ${beVietnamPro.variable} font-sans antialiased`}>
        <div data-app-shell="" data-level="neutral" suppressHydrationWarning className="flex min-h-screen flex-col">
          <script dangerouslySetInnerHTML={{ __html: buildBootScript({ darkMode: DARK_MODE_ENABLED }) }} />
          <NavBar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </body>
```

- [ ] **Step 6: Dọn `globals.css`**

Trong `frontend/app/globals.css`:
- Khối `:root` chỉ giữ ba dòng:

```css
:root {
  --font-sans: var(--font-be-vietnam), 'Be Vietnam Pro', system-ui, sans-serif;
  --font-mono: var(--font-jetbrains-mono), 'JetBrains Mono', monospace;
  --radius: 0.5rem;
}
```

  (xoá `--scipal-green`, `--accent`, `--accent-10`, `--accent-20` và mọi biến shadcn `--background`…`--ring`).
- Xoá toàn bộ khối `.dark { … }`.
- Trong `@layer base`, đổi `body` thành:

```css
  body {
    @apply antialiased text-base leading-relaxed;
    font-family: var(--font-sans);
  }
```

- Đổi `.glow-accent` thành `box-shadow: 0 0 25px -5px var(--accent, var(--action));`
- Xoá bốn khối `body:has([data-scipal-level…]) > header …` ở cuối file.

Sau đó tìm `accent-10|accent-20` trong `frontend/app`, `frontend/components`, `frontend/features` (4 chỗ, đo 26/09). Mỗi chỗ `var(--accent-10)` đổi thành `color-mix(in srgb, var(--accent) 10%, var(--surface))`; `var(--accent-20)` đổi thành `color-mix(in srgb, var(--accent) 20%, var(--surface))`. Trong class Tailwind, viết dạng `bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))]`.

- [ ] **Step 7: Navbar dùng token `nav`, bỏ nền cỏ bốn lá; phòng thi tắt hoạ tiết**

Trong `frontend/components/nav/NavBar.tsx`:
- Thẻ `<header>` đổi `className` thành:

```tsx
    <header className="sticky top-0 z-40 w-full border-b border-[color-mix(in_srgb,var(--nav-ink)_20%,transparent)] bg-nav text-nav-ink">
```

- Xoá toàn bộ phần tử con đầu tiên của `<header>` có `className="pointer-events-none absolute inset-0 z-0"` và `backgroundImage: "url('/clover.svg')"` (khối `<div … />` ở khoảng dòng 172–180). Logo `<Image>` giữ nguyên.

Trong `frontend/app/exam/[blueprintId]/page.tsx`, thêm `data-pattern="off"` vào cả hai thẻ `<div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">`.

- [ ] **Step 8: Hoạ tiết mẫu**

`frontend/public/patterns/neutral.svg` (nét đen trên nền trong suốt; chỉ dùng làm mask, màu lấy từ `--pattern-ink`):

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(40 52) rotate(-28)">
    <rect x="0" y="0" width="96" height="14" rx="2"/>
    <path d="M96 0 L116 7 L96 14"/>
    <path d="M0 0 V14 M12 0 V14"/>
  </g>
  <g transform="translate(196 36) rotate(14)">
    <rect x="0" y="0" width="104" height="22" rx="2"/>
    <path d="M10 0 V8 M20 0 V12 M30 0 V8 M40 0 V12 M50 0 V8 M60 0 V12 M70 0 V8 M80 0 V12 M90 0 V8"/>
  </g>
  <g transform="translate(60 180) rotate(8)">
    <path d="M0 80 L40 0 L80 80 Z"/>
    <path d="M16 72 L40 24 L64 72 Z"/>
  </g>
  <g transform="translate(218 168) rotate(-12)">
    <circle cx="24" cy="6" r="6"/>
    <path d="M20 12 L0 84 M28 12 L44 84"/>
    <path d="M44 84 L40 92"/>
  </g>
  <g transform="translate(176 262) rotate(-6)">
    <rect x="0" y="0" width="44" height="58" rx="6"/>
    <rect x="7" y="7" width="30" height="12" rx="2"/>
    <path d="M9 30 h4 M20 30 h4 M31 30 h4 M9 40 h4 M20 40 h4 M31 40 h4 M9 50 h4 M20 50 h4 M31 50 h4"/>
  </g>
</svg>
```

(Bút chì, thước kẻ, ê-ke, compa, máy tính cầm tay.)

- [ ] **Step 9: Kiểm tra trong trình duyệt**

Chạy `pnpm --filter @scipal/web dev`, mở `http://localhost:3000/` rồi `http://localhost:3000/glossary`:
- Tab mới, chưa chọn cấp: navbar màu `#15803D`, nền trang có hoạ tiết mờ ở những vùng trang không phủ nền riêng.
- DevTools: `document.querySelector('[data-app-shell]').dataset.level` là `neutral`; `getComputedStyle(document.documentElement).getPropertyValue('--accent')` rỗng.
- Chọn THPT ở cổng, tải lại tab: ngay khung đầu tiên navbar đã `#1C3329`, không nháy xanh thương hiệu.
- Console không có cảnh báo hydration mismatch.
- `/exam/<một blueprint bất kỳ>`: không thấy hoạ tiết.

- [ ] **Step 10: Typecheck, test, cập nhật baseline, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Run: cập nhật baseline (lệnh ở Task 3 Step 4) — `NavBar.tsx` và `layout.tsx` giảm.
Run: `pnpm --filter @scipal/web test` — Expected: PASS.

```bash
git add frontend/lib/theme frontend/app/layout.tsx frontend/app/globals.css frontend/components/nav/NavBar.tsx frontend/app/exam frontend/public/patterns frontend/theme-baseline.json frontend/features frontend/components frontend/app
git commit -m "feat(web): app shell carries level theme tokens with a pre-paint boot script"
```

---

### Task 6: Đồng bộ cấp học lên thẻ bao

**Files:**
- Modify: `frontend/lib/theme/shellTheme.ts` (thêm `adoptAccountLevel`)
- Test: `frontend/lib/theme/shellTheme.test.ts`
- Modify: `frontend/components/nav/NavBar.tsx` (kiểu `AuthUser`, effect `getUser`)
- Modify: `frontend/features/landing/LandingPage.tsx`
- Modify: `frontend/features/profile/EducationLevelSetting.tsx` (`handleSelect`)

**Interfaces:**
- Consumes: `applyShellLevel`, `getShell`, `safeSessionStorage`, `ShellElement` (Task 5); `parseEducationLevel`, `writeSessionEducationLevel` (`features/landing/educationLevel.ts`).
- Produces: `adoptAccountLevel(raw: unknown, storage: Pick<Storage, 'setItem'> | null, shell: ShellElement | null): EducationLevel | null`.

- [ ] **Step 1: Viết test thất bại**

Thêm vào `frontend/lib/theme/shellTheme.test.ts` (bổ sung `adoptAccountLevel` vào import từ `./shellTheme`):

```ts
describe('adoptAccountLevel', () => {
  it('stores a valid account level for the tab and applies it to the shell', () => {
    const shell = fakeShell();
    const values: Record<string, string> = {};
    expect(adoptAccountLevel('lower_secondary', fakeStorage(values), shell)).toBe('lower_secondary');
    expect(values[LEVEL_SESSION_KEY]).toBe('lower_secondary');
    expect(shell.attrs.get('data-level')).toBe('lower_secondary');
  });

  it.each([null, undefined, '', 'THPT'])('leaves the shell alone for %s', (raw) => {
    const shell = fakeShell();
    expect(adoptAccountLevel(raw, fakeStorage({}), shell)).toBeNull();
    expect(shell.attrs.size).toBe(0);
  });

  it('still themes the shell when storage is blocked', () => {
    const shell = fakeShell();
    expect(adoptAccountLevel('primary', throwingStorage, shell)).toBe('primary');
    expect(shell.attrs.get('data-level')).toBe('primary');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- lib/theme/shellTheme`
Expected: FAIL — `adoptAccountLevel is not a function`.

- [ ] **Step 3: Viết `adoptAccountLevel`**

Trong `frontend/lib/theme/shellTheme.ts`, đổi import thành:

```ts
import {
  LEVEL_SESSION_KEY,
  parseEducationLevel,
  writeSessionEducationLevel,
  type EducationLevel,
} from '../../features/landing/educationLevel';
```

và thêm cuối file:

```ts
/** Account level wins: keep it for this tab (so the boot script sees it) and theme the shell now. */
export function adoptAccountLevel(
  raw: unknown,
  storage: Pick<Storage, 'setItem'> | null,
  shell: ShellElement | null,
): EducationLevel | null {
  const level = parseEducationLevel(raw);
  if (!level) return null;
  if (storage) {
    try {
      writeSessionEducationLevel(storage, level);
    } catch {
      // Storage blocked: the shell is still themed for this page.
    }
  }
  applyShellLevel(shell, level);
  return level;
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- lib/theme/shellTheme`
Expected: PASS.

- [ ] **Step 5: Nối vào NavBar**

Trong `frontend/components/nav/NavBar.tsx`:
- Thêm import: `import { adoptAccountLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';`
- Thêm `id?: string;` vào `type AuthUser`.
- Trong effect gọi `supabase.auth.getUser()`, thay khối `if (mounted) { … }` trong `.then` bằng:

```tsx
        if (mounted) {
          const user = error ? null : data.user;
          setAppRole(getAppRole(user));
          setDisplayName(getDisplayName(user));
          if (user?.id) {
            void supabase
              .from('profiles')
              .select('preferred_education_level')
              .eq('id', user.id)
              .maybeSingle()
              .then(({ data: profile, error: profileError }) => {
                if (!mounted || profileError) return;
                adoptAccountLevel(profile?.preferred_education_level, safeSessionStorage(), getShell());
              });
          }
        }
```

- [ ] **Step 6: Nối vào LandingPage và EducationLevelSetting**

`frontend/features/landing/LandingPage.tsx`: thêm import `import { applyShellLevel, getShell } from '@/lib/theme/shellTheme';` và trong component (sau các hook hiện có, trước `return`):

```tsx
  useEffect(() => {
    applyShellLevel(getShell(), level);
  }, [level]);
```

`frontend/features/profile/EducationLevelSetting.tsx`: thêm import `import { adoptAccountLevel, applyShellLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';`
- Nhánh khách, ngay sau `setSaveState('saved');`: `applyShellLevel(getShell(), level);`
- Nhánh tài khoản, ngay sau `setSaveState('saved');` (trước `router.refresh()`): `adoptAccountLevel(level, safeSessionStorage(), getShell());`

- [ ] **Step 7: Kiểm tra trong trình duyệt**

- Khách: chọn THCS ở cổng → navbar `#183F87`; vào `/glossary` vẫn `#183F87`.
- Đăng nhập tài khoản thử nghiệm có `preferred_education_level = upper_secondary`, mở tab mới vào `/glossary` → sau khi tải hồ sơ navbar thành `#1C3329`; tải lại → đúng màu ngay khung đầu.
- `/profile` đổi cấp sang Tiểu học → navbar `#4A3296` ngay khi lưu thành công.

- [ ] **Step 8: Typecheck, test, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Run: `pnpm --filter @scipal/web test` — Expected: PASS (cập nhật baseline nếu số giảm).

```bash
git add frontend/lib/theme frontend/components/nav/NavBar.tsx frontend/features/landing/LandingPage.tsx frontend/features/profile/EducationLevelSetting.tsx frontend/theme-baseline.json
git commit -m "feat(web): keep the shell level in sync with account, landing and profile choices"
```

---

### Task 7: Nút sáng/tối (sau cờ) và công tắc navbar dùng token

**Files:**
- Create: `frontend/components/nav/navToggleStyles.ts`
- Create: `frontend/components/nav/ThemeToggle.tsx`
- Test: `frontend/components/nav/ThemeToggle.test.tsx`
- Modify: `frontend/components/nav/LanguageToggle.tsx`
- Modify: `frontend/components/nav/NavBar.tsx` (hai chỗ `<LanguageToggle />`)
- Modify: `frontend/features/profile/AccountSettings.tsx` (khối `<div className="space-y-5">`)

**Interfaces:**
- Consumes: `DARK_MODE_ENABLED`, `ThemePreference`, `readThemePreference`, `writeThemePreference`, `applyShellTheme`, `getShell`, `safeLocalStorage` (Task 5).
- Produces: `ThemeToggle(props: { tone?: 'nav' | 'surface'; enabled?: boolean })`; `NAV_TOGGLE_GROUP: string`, `navToggleButton(pressed: boolean): string`.

- [ ] **Step 1: Viết test thất bại**

`frontend/components/nav/ThemeToggle.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { ThemeToggle } from './ThemeToggle';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ t: (o: { en: string; vi: string }) => o.vi, lang: 'vi' }),
}));

describe('ThemeToggle', () => {
  it('renders nothing while dark mode is disabled', () => {
    expect(renderToStaticMarkup(<ThemeToggle enabled={false} />)).toBe('');
  });

  it('offers system, light and dark with system selected first', () => {
    const html = renderToStaticMarkup(<ThemeToggle enabled />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Chế độ màu"');
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toMatch(/aria-label="Theo hệ thống"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Theo hệ thống"/);
    expect(html).toContain('aria-label="Sáng"');
    expect(html).toContain('aria-label="Tối"');
  });

  it('uses only theme tokens', () => {
    expect(countRawColors(renderToStaticMarkup(<ThemeToggle enabled tone="nav" />)).total).toBe(0);
    expect(countRawColors(renderToStaticMarkup(<ThemeToggle enabled tone="surface" />)).total).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- ThemeToggle`
Expected: FAIL — `Failed to resolve import "./ThemeToggle"`.

- [ ] **Step 3: Viết style dùng chung và `ThemeToggle`**

`frontend/components/nav/navToggleStyles.ts`:

```ts
export const NAV_TOGGLE_GROUP =
  'inline-flex min-h-12 items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)] p-1 text-nav-ink';

export function navToggleButton(pressed: boolean): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-ink';
  return pressed
    ? `${base} bg-nav-ink text-nav`
    : `${base} hover:bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)]`;
}

export const SURFACE_TOGGLE_GROUP =
  'inline-flex min-h-12 items-center gap-1 rounded-full border border-edge bg-surface p-1 text-ink';

export function surfaceToggleButton(pressed: boolean): string {
  const base =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
  return pressed ? `${base} bg-action text-action-ink` : `${base} hover:bg-surface-sunken`;
}
```

`frontend/components/nav/ThemeToggle.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import {
  applyShellTheme,
  DARK_MODE_ENABLED,
  getShell,
  readThemePreference,
  safeLocalStorage,
  writeThemePreference,
  type ThemePreference,
} from '../../lib/theme/shellTheme'; // relative: frontend vitest has no @/ alias
import {
  NAV_TOGGLE_GROUP,
  navToggleButton,
  SURFACE_TOGGLE_GROUP,
  surfaceToggleButton,
} from './navToggleStyles';

const OPTIONS: { value: ThemePreference; icon: typeof Sun; label: { en: string; vi: string } }[] = [
  { value: 'system', icon: Monitor, label: { en: 'Match system', vi: 'Theo hệ thống' } },
  { value: 'light', icon: Sun, label: { en: 'Light', vi: 'Sáng' } },
  { value: 'dark', icon: Moon, label: { en: 'Dark', vi: 'Tối' } },
];

interface ThemeToggleProps {
  tone?: 'nav' | 'surface';
  enabled?: boolean;
}

export function ThemeToggle({ tone = 'nav', enabled = DARK_MODE_ENABLED }: ThemeToggleProps) {
  const { t } = useLanguage();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    setPreference(readThemePreference(safeLocalStorage()));
  }, []);

  if (!enabled) return null;

  const choose = (next: ThemePreference) => {
    setPreference(next);
    writeThemePreference(safeLocalStorage(), next);
    applyShellTheme(getShell(), next);
  };

  const group = tone === 'nav' ? NAV_TOGGLE_GROUP : SURFACE_TOGGLE_GROUP;
  const button = tone === 'nav' ? navToggleButton : surfaceToggleButton;

  return (
    <div role="group" aria-label={t({ en: 'Colour mode', vi: 'Chế độ màu' })} className={group}>
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          aria-label={t(label)}
          title={t(label)}
          aria-pressed={preference === value}
          onClick={() => choose(value)}
          className={button(preference === value)}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- ThemeToggle`
Expected: PASS.

- [ ] **Step 5: `LanguageToggle` dùng style chung**

Trong `frontend/components/nav/LanguageToggle.tsx`:
- Thêm import `import { NAV_TOGGLE_GROUP, navToggleButton } from './navToggleStyles';`
- `className` của `<div data-language-toggle …>` đổi thành `{NAV_TOGGLE_GROUP}`.
- Icon `<Languages …>` đổi `className` thành `"ml-2 h-4 w-4 shrink-0"`.
- Nút VI: thêm `type="button"`, `className={navToggleButton(lang === 'vi')}`; nút EN: thêm `type="button"`, `className={navToggleButton(lang === 'en')}`.

- [ ] **Step 6: Đặt `ThemeToggle` vào navbar và Profile**

`frontend/components/nav/NavBar.tsx`: thêm `import { ThemeToggle } from './ThemeToggle';`; ngay sau mỗi `<LanguageToggle />` (desktop và mobile) thêm `<ThemeToggle />`.

`frontend/features/profile/AccountSettings.tsx`: thêm `import { ThemeToggle } from '@/components/nav/ThemeToggle';` và đầu khối `<div className="space-y-5">`:

```tsx
          <ThemeToggle tone="surface" />
```

(Khi cờ tắt, cả hai chỗ không hiện gì.)

- [ ] **Step 7: Kiểm tra trong trình duyệt**

Với cờ tắt: navbar chỉ có công tắc VI/EN, màu theo `nav-ink`, focus bàn phím thấy viền. Tạm đổi `DARK_MODE_ENABLED = true` trên máy (không commit): ba nút hiện ở navbar và Profile; chọn Tối → `data-theme="dark"` trên thẻ bao, navbar đổi sang màu `nav` tối; tải lại vẫn tối không nháy; chọn Theo hệ thống → thuộc tính bị gỡ. Trả cờ về `false`.

- [ ] **Step 8: Typecheck, test, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Run: cập nhật baseline, rồi `pnpm --filter @scipal/web test` — Expected: PASS (`LanguageToggle.tsx` về 0).

```bash
git add frontend/components/nav frontend/features/profile/AccountSettings.tsx frontend/theme-baseline.json
git commit -m "feat(web): colour mode toggle behind a flag and token-based navbar toggles"
```

---

### Task 8: Viết lại primitive hiện có bằng token (Tailwind 3)

**Files:**
- Modify (thay toàn bộ): `frontend/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `progress.tsx`, `separator.tsx`
- Test: `frontend/components/ui/primitives.test.tsx`

**Interfaces:**
- Produces: `Button` + `buttonVariants` (variant: `default | outline | secondary | ghost | destructive | link`; size: `default | lg | icon`); `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` (Card nhận `size?: 'default' | 'sm'`); `Badge` + `badgeVariants` (variant: `default | secondary | outline | success | warning | destructive`); `Progress`, `ProgressTrack`, `ProgressIndicator`, `ProgressLabel`, `ProgressValue`; `Separator` (`orientation?: 'horizontal' | 'vertical'`).

Không file nào trong app đang import các primitive này (đo 26/09), nên đổi API ở đây không làm vỡ màn hình nào.

- [ ] **Step 1: Viết test thất bại**

`frontend/components/ui/primitives.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Badge } from './badge';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';
import { Progress } from './progress';
import { Separator } from './separator';

const TAILWIND_V4_ONLY = /gap-\(|py-\(|px-\(|p-\(|--spacing\(|data-horizontal:|data-vertical:|ring-3|rounded-4xl|\bin-data-/;

function expectTokensOnly(html: string) {
  expect(countRawColors(html).total).toBe(0);
  expect(html).not.toMatch(TAILWIND_V4_ONLY);
}

describe('Button', () => {
  it.each(['default', 'outline', 'secondary', 'ghost', 'destructive', 'link'] as const)('%s uses tokens only', (variant) => {
    expectTokensOnly(renderToStaticMarkup(<Button variant={variant}>Lưu thay đổi</Button>));
  });

  it('meets the 44px target and shows keyboard focus', () => {
    const html = renderToStaticMarkup(<Button>Lưu thay đổi</Button>);
    expect(html).toContain('min-h-11');
    expect(html).toContain('focus-visible:outline-focus');
    expect(html).toContain('bg-action');
    expect(html).toContain('text-action-ink');
  });
});

describe('Badge', () => {
  it.each(['default', 'secondary', 'outline', 'success', 'warning', 'destructive'] as const)('%s uses tokens only', (variant) => {
    expectTokensOnly(renderToStaticMarkup(<Badge variant={variant}>Đang biên soạn</Badge>));
  });
});

describe('Card', () => {
  it('uses surface, line and muted ink', () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>
          <CardTitle>Bài 3</CardTitle>
          <CardDescription>Thuật toán tìm kiếm</CardDescription>
        </CardHeader>
        <CardContent>Nội dung</CardContent>
        <CardFooter>Chân thẻ</CardFooter>
      </Card>,
    );
    expectTokensOnly(html);
    expect(html).toContain('bg-surface');
    expect(html).toContain('border-line');
    expect(html).toContain('text-ink-muted');
  });
});

describe('Progress and Separator', () => {
  it('use tokens only', () => {
    expectTokensOnly(renderToStaticMarkup(<Progress value={40} aria-label="Tiến độ" />));
    const vertical = renderToStaticMarkup(<Separator orientation="vertical" />);
    expectTokensOnly(vertical);
    expect(vertical).toContain('w-px');
    expect(renderToStaticMarkup(<Separator />)).toContain('h-px');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- components/ui/primitives`
Expected: FAIL — HTML chứa `dark:`, `ring-3`, `gap-(`, và không có `min-h-11`.

- [ ] **Step 3: Viết lại `button.tsx`**

```tsx
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const buttonVariants = cva(
  'inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent px-4 text-sm font-semibold transition-colors select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50 aria-[invalid=true]:border-danger [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-action text-action-ink hover:bg-action-hover',
        outline: 'border-edge bg-surface text-ink hover:bg-surface-sunken',
        secondary: 'bg-surface-sunken text-ink hover:bg-[color-mix(in_srgb,var(--surface-sunken),var(--ink)_6%)]',
        ghost: 'text-ink hover:bg-surface-sunken',
        destructive: 'bg-danger-surface text-danger hover:bg-[color-mix(in_srgb,var(--danger-surface),var(--danger)_10%)]',
        link: 'px-0 text-action underline-offset-4 hover:underline',
      },
      size: {
        default: '',
        lg: 'min-h-12 px-5 text-base',
        icon: 'size-11 px-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
```

- [ ] **Step 4: Viết lại `card.tsx`**

```tsx
import * as React from 'react';
import { cn } from 'cn';

function Card({ className, size = 'default', ...props }: React.ComponentProps<'div'> & { size?: 'default' | 'sm' }) {
  return (
    <div
      data-slot="card"
      data-size={size}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-line bg-surface text-sm text-ink',
        size === 'sm' ? 'gap-3 py-3' : 'gap-4 py-5',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('grid auto-rows-min items-start gap-1 px-5', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('text-lg font-semibold leading-snug text-ink', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-sm text-ink-muted', className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-action" className={cn('self-start justify-self-end', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-5', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center border-t border-line bg-surface-sunken px-5 pt-4', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
```

- [ ] **Step 5: Viết lại `badge.tsx`**

```tsx
import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cn';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-transparent px-2.5 py-0.5 text-sm font-medium [&>svg]:pointer-events-none [&>svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-action text-action-ink',
        secondary: 'bg-surface-sunken text-ink',
        outline: 'border-edge text-ink',
        success: 'bg-success-surface text-success',
        warning: 'bg-warning-surface text-warning',
        destructive: 'bg-danger-surface text-danger',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: 'badge', variant },
  });
}

export { Badge, badgeVariants };
```

- [ ] **Step 6: Viết lại `progress.tsx` và `separator.tsx`**

`progress.tsx`:

```tsx
'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from 'cn';

function Progress({ className, children, value, ...props }: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root value={value} data-slot="progress" className={cn('flex flex-wrap gap-3', className)} {...props}>
      {children}
      <ProgressTrack>
        <ProgressIndicator />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  );
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn('relative flex h-2 w-full items-center overflow-hidden rounded-full bg-surface-sunken', className)}
      {...props}
    />
  );
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn('h-full bg-action transition-all motion-reduce:transition-none', className)}
      {...props}
    />
  );
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return <ProgressPrimitive.Label data-slot="progress-label" className={cn('text-sm font-medium text-ink', className)} {...props} />;
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      data-slot="progress-value"
      className={cn('ml-auto text-sm tabular-nums text-ink-muted', className)}
      {...props}
    />
  );
}

export { Progress, ProgressTrack, ProgressIndicator, ProgressLabel, ProgressValue };
```

`separator.tsx`:

```tsx
'use client';

import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';
import { cn } from 'cn';

function Separator({ className, orientation = 'horizontal', ...props }: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn('shrink-0 bg-line', orientation === 'vertical' ? 'w-px self-stretch' : 'h-px w-full', className)}
      {...props}
    />
  );
}

export { Separator };
```

- [ ] **Step 7: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- components/ui/primitives`
Expected: PASS.

- [ ] **Step 8: Typecheck, cập nhật baseline, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Run: cập nhật baseline (các file `components/ui/*` biến khỏi baseline), rồi `pnpm --filter @scipal/web test` — Expected: PASS.

```bash
git add frontend/components/ui frontend/theme-baseline.json
git commit -m "feat(web): rebuild UI primitives on theme tokens for Tailwind 3"
```

---

### Task 9: Primitive mới — Input, Field, Alert, EmptyState, Table

**Files:**
- Create: `frontend/components/ui/input.tsx`, `field.tsx`, `alert.tsx`, `empty-state.tsx`, `table.tsx`
- Test: `frontend/components/ui/new-primitives.test.tsx`

**Interfaces:**
- Produces:
  - `Input(props: React.ComponentProps<'input'>)`
  - `Field(props: { id: string; label: ReactNode; description?: ReactNode; error?: ReactNode; children: (control: FieldControlProps) => ReactNode })`, `type FieldControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }`
  - `Alert(props: { tone?: 'info' | 'success' | 'warning' | 'danger'; title?: ReactNode; children: ReactNode; className?: string })`
  - `EmptyState(props: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string })`
  - `Table(props: { label: string; className?: string; children: ReactNode })`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (bọc `thead`, `tbody`, `tr`, `th scope="col"`, `td`)

- [ ] **Step 1: Viết test thất bại**

`frontend/components/ui/new-primitives.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Alert } from './alert';
import { EmptyState } from './empty-state';
import { Field } from './field';
import { Input } from './input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './table';

describe('Field + Input', () => {
  it('links description and error to the control and marks it invalid', () => {
    const html = renderToStaticMarkup(
      <Field id="class-code" label="Mã lớp" description="6 ký tự" error="Mã lớp không tồn tại">
        {(control) => <Input {...control} />}
      </Field>,
    );
    expect(html).toContain('for="class-code"');
    expect(html).toContain('id="class-code"');
    expect(html).toContain('aria-describedby="class-code-description class-code-error"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('id="class-code-error"');
    expect(html).toContain('text-danger');
    expect(countRawColors(html).total).toBe(0);
  });

  it('omits aria attributes when there is nothing to describe', () => {
    const html = renderToStaticMarkup(<Field id="name" label="Tên">{(control) => <Input {...control} />}</Field>);
    expect(html).not.toContain('aria-describedby');
    expect(html).not.toContain('aria-invalid');
  });

  it('gives the input a 44px target and an edge border', () => {
    const html = renderToStaticMarkup(<Input id="x" />);
    expect(html).toContain('min-h-11');
    expect(html).toContain('border-edge');
  });
});

describe('Alert', () => {
  it('announces danger immediately and other tones politely', () => {
    expect(renderToStaticMarkup(<Alert tone="danger">Không lưu được bài.</Alert>)).toContain('role="alert"');
    expect(renderToStaticMarkup(<Alert tone="success">Đã lưu bài.</Alert>)).toContain('role="status"');
  });

  it.each(['info', 'success', 'warning', 'danger'] as const)('%s has an icon and tokens only', (tone) => {
    const html = renderToStaticMarkup(<Alert tone={tone} title="Tiêu đề">Nội dung</Alert>);
    expect(html).toContain('<svg');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('EmptyState', () => {
  it('shows the title, description and next action', () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Chưa có lớp nào" description="Tạo lớp để mời học sinh." action={<a href="/teacher/classes">Tạo lớp</a>} />,
    );
    expect(html).toContain('Chưa có lớp nào');
    expect(html).toContain('Tạo lớp');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('Table', () => {
  it('is a labelled, keyboard-scrollable region with column headers', () => {
    const html = renderToStaticMarkup(
      <Table label="Danh sách học sinh">
        <TableHeader>
          <TableRow>
            <TableHead>Tên</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>An</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Danh sách học sinh"');
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('overflow-x-auto');
    expect(html).toContain('scope="col"');
    expect(countRawColors(html).total).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- new-primitives`
Expected: FAIL — `Failed to resolve import "./alert"`.

- [ ] **Step 3: Viết `input.tsx` và `field.tsx`**

`input.tsx`:

```tsx
import * as React from 'react';
import { cn } from 'cn';

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

`field.tsx`:

```tsx
import type { ReactNode } from 'react';

export type FieldControlProps = { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true };

interface FieldProps {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  children: (control: FieldControlProps) => ReactNode;
}

function Field({ id, label, description, error, children }: FieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;
  const control: FieldControlProps = {
    id,
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(error ? { 'aria-invalid': true as const } : {}),
  };

  return (
    <div data-slot="field" className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {description ? (
        <p id={descriptionId} className="text-sm text-ink-muted">
          {description}
        </p>
      ) : null}
      {children(control)}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export { Field };
```

- [ ] **Step 4: Viết `alert.tsx` và `empty-state.tsx`**

`alert.tsx`:

```tsx
import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from 'cn';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const TONES: Record<AlertTone, { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: 'border-edge bg-surface-sunken text-ink' },
  success: { icon: CircleCheck, className: 'border-transparent bg-success-surface text-success' },
  warning: { icon: TriangleAlert, className: 'border-transparent bg-warning-surface text-warning' },
  danger: { icon: CircleAlert, className: 'border-transparent bg-danger-surface text-danger' },
};

interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}

function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { icon: Icon, className: toneClass } = TONES[tone];
  return (
    <div
      data-slot="alert"
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-lg border p-4 text-sm', toneClass, className)}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div>{children}</div>
      </div>
    </div>
  );
}

export { Alert };
```

`empty-state.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from 'cn';

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <section
      data-slot="empty-state"
      className={cn('flex flex-col items-start gap-3 rounded-xl border border-dashed border-edge bg-surface p-6', className)}
    >
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="max-w-prose text-sm text-ink-muted">{description}</p> : null}
      {action ? <div>{action}</div> : null}
    </section>
  );
}

export { EmptyState };
```

- [ ] **Step 5: Viết `table.tsx`**

```tsx
import * as React from 'react';
import { cn } from 'cn';

function Table({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className="overflow-x-auto rounded-xl border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <table data-slot="table" className={cn('w-full border-collapse text-left text-sm text-ink', className)}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead className={cn('sticky top-0 bg-surface-sunken', className)} {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody className={cn('[&>tr:last-child]:border-0', className)} {...props} />;
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr className={cn('border-b border-line focus-within:bg-surface-sunken', className)} {...props} />;
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return <th scope="col" className={cn('whitespace-nowrap px-4 py-3 font-semibold text-ink-muted', className)} {...props} />;
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td className={cn('px-4 py-3', className)} {...props} />;
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

- [ ] **Step 6: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- new-primitives`
Expected: PASS.

- [ ] **Step 7: Typecheck, test toàn bộ, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7.
Run: `pnpm --filter @scipal/web test` — Expected: PASS (file mới không vào baseline vì 0 màu thô).

```bash
git add frontend/components/ui
git commit -m "feat(web): add Input, Field, Alert, EmptyState and Table primitives"
```

---

### Task 10: Trang `/dev/theme`, tài liệu, nghiệm thu

**Files:**
- Create: `frontend/app/dev/theme/page.tsx`
- Modify: `.agents/rules/02-domain-rules.md` (§2)
- Modify: `DESIGN.md`
- Modify: `PROJECT_STATE.md`

**Interfaces:**
- Consumes: mọi primitive Task 8–9; `THEME_LEVELS`, `THEME_MODES` từ `@scipal/ui`.

- [ ] **Step 1: Trang xem nhanh**

Xem cách `frontend/app/dev/landing-showcase/page.tsx` chặn production (nó gọi `notFound()` khi không phải môi trường phát triển) và dùng đúng điều kiện đó.

`frontend/app/dev/theme/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { THEME_LEVELS, THEME_MODES } from '@scipal/ui';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ThemePreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
      {THEME_LEVELS.map((level) =>
        THEME_MODES.map((mode) => (
          <section
            key={`${level}-${mode}`}
            data-level={level}
            data-theme={mode}
            aria-label={`${level} ${mode}`}
            className="flex flex-col gap-4 rounded-xl bg-paper p-6 text-ink"
          >
            <h2 className="text-xl font-semibold">
              {level} / {mode}
            </h2>
            <div className="flex flex-wrap gap-3">
              <Button>Lưu thay đổi</Button>
              <Button variant="outline">Xem trước</Button>
              <Button variant="secondary">Nháp</Button>
              <Button variant="ghost">Bỏ qua</Button>
              <Button variant="destructive">Xoá bài</Button>
              <Button variant="link">Mở từ điển</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>Đang học</Badge>
              <Badge variant="secondary">Lớp 10</Badge>
              <Badge variant="outline">Tin học</Badge>
              <Badge variant="success">Đã hoàn thành</Badge>
              <Badge variant="warning">Đang biên soạn</Badge>
              <Badge variant="destructive">Bị từ chối</Badge>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Bài 3. Thuật toán tìm kiếm</CardTitle>
                  <CardDescription>Tìm kiếm tuần tự và nhị phân</CardDescription>
                </CardHeader>
                <CardContent>
                  <Progress value={40} aria-label="Tiến độ bài học" />
                </CardContent>
              </Card>
              <Field id={`code-${level}-${mode}`} label="Mã lớp" description="6 ký tự" error="Mã lớp không tồn tại">
                {(control) => <Input {...control} placeholder="VD: 4KQ9TZ" />}
              </Field>
            </div>
            <Alert tone="danger" title="Không lưu được bài">
              Kiểm tra kết nối rồi bấm Lưu thay đổi lần nữa.
            </Alert>
            <Alert tone="success">Đã lưu bài.</Alert>
            <EmptyState title="Chưa có lớp nào" description="Tạo lớp để mời học sinh bằng mã 6 ký tự." action={<Button>Tạo lớp</Button>} />
            <Table label="Danh sách học sinh">
              <TableHeader>
                <TableRow>
                  <TableHead>Tên</TableHead>
                  <TableHead>XP</TableHead>
                  <TableHead>Bài đã học</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Nguyễn Minh An</TableCell>
                  <TableCell>1 240</TableCell>
                  <TableCell>12</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </section>
        )),
      )}
    </main>
  );
}
```

- [ ] **Step 2: Kiểm tra trực quan**

`pnpm --filter @scipal/web dev`, mở `http://localhost:3000/dev/theme`:
- 8 section (4 cấp × sáng/tối), chữ đọc rõ, nút có viền focus khi Tab qua.
- Thu hẹp còn 375px: không cuộn ngang trang; bảng cuộn ngang trong khung của nó.
- Chụp ảnh từng section; ghi vào `PROJECT_STATE.md` ở Step 4.

- [ ] **Step 3: Cập nhật quy tắc và DESIGN.md**

`.agents/rules/02-domain-rules.md` §2, thay gạch đầu dòng "Màu thương hiệu" bằng:

```markdown
- **Màu thương hiệu (Brand Color)**: `SCIPAL_GREEN` (`#16a34a`) chỉ dùng cho logo cỏ 4 lá. Nền navbar dùng token `nav` theo cấp học (bảng trung tính: `#15803D`).
- **Màu giao diện chỉ qua token**: trong `.tsx` dùng class ngữ nghĩa (`bg-paper`, `text-ink`, `border-edge`, `bg-action`…) từ `packages/ui/src/theme/palettes.ts`; không dùng class màu Tailwind thô, mã hex hay `dark:`. Test `frontend/lib/theme/rawColors.test.ts` chặn tái phạm.
- **Cấp học và chế độ màu** gắn trên `[data-app-shell]` (root layout) hoặc `LevelScope`, không bao giờ trên `:root`/`<html>`. Nội dung portal phải gắn vào trong `[data-app-shell]`.
```

`DESIGN.md`:
- Dòng "Scope:" đổi thành: `Scope: toàn bộ web frontend. Nguồn giá trị màu: packages/ui/src/theme/palettes.ts; spec: docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md.`
- Mục "## 2. Color": thêm lên đầu một đoạn nêu 8 bảng màu, vai token (spec §3.2), quy tắc accent chỉ là "nhãn vở", đỏ chỉ cho lỗi/sửa quiz, hoạ tiết chỉ trên `paper`; ghi các bảng `--landing-*`/`--gate-*` hiện có là "sẽ chuyển thành bí danh ở giai đoạn 2".
- Mục "### Font Stack": đổi Body từ Inter sang Be Vietnam Pro; JetBrains Mono "chỉ cho khối code".
- Thêm mục "Portal": menu/popover phải gắn vào `[data-app-shell]` để nhận token.

- [ ] **Step 4: Cập nhật `PROJECT_STATE.md`**

Thêm vào đầu "Recent Decisions":

```markdown
- **26/09 — Giao diện theo cấp học toàn app (giai đoạn 0–1):** Token theo cấp (Tiểu học mực tím, THCS bút bi xanh, THPT bảng xanh, trung tính) sinh từ `packages/ui/src/theme/palettes.ts`, gắn trên `[data-app-shell]`; script boot chống nháy; navbar dùng token `nav`, bỏ hoạ tiết cỏ bốn lá; hoạ tiết đồ dùng học tập mẫu; bỏ Inter; `--accent` không còn trên `:root`. Dark mode có sẵn nhưng tắt bằng `DARK_MODE_ENABLED` tới hết giai đoạn 5. Primitive `components/ui` viết lại cho Tailwind 3 (bản cũ dùng cú pháp v4). Test ratchet màu thô với `frontend/theme-baseline.json`. Tạm thời: landing Tiểu học vẫn bảng nâu cũ dưới navbar tím đến giai đoạn 2.
```

Trong "Known Issues / Blockers", xoá câu "`frontend/app/globals.css` còn đặt `--accent` trên `:root` trái quy tắc dự án." Trong "Next Steps", thay mục 4 bằng: "Giai đoạn 2–5 của spec giao diện theo cấp học (mỗi giai đoạn một plan riêng)."

- [ ] **Step 5: Nghiệm thu toàn workspace**

Run: `pnpm turbo typecheck` — Expected: 7/7, 0 lỗi.
Run: `pnpm turbo test` — Expected: toàn bộ PASS.
Run: `pnpm turbo build` — Expected: build thành công; `/dev/theme` có trong danh sách route.
Run (Grep): `SERVICE_ROLE` trong `frontend/`, `mobile/`, `packages/` — Expected: 0 kết quả.
Run (Grep): `--accent:` trong `frontend/app/globals.css` — Expected: 0 kết quả.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/dev/theme .agents/rules/02-domain-rules.md DESIGN.md PROJECT_STATE.md
git commit -m "docs: level theming foundation rules, design system and project state"
```
