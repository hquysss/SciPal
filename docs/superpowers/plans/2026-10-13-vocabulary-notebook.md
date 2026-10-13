# Sổ từ cá nhân + IPA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thuật ngữ người học tra (bấm vào từ trong bài, hoặc dấu trang ở `/glossary`) vào "Sổ từ của tôi" lưu trên server; thẻ thuật ngữ hiện IPA.

**Architecture:** Bảng `user_terms` (RLS chỉ đọc của mình, backend ghi). Một kho client duy nhất `useSavedTerms()` (module store + `useSyncExternalStore`) phục vụ `TermMark`, `TermCard`, `GlossarySearch`: khách dùng `localStorage` như cũ, người đăng nhập dùng server, đăng nhập thì chuyển bản trong trình duyệt lên một lần. Sổ từ là chip "Đã lưu" của `/glossary`, đổi tên.

**Tech Stack:** Supabase Postgres + RLS, Fastify 4, Next.js 15 / React 19, Vitest, PGlite.

**Spec:** `docs/superpowers/specs/2026-10-13-vocabulary-notebook-design.md`

## Global Constraints

- Chữ hiển thị luôn có EN/VI; giọng văn theo `.agents/rules/02-domain-rules.md` §8 ("Chưa lưu được. Thử lại nhé." — không "Vui lòng").
- Màu chỉ qua token ngữ nghĩa (`text-ink-muted`, `text-action`…); không hex, không class màu Tailwind thô, không `dark:` (test `frontend/lib/theme/rawColors.test.ts`).
- Không `SERVICE_ROLE` trong `frontend/`, `packages/`.
- Khóa `localStorage` của khách giữ nguyên: `scipal-saved-terms` (mảng id JSON).
- `ipa`: tùy chọn, ≤ 80 ký tự, bỏ `/` ở hai đầu khi lưu; hiển thị là `/{ipa}/` với `lang="en"`.
- `POST /api/me/terms` nhận 1–200 id.
- Không thêm dependency.

## Review Focus

1. Khách đã lưu từ rồi đăng nhập, nhưng lần chuyển lên server lỗi → bản trong trình duyệt phải còn nguyên (test ở Task 3).
2. Bản trong trình duyệt có id đã bị gỡ/chưa xuất bản → bỏ qua lặng lẽ, các id còn lại vẫn lưu, và bản trong trình duyệt vẫn được xóa (Task 2, Task 3).
3. Phiên hết hạn khi bấm dấu trang (401) → dấu trang trở về trạng thái cũ và hiện lỗi, không nhảy trạng thái (Task 3, Task 5).
4. Bấm vào ghi chú riêng của giáo viên (`note`) → không gửi request nào (Task 5).
5. `DELETE` với id của người khác → chỉ xóa theo `user_id` của người gọi (Task 2).

---

### Task 1: Migration, test SQL, kiểu Database

**Files:**
- Create: `supabase/migrations/20261013120000_user_terms_ipa.sql`
- Create: `supabase/tests/user_terms_cases.sql`
- Modify: `supabase/tests/billing.sql` (thêm `\ir user_terms_cases.sql` ở cuối)
- Modify: `packages/supabase/src/types.ts` (`terms` Row/Insert/Update thêm `ipa: string | null`; thêm bảng `user_terms`)

**Interfaces:**
- Produces: cột `terms.ipa text`; bảng `public.user_terms(user_id uuid, term_id uuid, created_at timestamptz)` PK `(user_id, term_id)`; policy `"user_terms: own read"`.

- [ ] **Step 1: Viết `user_terms_cases.sql`** theo mẫu `tutor_token_cases.sql`: tạo bảng thay thế `public.subjects(id uuid primary key)` và `public.terms(id uuid primary key, subject_id uuid)` nếu chưa có (`create table if not exists`), hàm thay thế `auth.uid()` đọc `current_setting('request.jwt.claim.sub', true)`, rồi `\ir ../migrations/20261013120000_user_terms_ipa.sql`. Ca kiểm tra (raise exception khi sai):
  - service_role insert 2 dòng cho user `…0001` và 1 dòng cho `…0002`.
  - `set role authenticated; set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001'` → `select count(*) from user_terms` = 2.
  - Cùng vai trò đó, `insert into user_terms` → phải lỗi (bắt bằng `begin … exception when insufficient_privilege or others`).
  - `select ipa from terms limit 0` chạy được.
