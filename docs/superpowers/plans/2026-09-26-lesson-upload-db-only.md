# v1.9 Đợt 2 — Đăng bài từ database, bỏ dữ liệu demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Giáo viên tạo được chủ đề và bài cho mọi môn/lớp có trong catalog GDPT 2018, nạp nội dung từ JSON; trang môn, trang bài và phòng thi chỉ đọc dữ liệu thật từ database, không còn nội dung demo trong code.

**Architecture:** Backend Fastify mở rộng `authoring.ts` (tuỳ chọn soạn bài theo catalog, tạo chủ đề, kiểm tra lớp/track khi tạo bài) và `exam.ts` (danh sách đề, bỏ đề demo). Logic thuần tách ra `backend/src/authoring/topicPlanning.ts` và `backend/src/exam/blueprintSummary.ts` để test không cần DB. Frontend dùng các hàm phân loại kết quả thuần (`ok` / `not_found` / `error`) cho trang môn, trang bài, phòng thi; trang render động bằng `createServerClient` và `SubjectProvider` của `@scipal/ui`.

**Tech Stack:** Fastify 4 + vitest (`@scipal/api`), Next.js 15 App Router + vitest môi trường `node` (`@scipal/web`), Supabase Postgres + RLS, Zod (`BlockSchema` của `@scipal/types`), pnpm + Turborepo.

**Spec:** [`docs/superpowers/specs/2026-09-26-lesson-upload-db-only-design.md`](../specs/2026-09-26-lesson-upload-db-only-design.md), làm sau [plan v1.9 đợt 1](./2026-09-26-v1.9-wave1-content-schema.md).

## Đối chiếu spec (quyết định của plan)

Spec viết trước khi đợt 1 xong; các điểm lệch được chốt như sau:

1. §2 "Ngoài phạm vi: `subject_grade_catalog`, track, `status`" đã lỗi thời — đợt 1 đã làm; plan dùng chúng.
2. §4.3 `GET /api/authoring/options` trả `education_level` — cột này bị xoá ở migration `20260927090200`. Thay bằng `grades: number[]` (các lớp có dòng catalog `active`); cấp học suy từ lớp.
3. §4.3/§5 "lớp ngoài khoảng cấp học" = "lớp không có dòng `subject_grade_catalog` đang `active` của môn".
4. §5 test migration: không có migration mới; `v19-schema-migration.test.ts` đã phủ lớp 1–12 và `topics.grade`.
5. §1 mục tiêu 1 và §5 nghiệm thu 3 ("không còn `DEMO_` hay dữ liệu viết cứng") đòi bỏ cả đề demo trong `backend/src/routes/exam.ts` và `frontend/features/exam/examQueries.ts`, dù §4 không liệt kê → Task 5.
6. §4.3 nhận `track_id`, §4.4 không nói → form hiện ô **Định hướng / Track** (không bắt buộc) chỉ khi môn + lớp có track (Tin học, Công nghệ lớp 10–12).
7. §4.4 "chủ đề của đúng môn + lớp": chủ đề cũ có `grade = null` (ví dụ `topic-f-algorithms` trên DB thật) vẫn hiện cho mọi lớp của môn, để bài cũ không bị mồ côi; API chấp nhận vì `topic.grade = null`.
8. §4.3 cho admin gọi `options` và `topics`; tạo bài vẫn chỉ giáo viên (`verifyTeacherOnly`, "như hiện tại") và trang `/teacher/lessons/new-lesson` vẫn chuyển admin về trang duyệt. Admin có quyền API tạo chủ đề nhưng chưa có giao diện — ghi vào câu hỏi mở.

## Global Constraints

- Không thêm dependency mới (root, `frontend`, `backend`, `packages`).
- Không đọc/ghi cột đã xoá: `lessons.published`, `lessons.review_status`, `subjects.status`, `subjects.education_level`. Trạng thái bài chỉ là `lessons.status ∈ {draft, pending_review, published, rejected}`.
- Lớp hợp lệ của môn = `grade` có dòng `subject_grade_catalog` với `active = true` của môn đó.
- Chuỗi hiển thị mới có cả EN và VI, render qua `useLanguage().t({ en, vi })` trong client component.
- Màu môn chỉ qua `SubjectProvider` của `@scipal/ui` (`slug` + `accentColor` từ DB); không gán `--accent` lên `:root`, không dùng `features/subjects/SubjectContext.tsx`.
- Tệp JSON nhập bài tối đa **1 048 576 byte**; tiêu đề sau `trim` dài 1–200 ký tự.
- Khối nội dung kiểm tra bằng `BlockSchema` của `@scipal/types` ở frontend và `backend/src/schemas/blocks.ts` ở backend (không đổi hai schema này).
- Không gửi `answer`, `answer_key` xuống client.
- Không chạy SQL lên Supabase từ xa trong plan này; script dọn demo do người phụ trách tự chạy.
- Commit message kết thúc bằng dòng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Xoá chủ đề demo kéo theo bài thật**: trên DB thật `topic-f-algorithms` chứa cả bài `test` (lớp 10) của giáo viên, và `xp_log.lesson_id` / `questions.lesson_id` tham chiếu `lessons` **không** `ON DELETE` → xoá bài có lịch sử XP sẽ lỗi khoá ngoại. Script phải liệt kê mọi bài bị xoá dây chuyền, gỡ tham chiếu trước khi xoá, và mặc định `rollback`. Test ở Task 8.
2. **Chủ đề `grade = null` có bài ở nhiều lớp**: trang môn phải xếp từng bài vào đúng lớp của bài, chủ đề hiện ở mỗi nhóm lớp có bài của nó. Test ở Task 6.
3. **Tên chủ đề trùng chỉ khác hoa thường/khoảng trắng** (`"  thuật toán "` với `"Thuật toán"`): API trả `409` kèm chủ đề sẵn có, không tạo bản sao. Test ở Task 1.
4. **Tệp JSON hợp lệ cú pháp nhưng sai nội dung**: tiêu đề chỉ có khoảng trắng, object thiếu khoá `blocks` → báo lỗi, trình soạn thảo giữ nguyên. Test ở Task 4.
5. **Lỗi hạ tầng khác "không tìm thấy"**: `createServerClient` ném lỗi (thiếu biến môi trường) hay truy vấn trả `error` → trạng thái "Chưa tải được dữ liệu", không 404. Test ở Task 6.

---

## File Structure

| Đường dẫn | Trách nhiệm |
|---|---|
| `backend/src/authoring/topicPlanning.ts` | Tạo: `makeSlug`, `toSubjectOptions`, `planNewTopic` (thuần) |
| `backend/src/routes/authoring.ts` | Sửa: `options` theo catalog + admin, `POST /api/authoring/topics`, kiểm tra lớp/track khi tạo bài |
| `backend/src/exam/blueprintSummary.ts` | Tạo: `countBlueprintQuestions`, `toBlueprintSummary` (thuần) |
| `backend/src/routes/exam.ts` | Sửa: `GET /api/exam/blueprints`, bỏ đề/đáp án demo |
| `backend/src/__tests__/authoring-topics.test.ts` | Tạo |
| `backend/src/__tests__/authoring-lesson-create.test.ts` | Tạo |
| `backend/src/__tests__/exam-blueprints.test.ts` | Tạo |
| `backend/src/__tests__/exam.test.ts` | Sửa: bỏ giả định đề demo |
| `frontend/features/landing/educationLevel.ts` | Sửa: chuyển `levelOfGrade` vào đây, thêm `EDUCATION_LEVEL_LABELS` |
| `frontend/features/authoring/authoringQueries.ts` | Sửa: kiểu tuỳ chọn mới |
| `frontend/features/authoring/lessonFormOptions.ts` (+`.test.ts`) | Tạo: nhóm môn theo cấp, lọc chủ đề/track |
| `frontend/features/authoring/topicApi.ts` (+`.test.ts`) | Tạo: gọi `POST /api/authoring/topics` |
| `frontend/features/authoring/LessonCreateForm.tsx` | Sửa: môn → lớp → track → chủ đề (+ tạo mới) → tiêu đề |
| `frontend/features/authoring/lessonImport.ts` (+`.test.ts`) | Tạo: kiểm tra tệp JSON |
| `frontend/features/authoring/LessonEditor.tsx` | Sửa: nút "Nhập từ JSON" |
| `frontend/features/lessons/subjectPageQuery.ts` (+`.test.ts`) | Tạo, thay `lessonQueries.ts` |
| `frontend/features/lessons/lessonDetailQuery.ts` (+`.test.ts`) | Sửa: kết quả có phân loại |
| `frontend/features/lessons/SubjectPageNotices.tsx` | Tạo: dòng cấp học, tiêu đề lớp, "Đang biên soạn" (client) |
| `frontend/components/feedback/LoadErrorNotice.tsx` | Sửa: thêm nút thử lại tuỳ chọn |
| `frontend/app/[subject]/page.tsx`, `frontend/app/[subject]/[lesson]/page.tsx` | Sửa: đọc DB, bỏ `SUBJECT_CONFIG` |
| `frontend/features/subjects/SubjectContext.tsx`, `frontend/features/lessons/lessonQueries.ts` | Xoá |
| `frontend/features/exam/examQueries.ts` (+`.test.ts`) | Sửa: bỏ đề demo, kết quả có phân loại |
| `frontend/features/exam/ExamListNotices.tsx` | Tạo: "Chưa có đề thi" (client) |
| `frontend/app/exam/page.tsx`, `frontend/app/exam/[blueprintId]/page.tsx` | Sửa |
| `supabase/manual/remove_demo_content.sql` | Tạo: script dọn demo chạy tay |
| `backend/src/__tests__/remove-demo-content.test.ts` | Tạo: test hợp đồng cho script |
| `supabase/full_schema_and_seed.sql` | Sửa: cảnh báo dữ liệu demo |
| `PROJECT_STATE.md` | Sửa |

