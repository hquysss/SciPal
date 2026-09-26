import { createServerClient, type CookieStore, type Database } from '@scipal/supabase';
import { SUBJECT_CONFIG } from '../../lib/subject-config';
import { levelOfGrade, type EducationLevel } from './educationLevel';

export interface LandingSubject {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  icon_url: string | null;
  accent_color: string;
  sort_order: number;
  education_level: EducationLevel;
  status: 'active' | 'upcoming';
}

export interface CatalogSubjectRow {
  id: string;
  slug: string;
  name_en: string;
  name_vi: string;
  icon: string;
  icon_url: string | null;
  accent_color: string;
  sort_order: number;
  subject_grade_catalog: Array<{ grade: number }>;
}

const LEVEL_ORDER: EducationLevel[] = ['primary', 'lower_secondary', 'upper_secondary'];

export { levelOfGrade };

export function expandSubjectsByLevel(
  rows: CatalogSubjectRow[],
  published: Array<{ subject_id: string; grade: number }>,
): LandingSubject[] {
  const liveLevels = new Set(published.map((l) => `${l.subject_id}:${levelOfGrade(l.grade)}`));
  const cards: LandingSubject[] = [];
  for (const level of LEVEL_ORDER) {
    for (const row of rows) {
      if (!row.subject_grade_catalog.some((c) => levelOfGrade(c.grade) === level)) continue;
      const { subject_grade_catalog: _catalog, ...subject } = row;
      cards.push({
        ...subject,
        education_level: level,
        status: liveLevels.has(`${row.id}:${level}`) ? 'active' : 'upcoming',
      });
    }
  }
  return cards;
}

export type LandingLesson = Pick<
  Database['public']['Tables']['lessons']['Row'],
  'slug' | 'title_en' | 'title_vi'
>;

export type InformaticsAvailability =
  | { kind: 'available'; lesson: LandingLesson }
  | { kind: 'empty' }
  | { kind: 'error' };

export type LandingCatalog =
  | { kind: 'ready'; subjects: LandingSubject[] }
  | { kind: 'error' };

export interface LandingData {
  catalog: LandingCatalog;
  informatics: InformaticsAvailability;
}

export function classifyInformatics(
  subject: LandingSubject | null,
  lesson: LandingLesson | null,
  failed: boolean,
): InformaticsAvailability {
  if (failed) return { kind: 'error' };
  if (
    subject?.slug !== 'informatics' ||
    subject.status !== 'active' ||
    SUBJECT_CONFIG.informatics.status !== 'active' ||
    !lesson
  ) {
    return { kind: 'empty' };
  }

  return { kind: 'available', lesson };
}

export async function getLandingData(
  cookieStore: CookieStore,
  existingClient?: ReturnType<typeof createServerClient>,
): Promise<LandingData> {
  let supabase: ReturnType<typeof createServerClient>;
  try {
    supabase = existingClient ?? createServerClient(cookieStore);
  } catch {
    return { catalog: { kind: 'error' }, informatics: { kind: 'error' } };
  }

  let catalogResult;
  let publishedResult;
  try {
    [catalogResult, publishedResult] = await Promise.all([
      supabase
        .from('subjects')
        .select('id,slug,name_en,name_vi,icon,icon_url,accent_color,sort_order,subject_grade_catalog!inner(grade)')
        .eq('subject_grade_catalog.active', true)
        .order('sort_order', { ascending: true }),
      supabase.from('lessons').select('subject_id,grade').eq('status', 'published'),
    ]);
  } catch {
    return { catalog: { kind: 'error' }, informatics: { kind: 'error' } };
  }
  if (catalogResult.error || publishedResult.error) {
    return { catalog: { kind: 'error' }, informatics: { kind: 'error' } };
  }

  const subjects = expandSubjectsByLevel(
    (catalogResult.data ?? []) as CatalogSubjectRow[],
    publishedResult.data ?? [],
  );
  const subject = subjects.find((item) => item.slug === 'informatics' && item.education_level === 'upper_secondary') ?? null;
  if (!subject || subject.status !== 'active' || SUBJECT_CONFIG.informatics.status !== 'active') {
    return {
      catalog: { kind: 'ready', subjects },
      informatics: classifyInformatics(subject, null, false),
    };
  }

  try {
    const lessonResult = await supabase
      .from('lessons')
      .select('slug,title_en,title_vi')
      .eq('subject_id', subject.id)
      .eq('status', 'published')
      .gte('grade', 10)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    return {
      catalog: { kind: 'ready', subjects },
      informatics: classifyInformatics(subject, lessonResult.data, lessonResult.error !== null),
    };
  } catch {
    return {
      catalog: { kind: 'ready', subjects },
      informatics: { kind: 'error' },
    };
  }
}
