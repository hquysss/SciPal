import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { capacityRefusal } from '../billing/capacity.js';
import { classRoutes } from '../routes/classes.js';
import { examRoutesAuthoring } from '../routes/exams.js';
import { mockQuery, mockSupabase, type MockBuilder } from './helpers/supabaseMock.js';

const teacher = { id: 'teacher-1', app_metadata: { app_role: 'teacher' } };
const student = { id: 'student-1', app_metadata: {} };
const ok = (data: unknown = null) => mockQuery({ data, error: null });
const full = (metric: string, limit: number) => mockQuery({ data: null, error: { code: 'P0001', message: 'QUOTA_EXCEEDED', details: metric, hint: String(limit) } as never });

async function build(routes: typeof classRoutes, user: object, tables: Record<string, MockBuilder | MockBuilder[]>) {
  const app = Fastify();
  app.decorate('supabase', mockSupabase(tables));
  app.addHook('onRequest', async (req) => { (req as any).user = user; });
  await app.register(routes);
  await app.ready();
  return app;
}

describe('capacityRefusal', () => {
  it('turns the database refusal into a 429 naming the limit', () => {
    expect(capacityRefusal({ message: 'QUOTA_EXCEEDED', details: 'active_classes', hint: '1' })).toMatchObject({
      code: 'QUOTA_EXCEEDED', metric: 'active_classes', limit: 1, error: expect.stringContaining('1 lớp'), error_en: expect.stringContaining('1 active class'),
    });
    expect(capacityRefusal({ message: 'QUOTA_EXCEEDED', details: 'students_per_class', hint: '50' })?.error).toContain('50 học sinh');
    expect(capacityRefusal({ message: 'QUOTA_EXCEEDED', details: 'active_authored_exams', hint: '5' })?.error).toContain('5 đề');
    expect(capacityRefusal({ code: '23505', message: 'duplicate' })).toBeNull();
    expect(capacityRefusal(null)).toBeNull();
  });
});

describe('capacity in the routes', () => {
  it('refuses a class over the plan with 429', async () => {
    const app = await build(classRoutes, teacher, { subjects: ok({ id: 's1' }), class_rooms: full('active_classes', 1) });
    const res = await app.inject({ method: 'POST', url: '/api/classes', payload: { name: 'Lớp 10A', subject_slug: 'informatics' } });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', metric: 'active_classes', limit: 1 });
    await app.close();
  });

  it('tells a student the class is full', async () => {
    const app = await build(classRoutes, student, { class_rooms: ok({ id: 'c1', teacher_id: 'teacher-1' }), class_members: full('students_per_class', 50) });
    const res = await app.inject({ method: 'POST', url: '/api/classes/join', payload: { invite_code: 'ABCD2345' } });
    expect(res.statusCode).toBe(429);
    expect(res.json().error).toContain('đủ 50 học sinh');
    await app.close();
  });

  it('refuses an exam over the plan with 429', async () => {
    const SUBJECT = '11111111-1111-4111-8111-111111111111';
    const Q = '33333333-3333-4333-8333-333333333333';
    const question = {
      id: Q, usage: 'exam', subject_id: SUBJECT, status: 'published', created_by: 'teacher-2', type: 'mc', difficulty: 1,
      data: { stem: { vi: 'Câu?', en: 'Q?' }, options: [{ id: 'a', text: { vi: 'A', en: 'A' } }, { id: 'b', text: { vi: 'B', en: 'B' } }], answer: 'a' },
    };
    const app = await build(examRoutesAuthoring, teacher, { subjects: ok({ id: SUBJECT, archived_at: null }), questions: ok([question]), exam_blueprints: full('active_authored_exams', 5) });
    const res = await app.inject({
      method: 'POST',
      url: '/api/authoring/exams',
      payload: { name: 'Đề 1', name_en: '', subject_id: SUBJECT, grade: 10, duration_minutes: 45, question_ids: [Q] },
    });
    expect(res.statusCode).toBe(429);
    expect(res.json()).toMatchObject({ code: 'QUOTA_EXCEEDED', metric: 'active_authored_exams', limit: 5 });
    await app.close();
  });
});
