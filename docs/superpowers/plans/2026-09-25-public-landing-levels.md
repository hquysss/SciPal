# SciPal Public Landing and Education Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nâng landing SciPal thành trải nghiệm sổ tay khoa học ba cấp, bắt buộc chọn cấp trước khi xem trang chủ, dùng học liệu thật và cho đổi cấp trong Profile với đồng bộ tài khoản.

**Architecture:** `/` là server page xác minh phiên và đọc `profiles.preferred_education_level` cho tài khoản, cùng catalog `subjects` và trạng thái bài học đã xuất bản. Lựa chọn khách nằm trong `sessionStorage` của tab hiện tại. Khi chưa có cấp hợp lệ, chỉ render cổng chọn; khi đã chọn, render landing có bố cục chung và nội dung theo cấp. Route web chỉ ghi preference tài khoản qua RLS; navbar luôn hiện với một switch EN/VI. Môn của Tiểu học/THCS là dữ liệu `upcoming`, không tạo route học giả.

> **Final persistence/navbar amendment — 2026-09-26:** The original checked task steps below record the initial cookie/device design. The correction in this amendment is authoritative: accounts persist education level only in `profiles.preferred_education_level`; guests use tab-scoped `sessionStorage` and lose the choice when that tab closes. No education-level cookie or `localStorage` is written. Legacy `scipal_education_level` cookies are expired by middleware. The navbar and its single EN/VI switch remain visible on the level gate; no duplicate language switch appears in the gate or hero. Automatic navbar prefetch is disabled on `/` to avoid fetching unrelated route bundles before the visitor chooses a path. See Task 11 and `.superpowers/qa/public-landing/navbar-session-performance.md` for implementation and evidence.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, CSS Modules, `@scipal/hooks`, `@scipal/ui`, Supabase Postgres/RLS, Vitest đã có trong monorepo, trình duyệt để QA.

**Spec:** `docs/superpowers/specs/2026-09-25-public-landing-field-notebook-design.md`

## Approved scope amendment — 2026-09-26

- Mỗi cấp có catalog riêng, đủ rộng và phù hợp cấp học; không dùng lại các hàng môn của cấp khác. Mỗi cấp có ít nhất năm nhóm môn; môn Tiểu học/THCS vẫn `upcoming` cho tới khi có bài thật và route hỗ trợ.
- Theme của cấp được chọn áp dụng cho cả landing và navbar. Màu môn chỉ nằm trong phạm vi card có route hỗ trợ.
- Các môn có trọng lượng ngang nhau. Bỏ panel Tin học nổi bật, CTA hero chỉ dẫn tới Tin học và CTA mời cấp nhỏ xem thử nội dung Tin học. Tin học là một card THPT bình thường; chỉ mở khi có bài đã xuất bản và route hỗ trợ.
- Ví dụ Tutor nói về một câu hỏi khoa học tự nhiên chung, không riêng Tin học. Giữ ghi chú câu trả lời chuẩn bị sẵn và nhịp animation đã duyệt.
- Các quyết định này thay thế câu chữ Task 6–7 mâu thuẫn bên dưới; tài khoản lưu cấp trong Profile, khách giữ lựa chọn trong tab hiện tại, kiểm tra học liệu công khai, song ngữ và các bất biến dự án vẫn giữ nguyên.

## Global Constraints

- Giữ ba giá trị `primary | lower_secondary | upper_secondary`; `null` bắt buộc hiện cổng chọn, không mặc định THPT và không có nút bỏ qua.
- Tiểu học/THCS có danh mục đúng cấp nhưng mọi môn là `upcoming`; chỉ `/informatics` của THPT được gọi “Sẵn sàng” khi có bài `published = true` và route đang mở.
- Mỗi chuỗi UI mới có `{ en, vi }`; dùng `useLanguage()`. Dữ liệu tên môn EN/VI ở DB. Không tạo AI trực tiếp, điểm/XP, bài học, lời chứng thực hay kết quả khảo sát giả.
- Không đưa `--accent` lên `:root`; `SubjectProvider` chỉ bọc môn có route được hỗ trợ. Token cấp học đặt trong phạm vi landing. Giữ nội dung/hành vi navbar sau khi chọn và mọi route công khai hiện có.
- Khách lưu cấp trong `sessionStorage` của tab hiện tại đến khi đóng tab; không ghi cookie hoặc `localStorage`. Tài khoản chỉ lưu `profiles.preferred_education_level` qua phiên thật/RLS. Không dùng service-role hoặc AI key ở frontend; ghi DB lỗi thì không báo lưu thành công hoặc đổi lựa chọn.
- Navbar luôn hiện ở gate và landing với switch EN/VI duy nhất; không tạo switch trùng trong gate/hero. Các liên kết navbar không prefetch tự động trên `/`.
- Không áp migration vào DB đang dùng hay deploy trong bước viết code nếu chưa có bước duyệt triển khai riêng. Giữ mọi thay đổi không liên quan trong worktree.
- QA tại `320`, `390`, `768`, `1024`, `1440px`, phóng chữ 200%, bàn phím, reduced motion; vùng chạm tối thiểu `44×44px`, chữ thường `4.5:1`, UI/chữ lớn `3:1`, CLS `<= 0.1`.
- Chỉ chạy test cho luồng đổi cấp, trạng thái học liệu, khảo sát và build/typecheck web cùng package type liên quan; ghi lỗi có sẵn riêng. Đo trước/sau trên cùng production build và cấu hình, ít nhất ba lần lấy median cho khách mới và khách quay lại.

## Review Focus

