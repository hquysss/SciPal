# Security & Integrity Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khôi phục nguyên tắc "server quyết định XP" và cách ly dữ liệu người dùng: chặn client tự ghi XP/tiến trình qua RLS, chống cày XP ở bài thi, thêm kiểm tra quyền cho API lớp học, ghi nhận khảo sát trung thực, và gỡ số liệu giả khỏi các trang cá nhân.

**Architecture:** Sửa ở hai tầng. (1) Database: một migration mới thay các policy `FOR ALL` bằng policy chỉ-đọc, thu hồi quyền ghi của `anon`/`authenticated` trên bảng người dùng và bảng nội dung, và phá vòng đệ quy policy lớp học bằng hàm `SECURITY DEFINER` trong schema `private`. (2) Ứng dụng: backend Fastify (dùng service role) tự kiểm tra role/quyền sở hữu ở từng route; frontend gửi token thật và hiển thị trạng thái lỗi thay vì dữ liệu demo.

**Tech Stack:** Supabase Postgres + RLS, Fastify 4 + supabase-js 2, Vitest, Next.js 15 App Router, `@scipal/hooks` (`useLanguage`).

**Spec:** Không có file spec riêng. Plan này dựa trên báo cáo khảo sát codebase ngày 26/09/2026 (tóm tắt ở mục **Background** bên dưới), cùng các quy tắc trong `AGENTS.md` và `.agents/rules/01-architecture.md`, `.agents/rules/02-domain-rules.md`.

## Background (các lỗi plan này sửa)

1. `supabase/migrations/0004_rls.sql`: `progress`, `xp_log`, `streaks`, `user_badges`, `profiles` có policy `USING (auth.uid() = user_id)` không giới hạn lệnh → áp dụng cho cả INSERT/UPDATE/DELETE. Người dùng đăng nhập có thể tự `insert` vào `xp_log` bằng anon key, và tự đổi `profiles.role`.
2. Chuỗi migration không bật RLS cho `questions`, `exam_blueprints`, `subjects`, `topics`, `terms`, `resources`, `badges` → anon có thể đọc đáp án trong `questions.data` và có thể ghi vào bảng nội dung (tuỳ trạng thái DB thật).
3. Policy `class_rooms` ↔ `class_members` tham chiếu nhau → Postgres báo "infinite recursion detected in policy" khi client truy vấn.
4. `surveys` có policy INSERT `WITH CHECK (true)` → ai cũng insert được với `user_id` tuỳ ý. Route `/api/survey` luôn trả 201 kể cả khi insert lỗi, và không bao giờ gắn user.
5. `POST /api/score/exam`: gửi trùng `question_id` được cộng nhiều lần; nộp lại bài không giới hạn; mỗi lần nộp cộng XP mới.
6. `backend/src/routes/classes.ts`: không kiểm tra role; ai cũng đọc được roster (kèm `profiles(*)`) của mọi lớp; fallback `'demo-teacher-id'`; không có `GET /api/classes`.
7. `frontend/features/classes/classQueries.ts` gọi backend không kèm token → luôn 401 → luôn hiện lớp demo; `CreateClassModal` gửi slug vào cột `uuid` và tạo lớp giả khi lỗi mạng.
8. `profileQueries.ts` / `progressQueries.ts` trả số liệu giả (350 XP…) khi truy vấn lỗi, trái quyết định 23/09 "không giả lập XP".

## Global Constraints

- Chỉ dùng `pnpm` (`pnpm@9.15.9`); **không thêm dependency mới** — mọi thứ cần dùng (`@supabase/supabase-js`, `tsx`, `vitest`) đã có.
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được tồn tại trong `backend/`. `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/` phải trả về 0 kết quả.
- Client không bao giờ được ghi trực tiếp vào `progress`, `xp_log`, `streaks`, `user_badges`.
- Không bao giờ gửi `answer`, `answer_key` hoặc `items[].correct` xuống client.
- Phân quyền chỉ dựa vào `user.app_metadata.app_role` (`student | teacher | admin`), **không** dựa vào `profiles.role`.
- Mọi chuỗi giao diện mới phải song ngữ qua `const { t } = useLanguage()` với `t({ en, vi })`.
- Backend không được import runtime từ `packages/*` (Vercel deploy với root là `backend/`).
- Không sửa alias `react` trong `mobile/tsconfig.json`.
- Docker/Podman **không có** trên máy dev → không chạy được `supabase start`/`supabase test db`. Kiểm chứng SQL bằng `supabase db push --dry-run --linked` và script `verify-rls.ts` chạy trên DB từ xa.
- **Mọi thao tác ghi lên Supabase từ xa (`supabase db push --linked`) phải được người dùng duyệt rõ ràng trong chat trước khi chạy.**
- Test chạy bằng: backend `pnpm --filter @scipal/api exec vitest run <file>`, frontend `pnpm --filter @scipal/web exec vitest run <file>`.
- File frontend có test không được dùng alias `@/` trong phần import runtime (vitest của web không cấu hình alias). Dùng đường dẫn tương đối hoặc `import type`.

## Trước khi bắt đầu (bắt buộc)

- [ ] **Người dùng commit phần việc landing đang dở** (working tree `main` hiện có ~33 file sửa và ~25 file untracked). Plan này sửa `frontend/lib/api.ts`, `frontend/app/profile/page.tsx`, `frontend/features/survey/*` — các file đang dirty. Không `stash`/`reset` hộ người dùng.
- [ ] Tạo nhánh: `git switch -c fix/security-integrity-hardening`
- [ ] Ghi baseline để so sánh (PROJECT_STATE ghi web typecheck đang lỗi TS2786/TS2322 từ trước):

```bash
pnpm turbo typecheck > "$TEMP/baseline-typecheck.txt" 2>&1; echo "exit $?"
pnpm turbo test > "$TEMP/baseline-test.txt" 2>&1; echo "exit $?"
```

Mọi task bên dưới chỉ được phép **không làm tăng** số lỗi typecheck so với baseline, và mọi test phải pass.

## Review Focus

1. **Tên policy trên DB thật khác migration** (PROJECT_STATE: policy INSERT của `surveys` có tên khác). Kỳ vọng: migration vẫn gỡ sạch mọi policy INSERT của `surveys` bất kể tên. → Task 1 dùng khối `DO` duyệt `pg_policies` theo `cmd`; `verify-rls.ts` kiểm tra anon không insert được `surveys`.
2. **Lưu cấp học ở Profile/LevelGate sau khi siết quyền `profiles`.** Kỳ vọng: người dùng vẫn cập nhật được `preferred_education_level` (route `/api/preferences/education-level` ghi qua RLS). → Task 1 cấp `GRANT UPDATE (…, preferred_education_level)`; `verify-rls.ts` có kiểm tra "user can still save education level".
3. **Học sinh mở trang có truy vấn `class_rooms`/`class_members` trực tiếp.** Kỳ vọng: không lỗi đệ quy policy. → `verify-rls.ts` select cả hai bảng bằng tài khoản học sinh.
4. **Hai lần nộp cùng một bài thi gần như đồng thời.** Kỳ vọng: chỉ một lần được cộng XP. → Task 2 thêm unique partial index; test "treats unique violation as already awarded".
5. **Khảo sát gửi kèm token hết hạn.** Kỳ vọng: vẫn lưu ẩn danh (201), không trả 401. → Task 3 test "accepts survey with an invalid token as anonymous".
6. **Giáo viên mở roster lớp của giáo viên khác bằng cách đoán id.** Kỳ vọng: 404, không lộ dữ liệu. → Task 4 test "returns 404 for another teacher's class".

---

### Task 1: Migration siết RLS + script kiểm chứng trên DB thật

**Files:**
- Create: `supabase/migrations/20260926090000_security_hardening_rls.sql`
- Create: `backend/src/__tests__/rls-migration.test.ts`
- Create: `backend/scripts/verify-rls.ts`
- Modify: `supabase/full_schema_and_seed.sql` (thêm ghi chú đầu file)

**Interfaces:**
- Consumes: bảng và cột hiện có (`profiles.preferred_education_level` từ migration `20260925124223_landing_education_levels.sql`).
- Produces: schema `private` với `private.is_class_teacher(uuid) → boolean`, `private.is_class_member(uuid) → boolean`. Bảng người dùng chỉ còn quyền SELECT cho client; `profiles` chỉ cho UPDATE ba cột `display_name`, `avatar_url`, `preferred_education_level`.

- [ ] **Step 1: Viết test guard (sẽ fail vì file migration chưa có)**

`backend/src/__tests__/rls-migration.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260926090000_security_hardening_rls.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('security hardening migration contract', () => {
  it('revokes client writes on server-authoritative tables', () => {
    for (const table of ['progress', 'xp_log', 'streaks', 'user_badges']) {
      expect(sql).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
  });

  it('only lets users update safe profile columns', () => {
    expect(sql).toContain('revoke insert, update, delete on public.profiles from anon, authenticated');
    expect(sql).toContain(
      'grant update (display_name, avatar_url, preferred_education_level) on public.profiles to authenticated',
    );
  });

  it('hides questions and exam blueprints from clients', () => {
    expect(sql).toContain('revoke all on public.questions from anon, authenticated');
    expect(sql).toContain('revoke all on public.exam_blueprints from anon, authenticated');
  });

  it('no longer uses command-less policies on user tables', () => {
    expect(sql).not.toMatch(/create policy[^;]*on public\.(progress|xp_log|streaks|user_badges|profiles)\s+using/);
  });

  it('removes every client insert policy on surveys regardless of name', () => {
    expect(sql).toContain("tablename = 'surveys'");
    expect(sql).toContain("cmd = 'insert'");
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/rls-migration.test.ts`
Expected: FAIL với `ENOENT: no such file or directory` (file migration chưa tồn tại).

- [ ] **Step 3: Viết migration**

`supabase/migrations/20260926090000_security_hardening_rls.sql`:

