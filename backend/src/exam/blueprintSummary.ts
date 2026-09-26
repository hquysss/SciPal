export interface BlueprintSummary {
  id: string;
  name: string;
  grade: number | null;
  subject_id: string | null;
  subject_slug: string | null;
  subject_name_en: string | null;
  subject_name_vi: string | null;
  question_count: number;
}

interface SubjectRef {
  slug: string;
  name_en: string;
  name_vi: string;
}

export interface BlueprintRow {
  id: string;
  name: string;
  grade: number | null;
  subject_id: string | null;
  sections: unknown;
  subjects: SubjectRef | SubjectRef[] | null;
}

export const BLUEPRINT_COLUMNS = 'id, name, grade, subject_id, sections, subjects(slug, name_en, name_vi)';

export function countBlueprintQuestions(sections: unknown): number {
  if (!Array.isArray(sections)) return 0;
  return sections.reduce<number>((total, section) => {
    const count = (section as { count?: unknown } | null)?.count;
    return typeof count === 'number' && Number.isInteger(count) && count >= 0 ? total + count : total;
  }, 0);
}

export function toBlueprintSummary(row: BlueprintRow): BlueprintSummary {
  const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
  return {
    id: row.id,
    name: row.name,
    grade: row.grade ?? null,
    subject_id: row.subject_id ?? null,
    subject_slug: subject?.slug ?? null,
    subject_name_en: subject?.name_en ?? null,
    subject_name_vi: subject?.name_vi ?? null,
    question_count: countBlueprintQuestions(row.sections),
  };
}
