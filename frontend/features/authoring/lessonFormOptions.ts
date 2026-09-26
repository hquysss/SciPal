import { levelOfGrade, type EducationLevel } from '../landing/educationLevel';
import type { AuthoringSubjectOption, AuthoringTopicOption, AuthoringTrackOption } from './authoringQueries';

export interface SubjectChoice {
  key: string;
  subjectId: string;
  name_en: string;
  name_vi: string;
  grades: number[];
}

const LEVEL_ORDER: EducationLevel[] = ['primary', 'lower_secondary', 'upper_secondary'];

export function buildSubjectChoices(
  subjects: AuthoringSubjectOption[],
): Array<{ level: EducationLevel; items: SubjectChoice[] }> {
  return LEVEL_ORDER.map((level) => ({
    level,
    items: subjects.flatMap((subject) => {
      const grades = subject.grades.filter((grade) => levelOfGrade(grade) === level);
      return grades.length > 0
        ? [{ key: `${subject.id}:${level}`, subjectId: subject.id, name_en: subject.name_en, name_vi: subject.name_vi, grades }]
        : [];
    }),
  })).filter((group) => group.items.length > 0);
}

export function topicsFor(topics: AuthoringTopicOption[], subjectId: string, grade: number): AuthoringTopicOption[] {
  return topics
    .filter((topic) => topic.subject_id === subjectId && (topic.grade === grade || topic.grade === null))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function tracksFor(tracks: AuthoringTrackOption[], subjectId: string, grade: number): AuthoringTrackOption[] {
  return tracks.filter((track) => track.subject_id === subjectId && track.grades.includes(grade));
}
