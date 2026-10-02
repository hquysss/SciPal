# Help page manual QA, 2026-10-02

Surface: production build running at http://localhost:3108/help. No account used.

- Guest entry rendered /help directly, with the bilingual page title and 9 guides / 6 FAQs.
- Search `mo phong` returned matching guides and an expanded matching FAQ. Accent-free search unit checks also passed.
- Teacher category returned only 1 teacher guide and 1 teacher FAQ.
- FAQ opened with Enter on its summary, exposing the answer.
- Unmatched search returned 0 guides / 0 FAQs; Show all topics reset filters and restored all content.
- EN button translated page, guides, FAQ and document title to Help | SciPal.
- Light and dark appearance controls applied to the Help page.
- Mobile menu contained Help; clicking it closed the menu and kept /help accessible.
- At 320, 375, 768 and 1440px, DOM scroll width did not exceed viewport width.
- Browser console error list empty.
- Help links target existing feature routes. Personal/teacher destinations retain existing authentication rules.

Fresh captures: desktop-dark-vi.jpg, desktop-light-en.jpg, mobile-dark-vi.jpg, mobile-light-en.jpg, mobile-320-vi.jpg, tablet-dark-vi.jpg, search-vi.jpg, teacher-faq.jpg.
The product uses the existing semantic palettes and type/spacing primitives, native details/summary and real links, without additional dependencies.

Validation: pnpm turbo typecheck: 7 successful; pnpm turbo test: 6 successful; pnpm turbo build: 2 successful (build process finished after MCP timeout). Targeted Help/search/access/navbar/color tests: 26 passed.

Final review: independent integrity PASS and visual PASS, no product blockers. Reports integrity-review.md and visual-review.md. The initial search viewport capture is blurred and the teacher full-page capture stitches the sticky navbar into the middle; these are non-blocking capture defects, with clear full-page viewport evidence and DOM/keyboard observations available. A final top-of-page preview.jpg has been captured after scrolling to zero.

Additional check: Open sign in navigated to /login, then browser Back returned to /help. React Doctor changed scan: 91/100, one pre-existing high-complexity warning in NavBar; no new state/logic was added to that function. TypeScript LSP unavailable (prior installation declined), tsc and production build checks passed instead.
