# Account Pricing, Billing & Quotas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking. Người dùng chưa yêu cầu triển khai code; PR này bàn giao tài liệu. Không tự chọn model bị cấm hoặc mở nhiều agent.

**Goal:** Pricing học sinh/giáo viên, thanh toán QR + thẻ, quản lý gói và hạn mức riêng mỗi tài khoản do admin chỉnh.

**Architecture:** Catalog/giá/usage/overrides ở Postgres; Fastify xác thực user, kiểm quota, tạo checkout và xác nhận tiền. Frontend chỉ dùng DTO, trạng thái backend và hosted payment; các RPC transaction + unique constraints bảo vệ quota và billing khi có request đồng thời.

**Tech Stack:** Next.js 15 / React 19 / Tailwind 3, Fastify 4, Supabase Postgres, Zod, Vitest, payOS, VNPAY. Giữ các package và conventions hiện tại; chỉ thêm dependency khi task có lý do cụ thể.

**Spec:** [Thiết kế đã chốt về phạm vi và bảng gói](../specs/2026-09-28-account-pricing-billing-design.md).

## Global Constraints

- student_plus: 39.000 VND/tháng, 390.000 VND/năm. teacher_pro: 99.000 VND/tháng, 990.000 VND/năm.
- Student Free/Plus: 3/30 lượt thi chấm điểm và 10/200 lượt Tutor mỗi tháng.
- Teacher Free/Pro: 1/10 lớp hoạt động, 50 học sinh/lớp, 5/100 tệp mỗi tháng, 5/100 đề tác giả hoạt động, 0/100 lượt AI soạn bài mỗi tháng.
- Override riêng ưu tiên theo từng metric; giá trị tổng >= 0, ngày hết hạn tùy chọn, lý do bắt buộc, audit; reset giữ usage. Không đổi role hoặc số tiền thanh toán.
- Nội dung/quyền lợi EN/VI là dữ liệu; dùng tokens trên data-app-shell, không hard-code màu, không đặt accent lên root; kiểm sáng/tối đang bật.
- Không đọc/copy/in .env. Mọi secret thanh toán/AI/service-role chỉ thuộc backend; cấu hình thật do chủ dự án cung cấp qua môi trường backend, không qua tài liệu/PR/chat.
- TDD. Không Prettier. Chạy `npx turbo run typecheck test lint` hoàn tất trước `npx turbo run build`; không chạy song song hai lệnh.
- Mỗi task/PR trên một nhánh codex/ riêng, user tự merge. Bắt đầu task kế sau khi base đã có dependency được merge.
- Không deploy, chạy migration remote hoặc thực hiện giao dịch tiền thật chỉ từ sự đồng ý với plan.
- Các mặc định kỹ thuật ở spec §2 phải được review trước khi bật enforcement/mở bán; không tự diễn giải thành thay đổi chính sách đã phê duyệt.

## Review Focus

1. Hai request tranh lượt cuối: chỉ một reservation thành công; test DB concurrency tại Task 1, route integration tại Task 3–5.
2. Một đơn nhận callback trùng/đảo thứ tự hoặc nhận tiền qua hai provider: một grant; khoản thanh toán dư phải vào đối soát; Task 6–7.
3. Đổi gói/reset override/hết hạn ở biên tháng: không cấp lại usage, không mất dữ liệu; Task 1–2, 9.
4. Admin hạ quota, hai admin lưu cùng lúc, lỗi ghi audit: giới hạn mới đúng, stale save 409, transaction rollback khi audit lỗi; Task 2.
5. Import trực tiếp API, xóa hội thoại rồi hỏi lại, submit thi lặp: không né quota hoặc nhận XP hai lần; Task 3–5.

## Phát hiện thực tế trước khi thực thi

Base khảo sát: `35afa624e5314b1940e6da53552a58a4b1c29355` trên origin/main. Cần fetch lại và đối chiếu những file dưới đây lúc bắt đầu mỗi task.

