import { describe, expect, it } from 'vitest';
import type { EducationLevel } from '../landing/educationLevel';
import type { InformaticsAvailability, LandingSubject } from '../landing/getLandingData';
import { getSubjectAction } from './subjectAvailability';

const subject: LandingSubject = {
  id: 'subject-informatics',
  slug: 'informatics',
  name_en: 'Informatics',
  name_vi: 'Tin học',
  icon: '</>',
  accent_color: '#16a34a',
  status: 'active',
  sort_order: 0,
  education_level: 'upper_secondary',
};

const available: InformaticsAvailability = {
  kind: 'available',
  lesson: { slug: 'binary-search', title_en: 'Binary search', title_vi: 'Tìm kiếm nhị phân' },
};

describe('getSubjectAction', () => {
  it('opens only the available upper-secondary Informatics catalog route', () => {
    expect(getSubjectAction('upper_secondary', subject, available)).toBe('/informatics');
  });

  it.each(['empty', 'error'] as const)(
    'does not advertise a route when lesson availability is %s',
    (kind) => {
      const informatics: InformaticsAvailability = kind === 'empty' ? { kind } : { kind };
      expect(getSubjectAction('upper_secondary', subject, informatics)).toBeNull();
    },
  );

  it.each<EducationLevel>(['primary', 'lower_secondary'])(
    'does not open Informatics for %s',
    (level) => {
      expect(getSubjectAction(level, subject, available)).toBeNull();
    },
  );

  it('does not open a non-Informatics subject even when its row is active', () => {
    expect(getSubjectAction('upper_secondary', { ...subject, slug: 'math' }, available)).toBeNull();
  });

  it('does not trust an active row when the application route is upcoming', () => {
    expect(
      getSubjectAction('upper_secondary', { ...subject, status: 'upcoming' }, available),
    ).toBeNull();
  });
});