1. Tài khoản không có preference hoặc tab khách mới: hiện cổng chọn; giá trị sessionStorage sai trở về cổng; legacy cookie không khôi phục lựa chọn. Navbar và switch EN/VI vẫn hiện đúng một lần.
2. Preference tài khoản chỉ lấy từ DB và ghi Profile thất bại phải giữ giá trị trước đó; khách chỉ giữ lựa chọn trong tab hiện tại. Không cookie hóa hoặc chuyển lựa chọn khách thành preference tài khoản.
3. Catalog môn lỗi so với rỗng: test Task 4 và QA Task 7 phải có hai trạng thái riêng, không biến lỗi thành “sắp ra mắt”.
4. Tin học `active` nhưng không có bài xuất bản hoặc route chưa mở: test Task 4 và QA Task 6–7 không được hiện CTA “Bắt đầu học”.
5. Chọn cấp bằng bàn phím, giảm chuyển động và marquee bản sao: QA Task 5/7/9 phải bảo toàn focus, transcript và chỉ một bộ thẻ trong accessibility tree.

## File Map

| Trách nhiệm | Files |
|---|---|
| Schema và dữ liệu môn | `supabase/migrations/20260925124223_landing_education_levels.sql`, `supabase/seed/subjects.sql`, `packages/supabase/src/types.ts`, `packages/supabase/src/__tests__/client.test.ts` |
| Giá trị cấp, cookie, ghi sở thích | `frontend/features/landing/educationLevel.ts`, `frontend/features/landing/educationLevel.test.ts`, `frontend/app/api/preferences/education-level/route.ts` |
| Đọc catalog và học liệu công khai | `frontend/features/landing/getLandingData.ts`, `frontend/features/landing/getLandingData.test.ts`, `frontend/app/page.tsx` |
| Cổng chọn bắt buộc | `frontend/features/landing/LevelGate.tsx`, `frontend/features/landing/level-gate.module.css`, một rule có phạm vi trong `frontend/app/globals.css` để ẩn root navbar chỉ khi gate hiện |
| Landing theo cấp | `frontend/features/landing/LandingPage.tsx`, `TutorDemoCard.tsx`, `landing.module.css`, `frontend/features/subjects/SubjectGrid.tsx`, `subject-grid.module.css`, `subjectAvailability.ts`, `packages/ui/src/SubjectProvider.tsx` |
| Profile và khảo sát | `frontend/app/profile/page.tsx`, `frontend/features/profile/AccountSettings.tsx`, `ProfileCard.tsx`, `frontend/features/survey/DemandPollBanner.tsx`, `SubjectDemandModal.tsx` |
| Test runner và handoff | `frontend/package.json`, `frontend/vitest.config.mts`, `pnpm-lock.yaml`, `PROJECT_STATE.md` sau khi triển khai và QA |

## Execution Preflight

- Đọc spec và `AGENTS.md`/bốn file `.agents/rules`, `PROJECT_STATE.md`; kiểm tra `git status --short`, không hoàn nguyên sửa đổi của người khác.
- Ghi baseline `/` và `/profile` trước UI edit. Dùng cùng production build, viewport và network profile cho ba lượt trước/sau; ghi LCP, CLS, JS/ảnh transfer, số request và ảnh chụp desktop/mobile. Local/auth fixture không phải bằng chứng production.
- Migration hiện hành kết thúc ở `0006`; tạo migration bằng `pnpm exec supabase migration new landing_education_levels` (CLI 2.117.0 tạo `20260925124223_landing_education_levels.sql`) để không va với plan chưa triển khai có tên `0007_*`. `supabase/full_schema_and_seed.sql` là snapshot cũ 0001–0005, không dùng làm bằng chứng schema đang chạy. Kiểm tra linked history và chạy `pnpm exec supabase db push --dry-run --linked --skip-vault`; CLI help cho biết push cập nhật Vault trước migrations theo mặc định, nên `--skip-vault` giữ preflight không có side effect. Không in URL/key hoặc áp migration ở preflight.

---

### Task 1: Schema cấp học và catalog môn theo dữ liệu

**Files:** Create `supabase/migrations/20260925124223_landing_education_levels.sql`; modify `supabase/seed/subjects.sql`, `packages/supabase/src/types.ts`, `packages/supabase/src/__tests__/client.test.ts`.

**Interfaces:** Produces the shared `EducationLevel` type plus `subjects.education_level` (non-null, default `upper_secondary`) and `profiles.preferred_education_level` (nullable), all constrained to the three literal values. Existing `subjects` rows remain THPT; new slugs in seed remain `upcoming`.

- [x] **Step 1: Write the type contract first and confirm RED.** Add `education_level: 'upper_secondary'` to the `SubjectRow` fixture and a `TablesUpdate<'profiles'>` fixture with `preferred_education_level: 'primary'`; run `pnpm --filter @scipal/supabase typecheck`. Expected: TypeScript rejects the two new fields until `types.ts` is extended. The baseline also reports the existing lesson fixture missing four `0006` review fields; confirm these are unchanged in `HEAD` before addressing them in Step 2.

- [x] **Step 2: Add the additive migration and matching DB types.** The empty migration was generated with `pnpm exec supabase migration new landing_education_levels` under the Supabase CLI skill's migration workflow. Preserve existing IDs, slugs, topics and lessons. Add the migration SQL:

```sql
ALTER TABLE public.subjects
  ADD COLUMN education_level text NOT NULL DEFAULT 'upper_secondary'
  CHECK (education_level IN ('primary', 'lower_secondary', 'upper_secondary'));

ALTER TABLE public.profiles
  ADD COLUMN preferred_education_level text
  CHECK (preferred_education_level IN ('primary', 'lower_secondary', 'upper_secondary'));

CREATE INDEX subjects_education_level_sort_order_idx
  ON public.subjects (education_level, sort_order);
```

