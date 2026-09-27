export interface BlueprintSummary {
  id: string;
  name: string;
  name_en: string | null;
  grade: number | null;
  subject_id: string | null;
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  question_count: number;
  duration_minutes: number | null;
}

interface SubjectRef {
  slug: string;
  name_en: string;
  name_vi: string;
}

export interface BlueprintRow {
  id: string;
  name: string;
  name_en?: string | null;
  grade: number | null;
  subject_id: string | null;
  sections: unknown;
  question_ids?: string[] | null;
  duration_minutes?: number | null;
  /** Absent on a database that has not run the exam-import migration: treated as published. */
  status?: string | null;
  subjects: SubjectRef | SubjectRef[] | null;
}

/** Learners see an exam once it is published; a teacher's import waits for an admin first. */
export function isPublishedBlueprint(row: Pick<BlueprintRow, 'status'>): boolean {
  return (row.status ?? 'published') === 'published';
}

// `*` keeps the listing working on a database that has not run the exam-import migration yet.
export const BLUEPRINT_COLUMNS = '*, subjects(slug, name_en, name_vi)';

export function countBlueprintQuestions(sections: unknown): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce<number>((total, section) => {
    const count = (section as { count?: unknown } | null)?.count;
    return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? total + count : total;
  }, 0);
}

/** The exact questions of an imported exam, in order; empty when the exam draws from its subject pool. */
export function blueprintQuestionIds(row: Pick<BlueprintRow, 'question_ids'>): string[] {
  return Array.isArray(row.question_ids) ? row.question_ids.filter((id) => typeof id === 'string') : [];
}

export function toBlueprintSummary(row: BlueprintRow): BlueprintSummary {
  const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  const questionIds = blueprintQuestionIds(row);
  return {
    id: row.id,
    name: row.name,
    name_en: row.name_en ?? null,
    grade: row.grade ?? null,
    subject_id: row.subject_id ?? null,
    subject_slug: subject?.slug ?? null,
    subject_name_en: subject?.name_en ?? null,
    subject_name_vi: subject?.name_vi ?? null,
    question_count: questionIds.length > 0 ? questionIds.length : countBlueprintQuestions(row.sections),
    duration_minutes: row.duration_minutes ?? null,
  };
}
