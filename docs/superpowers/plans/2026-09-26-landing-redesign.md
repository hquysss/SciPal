# Landing & Level Gate Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the level gate (CSS 3D notebooks, one-line copy) and the landing (WebGL desk hero, few words, interactive cards, Tutor section), and switch the EN/VI toggle to flags.

**Architecture:** Pure, unit-tested modules decide everything (scene capability, scene objects per level, token colors); a thin `three` renderer consumes them inside a lazily loaded client chunk behind a static SVG fallback. Gate and landing stay server/client components driven by the existing level/session logic; only presentation changes.

**Tech Stack:** Next.js 15, React 19, CSS Modules, theme tokens from `@scipal/ui`, `three` (new), vitest (`environment: 'node'`, tests render with `react-dom/server` `renderToStaticMarkup` and mock `@scipal/hooks`).

**Spec:** `docs/superpowers/specs/2026-09-26-landing-redesign-design.md`

## Global Constraints

- Bilingual: every visible string goes through `t({ en, vi })` from `useLanguage()` (`@scipal/hooks`).
- No raw colors in `.tsx` under `app/`, `components/`, `features/`: `frontend/lib/theme/rawColors.test.ts` ratchet against `frontend/theme-baseline.json` may only go down. CSS Modules use `var(--token)` only; `--gate-*` color vars become aliases of shared tokens.
- Never set `data-theme`, `data-level`, `.dark` or color vars on `<html>` (`rootTheme.test.ts`). `--accent` never on `:root`.
- Only new runtime dependency: `three` (+ dev `@types/three`). No R3F, drei, or animation library.
- `three` must not be in the initial JS of `/`; scene chunk target ≤ 160 KB gzip.
- Scene disabled when: `prefers-reduced-motion: reduce`, `navigator.connection.saveData`, `deviceMemory ≤ 2`, `hardwareConcurrency ≤ 2`, or no WebGL context.
- `setPixelRatio(Math.min(devicePixelRatio, 1.5))`; pause when hero off-screen or `document.hidden`; dispose on unmount; `webglcontextlost` → back to SVG.
- Touch targets ≥ 44 px; visible `outline-focus`; all motion off under `prefers-reduced-motion`.
- No "Sắp ra mắt" / "Coming soon" / "Chưa có bài học" / "đang chuẩn bị" copy on gate or landing; "Đang biên soạn" only via `SubjectGrid`.
- Flags are SVG files in `frontend/public/flags/` (not emoji), each < 2 KB, no `<script>`, `href`, `on*`.
- Exact hero copy (spec §3):
  - primary: "Bắt đầu từ" / "điều em tò mò." — "Start with" / "what you wonder."
  - lower_secondary: "Từng câu hỏi" / "mở rộng hiểu biết." — "Every question" / "grows understanding."
  - upper_secondary: "Hiểu khoa học" / "từ câu hỏi đầu tiên." — "Make sense of science," / "one question at a time."
  - subline (all): "Bài học song ngữ, theo đúng chương trình của em." — "Bilingual lessons that follow your curriculum."
- Commands (from `frontend/`): `pnpm test`, `pnpm typecheck`, `pnpm build`. Commit messages end with the session's attribution lines.

## Review Focus

1. **Double activation on a gate notebook** (double-click, Enter spam during the 400 ms flip) — expect exactly one `onGuestSelect` call / one POST. Test in Task 2 (`resolveGateSelection` guard).
2. **Account submit must not wait on the animation** — the POST form submits natively on click; the flip is cosmetic. Test in Task 2 (account buttons are `type="submit"`, no `onClick` delaying).
3. **WebGL context lost or scene throws on init** — hero falls back to the SVG and stays usable. Test in Task 4 (`HeroStage` state reducer: `failed` → fallback).
4. **Changing level ("Đổi cấp") or language while the scene runs** — scene objects follow the new level without leaking the old renderer. Test in Task 3 (`sceneObjects` keyed purely by level) and Task 4 (`createHeroScene` returns `dispose`, called on level change).
5. **Long English strings at 375 px** — no horizontal page scroll on gate or landing. Checked in Task 7 QA (`document.documentElement.scrollWidth <= innerWidth` for every level × lang).