Update `packages/supabase/src/types.ts` so `subjects.Row/Insert/Update.education_level` is a three-value union (`Insert`/`Update` optional), and `profiles.Row/Insert/Update.preferred_education_level` is the same union plus `null` where the DB column is nullable. Use column order `(slug, name_en, name_vi, accent_color, icon, status, sort_order, education_level)` in seed data; values derive from the user's local reference, not a claim that lessons exist. In the existing lesson fixture, add `created_by: null`, `review_status: 'approved'`, `reviewed_by: null`, and `reviewed_at: null` to match migration `0006` types. Run `pnpm --filter @scipal/supabase typecheck`; expected: pass.

- [x] **Step 3: Extend the seed data and verify the package.** Keep the five old rows with `education_level = 'upper_secondary'`; add five level-specific rows for each younger level with `status = 'upcoming'`, distinct slugs and `ON CONFLICT (slug) DO NOTHING`. Never set their status to active in this task.

```sql
('primary-math', 'Mathematics', 'Toán', '#8A3E1F', '∑', 'upcoming', 0, 'primary'),
('primary-informatics-technology', 'Informatics and Technology', 'Tin học và Công nghệ', '#8A3E1F', '</>', 'upcoming', 1, 'primary'),
('primary-nature-society', 'Nature and Society', 'Tự nhiên và Xã hội', '#8A3E1F', '◎', 'upcoming', 2, 'primary'),
('primary-science', 'Science', 'Khoa học', '#8A3E1F', '◌', 'upcoming', 3, 'primary'),
('primary-stem-exploration', 'STEM Exploration', 'Khám phá STEM', '#8A3E1F', '✳', 'upcoming', 4, 'primary'),
('lower-math', 'Mathematics', 'Toán', '#245398', '∑', 'upcoming', 0, 'lower_secondary'),
('lower-natural-science', 'Natural Science', 'Khoa học tự nhiên', '#245398', '⚛', 'upcoming', 1, 'lower_secondary'),
('lower-informatics', 'Informatics', 'Tin học', '#245398', '</>', 'upcoming', 2, 'lower_secondary'),
('lower-technology', 'Technology', 'Công nghệ', '#245398', '⚙', 'upcoming', 3, 'lower_secondary'),
('lower-stem-projects', 'STEM Projects', 'Dự án STEM', '#245398', '✳', 'upcoming', 4, 'lower_secondary')
```

Run `pnpm --filter @scipal/supabase exec vitest run src/__tests__/client.test.ts`, `pnpm --filter @scipal/supabase typecheck`, and `pnpm exec supabase db push --dry-run --linked --skip-vault`. Expected: focused test/typecheck pass; dry-run lists this migration pending and applies nothing remotely. If dry-run reports schema drift, record the exact mismatch and leave remote unchanged. Review `git diff --check`.

### Task 2: Cấp học, cookie và thứ tự nguồn dữ liệu

**Files:** Create `frontend/features/landing/educationLevel.ts`, `educationLevel.test.ts`, `frontend/vitest.config.mts`; modify `frontend/package.json`, `pnpm-lock.yaml`.

**Interfaces:** Re-exports `EducationLevel` from `@scipal/supabase`, and produces `LEVEL_COOKIE = 'scipal_education_level'`, `parseEducationLevel(value: unknown): EducationLevel | null`, `resolveEducationLevel(account: EducationLevel | null, device: EducationLevel | null): { level: EducationLevel | null; source: 'account' | 'device' | 'none' }`, and `persistSelection(level: EducationLevel, scope: 'device' | 'account', persistAccount: () => Promise<void>, writeCookie: (level: EducationLevel) => void): Promise<void>`. Tasks 3–9 import these exact names.

- [x] **Step 1: Add Vitest already used elsewhere in the monorepo to the web package.** Add script `"test": "vitest run"`, dev dependency `"vitest": "^5.0.1"`, and a `frontend/vitest.config.mts` with `environment: 'node'`. Update the lockfile with `pnpm install --lockfile-only`; do not add a UI test framework.

- [x] **Step 2: Write focused tests first.** The contract tests include invalid input, account precedence, device fallback, failed account write leaving the cookie unchanged, and account cookie persistence ordering:

```ts
expect(parseEducationLevel('thpt')).toBeNull();
expect(parseEducationLevel('primary')).toBe('primary');
expect(resolveEducationLevel('upper_secondary', 'primary')).toEqual({ level: 'upper_secondary', source: 'account' });
expect(resolveEducationLevel(null, 'lower_secondary')).toEqual({ level: 'lower_secondary', source: 'device' });
const writeCookie = vi.fn();
await expect(persistSelection('primary', 'account', async () => { throw new Error('DB offline'); }, writeCookie)).rejects.toThrow('DB offline');
expect(writeCookie).not.toHaveBeenCalled();
```

- [x] **Step 3: Implement the smallest typed contract; rerun tests.** Use only the three literals; `null` always resolves to `{ level: null, source: 'none' }`. The save helper awaits account persistence before calling `writeCookie`; device scope calls only `writeCookie`. Call this helper from Task 3 so the order is enforced in one place. Run `pnpm --filter @scipal/web exec vitest run features/landing/educationLevel.test.ts` and `pnpm --filter @scipal/web typecheck` (record any pre-existing TS errors separately).

```ts
export async function persistSelection(
  level: EducationLevel,
  scope: 'device' | 'account',
  persistAccount: () => Promise<void>,
  writeCookie: (level: EducationLevel) => void,
): Promise<void> {
  if (scope === 'account') await persistAccount();
  writeCookie(level);
}
```

### Task 3: Một đường ghi cấp học cho khách và tài khoản

