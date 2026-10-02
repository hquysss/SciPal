# SciPal Help visual QA — pass B

**Recommendation: PASS**

## Scope checked

- Product surface: public `/help` page.
- Source: `frontend/features/help/HelpCenter.tsx`, `frontend/features/help/helpContent.ts`.
- Design reference: `DESIGN.md`.
- Manual QA record: `.omo/evidence/help/manual-qa.md`.
- Captures inspected at full-page scale and with readable mobile crops:
  - `.omo/evidence/help/desktop-dark-vi.jpg`
  - `.omo/evidence/help/desktop-light-en.jpg`
  - `.omo/evidence/help/mobile-dark-vi.jpg`
  - `.omo/evidence/help/mobile-light-en.jpg`
  - `.omo/evidence/help/mobile-320-vi.jpg`
  - `.omo/evidence/help/tablet-dark-vi.jpg`
  - `.omo/evidence/help/search-vi.jpg`
  - `.omo/evidence/help/teacher-faq.jpg`

## User-outcome review

The page delivers one coherent public Help route with bilingual content, search, topic filters, quick start, feature instructions, and FAQ. The hierarchy is immediately understandable: introduction and search, first-use summary, topic navigation, step-by-step guide cards, FAQ, then a clear route back into learning.

The implementation follows the existing SciPal visual language. It uses the current semantic palette, Be Vietnam Pro typography, rounded notebook-like surfaces, restrained three-color heading rule, existing level pattern, and token-derived action/ink/surface colors. It does not introduce a competing visual system.

## Visual findings

- **Layout:** PASS. Desktop uses a useful two-column guide grid and sticky topic rail; tablet retains two columns without crowding; mobile collapses cleanly to one column. No card, FAQ row, topic chip, CTA, or navbar control clips at 320, 360, 753, or 1425 px captures.
- **Typography and wrapping:** PASS. Vietnamese diacritics render cleanly. Long Vietnamese and English headings, ordered steps, FAQ questions, and notes wrap naturally. Line lengths remain readable. The 320 px page stays legible without compressed type. Search placeholder text truncates naturally inside the input on narrow mobile; this is placeholder overflow, not page clipping.
- **Light/dark contrast:** PASS by visual inspection. Ink, muted copy, borders, selected filters, numbered steps, note panels, and CTA labels remain distinct in both themes. Dark cards separate adequately from the paper background, matching the depth rules in `DESIGN.md`.
- **Responsive readability:** PASS. Mobile preserves 44 px-class controls, comfortable card padding, visible selection state, and sufficient vertical separation. The topic filters wrap into compact rows without horizontal scrolling. The final CTA becomes full-width on mobile.
- **Bilingual parity:** PASS. The English and Vietnamese captures preserve the same information hierarchy and component geometry. English copy does not create overflow or awkward isolated words; Vietnamese copy remains readable at 320 px.
- **Search/filter/FAQ states:** PASS. `search-vi.jpg` shows the focused search state and reduced result count; `teacher-faq.jpg` shows the teacher filter, one teacher guide, and the matching expanded FAQ. Selection, focus, and expanded states are visible through more than color alone (label, border/outline, content expansion, chevron rotation).
- **Content density:** PASS. Nine detailed guides make the page long, but the topic rail/chips, consistent card anatomy, short descriptions, three numbered steps, and prominent action links keep it scannable. This is appropriate for a help reference page.
- **AI-slop/overfit pass:** PASS for the reviewed surface. The source uses existing primitives and semantic tokens, native `details/summary`, real links, and a single data-driven content model. No decorative filler, duplicated alternate UI, needless production abstraction, screenshot-specific layout hack, or visual test shaped only to the implementation was found.

## Evidence notes

- **[evidence, non-blocking] `search-vi.jpg`:** the entire image is visibly blurred compared with the other saved full-page files. Layout and state remain identifiable, but this file is weak evidence for fine typography/contrast. The clear desktop/mobile captures provide the typography and contrast evidence.
- **[evidence, non-blocking] `teacher-faq.jpg`:** the navbar is stitched into the middle of the full-page capture and the upper/lower page segments are discontinuous. This is a full-page capture/stitching defect, not a product-layout finding. The teacher filter, guide card, expanded FAQ, and CTA are still clear; navbar behavior is supported by the other complete captures and the manual QA record.

## Blockers

None.