---

### Task 1: Flag language toggle

**Files:**
- Create: `frontend/public/flags/vn.svg`, `frontend/public/flags/gb.svg`
- Create: `frontend/components/nav/FlagIcon.tsx`
- Modify: `frontend/components/nav/LanguageToggle.tsx`
- Test: `frontend/components/nav/LanguageToggle.test.tsx`, `frontend/lib/theme/flags.test.ts`

**Interfaces:**
- Produces: `FlagIcon({ lang }: { lang: 'en' | 'vi' }): JSX.Element` — `<img src="/flags/vn.svg"|"/flags/gb.svg" alt="" width={20} height={14} />` with rounded corners. Reused by Task 5.

- [ ] **Step 1: Write failing tests**

`LanguageToggle.test.tsx` (mock `@scipal/hooks` with `lang`, `setLang`, `t` like `ThemeToggle.test.tsx`):
```tsx
it('shows flags with spoken names instead of EN/VI text', () => {
  const html = renderToStaticMarkup(<LanguageToggle />);
  expect(html).toContain('src="/flags/vn.svg"');
  expect(html).toContain('src="/flags/gb.svg"');
  expect(html).toContain('aria-label="Tiếng Việt"');
  expect(html).toContain('aria-label="English"');
  expect(html).not.toMatch(/>\s*(EN|VI)\s*</);
  expect(html).toMatch(/aria-label="Tiếng Việt"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Tiếng Việt"/);
});
it('uses only theme tokens', () => {
  expect(countRawColors(renderToStaticMarkup(<LanguageToggle />)).total).toBe(0);
});
```
`flags.test.ts`: for each file in `public/flags/`: size < 2048 bytes, contains `<svg`, no `<script`, `href`, ` on[a-z]+=`.

- [ ] **Step 2: Run** `pnpm vitest run components/nav/LanguageToggle.test.tsx lib/theme/flags.test.ts` — expect FAIL (files/labels missing).

- [ ] **Step 3: Implement** the two SVGs (VN: red field, yellow 5-point star, `viewBox="0 0 30 20"`; GB: Union Jack, `viewBox="0 0 60 30"`, `preserveAspectRatio="none"` not needed — keep 3:2 box via `object-fit: cover` class), `FlagIcon`, and swap the button text for `<FlagIcon>` + `aria-label` (keep `title`, `aria-pressed`, `navToggleButton`). Remove the `Languages` icon.

- [ ] **Step 4: Run** the same command — expect PASS; then `pnpm test` — all green.

- [ ] **Step 5: Commit** `feat(web): language toggle shows VN/GB flags`

---

### Task 2: Level gate — CSS 3D notebooks

**Files:**
- Modify (rewrite): `frontend/features/landing/LevelGate.tsx`, `frontend/features/landing/level-gate.module.css`
- Create: `frontend/features/landing/gateSelection.ts`
- Modify: `frontend/features/landing/GuestLandingFlow.tsx`, `frontend/app/page.tsx`, `frontend/app/dev/landing-level-gate/page.tsx` (drop `informatics`/`status` param)
- Test: `frontend/features/landing/LevelGate.test.tsx`, `frontend/features/landing/gateSelection.test.ts`

**Interfaces:**
- Produces: `LevelGateProps = { currentLevel: EducationLevel | null; isAuthenticated: boolean; saveError: boolean; onGuestSelect?: (level: EducationLevel) => void }` (no `informatics`).
- Produces: `GATE_FLIP_MS = 400`; `createGateSelection(opts: { reducedMotion: boolean; schedule: (fn: () => void, ms: number) => void; onSelect: (l: EducationLevel) => void }): { select(level: EducationLevel): void; pending(): EducationLevel | null }` — first `select` wins; later calls are ignored; calls `onSelect` immediately when `reducedMotion`, else after `GATE_FLIP_MS`.