- [ ] **Step 2: Chạy, thấy lỗi** — `cd supabase/tests; node check-sql.mjs` → FAIL (file migration chưa có).
- [ ] **Step 3: Viết migration** đúng SQL trong spec, thêm `grant select on public.user_terms to authenticated;` và `grant all on public.user_terms to service_role;`.
- [ ] **Step 4: Chạy lại** — `node check-sql.mjs` → in `Existing billing SQL passed`.
- [ ] **Step 5: Cập nhật `types.ts`**, chạy `pnpm --filter @scipal/supabase typecheck` → sạch.
- [ ] **Step 6: Commit** `feat(db): user_terms notebook table and terms.ipa`.

### Task 2: Backend — `/api/me/terms` và `ipa` khi tạo thuật ngữ

**Files:**
- Modify: `backend/src/routes/terms.ts`
- Create: `backend/src/__tests__/my-terms.test.ts`
- Modify: `backend/src/__tests__/term-proposals.test.ts` (ca `ipa`)

**Interfaces:**
- Produces:
  - `POST /api/me/terms` body `{ term_ids: string[] }` → `200 { saved: string[] }`; `400` khi không phải mảng 1–200 hoặc có phần tử không phải UUID; `401 { error, error_en }` khi chưa đăng nhập.
  - `DELETE /api/me/terms/:termId` → `204`; `401` khi chưa đăng nhập; id sai định dạng → `204` (không có gì để xóa).
  - `TermInput.ipa: string | null`; `COLUMNS` thêm `ipa`.

- [ ] **Step 1: Viết test hỏng** trong `my-terms.test.ts` (dựng app như hàm `build` của `term-proposals.test.ts`, dùng `mockQuery`/`mockSupabase`):
  - `needs a signed-in user` — user null → POST và DELETE đều `401`.
  - `saves only published terms of live subjects` — bảng `terms` trả `[{ id: A, subjects: { archived_at: null } }]` cho `term_ids: [A, B]` → `200`, `json().saved` = `[A]`; `user_terms` nhận đúng 1 dòng `{ user_id: 'student-1', term_id: A }`.
  - `drops terms of an archived subject` — `subjects: { archived_at: '2026-10-01' }` → `saved` = `[]`, không insert.
  - `saving twice is fine` — insert dùng `ignoreDuplicates` (kiểm tra option được truyền vào upsert) → `200`.
  - `rejects a bad list` — `term_ids` rỗng, 201 phần tử, hoặc chứa `'x'` → `400`.
  - `deletes only the caller's row` — DELETE → `204`, builder `user_terms` được gọi `.eq('user_id', 'student-1')` và `.eq('term_id', A)`.
  - Trong `term-proposals.test.ts`: `keeps the IPA without slashes` — payload `{ ...valid, ipa: ' /ˈæl.ɡə.rɪ.ðəm/ ' }` → `insert.inserted[0].ipa === 'ˈæl.ɡə.rɪ.ðəm'`; `ipa` 81 ký tự → `400`.
