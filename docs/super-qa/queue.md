# super-qa queue

States: `[ ]` queued · `[x]` green spec · `[!]` skipped (reason) · `[b]` bug found · `[?]` flaky.
Append children at the back. Hand-edit freely to reorder.
Dynamic segments: the worker picks one real id from the page that links to it (e.g. first lesson on `/informatics`).

## Level 0

### Public
- [x] `/` — S1/S2 home · `e2e/paths/home.spec.ts` (setup)
- [x] `/subjects` — S2 · `e2e/paths/subjects.spec.ts`
- [x] `/login` · `e2e/paths/login.spec.ts` · iter 2: stable on 2 full runs
- [x] `/pricing` · `e2e/paths/pricing.spec.ts`
- [x] `/help` · `e2e/paths/help.spec.ts` · iter 2: stable on 2 full runs
- [x] `/privacy` · `e2e/paths/privacy.spec.ts`
- [ ] `/terms`
- [ ] `/community`
- [ ] `/games`
- [ ] `/lab`
- [ ] `/glossary` — S6

<!-- iter 2: Lesson and Student sections popped ahead of remaining Public cells (orchestrator reorder) -->
### Lesson (S3–S4)
- [!] `/informatics` — S3 subject page · `e2e/paths/informatics.spec.ts` · iter 2: login-gated (middleware), blocked by student login failure
- [!] `/informatics/[lesson]` — S4 lesson · `e2e/paths/lesson.spec.ts` · iter 2: blocked by student login failure

### Student (needs test login)
- [!] `/tutor` — S5 · `e2e/paths/tutor.spec.ts` · iter 2: blocked by student login failure
- [!] `/progress` — S7 · `e2e/paths/progress.spec.ts` · iter 2: blocked by student login failure
- [!] `/review` — S7 · `e2e/paths/review.spec.ts` · iter 2: blocked by student login failure
- [ ] `/profile` — S8
- [ ] `/profile/plan` — S8
- [ ] `/profile/orders` — S8
- [ ] `/exam` — S9
- [ ] `/exam/[blueprintId]` — S9, open only, do not submit
- [ ] `/classes` — S11
- [ ] `/feedback` — S12
- [ ] `/support` — S12

### Teacher (needs teacher test login)
- [ ] `/teacher/lessons` — S10
- [ ] `/teacher/lessons/new-lesson` — S10, open only
- [ ] `/exam/manage` — S10
- [ ] `/teacher/classes` — S11
- [ ] `/teacher/classes/[id]` — S11

### Admin (needs admin test login, last)
- [ ] `/admin`
- [ ] `/admin/site`
- [ ] `/admin/stats`

### Skipped
- [!] `/dev/*` — internal showcases, not shipped
- [!] `/checkout/[orderId]`, `/profile/payment-methods` — money flow, no staging
- [!] `/maintenance`, `/feature-off`, `/offline`, `/newsletter/[action]`, `/reset-password` — state pages, reached only by redirect