- [ ] **Step 1: Write failing tests**

`gateSelection.test.ts`:
```ts
it('calls onSelect once after the flip even when clicked repeatedly', () => {
  const calls: EducationLevel[] = []; const timers: (() => void)[] = [];
  const s = createGateSelection({ reducedMotion: false, schedule: (fn, ms) => { expect(ms).toBe(400); timers.push(fn); }, onSelect: (l) => calls.push(l) });
  s.select('primary'); s.select('upper_secondary'); s.select('primary');
  expect(calls).toEqual([]); expect(s.pending()).toBe('primary');
  timers.forEach((t) => t()); expect(calls).toEqual(['primary']);
});
it('selects immediately with reduced motion', () => { /* schedule never called, calls === ['lower_secondary'] */ });
```
`LevelGate.test.tsx` (mock hooks, `lang` switchable):
```tsx
it('is one heading, three level buttons in a POST form, no status labels', () => {
  const html = renderToStaticMarkup(<LevelGate currentLevel={null} isAuthenticated={false} saveError={false} />);
  expect(html).toMatch(/<h1[^>]*>Bạn học lớp mấy\?<\/h1>/);
  expect(html).toContain('method="post"'); expect(html).toContain('action="/api/preferences/education-level"');
  for (const v of ['primary', 'lower_secondary', 'upper_secondary']) expect(html).toContain(`value="${v}"`);
  expect(html).not.toMatch(/Sắp ra mắt|Sẵn sàng|Chưa có bài học|Tải lại trạng thái/);
  expect(html).toContain('Đổi được sau trong Hồ sơ.');
});
it('account buttons submit natively with scope=account', () => { /* 3× type="submit", name="scope" value="account" */ });
it('guest buttons are type=button', () => { /* 3× type="button" */ });
it('marks the current level and shows save errors', () => { /* currentLevel='lower_secondary' → one data-current="true" + "Đang chọn"; saveError → role="alert" */ });
it('each notebook carries its level scope for token colors', () => { /* data-level="primary" etc. on each book */ });
it('switches to English', () => { /* "What grade are you in?", "You can change this later in Profile." */ });
```

- [ ] **Step 2: Run** `pnpm vitest run features/landing/LevelGate.test.tsx features/landing/gateSelection.test.ts` — expect FAIL.

- [ ] **Step 3: Implement** `gateSelection.ts` per the interface.

- [ ] **Step 4: Rewrite `LevelGate.tsx`**: brand row kept; `h1` one line; `<form>` with `<fieldset>` + `sr-only` legend "Chọn một cấp học" and `aria-describedby` to an `sr-only` storage note (existing account/tab wording); three `<button>`s each wrapped in `LevelScope level={value}` (`@scipal/ui`) so the cover reads that level's `--nav`/`--nav-ink`/`--pattern-url`; cover shows name (large) + grades (small). Guest click → `createGateSelection(...).select(level)` (reduced motion via `matchMedia`, schedule via `setTimeout`) and sets `data-opening="true"` on the chosen book; account click → native submit plus `data-opening`. Footer line as tested.

- [ ] **Step 5: Rewrite `level-gate.module.css`**: `--gate-*` color vars alias shared tokens (`--gate-paper: var(--paper)`, `--gate-ink: var(--ink)`, `--gate-action: var(--action)`, `--gate-focus: var(--focus)`, `--gate-error-*: var(--danger*)`…; no hex). Books: `perspective: 1200px`, book `transform-style: preserve-3d` with a spine and page-edge pseudo-elements; `@media (pointer: fine)` tilt via `--tilt-x/--tilt-y` set from `pointermove` (max 8°), hover/`:focus-visible` lift + cover `rotateY(-20deg)`; `[data-opening]` cover `rotateY(-160deg)` and page scale-up over 400 ms; `@media (pointer: coarse), (max-width: 640px)` books stacked vertically lying flat, `:active` press; `@media (prefers-reduced-motion: reduce)` no transforms/transitions. Pattern on cover: `mask-image: var(--pattern-url)` with `--nav-ink` at low opacity. Min height 44 px, `outline: 3px solid var(--focus)` on focus.