- Tutor đã có ở `backend/src/routes/tutor.ts`, không xây lại theo note cũ “chưa có /api/ai/chat”.
- `backend/src/tutor/settings.ts` + `routes/aiSettings.ts`: dailyLimit và công tắc; `routes/translate.ts`: hạn mức ký tự dịch. Giữ nguyên ý nghĩa, không dùng “100 lượt AI soạn bài” để thay quota dịch.
- Tutor hiện cho phép overshoot khi concurrent; không thích hợp cho usage trả phí.
- `routes/exams.ts` quản lý đề tác giả; `routes/exam.ts` phát đề/chấm thi. Hai file có trách nhiệm khác nhau.
- `routes/examImport.ts` có hai route import chung handler; browser parse DOCX/PDF/XLSX trong `frontend/features/content-import/`.
- AI soạn bài và giao bài thật chưa được chứng minh bởi khảo sát này; Task 5 bao gồm readiness gate riêng. Không bán Teacher Pro đủ quyền lợi nếu các dependency đó chưa hoàn tất.
- Root Turbo có task lint, nhưng frontend/backend chưa có script lint. Ghi rõ kết quả task thực sự chạy; không báo lint sạch chỉ vì Turbo không có việc.
- Public auth allowlist hiện chưa có billing. Không thêm startsWith('/api/billing') vì sẽ mở cả checkout/me.

## Shared interfaces

Định nghĩa ở `packages/types/src/billing.ts`, export qua `packages/types/src/index.ts`; backend import theo ESM hiện tại.

- `PlanCode = 'student_free' | 'student_plus' | 'teacher_free' | 'teacher_pro'`.
- `BillingInterval = 'month' | 'year'`; `PaymentProvider = 'payos' | 'vnpay'`.
- `QuotaMetric = 'tutor_requests' | 'graded_exam_attempts' | 'import_files' | 'author_ai_requests' | 'active_classes' | 'students_per_class' | 'active_authored_exams'`.
- `EffectiveQuota = { metric, kind: 'monthly'|'capacity', limit: number, used: number, reserved: number, source: 'plan'|'override', expiresAt: string|null, resetsAt: string|null }`.
- `QuotaChange = { metric, action: 'set', limit: number, expiresAt: string|null } | { metric, action: 'reset' }`.
- `PaymentEvent = { provider, merchantRef: string, providerTransactionId: string, amountVnd: number, currency: 'VND', outcome: 'paid'|'failed'|'pending', paidAt: string|null }`. Adapter chỉ tạo event này sau xác minh; không nhận DTO từ frontend để cấp gói.
- `CheckoutInput = { priceId: string, provider, idempotencyKey: string, autoRenew: boolean }`; Zod strict, từ chối amount/userId/role do client chèn.
- `QuotaError` và public DTO theo spec §6; không export credential/provider token/đáp án câu hỏi.

Mọi interface bên dưới dùng các DTO trên; `BillingRepository` là backend-only wrapper cho RPC, nhận clock ở test. Không chuyển business state machine vào React.

## Task 1 / PR 1: Catalog, schema và quota transaction

**Branch:** `codex/billing-foundation`.

**Files:** create `packages/types/src/billing.ts`, `packages/types/src/__tests__/billing.test.ts`, `backend/src/billing/repository.ts`, `backend/src/billing/periods.ts`, `backend/src/__tests__/billing-periods.test.ts`, `backend/src/__tests__/billing-repository.test.ts`, `supabase/tests/billing.sql`, `backend/scripts/verify-billing-concurrency.ts`; create migration `supabase/migrations/20260928200000_billing_foundation.sql` (đổi timestamp nếu đã bị sử dụng); modify `packages/types/src/index.ts`, `packages/supabase/src/types.ts`.

**Consumes:** user IDs/roles đã xác thực, schema hiện tại. **Produces:** catalog + effective quota + order/subscription ledger theo spec.

