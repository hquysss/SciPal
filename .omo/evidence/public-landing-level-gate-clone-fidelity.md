# Clone / Design-System Fidelity Review — Public Landing LevelGate

**Recommendation:** REQUEST_CHANGES

**Scope reviewed:** `LevelGate` as the Task 5 chooser primitive. The root `/`
composition is deliberately deferred to plan Task 6, so this review does not
count its current development-only showcase use as a production-integration
failure.

## Review inputs and evidence inspected

| Input | Inspection result |
|---|---|
| Approved target | `docs/superpowers/specs/2026-09-25-public-landing-field-notebook-design.md` and `DESIGN.md` |
| Implementation | `frontend/features/landing/LevelGate.tsx`, `frontend/features/landing/level-gate.module.css`, `frontend/app/globals.css` |
| Render path | `frontend/app/dev/landing-level-gate/page.tsx` |
| Supplied captures | `.superpowers/qa/public-landing/gate-showcase/320-empty-device-viewport.png`, `390-selected-primary-viewport.png`, `390-keyboard-focus-viewport.png`, `768-save-error-viewport.png`, `768-text-200-percent-full.png`, `1024-selected-high-school-viewport.png`, `1440-account-available-viewport.png` |
| Capture facts | `.superpowers/qa/public-landing/gate-showcase/capture-results.json` |
| Change evidence | Working tree status and the relevant source were inspected. The new LevelGate files are untracked, so a base-to-head diff for those files does not exist. No notepad path was supplied. |

There is no approved reference screenshot or Figma export for a pixel-diff
comparison. Visual fidelity is therefore assessed against the written field
notebook contract and its token tables, not an invented pixel target.

## What the evidence proves

- The gate is a live component tree: `main > header + section > native form /
  fieldset / three submit buttons`, with real error/current/availability
  variants. It is not a pasted screenshot or raster reconstruction. The only
  image use is the real brand logo in `LevelGate.tsx:72`; the stylesheet has no
  `background-image` or `url()` image substitute.
- The color palette is correctly scoped to `.gate`, and its named color values
  match the neutral gate palette in `DESIGN.md:55-68`. The seven supplied
  captures show the expected single-column mobile, two-plus-one tablet, and
  three-column desktop arrangements. `capture-results.json` records one H1,
  three real buttons, no nested interactive controls, a hidden app navbar, and
  measured option controls far above 44px.
- The 390px keyboard capture visibly shows the focus outline; the 768px error
  capture shows a text error and recovery link; the 768px 200% capture has a
  taller document instead of a clipped or horizontally overflowing layout.
- The VI/EN control is present, has `aria-pressed`, and calls the shared
  `useLanguage()` setter. The hook persists and notifies subscribers in
  `packages/hooks/src/useLanguage.ts:42-55`; all component copy uses `t(...)`
  or the active `lang` branch. This establishes an implementable live toggle,
  but the supplied visual evidence contains only Vietnamese renders.

## Findings

### HIGH

1. **The primitive is not token-driven for spacing or typography.**
   `DESIGN.md:102-126` defines named spacing intent (`--space-1` through
   `--space-24`) and `DESIGN.md:76-84` defines the type scale, but
   `level-gate.module.css` does not declare or consume those tokens. It instead
   spreads direct values through the component: `10px` gap at line 36, `18px`
   padding at line 50, `14px` at lines 178 and 202, `22px` at line 385,
   handwritten font sizes throughout lines 43-54, 80, 119, 139, 152, 162, 170,
   204, 272, 301, 321, 362 and 373, plus direct shadow colors at line 110.
   The one-off `#fff` at line 92 also bypasses the documented surface/foreground
   tokens. The local `--gate-*` palette is a good start, but it alone does not
   meet the design-system requirement that color, spacing, and typography be
   traceable to reusable tokens. This is a blocking fidelity issue.

### MEDIUM

1. **Gate heading scale materially diverges from the approved scale.**
   The design contract assigns the gate heading the Display range
   `clamp(2.45rem, 5.6vw, 5.5rem)` at `DESIGN.md:78`. The implementation uses
   `clamp(2rem, 5.2vw, 3.75rem)` at
   `frontend/features/landing/level-gate.module.css:149-156`. The 320px and
   1440px captures show the resulting smaller hierarchy. This keeps the screen
   readable, but it does not reproduce the approved field-notebook composition.

2. **Each language switch button is only 40px tall.**
   `level-gate.module.css:71-74` sets `.languageButton` to `min-height: 40px`.
   The 44px wrapper does not expand the native button hit area. This misses the
   component-system constraint for 44×44px controls in `DESIGN.md:188` and the
   task's mobile accessibility requirement. The visible pill is 44px, which can
   conceal the smaller interactive target.

3. **The English interaction is not visually verified, and intended English
   substyles cannot match their selectors.** The screenshots and
   `capture-results.json` exercise only VI. `LevelGate.tsx:69` applies `lang`
   to the `main`, while CSS lines 186, 291, 307, and 330-334 target a descendant
   `[lang='en']` that the component never renders. The core language switch is
   source-supported, but an EN capture at the required widths is needed to
   verify wrapping, active state, and the intended English type treatment.

### LOW

1. **The available-state wording does not exactly follow the approved status
   label.** The plan and field-notebook brief reserve “Sẵn sàng” / “Available”
   for verified availability (`docs/superpowers/plans/2026-09-25-public-landing-levels.md:181`;
   field-notebook spec line 40). `LevelGate.tsx:27` renders “Ready to learn” /
   “Sẵn sàng học.” It remains truthful, but it weakens exact copy fidelity and
   makes the state vocabulary less consistent with the rest of the contract.

## Blockers before approval

1. Replace the scattered spacing and typography literals with the documented,
   reusable token system and route all remaining visual literals through named
   tokens.

No CRITICAL finding was found. The implementation is genuine live DOM and its
responsive visual evidence is mostly sound, but the HIGH design-system finding
requires `REQUEST_CHANGES` under the clone-fidelity gate.