Lệnh test: backend `pnpm --filter @scipal/api test -- <tên>`; web `pnpm --filter @scipal/web test -- <tên>`.

---

### Task 1: Tuỳ chọn soạn bài theo catalog và API tạo chủ đề

**Files:**
- Create: `backend/src/authoring/topicPlanning.ts`
- Modify: `backend/src/routes/authoring.ts` (route `GET /api/authoring/options`; thêm `POST /api/authoring/topics`; xoá `makeSlug` cục bộ, import từ `topicPlanning.ts`)
- Test: `backend/src/__tests__/authoring-topics.test.ts`

**Interfaces:**
- Produces (`backend/src/authoring/topicPlanning.ts`):
  - `makeSlug(value: string): string` — chuyển nguyên văn hàm đang có trong `authoring.ts`.
  - `interface SubjectCatalogRow { id: string; slug: string; name_en: string; name_vi: string; sort_order: number; subject_grade_catalog: Array<{ grade: number; active: boolean }> }`
  - `interface SubjectOption { id: string; slug: string; name_en: string; name_vi: string; sort_order: number; grades: number[] }`
  - `toSubjectOptions(rows: SubjectCatalogRow[]): SubjectOption[]` — chỉ lớp `active`, tăng dần, không trùng; bỏ môn không còn lớp nào; giữ thứ tự đầu vào.
  - `interface ExistingTopic { id: string; slug: string; grade: number | null; name_en: string; name_vi: string; sort_order: number }`
  - `planNewTopic(existing: ExistingTopic[], input: { grade: number; name_en: string; name_vi: string }): { kind: 'duplicate'; topic: ExistingTopic } | { kind: 'new'; slug: string; sort_order: number }`
- Produces (HTTP):
  - `GET /api/authoring/options` (teacher, admin) → `200 { subjects: SubjectOption[]; topics: Array<{ id; subject_id; grade: number | null; name_en; name_vi; sort_order }>; tracks: Array<{ id; subject_id; slug; name_en; name_vi; grades: number[] }> }`.
  - `POST /api/authoring/topics` (teacher, admin), body `{ subject_id, grade, name_en, name_vi, sort_order? }` → `201 { topic }` | `409 { error, topic }` | `400` | `403` | `503`.

- [ ] **Step 1: Viết test (fail)**

```ts
// backend/src/__tests__/authoring-topics.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authPlugin } from '../plugins/auth.js';
import { authoringRoutes } from '../routes/authoring.js';
import { planNewTopic, toSubjectOptions, type ExistingTopic } from '../authoring/topicPlanning.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };

async function buildApp(user: object | null, tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => {
    if (user) (request as any).user = user;
  });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

const topic = (over: Partial<ExistingTopic>): ExistingTopic => ({
  id: 't1', slug: 'g4-thuat-toan', grade: 4, name_en: 'Algorithms', name_vi: 'Thuật toán', sort_order: 0, ...over,
});

describe('planNewTopic', () => {
  it('treats names differing only by case and spaces as duplicates in the same grade', () => {
    const existing = [topic({})];
    expect(planNewTopic(existing, { grade: 4, name_en: 'Other', name_vi: '  thuật toán ' }))
      .toEqual({ kind: 'duplicate', topic: existing[0] });
    expect(planNewTopic(existing, { grade: 5, name_en: 'Algorithms', name_vi: 'Thuật toán' }).kind).toBe('new');
  });

  it('prefixes the grade and suffixes clashes within the subject', () => {
    const existing = [topic({ slug: 'g4-plants', name_en: 'x', name_vi: 'x' }), topic({ id: 't2', slug: 'g4-plants-2', name_en: 'y', name_vi: 'y' })];
    expect(planNewTopic(existing, { grade: 4, name_en: 'Plants', name_vi: 'Thực vật' }))
      .toMatchObject({ kind: 'new', slug: 'g4-plants-3' });
    expect(planNewTopic([], { grade: 7, name_en: '!!!', name_vi: 'Chủ đề' }))
      .toMatchObject({ slug: 'g7-chu-de' });
  });

  it('orders a new topic after the last one of the same grade', () => {
    const existing = [topic({ sort_order: 3 }), topic({ id: 't2', slug: 'g5-a', grade: 5, sort_order: 9, name_en: 'a', name_vi: 'a' })];
    expect(planNewTopic(existing, { grade: 4, name_en: 'New', name_vi: 'Mới' })).toMatchObject({ sort_order: 4 });
    expect(planNewTopic([], { grade: 4, name_en: 'New', name_vi: 'Mới' })).toMatchObject({ sort_order: 0 });
  });
});

describe('toSubjectOptions', () => {
  it('keeps active grades sorted and drops subjects without any', () => {
    const rows = [
      { id: 'm', slug: 'math', name_en: 'Math', name_vi: 'Toán', sort_order: 2,
        subject_grade_catalog: [{ grade: 2, active: true }, { grade: 1, active: true }, { grade: 3, active: false }] },
      { id: 'x', slug: 'retired', name_en: 'R', name_vi: 'R', sort_order: 3, subject_grade_catalog: [{ grade: 1, active: false }] },
    ];
    expect(toSubjectOptions(rows)).toEqual([
      { id: 'm', slug: 'math', name_en: 'Math', name_vi: 'Toán', sort_order: 2, grades: [1, 2] },
    ]);
  });
});

describe('GET /api/authoring/options', () => {
  const tables = () => ({
    subjects: mockQuery({ data: [{ id: SUBJECT_ID, slug: 'science', name_en: 'Science', name_vi: 'Khoa học', sort_order: 9,
      subject_grade_catalog: [{ grade: 4, active: true }, { grade: 5, active: true }] }], error: null }),
    topics: mockQuery({ data: [], error: null }),
    subject_tracks: mockQuery({ data: [], error: null }),
  });

  it('serves admins as well as teachers, with catalog grades', async () => {
    for (const user of [teacher, admin]) {
      const app = await buildApp(user, tables());
      const res = await app.inject({ method: 'GET', url: '/api/authoring/options' });
      expect(res.statusCode).toBe(200);
      expect(res.json().subjects[0].grades).toEqual([4, 5]);
      expect(res.json()).toHaveProperty('tracks');
      await app.close();
    }
  });

  it('refuses students', async () => {
    const app = await buildApp(student, tables());
    expect((await app.inject({ method: 'GET', url: '/api/authoring/options' })).statusCode).toBe(403);
    await app.close();
  });
});

describe('POST /api/authoring/topics', () => {
  const payload = { subject_id: SUBJECT_ID, grade: 4, name_en: 'Plants and animals', name_vi: 'Thực vật và động vật' };

  it('requires a token', async () => {
    const app = Fastify();
    await app.register(authPlugin);
    await app.register(authoringRoutes);
    await app.ready();
    expect((await app.inject({ method: 'POST', url: '/api/authoring/topics', payload })).statusCode).toBe(401);
    await app.close();
  });

  it('refuses students', async () => {
    const app = await buildApp(student, {});
    expect((await app.inject({ method: 'POST', url: '/api/authoring/topics', payload })).statusCode).toBe(403);
    await app.close();
  });

  it('rejects a grade outside the subject catalog', async () => {
    const app = await buildApp(teacher, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: null, error: null }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload: { ...payload, grade: 11 } });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('returns the existing topic on a duplicate name', async () => {
    const app = await buildApp(teacher, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
      topics: mockQuery({ data: [topic({ id: 'dup', name_vi: 'Thực vật và động vật' })], error: null }),
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload: { ...payload, name_vi: ' thực vật VÀ động vật ' } });
    expect(res.statusCode).toBe(409);
    expect(res.json().topic.id).toBe('dup');
    await app.close();
  });

  it('creates a core topic with a grade-prefixed slug', async () => {
    const insert = mockQuery({ data: { id: 'new', slug: 'g4-plants-and-animals' }, error: null });
    const app = await buildApp(admin, {
      subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
      subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
      topics: [mockQuery({ data: [], error: null }), insert],
    });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/topics', payload });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({
      subject_id: SUBJECT_ID, grade: 4, kind: 'core', slug: 'g4-plants-and-animals', sort_order: 0,
      name_en: 'Plants and animals', name_vi: 'Thực vật và động vật',
    });
    await app.close();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api test -- authoring-topics`