- [ ] **Step 6: Update callers**: remove `informatics` prop from `LevelGate` uses in `app/page.tsx`, `GuestLandingFlow.tsx`, dev showcase.

- [ ] **Step 7: Run** `pnpm test && pnpm typecheck` — expect PASS; baseline entry for `features/landing/*` not increased.

- [ ] **Step 8: Commit** `feat(web): level gate as 3D notebooks with one-line copy`

---

### Task 3: Scene data and capability modules (pure)

**Files:**
- Create: `frontend/features/landing/hero/canRunHeroScene.ts`, `hero/sceneObjects.ts`, `hero/readSceneColors.ts`
- Test: matching `*.test.ts` beside each

**Interfaces:**
- Produces:
  - `interface SceneEnv { reducedMotion: boolean; saveData?: boolean; deviceMemory?: number; hardwareConcurrency?: number; hasWebGL: () => boolean }`
  - `canRunHeroScene(env: SceneEnv): boolean`
  - `readSceneEnv(win: Window): SceneEnv` (thin browser adapter; not unit-tested beyond typecheck)
  - `type SceneColorRole = 'paper' | 'surface' | 'ink' | 'line' | 'nav' | 'navInk' | 'action'`
  - `type SceneShape = 'box' | 'cylinder' | 'cone' | 'sphere' | 'torus'`
  - `interface SceneObject { id: string; parts: { shape: SceneShape; size: [number, number, number]; offset: [number, number, number]; rotation?: [number, number, number]; color: SceneColorRole }[]; position: [number, number, number]; rotationY: number; float: number }`
  - `SCENE_BASE: SceneObject[]` (desk + open notebook) and `SCENE_OBJECTS: Record<EducationLevel, SceneObject[]>` — ids: primary `pencil`, `ruler`, `chalk-box`; lower_secondary `compass`, `set-square`, `calculator`; upper_secondary `flask`, `magnifier`, `keyboard`
  - `type SceneColors = Record<SceneColorRole, string>`; `readSceneColors(style: Pick<CSSStyleDeclaration, 'getPropertyValue'>): SceneColors` — reads `--paper`, `--surface`, `--ink`, `--line`, `--nav`, `--nav-ink`, `--action`; trims; any empty value falls back to `THEME_PALETTES.neutral.light` (`@scipal/ui`).

- [ ] **Step 1: Write failing tests**

```ts
// canRunHeroScene.test.ts
const ok: SceneEnv = { reducedMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8, hasWebGL: () => true };
it('runs on a capable device', () => expect(canRunHeroScene(ok)).toBe(true));
it.each([
  ['reduced motion', { reducedMotion: true }], ['save data', { saveData: true }],
  ['low memory', { deviceMemory: 2 }], ['few cores', { hardwareConcurrency: 2 }], ['no webgl', { hasWebGL: () => false }],
])('stays static with %s', (_, patch) => expect(canRunHeroScene({ ...ok, ...patch })).toBe(false));
it('does not probe WebGL when already disabled', () => { const hasWebGL = vi.fn(() => true); canRunHeroScene({ ...ok, reducedMotion: true, hasWebGL }); expect(hasWebGL).not.toHaveBeenCalled(); });
it('treats unknown memory/cores as capable', () => expect(canRunHeroScene({ reducedMotion: false, hasWebGL: () => true })).toBe(true));

// sceneObjects.test.ts
it('has the level objects from the spec', () => {
  expect(SCENE_OBJECTS.primary.map((o) => o.id)).toEqual(['pencil', 'ruler', 'chalk-box']);
  expect(SCENE_OBJECTS.lower_secondary.map((o) => o.id)).toEqual(['compass', 'set-square', 'calculator']);
  expect(SCENE_OBJECTS.upper_secondary.map((o) => o.id)).toEqual(['flask', 'magnifier', 'keyboard']);
});
it('uses only token color roles and positive sizes', () => { /* every part.color in the 7 roles; every size component > 0 */ });
it('keeps objects off the notebook area', () => { /* every level object |x| >= 1.6 or |z| >= 1.2 so the notebook stays visible */ });

// readSceneColors.test.ts
it('reads token values', () => { /* fake getPropertyValue map → returns trimmed values */ });
it('falls back to neutral palette for missing tokens', () => { /* empty map → equals THEME_PALETTES.neutral.light.paper etc. */ });
```