**Files:** Create `frontend/app/api/preferences/education-level/route.ts` and `route.test.ts`; reuse Task 2 contract.

**Interfaces:** `POST /api/preferences/education-level` accepts `{ level: EducationLevel, scope: 'device' | 'account' }` as JSON and equivalent form fields. Successful JSON returns `{ level, scope }`; successful form submission redirects `303` to `/#landing-title`. JSON validation/auth/DB failures use `400`/`401`/`500`. Form failures redirect `303` to `/?chooseLevel=1&saveError=1`, which displays an alert; neither failure path changes the level cookie. The response still carries any Supabase auth-cookie refreshes.

- [x] **Step 1: Write route tests for the boundary.** Mock the Supabase client boundary. Assert `400` for `level='thpt'`, device mode writes one `scipal_education_level` cookie without DB access, authenticated account mode updates only `{ preferred_education_level: level }` with `.eq('id', user.id)`, and a rejected update returns JSON `500` with no new level cookie. Submit a form body `level=primary&scope=account` with a rejected update and assert `303`, `Location: /?chooseLevel=1&saveError=1`, and no new level cookie. Verify refreshed Supabase cookies are returned with the response, and reject a mismatched Origin before creating a client. Use this JSON fixture:

```ts
new Request('http://localhost/api/preferences/education-level', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ level: 'primary', scope: 'account' }),
});
```

- [x] **Step 2: Implement `POST` with explicit format and status handling.** Validate the parsed level and scope before any write. Device mode does not call Supabase. Account mode uses the request's Supabase cookies, `auth.getUser()` (not `getSession()` as authorization), and an RLS-constrained `profiles` update with `.select('id').single()` so a missing profile is an error. Apply pending auth-cookie refreshes to whichever response is returned. Only after account success set `scipal_education_level` with `path: '/'`, `sameSite: 'lax'`, `maxAge: 31536000`, and `secure` in production. Do not accept a user ID from request data. For a form request, map any validation/auth/save failure to the gate URL with `saveError=1`, preserving the prior cookie; for JSON, retain the matching HTTP error code. At this same-origin boundary, reject an `Origin` header that differs from the request URL origin before writing. Call `persistSelection` from Task 2 with a DB callback and response-cookie callback. Use this ordered update inside the DB callback:

```ts
const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) return failure(401);
const { error: updateError } = await supabase.from('profiles')
  .update({ preferred_education_level: level })
  .eq('id', user.id).select('id').single();
if (updateError) return failure(500);
return successWithLevelCookie(level);
```

- [x] **Step 3: Run `pnpm --filter @scipal/web exec vitest run app/api/preferences/education-level/route.test.ts` and web typecheck.** Inspect the response's Set-Cookie and status in tests; do not print actual auth cookies. Keep the route separate from Fastify because it writes only a UI preference, not scoring/AI or privileged business data.

### Task 4: Đọc catalog công khai và phân loại học liệu thật

**Files:** Create `frontend/features/landing/getLandingData.ts` and `getLandingData.test.ts`. Page composition is completed in Task 6 after the chooser has passed primitive visual QA.

**Interfaces:** Produces `LandingData` with `catalog: { kind: 'ready'; subjects: LandingSubject[] } | { kind: 'error' }`, `informatics: { kind: 'available'; lesson: LandingLesson } | { kind: 'empty' } | { kind: 'error' }`, and `classifyInformatics(subject, lesson, failed)`. `LandingSubject` has `id`, `slug`, `name_en`, `name_vi`, `icon`, `accent_color`, `status`, `sort_order`, `education_level`; `LandingLesson` has `slug`, `title_en`, `title_vi`. `getLandingData(cookieStore)` makes only anon-readable content queries.

- [x] **Step 1: Write classification tests first.** Use typed fixtures for (a) active Informatics + published lesson = available, (b) active Informatics + no published lesson = empty, (c) query failure = error, and (d) a DB row that says active while `SUBJECT_CONFIG.informatics.status` or route capability is upcoming = no available CTA. Example assertions:

```ts
expect(classifyInformatics(activeInformatics, publishedLesson, false)).toEqual({ kind: 'available', lesson: publishedLesson });
expect(classifyInformatics(activeInformatics, null, false)).toEqual({ kind: 'empty' });
expect(classifyInformatics(activeInformatics, null, true)).toEqual({ kind: 'error' });
```

- [x] **Step 2: Query only public fields.** In `getLandingData`, select `id,slug,name_en,name_vi,icon,accent_color,status,sort_order,education_level` from `subjects`, ordered by level and `sort_order`. Once the `informatics` row is found, select `slug,title_en,title_vi` from `lessons` with `subject_id = informatics.id`, `published = true`, `.order('sort_order', { ascending: true }).limit(1).maybeSingle()` so the preview is stable. Do not select `blocks`, `questions`, answer keys or user data. Check `error` before interpreting `data ?? []`; if the catalog query fails, return `catalog.error` and `informatics.error`. Keep successful empty catalog separate from error.

- [x] **Step 3: Compose `/` after the chooser primitive passes visual QA.** In Task 6, read the `scipal_education_level` cookie, verify Supabase user with `auth.getUser()` before reading `profiles.preferred_education_level` for that user, then call `resolveEducationLevel(account, device)`. A missing/failed profile read may use the device cookie but must mark its `source: 'device'`; do not reuse `getUserProfile`'s demo fallback. Read public catalog independently. Export accurate page metadata and `dynamic = 'force-dynamic'`. Render `LevelGate` only when `level === null` or `searchParams.chooseLevel === '1'`; otherwise render `LandingPage` with selected level and data. The `?chooseLevel=1` URL is how the landing's “Đổi cấp học” control reopens the gate without modifying navbar links. **Ruling:** page composition moves behind Task 5's primitive showcase and visual QA, required by the frontend design workflow; the cost is that `/` remains on its current entry component until Task 6.

