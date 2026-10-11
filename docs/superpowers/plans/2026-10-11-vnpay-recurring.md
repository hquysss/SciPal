# VNPAY payment and recurring implementation plan

> **For agentic workers:** Use executing-plans to implement task-by-task.

**Goal:** Add VNPAY checkout and recurring billing before merchant registration, closed by default.
**Architecture:** Reuse the existing order/payment ledger and pricing surfaces. Provider adapters verify signatures before database state changes; recurring mandates are provider-scoped. No remote application or live charging.
**Tech Stack:** Fastify 4, Next.js 15, Zod 3, Supabase Postgres, Vitest, Node crypto/fetch.
**Spec:** `docs/superpowers/specs/2026-10-11-vnpay-recurring-design.md`

## Global constraints
- Preserve current uncommitted changes and existing payOS/MoMo behavior.
- Keys/tokens backend only; ReturnURL grants nothing; verified callback/query grants once.
- EN/VI copy and existing semantic UI tokens; no new dependencies.
- Missing credentials keep VNPAY closed. Recurring requires separate readiness and verified consent.
- New local migration only; do not apply remotely or deploy.

## Review focus
- Callback parameter pollution and foreign merchant cannot grant access.
- Provider timeout/repeated callbacks cannot create duplicate payment grants.
- Changing provider cannot leave two active recurring authorizations.
- Failed cancellation keeps a visible pending state and paid entitlement.
- A sandbox checkout must never imply production payment readiness.

## Task 1: Protocol adapter
- [ ] Read official payment and Recurring contracts; record scheduling owner.
- [ ] Add `backend/src/__tests__/vnpay.test.ts`: amount 39000 -> 3900000, GMT+7, exact encoding/signatures, merchant/tamper rejection, unknown responses.
- [ ] Watch failure, add `backend/src/billing/providers/vnpay.ts`, run adapter tests.

## Task 2: Ledger and routes
- [ ] Add new migration through Supabase CLI, service-role-only recurring state and provider-filtered MoMo paths.
- [ ] Add VNPAY routes/helper, checkout provider, callback allowlist, order query and admin reconciliation.
- [ ] Test closed config, order ownership, signed IPN, amount mismatch, duplicates, recurring registration/cancel/unknown outcomes and local SQL when available.

## Task 3: Existing UI
- [ ] Extend catalog/billing API and `/pricing` choice with VNPAY and explicit recurring opt-in, default off.
- [ ] Extend My Plan/reconciliation labels and cancellation to the correct provider.
- [ ] Test EN/VI, missing configuration, provider choice, amount/cycle and consent reset; inspect desktop/mobile browser surfaces.

## Task 4: Verification and handoff
- [ ] Run focused billing tests, relevant typecheck/build, review diff and preserve unrelated work.
- [ ] Update runbook and PROJECT_STATE with actual evidence and remaining merchant/remote verification.
- [ ] Report only observed behavior, pending migration and external verification.