- [ ] **Step 2: Run** `pnpm vitest run features/landing/hero` — expect FAIL.

- [ ] **Step 3: Implement** the three modules. Scene units: desk top is the XZ plane, notebook centered at origin ~3 × 2.2; objects placed around it within x ∈ [-4, 4], z ∈ [-2.5, 2.5]; `float` is bob amplitude (0.03–0.08).

- [ ] **Step 4: Run** — expect PASS; `pnpm typecheck` PASS.

- [ ] **Step 5: Commit** `feat(web): hero scene data, capability check and token colors`

---

### Task 4: WebGL hero scene with SVG fallback

**Files:**
- Modify: `frontend/package.json` (add `three`, dev `@types/three`; run `pnpm install` from repo root)
- Create: `frontend/features/landing/hero/createHeroScene.ts`, `hero/HeroScene.tsx`, `hero/HeroFallback.tsx`, `hero/HeroStage.tsx`, `hero/heroStageState.ts`, `hero/hero.module.css`
- Test: `hero/heroStageState.test.ts`, `hero/HeroStage.test.tsx`

**Interfaces:**
- Consumes: Task 3 (`canRunHeroScene`, `readSceneEnv`, `SCENE_BASE`, `SCENE_OBJECTS`, `readSceneColors`).
- Produces:
  - `createHeroScene(canvas: HTMLCanvasElement, opts: { level: EducationLevel; colors: SceneColors; onFirstFrame: () => void; onFailure: () => void }): { setActive(active: boolean): void; setPointer(x: number, y: number): void; dispose(): void }` — imports only from `three` named exports (`WebGLRenderer`, `Scene`, `PerspectiveCamera`, `Mesh`, `BoxGeometry`, `CylinderGeometry`, `ConeGeometry`, `SphereGeometry`, `TorusGeometry`, `MeshStandardMaterial`, `HemisphereLight`, `DirectionalLight`, `Group`, `Color`); `flatShading: true`; pixel ratio `Math.min(devicePixelRatio, 1.5)`; `webglcontextlost` → `onFailure`; constructor errors → `onFailure`; `dispose` frees geometries, materials, renderer, listeners, rAF.
  - `type HeroStageState = 'fallback' | 'loading' | 'ready' | 'failed'`; `heroStageReducer(state, event: 'start' | 'first-frame' | 'fail'): HeroStageState` — `fallback→start→loading→first-frame→ready`; `fail` from any state → `failed`; `failed` ignores everything.
  - `HeroStage({ level }: { level: EducationLevel }): JSX.Element` — always renders `HeroFallback` in a fixed `aspect-ratio: 4 / 3` box; after `requestIdleCallback` (fallback `setTimeout(…, 200)`), if `canRunHeroScene(readSceneEnv(window))` and the box is intersecting, dispatches `start` and renders `HeroScene` via `next/dynamic(() => import('./HeroScene'), { ssr: false })`; canvas fades in on `ready`; fallback stays on `failed`.
  - `HeroScene({ level, onFirstFrame, onFailure })` — owns the canvas (`aria-hidden="true"`), calls `createHeroScene`, wires IntersectionObserver + `visibilitychange` → `setActive`, pointer (only `pointer: fine`) → `setPointer`, re-creates on `level` change (dispose old first), disposes on unmount.
  - `HeroFallback({ level })` — inline SVG of the same composition (desk, open notebook, three level objects as flat shapes) using `fill="var(--…)"`/`currentColor` only; `aria-hidden="true"`.