- [x] Viết test trước: đúng bốn gói và giá; override 500 thắng 200; override hết hạn về 200; 0 chặn; reset không xóa used=40; tháng VN đổi tại 17:00Z ngày cuối tháng; annual không cấp 12 lần quota.
- [x] Chạy `pnpm --filter @scipal/types test -- src/__tests__/billing.test.ts` và `pnpm --filter @scipal/api test -- src/__tests__/billing-periods.test.ts src/__tests__/billing-repository.test.ts`; xác nhận fail do behavior thiếu.
- [x] Implement `quotaPeriod(now: Date): { start: string; end: string }`, `paidThrough(start: Date, interval: BillingInterval): string`; SQL seed catalog/limits EN/VI chính xác; price snapshots bất biến.
- [ ] Implement repository `getEffectiveQuotas(userId, now): Promise<EffectiveQuota[]>`, `reserveQuota(userId, metric, operationId, units, requestHash): Promise<Reservation>`, `settleQuota(operationId, outcome: 'commit'|'release'): Promise<void>`. Reservation có lease, status và id; retry requestHash khác trả 409.
- [ ] SQL RPC lock theo account/metric/period, counter không âm, audit/event uniqueness, quyền service_role. Capacity mutation + kiểm limit cùng transaction, không read-count rồi insert hai request riêng.
- [ ] Chạy SQL integration bằng `psql -X -v ON_ERROR_STOP=1 --file supabase/tests/billing.sql` trên PostgreSQL thử nghiệm CI, không lấy credential từ .env. SQL kiểm RLS/grant/quota/idempotency/snapshot; sau đó chạy `pnpm --filter @scipal/api exec tsx scripts/verify-billing-concurrency.ts`: Promise.all 20 RPC reserve độc lập với một lượt còn lại, đúng một success; user A/B isolation. Script từ chối chạy nếu chưa có dấu xác nhận database thử nghiệm, không tự lấy credential remote. Nếu CI chưa xác nhận, không gọi foundation ready.
- [ ] Chạy full gate theo Global Constraints, review diff, commit `feat(billing): add catalog and atomic quota ledger`, mở PR.

## Task 2 / PR 2: Admin chỉnh quota từng tài khoản

**Branch:** `codex/account-quota-overrides`; depends Task 1.

**Files:** create `backend/src/routes/accountQuotas.ts`, `backend/src/__tests__/account-quotas.test.ts`, `frontend/features/admin/AccountQuotaDialog.tsx`, `frontend/features/admin/AccountQuotaDialog.test.tsx`, `frontend/features/admin/quotasApi.ts`; modify `backend/src/index.ts`, `frontend/features/admin/AdminAccountsPage.tsx`.

**Consumes:** getEffectiveQuotas, QuotaChange. **Produces:** three admin endpoints in spec + dialog.

- [x] Test fail trước: non-admin 403, user ID khác không vượt quyền, unknown metric/negative/fraction/past expiry 400; set tutor 500 với used=40 giữ used; reset về 200; hai admin expectedVersion=1 chỉ một update; audit lỗi thì quota không đổi.
- [x] Chạy `pnpm --filter @scipal/api test -- src/__tests__/account-quotas.test.ts`.
- [x] Implement `updateAccountQuotas(actorId, targetId, expectedVersion, changes: QuotaChange[], reason): Promise<{ version: number; quotas: EffectiveQuota[] }>` trong repository + route; auth role kiểm server, không dựa RequireAdmin UI.
- [x] Viết/chạy test UI trước: Theo gói/giá trị 0/set/reset, cảnh báo hạ dưới usage, ngày giờ, lỗi 409, keyboard focus, error không báo lưu thành công.
- [x] Dựng dialog bằng primitives có sẵn; loading/error/dirty state, audit phân trang. Không thêm nút reset usage hoặc sửa giá.
- [x] Run `pnpm --filter @scipal/web test -- features/admin/AccountQuotaDialog.test.tsx`; QA admin/student và hai cửa sổ cùng sửa, full gate, commit và PR.

## Task 3 / PR 3: Hạn mức Tutor và lượt thi có chấm điểm

**Branch:** `codex/student-metering`; depends Task 1.

**Files:** modify `backend/src/routes/tutor.ts`, `backend/src/tutor/limits.ts`, `backend/src/routes/exam.ts`, `frontend/features/ai-tutor/api.ts`, `frontend/features/ai-tutor/streamTutor.ts`, `frontend/features/ai-tutor/useTutorChat.ts`, `frontend/features/exam/ExamRunner.tsx`; create `backend/src/billing/examAttempts.ts`, `backend/src/__tests__/billing-metering.test.ts`, migration `20260928210000_billing_exam_attempts.sql`; extend existing tutor/exam tests.

