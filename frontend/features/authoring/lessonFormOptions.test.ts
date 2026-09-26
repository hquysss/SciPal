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
