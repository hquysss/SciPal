import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { levelOfGrade, type EducationLevel } from '../landing/educationLevel';

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

export interface TopicRow {
  id: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
  grade: number | null;
  lessons: Array<{ id: string; slug: string; title_en: string; title_vi: string; sort_order: number; grade: number }>;
}

export interface GradeGroup {
  grade: number;
  topics: Array<{
    id: string;
    name_en: string;
    name_vi: string;
    sort_order: number;
    lessons: Array<{ id: string; slug: string; title_en: string; title_vi: string; sort_order: number }>;
  }>;
}

export type SubjectSummary = Omit<SubjectRow, 'subject_grade_catalog'> & { levels: EducationLevel[] };

export type SubjectPageResult =
  | { kind: 'ok'; subject: SubjectSummary; gradeGroups: GradeGroup[] }
  | { kind: 'not_found' }
  | { kind: 'error' };

const LEVEL_ORDER: EducationLevel[] = ['primary', 'lower_secondary', 'upper_secondary'];

export function groupTopicsByGrade(topics: TopicRow[]): GradeGroup[] {
  const groups = new Map<number, Map<string, GradeGroup['topics'][number]>>();

  for (const topic of [...topics].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const lesson of topic.lessons ?? []) {
      const grade = topic.grade ?? lesson.grade;
      const byTopic = groups.get(grade) ?? new Map();
      groups.set(grade, byTopic);
      const entry = byTopic.get(topic.id) ?? {
        id: topic.id,
        name_en: topic.name_en,
        name_vi: topic.name_vi,
        sort_order: topic.sort_order,
        lessons: [],
      };
      byTopic.set(topic.id, entry);
      entry.lessons.push({
        id: lesson.id,
        slug: lesson.slug,
        title_en: lesson.title_en,
        title_vi: lesson.title_vi,
        sort_order: lesson.sort_order,
      });
    }
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, byTopic]) => ({
      grade,
      topics: [...byTopic.values()].map((topic) => ({
        ...topic,
        lessons: [...topic.lessons].sort((a, b) => a.sort_order - b.sort_order),
      })),
    }));
}

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
      .select('id, name_en, name_vi, sort_order, grade, lessons(id, slug, title_en, title_vi, sort_order, grade, status)')
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