```sql
-- Security hardening: server-authoritative gamification, private questions,
-- non-recursive class policies, no client survey inserts.
-- Backend (service_role) bypasses RLS and is the only writer for these tables.

-- ── Helpers for class policies (break class_rooms <-> class_members recursion) ──
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_rooms
    where id = p_class_id and teacher_id = (select auth.uid())
  );
$$;

create or replace function private.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and student_id = (select auth.uid())
  );
$$;

revoke execute on function private.is_class_teacher(uuid) from public, anon;
revoke execute on function private.is_class_member(uuid) from public, anon;
grant execute on function private.is_class_teacher(uuid) to authenticated;
grant execute on function private.is_class_member(uuid) to authenticated;

-- ── Server-authoritative gamification tables: read own rows only ──
drop policy if exists "progress: own rows" on public.progress;
drop policy if exists "xp_log: own rows" on public.xp_log;
drop policy if exists "streaks: own rows" on public.streaks;
drop policy if exists "user_badges: own rows" on public.user_badges;

create policy "progress: select own" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "xp_log: select own" on public.xp_log
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "streaks: select own" on public.streaks
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_badges: select own" on public.user_badges
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.progress from anon, authenticated;
revoke insert, update, delete on public.xp_log from anon, authenticated;
revoke insert, update, delete on public.streaks from anon, authenticated;
revoke insert, update, delete on public.user_badges from anon, authenticated;

create index if not exists xp_log_user_id_idx on public.xp_log (user_id);

-- ── Profiles: read/update own row, only safe columns ──
drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, preferred_education_level) on public.profiles to authenticated;

-- ── Classes: clients read only; writes go through the backend ──
drop policy if exists "class_rooms: teacher" on public.class_rooms;
drop policy if exists "class_rooms: member" on public.class_rooms;
drop policy if exists "class_members: visible" on public.class_members;
drop policy if exists "assignments: visible" on public.assignments;

create policy "class_rooms: select teacher or member" on public.class_rooms
  for select to authenticated
  using (teacher_id = (select auth.uid()) or private.is_class_member(id));
create policy "class_members: select self or teacher" on public.class_members
  for select to authenticated
  using (student_id = (select auth.uid()) or private.is_class_teacher(class_id));
create policy "assignments: select teacher or member" on public.assignments
  for select to authenticated
  using (private.is_class_teacher(class_id) or private.is_class_member(class_id));

revoke insert, update, delete on public.class_rooms from anon, authenticated;
revoke insert, update, delete on public.class_members from anon, authenticated;
revoke insert, update, delete on public.assignments from anon, authenticated;

create index if not exists class_rooms_teacher_id_idx on public.class_rooms (teacher_id);
create index if not exists class_members_student_id_idx on public.class_members (student_id);

-- ── Content tables: public read, no client writes ──
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.lessons enable row level security;
alter table public.terms enable row level security;
alter table public.resources enable row level security;
alter table public.badges enable row level security;
alter table public.questions enable row level security;
alter table public.exam_blueprints enable row level security;

drop policy if exists "subjects: public read" on public.subjects;
drop policy if exists "topics: public read" on public.topics;
drop policy if exists "terms: public read" on public.terms;
drop policy if exists "resources: public read" on public.resources;
drop policy if exists "badges: public read" on public.badges;

create policy "subjects: public read" on public.subjects for select to anon, authenticated using (true);
create policy "topics: public read" on public.topics for select to anon, authenticated using (true);
create policy "terms: public read" on public.terms for select to anon, authenticated using (true);
create policy "resources: public read" on public.resources for select to anon, authenticated using (true);
create policy "badges: public read" on public.badges for select to anon, authenticated using (true);
-- lessons keeps its existing "lessons: published read" policy from 0006.

revoke insert, update, delete on public.subjects from anon, authenticated;
revoke insert, update, delete on public.topics from anon, authenticated;
revoke insert, update, delete on public.lessons from anon, authenticated;
revoke insert, update, delete on public.terms from anon, authenticated;
revoke insert, update, delete on public.resources from anon, authenticated;
revoke insert, update, delete on public.badges from anon, authenticated;

-- Questions hold answer keys; blueprints are served by the backend only.
revoke all on public.questions from anon, authenticated;
revoke all on public.exam_blueprints from anon, authenticated;

-- ── Surveys: only the backend inserts (policy names differ between environments) ──
do $$
declare
  pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'surveys' and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.surveys', pol.policyname);
  end loop;
end $$;

revoke insert, update, delete on public.surveys from anon, authenticated;
```

Ghi chú: test Step 1 so khớp chữ thường, còn `pg_policies.cmd` lưu `'INSERT'` chữ hoa — test kiểm tra chuỗi sau `.toLowerCase()` nên vẫn khớp.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/rls-migration.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Viết script kiểm chứng trên DB thật**

`backend/scripts/verify-rls.ts`:

```ts
/**
 * Probe live RLS with the anon key and a TEST student account.
 * Usage (bash):
 *   SUPABASE_ANON_KEY=... RLS_TEST_EMAIL=... RLS_TEST_PASSWORD=... \
 *     pnpm --filter @scipal/api exec tsx scripts/verify-rls.ts
 * SUPABASE_URL is read from backend/.env. Use a throwaway student account
 * created in /admin/accounts — never a real user's credentials.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const email = process.env.RLS_TEST_EMAIL;
const password = process.env.RLS_TEST_PASSWORD;

if (!url || !anonKey || !email || !password) {
  console.error('Missing SUPABASE_URL, SUPABASE_ANON_KEY, RLS_TEST_EMAIL or RLS_TEST_PASSWORD.');
  process.exit(1);
}

const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Anonymous visitor
const anon = createClient(url, anonKey, options);
const questions = await anon.from('questions').select('id, data').limit(1);
check('anon cannot read questions', Boolean(questions.error) || (questions.data ?? []).length === 0, questions.error?.message);
const subjects = await anon.from('subjects').select('id').limit(1);
check('anon can read subjects', !subjects.error, subjects.error?.message);
const anonSurvey = await anon.from('surveys').insert({ type: 'demand', payload: { probe: true } });
check('anon cannot insert surveys directly', Boolean(anonSurvey.error));

// Signed-in test student
const client = createClient(url, anonKey, options);
const signIn = await client.auth.signInWithPassword({ email, password });
if (signIn.error || !signIn.data.user) {
  console.error('Test account sign-in failed:', signIn.error?.message);
  process.exit(1);
}
const uid = signIn.data.user.id;

const subjectRow = await client.from('subjects').select('id').limit(1).single();
const xpInsert = await client.from('xp_log').insert({
  user_id: uid,
  subject_id: subjectRow.data?.id,
  delta: 999,
  reason: 'rls_probe',
});
check('user cannot insert xp_log', Boolean(xpInsert.error));

const xpRead = await client.from('xp_log').select('delta').eq('user_id', uid);
check('user can still read own xp_log', !xpRead.error, xpRead.error?.message);

const roleUpdate = await client.from('profiles').update({ role: 'teacher' }).eq('id', uid);
check('user cannot change profiles.role', Boolean(roleUpdate.error));

const profile = await client.from('profiles').select('preferred_education_level').eq('id', uid).single();
const levelUpdate = await client
  .from('profiles')
  .update({ preferred_education_level: profile.data?.preferred_education_level ?? null })
  .eq('id', uid);
check('user can still save education level', !levelUpdate.error, levelUpdate.error?.message);

const rooms = await client.from('class_rooms').select('id').limit(1);
check('class_rooms select has no policy recursion', !rooms.error, rooms.error?.message);
const members = await client.from('class_members').select('class_id').limit(1);
check('class_members select has no policy recursion', !members.error, members.error?.message);

await client.auth.signOut();

for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  (${r.detail})` : ''}`);
}
process.exit(results.every((r) => r.ok) ? 0 : 1);
```

- [ ] **Step 6: Typecheck backend**

Run: `pnpm --filter @scipal/api typecheck`
Expected: exit 0. (`scripts/` nằm ngoài `include: ["src"]` nên không ảnh hưởng build; nếu muốn typecheck script: `pnpm --filter @scipal/api exec tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --skipLibCheck scripts/verify-rls.ts`.)

- [ ] **Step 7: Đánh dấu `full_schema_and_seed.sql` không còn là nguồn chuẩn**

Chèn vào **dòng đầu** `supabase/full_schema_and_seed.sql`:

```sql
-- ⚠️ HISTORICAL SNAPSHOT — NOT the source of truth.
-- Schema and RLS are defined by supabase/migrations/* (applied in timestamp order).
-- This file predates 20260926090000_security_hardening_rls.sql and has weaker
-- policies on user tables. Do not use it to bootstrap a new database.
```

- [ ] **Step 8: Dry-run trên project đã link**

Run: `pnpm exec supabase db push --dry-run --linked`
Expected: danh sách pending gồm `20260925124223_landing_education_levels.sql` (nếu chưa áp) và `20260926090000_security_hardening_rls.sql`; không có lỗi.

- [ ] **Step 9: ⚠️ Xin người dùng duyệt rồi mới áp lên DB thật**

Dừng lại, báo cho người dùng: lệnh sẽ áp migration lên Supabase production (gồm cả migration landing cấp học nếu chưa áp). Chỉ khi người dùng đồng ý rõ ràng:

Run: `pnpm exec supabase db push --linked`
Expected: `Finished supabase db push.`

- [ ] **Step 10: Chạy script kiểm chứng**

Người dùng cung cấp anon key (lấy từ `frontend/.env.local`, biến `NEXT_PUBLIC_SUPABASE_ANON_KEY`) và một tài khoản học sinh **thử nghiệm** trong shell của họ, rồi chạy:

Run: `pnpm --filter @scipal/api exec tsx scripts/verify-rls.ts`
Expected: mọi dòng `PASS`, exit 0. Nếu có dòng `FAIL "user cannot insert xp_log"` nghĩa là DB chưa được siết — **dừng lại**, không làm Task 2.

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/20260926090000_security_hardening_rls.sql supabase/full_schema_and_seed.sql backend/src/__tests__/rls-migration.test.ts backend/scripts/verify-rls.ts
git commit -m "fix(db): make gamification tables server-authoritative and hide answer keys

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Chấm thi — chống trùng câu và chỉ cộng XP một lần mỗi đề

