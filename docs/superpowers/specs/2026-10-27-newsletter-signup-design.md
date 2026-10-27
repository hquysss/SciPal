# Newsletter sign-up form — design

## Problem
The backend already takes sign-ups (`POST /api/newsletter/subscribe`), mails a confirmation link and the admin announcement page sends to confirmed subscribers. No screen calls the subscribe API, so nobody can sign up and the admin sees "Email, tới 0 người đã xác nhận".

## Scope (UI only, no backend or schema change)
One component, `NewsletterSignup`, in `frontend/features/newsletter/`, shown in two places:
1. **Landing page**: a short section before the footer, for anyone.
2. **Profile**: a card for signed-in accounts, email prefilled from the account.

## Behaviour
- Fields: email, school levels (checkboxes: Tiểu học, THCS, THPT; at least one), submit button. Locale comes from the current language.
- Calls `POST /api/newsletter/subscribe` with `{ email, levels, locale }` through a new `subscribeNewsletter` in `newsletterApi.ts` (same `post` helper, same error shape).
- Result messages (bilingual):
  - `confirmed: true` (account email matches): "Đã đăng ký!" + "Bạn sẽ nhận tin khi SciPal có bài và cấp học mới."
  - `confirmed: false`: "Xong rồi!" + "Nếu email này chưa đăng ký, bạn sẽ nhận email xác nhận." (the server answers the same for already-subscribed, so the wording must be true for both).
  - 400/429/503: show the server's `error` / `error_en`.
- Invalid email or no level: inline error before any request.
- Accessibility: labels on every field, result in an `aria-live="polite"` region, 44px targets, focus ring from existing tokens.
- Styling: existing tokens and `--accent`; no hard-coded subject colour.

## Out of scope
Unsubscribe from the profile (the email link already does it), email preferences beyond levels, hiding the admin Email option when the list is empty.

## Tests
`NewsletterSignup.test.tsx`: validation blocks the request; success shows the "check your email" text; server error text is shown; levels and locale are sent.

## Done when
`pnpm turbo typecheck` and the web tests pass, and a sign-up from the landing page creates a `pending` row and the confirmation page turns it `confirmed`.