- [ ] **Step 1: Write failing tests**

```ts
// heroStageState.test.ts
it('walks fallback → loading → ready', () => { let s: HeroStageState = 'fallback'; s = heroStageReducer(s, 'start'); expect(s).toBe('loading'); s = heroStageReducer(s, 'first-frame'); expect(s).toBe('ready'); });
it('context loss after ready falls back for good', () => { expect(heroStageReducer('ready', 'fail')).toBe('failed'); expect(heroStageReducer('failed', 'start')).toBe('failed'); });
it('ignores first-frame before start', () => expect(heroStageReducer('fallback', 'first-frame')).toBe('fallback'));
```
```tsx
// HeroStage.test.tsx (mock next/dynamic to return () => null)
it('server-renders the SVG fallback in a fixed box, hidden from assistive tech', () => {
  const html = renderToStaticMarkup(<HeroStage level="upper_secondary" />);
  expect(html).toContain('<svg'); expect(html).toContain('aria-hidden="true"'); expect(html).not.toContain('<canvas');
  expect(countRawColors(html).total).toBe(0);
});
it('fallback differs per level', () => { /* data-level-objects="flask magnifier keyboard" vs primary ids */ });
```

- [ ] **Step 2: Run** `pnpm vitest run features/landing/hero` — expect FAIL.

- [ ] **Step 3: Add dependency**: `pnpm --filter @scipal/web add three && pnpm --filter @scipal/web add -D @types/three`.

- [ ] **Step 4: Implement** `heroStageState.ts`, `HeroFallback.tsx`, `HeroStage.tsx`, `HeroScene.tsx`, `createHeroScene.ts`, `hero.module.css` (box, fade, reduced-motion: canvas never mounts so nothing to disable).

- [ ] **Step 5: Run** `pnpm test && pnpm typecheck` — expect PASS.

- [ ] **Step 6: Commit** `feat(web): lazy WebGL desk hero with SVG fallback`

---

### Task 5: "How it works" cards and Tutor section

**Files:**
- Create: `frontend/features/landing/HowItWorks.tsx`, `frontend/features/landing/TutorSection.tsx`, `frontend/features/landing/sections.module.css`
- Modify: `frontend/features/landing/TutorDemoCard.tsx` (styles move to `sections.module.css`; staggered messages already driven by `isPlaying` — keep, add `data-tilt` pointer tilt on `pointer: fine`)
- Test: `frontend/features/landing/HowItWorks.test.tsx`, `frontend/features/landing/TutorSection.test.tsx`

**Interfaces:**
- Consumes: `FlagIcon` (Task 1).
- Produces: `HowItWorks(): JSX.Element` (section `id="cach-hoc"`, `aria-labelledby`); `BilingualCard({ initial = 'vi' }: { initial?: 'en' | 'vi' })`; `TermCard({ initialFlipped = false }: { initialFlipped?: boolean })`; `TutorSection({ href }: { href?: string })`.