**Files:**
- Create: `backend/src/__tests__/helpers/supabaseMock.ts`
- Create: `supabase/migrations/20260926090100_exam_xp_once.sql`
- Modify: `backend/src/routes/exam.ts` (handler `POST /api/score/exam`, khoảng dòng 170–255)
- Test: `backend/src/__tests__/exam.test.ts` (thêm test)

**Interfaces:**
- Consumes: không có gì từ Task 1 ở mức code (migration Task 1 độc lập).
- Produces:
  - `export function dedupeAnswers(answers: unknown[]): ExamAnswer[]` trong `exam.ts`.
  - `export const MAX_EXAM_ANSWERS = 200` trong `exam.ts`.
  - Response `POST /api/score/exam`: `{ score: number; correct_count: number; total_questions: number; xp_earned: number; already_awarded: boolean }`.
  - `xp_log.reason` cho bài thi: `` `exam_complete:${blueprint_id}` ``.
  - Test helper `mockQuery(result)` / `mockSupabase(tables)` (Task 3, 4 dùng lại):

```ts
export interface QueryResult { data: unknown; error: { code?: string; message?: string } | null }
export interface MockBuilder {
  eqCalls: Array<[string, unknown]>;
  inserted: unknown[];
  select(...args: unknown[]): MockBuilder;
  eq(column: string, value: unknown): MockBuilder;
  in(column: string, values: unknown[]): MockBuilder;
  order(...args: unknown[]): MockBuilder;
  insert(row: unknown): MockBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2>;
}
export function mockQuery(result: QueryResult): MockBuilder;
export function mockSupabase(tables: Record<string, MockBuilder | MockBuilder[]>): SupabaseClient;
```

- [ ] **Step 1: Viết test helper**

`backend/src/__tests__/helpers/supabaseMock.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

export interface QueryResult {
  data: unknown;
  error: { code?: string; message?: string } | null;
}

export interface MockBuilder {
  eqCalls: Array<[string, unknown]>;
  inserted: unknown[];
  select(...args: unknown[]): MockBuilder;
  eq(column: string, value: unknown): MockBuilder;
  in(column: string, values: unknown[]): MockBuilder;
  order(...args: unknown[]): MockBuilder;
  insert(row: unknown): MockBuilder;
  maybeSingle(): Promise<QueryResult>;
  single(): Promise<QueryResult>;
  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null,
  ): Promise<T1 | T2>;
}

/** A chainable, awaitable stand-in for a supabase-js query builder. */
export function mockQuery(result: QueryResult): MockBuilder {
  const builder: MockBuilder = {
    eqCalls: [],
    inserted: [],
    select: () => builder,
    eq: (column, value) => {
      builder.eqCalls.push([column, value]);
      return builder;
    },
    in: () => builder,
    order: () => builder,
    insert: (row) => {
      builder.inserted.push(row);
      return builder;
    },
    maybeSingle: async () => result,
    single: async () => result,
    then: (onfulfilled, onrejected) => Promise.resolve(result).then(onfulfilled, onrejected),
  };
  return builder;
}

/**
 * Map table name → builder. Pass an array to return a different builder on
 * each successive `from(table)` call.
 */
export function mockSupabase(tables: Record<string, MockBuilder | MockBuilder[]>): SupabaseClient {
  return {
    from(table: string) {
      const entry = tables[table];
      if (!entry) throw new Error(`Unexpected table in test: ${table}`);
      if (Array.isArray(entry)) {
        const next = entry.shift();
        if (!next) throw new Error(`No more mock results for table: ${table}`);
        return next;
      }
      return entry;
    },
  } as unknown as SupabaseClient;
}
```

- [ ] **Step 2: Viết test fail**

Thêm vào **cuối** `backend/src/__tests__/exam.test.ts`:

```ts
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';
import { MAX_EXAM_ANSWERS } from '../routes/exam.js';

async function buildScoringApp(tables: Parameters<typeof mockSupabase>[0]) {
  const scoringApp = Fastify();
  scoringApp.decorate('supabase', mockSupabase(tables));
  scoringApp.addHook('onRequest', async (request) => {
    (request as typeof request & { user: { id: string } }).user = { id: 'student-1' };
  });
  await scoringApp.register(examRoutes);
  await scoringApp.ready();
  return scoringApp;
}

const dbQuestion = { id: 'q1', type: 'mc', data: { answer: 'a' }, subject_id: 'subject-1' };

describe('POST /api/score/exam integrity', () => {
  it('counts a repeated question only once', async () => {
    const xpLog = mockQuery({ data: null, error: null });
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      xp_log: xpLog,
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: 'bp-1',
        answers: Array.from({ length: 5 }, () => ({ question_id: 'q1', selected_option: 'a' })),
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct_count: 1, total_questions: 1, xp_earned: 15, already_awarded: false });
    expect(xpLog.inserted).toEqual([
      { user_id: 'student-1', subject_id: 'subject-1', delta: 15, reason: 'exam_complete:bp-1' },
    ]);
    await scoringApp.close();
  });

  it('treats unique violation as already awarded', async () => {
    const scoringApp = await buildScoringApp({
      questions: mockQuery({ data: [dbQuestion], error: null }),
      xp_log: mockQuery({ data: null, error: { code: '23505', message: 'duplicate key' } }),
    });

    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { blueprint_id: 'bp-1', answers: [{ question_id: 'q1', selected_option: 'a' }] },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ correct_count: 1, xp_earned: 0, already_awarded: true });
    await scoringApp.close();
  });

  it('rejects submissions without a blueprint_id', async () => {
    const scoringApp = await buildScoringApp({});
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: { answers: [{ question_id: 'q1', selected_option: 'a' }] },
    });
    expect(res.statusCode).toBe(400);
    await scoringApp.close();
  });

  it('rejects oversized answer arrays', async () => {
    const scoringApp = await buildScoringApp({});
    const res = await scoringApp.inject({
      method: 'POST',
      url: '/api/score/exam',
      payload: {
        blueprint_id: 'bp-1',
        answers: Array.from({ length: MAX_EXAM_ANSWERS + 1 }, (_, i) => ({ question_id: `q${i}` })),
      },
    });
    expect(res.statusCode).toBe(400);
    await scoringApp.close();
  });
});
```

Ghi chú: đặt hai dòng `import` mới lên **đầu file** cùng các import hiện có (ESM yêu cầu import ở top-level; vitest vẫn hoist nhưng giữ đúng quy ước file).

- [ ] **Step 3: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/exam.test.ts`
Expected: FAIL —
- "counts a repeated question only once" nhận `correct_count: 5`, không có `already_awarded`;
- "treats unique violation as already awarded" không có `already_awarded: true`;
- "rejects submissions without a blueprint_id" nhận 200;
- "rejects oversized answer arrays": `MAX_EXAM_ANSWERS` chưa được export nên là `undefined` → mảng rỗng → nhận 200.

- [ ] **Step 4: Sửa `exam.ts`**

Thêm ngay dưới `interface ExamAnswer { … }`:

```ts
export const MAX_EXAM_ANSWERS = 200;

/** Keep the first answer per question; drop entries without a string question_id. */
export function dedupeAnswers(answers: unknown[]): ExamAnswer[] {
  const seen = new Map<string, ExamAnswer>();
  for (const raw of answers) {
    const answer = raw as ExamAnswer | null;
    if (!answer || typeof answer.question_id !== 'string') continue;
    if (!seen.has(answer.question_id)) seen.set(answer.question_id, answer);
  }
  return [...seen.values()];
}
```

Thay **toàn bộ** handler `app.post('/api/score/exam', …)` bằng:

```ts
  // Score exam server-side
  app.post('/api/score/exam', async (request, reply) => {
    const { blueprint_id, answers } = (request.body ?? {}) as {
      blueprint_id?: unknown;
      answers?: unknown;
    };

    if (typeof blueprint_id !== 'string' || !blueprint_id.trim() || blueprint_id.length > 64) {
      return reply.status(400).send({ error: 'blueprint_id required' });
    }
    if (!Array.isArray(answers)) {
      return reply.status(400).send({ error: 'Answers array required' });
    }
    if (answers.length > MAX_EXAM_ANSWERS) {
      return reply.status(400).send({ error: 'Too many answers' });
    }

    const blueprintId = blueprint_id.trim();
    const uniqueAnswers = dedupeAnswers(answers);
    const user = (request as any).user as { id?: string; sub?: string } | undefined;
    const userId = user?.id ?? user?.sub;

    const questionIds = uniqueAnswers.map((a) => a.question_id);
    let dbMap = new Map<string, any>();

    if (app.supabase && questionIds.length > 0) {
      const { data: dbQuestions } = await app.supabase
        .from('questions')
        .select('id, type, data, subject_id')
        .in('id', questionIds);

      if (dbQuestions && dbQuestions.length > 0) {
        dbMap = new Map(dbQuestions.map((q) => [q.id, q]));
      }
    }

    // Fallback answer map for demo questions (never earns XP — see below)
    const fallbackAnswers: Record<string, { type: string; answer: string }> = {
      'q-demo-1': { type: 'mc', answer: 'opt-b' },
      'q-demo-2': { type: 'mc', answer: 'opt-c' },
      'q-demo-3': { type: 'mc', answer: 'opt-b' },
      'q-demo-4': { type: 'mc', answer: 'opt-d' },
      'q-demo-5': { type: 'mc', answer: 'opt-a' },
    };

    let correctCount = 0;
    const total = uniqueAnswers.length;

    for (const ans of uniqueAnswers) {
      const dbQ = dbMap.get(ans.question_id);
      if (dbQ) {
        const data = dbQ.data as Record<string, unknown>;
        if (dbQ.type === 'mc' && ans.selected_option === data.answer) {
          correctCount++;
        } else if (dbQ.type === 'truefalse' && Array.isArray(data.items) && Array.isArray(ans.items)) {
          const allCorrect = data.items.every((it: { id: string; correct: boolean }) => {
            const userIt = ans.items?.find((ui) => ui.id === it.id);
            return userIt && userIt.selected === it.correct;
          });
          if (allCorrect) correctCount++;
        }
      } else {
        const fallback = fallbackAnswers[ans.question_id];
        if (fallback && fallback.type === 'mc' && ans.selected_option === fallback.answer) {
          correctCount++;
        }
      }
    }

    const score = total > 0 ? Number(((correctCount / total) * 10).toFixed(2)) : 0;
    const possibleXp = correctCount * 15;
    let xp_earned = 0;
    let already_awarded = false;

    // XP only for real DB questions of a single subject, once per user per blueprint
    // (enforced by xp_log_exam_once_idx).
    const subjectIds = new Set(
      questionIds.map((id) => dbMap.get(id)?.subject_id).filter(Boolean),
    );
    if (
      userId && possibleXp > 0 && app.supabase &&
      dbMap.size === questionIds.length && subjectIds.size === 1
    ) {
      try {
        const { error } = await app.supabase.from('xp_log').insert({
          user_id: userId,
          subject_id: [...subjectIds][0],
          delta: possibleXp,
          reason: `exam_complete:${blueprintId}`,
        });
        if (error?.code === '23505') already_awarded = true;
        else if (error) app.log.warn({ err: error }, 'Exam XP logging failed');
        else xp_earned = possibleXp;
      } catch (err) {
        app.log.warn({ err }, 'Exam XP logging failed');
      }
    }

    return reply.send({
      score,
      correct_count: correctCount,
      total_questions: total,
      xp_earned,
      already_awarded,
    });
  });