Expected: FAIL — không resolve được `../authoring/topicPlanning.js`.

- [ ] **Step 3: Viết `topicPlanning.ts`**

`planNewTopic`: so trùng khi `grade` bằng nhau và `name_en` hoặc `name_vi` bằng nhau sau `trim().toLowerCase()`. Slug gốc `g{grade}-{makeSlug(name_en)}`; nếu `makeSlug(name_en)` rỗng dùng `g{grade}-{makeSlug(name_vi)}`, rỗng nữa thì `g{grade}-chu-de`. Nếu slug gốc đã có trong `existing` (mọi lớp của môn) thì thử `-2`, `-3`… `sort_order` = max `sort_order` của chủ đề cùng `grade` + 1, không có thì `0`; `input` có `sort_order` hợp lệ thì route dùng giá trị đó thay vì giá trị này.

- [ ] **Step 4: Sửa route `options`**

`preHandler: [verifyTeacher]`. Ba truy vấn song song:
- `subjects`: `.select('id, slug, name_en, name_vi, sort_order, subject_grade_catalog(grade, active)').order('sort_order')` → `toSubjectOptions`.
- `topics`: `.select('id, subject_id, grade, name_en, name_vi, sort_order').order('sort_order')`.
- `subject_tracks`: `.select('id, subject_id, slug, name_en, name_vi, grades').order('sort_order')`.

Lỗi bất kỳ → `500` (thông điệp hiện có).

- [ ] **Step 5: Thêm `POST /api/authoring/topics`**

`preHandler: [verifyTeacher]`; `503` khi thiếu DB; `401` khi thiếu `user.id`. Kiểm tra body: `subject_id` khớp `UUID_PATTERN`; `grade` số nguyên 1–12; `name_en`, `name_vi` qua `asText(…, 200)`; `sort_order` nếu có là số nguyên ≥ 0. Thứ tự truy vấn (test phụ thuộc thứ tự này):
1. `subjects` `.select('id').eq('id', subject_id).maybeSingle()` — không có → `400 'Môn học đã chọn không tồn tại.'`
2. `subject_grade_catalog` `.select('id').eq('subject_id', …).eq('grade', …).eq('active', true).limit(1).maybeSingle()` — không có → `400 'Lớp này không thuộc chương trình của môn đã chọn.'`
3. `topics` `.select('id, slug, grade, name_en, name_vi, sort_order').eq('subject_id', …)` → `planNewTopic`; `duplicate` → `409 { error: 'Chủ đề này đã có.', topic }`.
4. `topics` `.insert({ subject_id, grade, kind: 'core', slug, name_en, name_vi, sort_order }).select('id, subject_id, grade, name_en, name_vi, sort_order').single()`; lỗi `23505` → `409 { error: 'Chủ đề này đã có.' }`; lỗi khác → `500`.

Trả `201 { topic }`.

- [ ] **Step 6: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck`
Expected: PASS, không lỗi typecheck.

- [ ] **Step 7: Commit**

```bash
git add backend/src/authoring backend/src/routes/authoring.ts backend/src/__tests__/authoring-topics.test.ts
git commit -m "feat(api): catalog-based authoring options and topic creation"
```

---

### Task 2: Tạo bài kiểm tra lớp theo catalog, chủ đề và track

**Files:**
- Modify: `backend/src/routes/authoring.ts` (route `POST /api/authoring/lessons`)
- Test: `backend/src/__tests__/authoring-lesson-create.test.ts`

**Interfaces:**
- Consumes: `UUID_PATTERN`, `asText` trong `authoring.ts`.
- Produces: body `POST /api/authoring/lessons` = `{ topic_id, grade, title_en, title_vi, track_id? }`; `grade` **bắt buộc** (bỏ mặc định `10`); bài tạo ra có `status: 'draft'`, `track_id` (hoặc `null`).

- [ ] **Step 1: Viết test (fail)**

```ts
// backend/src/__tests__/authoring-lesson-create.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { authoringRoutes } from '../routes/authoring.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const TOPIC_ID = '33333333-3333-4333-8333-333333333333';
const SUBJECT_ID = '11111111-1111-4111-8111-111111111111';
const TRACK_ID = '44444444-4444-4444-8444-444444444444';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const body = { topic_id: TOPIC_ID, grade: 11, title_en: 'Search', title_vi: 'Tìm kiếm' };

async function buildApp(tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (request) => { (request as any).user = teacher; });
  await app.register(authoringRoutes);
  await app.ready();
  return app;
}

const baseTables = (over: Record<string, unknown> = {}) => ({
  topics: mockQuery({ data: { id: TOPIC_ID, subject_id: SUBJECT_ID, grade: null }, error: null }),
  subjects: mockQuery({ data: { id: SUBJECT_ID }, error: null }),
  subject_grade_catalog: mockQuery({ data: { id: 'c1' }, error: null }),
  subject_tracks: mockQuery({ data: { id: TRACK_ID, subject_id: SUBJECT_ID, grades: [10, 11, 12] }, error: null }),
  lessons: [mockQuery({ data: null, error: null }), mockQuery({ data: { id: 'lesson-1' }, error: null })],
  ...over,
});

