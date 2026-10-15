# Algorithm counters and complexity patterns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add comparison/swap counters to `algorithm-sim` and a new `complexity-sim` (7 Big-O loop patterns, effects, log-scale chart).

**Architecture:** Counters are cumulative fields on `AlgorithmStep`. `complexity-sim` is a new simulation kind: pure engine (`operations`, `count`), a canvas "operation field" plus chart in one view module, registered like the other kinds. The types file is copied verbatim to the backend.

**Tech Stack:** Next.js 15 / React 19, Zod (`@scipal/types`), vitest + @testing-library, canvas 2D, Tailwind tokens (no hard-coded colors).

**Spec:** `docs/superpowers/specs/2026-10-15-algorithm-complexity-design.md`

## Global Constraints
- pnpm only; `pnpm turbo typecheck` must pass.
- `backend/src/schemas/simulations.ts` is byte-identical to `packages/types/src/simulations.ts` (`cp` after editing; both run `packages/types/src/__fixtures__/simulations.json`).
- Bilingual `{en, vi}` text; colors via theme tokens only; no pseudocode or code on the UI.
- n max per pattern: direct / halving / single-loop / divide-conquer / nested-loop 32, branching 12, permutations 8. Defaults: `single-loop`, n = 8.
- `count` closed forms: 1, ⌈log₂n⌉+1, n, n·⌈log₂n⌉, n², 2ⁿ⁺¹−1, n!.
- Reduced motion: no animation, final result shown at once; playback ≤ ~10 s.

## Review Focus
- n = 1: ⌈log₂1⌉ = 0, so halving has 1 op and divide-conquer has 0 ops; neither may crash, and the log-scale chart must handle 0.
- Config with n above the pattern max (e.g. permutations n = 30) is clamped, never freezes the tab.
- Switching pattern or n while playing resets progress; playing past the end stops.
- Old `algorithm-sim` lessons still open unchanged.
- Chart with huge counts (8! = 40 320) stays inside the plot and has a text table.

---

### Task 1: Counters in `algorithm-sim`
**Files:** Modify `frontend/features/simulations/engines/algorithm.ts`, `frontend/features/simulations/algorithm.tsx`; Test `frontend/features/simulations/engines/engines.test.ts`, `frontend/features/simulations/views.test.tsx`.
**Interfaces:** Produces `AlgorithmStep.compares: number; swaps: number` (cumulative up to and including that step).

- [ ] **Step 1: Failing tests.** In `engines.test.ts`: `bubble-sort` on `[5,4,3,2,1]` → last step `compares === 10`, `swaps === 10`; `insertion-sort` on `[1,2,3,4,5]` → last step `compares === 4`, `swaps === 0`; `linear-search` steps all have `swaps === 0` and the first has `compares === 0`.
- [ ] **Step 2:** `pnpm --filter @scipal/web test -- engines.test.ts` → FAIL.
- [ ] **Step 3:** In `algorithmSteps`, keep two running counters; `push` takes `Omit<AlgorithmStep,'compares'|'swaps'>`, increments `compares` when the step has `compare`, `swaps` when it has `swap` (insertion shifts count as swaps), and stores both.
- [ ] **Step 4:** In `algorithm.tsx` show under the bars `So sánh: {compares}` and, for sorts only, ` · Đổi chỗ: {swaps}` (EN "Comparisons" / "Swaps"), `tabular-nums`, in the existing step row. Add a test in `views.test.tsx`: text appears for bubble sort; "Đổi chỗ" absent for `linear-search`.
- [ ] **Step 5:** Tests pass; commit `feat(simulations): comparison and swap counters`.

### Task 2: Complexity engine
**Files:** Create `frontend/features/simulations/engines/complexity.ts`, `engines/complexity.test.ts`.
**Interfaces:** Produces
```ts
export const MAX_N: Record<ComplexityPattern, number>;
export const clampN: (p: ComplexityPattern, n: number) => number;
export const count: (p: ComplexityPattern, n: number) => number;        // closed form
export const operations: (p: ComplexityPattern, n: number) => number[]; // slot touched per operation, in order
export const bigO: Record<ComplexityPattern, string>;                   // 'O(1)','O(log n)','O(n)','O(n log n)','O(n²)','O(2ⁿ)','O(n!)'
```
`ComplexityPattern` and `COMPLEXITY_PATTERNS` (`direct, halving, single-loop, divide-conquer, nested-loop, branching, permutations`) come from `@scipal/types` (Task 3); until then define them in the engine file and move them in Task 3.

- [ ] **Step 1: Failing tests.** For every pattern and every n in `1..MAX_N[p]`: `operations(p,n).length === count(p,n)`. Landmarks: `count('nested-loop',5)===25`, `count('permutations',5)===120`, `count('branching',4)===31`, `count('divide-conquer',8)===24`, `count('halving',1)===1`, `count('divide-conquer',1)===0`; `clampN('permutations',30)===8`, `clampN('single-loop',0)===1`.
- [ ] **Step 2:** Run → FAIL (module missing).
- [ ] **Step 3:** Implement. Slot is `0..n-1` (or op index mod n for `branching` / `permutations`). Use an integer `ceilLog2` loop, not `Math.log2`, to avoid float error at powers of two.
- [ ] **Step 4:** Run → PASS; commit `feat(simulations): complexity engine`.