```

- [ ] **Step 5: Viết migration unique index**

`supabase/migrations/20260926090100_exam_xp_once.sql`:

```sql
-- One exam XP grant per user per blueprint. Backend writes reason = 'exam_complete:<blueprint_id>'.
-- Legacy rows used reason = 'exam_complete' (no colon) and are not affected.
create unique index if not exists xp_log_exam_once_idx
  on public.xp_log (user_id, reason)
  where reason like 'exam_complete:%';
```

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/exam.test.ts`
Expected: PASS toàn bộ (3 test cũ + 1 test standalone cũ + 4 test mới).

- [ ] **Step 7: Typecheck**

Run: `pnpm --filter @scipal/api typecheck`
Expected: exit 0.

- [ ] **Step 8: Commit**

```bash
git add backend/src/routes/exam.ts backend/src/__tests__/exam.test.ts backend/src/__tests__/helpers/supabaseMock.ts supabase/migrations/20260926090100_exam_xp_once.sql
git commit -m "fix(api): dedupe exam answers and award exam XP once per blueprint

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Ghi chú: migration này được áp lên DB thật cùng đợt `db push` tiếp theo — **vẫn cần người dùng duyệt** như Task 1 Step 9. Trước khi áp, code mới vẫn chạy đúng (chỉ thiếu bảo vệ race condition).

---

### Task 3: Auth tuỳ chọn cho đường dẫn public + khảo sát ghi nhận trung thực

**Files:**
- Modify: `backend/src/plugins/auth.ts` (thay toàn bộ file)
- Modify: `backend/src/routes/survey.ts` (thay toàn bộ file)
- Modify: `backend/src/__tests__/score.test.ts` (test survey cũ phụ thuộc hành vi "luôn 201")
- Test: `backend/src/__tests__/auth.test.ts`, `backend/src/__tests__/survey.test.ts` (tạo mới)
- Create: `frontend/lib/session.ts`
- Modify: `frontend/lib/api.ts` (hàm `postSurvey`)
- Test: `frontend/features/survey/surveySubmission.test.ts`

**Interfaces:**
- Consumes: `mockQuery`, `mockSupabase` từ `backend/src/__tests__/helpers/supabaseMock.ts` (Task 2).
- Produces:
  - Auth plugin: trên đường dẫn public, nếu token hợp lệ thì gắn `request.user`; token thiếu/sai vẫn cho qua. Đường dẫn không public giữ nguyên 401.
  - `POST /api/survey`: 400 khi `type ∉ {post_lesson, demand, feature_request}` hoặc `payload` không phải object hoặc payload > 4000 ký tự JSON; 503 khi không có Supabase hoặc insert lỗi; 201 `{ ok: true }` khi lưu được.
  - `frontend/lib/session.ts`: `export async function getAccessToken(): Promise<string | undefined>`.
  - `postSurvey(body, token?)`: nếu không truyền token thì tự lấy qua `getAccessToken()`.

- [ ] **Step 1: Viết test fail cho backend**

Thêm vào `backend/src/__tests__/auth.test.ts`, **bên trong** `describe('authPlugin', …)`, và đăng ký thêm một route public trong `beforeAll` (ngay sau dòng `app.get('/health', …)`):

```ts
    app.post('/api/survey', async (request) => ({ user: (request as any).user ?? null }));
```

```ts
  it('lets a public path through with an invalid token, without a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      headers: { Authorization: 'Bearer expired-or-garbage' },
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ user: null });
  });
```

Tạo `backend/src/__tests__/survey.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { surveyRoutes } from '../routes/survey.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

async function buildSurveyApp(opts: { surveys?: MockBuilder; userId?: string }) {
  const app = Fastify();
  if (opts.surveys) app.decorate('supabase', mockSupabase({ surveys: opts.surveys }));
  app.addHook('onRequest', async (request) => {
    if (opts.userId) (request as typeof request & { user: { id: string } }).user = { id: opts.userId };
  });
  await app.register(surveyRoutes);
  await app.ready();
  return app;
}

const validBody = { type: 'demand', payload: { subjects: ['math'], grade: 10 } };

