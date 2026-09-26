# EN/VI landing language switch — final gate review

- recommendation: APPROVE
- blockers: []

## originalIntent

Make the existing VI/EN switch obvious in the public landing hero, translate rendered landing content when selected, persist the locale, synchronize `document.documentElement.lang`, and preserve an accessible language switch in the educational-level gate.

## desiredOutcome

A visitor can switch between Vietnamese and English on the landing page and on both first-entry and showcase variants of the level gate. The active state, visible copy, saved `scipal-lang` preference, and document language remain synchronized at mobile, tablet, and desktop widths. The page retains the field-notebook design system, avoids duplicate visible controls and horizontal overflow, and provides 44×44 px targets.

## userOutcomeReview

The current artifact satisfies the stated outcome. The landing control is directly under the hero actions and has a distinct pill treatment, language icon, localized accessible group label, and unambiguous filled active state. English and Vietnamese captures show broad copy replacement throughout navigation, hero, subject content, learning path, calls to action, survey, and footer. Gate captures show the same clear active-state treatment and translated education-level content at 375 and 1280 px.

The layouts stay coherent across the required widths. The 375 px landing stacks the hero, tutor preview, subject cards, learning path, action panel, poll, and footer without clipping. The 1440 px view uses the intended asymmetric field-notebook composition and existing green/ink/paper tokens. The switch is live DOM with native buttons, not a raster substitute or hardcoded screenshot.

## direct code review

- `frontend/features/landing/LandingHeroNotes.tsx` uses the shared `useLanguage()` hook, exposes a localized `role="group"` label, and marks both native buttons with `aria-pressed`.
- `frontend/features/landing/landing-hero-notes.module.css` consumes landing spacing, type, color, focus, border, and motion tokens. Both controls have `2.75rem` minimum width and height, or 44 px at the documented 16 px root size.
- `frontend/features/landing/LandingPage.tsx` renders translated copy through `t(...)` or the active `lang` branch and places the hero switch in the primary decision area.
- `packages/hooks/src/useLanguage.ts` updates local React state, `localStorage`, the language cookie, `document.documentElement.lang`, and all mounted subscribers.
- `frontend/components/nav/LanguageToggle.tsx` uses the same shared state. The scoped rule in `frontend/app/globals.css` hides the duplicate navbar control only while the hero control exists.

## remove-ai-slops and programming pass

- No pasted-image implementation, redundant parsing, normalization layer, unnecessary production extraction, or scope-expanding abstraction was found in the reviewed language-switch code.
- The two added hook assertions cover observable behavior: changing the document language and loading a persisted value on mount. They are neither deletion-only nor tautological tests, and they do not mirror private implementation structure.
- The language state remains strictly typed as `'en' | 'vi'`; component changes reuse the established shared hook and token system.
- No maintenance burden or false-confidence test violates a stated success criterion.

## reproducedEvidence

- Focused test: `pnpm --dir packages/hooks exec vitest run src/__tests__/useLanguage.test.ts --reporter=verbose` — 1 file passed, 6 tests passed.
- `.superpowers/qa/public-landing/route-showcase/language-switch-qa.json` records successful EN and VI clicks, translated copy, `aria-pressed`, `scipal-lang`, document language, no page errors, 44×44 controls, no overflow at 375/768/1280, and hidden duplicate navbar controls.
- All 16 required PNGs exist, decode successfully, and have expected widths. Representative English/Vietnamese landing and first-entry/showcase gate images were opened at original detail and inspected for state clarity, translation, layout, clipping, and composition.

## checkedArtifactPaths

- `DESIGN.md`
- `frontend/features/landing/LandingHeroNotes.tsx`
- `frontend/features/landing/landing-hero-notes.module.css`
- `frontend/features/landing/LandingPage.tsx`
- `frontend/components/nav/LanguageToggle.tsx`
- `frontend/app/globals.css`
- `packages/hooks/src/useLanguage.ts`
- `packages/hooks/src/__tests__/useLanguage.test.ts`
- `.superpowers/qa/public-landing/route-showcase/language-switch-qa.json`
- all 16 requested landing and level-gate PNGs under `.superpowers/qa/public-landing/route-showcase/`

## exactEvidenceGaps

- `omo ulw-loop status --json` could not run because `omo` is unavailable on PATH. No active attempt directory could be resolved, so the required fallback report path under `.omo/evidence/` is used.
- No standalone current code-review report, manual-QA matrix, executor report, or notepad path was supplied. Direct source, diff, token, focused-test, JSON, and visual-artifact inspection independently supports every stated success criterion, so these missing documents do not create a blocker.
- There is no approved pixel reference or Figma export. Visual fidelity was evaluated against the explicit intent and `DESIGN.md`, as requested.

## notes

- The earlier `.omo/evidence/public-landing-level-gate-clone-fidelity.md` reviews an older gate-only evidence set and explicitly notes that its screenshots exercised only Vietnamese. The current complete EN/VI gate captures and measured 44×44 targets supersede those evidence gaps for this criterion.
- This approval is scoped to the landing and level-gate language-switch outcome. The broader dirty working tree was not treated as part of this gate.