### Task 3: Kind, schema, registry, lab entry
**Files:** Modify `packages/types/src/simulations.ts` (then `cp` to `backend/src/schemas/simulations.ts`), `packages/types/src/__fixtures__/simulations.json`, `packages/types/src/__tests__/simulations.test.ts`, `frontend/features/simulations/registry.ts`, `frontend/features/lab/catalog.ts`, `frontend/features/lab/LabIndex.tsx`, `.agents/rules/02-domain-rules.md` (kind list).
**Interfaces:** Produces `COMPLEXITY_PATTERNS`, `ComplexityPattern`, config `{ pattern: ComplexityPattern; n: number }` for kind `'complexity-sim'`.

- [ ] **Step 1: Failing fixture rows:** `complexity default` (config `{}`, ok), `complexity permutations n clamped` (`{pattern:'permutations',n:30}`, ok; types test asserts parsed `n === 8`), `complexity unknown pattern` (not ok).
- [ ] **Step 2:** `pnpm --filter @scipal/types test` → FAIL.
- [ ] **Step 3:** Add `ComplexityConfig` Zod (pattern enum default `single-loop`; `n` int ≥ 1 default 8; transform clamps by the per-pattern max from Global Constraints), add `'complexity-sim'` to `SIMULATION_CONFIGS`, `SIMULATION_KINDS` and the error messages; `cp` to backend. Engine imports the pattern list from `@scipal/types`. Lab catalog entry (`subject: 'informatics'`, vi name "Độ phức tạp thuật toán", grades "Lớp 11") and lucide `Gauge` icon in `LabIndex.tsx`. Registry points to `complexityModule` (stub export in `complexity.tsx` so typecheck passes).
- [ ] **Step 4:** `pnpm --filter @scipal/types test && pnpm --filter @scipal/api test` → PASS; commit `feat(types): complexity-sim kind`.

### Task 4: View — controls, counter, field, chart
**Files:** Create `frontend/features/simulations/complexity.tsx` (`complexityModule`: Renderer + Editor), `complexityField.tsx` (canvas), `complexityChart.tsx` (SVG chart + table); Test `complexity.test.tsx`.
**Interfaces:** Consumes `operations`, `count`, `bigO`, `clampN`, `MAX_N`. Produces `ComplexityField({ ops: number[]; n: number; progress: number; reduced: boolean })`, `ComplexityChart({ pattern, n, lang })`, `formatCompact(n: number): string`.

- [ ] **Step 1: Failing tests** (jsdom, `matchMedia` mocked for reduced motion): 7 pattern buttons; default shows "Phép toán: 0 / 8"; step-forward → "1 / 8"; choosing nested loop shows "O(n²)" and total "64"; n slider max is 12 for branching; reduced motion shows "8 / 8" at once; chart renders a `<table>` with 7 rows and an `aria-label` summary; `formatCompact(40320)` → "40,3 nghìn"; the ratio label for permutations n = 8 reads "×5.040 lần so với O(n)".
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3: Implement.** Renderer state `{pattern, n, index, playing}`; reuse `BUTTON` / `PANEL` / `SelectField` from `controls.tsx` and the reduced-motion approach other views use. Playback ticks advance `ceil(total / frames)` ops so it ends in ≤ ~10 s, batch growing ×1.5 per tick for branching / permutations. Field: canvas in `requestAnimationFrame`, one dot per op on a grid sized to `total`, newest dots bright and fading to a token color (read `--accent` and line color via `getComputedStyle`), 200 ms fade when the pattern changes. Counter: rolling number, `formatCompact`, shake class when crossing 1 000 and 10 000 (off under reduced motion). Comparison bar: `transform: scaleX(log10(count)/log10(maxCount))` with label "×{round(count/n)} lần so với O(n)" when `count > 10·n`. Chart: log-y SVG for n in `1..MAX_N` per pattern, selected line thicker, direct text labels at line ends, shaded band over 1 000 000 with a text label, marker at current n, `count === 0` plotted as 1. Editor: pattern `SelectField` and n `NumberField` (min 1, max `MAX_N[pattern]`).
- [ ] **Step 4:** Tests PASS; commit `feat(simulations): complexity-sim view`.

### Task 5: Verify and PR
- [ ] **Step 1:** `pnpm turbo typecheck`, `pnpm --filter @scipal/web test -- simulations`, `pnpm --filter @scipal/api test` all pass (rerun a file alone if a load timeout appears).
- [ ] **Step 2:** In the dev browser open the lab page for the new kind: every pattern at max n, 375 px width, reduced-motion emulation, light and dark; screenshot permutations n = 8 and the chart; console clean.
- [ ] **Step 3:** Push the branch and open one PR `feat(simulations): algorithm counters and complexity patterns`.
