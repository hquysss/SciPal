import type { EducationLevel } from '../landing/educationLevel';
import type { InformaticsAvailability, LandingSubject } from '../landing/getLandingData';

export function getSubjectAction(
  level: EducationLevel,
  subject: LandingSubject,
  informatics: InformaticsAvailability,
): string | null {
  if (
    level !== 'upper_secondary' ||
    subject.slug !== 'informatics' ||
    subject.status !== 'active' ||
    informatics.kind !== 'available'
  ) {
    return null;
  }

  return '/informatics';
}