- [x] **Step 4: Run `pnpm --filter @scipal/web exec vitest run features/landing/getLandingData.test.ts` and web typecheck.** With the migration unapplied, local live queries may return `42703` for `education_level`; report that as an expected rollout dependency, not as an empty catalog. Do not call `/informatics` available merely because `SUBJECT_CONFIG` says active.

### Task 5: Cổng chọn bắt buộc, một lần chọn để mở landing

**Files:** Create `frontend/features/landing/LevelGate.tsx`, `level-gate.module.css`; modify `frontend/app/globals.css` with one selector scoped to gate state. May adjust `frontend/app/page.tsx` only to pass `isAuthenticated`, current value, error flag and Informatics status.

**Interfaces:** `LevelGate({ currentLevel, isAuthenticated, informatics, saveError })` renders a single `h1`, three form buttons with `name="level"` and values from `EducationLevel`, plus hidden `scope` (`account` when authenticated, `device` otherwise). It posts to Task 3 route; successful form POST redirects to `/#landing-title`, with no extra confirmation step.

- [x] **Step 1: Render only the chooser for `null` or explicit reselect.** The card labels are `Tiểu học / Primary · Lớp 1–5`, `THCS / Lower secondary · Lớp 6–9`, `THPT / Upper secondary · Lớp 10–12`. The first two say “Sắp ra mắt” / “Coming soon”; THPT says “Sẵn sàng” only for `informatics.kind === 'available'`, otherwise use the actual empty/error wording. No skip control, no THPT direct link, no lesson preview beneath the gate. Native `<form method="post" action="/api/preferences/education-level">` makes selecting work without client JavaScript.

- [x] **Step 2: Keep navbar behavior intact after selection and remove it from the gate state.** Since the root layout renders `<header>` before the page, add only this scoped rule in `globals.css`:

```css
body:has([data-scipal-level-gate]) > header { display: none; }
```

The gate root carries `data-scipal-level-gate`. This changes no navbar link, auth check or mobile menu; test the selector in each supported browser. If it fails on a supported browser, use a page-local visibility prop on `NavBar` with a server-derived gate state instead of leaving a focusable hidden link.

- [x] **Step 3: Build the gate visual and focus behavior.** Use Be Vietnam Pro, three large grade-number cards, existing logo asset, and a neutral introductory palette; no emoji as the card's main icon. Give every card a visible focus ring and minimum 44×44 hit area. After redirect to `/#landing-title`, the landing heading has `tabIndex={-1}` and a one-time effect focuses it when the hash matches; strip the fragment after focus if navigation history would otherwise be noisy. A form save error returns to `/?chooseLevel=1&saveError=1` with an `role="alert"` message, while retaining the old cookie value.

- [x] **Step 4: Run manual first-visit QA on a clean browser profile.** Check `null`/invalid cookie, all three choices, browser Back, reselect from landing, keyboard only, screen-reader landmark order, JS disabled native form, `320px` and `200%` text. On the gate, the root navbar and lesson CTAs must be absent from visual and accessibility trees; direct `/informatics` URL remains public as specified.

### Task 6: Ba biến thể hero và sổ tay học tập

**Files:** Modify `frontend/app/page.tsx`, `frontend/features/landing/LandingPage.tsx`, `TutorDemoCard.tsx`, `landing.module.css`; read `frontend/app/layout.tsx` only for already loaded fonts.

Interfaces: LandingPage uses data-level on its root. Every level has its own landing and peer-level catalog; the selected palette also themes the navbar. Hero actions lead to the selected catalog, and no subject is singled out as SciPal’s identity.

- [x] **Step 1: Replace repeated feature/step-card arrays with a subject-neutral learning journey.** Use three beats: a scientific question, a bilingual observation/evidence/explanation excerpt, and glossary lookup. Do not frame Informatics as the recommendation or lead preview. Each new string uses the EN/VI language helper; simultaneous bilingual excerpt lines carry the matching language attribute. Preserve the footer contact links; do not render an editable chat field or live-online badge.

- [x] **Step 2: Scope theme tokens to the landing root.** Keep the common paper/card type scale, then apply the approved per-level values from spec §4. The essential CSS contract is:

```css
.page[data-level='primary'] { --landing-paper: #FFF8EF; --landing-ink: #35271E; --landing-muted: #5E493B; --landing-line: #E6D2BD; --landing-action: #8A3E1F; }
.page[data-level='lower_secondary'] { --landing-paper: #F3F7FD; --landing-ink: #1D2C45; --landing-muted: #415571; --landing-line: #D4E0F0; --landing-action: #245398; }
.page[data-level='upper_secondary'] { --landing-paper: #F7F8F3; --landing-ink: #17251D; --landing-muted: #4B6052; --landing-line: #D8E5DC; --landing-action: #0C633B; }
```

Use warm cut-paper geometry for Tiểu học, measured modular lines for THCS, and a scientific-inquiry sketch for THPT. Apply each selected level palette to the landing and root navbar. Keep mobile content order text/action then notebook panel.

- [x] **Step 3: Preserve Tutor timing without privileging Informatics.** Use a general science-inquiry transcript. It auto-plays once when visible, retains all turns afterward, has no replay button or “Hội thoại minh họa” label, and always shows the prepared-answer disclosure. Reduced motion renders all turns immediately; younger levels do not present THPT materials as their own.

- [x] **Step 4: Inspect production-rendered desktop/mobile screenshots for all three levels.** Check no layout overflow, distinct but coherent themes, actual CTA targets, readable disclosure, contrast against real surfaces, and no misleading THPT lesson label under a younger-level heading. Run web typecheck; record baseline errors without expanding scope.

