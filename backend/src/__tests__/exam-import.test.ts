import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { examImportRoutes, groupPendingImports, pickExamQuestions, questionData, type ExamImportPackage } from '../routes/examImport.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

// Teacher imports hold one file of the monthly quota; these tests are about the import itself.
const importQuota = () => ({
  'rpc:billing_reserve_quota': mockQuery({ data: { operation_id: '55555555-5555-4555-8555-555555555555', state: 'reserved', kind: 'monthly', remaining: 4, resets_at: '2026-09-30T17:00:00+00:00' }, error: null }),
  'rpc:billing_settle_quota': mockQuery({ data: true, error: null }),
});

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: { app_role: 'student' } };
const IMPORT_ID = '55555555-5555-4555-8555-555555555555';
const bi = (vi: string) => ({ vi, en: `${vi} (en)` });

const mc = (key: string, difficulty = 1) => ({
  key,
  subject_slug: 'informatics',
  type: 'mc' as const,
  difficulty,
  stem: bi(`Câu ${key}`),
  options: [{ id: 'A', text: bi('Một') }, { id: 'B', text: bi('Hai') }],
  answer: 'A',
});

const pkg = (over: Partial<ExamImportPackage> = {}): ExamImportPackage => ({
  questions: [mc('q1'), mc('q2'), mc('q3', 2)],
  blueprints: [{
    code: 'de-1',
    subject_slug: 'informatics',
    grade: 11,
    title: bi('Đề ôn tập'),
    duration_minutes: 45,
    sections: [{ type: 'mc', difficulty: 1, count: 2 }],
  }],
  ...over,
});

async function buildApp(user: typeof admin, tables: Parameters<typeof mockSupabase>[0]) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase({ ...importQuota(), ...tables }));
  app.addHook('onRequest', async (request) => { (request as any).user = user; });
  await app.register(examImportRoutes);
  await app.ready();
  return app;
}

const baseTables = (over: Record<string, unknown> = {}) => ({
  subjects: mockQuery({ data: [{ id: 'subject-1', slug: 'informatics' }], error: null }),
  subject_grade_catalog: mockQuery({ data: [{ subject_id: 'subject-1', grade: 11 }], error: null }),
  questions: mockQuery({ data: null, error: null }),
  exam_blueprints: mockQuery({ data: null, error: null }),
  ...over,
});

describe('exam import helpers', () => {
  it('stores short answers under `answer`, where scoring reads them', () => {
    expect(questionData({ key: 's', subject_slug: 'x', type: 'short', difficulty: 1, stem: bi('Hỏi'), answer: '42' }))
      .toEqual({ stem: bi('Hỏi'), answer: '42' });
  });

  it('picks questions per section in workbook order and reports a short pool', () => {
    const questions = pkg().questions.map((q, i) => ({ ...q, id: `id-${i}` }));
    expect(pickExamQuestions(pkg().blueprints[0]!, questions)).toEqual({ ok: true, ids: ['id-0', 'id-1'] });
    const tooMany = { ...pkg().blueprints[0]!, sections: [{ type: 'mc' as const, difficulty: 2, count: 2 }] };
    const res = pickExamQuestions(tooMany, questions);
    expect(res.ok).toBe(false);
  });
});

