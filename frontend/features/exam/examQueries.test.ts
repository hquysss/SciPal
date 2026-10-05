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
    await expect(getExamBlueprint('bp')).resolves.toEqual({
      kind: 'ok', blueprint: { ...summary, format: 'generic', layout: null }, questions: [],
    });
  });

  it('carries the exam format and section layout', async () => {
    const layout = [{
      key: 'mc', title: { vi: 'Phần I', en: 'Part I' }, kind: 'mc', count: 2, max_points: 3,
      groups: [{ passage: { vi: 'Đọc', en: 'Read' }, question_ids: ['q1', 'q2'] }],
    }];
    respond(200, { blueprint: { ...summary, format: 'thptqg', layout }, questions: [] });
    await expect(getExamBlueprint('bp')).resolves.toEqual({
      kind: 'ok', blueprint: { ...summary, format: 'thptqg', layout }, questions: [],
    });
  });

  it('reads an unknown format or a malformed layout as a generic exam', async () => {
    respond(200, { blueprint: { ...summary, format: 'other', layout: { not: 'a list' } }, questions: [] });
    await expect(getExamBlueprint('bp')).resolves.toMatchObject({
      kind: 'ok', blueprint: { format: 'generic', layout: null },
    });
  });
});
