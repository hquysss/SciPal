import type { LandingSubject } from '../landing/getLandingData';

/**
 * Where a subject card leads: any subject with published lessons at its level opens at the first
 * grade that has them (the subject page marks each grade group with `id="lop-N"`), as on /subjects.
 */
export function getSubjectAction(subject: LandingSubject): string | null {
  if (subject.status !== 'active') return null;
  if (subject.liveGrades === undefined) return `/${subject.slug}`;
  const first = [...subject.liveGrades].sort((a, b) => a - b)[0];
  return first === undefined ? null : `/${subject.slug}#lop-${first}`;
}

export function subjectsByAvailability(subjects: readonly LandingSubject[]): LandingSubject[] {
  const live = subjects.filter((subject) => getSubjectAction(subject) !== null);
  return [...live, ...subjects.filter((subject) => getSubjectAction(subject) === null)];
}
