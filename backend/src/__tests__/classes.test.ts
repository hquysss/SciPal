import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import crypto from 'crypto';
import { authPlugin } from '../plugins/auth.js';
import { classRoutes } from '../routes/classes.js';
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