### Task 7: Môn học theo cấp và CTA chỉ mở khi có bài

**Files:** Modify `frontend/features/subjects/SubjectGrid.tsx`, `subject-grid.module.css`, `packages/ui/src/SubjectProvider.tsx`, and the Task 6 `LandingPage.tsx` call site; create `frontend/features/subjects/subjectAvailability.ts`, `subjectAvailability.test.ts`; use `LandingSubject`, `LandingData` and `EducationLevel` from Tasks 2 and 4.

Interfaces: SubjectGrid accepts level, catalog and lesson availability. It renders only rows for the selected level, with equal visual weight. A real link requires a supported route and a verified published lesson; Informatics is one ordinary THPT catalog card, never a featured entry.

- [x] **Step 1: Prove the card decision with focused tests.** Add `frontend/features/subjects/subjectAvailability.test.ts` for `getSubjectAction(level: EducationLevel, subject: LandingSubject, informatics: LandingData['informatics']): string | null`. Cases: published Informatics returns `'/informatics'` for THPT; same catalog row with `informatics.empty` or `.error` returns `null`; a primary/THCS slug and every THPT upcoming slug return `null`, even when a row says `active`. Define the function in `subjectAvailability.ts` and use it in both static entry and marquee:

```ts
expect(getSubjectAction('upper_secondary', informaticsRow, { kind: 'empty' })).toBeNull();
expect(getSubjectAction('primary', primaryMathRow, availableInformatics)).toBeNull();
expect(getSubjectAction('upper_secondary', informaticsRow, availableInformatics)).toBe('/informatics');
```

Implement the route guard from the same three facts used by the lesson-state classifier:

```ts
export function getSubjectAction(
  level: EducationLevel,
  subject: LandingSubject,
  informatics: LandingData['informatics'],
): string | null {
  return level === 'upper_secondary'
    && subject.slug === 'informatics'
    && subject.status === 'active'
    && SUBJECT_CONFIG.informatics.status === 'active'
    && informatics.kind === 'available'
    ? '/informatics'
    : null;
}
```

- [x] **Step 2: Render broad, independent catalogs with equal card prominence.** Filter rows by education level and sort by sort order. Keep at least five level-specific rows for each level; every Tiểu học/THCS row stays upcoming. Do not add a featured Informatics panel, use disabled buttons as faux actions, or source display names/status from SUBJECT_CONFIG. Continue using database accent colors only for supported routes, validate six-digit hex values, and keep --accent scoped to each SubjectProvider. Add the planned SubjectProvider rendering test.

```tsx
const effectiveAccent = accentColor && /^#[0-9a-f]{6}$/i.test(accentColor)
  ? accentColor
  : getAccentColor(slug);
<SubjectContext.Provider value={{ slug, token, accentColor: effectiveAccent }}>
  <div style={{ '--accent': effectiveAccent } as React.CSSProperties}>{children}</div>
</SubjectContext.Provider>;
```

```tsx
const subjects = catalog.kind === 'ready'
  ? catalog.subjects.filter((item) => item.education_level === level)
  : [];
const href = getSubjectAction(level, subject, informatics);
return href ? <Link href={href}>{label}</Link> : <span>{comingSoonLabel}</span>;
```

- [x] **Step 3: Keep error, empty and animation semantics.** Catalog errors have a bilingual explanation and reload control; a successful empty catalog has its own state. Preserve marquee keyboard, pointer and reduced-motion behavior. Keep every subject card at equal size and visual weight; do not promote Informatics.

- [x] **Step 4: Verify this decision and the rendered list.** Run the focused subject and SubjectProvider tests plus UI typecheck. Manually check all three separate catalogs in ready, empty and error states. Inspect the accessibility tree for one copy per subject; confirm each level has its own cards and navbar palette, no subject is featured, and no unsupported subject links to a route.

> **QA status — 2026-09-26:** Focused availability/SubjectProvider tests pass. Production runtime shows five THPT cards and successful empty catalogs for Tiểu học/THCS at 390px and 1440px, with no overflow. Approved catalog fixtures cover all three level-specific card sets; the dev-only `/dev/landing-showcase?level=upper_secondary&catalog=error` fixture was manually checked in VI/EN at 390px and 1440px, including the reload control. No subject without a supported route exposes a link.

### Task 8: Đổi cấp trong Profile và bỏ định danh trường mẫu

**Files:** Modify `frontend/app/profile/page.tsx`, `frontend/features/profile/AccountSettings.tsx`, `frontend/features/profile/ProfileCard.tsx`; create `frontend/features/profile/EducationLevelSetting.tsx`. Reuse Tasks 2–3 types and route; do not derive a preference from `getUserProfile`'s demo fallback.

**Interfaces:** `EducationLevelSetting({ preference, isAuthenticated })` receives `preference: ReturnType<typeof resolveEducationLevel>` and a verified user flag from the Profile server page. It sends JSON `POST /api/preferences/education-level` with `scope: 'account'` only for a verified user, and `scope: 'device'` for a guest. Its status is `idle | saving | saved | error`. `AccountSettings` renders the new setting with these props; existing language/sign-out controls stay available.

- [x] **Step 1: Read the real preference separately from demo stats.** In `profile/page.tsx`, after `auth.getUser()`, select `preferred_education_level` from the signed-in user's `profiles` row and resolve it against the validated device cookie. On a failed DB read, use the device cookie with source `device`; on an account value, show source `account`. If there is no verified user, never show “đã đồng bộ tài khoản.” The existing page allows demo viewing; keep that access but save only to device in demo mode. Do not change `profileQueries.ts` stats logic within this landing task.

