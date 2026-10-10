import { describe, expect, it } from 'vitest';
import { buildRoadmap, continueTarget, estimateMinutes, passed, recentMilestones } from './progressModel';

const subject = (id: string) => ({ id, slug: id, name: { en: id, vi: id }, accent: 'var(--sky)' });
const topic = (id: string, sort: number, lessonIds: string[], grade = 10) => ({
  id, name_en: id, name_vi: id, sort_order: sort, grade,
  lessons: lessonIds.map((l, i) => ({ id: l, slug: l, title_en: l, title_vi: l, sort_order: i, grade })),
});

describe('buildRoadmap', () => {
  it('orders chapters by grade then topic, and marks only the first unfinished lesson current', () => {
    const r = buildRoadmap(subject('s'), [topic('t2', 2, ['c', 'd']), topic('t1', 1, ['a', 'b']), topic('g11', 0, ['e'], 11)], new Map([['a', '2026-10-01'], ['c', '2026-10-03']]));
    expect(r.chapters.map((c) => c.id)).toEqual(['t1', 't2', 'g11']);
    expect(r.chapters.flatMap((c) => c.lessons.map((l) => `${l.id}:${l.state}`))).toEqual(['a:done', 'b:current', 'c:done', 'd:todo', 'e:todo']);
    expect([r.done, r.total, r.lastActive]).toEqual([2, 5, '2026-10-03']);
  });
});

describe('continueTarget', () => {
  it('picks the most recently studied subject that still has a lesson to do', () => {
    const old = buildRoadmap(subject('old'), [topic('t', 1, ['x', 'y'])], new Map([['x', '2026-09-01']]));
    const recent = buildRoadmap(subject('new'), [topic('u', 1, ['p', 'q'])], new Map([['p', '2026-10-05']]));
    const finished = buildRoadmap(subject('fin'), [topic('v', 1, ['z'])], new Map([['z', '2026-10-09']]));
    expect(continueTarget([old, recent, finished])).toMatchObject({ roadmap: { subject: { id: 'new' } }, lesson: { id: 'q' }, chapterNumber: 1, lessonNumber: 2 });
    expect(continueTarget([finished])).toBeNull();
  });
});

describe('estimateMinutes', () => {
  it('counts one language at 200 wpm, adds a minute per quiz, and never goes under 3', () => {
    const text = Array(600).fill('từ').join(' ');
    expect(estimateMinutes([{ type: 'theory', content: { vi: text, en: text } }, { type: 'quiz' }, { type: 'quiz' }])).toBe(5);
    expect(estimateMinutes([])).toBe(3);
    expect(estimateMinutes(null)).toBe(3);
  });
});

describe('passed / recentMilestones', () => {
  it('passes at half marks on any scale', () => {
    expect(passed({ score: 5, maxScore: 10 })).toBe(true);
    expect(passed({ score: 599, maxScore: 1200 })).toBe(false);
  });

  it('keeps the newest first', () => {
    const items = ['2026-10-01', '2026-10-03', '2026-10-02'].map((at) => ({ kind: 'lesson' as const, at, title: { en: at, vi: at } }));
    expect(recentMilestones(items, 2).map((m) => m.at)).toEqual(['2026-10-03', '2026-10-02']);
  });
});