**Consumes:** atomic quota reservations. **Produces:** server metering + durable exam attempts.

- [x] Tests fail: Free Tutor lần 11 trả 429; Plus lần 201 trả 429; provider/stream lỗi không trừ; xóa chat không trả lại lượt đã thành công; retry operation không đếm lại; daily global off/limit vẫn chặn và có error riêng.
- [x] Tests fail: Free thi chấm điểm lần 4 trả 429; hai submit cùng attempt có một result/quota charge/XP grant; chặn attempt thuộc user khác hoặc đáp án chứa question ngoài đề; lỗi ghi result rollback.
- [x] Run `pnpm --filter @scipal/api test -- src/__tests__/billing-metering.test.ts src/__tests__/tutor-chat.test.ts src/__tests__/exam.test.ts`.
- [x] Implement Tutor reserve trước provider, commit sau persist complete answer, release lỗi/cancel; done phát sau commit; no count-by-message cho quota thương mại; atomic daily guard + monthly ledger.
- [x] Add `POST /api/exam/:blueprintId/attempts` auth-required và `GET /api/exam/attempts/:id` owner-only, explicit guards dù prefix exam đang public; update submit dùng attemptId. Start/resume cùng operation không tạo mới; scoring từ questions snapshot/validated blueprint server.
- [x] Viết rồi chạy test frontend cho expired session/429/resume, render usage từ DTO; không tự tính điểm hoặc reset lượt.
- [x] Backend + frontend focused tests, concurrency DB, full gate; commit và PR.

## Task 4 / PR 4: Sức chứa lớp và đề của giáo viên

**Branch:** `codex/teacher-capacity`; depends Task 1.

**Files:** modify `backend/src/routes/classes.ts`, `backend/src/routes/exams.ts`, `backend/src/routes/examImport.ts`; create `backend/src/__tests__/teacher-capacity.test.ts`, migration `20260928220000_teacher_capacity.sql`; modify relevant `frontend/features/classes/` and `frontend/features/authoring/` consumers identified at task start.

**Consumes:** effective capacity limits + authenticated owner. **Produces:** atomic create/join/reactivate and archive lifecycle.

- [ ] Failing tests: Free lớp thứ 2 bị chặn; Pro lớp thứ 11 bị chặn; thành viên thứ 51 bị chặn theo chủ lớp; hai join tranh chỗ cuối chỉ một thành công.
- [ ] Failing tests: Free đề thứ 6/Pro đề thứ 101 bị chặn qua cả tạo trực tiếp và import; status draft không né quota; archive không xóa bài làm, reactivate cần chỗ trống.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/teacher-capacity.test.ts`.
- [ ] Add archived_at và transactional RPC cho các mutation; Student quota không quyết định sức chứa lớp. Giữ quyền read/export khi downgrade. Không sửa quy trình duyệt thành tự xuất bản vì đã trả phí.
- [ ] UI archive/reactivate và quota exceeded; test lỗi không xóa dữ liệu. Run focused + SQL concurrency + full gate, commit, PR.

## Task 5 / PR group: Quyền lợi giáo viên còn thiếu trước mở bán

Thực thi từng nhánh/PR con, phụ thuộc Task 1 và 4. Đây là dependency thật, không được ghi Teacher Pro hoàn tất chỉ vì có thẻ pricing.

### 5a. Nhập file có xác nhận server — codex/teacher-import-metering

**Files:** new `backend/src/routes/importFiles.ts`, `backend/src/imports/fileReceipts.ts`, `backend/src/__tests__/import-quotas.test.ts`; modify `backend/src/routes/examImport.ts`, `frontend/features/content-import/ContentImportStudio.tsx`, `lessonDocument.ts`, `examWorkbook.ts`; new SQL cho import receipt/private temporary storage.

- [ ] Test fail: client fileCount=0 không miễn lượt; hai route import đều cần receipt owner; preview/corrupt file không trừ; retry save cùng receipt một lần; receipt A không dùng cho account B hoặc payload khác; batch lỗi không bị trừ thành công.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/import-quotas.test.ts`.
- [ ] Backend cấp upload intent tới private storage, kiểm MIME/magic/size thực, hash và parse nguồn bằng parser tái sử dụng được; xác nhận canonical import. Giữ giới hạn 10 MiB/tệp và tối đa 100 trang PDF; upload direct private storage để không vượt body limit Vercel. Không tin source hash hoặc số file do browser báo.
- [ ] `POST /api/authoring/import-files` tạo intent; `POST /api/authoring/import-files/:id/preview` trả receipt + canonical preview; import commit dùng receipt và sửa đổi được validate. Mỗi source server-verified chốt 1 lượt khi transaction lưu thành công.
- [ ] Private object dọn sau hoàn tất hoặc 24h, server parsing có resource/time limits; kiểm deploy runtime bằng tệp sát giới hạn. Nếu không đạt runtime, chốt worker riêng trước mở tính năng, không giảm giới hạn âm thầm.
- [ ] DB tests rollback/replay, focused frontend tests, full gate, commit, PR.