```ts
const preference = resolveEducationLevel(
  user ? parseEducationLevel(profilePreferenceData?.preferred_education_level) : null,
  parseEducationLevel(cookieStore.get(LEVEL_COOKIE)?.value),
);
```

- [x] **Step 2: Implement one clear control for three choices.** Show “Cấp học khi khám phá / Exploration level,” the current value and “Đồng bộ tài khoản / Saved to account” or “Trên thiết bị / On this device.” Each choice is at least 44×44, has `aria-pressed`, and is disabled only while saving. Do not optimistically change the selected state. On `res.ok`, set the local selected level to `nextLevel`, set status `saved`, and call `router.refresh()`; on non-2xx or network error, keep the old selection and show `role="alert"` with a retry cue. A failed account write must not set a new cookie. Example request:

```ts
const response = await fetch('/api/preferences/education-level', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ level: nextLevel, scope: isAuthenticated ? 'account' : 'device' }),
});
if (!response.ok) throw new Error(`Preference save failed: ${response.status}`);
router.refresh();
```

- [x] **Step 3: Remove only false institutional facts near the setting.** Delete `ProfileCard`'s generated `institutionalId`, `institutionalClass`, “Verified institutional account issued by school administration,” and its online check badge. Replace `AccountSettings`' institutional record block/subtitle with factual account wording; keep role only when sourced from auth/profile, not as a school verification. Leave XP/progress/streak rendering for the separate data-integrity work tracked in `PROJECT_STATE.md` and do not label demo values as verified.

- [x] **Step 4: QA guest, account and failure cases.** In `/profile`, change each level and refresh `/` to confirm the same level/theme. With an authenticated test account, save on device A, then sign in on device B and verify the account value wins over a different local cookie; use a second account to check the first account's selection is never labeled as its own synced value. Block the update request and verify the old selected control, old cookie, error alert, and no success message. Test logout: cookie remains a device preference but is labeled `device`, not `account`. If no test account is available, record cross-device sync as unverified rather than simulate it with a fabricated profile.

> **QA status — 2026-09-26:** Profile persistence and failure paths were checked with focused route/UI fixtures. No real authenticated test account or second device was available; cross-device account sync remains unverified as the step requires.

### Task 9: Khảo sát THPT nói đúng và chỉ báo thành công sau HTTP 2xx

**Files:** Modify `frontend/features/survey/DemandPollBanner.tsx`, `SubjectDemandModal.tsx`, `frontend/lib/api.ts`; add `frontend/features/survey/surveySubmission.test.ts`. `LandingPage` from Task 6 renders `DemandPollBanner` only for `upper_secondary`.

**Interfaces:** `postSurvey` resolves only for a `2xx` response; otherwise it throws. The modal has separate `idle | submitting | success | error` state and closes automatically only after `success`. THPT is the only level with the current `10/11/12` grade picker.

- [x] **Step 1: Pin the false-success bug.** Add a focused test that mocks `fetch` to return `new Response(null, { status: 500 })` and expects `postSurvey` to reject; a 204 response must resolve. Verify the failing test before touching `api.ts`:

```ts
vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
  .rejects.toThrow('survey failed: 500');
```

- [x] **Step 2: Make the network result authoritative.** In `postSurvey`, retain existing URL and headers, store the `fetch` response, then `if (!res.ok) throw new Error(`survey failed: ${res.status}`);`. In `SubjectDemandModal`, set `success` and the close timer only inside the successful `try`; `catch` sets `error`, leaves choices visible, and provides a retry button/message. Clear any pending close timer on unmount or close. The success copy says “Cảm ơn, SciPal đã nhận ý kiến” / “Thanks, SciPal received your input,” without a promise to prioritize a subject.

- [x] **Step 3: Correct the banner/modal promise and controls.** Replace “môn có lượng bình chọn cao nhất sẽ được ưu tiên” with “Bình chọn giúp SciPal hiểu môn bạn quan tâm” and an EN equivalent. Remove the visible internal `§9.7` label. Give modal a labeled dialog, focus entry/return, Escape/close button, and 44×44 choice/grade/close targets; preserve VI/EN copy and selected-state semantics with `aria-pressed`. This is part of the landing's actual poll, not a global survey redesign.

- [x] **Step 4: Run focused and manual QA.** Run `pnpm --filter @scipal/web exec vitest run features/survey/surveySubmission.test.ts`; block the survey request in a browser and assert the modal stays open with an error, then submit a successful response and assert success appears once. Confirm the poll is absent for Tiểu học/THCS, keyboard focus stays inside the open dialog, and reduced motion does not hide status text.

### Task 10: Kết hợp, kiểm định giao diện và bàn giao phát hành

**Files:** Verify all touched files; update `PROJECT_STATE.md` only after implementation and QA evidence exists. Do not apply remote migration or deploy in this task.

**Interfaces:** A single acceptance record covers first visit, all three levels, account/device precedence, Profile save, catalog/lesson states, current navbar/Tutor/marquee behavior, survey errors, accessibility and measured performance. The record distinguishes completed local code from remote rollout.

- [x] **Step 1: Run focused verification.** From repo root: `pnpm --filter @scipal/supabase exec vitest run src/__tests__/client.test.ts`, `pnpm --filter @scipal/supabase typecheck`, `pnpm --filter @scipal/ui exec vitest run src/__tests__/SubjectProvider.test.tsx`, `pnpm --filter @scipal/ui typecheck`, `pnpm --filter @scipal/web exec vitest run features/landing/educationLevel.test.ts features/landing/getLandingData.test.ts app/api/preferences/education-level/route.test.ts features/subjects/subjectAvailability.test.ts features/survey/surveySubmission.test.ts`, `pnpm --filter @scipal/web typecheck`, `pnpm --filter @scipal/web build`, and `git diff --check`. If the known React typing failures remain, compare with pre-edit baseline and identify exact unchanged diagnostics; do not call the web typecheck green. Verify the actual route starts, since package typecheck alone can miss runtime exports.

