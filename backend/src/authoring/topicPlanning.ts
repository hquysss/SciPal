export function makeSlug(value: string): string {
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SubjectCatalogRow {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
  subject_grade_catalog: Array<{ grade: number; active: boolean }>;
}

export interface SubjectOption {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
  grades: number[];
}

export function toSubjectOptions(rows: SubjectCatalogRow[]): SubjectOption[] {
  return rows.flatMap(({ subject_grade_catalog: catalog, ...subject }) => {
    const grades = [...new Set((catalog ?? []).filter((row) => row.active).map((row) => row.grade))]
      .sort((a, b) => a - b);
    return grades.length > 0 ? [{ ...subject, grades }] : [];
  });
}

export interface ExistingTopic {
  id: string;
  slug: string;
  grade: number | null;
  name_en: string;
  name_vi: string;
  sort_order: number;
}

export type TopicPlan =
  | { kind: 'duplicate'; topic: ExistingTopic }
  | { kind: 'new'; slug: string; sort_order: number };

const normalizeName = (value: string) => value.trim().toLowerCase();

export function planNewTopic(
  existing: ExistingTopic[],
  input: { grade: number; name_en: string; name_vi: string },
): TopicPlan {
  const nameEn = normalizeName(input.name_en);
  const nameVi = normalizeName(input.name_vi);
  const sameGrade = existing.filter((topic) => topic.grade === input.grade);

  const duplicate = sameGrade.find(
    (topic) => normalizeName(topic.name_en) === nameEn || normalizeName(topic.name_vi) === nameVi,
  );
  if (duplicate) return { kind: 'duplicate', topic: duplicate };

  const stem = makeSlug(input.name_en) || makeSlug(input.name_vi) || 'chu-de';
  const base = `g${input.grade}-${stem}`;
  const taken = new Set(existing.map((topic) => topic.slug));
  let slug = base;
  for (let suffix = 2; taken.has(slug); suffix += 1) slug = `${base}-${suffix}`;

  const sortOrder = sameGrade.length > 0 ? Math.max(...sameGrade.map((topic) => topic.sort_order)) + 1 : 0;
  return { kind: 'new', slug, sort_order: sortOrder };
}
