import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { assignmentRoutes } from '../routes/assignments.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const CLASS_ID = '11111111-1111-4111-8111-111111111111';
const LESSON = '22222222-2222-4222-8222-222222222222';
const EXAM = '33333333-3333-4333-8333-333333333333';
const A1 = '44444444-4444-4444-8444-444444444441';
const A2 = '44444444-4444-4444-8444-444444444442';
const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const otherTeacher = { id: 'teacher-2', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const room = (patch: Record<string, unknown> = {}) => ok({ id: CLASS_ID, teacher_id: 'teacher-1', subject_id: 'subject-1', ...patch });
const lessonRow = (patch: Record<string, unknown> = {}) => ({ id: LESSON, slug: 'vong-lap', title_en: 'Loops', title_vi: 'Vòng lặp', status: 'published', subjects: { slug: 'informatics' }, ...patch });
const examRow = (patch: Record<string, unknown> = {}) => ({ id: EXAM, name: 'Đề giữa kỳ', name_en: 'Midterm', status: 'published', ...patch });
const future = () => new Date(Date.now() + 86_400_000).toISOString();

async function build(user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(assignmentRoutes);
  await app.ready();
  return app;
}

describe('GET /api/classes/:id/assignments', () => {
  it('lists what was given with how many students have done each', async () => {
    const app = await build(teacher, {
      class_rooms: room(),
      assignments: ok([
        { id: A1, lesson_id: LESSON, blueprint_id: null, due_at: '2026-10-05T10:00:00Z', created_at: '2026-09-29T01:00:00Z' },
        { id: A2, lesson_id: null, blueprint_id: EXAM, due_at: null, created_at: '2026-09-29T00:00:00Z' },
      ]),
      class_members: ok([{ student_id: 's1' }, { student_id: 's2' }, { student_id: 's3' }]),
      lessons: ok([lessonRow()]),
      exam_blueprints: ok([examRow({ status: 'draft' })]),
      progress: ok([{ user_id: 's1', lesson_id: LESSON }, { user_id: 's2', lesson_id: LESSON }]),
      exam_attempts: ok([{ user_id: 's1', blueprint_id: EXAM }, { user_id: 's1', blueprint_id: EXAM }]),
    });
    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/assignments` });
    expect(res.statusCode).toBe(200);
    const [lesson, exam] = res.json().assignments;
    expect(lesson).toMatchObject({ id: A1, kind: 'lesson', title: { vi: 'Vòng lặp', en: 'Loops' }, href: '/informatics/vong-lap', published: true, doneCount: 2, memberCount: 3, dueAt: '2026-10-05T10:00:00.000Z' });
    // Unpublished after it was given: still listed for the teacher, without a link.
    expect(exam).toMatchObject({ id: A2, kind: 'exam', title: { vi: 'Đề giữa kỳ', en: 'Midterm' }, published: false, href: null, doneCount: 1, memberCount: 3 });
    await app.close();
  });

  it('does not show another teacher that the class exists', async () => {
    const app = await build(otherTeacher, { class_rooms: room() });
    expect((await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/assignments` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `/api/classes/${CLASS_ID}/assignments`, payload: { lessonId: LESSON } })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: `/api/classes/${CLASS_ID}/assignments/${A1}` })).statusCode).toBe(404);
    await app.close();
  });

  it('counts nobody in an empty class without asking for progress', async () => {
    const app = await build(teacher, {
      class_rooms: room(),
      assignments: ok([{ id: A1, lesson_id: LESSON, blueprint_id: null, due_at: null, created_at: '2026-09-29T01:00:00Z' }]),
      class_members: ok([]),
      lessons: ok([lessonRow()]),
    });
    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/assignments` });
    expect(res.json().assignments[0]).toMatchObject({ doneCount: 0, memberCount: 0 });
    await app.close();
  });
});

describe('POST /api/classes/:id/assignments', () => {
  const post = (app: Awaited<ReturnType<typeof build>>, payload: Record<string, unknown>) =>
    app.inject({ method: 'POST', url: `/api/classes/${CLASS_ID}/assignments`, payload });

  it('gives a published lesson with a due date, saying who gave it', async () => {
    const insert = ok({ id: A1 });
    const app = await build(teacher, { class_rooms: room(), lessons: ok([lessonRow()]), assignments: insert });
    const dueAt = future();
    const res = await post(app, { lessonId: LESSON, dueAt });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({ id: A1 });
    expect(insert.inserted[0]).toEqual({ class_id: CLASS_ID, lesson_id: LESSON, blueprint_id: null, due_at: new Date(dueAt).toISOString(), created_by: 'teacher-1' });
    await app.close();
  });

  it('refuses drafts, both or neither content, a past or unreadable due date', async () => {
    const draft = await build(teacher, { class_rooms: room(), exam_blueprints: ok([examRow({ status: 'pending_review' })]) });
    const res = await post(draft, { blueprintId: EXAM });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: 'CONTENT_NOT_PUBLISHED' });
    await draft.close();

    const app = await build(teacher, { class_rooms: room() });
    for (const payload of [{ lessonId: LESSON, blueprintId: EXAM }, {}, { lessonId: LESSON, dueAt: '2020-01-01T00:00:00Z' }, { lessonId: LESSON, dueAt: 'tomorrow' }, { lessonId: 'x' }]) {
      const bad = await post(app, payload);
      expect(bad.statusCode, JSON.stringify(payload)).toBe(400);
      expect(bad.json().error_en).toBeTruthy();
    }
    await app.close();
  });

  it('says so when the lesson is already given to the class', async () => {
    const app = await build(teacher, { class_rooms: room(), lessons: ok([lessonRow()]), assignments: mockQuery({ data: null, error: { code: '23505', message: 'duplicate' } }) });
    const res = await post(app, { lessonId: LESSON });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('ALREADY_ASSIGNED');
    await app.close();
  });
});

describe('DELETE /api/classes/:id/assignments/:assignmentId', () => {
  it('removes an assignment of the class, and 404s one that is not there', async () => {
    const removed = ok([{ id: A1 }]);
    const app = await build(teacher, { class_rooms: [room(), room()], assignments: [removed, ok([])] });
    expect((await app.inject({ method: 'DELETE', url: `/api/classes/${CLASS_ID}/assignments/${A1}` })).statusCode).toBe(204);
    expect(removed.deleteCalls).toBe(1);
    expect(removed.eqCalls).toEqual(expect.arrayContaining([['id', A1], ['class_id', CLASS_ID]]));
    expect((await app.inject({ method: 'DELETE', url: `/api/classes/${CLASS_ID}/assignments/${A2}` })).statusCode).toBe(404);
    await app.close();
  });
});

describe('GET /api/classes/:id/assignable', () => {
  it('finds published lessons of the class subject by title', async () => {
    const lessons = ok([lessonRow()]);
    const app = await build(teacher, { class_rooms: room(), lessons });
    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/assignable?kind=lesson&q=v%C3%B2ng` });
    expect(res.statusCode).toBe(200);
    expect(res.json().items).toEqual([{ id: LESSON, title: { vi: 'Vòng lặp', en: 'Loops' } }]);
    expect(lessons.eqCalls).toEqual(expect.arrayContaining([['status', 'published'], ['subject_id', 'subject-1']]));
    expect(lessons.orCalls[0]).toContain('vòng');
    await app.close();
  });

  it('finds published exams', async () => {
    const exams = ok([examRow()]);
    const app = await build(teacher, { class_rooms: room({ subject_id: null }), exam_blueprints: exams });
    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/assignable?kind=exam` });
    expect(res.json().items).toEqual([{ id: EXAM, title: { vi: 'Đề giữa kỳ', en: 'Midterm' } }]);
    expect(exams.eqCalls).toEqual([['status', 'published']]);
    await app.close();
  });
});

describe('GET /api/classes/mine', () => {
  it('shows a student the classes they are in, with published work and what they have done', async () => {
    const app = await build(student, {
      class_members: ok([{ class_id: CLASS_ID }]),
      class_rooms: ok([{ id: CLASS_ID, name: '10A1', teacher_id: 'teacher-1', subjects: { name_en: 'Informatics', name_vi: 'Tin học' } }]),
      assignments: ok([
        { id: A1, class_id: CLASS_ID, lesson_id: LESSON, blueprint_id: null, due_at: '2026-10-05T10:00:00Z', created_at: '2026-09-29T01:00:00Z' },
        { id: A2, class_id: CLASS_ID, lesson_id: null, blueprint_id: EXAM, due_at: null, created_at: '2026-09-29T00:00:00Z' },
      ]),
      profiles: ok([{ id: 'teacher-1', display_name: 'Cô Lan' }]),
      lessons: ok([lessonRow()]),
      exam_blueprints: ok([examRow({ status: 'draft' })]),
      progress: ok([{ lesson_id: LESSON }]),
      exam_attempts: ok([]),
    });
    const res = await app.inject({ method: 'GET', url: '/api/classes/mine' });
    expect(res.statusCode).toBe(200);
    const [cls] = res.json().classes;
    expect(cls).toMatchObject({ id: CLASS_ID, name: '10A1', teacherName: 'Cô Lan', subject: { en: 'Informatics', vi: 'Tin học' } });
    // The unpublished exam is hidden from students.
    expect(cls.assignments).toEqual([
      { id: A1, kind: 'lesson', title: { vi: 'Vòng lặp', en: 'Loops' }, href: '/informatics/vong-lap', dueAt: '2026-10-05T10:00:00.000Z', createdAt: '2026-09-29T01:00:00.000Z', done: true },
    ]);
    await app.close();
  });

  it('marks a submitted exam as done', async () => {
    const attempts = ok([{ blueprint_id: EXAM }]);
    const app = await build(student, {
      class_members: ok([{ class_id: CLASS_ID }]),
      class_rooms: ok([{ id: CLASS_ID, name: '10A1', teacher_id: 'teacher-1', subjects: null }]),
      assignments: ok([{ id: A2, class_id: CLASS_ID, lesson_id: null, blueprint_id: EXAM, due_at: null, created_at: '2026-09-29T00:00:00Z' }]),
      profiles: ok([]),
      exam_blueprints: ok([examRow()]),
      exam_attempts: attempts,
    });
    const cls = (await app.inject({ method: 'GET', url: '/api/classes/mine' })).json().classes[0];
    expect(cls.assignments[0]).toMatchObject({ kind: 'exam', href: `/exam/${EXAM}`, done: true });
    expect(attempts.eqCalls).toEqual(expect.arrayContaining([['user_id', 'student-1'], ['status', 'submitted']]));
    await app.close();
  });

  it('answers an empty list to a student in no class', async () => {
    const app = await build(student, { class_members: ok([]) });
    expect((await app.inject({ method: 'GET', url: '/api/classes/mine' })).json()).toEqual({ classes: [] });
    await app.close();
  });
});