Card copy (exact):
- Ask: label "Hỏi" / "Ask", text "Vì sao bóng ngắn lại?" / "Why do shadows shrink?"
- Bilingual: label "Song ngữ" / "Bilingual", sentences VI "Khi Mặt Trời lên cao, bóng ngắn lại." / EN "As the Sun rises, shadows grow shorter."; two flag buttons with `aria-label` "Tiếng Việt"/"English" and `aria-pressed`; the sentence element carries `lang="vi"|"en"`.
- Term: label "Tra thuật ngữ" / "Look up terms", front "Quang hợp" / "Photosynthesis", back "Cây dùng ánh sáng để tạo chất dinh dưỡng." / "Plants use light to make food."; flip button `aria-expanded`; link "Mở từ điển" / "Open glossary" → `/glossary`.
- Tutor heading "Hỏi bất cứ lúc nào" / "Ask anytime"; button "Thử ngay" / "Try it".

- [ ] **Step 1: Write failing tests**

```tsx
it('shows three cards with short labels', () => { /* "Hỏi", "Song ngữ", "Tra thuật ngữ", id="cach-hoc" */ });
it('bilingual card starts in Vietnamese with VI pressed', () => {
  const html = renderToStaticMarkup(<BilingualCard />);
  expect(html).toContain('lang="vi"'); expect(html).toContain('Khi Mặt Trời lên cao, bóng ngắn lại.');
  expect(html).toMatch(/aria-label="Tiếng Việt"[^>]*aria-pressed="true"|aria-pressed="true"[^>]*aria-label="Tiếng Việt"/);
});
it('bilingual card can start in English', () => { /* initial="en" → lang="en", English sentence, EN pressed */ });
it('term card front and back', () => { /* default aria-expanded="false" + "Quang hợp"; initialFlipped → aria-expanded="true" + definition; href="/glossary" */ });
it('tutor section hides the try button without href', () => { /* no "Thử ngay"; with href="/tutor" → <a href="/tutor">Thử ngay */ });
it('uses only theme tokens', () => { /* countRawColors of HowItWorks + TutorSection markup === 0 */ });
```

- [ ] **Step 2: Run** `pnpm vitest run features/landing/HowItWorks.test.tsx features/landing/TutorSection.test.tsx` — expect FAIL.

- [ ] **Step 3: Implement** components and `sections.module.css` (cards: `perspective`, lift on hover/focus-within, term card `rotateY(180deg)` flip with `backface-visibility: hidden`; reduced motion → swap faces without rotation).

- [ ] **Step 4: Run** `pnpm test` — expect PASS.

- [ ] **Step 5: Commit** `feat(web): interactive how-it-works cards and tutor section`

---

### Task 6: Compose the new landing

**Files:**
- Modify (rewrite): `frontend/features/landing/LandingPage.tsx`, `frontend/features/landing/landing.module.css`
- Delete: `frontend/features/landing/LandingHeroNotes.tsx`, `frontend/features/landing/landing-hero-notes.module.css`
- Modify: `frontend/app/dev/landing-showcase/page.tsx` (props still match), `frontend/theme-baseline.json` (only via `UPDATE_THEME_BASELINE=1` if counts dropped)
- Test: `frontend/features/landing/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `HeroStage` (Task 4), `HowItWorks`, `TutorSection` (Task 5), existing `SubjectGrid`, `DemandPollBanner`.
- Produces: `LandingPageProps` unchanged (`level`, `levelSource`, `catalog`, `informatics`); `levelSource` now only feeds the `sr-only` storage note.

- [ ] **Step 1: Write failing test** (mock `@scipal/hooks`, `next/dynamic`, `SubjectGrid` → `<div data-subject-grid />`, `DemandPollBanner` → `<div data-poll />`, `HeroStage` → `<div data-hero-stage />`)

```tsx
it.each([
  ['primary', 'Bắt đầu từ', 'điều em tò mò.'],
  ['lower_secondary', 'Từng câu hỏi', 'mở rộng hiểu biết.'],
  ['upper_secondary', 'Hiểu khoa học', 'từ câu hỏi đầu tiên.'],
])('hero copy for %s', (level, a, b) => { /* h1 contains a and b; subline; "Xem môn học" href="#mon-hoc"; "Đổi cấp" href="/?chooseLevel=1" */ });
it('sections in order: hero, subjects, how, tutor, final CTA, footer', () => { /* indexOf data-hero-stage < id="mon-hoc" < id="cach-hoc" < "Hỏi bất cứ lúc nào" < "Sẵn sàng chưa?" < <footer */ });
it('no "in preparation" copy at any level and poll on every level', () => { /* for each level: not /đang chuẩn bị|Sắp ra mắt|in development/i; contains data-poll */ });
it('English hero', () => { /* upper_secondary en: "Make sense of science," + "one question at a time." */ });
it('uses only theme tokens', () => { /* countRawColors === 0 */ });
```

- [ ] **Step 2: Run** `pnpm vitest run features/landing/LandingPage.test.tsx` — expect FAIL.

- [ ] **Step 3: Rewrite `LandingPage.tsx`**: keep `applyShellLevel` effect, `#landing-title` focus handling and `data-landing-reveal` observer; hero (level label, two-line `h1`, subline, two actions, `<HeroStage level>`); subjects section (`h2` "Môn học của bạn" / "Your subjects", small "Đổi cấp" link, `SubjectGrid`); `<HowItWorks />`; `<TutorSection />` (no `href`); final CTA ("Sẵn sàng chưa?" / "Ready?", "Bắt đầu học" / "Start learning" → `#mon-hoc`) + `DemandPollBanner` for all levels; existing footer. Remove `DevelopmentPreview`, `levelLabel` stays.