describe('POST /api/authoring/lessons grade rules', () => {
  it('requires a grade', async () => {
    const app = await buildApp(baseTables());
    const { grade: _grade, ...noGrade } = body;
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: noGrade })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a grade that differs from the topic grade', async () => {
    const app = await buildApp(baseTables({
      topics: mockQuery({ data: { id: TOPIC_ID, subject_id: SUBJECT_ID, grade: 10 }, error: null }),
    }));
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: body })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a grade outside the subject catalog', async () => {
    const app = await buildApp(baseTables({ subject_grade_catalog: mockQuery({ data: null, error: null }) }));
    expect((await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: body })).statusCode).toBe(400);
    await app.close();
  });

  it('rejects a track from another subject or grade', async () => {
    for (const track of [
      { id: TRACK_ID, subject_id: 'other-subject', grades: [11] },
      { id: TRACK_ID, subject_id: SUBJECT_ID, grades: [10] },
    ]) {
      const app = await buildApp(baseTables({ subject_tracks: mockQuery({ data: track, error: null }) }));
      const res = await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: { ...body, track_id: TRACK_ID } });
      expect(res.statusCode).toBe(400);
      await app.close();
    }
  });

  it('creates a draft on any catalog subject with the chosen track', async () => {
    const tables = baseTables();
    const insert = (tables.lessons as ReturnType<typeof mockQuery>[])[1]!;
    const app = await buildApp(tables);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/lessons', payload: { ...body, track_id: TRACK_ID } });
    expect(res.statusCode).toBe(201);
    expect(insert.inserted[0]).toMatchObject({ grade: 11, status: 'draft', track_id: TRACK_ID, subject_id: SUBJECT_ID });
    await app.close();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api test -- authoring-lesson-create`
Expected: FAIL — 4/5 test sai mã trạng thái (route mặc định lớp 10, không đọc `grade` của chủ đề, catalog hay track).

- [ ] **Step 3: Sửa route**

- `grade` thiếu hoặc không phải số nguyên 1–12 → `400 'Vui lòng chọn lớp (1–12).'`
- `track_id` nếu có phải khớp `UUID_PATTERN`, sai → `400`.
- Chủ đề: `.select('id, subject_id, grade')`; `topic.grade !== null && topic.grade !== grade` → `400 'Lớp của bài phải trùng lớp của chủ đề.'`
- Sau khi xác nhận môn: `subject_grade_catalog` như Task 1 bước 5.2 → không có → `400 'Lớp này không thuộc chương trình của môn đã chọn.'`
- Có `track_id`: `subject_tracks` `.select('id, subject_id, grades').eq('id', track_id).maybeSingle()`; không có, khác `subject_id`, hoặc `grades` không chứa `grade` → `400 'Định hướng không thuộc môn và lớp đã chọn.'`
- Insert thêm `track_id: trackId ?? null`. Vòng kiểm tra slug và phần còn lại giữ nguyên.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/routes/authoring.ts backend/src/__tests__/authoring-lesson-create.test.ts
git commit -m "feat(api): validate lesson grade against catalog, topic and track"
```

---

### Task 3: Danh sách đề thi và bỏ đề demo ở backend

**Files:**
- Create: `backend/src/exam/blueprintSummary.ts`
- Modify: `backend/src/routes/exam.ts`
- Test: `backend/src/__tests__/exam-blueprints.test.ts`; sửa `backend/src/__tests__/exam.test.ts`

**Interfaces:**
- Produces (`backend/src/exam/blueprintSummary.ts`):
  - `countBlueprintQuestions(sections: unknown): number` — tổng `count` (số nguyên ≥ 0) của các phần tử mảng; phần tử khác bị bỏ qua; không phải mảng → `0`.
  - `interface BlueprintSummary { id: string; name: string; grade: number | null; subject_id: string | null; subject_slug: string | null; subject_name_en: string | null; subject_name_vi: string | null; question_count: number }`
  - `toBlueprintSummary(row: { id: string; name: string; grade: number | null; subject_id: string | null; sections: unknown; subjects: { slug: string; name_en: string; name_vi: string } | Array<…> | null }): BlueprintSummary`
- Produces (HTTP, public):
  - `GET /api/exam/blueprints` → `200 { blueprints: BlueprintSummary[] }` | `500` | `503`.
  - `GET /api/exam/:blueprintId/questions` → `200 { blueprint: BlueprintSummary; questions }` | `404` (không có đề) | `503` (không có DB). Không còn câu hỏi/đề demo.
  - `POST /api/score/exam`: bỏ bảng đáp án `q-demo-*`; câu không có trong DB không được tính đúng.

- [ ] **Step 1: Viết test (fail)**

```ts
// backend/src/__tests__/exam-blueprints.test.ts
import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examRoutes } from '../routes/exam.js';
import { countBlueprintQuestions } from '../exam/blueprintSummary.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

const BP = '22222222-2222-4222-8222-222222222222';
const row = {
  id: BP, name: 'Tin học 11 — Giữa kì', grade: 11, subject_id: 's1',
  sections: [{ count: 10, type: 'mc' }, { count: 5 }, { note: 'x' }],
  subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học' },
};

async function buildApp(tables: Parameters<typeof mockSupabase>[0] | null) {
  const app = Fastify();
  if (tables) app.decorate('supabase', mockSupabase(tables));
  await app.register(examRoutes);
  await app.ready();
  return app;
}

describe('countBlueprintQuestions', () => {
  it('sums section counts and ignores malformed entries', () => {
    expect(countBlueprintQuestions(row.sections)).toBe(15);
    expect(countBlueprintQuestions([{ count: -1 }, { count: 2.5 }, null])).toBe(0);
    expect(countBlueprintQuestions({ count: 3 })).toBe(0);
  });
});

describe('GET /api/exam/blueprints', () => {
  it('lists summaries without sections', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: [row], error: null }) });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json().blueprints).toEqual([{
      id: BP, name: 'Tin học 11 — Giữa kì', grade: 11, subject_id: 's1', subject_slug: 'informatics',
      subject_name_en: 'Informatics', subject_name_vi: 'Tin học', question_count: 15,
    }]);
    expect(res.body).not.toContain('sections');
    await app.close();
  });

  it('returns an empty list when there are no exams', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: [], error: null }) });
    const res = await app.inject({ method: 'GET', url: '/api/exam/blueprints' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ blueprints: [] });
    await app.close();
  });

  it('reports database errors as 500', async () => {
    const app = await buildApp({ exam_blueprints: mockQuery({ data: null, error: { message: 'down' } }) });
    expect((await app.inject({ method: 'GET', url: '/api/exam/blueprints' })).statusCode).toBe(500);
    await app.close();
  });
});

describe('exam routes without demo content', () => {
  it('404s for an unknown blueprint and never serves demo questions', async () => {
    const app = await buildApp({
      exam_blueprints: mockQuery({ data: null, error: null }),
      questions: mockQuery({ data: [], error: null }),
    });
    const res = await app.inject({ method: 'GET', url: `/api/exam/${BP}/questions` });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('q-demo');
    await app.close();
  });

  it('503s when no database is configured', async () => {
    const app = await buildApp(null);
    expect((await app.inject({ method: 'GET', url: `/api/exam/${BP}/questions` })).statusCode).toBe(503);
    await app.close();
  });

  it('does not score demo question ids as correct', async () => {
    const app = Fastify();
    app.decorate('supabase', mockSupabase({
      questions: mockQuery({ data: [], error: null }),
      exam_blueprints: mockQuery({ data: null, error: null }),
    }));
    app.addHook('onRequest', async (request) => { (request as any).user = { id: 'student-1' }; });
    await app.register(examRoutes);
    await app.ready();
    const res = await app.inject({
      method: 'POST', url: '/api/score/exam',
      payload: { blueprint_id: BP, answers: [{ question_id: 'q-demo-1', selected_option: 'opt-b' }] },
    });
    expect(res.json()).toMatchObject({ correct_count: 0 });
    await app.close();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api test -- exam-blueprints`
Expected: FAIL — không resolve được `../exam/blueprintSummary.js`.

- [ ] **Step 3: Viết `blueprintSummary.ts` và sửa `exam.ts`**

- `GET /api/exam/blueprints`: đăng ký **trước** route `/:blueprintId/questions`; `exam_blueprints` `.select('id, name, grade, subject_id, sections, subjects(slug, name_en, name_vi)').order('name')`; map `toBlueprintSummary`.
- `GET /api/exam/:blueprintId/questions`: không có DB → `503`; blueprint `.select('id, name, grade, subject_id, sections, subjects(slug, name_en, name_vi)').eq('id', …).maybeSingle()`; lỗi → `500`; không có → `404 { error: 'Không tìm thấy đề thi.' }`; trả `blueprint: toBlueprintSummary(bp)`. Xoá toàn bộ khối đề và câu hỏi demo; phần lấy câu hỏi và làm sạch đáp án giữ nguyên.
- `POST /api/score/exam`: xoá `fallbackAnswers` và nhánh dùng nó.

- [ ] **Step 4: Sửa `exam.test.ts` theo hành vi mới**

Test "`GET /api/exam/:blueprintId/questions` is publicly accessible…": app không có DB nên đổi assert thành `expect(res.statusCode).toBe(503)` (vẫn chứng minh route public vì không phải `401`); xoá vòng lặp kiểm câu hỏi. Các test dùng `q-demo-1` để kiểm luồng không có DB giữ nguyên payload, chỉ sửa assert nếu có kỳ vọng `correct_count > 0`.

- [ ] **Step 5: Chạy test, xác nhận pass; grep demo**

Run: `pnpm --filter @scipal/api test && pnpm --filter @scipal/api typecheck`
Expected: PASS.
Run: `git grep -n "q-demo\|fallbackAnswers\|Mid-term Informatics" backend/src/routes`
Expected: không có kết quả.

- [ ] **Step 6: Commit**

```bash
git add backend/src/exam backend/src/routes/exam.ts backend/src/__tests__/exam-blueprints.test.ts backend/src/__tests__/exam.test.ts
git commit -m "feat(api): list exam blueprints and drop demo exam content"
```

---

### Task 4: Kiểm tra tệp JSON nhập bài và nút "Nhập từ JSON"

**Files:**
- Create: `frontend/features/authoring/lessonImport.ts`
- Test: `frontend/features/authoring/lessonImport.test.ts`
- Modify: `frontend/features/authoring/LessonEditor.tsx`

**Interfaces:**
- Produces (`lessonImport.ts`):
  - `export const MAX_LESSON_IMPORT_BYTES = 1_048_576;`
  - `export type LessonImportResult = { ok: true; title_en?: string; title_vi?: string; blocks: Block[] } | { ok: false; error: { en: string; vi: string } }`
  - `export function parseLessonImport(text: string, sizeBytes: number): LessonImportResult`

- [ ] **Step 1: Viết test (fail)**

```ts
// frontend/features/authoring/lessonImport.test.ts
import { describe, expect, it } from 'vitest';
import { MAX_LESSON_IMPORT_BYTES, parseLessonImport } from './lessonImport';

const theory = { type: 'theory', content: { en: 'Hi', vi: 'Chào' } };
const run = (value: unknown, size = 100) => parseLessonImport(JSON.stringify(value), size);

describe('parseLessonImport', () => {
  it('accepts a lesson object and trims titles', () => {
    expect(run({ title_en: ' Binary search ', title_vi: 'Tìm kiếm nhị phân', blocks: [theory] })).toEqual({
      ok: true, title_en: 'Binary search', title_vi: 'Tìm kiếm nhị phân', blocks: [theory],
    });
  });

  it('accepts a bare array of blocks', () => {
    expect(run([theory])).toEqual({ ok: true, blocks: [theory] });
  });

  it('points at the first invalid field', () => {
    const result = run({ blocks: [theory, theory, theory, { type: 'theory', content: { en: 'x' } }] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.vi).toContain('blocks[3].content.vi');
      expect(result.error.vi).toContain('bắt buộc');
      expect(result.error.en).toContain('required');
    }
  });

  it('rejects an unknown block type', () => {
    const result = run([{ type: 'video', url: 'x' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.en).toContain('blocks[0].type');
  });

  it.each([
    ['empty blocks', { blocks: [] }],
    ['missing blocks key', { title_en: 'A', title_vi: 'B' }],
    ['whitespace title', { title_vi: '   ', blocks: [theory] }],
    ['overlong title', { title_en: 'x'.repeat(201), blocks: [theory] }],
  ])('rejects %s', (_label, value) => {
    expect(run(value).ok).toBe(false);
  });

  it('rejects files over 1 MB before parsing', () => {
    expect(parseLessonImport('[]', MAX_LESSON_IMPORT_BYTES + 1)).toMatchObject({ ok: false });
    expect(MAX_LESSON_IMPORT_BYTES).toBe(1_048_576);
  });

  it('rejects broken JSON', () => {
    expect(parseLessonImport('{ "blocks": [', 20)).toMatchObject({ ok: false });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web test -- lessonImport`
Expected: FAIL — không tìm thấy module `./lessonImport`.

- [ ] **Step 3: Viết `lessonImport.ts`**

Thứ tự kiểm tra: kích thước → `JSON.parse` → chuẩn hoá (mảng thì bọc thành `{ blocks }`) → schema Zod `{ title_en?: string trim 1–200, title_vi?: string trim 1–200, blocks: z.array(BlockSchema).min(1) }`. Lỗi Zod: lấy issue **đầu tiên**, đường dẫn dạng `blocks[3].content.vi` (số → `[n]`, chuỗi → `.key`, bỏ dấu chấm đầu). Thông điệp: thiếu trường → `{ en: '<path>: required', vi: '<path>: bắt buộc' }`; sai `type` khối → `{ en: '<path>: unknown block type', vi: '<path>: loại khối không hợp lệ' }`; `blocks` rỗng → `{ en: 'blocks: add at least one block', vi: 'blocks: cần ít nhất một khối' }`; còn lại → `{ en: '<path>: invalid value', vi: '<path>: giá trị không hợp lệ' }`. Quá cỡ → `{ en: 'The file is larger than 1 MB.', vi: 'Tệp lớn hơn 1 MB.' }`; JSON hỏng → `{ en: 'The file is not valid JSON.', vi: 'Tệp không phải JSON hợp lệ.' }`.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web test -- lessonImport`
Expected: PASS.

- [ ] **Step 5: Thêm nút vào `LessonEditor.tsx`**

- Nút **"Nhập từ JSON" / "Import JSON"** đặt cạnh `BlockPalette`, chỉ hiện khi `canEditContent`; mở `<input type="file" accept=".json,application/json" hidden>`.
- Đọc `file.text()`, gọi `parseLessonImport(text, file.size)`; reset `input.value` để chọn lại cùng tệp được.
- Lỗi → `setMessage({ text: t(result.error), type: 'error' })`; không đổi `blocks`, tiêu đề.
- Hợp lệ → `window.confirm(t({ en: \`Replace all ${blocks.length} current blocks with ${result.blocks.length} imported blocks?\`, vi: \`Thay toàn bộ ${blocks.length} khối hiện có bằng ${result.blocks.length} khối từ tệp?\` }))`; đồng ý → `setBlocks(result.blocks)`, đặt tiêu đề nếu tệp có, thông báo `{ en: 'Imported. Remember to save.', vi: 'Đã nạp nội dung. Nhớ bấm lưu.' }`. Không tự lưu, không tự gửi duyệt.

- [ ] **Step 6: Typecheck và test web**

Run: `pnpm --filter @scipal/web typecheck && pnpm --filter @scipal/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/authoring/lessonImport.ts frontend/features/authoring/lessonImport.test.ts frontend/features/authoring/LessonEditor.tsx
git commit -m "feat(web): import lesson blocks from a validated JSON file"
```

---

### Task 5: Form tạo bài môn → lớp → track → chủ đề

**Files:**
- Modify: `frontend/features/landing/educationLevel.ts` (chuyển `levelOfGrade` từ `getLandingData.ts` sang; thêm nhãn)
- Modify: `frontend/features/landing/getLandingData.ts` (import `levelOfGrade` từ `./educationLevel`, giữ `export { levelOfGrade }` cho test cũ)
- Modify: `frontend/features/authoring/authoringQueries.ts`
- Create: `frontend/features/authoring/lessonFormOptions.ts` (+`.test.ts`)
- Create: `frontend/features/authoring/topicApi.ts` (+`.test.ts`)
- Modify: `frontend/features/authoring/LessonCreateForm.tsx`, `frontend/app/teacher/lessons/new-lesson/page.tsx`

**Interfaces:**
- Consumes: HTTP của Task 1 (`options`, `topics`) và Task 2 (`lessons` với `grade`, `track_id`).
- Produces:
  - `educationLevel.ts`: `levelOfGrade(grade: number): EducationLevel` (nguyên văn), `EDUCATION_LEVEL_LABELS: Record<EducationLevel, { en: string; vi: string }>` = `primary: { en: 'Primary', vi: 'Tiểu học' }`, `lower_secondary: { en: 'Lower secondary', vi: 'THCS' }`, `upper_secondary: { en: 'Upper secondary', vi: 'THPT' }`.
  - `authoringQueries.ts`: `AuthoringSubjectOption { id; slug; name_en; name_vi; sort_order: number; grades: number[] }`, `AuthoringTopicOption { id; subject_id; grade: number | null; name_en; name_vi; sort_order: number }`, `AuthoringTrackOption { id; subject_id; slug; name_en; name_vi; grades: number[] }`; `getAuthoringOptions(token)` trả thêm `tracks`.
  - `lessonFormOptions.ts`:
    - `interface SubjectChoice { key: string; subjectId: string; name_en: string; name_vi: string; grades: number[] }` (`key = \`${subjectId}:${level}\``)
    - `buildSubjectChoices(subjects: AuthoringSubjectOption[]): Array<{ level: EducationLevel; items: SubjectChoice[] }>` — cấp theo thứ tự `primary, lower_secondary, upper_secondary`, bỏ cấp rỗng; một môn nhiều cấp xuất hiện ở mỗi cấp với lớp của cấp đó; giữ thứ tự môn đầu vào.
    - `topicsFor(topics: AuthoringTopicOption[], subjectId: string, grade: number): AuthoringTopicOption[]` — cùng môn và (`grade` bằng nhau hoặc `grade === null`), sắp `sort_order`.
    - `tracksFor(tracks: AuthoringTrackOption[], subjectId: string, grade: number): AuthoringTrackOption[]`
  - `topicApi.ts`: `createAuthoringTopic(accessToken: string, input: { subject_id: string; grade: number; name_en: string; name_vi: string }): Promise<{ kind: 'created' | 'existing'; topic: AuthoringTopicOption }>`; lỗi khác → ném `AuthoringApiError(message, status)`.

- [ ] **Step 1: Viết test (fail)**

```ts
// frontend/features/authoring/lessonFormOptions.test.ts
import { describe, expect, it } from 'vitest';
import { buildSubjectChoices, topicsFor, tracksFor } from './lessonFormOptions';

const math = { id: 'm', slug: 'math', name_en: 'Math', name_vi: 'Toán', sort_order: 2, grades: [1, 5, 6, 10, 12] };
const science = { id: 's', slug: 'science', name_en: 'Science', name_vi: 'Khoa học', sort_order: 9, grades: [4, 5] };

describe('buildSubjectChoices', () => {
  it('splits a multi-level subject into one choice per level with that level’s grades', () => {
    expect(buildSubjectChoices([math, science])).toEqual([
      { level: 'primary', items: [
        { key: 'm:primary', subjectId: 'm', name_en: 'Math', name_vi: 'Toán', grades: [1, 5] },
        { key: 's:primary', subjectId: 's', name_en: 'Science', name_vi: 'Khoa học', grades: [4, 5] },
      ] },
      { level: 'lower_secondary', items: [{ key: 'm:lower_secondary', subjectId: 'm', name_en: 'Math', name_vi: 'Toán', grades: [6] }] },
      { level: 'upper_secondary', items: [{ key: 'm:upper_secondary', subjectId: 'm', name_en: 'Math', name_vi: 'Toán', grades: [10, 12] }] },
    ]);
  });
});

describe('topicsFor / tracksFor', () => {
  const topics = [
    { id: 'a', subject_id: 's', grade: 4, name_en: 'A', name_vi: 'A', sort_order: 2 },
    { id: 'legacy', subject_id: 's', grade: null, name_en: 'L', name_vi: 'L', sort_order: 0 },
    { id: 'b', subject_id: 's', grade: 5, name_en: 'B', name_vi: 'B', sort_order: 1 },
    { id: 'c', subject_id: 'm', grade: 4, name_en: 'C', name_vi: 'C', sort_order: 0 },
  ];
  it('keeps same-subject topics of the grade plus legacy ungraded ones, by sort order', () => {
    expect(topicsFor(topics, 's', 4).map((t) => t.id)).toEqual(['legacy', 'a']);
  });
  it('offers tracks only where the grade belongs to the track', () => {
    const tracks = [{ id: 'ict', subject_id: 'i', slug: 'ict', name_en: 'ICT', name_vi: 'Tin học ứng dụng', grades: [10, 11, 12] }];
    expect(tracksFor(tracks, 'i', 11)).toHaveLength(1);
    expect(tracksFor(tracks, 'i', 9)).toEqual([]);
  });
});
```

```ts
// frontend/features/authoring/topicApi.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthoringApiError } from './authoringQueries';
import { createAuthoringTopic } from './topicApi';

const input = { subject_id: 's', grade: 4, name_en: 'Plants', name_vi: 'Thực vật' };
const topic = { id: 't', subject_id: 's', grade: 4, name_en: 'Plants', name_vi: 'Thực vật', sort_order: 0 };
const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe('createAuthoringTopic', () => {
  it('returns a created topic', async () => {
    respond(201, { topic });
    await expect(createAuthoringTopic('tok', input)).resolves.toEqual({ kind: 'created', topic });
    expect(vi.mocked(fetch).mock.calls[0]![1]).toMatchObject({ method: 'POST', headers: { Authorization: 'Bearer tok' } });
  });

  it('returns the existing topic on 409', async () => {
    respond(409, { error: 'Chủ đề này đã có.', topic });
    await expect(createAuthoringTopic('tok', input)).resolves.toEqual({ kind: 'existing', topic });
  });

  it('throws the server message otherwise', async () => {
    respond(400, { error: 'Lớp này không thuộc chương trình của môn đã chọn.' });
    await expect(createAuthoringTopic('tok', input)).rejects.toThrow(AuthoringApiError);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web test -- lessonFormOptions topicApi`
Expected: FAIL — không tìm thấy module `./lessonFormOptions`, `./topicApi`.

- [ ] **Step 3: Viết `educationLevel.ts` (phần thêm), `authoringQueries.ts`, `lessonFormOptions.ts`, `topicApi.ts`**

`topicApi.ts` gọi `${NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app'}/api/authoring/topics` với `Content-Type: application/json` và `Authorization: Bearer <token>`. `409` có `topic` → `existing`; `409` không có `topic` cũng ném lỗi.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web test -- lessonFormOptions topicApi getLandingData`
Expected: PASS (test landing cũ vẫn xanh sau khi chuyển `levelOfGrade`).

- [ ] **Step 5: Viết lại `LessonCreateForm.tsx`**

Props: `{ subjects: AuthoringSubjectOption[]; topics: AuthoringTopicOption[]; tracks: AuthoringTrackOption[] }` (trang `new-lesson/page.tsx` truyền `options.tracks`). State: `choiceKey`, `grade: number | null`, `trackId`, `topicId` (hoặc giá trị đặc biệt `'__new__'`), `newTopicEn`, `newTopicVi`, `localTopics` (khởi tạo từ props, thêm chủ đề vừa tạo), `titleVi`, `titleEn`.

1. **Môn học**: `<select>` với `<optgroup label={t(EDUCATION_LEVEL_LABELS[level])}>` từ `buildSubjectChoices`. Đổi môn → xoá `grade`, `trackId`, `topicId`.
2. **Lớp**: các lớp của `SubjectChoice` đã chọn. Đổi lớp → xoá `trackId`, `topicId`.
3. **Định hướng / Track** (chỉ hiện khi `tracksFor(...)` không rỗng; lựa chọn đầu "Không chọn / None").
4. **Chủ đề**: `topicsFor(localTopics, subjectId, grade)` + lựa chọn cuối `{ en: '+ Create a new topic', vi: '+ Tạo chủ đề mới' }`. Chọn nó → hiện hai ô tên EN/VI (tối đa 200) và nút `{ en: 'Create topic', vi: 'Tạo chủ đề' }`, gọi `createAuthoringTopic` với token từ `createBrowserClient().auth.getSession()`. `created` → thêm vào `localTopics`, chọn sẵn; `existing` → chọn chủ đề đó và báo `{ en: 'This topic already exists; it has been selected.', vi: 'Chủ đề này đã có; đã chọn sẵn.' }`; lỗi → hiện `error.message`.
5. **Tiêu đề** VI/EN như hiện tại.

Nút "Tạo bản nháp" bật khi có môn, lớp, `topicId` là id thật (không phải `'__new__'`) và hai tiêu đề không rỗng sau `trim`. Body gửi `{ title_vi, title_en, topic_id, grade, track_id? }`. Bỏ thông báo "Chưa có chủ đề thuộc môn học đang hoạt động". Luồng thành công/lỗi khi tạo bài giữ nguyên.

- [ ] **Step 6: Typecheck và test web**

Run: `pnpm --filter @scipal/web typecheck && pnpm --filter @scipal/web test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/landing/educationLevel.ts frontend/features/landing/getLandingData.ts frontend/features/authoring frontend/app/teacher/lessons/new-lesson/page.tsx
git commit -m "feat(web): lesson form picks subject, grade, track and topic from the catalog"
```

---

### Task 6: Trang môn và trang bài đọc database

**Files:**
- Create: `frontend/features/lessons/subjectPageQuery.ts` (+`.test.ts`)
- Modify: `frontend/features/lessons/lessonDetailQuery.ts` (+ tạo `lessonDetailQuery.test.ts`)
- Create: `frontend/features/lessons/SubjectPageNotices.tsx`
- Modify: `frontend/components/feedback/LoadErrorNotice.tsx`
- Modify: `frontend/app/[subject]/page.tsx`, `frontend/app/[subject]/[lesson]/page.tsx`
- Delete: `frontend/features/lessons/lessonQueries.ts`, `frontend/features/subjects/SubjectContext.tsx`

**Interfaces:**
- Consumes: `levelOfGrade`, `EDUCATION_LEVEL_LABELS` (Task 5); `SubjectProvider` của `@scipal/ui` (`slug`, `accentColor`).
- Produces:
  - `subjectPageQuery.ts`:
    - `type QueryOutcome<T> = { data: T; error: unknown }`
    - `interface SubjectRow { id; slug; name_en; name_vi; icon: string; icon_url: string | null; accent_color: string; subject_grade_catalog: Array<{ grade: number; active: boolean }> }`
    - `interface TopicRow { id; name_en; name_vi; sort_order: number; grade: number | null; lessons: Array<{ id; slug; title_en; title_vi; sort_order: number; grade: number }> }`
    - `interface GradeGroup { grade: number; topics: Array<{ id; name_en; name_vi; sort_order: number; lessons: Array<{ id; slug; title_en; title_vi; sort_order: number }> }> }`
    - `type SubjectPageResult = { kind: 'ok'; subject: Omit<SubjectRow, 'subject_grade_catalog'> & { levels: EducationLevel[] }; gradeGroups: GradeGroup[] } | { kind: 'not_found' } | { kind: 'error' }`
    - `classifySubjectPage(subject: QueryOutcome<SubjectRow | null>, topics: QueryOutcome<TopicRow[] | null> | null): SubjectPageResult`
    - `groupTopicsByGrade(topics: TopicRow[]): GradeGroup[]`
    - `getSubjectPage(slug: string): Promise<SubjectPageResult>`
  - `lessonDetailQuery.ts`:
    - `LessonDetail` thêm `subjects.icon`, `subjects.accent_color`.
    - `type LessonDetailResult = { kind: 'ok'; lesson: LessonDetail } | { kind: 'not_found' } | { kind: 'error' }`
    - `classifyLessonDetail(outcome: QueryOutcome<Record<string, unknown> | null>): LessonDetailResult`
    - `getLessonDetail(subjectSlug: string, lessonSlug: string): Promise<LessonDetailResult>`
  - `LoadErrorNotice` props: `{ message: { en; vi }; retryHref?: string }` — có `retryHref` thì hiện link `{ en: 'Try again', vi: 'Thử lại' }`.
  - `SubjectPageNotices.tsx` (client): `LevelLine({ levels }: { levels: EducationLevel[] })`, `GradeHeading({ grade }: { grade: number })` (`{ en: \`Grade ${grade}\`, vi: \`Lớp ${grade}\` }`), `InDevelopmentNotice()` (`{ en: 'In development', vi: 'Đang biên soạn' }` + một câu giải thích `{ en: 'Lessons for this subject are being written.', vi: 'Bài học của môn này đang được biên soạn.' }`).

- [ ] **Step 1: Viết test (fail)**

```ts
// frontend/features/lessons/subjectPageQuery.test.ts
import { describe, expect, it } from 'vitest';
import { classifySubjectPage, groupTopicsByGrade, type SubjectRow, type TopicRow } from './subjectPageQuery';

const subject: SubjectRow = {
  id: 's', slug: 'math', name_en: 'Mathematics', name_vi: 'Toán', icon: '∑', icon_url: null, accent_color: '#2563eb',
  subject_grade_catalog: [{ grade: 4, active: true }, { grade: 10, active: true }, { grade: 7, active: false }],
};
const lesson = (id: string, grade: number, sort_order = 0) => ({ id, slug: id, title_en: id, title_vi: id, sort_order, grade });

describe('classifySubjectPage', () => {
  it('separates infrastructure errors from a missing subject', () => {
    expect(classifySubjectPage({ data: null, error: { message: 'down' } }, null)).toEqual({ kind: 'error' });
    expect(classifySubjectPage({ data: null, error: null }, null)).toEqual({ kind: 'not_found' });
    expect(classifySubjectPage({ data: subject, error: null }, { data: null, error: { message: 'x' } })).toEqual({ kind: 'error' });
  });

  it('returns an empty subject with its active levels', () => {
    const result = classifySubjectPage({ data: subject, error: null }, { data: [], error: null });
    expect(result).toMatchObject({ kind: 'ok', gradeGroups: [], subject: { slug: 'math', levels: ['primary', 'upper_secondary'] } });
  });
});

describe('groupTopicsByGrade', () => {
  it('drops topics without published lessons and groups by topic grade', () => {
    const topics: TopicRow[] = [
      { id: 't1', name_en: 'A', name_vi: 'A', sort_order: 1, grade: 10, lessons: [lesson('b', 10, 2), lesson('a', 10, 1)] },
      { id: 't0', name_en: 'E', name_vi: 'E', sort_order: 0, grade: 4, lessons: [] },
    ];
    expect(groupTopicsByGrade(topics)).toEqual([
      { grade: 10, topics: [{ id: 't1', name_en: 'A', name_vi: 'A', sort_order: 1, lessons: [
        { id: 'a', slug: 'a', title_en: 'a', title_vi: 'a', sort_order: 1 },
        { id: 'b', slug: 'b', title_en: 'b', title_vi: 'b', sort_order: 2 },
      ] }] },
    ]);
  });

  it('places lessons of an ungraded topic under each lesson’s own grade', () => {
    const topics: TopicRow[] = [
      { id: 'legacy', name_en: 'L', name_vi: 'L', sort_order: 0, grade: null, lessons: [lesson('x', 11), lesson('y', 10)] },
    ];
    const groups = groupTopicsByGrade(topics);
    expect(groups.map((g) => g.grade)).toEqual([10, 11]);
    expect(groups.map((g) => g.topics[0]!.lessons.map((l) => l.id))).toEqual([['y'], ['x']]);
  });
});
```

```ts
// frontend/features/lessons/lessonDetailQuery.test.ts
import { describe, expect, it } from 'vitest';
import { classifyLessonDetail } from './lessonDetailQuery';

const row = {
  id: 'l', slug: 'search', title_en: 'Search', title_vi: 'Tìm kiếm', grade: 4,
  blocks: [{ type: 'theory', content: { en: 'a', vi: 'b' } }],
  topics: { name_en: 'T', name_vi: 'T' },
  subjects: { slug: 'science', name_en: 'Science', name_vi: 'Khoa học', icon: '◌', accent_color: '#0891b2' },
};

describe('classifyLessonDetail', () => {
  it('maps errors, missing rows and published rows', () => {
    expect(classifyLessonDetail({ data: null, error: { message: 'down' } })).toEqual({ kind: 'error' });
    expect(classifyLessonDetail({ data: null, error: null })).toEqual({ kind: 'not_found' });
    expect(classifyLessonDetail({ data: row, error: null })).toMatchObject({ kind: 'ok', lesson: { slug: 'search', subjects: { accent_color: '#0891b2' } } });
  });

  it('keeps the page alive with no blocks when stored blocks are invalid', () => {
    expect(classifyLessonDetail({ data: { ...row, blocks: [{ type: 'bogus' }] }, error: null }))
      .toMatchObject({ kind: 'ok', lesson: { blocks: [] } });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web test -- subjectPageQuery lessonDetailQuery`
Expected: FAIL — `subjectPageQuery` không tồn tại; `classifyLessonDetail is not a function`.

- [ ] **Step 3: Viết truy vấn**

- `getSubjectPage(slug)`: `createServerClient(await cookies())` trong `try`; ném lỗi → `{ kind: 'error' }`. Truy vấn 1: `subjects` `.select('id, slug, name_en, name_vi, icon, icon_url, accent_color, subject_grade_catalog(grade, active)').eq('slug', slug).maybeSingle()`. Có môn thì truy vấn 2: `topics` `.select('id, name_en, name_vi, sort_order, grade, lessons(id, slug, title_en, title_vi, sort_order, grade, status)').eq('subject_id', id).eq('lessons.status', 'published').order('sort_order')`. Trả `classifySubjectPage(...)`.
- `classifySubjectPage`: `levels` = cấp (`levelOfGrade`) của các lớp `active`, không trùng, theo thứ tự `primary, lower_secondary, upper_secondary`.
- `groupTopicsByGrade`: khoá nhóm của từng bài = `topic.grade ?? lesson.grade`; bỏ chủ đề không còn bài; nhóm tăng theo lớp; chủ đề theo `sort_order`; bài theo `sort_order`; không mang `grade`/`status` của bài ra kết quả.
- `getLessonDetail`: `createServerClient(await cookies())`; `.select('id, slug, title_en, title_vi, grade, blocks, topics!inner(name_en, name_vi), subjects!inner(slug, name_en, name_vi, icon, accent_color)').eq('subjects.slug', …).eq('slug', …).eq('status', 'published').maybeSingle()`; trả `classifyLessonDetail`.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web test -- subjectPageQuery lessonDetailQuery`
Expected: PASS.

- [ ] **Step 5: Sửa hai trang, notice, xoá file cũ**

- Cả hai trang: bỏ import `SUBJECT_CONFIG`, `features/subjects/SubjectContext`; xoá `generateStaticParams`; thêm `export const dynamic = 'force-dynamic'`; bọc nội dung bằng `<SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>` từ `@scipal/ui`.
- `not_found` → `notFound()`. `error` → `<LoadErrorNotice message={{ en: 'Could not load this subject.', vi: 'Chưa tải được dữ liệu môn học.' }} retryHref={\`/${slug}\`} />` (trang bài: `{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }`, `retryHref` là đường dẫn bài).
- Trang môn: tên, icon, màu lấy từ `result.subject`; thay dòng "Chương trình khoa học tự nhiên THPT…" bằng `<LevelLine levels={subject.levels} />`; `gradeGroups` rỗng → `<InDevelopmentNotice />`; ngược lại mỗi nhóm là `<GradeHeading grade={g.grade} />` + `<TopicAccordion topics={g.topics} subjectSlug={slug} />`. Bộ đếm "Chủ đề"/"Bài học" đếm từ `gradeGroups`.
- Trang bài: breadcrumb và nhãn lớp dùng `lesson.subjects.name_vi`, `lesson.subjects.slug`.
- `git rm frontend/features/lessons/lessonQueries.ts frontend/features/subjects/SubjectContext.tsx`.

- [ ] **Step 6: Typecheck, test, grep**

Run: `pnpm --filter @scipal/web typecheck && pnpm --filter @scipal/web test`
Expected: PASS.
Run: `git grep -n "SUBJECT_CONFIG\|SubjectContext\|lessonQueries\|khoa học tự nhiên THPT" -- "frontend/app/[subject]" frontend/features/lessons`
Expected: không có kết quả.

- [ ] **Step 7: Commit**

```bash
git add -A frontend/features/lessons frontend/features/subjects frontend/components/feedback "frontend/app/[subject]"
git commit -m "feat(web): render subject and lesson pages from the database"
```

---

### Task 7: Phòng thi đọc đề từ API, bỏ đề demo ở frontend

**Files:**
- Modify: `frontend/features/exam/examQueries.ts` (+ tạo `examQueries.test.ts`)
- Create: `frontend/features/exam/ExamListNotices.tsx`
- Modify: `frontend/app/exam/page.tsx`, `frontend/app/exam/[blueprintId]/page.tsx`

**Interfaces:**
- Consumes: `BlueprintSummary`, `GET /api/exam/blueprints`, `GET /api/exam/:id/questions` (Task 3).
- Produces (`examQueries.ts`):
  - `interface BlueprintSummary` (cùng trường với Task 3).
  - `type BlueprintListResult = { kind: 'ok'; blueprints: BlueprintSummary[] } | { kind: 'error' }`
  - `type ExamDetailResult = { kind: 'ok'; blueprint: BlueprintSummary; questions: ExamQuestionItem[] } | { kind: 'not_found' } | { kind: 'error' }`
  - `getExamBlueprints(): Promise<BlueprintListResult>`; `getExamBlueprint(blueprintId: string): Promise<ExamDetailResult>` (dùng `encodeURIComponent`).
  - `ExamListNotices.tsx` (client): `NoExamsNotice()` = `{ en: 'No exams yet', vi: 'Chưa có đề thi' }`.

- [ ] **Step 1: Viết test (fail)**

```ts
// frontend/features/exam/examQueries.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getExamBlueprint, getExamBlueprints } from './examQueries';

const summary = { id: 'bp', name: 'Đề 1', grade: 11, subject_id: 's', subject_slug: 'informatics',
  subject_name_en: 'Informatics', subject_name_vi: 'Tin học', question_count: 15 };
const respond = (status: number, body: unknown) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

afterEach(() => vi.unstubAllGlobals());

describe('getExamBlueprints', () => {
  it('returns the list, including an empty one', async () => {
    respond(200, { blueprints: [summary] });
    await expect(getExamBlueprints()).resolves.toEqual({ kind: 'ok', blueprints: [summary] });
    respond(200, { blueprints: [] });
    await expect(getExamBlueprints()).resolves.toEqual({ kind: 'ok', blueprints: [] });
  });

  it('reports server and network failures as errors', async () => {
    respond(500, { error: 'x' });
    await expect(getExamBlueprints()).resolves.toEqual({ kind: 'error' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(getExamBlueprints()).resolves.toEqual({ kind: 'error' });
  });
});

describe('getExamBlueprint', () => {
  it('maps 404 to not_found and never invents questions', async () => {
    respond(404, { error: 'Không tìm thấy đề thi.' });
    await expect(getExamBlueprint('missing')).resolves.toEqual({ kind: 'not_found' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    await expect(getExamBlueprint('bp')).resolves.toEqual({ kind: 'error' });
  });

  it('returns the blueprint and questions', async () => {
    respond(200, { blueprint: summary, questions: [] });
    await expect(getExamBlueprint('bp')).resolves.toEqual({ kind: 'ok', blueprint: summary, questions: [] });
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/web test -- examQueries`
Expected: FAIL — `getExamBlueprints is not a function`.

- [ ] **Step 3: Viết lại `examQueries.ts`**

Xoá toàn bộ đề/câu hỏi dự phòng. `fetch(..., { cache: 'no-store' })`; `200` với payload đúng dạng → `ok`; `404` → `not_found` (chỉ ở chi tiết); còn lại hoặc ném lỗi → `error`.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/web test -- examQueries`
Expected: PASS.

- [ ] **Step 5: Sửa hai trang**

- `/exam`: xoá `BlueprintItem`, `DEMO_BLUEPRINTS`; `const result = await getExamBlueprints()`. `error` → `<LoadErrorNotice message={{ en: 'Could not load exams.', vi: 'Chưa tải được danh sách đề thi.' }} retryHref="/exam" />`; rỗng → `<NoExamsNotice />`; có đề → giữ khung thẻ hiện có, hiện `subject_name_vi` (hoặc bỏ nhãn môn khi `null`), `name`, `Lớp {grade}` khi có, `{question_count} câu`; bỏ thời lượng/độ khó/mô tả (DB chưa có).
- `/exam/[blueprintId]`: `not_found` → `notFound()`; `error` → `LoadErrorNotice` với `retryHref={\`/exam/${blueprintId}\`}`; `ok` → tiêu đề `blueprint.name`, nhãn môn `blueprint.subject_name_vi` (thay "Môn Tin học" cứng), `{questions.length} câu`; `ExamRunner` nhận `blueprintTitle={{ en: blueprint.name, vi: blueprint.name }}` và **không** truyền `durationMinutes` (dùng mặc định của runner).

- [ ] **Step 6: Typecheck, test, grep**

Run: `pnpm --filter @scipal/web typecheck && pnpm --filter @scipal/web test`
Expected: PASS.
Run: `git grep -n "DEMO_\|q-demo\|Informatics Benchmark" -- frontend`
Expected: không có kết quả.

- [ ] **Step 7: Commit**

```bash
git add frontend/features/exam "frontend/app/exam"
git commit -m "feat(web): exam room lists real blueprints only"
```

---

### Task 8: Script dọn dữ liệu demo, cảnh báo snapshot, trạng thái dự án

**Files:**
- Create: `supabase/manual/remove_demo_content.sql`
- Test: `backend/src/__tests__/remove-demo-content.test.ts`
- Modify: `supabase/full_schema_and_seed.sql` (đầu tệp), `PROJECT_STATE.md`

**Interfaces:** không có (tài liệu vận hành).

- [ ] **Step 1: Viết test hợp đồng (fail)**

```ts
// backend/src/__tests__/remove-demo-content.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const raw = readFileSync(new URL('../../../supabase/manual/remove_demo_content.sql', import.meta.url), 'utf8');
const sql = raw.toLowerCase().replace(/\s+/g, ' ');

describe('manual demo cleanup script', () => {
  it('previews every target and the lessons deleted with the demo topic', () => {
    expect(sql).toContain("where slug = 'binary-search'");
    expect(sql).toContain("slug = 'topic-f-algorithms'");
    expect(sql).toContain("term_en = 'algorithm'");
    expect(sql).toContain('from public.exam_blueprints');
    expect(sql).toMatch(/select .* from public\.lessons l join public\.topics t on t\.id = l\.topic_id .* 'topic-f-algorithms'/);
  });

  it('clears non-cascading references before deleting lessons', () => {
    const detach = sql.indexOf('update public.xp_log set lesson_id = null');
    const questions = sql.indexOf('update public.questions set lesson_id = null');
    const del = sql.indexOf('delete from public.lessons');
    expect(detach).toBeGreaterThan(-1);
    expect(questions).toBeGreaterThan(-1);
    expect(del).toBeGreaterThan(Math.max(detach, questions));
  });

  it('runs deletes inside a transaction that rolls back by default', () => {
    const begin = sql.indexOf('begin;');
    expect(begin).toBeGreaterThan(-1);
    expect(sql.indexOf('delete from')).toBeGreaterThan(begin);
    expect(sql.trimEnd().endsWith('rollback;')).toBe(true);
    expect(sql).not.toMatch(/^\s*commit;/m);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận fail**

Run: `pnpm --filter @scipal/api test -- remove-demo-content`
Expected: FAIL — `ENOENT`.

- [ ] **Step 3: Viết script**

Phần 1 — xem trước (chỉ `SELECT`): bài `binary-search` của môn `informatics`; chủ đề `topic-f-algorithms`; **mọi bài thuộc chủ đề đó** (`from public.lessons l join public.topics t on t.id = l.topic_id … 'topic-f-algorithms'`) kèm ghi chú "các bài này bị xoá theo chủ đề (ON DELETE CASCADE)"; số dòng `xp_log`, `progress`, `questions` tham chiếu các bài trên; thuật ngữ `term_en = 'algorithm'` của Tin học; mọi dòng `public.exam_blueprints`.
Phần 2 — trong `begin;`: `update public.xp_log set lesson_id = null where lesson_id in (…)` (giữ điểm XP đã cộng, chỉ gỡ liên kết), `update public.questions set lesson_id = null where lesson_id in (…)`, rồi `delete` bài `binary-search`, chủ đề `topic-f-algorithms` (kéo theo bài con và `progress`), thuật ngữ `algorithm`, và `delete from public.exam_blueprints` (ghi chú: chạy dòng này chỉ khi mọi đề hiện có là demo). Dòng cuối là `rollback;` kèm chú thích tiếng Việt: kiểm tra kết quả, rồi đổi thành `commit;` để lưu. Tập bài dùng chung một điều kiện `slug = 'binary-search' or topic_id = (chủ đề demo)` trong cả `update` lẫn `delete`.

- [ ] **Step 4: Chạy test, xác nhận pass**

Run: `pnpm --filter @scipal/api test -- remove-demo-content`
Expected: PASS.

- [ ] **Step 5: Cảnh báo snapshot và trạng thái dự án**

- `supabase/full_schema_and_seed.sql`: thêm vào khối cảnh báo đầu tệp dòng `-- Contains demo content (topic-f-algorithms, binary-search, term "algorithm"); never run it to create a new environment.`
- `PROJECT_STATE.md` → "Recent Decisions" thêm dòng đầu: "**v1.9 đợt 2 (đăng bài từ DB):** Giáo viên/admin tạo chủ đề theo catalog (`POST /api/authoring/topics`), giáo viên tạo bài mọi lớp 1–12 có trong catalog, track tuỳ chọn, nhập khối từ JSON ≤ 1 MB. Trang môn/bài đọc DB và phân biệt 404 với lỗi tải; phòng thi đọc `GET /api/exam/blueprints`; không còn đề/bài demo trong code. Dữ liệu demo trên Supabase dọn bằng `supabase/manual/remove_demo_content.sql` (chạy tay, mặc định rollback)." "Next Steps": thêm "Admin chưa có giao diện tạo chủ đề/bài (API đã cho phép tạo chủ đề)".

- [ ] **Step 6: Kiểm tra toàn bộ**

Run: `pnpm turbo typecheck && pnpm turbo test && pnpm turbo build`
Expected: tất cả PASS. Ghi nguyên văn dòng tổng kết vào báo cáo.
Run: `git grep -nE "DEMO_|q-demo|topic-f|binary-search" -- frontend backend/src ':!*.test.ts'`
Expected: không có kết quả.

- [ ] **Step 7: Commit**

```bash
git add supabase/manual supabase/full_schema_and_seed.sql backend/src/__tests__/remove-demo-content.test.ts PROJECT_STATE.md
git commit -m "chore(db): manual demo cleanup script and project state for wave 2"
```

---

## Nghiệm thu thủ công (sau khi deploy, người dùng thực hiện)

Theo spec §5: trên DB đã áp đủ migration đợt 1 và đã dọn demo —
1. Giáo viên tạo chủ đề lớp 4 cho một môn Tiểu học, tạo bài, nhập JSON, gửi duyệt.
2. Admin duyệt; khách mở được `/<slug-môn>` và bài vừa duyệt.
3. Môn chưa có bài hiện "Đang biên soạn"; `/exam` hiện "Chưa có đề thi" khi DB không có đề.

## Câu hỏi mở (từ spec, còn nguyên)

1. Admin có cần giao diện tạo chủ đề/bài không (API chủ đề đã mở cho admin)?
2. Có cần nhập JSON ngay lúc tạo bài (một bước) không? Plan giữ hai bước như spec.