- [ ] **Step 2: Chạy, thấy lỗi** — `pnpm --filter ./backend exec vitest run src/__tests__/my-terms.test.ts src/__tests__/term-proposals.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** trong `termRoutes`:
  - `requireUser` preHandler: `!getUser(request)?.id` → 401 `{ error: 'Hãy đăng nhập để lưu sổ từ.', error_en: 'Sign in to keep your word list.' }`.
  - POST: lọc qua `supabase.from('terms').select('id, subjects!inner(archived_at)').in('id', ids).eq('status', 'published')`, giữ những dòng `!isSubjectArchived(subject)`; nếu còn → `supabase.from('user_terms').upsert(rows, { onConflict: 'user_id,term_id', ignoreDuplicates: true })`. Lỗi DB → 500 `{ error: 'Chưa lưu được sổ từ.', error_en: 'The word list could not be saved.' }`.
  - DELETE: `delete().eq('user_id', user.id).eq('term_id', termId)`.
  - `readTerm`: `ipa = text(body.ipa).replace(/^\/+|\/+$/g, '').trim()`; > 80 → `{ error: 'IPA tối đa 80 ký tự.', error_en: 'IPA is up to 80 characters.' }`; lưu `ipa || null`.
- [ ] **Step 4: Chạy lại** — cùng lệnh → PASS; rồi `pnpm --filter ./backend test` → PASS.
- [ ] **Step 5: Commit** `feat(api): personal word list and term IPA`.

### Task 3: Kho sổ từ phía client

**Files:**
- Create: `frontend/features/glossary/savedTerms.ts`
- Create: `frontend/features/glossary/savedTerms.test.ts`

**Interfaces:**
- Consumes: `authoringCall` (`@/features/authoring/apiClient`), `createBrowserClient` (`@scipal/supabase`), các route của Task 2.
- Produces:
  ```ts
  export type SavedTermsState = { ids: ReadonlySet<string>; signedIn: boolean; ready: boolean };
  export function useSavedTerms(): SavedTermsState & {
    save(id: string): Promise<boolean>;   // true khi đã lưu (hoặc đã có)
    unsave(id: string): Promise<boolean>; // true khi đã bỏ
  };
  export function resetSavedTermsForTest(): void;
  ```

- [ ] **Step 1: Viết test hỏng** (`vi.mock` hai module trên; `renderHook` từ `@testing-library/react`):
  - `a guest keeps saved terms in this browser` — không có session → `save('a')` ghi `localStorage['scipal-saved-terms']` = `["a"]`, `ids.has('a')`, không gọi `authoringCall`.
  - `a signed-in learner reads the list from the server` — có session, `from('user_terms').select('term_id')` trả `[{ term_id: 'a' }]` → sau khi `ready`, `ids.has('a')`.
  - `moves the browser's terms up once on sign-in` — `localStorage` có `["a","b"]`, có session → gọi `authoringCall('/api/me/terms', 'POST', { term_ids: ['a','b'] })`; trả `{ saved: ['a'] }` → `ids` gồm `a`, khóa `localStorage` bị xóa.
  - `keeps the browser's terms when the move fails` — POST trả `{ ok: false, status: 0 }` → `localStorage` vẫn `["a","b"]`.
  - `undoes a save the server refused` — có session, POST trả 401 → `save('c')` trả `false`, `ids.has('c')` là false.
  - `unsave removes at once and calls DELETE` — `unsave('a')` → `authoringCall('/api/me/terms/a', 'DELETE')`, `ids.has('a')` false; DELETE lỗi → `a` quay lại, trả `false`.
  - `a refused id is not kept` — POST trả `{ saved: [] }` → `save('x')` trả `false`, `x` không có trong `ids`.
- [ ] **Step 2: Chạy, thấy lỗi** — `pnpm --filter ./frontend exec vitest run features/glossary/savedTerms.test.ts` → FAIL.
- [ ] **Step 3: Cài đặt** — store cấp module (`listeners` + `useSyncExternalStore`), tải lần đầu khi có subscriber đầu tiên, tải lại khi `onAuthStateChange` báo `SIGNED_IN`/`SIGNED_OUT`. Cập nhật lạc quan rồi hoàn tác khi lỗi. Đọc/ghi `localStorage` trong `try/catch` (chép `readSaved`/`writeSaved` từ `GlossarySearch.tsx` sang đây, xóa bản cũ ở Task 4).
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `feat(glossary): shared saved-terms store backed by the account`.

### Task 4: `/glossary` dùng kho mới, hiện IPA, mở sẵn sổ từ