describe('POST /api/authoring/exam-import', () => {
  it.each(['thptqg', 'dgnl_hcm'])('persists %s layout with question keys resolved to stored ids', async (format) => {
    const tables = baseTables();
    const app = await buildApp(admin, tables);
    const input = pkg();
    const layout = [{ key: 'mc', title: bi('Phần I'), kind: 'mc', count: 2,
      max_points: format === 'dgnl_hcm' ? 1200 : 10,
      groups: [{ passage: bi('Đoạn dẫn'), question_keys: ['q2', 'q1'] }] }];
    const res = await app.inject({ method: 'POST', url: '/api/authoring/content-import',
      payload: { ...input, publish: true, blueprints: input.blueprints.map((b) => ({ ...b, format, layout })) } });
    expect(res.statusCode).toBe(201);
    const questions = tables.questions.inserted[0] as Array<{ id: string }>;
    const [blueprint] = tables.exam_blueprints.inserted[0] as Array<Record<string, unknown>>;
    expect(blueprint).toMatchObject({ format, question_ids: [questions[1]?.id, questions[0]?.id],
      layout: [{ key: 'mc', max_points: format === 'dgnl_hcm' ? 1200 : 10,
        groups: [{ passage: bi('Đoạn dẫn'), question_ids: [questions[1]?.id, questions[0]?.id] }] }] });
    expect(JSON.stringify(blueprint)).not.toContain('question_keys');
    await app.close();
  });

  it('refuses missing layouts, wrong totals, types and counts without saving', async () => {
    const input = pkg();
    const section = { key: 'mc', title: bi('Phần I'), kind: 'mc', count: 1, max_points: 10, groups: [{ question_keys: ['q1'] }] };
    for (const layout of [null, [{ ...section, max_points: 9 }], [{ ...section, kind: 'short' }], [{ ...section, count: 2 }]]) {
      const tables = baseTables();
      const app = await buildApp(admin, tables);
      const res = await app.inject({ method: 'POST', url: '/api/authoring/content-import', payload: {
        ...input, blueprints: input.blueprints.map((b) => ({ ...b, format: 'thptqg', layout })),
      } });
      expect(res.statusCode).toBe(400);
      expect(tables.questions.inserted).toHaveLength(0);
      await app.close();
    }
  });

  it('refuses invalid structured layouts before writing questions', async () => {
    const input = pkg();
    for (const groups of [
      [{ question_keys: ['missing'] }], [{ question_keys: ['q1', 'q1'] }],
      [{ question_keys: ['q1'], passage: { vi: 'Đoạn dẫn', en: '' } }],
    ]) {
      const tables = baseTables();
      const app = await buildApp(admin, tables);
      const res = await app.inject({ method: 'POST', url: '/api/authoring/content-import', payload: {
        ...input, blueprints: input.blueprints.map((b) => ({ ...b, format: 'thptqg',
          layout: [{ key: 'mc', title: bi('Phần I'), kind: 'mc', count: 1, max_points: 10, groups }] })),
      } });
      expect(res.statusCode).toBe(400);
      expect(tables.questions.inserted).toHaveLength(0);
      await app.close();
    }
  });

  it('imports questions and an exam that lists exactly its questions', async () => {
    const tables = baseTables();
    const app = await buildApp(admin, tables);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/content-import', payload: { ...pkg(), publish: true } });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ imported: { lessons: 0, questions: 3, blueprints: 1 } });

    const insertedQuestions = (tables.questions as ReturnType<typeof mockQuery>).inserted[0] as Array<{ id: string; data: unknown }>;
    const [blueprint] = (tables.exam_blueprints as ReturnType<typeof mockQuery>).inserted[0] as Array<Record<string, unknown>>;
    expect(blueprint).toMatchObject({ name: 'Đề ôn tập', name_en: 'Đề ôn tập (en)', grade: 11, duration_minutes: 45, status: 'published', created_by: 'admin-1' });
    expect(res.json().status).toBe('published');
    expect(blueprint!.question_ids).toEqual([insertedQuestions[0]!.id, insertedQuestions[1]!.id]);
    expect(JSON.stringify(res.json())).not.toContain('"answer"');
    await app.close();
  });

  it("holds a teacher's import for admin review, questions and exams alike", async () => {
    const tables = baseTables();
    const app = await buildApp(teacher, tables);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload: pkg() });
    expect(res.statusCode).toBe(201);
    expect(res.json().status).toBe('pending_review');
    const questions = (tables.questions as ReturnType<typeof mockQuery>).inserted[0] as Array<Record<string, unknown>>;
    const [blueprint] = (tables.exam_blueprints as ReturnType<typeof mockQuery>).inserted[0] as Array<Record<string, unknown>>;
    expect(new Set(questions.map((q) => q.status))).toEqual(new Set(['pending_review']));
    expect(blueprint).toMatchObject({ status: 'pending_review', created_by: 'teacher-1', import_id: res.json().import_id });
    expect(questions[0]!.import_id).toBe(res.json().import_id);
    await app.close();
  });

  it('refuses students', async () => {
    const app = await buildApp(student, baseTables());
    expect((await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload: pkg() })).statusCode).toBe(403);
    await app.close();
  });

  it('requires English text before saving', async () => {
    const app = await buildApp(admin, baseTables());
    const noEnglish = pkg({ questions: [{ ...mc('q1'), stem: { vi: 'Câu', en: '' } }], blueprints: [] });
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload: noEnglish });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('tiếng Anh');
    await app.close();
  });

  it('refuses a package naming an archived subject with the bilingual 400 and saves nothing', async () => {
    const subjects = mockQuery({ data: [{ id: 'subject-1', slug: 'informatics', archived_at: '2026-10-05T01:00:00.000Z' }], error: null });
    const tables = baseTables({ subjects });
    const app = await buildApp(admin, tables);
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload: { ...pkg(), publish: true } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
    expect(String(subjects.selectArgs[0]?.[0])).toContain('archived_at');
    expect((tables.questions as ReturnType<typeof mockQuery>).inserted).toHaveLength(0);
    expect((tables.exam_blueprints as ReturnType<typeof mockQuery>).inserted).toHaveLength(0);
    await app.close();
  });

  it('rejects an unknown subject, a grade outside the catalog and a too-small pool', async () => {
    for (const [tables, payload] of [
      [baseTables({ subjects: mockQuery({ data: [], error: null }) }), pkg()],
      [baseTables({ subject_grade_catalog: mockQuery({ data: [{ subject_id: 'subject-1', grade: 10 }], error: null }) }), pkg()],
      [baseTables(), pkg({ questions: [mc('q1')] })],
    ] as const) {
      const app = await buildApp(admin, tables);
      expect((await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload })).statusCode).toBe(400);
      await app.close();
    }
  });

  it('removes the new questions when the exam cannot be saved', async () => {
    const questions = mockQuery({ data: null, error: null });
    const app = await buildApp(admin, baseTables({
      questions,
      exam_blueprints: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }),
    }));
    const res = await app.inject({ method: 'POST', url: '/api/authoring/exam-import', payload: pkg() });
    expect(res.statusCode).toBe(409);
    expect(questions.deleteCalls).toBe(1);
    await app.close();
  });

  it('rejects a multiple-choice answer that is not one of the options', async () => {
    const app = await buildApp(admin, baseTables());
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/exam-import',
      payload: pkg({ questions: [{ ...mc('q1'), answer: 'Z' }], blueprints: [] }),
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('reviewing teacher imports', () => {
  it('groups pending questions and exams by import, with the teacher name', () => {
    const imports = groupPendingImports(
      [{ id: 'b1', name: 'Đề', grade: 11, import_id: 'i1', created_by: 't1', question_ids: ['q1', 'q2'], duration_minutes: 45, subjects: { name_vi: 'Tin học' } }],
      [
        { id: 'q1', import_id: 'i1', created_by: 't1', type: 'mc', created_at: '2026-09-27T01:00:00Z' },
        { id: 'q2', import_id: 'i1', created_by: 't1', type: 'short', created_at: '2026-09-27T01:00:00Z' },
        { id: 'q3', import_id: 'i2', created_by: 't2', type: 'mc', created_at: '2026-09-28T01:00:00Z' },
      ],
      new Map([['t1', 'Cô Lan']]),
    );
    expect(imports.map((i) => i.import_id)).toEqual(['i2', 'i1']);
    expect(imports[1]).toMatchObject({
      teacher_name: 'Cô Lan',
      question_count: 2,
      question_types: { mc: 1, short: 1 },
      blueprints: [{ id: 'b1', subject_name_vi: 'Tin học', question_count: 2 }],
    });
  });

  it('lists the queue for admins only', async () => {
    const teacherApp = await buildApp(teacher, {});
    expect((await teacherApp.inject({ method: 'GET', url: '/api/authoring/exam-imports' })).statusCode).toBe(403);
    await teacherApp.close();

    const adminApp = await buildApp(admin, {
      exam_blueprints: mockQuery({ data: [], error: null }),
      questions: mockQuery({ data: [{ id: 'q1', import_id: IMPORT_ID, created_by: 't1', type: 'mc', created_at: null }], error: null }),
      profiles: mockQuery({ data: [{ id: 't1', display_name: 'Thầy Minh' }], error: null }),
    });
    const res = await adminApp.inject({ method: 'GET', url: '/api/authoring/exam-imports' });
    expect(res.statusCode).toBe(200);
    expect(res.json().imports).toMatchObject([{ import_id: IMPORT_ID, teacher_name: 'Thầy Minh', question_count: 1 }]);
    await adminApp.close();
  });

  it('publishes the questions before the exams of an import', async () => {
    const questions = mockQuery({ data: [{ id: 'q1' }, { id: 'q2' }], error: null });
    const exams = mockQuery({ data: [{ id: 'b1' }], error: null });
    const app = await buildApp(admin, { questions, exam_blueprints: exams });
    const res = await app.inject({ method: 'POST', url: `/api/authoring/exam-imports/${IMPORT_ID}/approve` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ published: { questions: 2, blueprints: 1 } });
    expect(questions.updated).toEqual([{ status: 'published' }]);
    expect(questions.eqCalls).toContainEqual(['status', 'pending_review']);
    await app.close();
  });

  it('removes a rejected import, exams first', async () => {
    const questions = mockQuery({ data: null, error: null });
    const exams = mockQuery({ data: null, error: null });
    const app = await buildApp(admin, { questions, exam_blueprints: exams });
    const res = await app.inject({ method: 'DELETE', url: `/api/authoring/exam-imports/${IMPORT_ID}` });
    expect(res.statusCode).toBe(204);
    expect(exams.deleteCalls).toBe(1);
    expect(questions.deleteCalls).toBe(1);
    expect(exams.eqCalls).toContainEqual(['status', 'pending_review']);
    await app.close();
  });

  it('keeps review actions away from teachers', async () => {
    const app = await buildApp(teacher, {});
    expect((await app.inject({ method: 'POST', url: `/api/authoring/exam-imports/${IMPORT_ID}/approve` })).statusCode).toBe(403);
    expect((await app.inject({ method: 'DELETE', url: `/api/authoring/exam-imports/${IMPORT_ID}` })).statusCode).toBe(403);
    await app.close();
  });
});

const lesson = (over: Record<string, unknown> = {}) => ({
  source: 'bai.docx',
  subject_slug: 'informatics',
  grade: 11,
  topic: bi('Tìm kiếm'),
  title: bi('Tìm kiếm nhị phân'),
  blocks: [{ type: 'theory', content: bi('Nội dung') }, { type: 'quiz_ref', key: 'q1' }],
  ...over,
});

/** Tables for a lesson import, plus handles on the insert builders (the mock consumes its arrays). */
function lessonTables(over: Record<string, unknown> = {}) {
  const topicInsert = mockQuery({ data: null, error: null });
  const lessonInsert = mockQuery({ data: null, error: null });
  const tables = baseTables({
    topics: [mockQuery({ data: [], error: null }), topicInsert],
    lessons: [mockQuery({ data: [{ subject_id: 'subject-1', slug: 'tim-kiem-nhi-phan-en' }], error: null }), lessonInsert],
    ...over,
  });
  return { tables, topicInsert, lessonInsert };
}

describe('importing lessons from Word/PDF', () => {
  it('creates the topic and a draft lesson whose quiz points at the imported question', async () => {
    const { tables, topicInsert, lessonInsert } = lessonTables();
    const app = await buildApp(teacher, tables);
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson()], questions: [mc('q1')], blueprints: [] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ imported: { lessons: 1, questions: 1, blueprints: 0 }, lesson_status: 'draft', status: 'pending_review' });

    const [topic] = topicInsert.inserted[0] as Array<Record<string, unknown>>;
    expect(topic).toMatchObject({ subject_id: 'subject-1', grade: 11, name_vi: 'Tìm kiếm', kind: 'core' });
    const questionId = ((tables.questions as ReturnType<typeof mockQuery>).inserted[0] as Array<{ id: string }>)[0]!.id;
    const [row] = lessonInsert.inserted[0] as Array<Record<string, unknown>>;
    expect(row).toMatchObject({ topic_id: topic!.id, status: 'draft', created_by: 'teacher-1', slug: 'tim-kiem-nhi-phan-en-2' });
    expect(row!.blocks).toEqual([{ type: 'theory', content: bi('Nội dung') }, { type: 'quiz', question_id: questionId }]);
    await app.close();
  });

  it('publishes an admin import only when asked, lessons included', async () => {
    const { tables, lessonInsert } = lessonTables();
    const app = await buildApp(admin, tables);
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { publish: true, lessons: [lesson({ blocks: [{ type: 'theory', content: bi('A') }] })], questions: [], blueprints: [] },
    });
    expect(res.json()).toMatchObject({ lesson_status: 'published' });
    const [row] = lessonInsert.inserted[0] as Array<Record<string, unknown>>;
    expect(row).toMatchObject({ status: 'published', reviewed_by: 'admin-1' });
    expect(row!.published_at).toBeTruthy();
    await app.close();
  });

  it('never publishes a teacher import, even when asked', async () => {
    const app = await buildApp(teacher, lessonTables().tables);
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { publish: true, lessons: [lesson({ blocks: [{ type: 'theory', content: bi('A') }] })], questions: [], blueprints: [] },
    });
    expect(res.json()).toMatchObject({ lesson_status: 'draft', status: 'pending_review' });
    await app.close();
  });

  it('rejects a question key missing from the workbook and a lesson block without English', async () => {
    const app = await buildApp(teacher, lessonTables().tables);
    const missingKey = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson()], questions: [], blueprints: [] },
    });
    expect(missingKey.statusCode).toBe(400);
    expect(missingKey.json().error).toContain('q1');

    const noEnglish = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson({ blocks: [{ type: 'theory', content: { vi: 'A', en: '' } }] })], questions: [], blueprints: [] },
    });
    expect(noEnglish.statusCode).toBe(400);
    expect(noEnglish.json().error).toContain('tiếng Anh');
    await app.close();
  });

  it('holds a question a lesson uses to the practice limits, and leaves exam-only questions alone', async () => {
    const app = await buildApp(teacher, lessonTables().tables);
    const long = { ...mc('q1'), stem: bi('x'.repeat(2500)) };
    const tooLong = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson()], questions: [long], blueprints: [] },
    });
    expect(tooLong.statusCode).toBe(400);
    expect(tooLong.json().error).toContain('q1');

    const badId = { ...mc('q1'), options: [{ id: 'A 1', text: bi('Một') }, { id: 'B', text: bi('Hai') }], answer: 'A 1' };
    const badChoice = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson()], questions: [badId], blueprints: [] },
    });
    expect(badChoice.statusCode).toBe(400);
    expect(badChoice.json().error).toContain('q1');

    const examOnly = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { questions: [{ ...mc('q9'), stem: bi('x'.repeat(2500)) }], blueprints: [] },
    });
    expect(examOnly.statusCode).not.toBe(400);
    await app.close();
  });

  it('rejects a simulation with settings out of range or an unapproved embed', async () => {
    const app = await buildApp(teacher, lessonTables().tables);
    for (const block of [
      { type: 'interactive', kind: 'motion', heading: bi('Ném'), offline: true, config: { v0: 5000 } },
      { type: 'interactive', kind: 'embed', heading: bi('Nhúng'), offline: false, embed_url: 'https://evil.example/x', config: {} },
    ]) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/authoring/content-import',
        payload: { lessons: [lesson({ blocks: [block] })], questions: [], blueprints: [] },
      });
      expect(res.statusCode, block.kind).toBe(400);
      expect(res.json().error).toContain('Khối 1');
    }
    await app.close();
  });

  it('removes the new topic, and writes no questions, when the lessons cannot be saved', async () => {
    const topicUndo = mockQuery({ data: null, error: null });
    const questionInsert = mockQuery({ data: null, error: null });
    const app = await buildApp(teacher, lessonTables({
      topics: [mockQuery({ data: [], error: null }), mockQuery({ data: null, error: null }), topicUndo],
      questions: [questionInsert],
      lessons: [mockQuery({ data: [], error: null }), mockQuery({ data: null, error: { code: 'XX000', message: 'boom' } })],
    }).tables);
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/content-import',
      payload: { lessons: [lesson()], questions: [mc('q1')], blueprints: [] },
    });
    expect(res.statusCode).toBe(500);
    // Lessons are written before their practice questions, so none were stored.
    expect(questionInsert.inserted).toHaveLength(0);
    expect(topicUndo.deleteCalls).toBe(1);
    await app.close();
  });
});
