# Help integrity review

**Verdict:** PASS  
**Confidence:** High (0.94)

## Scope and intended outcome

Reviewed the public `/help` page as bilingual user guidance covering search, topics, lessons/simulations/practice, glossary, exams, SciPal Professor, account/progress, classes, teacher access, and FAQs. The expected outcome is one public Help page that reuses SciPal's existing design system, works in EN/VI and light/dark themes, remains usable across supported widths, and links into existing product routes without weakening their access rules.

## Product findings

No material product defect found.

- `/help` is explicitly public while `/helpful` remains in the normal learning-trial class (`frontend/lib/guestTrial.ts:33-38`; reproduced by `frontend/lib/guestTrial.test.ts:7-10`). Personal routes (`/profile`, `/classes`, exam rooms) remain account-protected and the Help links do not bypass middleware.
- The page uses real DOM controls and existing primitives: `Input`, `Button`/`buttonVariants`, `Link`, native `details/summary`, ordered lists, one `main`, one `h1`, labeled search, pressed-state topic buttons, a polite result count, and visible focus styles (`frontend/features/help/HelpCenter.tsx:19-150`).
- Search is functional rather than visual-only. It normalizes both EN and VI content through the shared glossary normalizer, requires every query word, searches titles/descriptions/steps/notes/FAQ answers, combines correctly with category filtering, and has an honest empty/reset state (`frontend/features/help/helpContent.ts:141-150`; `frontend/features/help/helpContent.test.ts:4-30`).
- The implementation uses semantic surface/ink/action/line/focus tokens and existing input/button/language/theme primitives. No Help-specific hard-coded subject color or root-scoped `--accent` was introduced.
- All guide destinations exist: `/subjects`, `/login`, `/tutor`, `/glossary`, `/exam`, `/profile`, and `/classes`. The content accurately distinguishes lesson practice from timed exams and explains that teacher tools require an authorized account.
- The direct slop/overfit pass found no needless production abstraction, parsing layer, normalization duplication, deletion-only test, requested-removal test, tautological assertion, debug residue, or implementation-mirroring snapshot. The five search tests exercise observable result sets and adversarial empty/multi-word cases. The route-access regression specifically proves the exact `/help` boundary and rejects `/helpful`.

## Visual and viewport review

Inspected all eight captures listed by the QA record:

- `.omo/evidence/help/desktop-light-en.jpg` — desktop light EN, full page
- `.omo/evidence/help/desktop-dark-vi.jpg` — desktop dark VI, full page
- `.omo/evidence/help/mobile-light-en.jpg` — mobile light EN
- `.omo/evidence/help/mobile-dark-vi.jpg` — mobile dark VI
- `.omo/evidence/help/mobile-320-vi.jpg` — narrow dark VI
- `.omo/evidence/help/tablet-dark-vi.jpg` — 768-class dark VI
- `.omo/evidence/help/search-vi.jpg` — filtered search results
- `.omo/evidence/help/teacher-faq.jpg` — teacher filter and expanded FAQ

Across the captures, headings, search, topic controls, cards, notes, links, FAQs, and final CTA remain legible and aligned. The mobile layout becomes a single reading column, topic controls wrap, cards do not clip, and 320/375/768-class captures show no horizontal truncation. Light/dark and EN/VI states are visibly distinct and complete.

## Evidence notes

- **NOTE (evidence, non-blocking):** `teacher-faq.jpg` is a scrolled full-page capture and the sticky navbar is stitched through the middle of the image. This is a capture artifact: it is absent from both full-page desktop captures and does not contradict the source behavior. It slightly lowers the standalone clarity of that one artifact but does not violate a requested criterion.
- **NOTE (evidence, non-blocking):** the JPG pixel widths are 360/305/753 for the nominal 375/320/768 browser viewports, consistent with the captured document area excluding browser scrollbar/chrome. The QA record also reports DOM scroll width did not exceed viewport width.

## Reproduced verification

- `pnpm exec vitest run features/help/helpContent.test.ts lib/guestTrial.test.ts components/nav/NavBar.test.tsx` from `frontend`: **21 passed / 3 files**.
- `pnpm exec tsc --noEmit --pretty false` from `frontend`: **passed**.
- `git diff --check`: **passed** (only the existing LF-to-CRLF warning for `guestTrial.test.ts`).
- Direct scan of the Help scope found no debug logging, TODO/FIXME, suppression directive, `any`, or Help-local unsafe type escape.

## Checked artifacts

- `frontend/app/help/page.tsx`
- `frontend/features/help/HelpCenter.tsx`
- `frontend/features/help/helpContent.ts`
- `frontend/features/help/helpContent.test.ts`
- `frontend/components/nav/NavBar.tsx` diff
- `frontend/lib/guestTrial.ts` diff
- `frontend/lib/guestTrial.test.ts` diff
- `DESIGN.md`
- `.omo/evidence/help/manual-qa.md`
- all eight JPG captures listed above

## Blockers and evidence gaps

None.