**Files:**
- Modify: `frontend/features/glossary/termQueries.ts` (`TermItem.ipa: string | null`; select thêm `ipa`)
- Modify: `frontend/features/glossary/GlossarySearch.tsx`
- Modify: `frontend/features/glossary/GlossarySearch.test.tsx`, `frontend/features/glossary/termQueries.test.ts`

**Interfaces:**
- Consumes: `useSavedTerms()` (Task 3).

- [ ] **Step 1: Viết test hỏng** trong `GlossarySearch.test.tsx` (mock `./savedTerms`):
  - `shows the IPA next to the English term` — term có `ipa: 'ˈæl.ɡə.rɪ.ðəm'` → thấy `/ˈæl.ɡə.rɪ.ðəm/` trong phần tử `lang="en"`.
  - `names the saved chip "My words" and counts listed terms only` — `ids = {a, gone}`, danh sách có `a` → chip "Sổ từ của tôi" (VI) / "My words" (EN) đếm `1`.
  - `opens on the word list with ?filter=saved` — `window.history.replaceState(null, '', '/glossary?filter=saved')` → chip có `aria-pressed="true"`.
  - `the bookmark calls save / unsave and reports a failure` — `save` trả `false` → thấy `Chưa lưu được. Thử lại nhé.` trong `role="status"`.
  - `termQueries.test.ts`: chuỗi select có `ipa`.
- [ ] **Step 2: Chạy, thấy lỗi** — `pnpm --filter ./frontend exec vitest run features/glossary` → FAIL.
- [ ] **Step 3: Cài đặt** — thay state `saved` + `readSaved`/`writeSaved`/`toggleSaved` bằng `useSavedTerms()`; đọc `filter=saved` trong effect đang đọc `q`; IPA đặt ngay sau `<h2>` khi đang hiện tiếng Anh là chữ chính, hoặc sau từ tiếng Anh phụ khi đang ở VI; mô tả trạng thái rỗng giữ nguyên.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `feat(glossary): word list on the account, IPA on cards`.

### Task 5: Trong bài — tự lưu khi tra, IPA và dấu trang trên thẻ

**Files:**
- Modify: `frontend/components/blocks/terms/LessonTermsContext.tsx` (`LessonTerm.ipa: string | null`; `COLUMNS` thêm `ipa`)
- Modify: `frontend/components/blocks/terms/TermMark.tsx`
- Modify: `frontend/components/blocks/terms/TermCard.tsx`
- Modify: `frontend/components/blocks/terms/NoteMark.tsx` (`noteAsTerm` trả `ipa: null`)
- Modify: `frontend/components/blocks/terms/terms.test.tsx`

**Interfaces:**
- Consumes: `useSavedTerms()` (Task 3).
- Produces: `TermCard` prop mới `saveable?: boolean` (mặc định `true`; `false` cho ghi chú giáo viên).

- [ ] **Step 1: Viết test hỏng** trong `terms.test.tsx` (mock `@/features/glossary/savedTerms`):
  - `a tap saves the term` — `fireEvent.click(button)` → `save` được gọi với id thuật ngữ.
  - `hover alone does not save` — `pointerEnter` (`pointerType: 'mouse'`) + chờ 150 ms → popover mở, `save` không được gọi.
  - `a teacher's note is never saved` — `TermMark` với `note` → click → `save` không được gọi, không có nút dấu trang.
  - `the card shows the IPA and a bookmark` — `TermCard` với `ipa` → `/…/` có `lang="en"`; nút có `aria-pressed` theo `ids`; `save` trả `false` → `role="status"` có `Chưa lưu được. Thử lại nhé.` (EN: `Not saved. Try again.`).
- [ ] **Step 2: Chạy, thấy lỗi** — `pnpm --filter ./frontend exec vitest run components/blocks/terms` → FAIL.
- [ ] **Step 3: Cài đặt** — `TermMark`: trong `onClick`, khi mở mới bằng `show(true)` và không có `note` → `void save(term.id)`. `TermCard`: IPA cạnh tên tiếng Anh; nút `Bookmark`/`BookmarkCheck` (lucide, cùng kích thước `h-8 w-8` với nút nghe), nhãn `Lưu vào sổ từ: …` / `Save to my words: …` và `Bỏ khỏi sổ từ: …` / `Remove from my words: …`; `NoteMark`/`TermMark` truyền `saveable={!note}`.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `feat(lessons): looking up a term saves it to my words`.

