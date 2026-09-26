# SciPal Web Design System

Scope: toàn bộ web frontend. Nguồn giá trị màu: `packages/ui/src/theme/palettes.ts`; spec: `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md`.

## 1. Atmosphere & Identity

SciPal should feel like a warm, modern field notebook for curious Vietnamese learners: clear enough to start studying immediately, with enough material depth to invite exploration. The signature is a real learning question drawn through a bilingual notebook diagram; paper, annotations, and the marked midpoint explain the idea instead of acting as decoration. A level choice is the front door to that notebook, and every level must make its actual learning status plain.

## 2. Color

### App-wide level theme

- Tám bảng màu: Tiểu học (hộp sáp màu: navbar vàng hướng dương, hành động hồng mâm xôi), THCS (bút bi xanh điện, dạ quang xanh ngọc), THPT (bảng xanh ngọc lục bảo) và trung tính (chưa rõ cấp), mỗi bảng có sáng và tối. Giá trị nằm ở `packages/ui/src/theme/palettes.ts`, CSS sinh bằng `renderThemeCss()` và in trong root layout.
- Vai token (spec §3.2): `paper`, `surface`, `surface-sunken`, `ink`, `ink-muted`, `line` (chỉ trang trí), `edge` (viền điều khiển ≥ 3:1), `action`, `action-hover`, `action-ink`, `focus`, `nav`, `nav-ink`, `danger`/`success`/`warning` và `*-surface`, `pattern-ink`, `pattern-opacity`. Tailwind: `bg-paper`, `text-ink`, `border-edge`…
- Accent môn (`--accent`, `--accent-ink`) chỉ là "nhãn vở": nhãn, icon, dải lề, thanh tiến độ; không tô nền trang, thẻ hay nút chính.
- Đỏ (`danger`) chỉ cho lỗi và phần sửa đáp án quiz.
- Hoạ tiết đồ dùng học tập chỉ hiện trên `paper`; tắt bằng `data-pattern="off"` (phòng thi), khi `prefers-contrast: more` và khi in.
- Chế độ tối có sẵn nhưng tắt bằng `DARK_MODE_ENABLED` tới hết giai đoạn 5.
- Bảng `--landing-*` theo cấp đã là bí danh trỏ về token chung; `--gate-*` (cổng chọn cấp, trung tính) chuyển ở giai đoạn 2.

### Portal

Menu, popover hay dialog render qua portal phải gắn vào trong `[data-app-shell]` để nhận token; gắn thẳng vào `body` sẽ mất màu.

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

The first-visit level choice uses a neutral paper palette before the student enters a level-specific landing. Keep these variables scoped to the gate root:

| Token | Value | Usage |
|---|---:|---|
| `--gate-paper` | `#F7F7F3` | Page canvas |
| `--gate-surface` | `#FFFFFF` | Choice sheet and options |
| `--gate-ink` | `#202922` | Main text |
| `--gate-muted` | `#49574E` | Supporting text |
| `--gate-line` | `#D8DED8` | Rules and card boundaries |
| `--gate-action` | `#275B42` | Selection, focus context, and active status |
| `--gate-action-hover` | `#1B4934` | Hover and pressed feedback |
| `--gate-focus` | `#8A3E1F` | Keyboard focus outline |
| `--gate-action-soft` | `#EDF4EE` | Current-level marker |
| `--gate-hover-surface` | `#FBFCF9` | Choice hover surface |
| `--gate-pressed-surface` | `#F1F5F1` | Choice pressed surface |
| `--gate-error-ink` | `#96352D` | Save and catalog errors |
| `--gate-error-surface` | `#FFF1EE` | Error message surface |
| `--gate-error-line` | `#E8B8AF` | Error message border |

Do not infer a level from this neutral palette. The selection remains a native form action with visible current, upcoming, available, error, account-sync, and device-only states. Use the shared `scipal-lang` preference and a visible VI/EN switch on both the gate and landing hero notes; render one selected language at a time instead of duplicating each paragraph in both languages. On the public landing, hide the duplicate switch in the global navbar so the page presents one prominent control.

The gate stylesheet consumes the shared 4px `--space-*` scale and type scale through component-scoped aliases. Keep radii, focus size, control targets, panel width, shadow, and typography details as named gate tokens alongside the palette. English-specific typography uses the gate's inherited `lang="en"` state rather than selectors on translated child spans.

| Alias | Source or use |
|---|---|
| `--gate-page-gutter`, `--gate-sheet-padding`, `--gate-section-gap`, `--gate-form-gap` | Responsive combinations of the shared spacing scale |
| `--gate-type-display`, `--gate-type-h3`, `--gate-type-lead`, `--gate-type-body`, `--gate-type-small` | Display, H3, lead, body, and small text scale |
| `--gate-font-display`, `--gate-font-body`, `--gate-font-measure` | Be Vietnam Pro, Inter, and JetBrains Mono font roles |
| `--gate-control-target` | 44px minimum interactive target |
| `--gate-radius-*`, `--gate-outline-width`, `--gate-shadow-sheet` | Component geometry and focus/surface treatments |

## 3. Typography

### Scale

| Level | Size | Weight | Line height | Usage |
|---|---|---:|---:|---|
| Display | `clamp(2.45rem, 5.6vw, 5.5rem)` | 700–800 | 1.04–1.1 | Landing and gate heading |
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
- Reduced motion retains all content; errors name the problem and the next action.
- No account preference leaks between users; no level is inferred when neither account nor device has a valid choice.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| Legacy global `--accent` is assigned at the root | `frontend/app/globals.css` | Existing app-wide issue is outside this landing/Profile scope; new level and subject styles do not depend on it. | Project design-system follow-up; remove only in a separately scoped theme task. |
