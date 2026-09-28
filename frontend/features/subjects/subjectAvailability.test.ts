import { describe, expect, it } from 'vitest';
import type { LandingSubject } from '../landing/getLandingData';
import { getSubjectAction } from './subjectAvailability';

const subject = (patch: Partial<LandingSubject> = {}): LandingSubject => ({
  id: 'subject-math',
  slug: 'math',
  name_en: 'Mathematics',
  name_vi: 'Toán',
  icon: '∑',
  accent_color: '#2563eb',
  status: 'active',
  sort_order: 0,
  education_level: 'lower_secondary',
  liveGrades: [7, 8],
  ...patch,
});

describe('getSubjectAction', () => {
  it('opens any subject with published lessons at its first live grade', () => {
    expect(getSubjectAction(subject())).toBe('/math#lop-7');
    expect(getSubjectAction(subject({ slug: 'informatics', education_level: 'upper_secondary', liveGrades: [10] }))).toBe('/informatics#lop-10');
  });

  it('opens nothing for a subject without published lessons', () => {
    expect(getSubjectAction(subject({ status: 'upcoming', liveGrades: [] }))).toBeNull();
    expect(getSubjectAction(subject({ liveGrades: [] }))).toBeNull();
  });

  it('opens the subject page itself when the live grades are unknown', () => {
    expect(getSubjectAction(subject({ liveGrades: undefined }))).toBe('/math');
  });
});