### Task 6: Nhân viên nhập IPA, lối vào từ Profile

**Files:**
- Modify: `frontend/features/glossary/staff/api.ts` (`StaffTerm.ipa: string | null`, `TermDraft.ipa?: string`, `EMPTY_DRAFT.ipa = ''`)
- Modify: `frontend/features/glossary/staff/TermForm.tsx` (ô IPA cạnh ô từ loại, `maxLength={80}`, placeholder `ˈæl.ɡə.rɪ.ðəm`)
- Modify: `frontend/features/glossary/staff/termSheet.ts` (cột `{ key: 'ipa', header: 'IPA' }` cuối `SHEET_COLUMNS`; `headerKey` trả `'ipa'` khi `fold(header)` là `ipa`, `phienam` hoặc `pronunciation`; `EMPTY_ROW.ipa = ''`)
- Modify: `frontend/features/profile/ProfileCard.tsx` (thêm vào `LEARNING`: `{ href: '/glossary?filter=saved', label: { vi: 'Sổ từ của tôi', en: 'My words' }, hint: { vi: 'Thuật ngữ đã tra', en: 'Terms you looked up' }, Icon: BookmarkCheck }`)
- Test: `frontend/features/glossary/staff/termSheet.test.ts`, `frontend/features/glossary/staff/staff.test.tsx`, `frontend/features/profile/ProfileCard.test.tsx`

- [ ] **Step 1: Viết test hỏng:**
  - `termSheet`: `headerKey('IPA') === 'ipa'`, `headerKey('Phiên âm') === 'ipa'`; file có cột IPA → dòng có `ipa`; file không có cột IPA vẫn đọc như cũ.
  - `staff.test.tsx`: điền ô IPA rồi lưu → `createTerm` nhận `ipa`.
  - `ProfileCard.test.tsx`: thêm `'/glossary?filter=saved'` vào danh sách href (HTML: `href="/glossary?filter=saved"`).
- [ ] **Step 2: Chạy, thấy lỗi** — `pnpm --filter ./frontend exec vitest run features/glossary/staff features/profile` → FAIL.
- [ ] **Step 3: Cài đặt** theo các dòng Files ở trên.
- [ ] **Step 4: Chạy lại** → PASS.
- [ ] **Step 5: Commit** `feat(glossary): IPA in the term form and sheet; My words in profile`.

### Task 7: Kiểm tra toàn bộ, QA trình duyệt, ghi trạng thái

**Files:**
- Modify: `PROJECT_STATE.md` (mục Completed ngày 13/10)

- [ ] **Step 1:** `pnpm typecheck` → 7/7; `pnpm test` → mọi task pass; `cd supabase/tests; node check-sql.mjs` → passed; `git grep -n SERVICE_ROLE -- frontend packages` → không có kết quả.
- [ ] **Step 2: QA trình duyệt** (dev server qua `preview_start`, Supabase local hoặc dữ liệu mock): mở một bài có thuật ngữ → bấm từ → popover có IPA (nếu có) và dấu trang đã bật; mở `/glossary?filter=saved` → từ đó có trong "Sổ từ của tôi"; bỏ lưu → biến mất. Khách: lưu ở `/glossary`, tải lại vẫn còn. Xem ở 1280px và 375px, sáng và tối; không tràn ngang. Chụp ảnh làm bằng chứng.
- [ ] **Step 3:** Ghi vào `PROJECT_STATE.md`: đã làm gì, migration `20261013120000_user_terms_ipa.sql` CHƯA áp, thứ tự triển khai (migration trước frontend), còn thiếu IPA cho thuật ngữ cũ.
- [ ] **Step 4: Commit** `docs: project state for the word list`.
