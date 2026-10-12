# Landing completion and newsletter Implementation Plan

> **For agentic workers:** use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fill the six gaps found on the landing page. Gap 6 becomes a newsletter sign-up whose subscribers an admin can reach, together with every account, by in-app notification and by email from the admin area.

**Architecture:** Landing gaps 1–5 are frontend-only. The newsletter reuses what exists: the `notifications` table and bell (in-app), Resend (email, `backend/src/notify.ts`), the public-route + visitor-hash + rate-limit pattern of `problemReports.ts`, and the admin hub. New: `newsletter_subscribers` and `announcements` tables, one backend route file, two admin/landing UIs, one unsubscribe page.

## Global Constraints

- UI: theme tokens only (`frontend/lib/theme/rawColors.test.ts`), bilingual `{ vi, en }` via `useLanguage().t`, Vietnamese says "bạn", no "Vui lòng". Content stays data: FAQ and feature strip are typed arrays in their own component, no per-subject code.
- Email is opt-in. Subscribe sends a confirmation link (double opt-in); only `confirmed` subscribers get announcement email, every email carries a one-click unsubscribe link and a `List-Unsubscribe` header. A signed-in user subscribing with their own account email is confirmed at once.
- Accounts receive announcements **in the app only** (bell). Email goes to confirmed subscribers only, never to accounts that did not subscribe.
- Public subscribe endpoint: HMAC visitor hash rate limit (5 per hour), email format and length checks, never reveals whether an address is already subscribed.
- Admin routes are admin-only (`app_metadata.app_role === 'admin'`, pattern of `adminPlans.ts`). Email failure never fails the request; the bell rows are written first.
- Secrets stay in `backend/.env`. Without `RESEND_API_KEY`/`EMAIL_FROM` subscribe returns a bilingual 503 "chưa sẵn sàng" and the form says so; the app broadcast still works.
- Migration is idempotent and NOT applied to the remote database by this plan (apply on the user's go-ahead).
- No legal text goes live unreviewed: the `/terms` page is a draft the owner must read before merge.

## Review Focus

- Subscribe twice, with another person's address, or past the rate limit: no 500, no leak of who is subscribed, no email sent twice for one pending address within 10 minutes.
- Unsubscribe and confirm tokens: unguessable (32 random bytes, stored hashed), single purpose, work without sign-in, unknown token gives the same neutral page.
- Announcement send twice (double click, retry): one `announcements` row per click guarded by an idempotency id; recipients counted and stored.
- A non-admin calling any admin route: 403.

---

### Task 1: Landing gaps 1–5 (frontend only)

**Files:**
- Create: `frontend/features/landing/FeaturesSection.tsx`, `FaqSection.tsx` (+ `.test.tsx` each), `frontend/app/terms/page.tsx`
- Modify: `LandingPage.tsx`, `landing.module.css` (or `sections.module.css`), `getLandingData.ts`, footer inside `LandingPage.tsx`

- [ ] **Features strip (gap 1)** after `HowItWorks`: cards for Exam practice (`/exam`), 3D simulations (`/lab`), Games (`/games`), Progress and XP (`/progress`), Classes for teachers (`/teacher`). Each card: lucide icon, one bilingual line, link. Hide a card when its site switch is off if `getLandingData` already reads site settings; otherwise link and let the page's own `feature-off` handle it.
- [ ] **FAQ (gap 2)** native `<details>` list, 6 Q&A: free? sign-in needed? which subjects now? follows SGK/GDPT 2018? offline/install? how is AI tutor limited? Placed after pricing, before stats.
- [ ] **Real numbers (gap 3)** replace the hard-coded stats with data: published lesson count (extend `getLandingData` query) and website review average and count from `/api/survey/website` when `total > 0`. Keep "grades" and "languages" stats. No invented user counts.
- [ ] **Footer (gap 4)** add Help (`/help`), Pricing (`/pricing`, when `pricing` loaded), Progress, Classes, Terms (`/terms`). `/terms` is a short draft page (account, content, AI answers, payment, contact) marked in the PR for the owner's legal review.
- [ ] **Copy consistency (gap 5)** stats card and final CTA say "Mọi bài học đều miễn phí; gói trả phí chỉ thêm lượt hỏi Giáo sư Quý, chấm đề và công cụ cho giáo viên", matching `PricingSection`.
- [ ] Tests: each new section renders in vi and en, FAQ has 6 items, footer links present. Run `vitest run features/landing`.

### Task 2: Migration and shared email sender

**Files:**
- Create: `supabase/migrations/20261012120000_newsletter.sql`
- Modify: `backend/src/notify.ts` (extract `sendEmails(messages, log)` from `notifyUsers`, same Resend batch call, accepts `headers`), `backend/src/__tests__` notify test if present

- [ ] `newsletter_subscribers(id, email citext unique lower, user_id nullable fk profiles, levels text[] default '{}', locale 'vi'|'en', status 'pending'|'confirmed'|'unsubscribed', token_hash text, token_expires_at, visitor_hash, created_at, confirmed_at, unsubscribed_at)`. RLS enabled, no browser policies (backend service role only).
- [ ] `announcements(id, created_by, title_vi/en, body_vi/en, link, level text null, send_app bool, send_email bool, app_count int, email_count int, created_at)`; RLS enabled, no browser policies. Unique `client_request_id` for idempotency.
- [ ] `notify.ts`: extract the Resend batch loop into `sendEmails`; `notifyUsers` calls it. Behaviour unchanged, existing tests green.

### Task 3: Newsletter routes

**Files:**
- Create: `backend/src/routes/newsletter.ts`, `backend/src/__tests__/newsletter.test.ts`
- Modify: `backend/src/index.ts` (register), `backend/src/plugins/auth.ts` (public: `POST /api/newsletter/subscribe`, `GET /api/newsletter/confirm`, `GET|POST /api/newsletter/unsubscribe`)

- [ ] `POST /api/newsletter/subscribe {email, levels?, locale}`: validate, rate limit, upsert as `pending` with a fresh hashed token, send the confirmation email through `sendEmails`. Always answer 202 with the same body. Signed-in with matching email: set `confirmed`, no email.
- [ ] `GET /api/newsletter/confirm?token=` and `.../unsubscribe?token=`: hash, look up, flip status, return `{ ok }`. `unsubscribe` also accepts `POST` (one-click header). Unsubscribe token is a separate long-lived token per subscriber.
- [ ] Tests: happy path, repeat subscribe, bad email 400, rate limit 429, wrong/expired token, non-admin n/a. Mock Resend like the existing notify tests.

### Task 4: Admin announcement routes

**Files:**
- Create: `backend/src/routes/adminAnnouncements.ts`, `backend/src/__tests__/admin-announcements.test.ts`
- Modify: `backend/src/index.ts`

- [ ] `GET /api/admin/announcements` list with counts, plus `GET /api/admin/newsletter/summary` (confirmed / pending / unsubscribed totals and per-level).
- [ ] `POST /api/admin/announcements {client_request_id, title, body, link?, level?, send_app, send_email}`: validate lengths (title ≤ 120, body ≤ 1000, link internal path or https), dedupe on `client_request_id`, insert row, then in-app: insert `notifications` rows (`kind: 'announcement'`) for all `profiles` in chunks of 1000; email: confirmed subscribers (optionally those with the chosen level) through `sendEmails` with per-recipient unsubscribe link. Store the real counts.
- [ ] Tests: 403 for non-admin and teacher, idempotent resend returns the first result, `send_email` without Resend configured returns the app result and `email_count 0` with a warning field, level filter.

### Task 5: Landing sign-up box and unsubscribe page

**Files:**
- Create: `frontend/features/newsletter/NewsletterSignup.tsx`, `newsletterApi.ts`, `frontend/app/newsletter/[action]/page.tsx` (confirm / unsubscribe result), tests
- Modify: `LandingPage.tsx`

- [ ] `NewsletterSignup`: email field, level checkboxes (primary / lower secondary / upper secondary, default the current level), submit, states idle / sending / sent ("Kiểm tra email để xác nhận") / error. Placed after subjects, copy: "Cấp tiểu học và THCS đang biên soạn. Để lại email, SciPal báo khi ra mắt." Hidden label, `aria-live`, 44px targets.
- [ ] `/newsletter/confirm` and `/newsletter/unsubscribe` pages call the API with the token from the query and show a neutral bilingual result.
- [ ] Tests: validation message, success state, error state, double submit locked.

### Task 6: Admin announcements page

**Files:**
- Create: `frontend/app/admin/announcements/page.tsx`, `frontend/features/admin/announcements/AnnouncementsPage.tsx` (+ test)
- Modify: `frontend/features/admin/AdminHub.tsx` (tool under "Hệ thống"), middleware/admin guard if admin routes are listed there

- [ ] Compose form: title and body in Vietnamese and English, optional link, channel checkboxes (In-app to all accounts, Email to confirmed subscribers), optional level filter, subscriber counts shown next to each channel, confirm dialog with recipient counts before sending.
- [ ] History table: date, title, channels, app count, email count.
- [ ] Test: submit sends one request with a `client_request_id`, counts render, double click sends once.

### Task 7: Verify

- [ ] `tsc --noEmit` in `frontend` and `backend`, `vitest run` for touched areas, `rawColors` test.
- [ ] Browser: landing at 1280 and 390 px (no horizontal overflow, sections in order), subscribe flow against the dev backend, admin page renders. Email and migration against the remote database are not exercised until the user applies the migration and sets Resend keys.
- [ ] Update `PROJECT_STATE.md`. Commit on the current PR branch, push once (one-PR rule).

## Open points (defaults chosen, tell me to change)

- Email goes only to confirmed subscribers, not to all accounts (consent). In-app goes to every account.
- No web push (browser/phone push) in this round; the bell plus email covers "thông báo qua app và email".
