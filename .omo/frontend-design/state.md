# Frontend Design State

## Current Objective

Implement the approved SciPal three-level public landing and the account/device level preference while keeping learning status truthful.

## Locked Decisions

- The approved spec and `DESIGN.md` define the field-notebook visual direction and level-scoped tokens.
- Levels are primary, lower-secondary, and upper-secondary. Primary and lower-secondary are upcoming; published Informatics is the only available lesson entry.
- Guests save on device; authenticated users update their own profile through RLS. The account value takes precedence over the device cookie.
- There is no skip path before the first level selection. The landing and Profile both allow changing it.
- Existing lesson routes, navbar behavior after selection, lesson data, auth roles, scoring, and mobile app are out of scope.

## Source Inputs

- `docs/superpowers/specs/2026-09-25-public-landing-field-notebook-design.md`
- `docs/superpowers/plans/2026-09-25-public-landing-levels.md`
- Current `frontend/features/landing`, `frontend/features/subjects`, `frontend/app/globals.css`, and `packages/ui/src/tokens.ts`
- Baseline report: `.superpowers/qa/public-landing/baseline-summary.md`

## Design Brief

First-time students need a one-choice route into honest learning content. A returning student needs a recognizable preference that follows their account across devices. The main taste direction is a warm, modern science field notebook; avoid generic feature-card grids, a full-page grid overlay, gradient display text, fake live AI, fake learner data, and claims not supported by published data.

## Inclusive Personas

- A younger student on a narrow phone: identify their level, see that material is in development, and find an explicitly labeled upper-secondary example.
- A high-school learner switching between Vietnamese and English: understand the lesson diagram and reach a real published Informatics entry.
- A signed-in learner using two devices: keep the selected level with their account and recover clearly if saving fails.
- A keyboard, screen-reader, reduced-motion, or 200%-zoom user: choose any level and reach the same content without hover, color, or motion being required.

## Adaptive Preferences

Support 320–1440px layouts, 200% text zoom, keyboard-only operation, screen-reader headings and control state, reduced motion, Vietnamese and English labels, and touch targets of at least 44×44px.

## Verification Matrix

- Focused route/data/profile tests and web typecheck/build.
- Production Playwright/Lighthouse runs at 390×844 and 1440×900, three repetitions per state; separate first-visit and returning-device landing state.
- `/visual-qa` browser screenshots at 375, 768, and 1280px plus gate, landing, error, focus, reduced-motion, marquee, and Profile save states.
- Keyboard, 200% zoom, responsive widths, real form submission, and account/device preference walkthroughs.
- Final `review-work` packet must include screenshots, baseline/after metrics, accessibility findings, and this debt register.

## Design Debt Register

- Accepted and out of scope: the legacy root `--accent` assignment in `frontend/app/globals.css`; new landing and profile-level styles do not depend on it.
- No new accessibility debt accepted.

## Evidence Index

- Baseline screenshots and metrics: `.superpowers/qa/public-landing/baseline-*`
- SDD execution ledger: `.superpowers/sdd/2026-09-25-public-landing-levels/progress.md`