describe('POST /api/survey', () => {
  it('stores an anonymous survey with a null user_id', async () => {
    const surveys = mockQuery({ data: null, error: null });
    const app = await buildSurveyApp({ surveys });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(201);
    expect(surveys.inserted).toEqual([{ user_id: null, ...validBody }]);
    await app.close();
  });

  it('attributes the survey to the signed-in user', async () => {
    const surveys = mockQuery({ data: null, error: null });
    const app = await buildSurveyApp({ surveys, userId: 'student-1' });
    await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(surveys.inserted).toEqual([{ user_id: 'student-1', ...validBody }]);
    await app.close();
  });

  it('reports failure when the insert fails', async () => {
    const app = await buildSurveyApp({
      surveys: mockQuery({ data: null, error: { code: '42501', message: 'denied' } }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('reports failure when storage is not configured', async () => {
    const app = await buildSurveyApp({});
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: validBody });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('rejects unknown survey types', async () => {
    const app = await buildSurveyApp({ surveys: mockQuery({ data: null, error: null }) });
    const res = await app.inject({ method: 'POST', url: '/api/survey', payload: { type: 'spam', payload: {} } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects oversized payloads', async () => {
    const app = await buildSurveyApp({ surveys: mockQuery({ data: null, error: null }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/survey',
      payload: { type: 'feature_request', payload: { text: 'x'.repeat(5000) } },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});
```

Trong `backend/src/__tests__/score.test.ts`, **xoá** test `it('POST /api/survey is accessible anonymously', …)` (hành vi này nay nằm trong `survey.test.ts`, và không còn đúng khi thiếu Supabase). Giữ test `'POST /api/survey returns 400 when missing payload'`.

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/auth.test.ts src/__tests__/survey.test.ts`
Expected:
- `auth.test.ts` → test "lets a public path through with an invalid token" **có thể đã PASS** vì `/api/survey` vốn là public. Đây là test chống hồi quy cho bản viết lại ở Step 3, không cần nó fail trước.
- `survey.test.ts` → FAIL ở "reports failure when the insert fails", "reports failure when storage is not configured", "rejects unknown survey types", "rejects oversized payloads" (cả bốn đều nhận 201).

- [ ] **Step 3: Thay `backend/src/plugins/auth.ts`**

```ts
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

const isPublicPath = (path: string): boolean => {
  if (path === '/health' || path === '/api/survey') return true;
  if (path.startsWith('/api/exam/')) return true;
  return false;
};

let verifier: SupabaseClient | null = null;

function getVerifier(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  verifier ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return verifier;
}

async function resolveUser(header: string | undefined): Promise<User | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const client = getVerifier();
  if (!client) return null;
  try {
    const { data: { user }, error } = await client.auth.getUser(header.slice(7));
    return error ? null : user;
  } catch {
    return null;
  }
}

export const authPlugin: FastifyPluginAsync = fp(async (app) => {
  app.addHook('onRequest', async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.routeOptions?.url ?? req.url;
    const header = req.headers.authorization;
    const user = await resolveUser(header);

    if (user) {
      (req as FastifyRequest & { user: User }).user = user;
      return;
    }
    // Public paths accept anonymous callers, including stale or invalid tokens.
    if (isPublicPath(url)) return;

    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing authorization header' });
    }
    return reply.code(401).send({ error: 'Invalid token' });
  });
});
```

- [ ] **Step 4: Thay `backend/src/routes/survey.ts`**

```ts
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

const SURVEY_TYPES = new Set(['post_lesson', 'demand', 'feature_request']);
const MAX_PAYLOAD_CHARS = 4000;
const unavailable = { error: 'Survey could not be saved. Please try again.' };

export const surveyRoutes: FastifyPluginAsync = async (app) => {
  app.post('/api/survey', async (request, reply) => {
    const { type, payload } = (request.body ?? {}) as { type?: unknown; payload?: unknown };

    if (typeof type !== 'string' || !SURVEY_TYPES.has(type)) {
      return reply.status(400).send({ error: 'Missing or invalid survey type' });
    }
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return reply.status(400).send({ error: 'Missing or invalid payload' });
    }
    if (JSON.stringify(payload).length > MAX_PAYLOAD_CHARS) {
      return reply.status(400).send({ error: 'Payload too large' });
    }
    if (!app.supabase) return reply.status(503).send(unavailable);

    const user = (request as FastifyRequest & { user?: { id?: string } }).user;
    const { error } = await app.supabase.from('surveys').insert({
      user_id: user?.id ?? null,
      type,
      payload,
    });
    if (error) {
      app.log.warn({ err: error }, 'Failed to insert survey record');
      return reply.status(503).send(unavailable);
    }

    return reply.status(201).send({ ok: true });
  });
};
```

- [ ] **Step 5: Chạy test backend, xác nhận pass**

Run: `pnpm --filter @scipal/api exec vitest run`
Expected: PASS toàn bộ file backend (bao gồm `score.test.ts` với test "400 when missing payload" vẫn pass).

- [ ] **Step 6: Viết test fail cho frontend**

Thay nội dung `frontend/features/survey/surveySubmission.test.ts` bằng:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';

const getAccessToken = vi.fn<() => Promise<string | undefined>>();
vi.mock('../../lib/session', () => ({ getAccessToken: () => getAccessToken() }));

import { postSurvey } from '../../lib/api';

describe('postSurvey', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    getAccessToken.mockReset();
  });

  it('rejects when the API responds with an error status', async () => {
    getAccessToken.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .rejects.toThrow('survey failed: 500');
  });

  it('resolves for a successful no-content response', async () => {
    getAccessToken.mockResolvedValue(undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(postSurvey({ type: 'demand', payload: { subjects: ['math'], grade: 10 } }))
      .resolves.toBeUndefined();
  });

  it('attaches the current session token when none is passed', async () => {
    getAccessToken.mockResolvedValue('session-token');
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await postSurvey({ type: 'demand', payload: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer session-token');
  });

  it('sends anonymously when there is no session', async () => {
    getAccessToken.mockResolvedValue(undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);

    await postSurvey({ type: 'demand', payload: {} });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.headers).not.toHaveProperty('Authorization');
  });
});
```

- [ ] **Step 7: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web exec vitest run features/survey/surveySubmission.test.ts`
Expected: FAIL — không resolve được module `../../lib/session` hoặc "attaches the current session token" không thấy header.

- [ ] **Step 8: Tạo `frontend/lib/session.ts`**

```ts
import { createBrowserClient } from './supabase';

/** Access token of the current browser session, or undefined for guests. */
export async function getAccessToken(): Promise<string | undefined> {
  try {
    const { data } = await createBrowserClient().auth.getSession();
    return data.session?.access_token ?? undefined;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 9: Sửa `postSurvey` trong `frontend/lib/api.ts`**

Thêm import ở đầu file (sau dòng comment đầu tiên):

```ts
import { getAccessToken } from './session';
```

Thay hàm `postSurvey` bằng:

```ts
export async function postSurvey(
  body: { type: string; payload: unknown },
  token?: string,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authToken = token ?? (await getAccessToken());
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const response = await fetch(`${API_BASE}/api/survey`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`survey failed: ${response.status}`);
}
```

- [ ] **Step 10: Chạy test frontend, xác nhận pass**

Run: `pnpm --filter @scipal/web exec vitest run features/survey/surveySubmission.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 11: Typecheck**

Run: `pnpm turbo typecheck --filter=@scipal/api --filter=@scipal/web`
Expected: backend exit 0; web không có lỗi mới so với baseline.

- [ ] **Step 12: Commit**

```bash
git add backend/src/plugins/auth.ts backend/src/routes/survey.ts backend/src/__tests__/auth.test.ts backend/src/__tests__/survey.test.ts backend/src/__tests__/score.test.ts frontend/lib/session.ts frontend/lib/api.ts frontend/features/survey/surveySubmission.test.ts
git commit -m "fix(survey): attribute surveys to signed-in users and report save failures

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: API lớp học — role, quyền sở hữu, danh sách lớp, roster thật

**Files:**
- Modify: `backend/src/routes/classes.ts` (thay toàn bộ file)
- Test: `backend/src/__tests__/classes.test.ts` (thêm test)

**Interfaces:**
- Consumes: `mockQuery`, `mockSupabase`, `MockBuilder` (Task 2).
- Produces (HTTP contract, Task 5 dùng):
  - `GET /api/classes` (teacher/admin) → `200 { classes: Array<{ id: string; name: string; subject_id: string; invite_code: string; created_at: string; student_count: number }> }`. Teacher chỉ thấy lớp của mình; admin thấy tất cả.
  - `POST /api/classes` (teacher/admin), body `{ name: string; subject_slug: string }` (vẫn chấp nhận `subject_id` là UUID) → `201 { class_room: { id, name, subject_id, invite_code, created_at, student_count: 0 } }`; `400` khi tên rỗng/>100 ký tự hoặc môn không tồn tại; `403` khi là học sinh.
  - `POST /api/classes/join` (mọi user đăng nhập), body `{ invite_code: string }` → `200 { success: true, class_id }`; `404` mã sai; `400` khi giáo viên tự vào lớp mình.
  - `GET /api/classes/:id/roster` (teacher sở hữu lớp hoặc admin) → `200 { class_room: { id, name, subject_id, invite_code }, members: Array<{ student_id: string; display_name: string; joined_at: string; total_xp: number; completed_lessons: number }> }`; `404` nếu không tồn tại hoặc không phải lớp của mình.
  - Mọi route: `401` khi không có user, `503` khi không có Supabase.

- [ ] **Step 1: Viết test fail**

Thêm vào **cuối** `backend/src/__tests__/classes.test.ts` (và thêm import `mockQuery, mockSupabase` lên đầu file):

```ts
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const otherTeacher = { id: 'teacher-2', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

async function buildClassApp(
  user: { id: string; app_metadata: { app_role: string } } | null,
  tables?: Parameters<typeof mockSupabase>[0],
) {
  const app = Fastify();
  if (tables) app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => {
    if (user) (request as any).user = user;
  });
  await app.register(classRoutes);
  await app.ready();
  return app;
}

describe('class route authorization', () => {
  it('forbids students from creating classes', async () => {
    const app = await buildClassApp(student, {});
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes',
      payload: { name: '10A1', subject_slug: 'informatics' },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it('creates a class for the calling teacher, resolving the subject slug', async () => {
    const subjects = mockQuery({ data: { id: 'subject-uuid' }, error: null });
    const insert = mockQuery({
      data: { id: CLASS_ID, name: '10A1', subject_id: 'subject-uuid', invite_code: 'ABC123', created_at: '2026-09-26' },
      error: null,
    });
    const app = await buildClassApp(teacher, { subjects, class_rooms: insert });

    const res = await app.inject({
      method: 'POST',
      url: '/api/classes',
      payload: { name: '  10A1  ', subject_slug: 'informatics' },
    });

    expect(res.statusCode).toBe(201);
    expect(subjects.eqCalls).toContainEqual(['slug', 'informatics']);
    expect(insert.inserted[0]).toMatchObject({ teacher_id: 'teacher-1', subject_id: 'subject-uuid', name: '10A1' });
    expect(res.json().class_room.student_count).toBe(0);
    await app.close();
  });

  it('rejects an unknown subject', async () => {
    const app = await buildClassApp(teacher, { subjects: mockQuery({ data: null, error: null }) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes',
      payload: { name: '10A1', subject_slug: 'alchemy' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('lists only the calling teacher classes with student counts', async () => {
    const rooms = mockQuery({
      data: [{ id: CLASS_ID, name: '10A1', subject_id: 's', invite_code: 'ABC123', created_at: 'x', class_members: [{ count: 3 }] }],
      error: null,
    });
    const app = await buildClassApp(teacher, { class_rooms: rooms });
    const res = await app.inject({ method: 'GET', url: '/api/classes' });
    expect(res.statusCode).toBe(200);
    expect(rooms.eqCalls).toContainEqual(['teacher_id', 'teacher-1']);
    expect(res.json().classes[0]).toMatchObject({ id: CLASS_ID, student_count: 3 });
    expect(res.json().classes[0]).not.toHaveProperty('class_members');
    await app.close();
  });

  it("returns 404 for another teacher's class", async () => {
    const app = await buildClassApp(otherTeacher, {
      class_rooms: mockQuery({
        data: { id: CLASS_ID, name: '10A1', subject_id: 's', invite_code: 'ABC123', teacher_id: 'teacher-1' },
        error: null,
      }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/roster` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('builds the roster with real XP and lesson totals', async () => {
    const app = await buildClassApp(teacher, {
      class_rooms: mockQuery({
        data: { id: CLASS_ID, name: '10A1', subject_id: 's', invite_code: 'ABC123', teacher_id: 'teacher-1' },
        error: null,
      }),
      class_members: mockQuery({
        data: [
          { student_id: 's1', joined_at: '2026-09-20', profiles: { display_name: 'An' } },
          { student_id: 's2', joined_at: '2026-09-21', profiles: null },
        ],
        error: null,
      }),
      xp_log: mockQuery({ data: [{ user_id: 's1', delta: 10 }, { user_id: 's1', delta: 20 }], error: null }),
      progress: mockQuery({ data: [{ user_id: 's1' }], error: null }),
    });

    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/roster` });

    expect(res.statusCode).toBe(200);
    expect(res.json().members).toEqual([
      { student_id: 's1', display_name: 'An', joined_at: '2026-09-20', total_xp: 30, completed_lessons: 1 },
      { student_id: 's2', display_name: '', joined_at: '2026-09-21', total_xp: 0, completed_lessons: 0 },
    ]);
    expect(res.json().class_room).not.toHaveProperty('teacher_id');
    await app.close();
  });

  it('returns 503 instead of mock data when storage is missing', async () => {
    const app = await buildClassApp(teacher);
    const res = await app.inject({ method: 'GET', url: '/api/classes' });
    expect(res.statusCode).toBe(503);
    await app.close();
  });

  it('requires a user to join a class', async () => {
    const app = await buildClassApp(null, { class_rooms: mockQuery({ data: null, error: null }) });
    const res = await app.inject({ method: 'POST', url: '/api/classes/join', payload: { invite_code: 'ABC123' } });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('returns 404 for an unknown invite code', async () => {
    const app = await buildClassApp(student, { class_rooms: mockQuery({ data: null, error: null }) });
    const res = await app.inject({ method: 'POST', url: '/api/classes/join', payload: { invite_code: 'zzz999' } });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/classes.test.ts`
Expected: FAIL — student tạo lớp nhận 201; `GET /api/classes` nhận 404 (route chưa có); roster lớp người khác nhận 200.

- [ ] **Step 3: Thay `backend/src/routes/classes.ts`**

```ts
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import crypto from 'node:crypto';

interface ClassUser {
  id?: string;
  app_metadata?: { app_role?: string };
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVITE_CODE_PATTERN = /^[0-9A-Z]{4,12}$/;
const unavailable = { error: 'Dịch vụ lớp học chưa sẵn sàng.' };
const notFound = { error: 'Không tìm thấy lớp học.' };

function getUser(request: FastifyRequest): ClassUser | undefined {
  return (request as FastifyRequest & { user?: ClassUser }).user;
}

function isAdmin(user: ClassUser | undefined): boolean {
  return user?.app_metadata?.app_role === 'admin';
}

export function newInviteCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export const classRoutes: FastifyPluginAsync = async (app) => {
  const requireUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!getUser(request)?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });
  };

  const requireTeacher = async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUser(request);
    if (!user?.id) return reply.code(401).send({ error: 'Phiên đăng nhập không hợp lệ.' });
    const role = user.app_metadata?.app_role;
    if (role !== 'teacher' && role !== 'admin') {
      return reply.code(403).send({ error: 'Chỉ giáo viên mới có quyền quản lý lớp học.' });
    }
  };

  // List classes (teacher: own, admin: all)
  app.get('/api/classes', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    let query = supabase
      .from('class_rooms')
      .select('id, name, subject_id, invite_code, created_at, class_members(count)')
      .order('created_at', { ascending: false });
    if (!isAdmin(user)) query = query.eq('teacher_id', user.id!);

    const { data, error } = await query;
    if (error) {
      request.log.error({ err: error }, 'Failed to list classes');
      return reply.code(500).send({ error: 'Không tải được danh sách lớp học.' });
    }

    const classes = (data ?? []).map((row) => {
      const { class_members: counts, ...room } = row as Record<string, unknown> & {
        class_members?: Array<{ count: number }>;
      };
      return { ...room, student_count: counts?.[0]?.count ?? 0 };
    });
    return reply.send({ classes });
  });

  // Create class (teacher/admin)
  app.post('/api/classes', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    const body = (request.body ?? {}) as { name?: unknown; subject_slug?: unknown; subject_id?: unknown };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const subjectKey = typeof body.subject_slug === 'string'
      ? body.subject_slug.trim()
      : typeof body.subject_id === 'string'
        ? body.subject_id.trim()
        : '';

    if (!name || name.length > 100) {
      return reply.code(400).send({ error: 'Tên lớp là bắt buộc (tối đa 100 ký tự).' });
    }
    if (!subjectKey) return reply.code(400).send({ error: 'Vui lòng chọn môn học.' });

    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq(UUID_PATTERN.test(subjectKey) ? 'id' : 'slug', subjectKey)
      .maybeSingle();
    if (subjectError) {
      request.log.error({ err: subjectError }, 'Failed to resolve class subject');
      return reply.code(500).send({ error: 'Không xác minh được môn học.' });
    }
    if (!subject) return reply.code(400).send({ error: 'Môn học không tồn tại.' });

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from('class_rooms')
        .insert({ teacher_id: user.id, subject_id: subject.id, name, invite_code: newInviteCode() })
        .select('id, name, subject_id, invite_code, created_at')
        .single();
      if (error?.code === '23505') continue; // invite code collision — retry
      if (error || !data) {
        request.log.error({ err: error }, 'Failed to create class');
        return reply.code(500).send({ error: 'Không tạo được lớp học.' });
      }
      return reply.code(201).send({ class_room: { ...data, student_count: 0 } });
    }
    return reply.code(500).send({ error: 'Không tạo được mã lớp. Vui lòng thử lại.' });
  });

  // Join class (any signed-in user)
  app.post('/api/classes/join', { preHandler: [requireUser] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;

    const { invite_code } = (request.body ?? {}) as { invite_code?: unknown };
    const code = typeof invite_code === 'string' ? invite_code.trim().toUpperCase() : '';
    if (!INVITE_CODE_PATTERN.test(code)) {
      return reply.code(400).send({ error: 'Mã lớp không hợp lệ.' });
    }

    const { data: classRoom, error: lookupError } = await supabase
      .from('class_rooms')
      .select('id, teacher_id')
      .eq('invite_code', code)
      .maybeSingle();
    if (lookupError) {
      request.log.error({ err: lookupError }, 'Failed to look up invite code');
      return reply.code(500).send({ error: 'Không kiểm tra được mã lớp.' });
    }
    if (!classRoom) return reply.code(404).send({ error: 'Mã lớp không hợp lệ hoặc không tồn tại.' });
    if (classRoom.teacher_id === user.id) {
      return reply.code(400).send({ error: 'Bạn là giáo viên của lớp này.' });
    }

    const { error } = await supabase
      .from('class_members')
      .insert({ class_id: classRoom.id, student_id: user.id });
    if (error && error.code !== '23505') {
      request.log.error({ err: error }, 'Failed to join class');
      return reply.code(500).send({ error: 'Không tham gia được lớp học.' });
    }

    return reply.send({ success: true, class_id: classRoom.id });
  });

  // Class roster (owning teacher or admin)
  app.get('/api/classes/:id/roster', { preHandler: [requireTeacher] }, async (request, reply) => {
    const supabase = app.supabase;
    if (!supabase) return reply.code(503).send(unavailable);
    const user = getUser(request)!;
    const { id } = request.params as { id: string };
    if (!UUID_PATTERN.test(id)) return reply.code(404).send(notFound);

    const { data: room, error: roomError } = await supabase
      .from('class_rooms')
      .select('id, name, subject_id, invite_code, teacher_id')
      .eq('id', id)
      .maybeSingle();
    if (roomError) {
      request.log.error({ err: roomError }, 'Failed to read class');
      return reply.code(500).send({ error: 'Không tải được lớp học.' });
    }
    if (!room || (!isAdmin(user) && room.teacher_id !== user.id)) {
      return reply.code(404).send(notFound);
    }

    const { data: memberRows, error: membersError } = await supabase
      .from('class_members')
      .select('student_id, joined_at, profiles(display_name)')
      .eq('class_id', id);
    if (membersError) {
      request.log.error({ err: membersError }, 'Failed to read class members');
      return reply.code(500).send({ error: 'Không tải được danh sách học sinh.' });
    }

    const members = (memberRows ?? []) as Array<{
      student_id: string;
      joined_at: string;
      profiles: { display_name: string | null } | Array<{ display_name: string | null }> | null;
    }>;
    const memberIds = members.map((m) => m.student_id);
    const xpByStudent = new Map<string, number>();
    const lessonsByStudent = new Map<string, number>();

    if (memberIds.length > 0) {
      const [xpRes, progressRes] = await Promise.all([
        supabase.from('xp_log').select('user_id, delta').in('user_id', memberIds),
        supabase.from('progress').select('user_id').in('user_id', memberIds),
      ]);
      if (xpRes.error || progressRes.error) {
        request.log.error({ err: xpRes.error ?? progressRes.error }, 'Failed to read roster stats');
        return reply.code(500).send({ error: 'Không tải được số liệu học sinh.' });
      }
      for (const row of (xpRes.data ?? []) as Array<{ user_id: string; delta: number }>) {
        xpByStudent.set(row.user_id, (xpByStudent.get(row.user_id) ?? 0) + row.delta);
      }
      for (const row of (progressRes.data ?? []) as Array<{ user_id: string }>) {
        lessonsByStudent.set(row.user_id, (lessonsByStudent.get(row.user_id) ?? 0) + 1);
      }
    }

    const { teacher_id: _teacherId, ...classRoom } = room;
    return reply.send({
      class_room: classRoom,
      members: members.map((m) => {
        const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
        return {
          student_id: m.student_id,
          display_name: profile?.display_name ?? '',
          joined_at: m.joined_at,
          total_xp: xpByStudent.get(m.student_id) ?? 0,
          completed_lessons: lessonsByStudent.get(m.student_id) ?? 0,
        };
      }),
    });
  });
};
```

Ghi chú: test "builds the roster" gọi `from('xp_log')` và `from('progress')` mỗi bảng một lần, khớp với mock đơn (không phải mảng).

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api exec vitest run src/__tests__/classes.test.ts`
Expected: PASS (3 test cũ + 9 test mới). Test cũ "generates cryptographically secure 6-character hex invite code" và hai test 401 qua `authPlugin` vẫn pass.

- [ ] **Step 5: Chạy toàn bộ backend + typecheck**

Run: `pnpm --filter @scipal/api exec vitest run && pnpm --filter @scipal/api typecheck`
Expected: PASS, exit 0.

- [ ] **Step 6: Commit**

```bash
git add backend/src/routes/classes.ts backend/src/__tests__/classes.test.ts
git commit -m "fix(api): enforce teacher ownership on class routes and add class listing

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Frontend lớp học — gửi token thật, bỏ dữ liệu demo

**Files:**
- Create: `frontend/components/feedback/LoadErrorNotice.tsx`
- Modify: `frontend/features/classes/classQueries.ts` (thay toàn bộ file)
- Create: `frontend/features/classes/classQueries.test.ts`
- Modify: `frontend/app/teacher/classes/page.tsx`
- Modify: `frontend/app/teacher/classes/[id]/page.tsx`
- Modify: `frontend/features/classes/CreateClassModal.tsx` (khối `handleSubmit`)
- Modify: `frontend/features/classes/ClassList.tsx:77`

**Interfaces:**
- Consumes: HTTP contract của Task 4; `getAuthoringSession(redirectPath: string): Promise<{ token: string; role: string }>` có sẵn trong `frontend/features/authoring/serverAuth.ts`.
- Produces:
  - `LoadErrorNotice({ message }: { message: { en: string; vi: string } })` — client component, `role="alert"`. Task 6 dùng lại.
  - `getTeacherClasses(token: string): Promise<TeacherClassesResult>` với `TeacherClassesResult = { kind: 'ready'; classes: ClassRoomItem[] } | { kind: 'error' }`.
  - `getClassRoster(classId: string, token: string): Promise<ClassRosterResult>` với `ClassRosterResult = { kind: 'ready'; classRoom: { name: string; invite_code: string }; members: StudentMember[] } | { kind: 'not_found' } | { kind: 'error' }`.

- [ ] **Step 1: Viết test fail**

`frontend/features/classes/classQueries.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getClassRoster, getTeacherClasses } from './classQueries';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('class queries', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the teacher token when listing classes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ classes: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await getTeacherClasses('tok-1');

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/classes$/);
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok-1');
  });

  it('reports an error instead of demo classes when the API fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'nope' }, 401)));
    await expect(getTeacherClasses('tok-1')).resolves.toEqual({ kind: 'error' });
  });

  it('reports an error when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(getTeacherClasses('tok-1')).resolves.toEqual({ kind: 'error' });
  });

  it('maps a 404 roster to not_found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ error: 'x' }, 404)));
    await expect(getClassRoster('c1', 'tok-1')).resolves.toEqual({ kind: 'not_found' });
  });

  it('returns the real roster', async () => {
    const members = [{ student_id: 's1', display_name: 'An', joined_at: '2026-09-20', total_xp: 30, completed_lessons: 1 }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({
      class_room: { id: 'c1', name: '10A1', subject_id: 's', invite_code: 'ABC123' },
      members,
    })));
    await expect(getClassRoster('c1', 'tok-1')).resolves.toEqual({
      kind: 'ready',
      classRoom: { name: '10A1', invite_code: 'ABC123' },
      members,
    });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web exec vitest run features/classes/classQueries.test.ts`
Expected: FAIL — hàm hiện tại trả mảng lớp demo thay vì `{ kind: 'error' }`, không gửi header Authorization.

- [ ] **Step 3: Thay `frontend/features/classes/classQueries.ts`**

```ts
import type { ClassRoomItem } from './ClassList';
import type { StudentMember } from './StudentRoster';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';

export type TeacherClassesResult =
  | { kind: 'ready'; classes: ClassRoomItem[] }
  | { kind: 'error' };

export type ClassRosterResult =
  | { kind: 'ready'; classRoom: { name: string; invite_code: string }; members: StudentMember[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

export async function getTeacherClasses(token: string): Promise<TeacherClassesResult> {
  try {
    const res = await fetch(`${API_BASE}/api/classes`, { cache: 'no-store', headers: authHeaders(token) });
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    return Array.isArray(data.classes) ? { kind: 'ready', classes: data.classes } : { kind: 'error' };
  } catch (err) {
    console.warn('getTeacherClasses failed:', err);
    return { kind: 'error' };
  }
}

export async function getClassRoster(classId: string, token: string): Promise<ClassRosterResult> {
  try {
    const res = await fetch(`${API_BASE}/api/classes/${encodeURIComponent(classId)}/roster`, {
      cache: 'no-store',
      headers: authHeaders(token),
    });
    if (res.status === 404) return { kind: 'not_found' };
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    if (!data.class_room || !Array.isArray(data.members)) return { kind: 'error' };
    return {
      kind: 'ready',
      classRoom: { name: data.class_room.name, invite_code: data.class_room.invite_code },
      members: data.members as StudentMember[],
    };
  } catch (err) {
    console.warn('getClassRoster failed:', err);
    return { kind: 'error' };
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web exec vitest run features/classes/classQueries.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Tạo `frontend/components/feedback/LoadErrorNotice.tsx`**

```tsx
'use client';

import { useLanguage } from '@scipal/hooks';

export function LoadErrorNotice({ message }: { message: { en: string; vi: string } }) {
  const { t } = useLanguage();
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
    >
      {t(message)}
    </div>
  );
}
```

- [ ] **Step 6: Sửa `frontend/app/teacher/classes/page.tsx`**

Thay 3 dòng import và phần đầu component:

```tsx
import Link from 'next/link';
import { ClassList } from '@/features/classes/ClassList';
import { getTeacherClasses } from '@/features/classes/classQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export default async function TeacherClassesPage() {
  const { token } = await getAuthoringSession('/teacher/classes');
  const result = await getTeacherClasses(token);
```

Thay dòng `<ClassList initialClasses={initialClasses} />` bằng:

```tsx
        {result.kind === 'ready' ? (
          <ClassList initialClasses={result.classes} token={token} />
        ) : (
          <LoadErrorNotice
            message={{
              en: 'We could not load your classes. Please reload the page.',
              vi: 'Chưa tải được danh sách lớp học. Vui lòng tải lại trang.',
            }}
          />
        )}
```

- [ ] **Step 7: Sửa `frontend/app/teacher/classes/[id]/page.tsx`**

Thay phần import và đầu component:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StudentRoster } from '@/features/classes/StudentRoster';
import { getClassRoster } from '@/features/classes/classQueries';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';

export const dynamic = 'force-dynamic';

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { token } = await getAuthoringSession(`/teacher/classes/${id}`);
  const result = await getClassRoster(id, token);
  if (result.kind === 'not_found') notFound();

  if (result.kind === 'error') {
    return (
      <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
        <main className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <LoadErrorNotice
            message={{
              en: 'We could not load this class. Please reload the page.',
              vi: 'Chưa tải được lớp học này. Vui lòng tải lại trang.',
            }}
          />
        </main>
      </div>
    );
  }

  const { classRoom, members } = result;
```

Phần JSX còn lại (breadcrumb, `<StudentRoster …/>`) giữ nguyên — vẫn dùng `classRoom` và `members`.

- [ ] **Step 8: Sửa `CreateClassModal.tsx` — gửi slug đúng trường, bỏ lớp giả**

Trong `handleSubmit`, đổi body:

```tsx
        body: JSON.stringify({
          name: name.trim(),
          subject_slug: subjectSlug,
        }),
```

Thay đoạn từ `} catch (err) {` đến ngay trước `setLoading(false);` (tức là bỏ toàn bộ khối "Fallback simulation" tạo lớp giả) bằng:

```tsx
    } catch (err) {
      console.warn('Create class error:', err);
      setError(t({
        en: 'Could not reach the server. Please check your connection and try again.',
        vi: 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      }));
    } finally {
```

(`t` đã có sẵn từ `const { lang, t } = useLanguage();` ở đầu component.)

- [ ] **Step 9: Sửa `ClassList.tsx:77` — bỏ sĩ số giả**

```tsx
                  👥 {cls.student_count ?? 0} học sinh
```

- [ ] **Step 10: Typecheck + test web**

Run: `pnpm --filter @scipal/web typecheck; pnpm --filter @scipal/web exec vitest run`
Expected: không có lỗi typecheck mới so với baseline; mọi test web PASS.

- [ ] **Step 11: Commit**

```bash
git add frontend/components/feedback/LoadErrorNotice.tsx frontend/features/classes/ frontend/app/teacher/classes/
git commit -m "fix(web): load real classes with the teacher token and drop demo fallbacks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Hồ sơ & tiến trình — báo lỗi thay vì số liệu giả

**Files:**
- Modify: `frontend/features/profile/profileQueries.ts` (thay toàn bộ file)
- Modify: `frontend/features/progress/progressQueries.ts` (thay toàn bộ file)
- Create: `frontend/features/profile/profileQueries.test.ts`
- Create: `frontend/features/progress/progressQueries.test.ts`
- Modify: `frontend/app/profile/page.tsx`
- Modify: `frontend/app/progress/page.tsx`
- Modify: `PROJECT_STATE.md`

**Interfaces:**
- Consumes: `LoadErrorNotice` (Task 5).
- Produces:
  - `getUserProfile(userId: string): Promise<UserProfileData>` với `UserProfileData` có thêm `loadFailed: boolean`; khi lỗi: `profile` là dữ liệu đọc được hoặc `null`, `stats = { totalXP: 0, completedLessons: 0, longestStreak: 0 }`.
  - `getUserProgress(userId: string): Promise<ProgressSummary>` với `ProgressSummary` có thêm `loadFailed: boolean`; khi lỗi: mảng rỗng, `totalXP: 0`.

- [ ] **Step 1: Viết test fail**

`frontend/features/profile/profileQueries.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
const tableResults = new Map<string, Result>();

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) b[method] = () => b;
  b.maybeSingle = async () => result;
  b.then = (onOk: (v: Result) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return b;
}

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@scipal/supabase', () => ({
  createServerClient: () => ({
    from: (table: string) => builder(tableResults.get(table) ?? { data: [], error: null }),
  }),
}));

import { getUserProfile } from './profileQueries';

describe('getUserProfile', () => {
  beforeEach(() => tableResults.clear());

  it('sums real stats', async () => {
    tableResults.set('profiles', { data: { id: 'u1', display_name: 'An', role: 'student', avatar_url: null }, error: null });
    tableResults.set('xp_log', { data: [{ delta: 100 }, { delta: 15 }], error: null });
    tableResults.set('progress', { data: [{ id: 'p1' }], error: null });
    tableResults.set('streaks', { data: [{ longest_streak: 2 }, { longest_streak: 4 }], error: null });

    const result = await getUserProfile('u1');

    expect(result.loadFailed).toBe(false);
    expect(result.stats).toEqual({ totalXP: 115, completedLessons: 1, longestStreak: 4 });
  });

  it('flags failure and never invents XP', async () => {
    tableResults.set('xp_log', { data: null, error: { message: 'boom' } });

    const result = await getUserProfile('u1');

    expect(result.loadFailed).toBe(true);
    expect(result.stats).toEqual({ totalXP: 0, completedLessons: 0, longestStreak: 0 });
  });
});
```

`frontend/features/progress/progressQueries.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Result = { data: unknown; error: unknown };
const tableResults = new Map<string, Result>();

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order']) b[method] = () => b;
  b.then = (onOk: (v: Result) => unknown, onErr: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onOk, onErr);
  return b;
}

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));
vi.mock('@scipal/supabase', () => ({
  createServerClient: () => ({
    from: (table: string) => builder(tableResults.get(table) ?? { data: [], error: null }),
  }),
}));

import { getUserProgress } from './progressQueries';

describe('getUserProgress', () => {
  beforeEach(() => tableResults.clear());

  it('returns real totals', async () => {
    tableResults.set('xp_log', { data: [{ delta: 40 }, { delta: 60 }], error: null });

    const result = await getUserProgress('u1');

    expect(result.loadFailed).toBe(false);
    expect(result.totalXP).toBe(100);
  });

  it('flags failure with empty data instead of preview data', async () => {
    tableResults.set('streaks', { data: null, error: { message: 'boom' } });

    const result = await getUserProgress('u1');

    expect(result).toEqual({ completedLessons: [], streaks: [], totalXP: 0, badges: [], loadFailed: true });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web exec vitest run features/profile/profileQueries.test.ts features/progress/progressQueries.test.ts`
Expected: FAIL — `loadFailed` là `undefined`; khi lỗi, profile trả stats `totalXP` từ dữ liệu null (không cờ), progress trả mảng rỗng thay vì cờ (hoặc dữ liệu preview khi throw).

- [ ] **Step 3: Thay `frontend/features/profile/profileQueries.ts`**

```ts
import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';

export interface UserProfileData {
  profile: {
    id: string;
    display_name?: string | null;
    role?: 'student' | 'teacher' | string;
    avatar_url?: string | null;
  } | null;
  stats: {
    totalXP: number;
    completedLessons: number;
    longestStreak: number;
  };
  /** True when any stats query failed; stats are then zeros, not real values. */
  loadFailed: boolean;
}

const EMPTY_STATS: UserProfileData['stats'] = { totalXP: 0, completedLessons: 0, longestStreak: 0 };

export async function getUserProfile(userId: string): Promise<UserProfileData> {
  try {
    const supabase = createServerClient(await cookies());

    const [profileRes, xpRes, progressRes, streakRes] = await Promise.all([
      supabase.from('profiles').select('id, display_name, role, avatar_url').eq('id', userId).maybeSingle(),
      supabase.from('xp_log').select('delta').eq('user_id', userId),
      supabase.from('progress').select('id').eq('user_id', userId),
      supabase.from('streaks').select('longest_streak').eq('user_id', userId),
    ]);

    if (profileRes.error || xpRes.error || progressRes.error || streakRes.error) {
      console.warn('getUserProfile query failed:', profileRes.error ?? xpRes.error ?? progressRes.error ?? streakRes.error);
      return { profile: profileRes.data ?? null, stats: EMPTY_STATS, loadFailed: true };
    }

    return {
      profile: profileRes.data ?? null,
      stats: {
        totalXP: (xpRes.data ?? []).reduce((sum, row) => sum + (row.delta ?? 0), 0),
        completedLessons: (progressRes.data ?? []).length,
        longestStreak: (streakRes.data ?? []).reduce((max, s) => Math.max(max, s.longest_streak ?? 0), 0),
      },
      loadFailed: false,
    };
  } catch (err) {
    console.warn('getUserProfile failed:', err);
    return { profile: null, stats: EMPTY_STATS, loadFailed: true };
  }
}
```

- [ ] **Step 4: Thay `frontend/features/progress/progressQueries.ts`**

```ts
import { createServerClient } from '@scipal/supabase';
import { cookies } from 'next/headers';

export interface ProgressSummary {
  completedLessons: Array<{
    id: string;
    score: number | null;
    lessons: { title_vi: string; subjects?: { name_vi: string } | null } | null;
  }>;
  streaks: Array<{
    subject_id: string;
    current_streak: number;
    last_active: string | null;
    subjects: { name_vi: string; accent_color: string } | null;
  }>;
  totalXP: number;
  badges: Array<{
    earned_at: string;
    badges: { name_vi: string; icon: string } | null;
  }>;
  /** True when any query failed; the lists are then empty, not real values. */
  loadFailed: boolean;
}

function failed(): ProgressSummary {
  return { completedLessons: [], streaks: [], totalXP: 0, badges: [], loadFailed: true };
}

export async function getUserProgress(userId: string): Promise<ProgressSummary> {
  try {
    const supabase = createServerClient(await cookies());

    const [progressRes, streaksRes, xpRes, badgesRes] = await Promise.all([
      supabase
        .from('progress')
        .select('*, lessons(title_vi, subjects(name_vi))')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false }),
      supabase
        .from('streaks')
        .select('*, subjects(name_vi, accent_color)')
        .eq('user_id', userId),
      supabase
        .from('xp_log')
        .select('delta, subject_id, reason, created_at')
        .eq('user_id', userId),
      supabase
        .from('user_badges')
        .select('earned_at, badges(name_vi, icon)')
        .eq('user_id', userId),
    ]);

    if (progressRes.error || streaksRes.error || xpRes.error || badgesRes.error) {
      console.warn('getUserProgress query failed:', progressRes.error ?? streaksRes.error ?? xpRes.error ?? badgesRes.error);
      return failed();
    }

    return {
      completedLessons: (progressRes.data ?? []) as unknown as ProgressSummary['completedLessons'],
      streaks: (streaksRes.data ?? []) as unknown as ProgressSummary['streaks'],
      totalXP: (xpRes.data ?? []).reduce((sum, row) => sum + row.delta, 0),
      badges: (badgesRes.data ?? []) as unknown as ProgressSummary['badges'],
      loadFailed: false,
    };
  } catch (err) {
    console.warn('getUserProgress failed:', err);
    return failed();
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web exec vitest run features/profile/profileQueries.test.ts features/progress/progressQueries.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Sửa `frontend/app/profile/page.tsx`**

Thêm import:

```tsx
import { redirect } from 'next/navigation';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
```

Thay hai dòng:

```tsx
  const userId = user?.id ?? 'demo-explorer-user';
  const { profile, stats } = await getUserProfile(userId);
```

bằng:

```tsx
  if (!user) redirect('/login?redirect=%2Fprofile');
  const { profile, stats, loadFailed } = await getUserProfile(user.id);
```

Thay toàn bộ khối banner demo `{!user && ( … Demo Explorer … )}` bằng:

```tsx
        {loadFailed && (
          <LoadErrorNotice
            message={{
              en: 'We could not load your learning stats. The numbers below may be incomplete — please reload.',
              vi: 'Chưa tải được số liệu học tập. Số liệu bên dưới có thể chưa đầy đủ — vui lòng tải lại trang.',
            }}
          />
        )}
```

Đổi `isAuthenticated={user !== null}` thành `isAuthenticated`.

- [ ] **Step 7: Sửa `frontend/app/progress/page.tsx`**

Thêm import:

```tsx
import { redirect } from 'next/navigation';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
```

Thay khối từ `let userId = 'anon-demo-user';` đến hết dòng `const { completedLessons, streaks, totalXP, badges } = await getUserProgress(userId);` bằng:

```tsx
  const supabase = createServerClient(await cookies());
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fprogress');

  const { completedLessons, streaks, totalXP, badges, loadFailed } = await getUserProgress(user.id);
```

Chèn ngay sau thẻ `</nav>` của breadcrumb (trước comment `{/* Gamified Header Card */}`):

```tsx
        {loadFailed && (
          <LoadErrorNotice
            message={{
              en: 'We could not load your progress. Please reload the page.',
              vi: 'Chưa tải được tiến trình học tập. Vui lòng tải lại trang.',
            }}
          />
        )}
```

- [ ] **Step 8: Kiểm tra toàn bộ**

Run: `pnpm turbo typecheck; pnpm turbo test`
Expected: số lỗi typecheck không tăng so với `$TEMP/baseline-typecheck.txt`; mọi test PASS.

Run: `grep -rn "SERVICE_ROLE" frontend/ mobile/ packages/`
Expected: không có kết quả.

Run: `grep -rn "demo-explorer-user\|anon-demo-user\|demo-teacher-id\|demo-student-id\|totalXP: 350" frontend backend/src`
Expected: không có kết quả.

- [ ] **Step 9: Build**

Run: `pnpm turbo build --filter=@scipal/web --filter=@scipal/api`
Expected: build thành công.

- [ ] **Step 10: Cập nhật `PROJECT_STATE.md`**

Thêm vào đầu mục `## Recent Decisions`:

```markdown
- **26/09 — Siết bảo mật & toàn vẹn dữ liệu:** Client chỉ còn quyền đọc `progress`/`xp_log`/`streaks`/`user_badges`; `profiles` chỉ cho sửa `display_name`, `avatar_url`, `preferred_education_level`. `questions`/`exam_blueprints` chỉ backend đọc. Policy lớp học dùng hàm `private.is_class_teacher/is_class_member` để hết đệ quy. XP bài thi cộng một lần mỗi (user, đề) qua `xp_log_exam_once_idx`, reason `exam_complete:<blueprint_id>`. API lớp học kiểm tra role và quyền sở hữu; khảo sát gắn user khi có token và báo lỗi khi không lưu được. Trang lớp/hồ sơ/tiến trình hiện lỗi thay vì dữ liệu demo. `supabase/full_schema_and_seed.sql` chỉ còn là snapshot lịch sử.
```

Trong `## Known Issues / Blockers`, nếu migration **chưa** được áp lên DB thật thì thêm:

```markdown
- Migration `20260926090000_security_hardening_rls.sql` và `20260926090100_exam_xp_once.sql` đã viết nhưng chưa áp lên Supabase từ xa; chạy `backend/scripts/verify-rls.ts` sau khi áp.
```

- [ ] **Step 11: Commit**

```bash
git add frontend/features/profile/ frontend/features/progress/ frontend/app/profile/page.tsx frontend/app/progress/page.tsx PROJECT_STATE.md
git commit -m "fix(web): show load errors instead of invented profile and progress stats

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Ngoài phạm vi (ghi lại, không làm trong plan này)

- Blueprint đề thi thật: `GET /api/exam/:id/questions` vẫn lấy 20 câu bất kỳ, và `/exam` vẫn dùng danh sách đề demo. Cần spec riêng cho cấu trúc `exam_blueprints.sections`.
- `POST /api/score/lesson` cộng 100 XP không phụ thuộc quiz; ghi `progress` + `xp_log` chưa nằm trong một transaction (nên chuyển sang hàm Postgres/RPC).
- AI Tutor (`/api/ai/chat`, token `null` ở trang bài học).
- Gộp hai `SubjectProvider`, bỏ `--accent` khỏi `:root`, chuỗi tiếng Việt hard-code ở trang môn/bài.
- Xoá code chết từ dự án Katha (`AuthCard`, `KathaMascot`, `KhmerVine`, …).
