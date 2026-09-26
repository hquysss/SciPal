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
