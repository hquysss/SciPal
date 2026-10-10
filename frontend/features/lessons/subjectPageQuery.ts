import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { levelOfGrade, type EducationLevel } from '../landing/educationLevel';
import { groupTopicsByGrade, type GradeGroup, type TopicRow } from './groupTopics';

export { groupTopicsByGrade, type GradeGroup, type TopicRow } from './groupTopics';

export type QueryOutcome<T> = { data: T; error: unknown };

export interface SubjectRow {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  icon_url: string | null;
  accent_color: string;
  subject_grade_catalog: Array<{ grade: number; active: boolean }>;
}

export type SubjectSummary = Omit<SubjectRow, 'subject_grade_catalog'> & { levels: EducationLevel[] };

export type SubjectPageResult =
  | { kind: 'ok'; subject: SubjectSummary; gradeGroups: GradeGroup[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

const LEVEL_ORDER: EducationLevel[] = ['primary', 'lower_secondary', 'upper_secondary'];

export function classifySubjectPage(
  subject: QueryOutcome<SubjectRow | null>,
  topics: QueryOutcome<TopicRow[] | null> | null,
): SubjectPageResult {
  if (subject.error) return { kind: 'error' };
  if (!subject.data) return { kind: 'not_found' };
  if (!topics || topics.error) return { kind: 'error' };

  const { subject_grade_catalog: catalog, ...row } = subject.data;
  const active = new Set((catalog ?? []).filter((c) => c.active).map((c) => levelOfGrade(c.grade)));
  return {
    kind: 'ok',
    subject: { ...row, levels: LEVEL_ORDER.filter((level) => active.has(level)) },
    gradeGroups: groupTopicsByGrade(topics.data ?? []),
  };
}

export async function getSubjectPage(slug: string): Promise<SubjectPageResult> {
  try {
    const supabase = createServerClient(await cookies());
    const subject = await supabase
      .from('subjects')
      .select('id, slug, name_en, name_vi, icon, icon_url, accent_color, subject_grade_catalog(grade, active)')
      .eq('slug', slug)
      .maybeSingle();
    if (subject.error || !subject.data) {
      return classifySubjectPage({ data: null, error: subject.error }, null);
    }

    const topics = await supabase
      .from('topics')
      .select('id, name_en, name_vi, sort_order, grade, lessons(id, slug, title_en, title_vi, source, sort_order, grade, status)')
      .eq('subject_id', subject.data.id)
      .eq('lessons.status', 'published')
      .order('sort_order');

    return classifySubjectPage(
      { data: subject.data as unknown as SubjectRow, error: null },
      { data: topics.data as unknown as TopicRow[] | null, error: topics.error },
    );
  } catch (error) {
    console.warn('Subject page query failed:', error);
    return { kind: 'error' };
  }
}
