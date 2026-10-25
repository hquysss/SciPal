# super-qa queue

States: `[ ]` queued · `[x]` green spec · `[!]` skipped (reason) · `[b]` bug found · `[?]` flaky.
Append children at the back. Hand-edit freely to reorder.
Dynamic segments: the worker picks one real id from the page that links to it (e.g. first lesson on `/informatics`).

## Level 0

### Public
- [x] `/` — S1/S2 home · `e2e/paths/home.spec.ts` (setup)
- [x] `/subjects` — S2 · `e2e/paths/subjects.spec.ts`
- [?] `/login` · `e2e/paths/login.spec.ts` · FLAKY iter 1: dev-server SyntaxError page error once, green on retry
- [x] `/pricing` · `e2e/paths/pricing.spec.ts`
- [?] `/help` · `e2e/paths/help.spec.ts` · FLAKY iter 1: vi goto ERR_ABORTED on cold compile, green on retry
- [x] `/privacy` · `e2e/paths/privacy.spec.ts`
- [ ] `/terms`
- [ ] `/community`
- [ ] `/games`
- [ ] `/lab`
- [ ] `/glossary` — S6

### Lesson (S3–S4)
- [ ] `/informatics` — S3 subject page
- [ ] `/informatics/[lesson]` — S4 lesson, first lesson listed

### Student (needs test login)
- [ ] `/tutor` — S5
- [ ] `/progress` — S7
- [ ] `/review` — S7
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