- [x] **Step 2: Inspect the rendered surfaces.** On a production build with an isolated local database that contains the migration and seed, QA `/` at `320`, `390`, `768`, `1024`, `1440px`, 200% text, VI and EN, normal and reduced motion. Check clean/invalid cookie gate, each selection, Back/reselect, actual `/informatics` link, three catalogs, no link on upcoming cards, empty/error states and retry, Profile save/error, survey error/success, navbar after selection, Tutor one-visit timing, and marquee duplicate accessibility. Check keyboard only and screen-reader landmark/focus order. If local DB cannot be started, test view states through explicit fixtures, label that evidence as fixture-backed, and leave real DB integration unverified.
- [x] **Step 2: Inspect the rendered surfaces.** On a production build with an isolated local database that contains the migration and seed, QA `/` at `320`, `390`, `768`, `1024`, `1440px`, 200% text, VI and EN, normal and reduced motion. Check clean/invalid cookie gate, each selection, Back/reselect, actual `/informatics` link, three catalogs, no link on upcoming cards, empty/error states and retry, Profile save/error, survey error/success, navbar after selection, Tutor one-visit timing, and marquee duplicate accessibility. Check keyboard only and screen-reader landmark/focus order. If local DB cannot be started, test view states through explicit fixtures, label that evidence as fixture-backed, and leave real DB integration unverified.

> **QA status — 2026-09-26:** Production build was checked at 390px and 1440px for all three levels; gate behavior was checked at 320px, 200% text, keyboard focus and no-JavaScript submission; the EN/VI toggle was exercised against the production build. Survey error/success and the gate's accessible main/no-navbar/no-lesson-link tree were observed. Catalog error/empty/ready states and retry were checked with the live page and dev fixture. Profile failure is fixture-backed; account synchronization on a second real device remains unverified because no test account was available.

- [x] **Step 3: Measure and compare.** Repeat the preflight method on the completed production build: at least three runs for first visit and returning visit using the same viewport, network and cache settings. Report median LCP and CLS, JS/asset transfer and request count before/after, plus screenshots. `CLS > 0.1`, hidden first-paint content, contrast failure or a new dead CTA blocks acceptance. Do not infer production Core Web Vitals from local lab numbers.

- [x] **Step 4: Run Impeccable once and hand off exact rollout order.** Run the same detector on `frontend/features/landing` and `frontend/features/profile`, compare the old `gradient-text` and `codex-grid-background` findings, and inspect any new warning against the rendered page. Update `PROJECT_STATE.md` with verified behaviors, commands/results, limitations and the pending remote migration/seed/deploy. Document this separate release sequence without executing it: inspect remote migration history/schema drift; apply the additive schema migration and ten upcoming seed rows; verify account write through RLS with real users; deploy frontend; smoke-test `/`, `/profile`, three choices and `/informatics`. Remote DB application and deployment require a separately authorized release step.

## Rollout and Recovery

- The migration is additive and existing `subjects` default to `upper_secondary`; `profiles.preferred_education_level` starts `null`. Seed uses `ON CONFLICT (slug) DO NOTHING`, so rerunning it does not overwrite existing subjects.
- Never deploy the new landing code before the new columns and rows are present. If a remote migration reveals drift, stop rollout and inspect the mismatch; do not patch production SQL blindly or describe a local dry-run as applied.
- If the new UI must be reverted after release, revert the frontend release first while retaining the added columns and preferences. Dropping columns would discard user choices and is not a routine rollback.

### Task 11: Sửa quyền sở hữu cấp học, giữ switch navbar và giảm tải cổng chọn

**Files:** `frontend/features/landing/educationLevel.ts`, `GuestLandingFlow.tsx`, `app/page.tsx`, `app/profile/page.tsx`, `app/api/preferences/education-level/route.ts`, `middleware.ts`, `components/nav/NavBar.tsx`, `components/nav/SubjectSwitcher.tsx`, relevant focused tests, this plan/spec, `PROJECT_STATE.md`, and the QA record.

**Final behavior:** Account preferences read/write only through the authenticated Supabase session and RLS-backed `profiles.preferred_education_level`. Guests use `sessionStorage` key `scipal_education_level_tab`; reload in that tab preserves the choice, another tab starts at the gate, and closing the tab discards it. No level cookie or `localStorage` is written; middleware expires the legacy level cookie. Navbar remains visible during the gate with the existing single EN/VI switch. A shared deferred landing boundary keeps the full landing chunk off the initial gate bundle, while navbar links disable automatic prefetch on `/`.

- [x] Focused education-level/API/middleware tests: 16/16 passed; web `tsc --noEmit` passed.
- [x] Production build passed; `/` first-load JS is 126 KB.
- [x] Manual browser QA: navbar switch updates gate copy VI/EN; guest THPT opens the landing with “Đã lưu trong tab này”; same-tab reload remains on landing; a new tab shows the gate.
- [x] Resource audit: `/` loads 32 requests and does not prefetch `/informatics`, `/glossary`, `/exam`, or `/login`.
- [x] Three-run mobile/desktop measurements and screenshots are recorded in `.superpowers/qa/public-landing/navbar-session-performance.md`. LCP varied and was slower than the earlier baseline in this run; request count returned to 32 and transfer was 2,361 B lower than baseline. Treat local lab timings as descriptive, not production CWV.
- [x] No remote migration, live authenticated account, cross-device sync, or deploy was performed; account sync on real devices remains unverified.


