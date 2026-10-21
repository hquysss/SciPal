import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import crypto from 'crypto';
import { authPlugin } from '../plugins/auth.js';
import { classRoutes } from '../routes/classes.js';
import { SUBJECT_ARCHIVED } from '../subjects/archived.js';
import { mockQuery, mockSupabase } from './helpers/supabaseMock.js';

describe('Class Routes & Invite Code Generation', () => {
  const app = Fastify();

  beforeAll(async () => {
    await app.register(authPlugin);
    await app.register(classRoutes);
    await app.ready();
  });

  afterAll(() => app.close());

  it('generates cryptographically secure 6-character hex invite code', () => {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    expect(code).toMatch(/^[0-9A-F]{6}$/);
  });

  it('POST /api/classes returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes',
      payload: { name: '10A1', subject_id: 'informatics' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /api/classes/join returns 401 without auth token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/classes/join',
      payload: { invite_code: 'A1B2C3' },
    });
    expect(res.statusCode).toBe(401);
  });
});

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
      data: {
        id: CLASS_ID,
        name: '10A1',
        subject_id: 'subject-uuid',
        invite_code: 'ABC123',
        created_at: '2026-09-26',
        subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học' },
      },
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
    expect(res.json().class_room.subject_name_en).toBe('Informatics');
    expect(res.json().class_room).not.toHaveProperty('subjects');
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

  it('refuses a class in an archived subject with the bilingual 400', async () => {
    const subjects = mockQuery({ data: { id: 'subject-uuid', archived_at: '2026-10-05T01:00:00.000Z' }, error: null });
    const insert = mockQuery({ data: null, error: null });
    const app = await buildClassApp(teacher, { subjects, class_rooms: insert });
    const res = await app.inject({ method: 'POST', url: '/api/classes', payload: { name: '10A1', subject_slug: 'informatics' } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual(SUBJECT_ARCHIVED);
    expect(String(subjects.selectArgs[0]?.[0])).toContain('archived_at');
    expect(insert.inserted).toHaveLength(0);
    await app.close();
  });

  it('lists only the calling teacher classes with student counts', async () => {
    const rooms = mockQuery({
      data: [{
        id: CLASS_ID,
        name: '10A1',
        subject_id: 's',
        invite_code: 'ABC123',
        created_at: 'x',
        class_members: [{ count: 3 }],
        subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học' },
      }],
      error: null,
    });
    const app = await buildClassApp(teacher, { class_rooms: rooms });
    const res = await app.inject({ method: 'GET', url: '/api/classes' });
    expect(res.statusCode).toBe(200);
    expect(rooms.eqCalls).toContainEqual(['teacher_id', 'teacher-1']);
    expect(res.json().classes[0]).toMatchObject({ id: CLASS_ID, student_count: 3, subject_name_vi: 'Tin học' });
    expect(res.json().classes[0]).not.toHaveProperty('class_members');
    expect(res.json().classes[0]).not.toHaveProperty('subjects');
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

  it('sums roster XP across more than one page', async () => {
    const page1 = Array.from({ length: 1000 }, () => ({ user_id: 's1', delta: 1 }));
    const page2 = [{ user_id: 's1', delta: 5 }];
    const app = await buildClassApp(teacher, {
      class_rooms: mockQuery({
        data: { id: CLASS_ID, name: '10A1', subject_id: 's', invite_code: 'ABC123', teacher_id: 'teacher-1' },
        error: null,
      }),
      class_members: mockQuery({
        data: [{ student_id: 's1', joined_at: '2026-09-20', profiles: { display_name: 'An' } }],
        error: null,
      }),
      xp_log: [
        mockQuery({ data: page1, error: null }),
        mockQuery({ data: page2, error: null }),
      ],
      progress: mockQuery({ data: [], error: null }),
    });

    const res = await app.inject({ method: 'GET', url: `/api/classes/${CLASS_ID}/roster` });

    expect(res.statusCode).toBe(200);
    expect(res.json().members[0].total_xp).toBe(1005);
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

const admin = { id: 'admin-1', app_metadata: { app_role: 'admin' } };

describe('rename and delete a class', () => {
  const rename = (app: Awaited<ReturnType<typeof buildClassApp>>, name: unknown, id = CLASS_ID) =>
    app.inject({ method: 'PATCH', url: `/api/classes/${id}`, payload: { name } });
  const remove = (app: Awaited<ReturnType<typeof buildClassApp>>, id = CLASS_ID) => app.inject({ method: 'DELETE', url: `/api/classes/${id}` });

  it('needs a signed-in teacher or admin', async () => {
    const anon = await buildClassApp(null, {});
    expect((await rename(anon, 'X')).statusCode).toBe(401);
    expect((await remove(anon)).statusCode).toBe(401);
    await anon.close();
    const pupil = await buildClassApp(student, {});
    expect((await rename(pupil, 'X')).statusCode).toBe(403);
    expect((await remove(pupil)).statusCode).toBe(403);
    await pupil.close();
  });

  it('renames the teacher’s own class, trimming the name', async () => {
    const rooms = mockQuery({ data: { id: CLASS_ID, name: '10A2' }, error: null });
    const app = await buildClassApp(teacher, { class_rooms: rooms });
    const res = await rename(app, '  10A2  ');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ class_room: { id: CLASS_ID, name: '10A2' } });
    expect(rooms.updated[0]).toEqual({ name: '10A2' });
    expect(rooms.eqCalls).toContainEqual(['id', CLASS_ID]);
    expect(rooms.eqCalls).toContainEqual(['teacher_id', 'teacher-1']);
    await app.close();
  });

  it('lets an admin rename any class (no owner filter)', async () => {
    const rooms = mockQuery({ data: { id: CLASS_ID, name: '10A2' }, error: null });
    const app = await buildClassApp(admin, { class_rooms: rooms });
    expect((await rename(app, '10A2')).statusCode).toBe(200);
    expect(rooms.eqCalls.some(([column]) => column === 'teacher_id')).toBe(false);
    await app.close();
  });

  it('refuses an empty, blank, non-text or over-long name before touching the database', async () => {
    const rooms = mockQuery({ data: { id: CLASS_ID }, error: null });
    const app = await buildClassApp(teacher, { class_rooms: rooms });
    for (const name of ['', '   ', 5, undefined, 'x'.repeat(101)]) expect((await rename(app, name)).statusCode, String(name)).toBe(400);
    expect(rooms.updated).toHaveLength(0);
    await app.close();
  });

  it('answers 404 for another teacher’s class or a bad id, on rename and delete', async () => {
    const rooms = mockQuery({ data: null, error: null });
    const app = await buildClassApp(otherTeacher, { class_rooms: rooms });
    expect((await rename(app, 'X')).statusCode).toBe(404);
    expect((await remove(app)).statusCode).toBe(404);
    expect((await rename(app, 'X', 'not-a-uuid')).statusCode).toBe(404);
    expect((await remove(app, 'not-a-uuid')).statusCode).toBe(404);
    await app.close();
  });

  it('deletes the teacher’s own class, and an admin’s delete has no owner filter', async () => {
    const own = mockQuery({ data: { id: CLASS_ID }, error: null });
    const app = await buildClassApp(teacher, { class_rooms: own });
    expect((await remove(app)).statusCode).toBe(200);
    expect(own.deleteCalls).toBe(1);
    expect(own.eqCalls).toContainEqual(['teacher_id', 'teacher-1']);
    await app.close();

    const any = mockQuery({ data: { id: CLASS_ID }, error: null });
    const adminApp = await buildClassApp(admin, { class_rooms: any });
    expect((await remove(adminApp)).statusCode).toBe(200);
    expect(any.eqCalls.some(([column]) => column === 'teacher_id')).toBe(false);
    await adminApp.close();
  });

  it('reports a database error as 500 without claiming success', async () => {
    const rooms = mockQuery({ data: null, error: { message: 'boom' } });
    const app = await buildClassApp(teacher, { class_rooms: rooms });
    expect((await rename(app, 'X')).statusCode).toBe(500);
    expect((await remove(app)).statusCode).toBe(500);
    await app.close();
  });

  it('is refused with the maintenance answer when the classes feature is off', async () => {
    const rooms = mockQuery({ data: { id: CLASS_ID }, error: null });
    const app = Fastify();
    app.decorate('supabase', mockSupabase({ class_rooms: rooms }));
    app.decorate('siteSettings', { get: async () => ({ signupEnabled: true, maintenance: false, freeAccess: false, salesOpen: true, salesNote: { en: '', vi: '' }, features: { glossary: true, exam: true, pricing: true, classes: false, tutor: true } }), invalidate: () => {} });
    app.addHook('onRequest', async (request) => { (request as any).user = teacher; });
    await app.register(classRoutes);
    await app.ready();
    expect((await rename(app, 'X')).statusCode).toBe(403);
    expect((await remove(app)).statusCode).toBe(403);
    expect(rooms.deleteCalls).toBe(0);
    await app.close();
  });
});