### 5b. AI hỗ trợ soạn bài — codex/teacher-author-ai

**Files:** new `backend/src/routes/authorAi.ts`, `backend/src/authoring/authorAiPrompt.ts`, `backend/src/__tests__/author-ai.test.ts`, `frontend/features/authoring/AuthorAiDialog.tsx` + tests; modify `backend/src/index.ts`, `frontend/features/authoring/LessonEditor.tsx`, provider options only if required to cap output.

- [ ] Test fail: Free 0 từ chối, Pro request 101 từ chối, student role từ chối dù override > 0; provider failure không charge; retry không charge lại; invalid BlockSchema không nhận kết quả.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/author-ai.test.ts`.
- [ ] `POST /api/authoring/ai-draft` nhận operationId, topic, grade, language và yêu cầu <= 8000 ký tự; tái sử dụng provider/settings hiện có, output token cap 2048 là mặc định kỹ thuật cần đánh giá chất lượng/chi phí.
- [ ] Trả các theory blocks EN/VI hợp lệ để giáo viên xem/áp dụng thủ công; không tạo đáp án thi, không auto publish. Chốt quota chỉ khi output validate + lưu kết quả để replay được.
- [ ] UI loading/error/preview/apply, không đè bài đang gõ; test trước, QA, full gate, commit, PR.

### 5c. Nghiệm thu giao bài — codex/class-assignments-readiness

- [ ] Khảo sát lại API assignments/UI trên base mới; kiểm teacher ownership, class membership, học sinh chỉ thấy bài được giao, error/empty và không gửi answer key.
- [ ] Nếu chưa có luồng thật, viết spec/plan con theo schema assignments hiện tại trước triển khai; đầu ra bắt buộc là giao bài và học sinh mở đúng bài, có test trước và full gate.
- [ ] Cho tới khi dependency này được nghiệm thu, không bật bán theo bảng quyền lợi có “giao bài”. Không mở rộng thành hệ thống LMS/báo cáo mới.

## Task 6 / PR 6: Order state machine và QR payOS

**Branch:** `codex/billing-payos`; depends Task 1.

**Files:** create `backend/src/billing/payments.ts`, `backend/src/billing/providers/payos.ts`, `backend/src/routes/billing.ts`, `backend/src/routes/billingWebhooks.ts`, `backend/src/__tests__/billing-payments.test.ts`, `backend/src/__tests__/payos.test.ts`; modify `backend/src/plugins/auth.ts`, `backend/src/index.ts`.

**Interfaces:** `createCheckout(userId, input: CheckoutInput): Promise<{ orderId: string; checkoutUrl: string; expiresAt: string }>`; `applyVerifiedPayment(event: PaymentEvent): Promise<'applied'|'duplicate'|'reconciliation'>`.

- [ ] Test fail: client amount rejected; Free không tạo order giá 0; student không mua teacher role; 39.000/390.000 snapshot đúng; duplicate idempotency không tạo link thứ hai, payload khác 409; callback signature/merchant/reference/số tiền sai không cấp gói.
- [ ] Test fail: callback lặp chỉ một grant; failed sau paid không thu hồi; callback DB failure retry thành công; order hết hạn có tiền đi đúng đối soát.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/billing-payments.test.ts src/__tests__/payos.test.ts`.
- [ ] Implement provider adapter bằng fetch/crypto hoặc official SDK khi cần, xác minh theo docs hiện hành; credentials chỉ backend. Persist order/reference trước external call; callback response theo protocol.
- [ ] Add catalog public, checkout/me/orders/transactions auth, owner checks và correct-path-only public webhook. Ghi masked metadata, không log raw request chứa token.
- [ ] Add reconciliation query job + service-auth route; khóa/lease DB, provider timeout không tạo charge mới. Trạng thái mismatch hiển thị admin, không nút paid thủ công.
- [ ] Provider fixture tests + staging E2E khi có merchant; không giả định payOS có sandbox. Full gate, commit, PR.

