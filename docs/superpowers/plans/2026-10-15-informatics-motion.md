# Informatics Motion Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `algorithm-sim` and `complexity-sim` move: items that fly when swapped, comparison chips, a three-sort race, a rolling counter, a living operation field and a "how long would a computer take" card.

**Architecture:** DOM blocks positioned by `translateX` and animated with the Web Animations API (guarded, since jsdom and old browsers lack it); CSS keyframes in module files under `prefers-reduced-motion: no-preference`; the complexity canvas gains an optional time layer (`FieldFx`) drawn from per-operation timestamps. Pure functions carry every rule the tests pin.

**Tech Stack:** React 19, Next.js 15, TypeScript, CSS modules, canvas 2D, Web Animations API, vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-15-informatics-motion-design.md`

## Global Constraints
- Theme tokens only (`--accent`, `--success`, `--warning`, `--action`, `--line`, `--ink`, `--ink-muted`, `--surface`); no raw colours in components; `--accent` set only by SubjectProvider.
- Every visible string is bilingual `{ en, vi }`; no pseudocode or code on screen.
- No new dependencies. DOM motion uses `transform`/`opacity` only.
- Every effect is off under reduced motion; `useReducedMotion` comes from `./motion`.
- `Element.prototype.animate` may be missing: always go through `animate()` from `./motion`.
- Durations: quick 140 ms, standard 280 ms, slow 520 ms. Speeds: slow 1100, medium 650, fast 220 ms per step.
- Schema, lessons and existing test expectations stay as they are (`complexity-counter` text, `aria-live="polite"` note, `So sánh`/`Đổi chỗ`).
- Touch targets ≥ 44 px; SVG chart text ≥ 18 units; DOM text ≥ 12 px.
- `pnpm turbo typecheck` passes; tests run with `pnpm --filter @scipal/web test -- <path>`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus
1. Next/Previous clicked quickly during a flight: blocks must end in the right places (inline transform is the truth; running animations are cancelled first). Test in Task 2.
2. Equal values (`[3, 1, 3]`): blocks are keyed by identity, never by value. Tests in Tasks 1 and 2.
3. 32 values at 375 px: no horizontal scroll, chip stays inside the stage. Browser check in Task 6.
4. Pattern or n changed mid-run: timestamps and sparks reset to the new total, no stale indices. Test in Task 5.
5. Theme switched while running: canvas palette re-read, numbers on lit cells readable. Browser check in Task 6.

---

### Task 1: Shared motion helpers and item identity

**Files:**
- Create: `frontend/features/simulations/motion.ts`
- Modify: `historyMap.tsx` (remove `useReducedMotion`, import it), `historyWorld.tsx`, `historyTimeline.tsx`, `complexity.tsx` (import from `./motion`), `engines/algorithm.ts`
- Test: `engines/engines.test.ts`

**Interfaces:**
- Produces: `useReducedMotion(): boolean`; `MOTION = { quick: 140, standard: 280, slow: 520 }`; `EASE = { back, inOut, out }` (CSS strings); `easeOutBack(t: number): number`; `animate(el: Element | null | undefined, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null`; `AlgorithmStep.ids: number[]` with `values[k] === config.values[ids[k]]`.

- [ ] **Step 1: Failing test** in `engines.test.ts`:
```ts
it.each(['bubble-sort', 'selection-sort', 'insertion-sort', 'linear-search', 'binary-search'])('%s keeps every item\'s identity', (name) => {
  const base = [3, 1, 3, 2, 9, 1];
  for (const s of algo(name, base, 2)) {
    expect([...s.ids].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(s.values).toEqual(s.ids.map((i) => base[i]));
  }
});
```
- [ ] **Step 2:** Run `pnpm --filter @scipal/web test -- features/simulations/engines/engines.test.ts` → FAIL (`ids` undefined).
- [ ] **Step 3:** Track `ids` beside `values` in `algorithmSteps`, swap them together; binary search starts from the stable argsort of the input. Create `motion.ts` (move `useReducedMotion` verbatim) and repoint the four imports.
- [ ] **Step 4:** Run the engine tests and `historyMap`/`historyWorld`/`historyTimeline`/`complexity` tests → PASS.
- [ ] **Step 5:** Commit `feat(simulations): shared motion helpers and item identity in algorithm steps`.

### Task 2: Algorithm stage

**Files:**
- Create: `frontend/features/simulations/algorithmStage.tsx`, `algorithm.module.css`, `algorithm.test.tsx`
- Modify: `algorithm.tsx`

**Interfaces:**
- Consumes: Task 1.
- Produces: `compareChip(algorithm: Algorithm, step: AlgorithmStep, target: number): { text: Bilingual; tone: 'act' | 'keep' | 'found' } | null`; `AlgorithmStage(props: { algorithm: Algorithm; step: AlgorithmStep; target: number; stepMs: number; reduced: boolean; lang: Lang; finished: boolean; compact?: boolean })`; `SPEEDS = { slow: 1100, medium: 650, fast: 220 }` exported from `algorithm.tsx`.

Chip text is `"<a> <rel> <b> · <verdict>"`. Pairs and verdicts (vi / en):
| Algorithm | a, b | act | keep | found |
|---|---|---|---|---|
| bubble | left, right | đổi chỗ / swap (a > b) | giữ nguyên / keep | — |
| insertion | left, right | dịch sang trái / shift left (a > b) | đúng chỗ / in place | — |
| selection | candidate, smallest | nhỏ nhất mới / new smallest (a < b) | giữ nhỏ nhất / keep smallest | — |
| linear | item, target (`=` or `≠`) | — | xét tiếp / next | tìm thấy / found |
| binary | middle, target | tìm bên phải / search right (<), tìm bên trái / search left (>) | — | tìm thấy / found |

Stage rules: block width `100/n %`, outer element `transform: translateX(slot*100%)`, inner element carries lift (compared, −10 px), sink (outside binary range, +14 px, opacity .3) and lock (in `done`, success colour, one pop). Two moved blocks fly on arcs (right-mover −28 px, left-mover +10 px; insertion sort lifts the left-mover −28 px and slides the right-mover flat; squash `scaleY(0.94)` at 85%), duration `min(380, stepMs*0.7)`, easing `EASE.inOut`; more than two slide straight in `MOTION.standard`; running animations are cancelled first. Numbers under every block when n ≤ 16, otherwise only on highlighted blocks. Selection pin "nhỏ nhất / smallest" over `compare[0]`; binary "giữa / middle" arrow and range brackets; linear lens over the compared block; found → two rings; not found at the end → one shake; finished sort → wave (delay `i*min(20, 480/n)` ms). Visual stage is `aria-hidden`; an sr-only `<ol aria-label="Dãy giá trị">` keeps the values. View: speed group "Tốc độ / Speed" with Chậm/Slow, Vừa/Medium, Nhanh/Fast (Vừa first pressed); counter chips that bump on change; summary at the last step:
- sort: `Xong: {c} phép so sánh, {s} lần đổi chỗ với {n} số.` / `Done: {c} comparisons and {s} swaps on {n} numbers.`
- found: `Tìm thấy {t} sau {c} lần so sánh.` / `Found {t} after {c} comparisons.`
- missing: `Không có {t}; đã so sánh {c} lần.` / `{t} is not there; {c} comparisons made.`

- [ ] **Step 1: Failing tests** in `algorithm.test.tsx` (jsdom):
  - `compareChip`: bubble `[5,2]` compare `[0,1]` → vi `'5 > 2 · đổi chỗ'`, tone `act`; bubble `[2,9]` → `'2 < 9 · giữ nguyên'`, `keep`; linear `[7]` target 7 → `'7 = 7 · tìm thấy'`, `found`; binary middle 5 target 7 → `'5 < 7 · tìm bên phải'`; a step without `compare` → `null`.
  - Speed group `Tốc độ` has 3 buttons and `Vừa` is pressed.
  - Bubble `[5,2,9]`: Next once → chip `'5 > 2 · đổi chỗ'` on screen; Next until disabled → `'Xong: 3 phép so sánh, 1 lần đổi chỗ với 3 số.'`.
  - Values `[3,1,3]` stepped to the end: every block's transform is `translateX(<slot*100>%)` for its id's slot, and `console.error` was never called (Review Focus 1–2).
  - `Element.prototype.animate` stubbed: two Next clicks call it with motion on; never with reduced motion.
- [ ] **Step 2:** Run `pnpm --filter @scipal/web test -- features/simulations/algorithm.test.tsx` → FAIL (module missing).
- [ ] **Step 3:** Implement `algorithmStage.tsx`, `algorithm.module.css`, and the view changes in `algorithm.tsx`.
- [ ] **Step 4:** Run `algorithm.test.tsx` and `views.test.tsx` → PASS.
- [ ] **Step 5:** Commit `feat(simulations): algorithm stage with flying swaps, comparison chips and speeds`.

### Task 3: Race of the three sorts

**Files:**
- Create: `frontend/features/simulations/algorithmRace.tsx`
- Modify: `algorithm.tsx`, `algorithm.test.tsx`

**Interfaces:**
- Consumes: `AlgorithmStage`, `SPEEDS` (Task 2).
- Produces: `RACE_ALGORITHMS`; `raceRanks(lengths: readonly number[]): number[]` (rank = 1 + lanes with strictly fewer steps); `AlgorithmRace(props: { values: number[]; target: number; stepMs: number; reduced: boolean; lang: Lang })`.

Toggle "Đua 3 cách sắp xếp / Race the three sorts" (`aria-pressed`), shown only for sorts. Lanes are `role="group"` named by the algorithm; one shared tick advances every lane by one step per `stepMs`; Play/Pause ("Chạy"/"Tạm dừng") and Restart ("Làm lại"). A finished lane shows `Hạng {r} · {len} bước` / `Place {r} · {len} steps` and its comparisons and swaps.

- [ ] **Step 1: Failing tests:** `raceRanks([12, 20, 12])` → `[1, 3, 1]`; `raceRanks([5, 6, 7])` → `[1, 2, 3]`. With fake timers, `[1,2,3,5,4]`: toggle the race, Play, advance 13 × 650 ms → the "Sắp xếp chèn" lane shows `Hạng 1 · 7 bước`, bubble and selection show `Hạng 2 · 13 bước`. A search config has no race toggle.
- [ ] **Step 2:** Run `algorithm.test.tsx` → FAIL.
- [ ] **Step 3:** Implement `algorithmRace.tsx` and the toggle.
- [ ] **Step 4:** Run `algorithm.test.tsx` and `views.test.tsx` → PASS.
- [ ] **Step 5:** Commit `feat(simulations): race the three sorts on the same list`.

### Task 4: Complexity counter, time card, captions and chart

**Files:**
- Create: `frontend/features/simulations/odometer.tsx`, `complexityTime.tsx`
- Modify: `complexity.tsx`, `complexityChart.tsx`, `complexityField.tsx` (caption only), `complexity.module.css`, `complexity.test.tsx`

**Interfaces:**
- Produces: `Odometer(props: { value: number; lang: Lang; reduced: boolean })` (digit columns `translateY(-<d>em)`, `aria-hidden`); `OPS_PER_SECOND = 1e9`; `TIME_N = [10, 20, 50, 100]`; `humanDuration(seconds: number, lang: Lang): string`; `timeAnchor(seconds: number): 'blink' | 'lifetime' | 'earth' | 'universe' | null` (≤ 0.1 s; ≥ 70, ≥ 4.54e9, ≥ 1.38e10 years); `TimeCard(props: { pattern: ComplexityPattern; lang: Lang })`; `fieldCaption(pattern, n, ops, shown, lang): string | null`; `PermutationTiles(props: { arrangement: number[]; reduced: boolean })`.

Units vi: nano giây, micro giây, mili giây, giây, phút, giờ, ngày, năm; en: nanosecond(s) … year(s). One decimal at most; years ≥ 1000 use `formatCount`. Anchors: nhanh hơn một cái chớp mắt / quicker than a blink; cả một đời người / a whole lifetime; lâu hơn tuổi Trái Đất / longer than the Earth has existed; lâu hơn tuổi vũ trụ / longer than the age of the universe. Card title: "Máy tính làm 1 tỉ phép toán mỗi giây sẽ mất" / "A computer doing a billion operations a second needs". Captions (null at 0):
- direct `Lấy thẳng phần tử thứ {k}` / `Takes item {k} directly`
- halving `Còn lại: {size} phần tử` / `{size} items left`
- single-loop `Đang xét phần tử thứ {k} / {n}` / `Looking at item {k} of {n}`
- divide-conquer `Tầng {l} / {L} · phần tử thứ {k}` / `Level {l} of {L} · item {k}`
- nested-loop `Vòng ngoài: lần {r}/{n} · vòng trong: lần {c}/{n}` / `Outer loop: pass {r} of {n} · inner loop: pass {c} of {n}`
- branching `Độ sâu {d} / {n} · lời gọi thứ {k}` / `Depth {d} of {n} · call {k}`
- permutations `Hoán vị thứ {k} / {total}` / `Arrangement {k} of {total}`

Counter: big odometer of `shown`, `/ total` beside it, `≈ {formatCount(shown)} phép toán` under it when total ≥ 1000; `complexity-counter` becomes sr-only with the same text as today; a ring keyed by milestone expands from the counter. Chart: when the selected line passes 10¹², an arrow and "vượt khỏi biểu đồ / off the chart" (font-size 18) mark where it leaves.

- [ ] **Step 1: Failing tests:** `humanDuration(count('permutations', 20) / 1e9, 'vi')` → `'77 năm'`, en `'77 years'`; `humanDuration(1e-5, 'vi')` → `'10 micro giây'`; `humanDuration(7e-9, 'vi')` → `'7 nano giây'`; `humanDuration(count('branching', 50) / 1e9, 'vi')` → `'26,1 ngày'`; `timeAnchor(0.05)` → `'blink'`, `timeAnchor(5)` → `null`, 77 years → `'lifetime'`, `count('permutations', 100)/1e9` → `'universe'`. Odometer of 40320 has five columns, the first at `translateY(-4em)`. `fieldCaption('nested-loop', 4, ops, 7, 'vi')` → `'Vòng ngoài: lần 2/4 · vòng trong: lần 3/4'`; halving n 9 shown 2 → `'Còn lại: 5 phần tử'`; branching n 3 shown 3 → `'Độ sâu 2 / 3 · lời gọi thứ 3'`; shown 0 → `null`. TimeCard for permutations lists `n = 10 … 100` and says `lâu hơn tuổi vũ trụ`. Chart for permutations has `vượt khỏi biểu đồ`, single-loop does not. Playback driven to the end shows `8 / 8` and `Xong`; `divide-conquer` n 1 shows `0 / 0` and `halving` n 1 shows `0 / 1` without throwing. Permutation tiles at n 3 after two steps sit in the order of `permutationAt(3, 1)`.
- [ ] **Step 2:** Run `pnpm --filter @scipal/web test -- features/simulations/complexity.test.tsx` → FAIL.
- [ ] **Step 3:** Implement the files above.
- [ ] **Step 4:** Run `complexity.test.tsx` and `engines/complexity.test.ts` → PASS.
- [ ] **Step 5:** Commit `feat(simulations): rolling counter, time card and live captions for complexity`.

### Task 5: Living operation field

**Files:**
- Modify: `complexityField.tsx`, `complexity.tsx` (pass `reduced`, `milestone`), `complexity.test.tsx`

**Interfaces:**
- Consumes: `MOTION`, `easeOutBack`, `animate` (Task 1).
- Produces: `FieldFx = { now: number; litAt: ArrayLike<number> }`; `drawField(ctx, width, pattern, n, ops, shown, pal, fx?): { x: number; y: number } | null` (centre of the newest operation); `Palette = { accent, line, muted, ink, surface }`; `Spark`; `spawnSparks(pool: Spark[], x: number, y: number, now: number, count: number): void` (keeps ≤ 150); `drawSparks(ctx, pool: Spark[], now: number, color: string): number` (alive count, dead removed; life 300 ms).

Effects with `fx`: the newest ≤ 60 operations lit less than 180 ms ago pop with `easeOutBack` (one path, one glowing fill); direct/single-loop cells ≥ 28 px carry their number (`ink` on empty, `surface` on lit); nested loop: band over the current row (accent, alpha .14) and a ring round the current cell; divide and conquer: 3 px gaps between the 2ˡ groups of level l (`group = floor(i * 2^l / n)`); halving: the cut-off piece of each new row falls for 520 ms (`y += 900·t²`, rotate `0.5·t` rad, alpha `1 − t`); branching: the path from the root to the current call stroked in accent 2.5 px, the newest edge grows over 220 ms. Component: timestamps per operation reset when pattern or n changes; one rAF loop runs while anything moves; up to 3 sparks per frame from the newest operation; a milestone jolts the frame once with `animate()`; reduced motion draws statically as today.

- [ ] **Step 1: Failing tests:** with `fx` (all lit 50 ms ago): nested loop ≤ 6 fills; halving ≤ `2*ops.length + 3` fills. `drawField` on single-loop n 8 shown 3 returns a point inside `600 × 260`; the fake context records `fillText` with `'1'…'8'`. `spawnSparks(pool, 0, 0, 0, 200)` leaves 150; `drawSparks(ctx, pool, 400, '#000')` returns 0 and empties the pool. Rendering the field with a fake context at n 8, shown 5, then n 4, shown 0, does not throw (Review Focus 4).
- [ ] **Step 2:** Run `complexity.test.tsx` → FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `complexity.test.tsx` → PASS.
- [ ] **Step 5:** Commit `feat(simulations): living operation field with pops, falling halves and sparks`.

### Task 6: Verify and ship

- [ ] **Step 1:** `pnpm turbo typecheck` → 7/7; `pnpm --filter @scipal/web test -- features/simulations features/lab` → all pass.
- [ ] **Step 2:** Browser at `/lab/algorithm-sim` and `/lab/complexity-sim`: desktop and 375 px, light and dark, 32 values, every pattern; console clean; no horizontal scroll (Review Focus 3, 5).
- [ ] **Step 3:** Whole-branch review, one fix pass (each fix RED→GREEN), push to PR #193 and update its body.