- [ ] **Step 4: Rewrite `landing.module.css`**: drop every class no longer referenced (verify with `grep -o 'styles\.[a-zA-Z]*'` across `features/landing/*.tsx`); reveal adds `translateZ(-40px) rotateX(6deg)` → identity; reduced motion none. Delete the hero-notes files.

- [ ] **Step 5: Run** `pnpm test && pnpm typecheck && pnpm build` — expect PASS; if ratchet reports reductions, run `UPDATE_THEME_BASELINE=1 pnpm vitest run lib/theme/rawColors.test.ts` and include the baseline.

- [ ] **Step 6: Commit** `feat(web): new landing with 3D hero, subjects, cards and tutor`

---

### Task 7: QA, bundle check and docs

**Files:**
- Create: `frontend/scripts/qa-landing.mjs` (Playwright, not part of `pnpm test`)
- Modify: `DESIGN.md` (gate + landing + flags sections), `PROJECT_STATE.md` (Recent Decisions: "cả ba cấp đã ra mắt" replaces "hai cấp nhỏ hiển thị Sắp ra mắt"; flags; landing redesign; gate `--gate-*` debt paid)

- [ ] **Step 1: Write `qa-landing.mjs`**: launches Chromium (`executablePath: '/opt/pw-browsers/chromium'` if needed) against `pnpm build && pnpm start` on `localhost:3000`; for viewport 1280×800 and 375×812 × lang vi/en (set via the flag toggle) × level (click each notebook on `/?chooseLevel=1` as guest): screenshot gate and landing to `$SCRATCHPAD/qa/`, assert `scrollWidth <= innerWidth`, assert no console `Hydration` warnings; with `reducedMotion: 'reduce'` assert no `<canvas>` after 3 s and gate choice navigates without delay; keyboard: Tab to first notebook, Enter → landing shown once.

- [ ] **Step 2: Run** the script — expect all assertions pass; review screenshots.

- [ ] **Step 3: Bundle check**: from `pnpm build` output confirm `/` First Load JS did not grow by more than 10 KB vs `main`, and the chunk containing `three` is separate; `gzip -c <chunk> | wc -c` ≤ 163840.

- [ ] **Step 4: Update docs** as listed.

- [ ] **Step 5: Final run** `pnpm test && pnpm typecheck && pnpm build` from `frontend/` — PASS.

- [ ] **Step 6: Commit** `docs: record landing redesign, flags and gate decisions`