## Task 7 / PR 7: Thẻ VNPAY và đối soát hai phương thức

**Branch:** `codex/billing-vnpay`; depends Task 6.

**Files:** create `backend/src/billing/providers/vnpay.ts`, `backend/src/__tests__/vnpay.test.ts`; extend `billing.ts`, `billingWebhooks.ts`, `billing-payments.test.ts`; create admin reconciliation API/UI scoped files.

**Consumes/produces:** same CheckoutInput and PaymentEvent, cùng order ledger.

- [ ] Test fail: 39.000 VND truyền protocol 3.900.000; canonical query signature đúng; chỉ ReturnURL không cấp gói; IPN verified cấp một lần; người khác không đọc order.
- [ ] Test fail: trả bằng QR và thẻ cùng order -> 1 grant + khoản dư reconciliation; expiry/late payment/out-of-order không mất dấu tiền.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/vnpay.test.ts src/__tests__/billing-payments.test.ts`.
- [ ] Hosted checkout cho phương thức thẻ được merchant bật; không nhận PAN/CVV. Implement IPN response, query status; toàn bộ state transition dùng service chung Task 6.
- [ ] Admin xem đối soát và yêu cầu query server; refund qua provider chỉ sau policy/authorization phù hợp, ghi event confirmed trước điều chỉnh grant liên quan.
- [ ] VNPAY sandbox approved scenarios success/cancel/fail/duplicate, artifact che dữ liệu nhạy cảm; full gate, commit, PR.

## Task 8 / PR 8: Tự gia hạn có consent

**Branch:** `codex/billing-recurring`; depends Task 7 và merchant recurring capability.

**Files:** create `backend/src/billing/renewals.ts`, `backend/src/routes/billingRenewal.ts`, `backend/src/__tests__/billing-renewals.test.ts`; provider mandate adapter + DB migration khi contract yêu cầu; modify billing capability DTO.

- [ ] Trước code adapter: xác nhận recurring spec/version, merchant capability, create/cancel/query/status và cách retry. Nếu chưa được bật, one-time card vẫn triển khai; auto-renew capability=false và task này ghi chưa hoàn tất.
- [ ] Failing tests: không consent không charge; hai worker cùng kỳ một attempt; unknown provider result phải query trước retry; hủy ở giữa charge có state đúng; switch QR không để lịch charge cũ chạy; failure giữ paid_through cũ; yearly renewal không tăng quota tháng 12 lần.
- [ ] Run `pnpm --filter @scipal/api test -- src/__tests__/billing-renewals.test.ts`.
- [ ] Implement mandate consent/version + cancellation confirmed/pending, provider-managed schedule khi hỗ trợ; nếu merchant scheduler thì lease + unique (subscription, period), authenticated scheduler và reconciliation.
- [ ] Test tại môi trường provider đã cấp, full gate, commit, PR. Không dùng user request “cả hai” để tự đăng ký dịch vụ hoặc charge thật.

## Task 9 / PR 9: Pricing, checkout và quản lý gói

**Branch:** `codex/account-pricing`; depends Task 2–7; Task 8 optional capability.

**Files:** create `frontend/app/pricing/page.tsx`, `frontend/app/account/billing/page.tsx`, `frontend/app/checkout/[orderId]/page.tsx`, `frontend/features/billing/{PricingPage,CheckoutPage,BillingPage}.tsx`, `frontend/features/billing/billingApi.ts`, `frontend/features/billing/pricing.module.css`, tests cùng thư mục; modify `frontend/components/nav/NavBar.tsx`, `frontend/features/profile/AccountSettings.tsx`, `frontend/middleware.ts` và test liên quan.

- [ ] Failing UI tests: public pricing không buộc chọn cấp/đăng nhập, hai nhóm và chu kỳ cho đúng giá; 390.000 hiển thị trả trước năm; teacher tab không sửa role; catalog lỗi không dựng giá giả.
- [ ] Failing API/route tests: billing/checkout cần session và ownership, redirect đăng nhập chỉ nội bộ; student bị chặn teacher checkout; pending return không hiện paid; expired/429/reconciliation có thông báo EN/VI.
- [ ] Run `pnpm --filter @scipal/web test -- features/billing middleware.test.ts`.
- [ ] Implement PricingPage từ catalog; account billing từ backend; provider selector QR/thẻ với khả năng thật. Auto-renew là checkbox opt-in chỉ khi capability true.
- [ ] Poll order có timeout/backoff, dừng khi unmount/offline/terminal; nút retry không tạo đơn mới nếu chỉ kiểm trạng thái. Display đồng thời quota tháng và giới hạn vận hành ngày khi áp dụng.
- [ ] Tái sử dụng navbar/primitives/tokens/portal hiện có; preserve role menus. Không làm mới toàn site.
- [ ] Browser QA 375/768/1280/1440px, EN/VI, 4 level themes, sáng/tối, reduced motion, keyboard; snapshots và network backend thật ở staging.
- [ ] Full gate, update PROJECT_STATE, commit, PR.

## Task 10 / PR 10: Readiness, rollout và vận hành

**Branch:** `codex/billing-release-readiness`; depends Task 1–9.

**Files:** create `docs/billing-runbook.md`, `backend/scripts/reconcile-billing.ts` nếu Task 6 chưa có CLI; add targeted integration tests/QA script theo harness thực tế; update PROJECT_STATE.

- [ ] Kiểm traceability spec -> task -> test/evidence; merchant payOS/VNPAY có credentials do owner cấu hình backend, không đưa vào PR.
- [ ] Kiểm thuế/biên nhận/refund/cancel/cost AI, quyền lợi Teacher Pro còn thiếu, lịch sử user hiện có và migration chain trên DB thử nghiệm. Không áp toàn bộ migration pending remote ngoài scope.
- [ ] Feature flags catalog/checkout/enforcement tách nhau; triển khai DB trước backend trước web. Dữ liệu user cũ về Free theo role; dữ liệu vượt capacity giữ nguyên, chặn tăng thêm sau bật enforcement.
- [ ] Full `npx turbo run typecheck test lint`, rồi `npx turbo run build`; ghi test count/exit code và coverage lint thực tế. Không chạy Prettier.
- [ ] RLS/concurrency integration DB + hai callback provider + account QA thật; mock không thay live sandbox evidence.
- [ ] User duyệt merge PR, migration production và bật checkout là các hành động phát hành được xác nhận riêng. Thử tiền thật chỉ khi được cho phép.
- [ ] Runbook nêu provider outage/duplicate/overpayment/refund/chargeback, quota lease cleanup và cancellation race. Rollback tắt checkout/renewal creation, vẫn nhận callback và giữ quyền đã trả; không xóa ledger.

## Chốt trước phát hành, không cản viết code độc lập

- Merchant recurring của VNPAY và môi trường thử payOS chưa được xác nhận; Task 8 phụ thuộc external capability.
- Spec §2 có mặc định tháng lịch, đổi chu kỳ, role change và quyền Tutor của teacher/admin cần review.
- Chính sách hoàn tiền/chứng từ và hiệu quả kinh tế của quota AI cần owner chốt trước bán.
- Giao bài thật là dependency 5c có plan con khi hiện trạng chưa đủ; không coi nó đã xong.
- Tài liệu này không phải bằng chứng triển khai: mọi checkbox còn trống cho tới khi task có artifact và verification.

## Handoff

Ưu tiên thực thi trực tiếp tuần tự, bắt đầu Task 1, rồi Task 2 để admin có công cụ kiểm hạn mức; giữ checkout tắt tới khi đủ dependencies. Người dùng chưa chọn cơ chế delegation, không tự spawn agent từ tài liệu này.
