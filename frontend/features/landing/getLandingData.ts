import { createServerClient, type CookieStore, type Database } from '@scipal/supabase';
import { SUBJECT_CONFIG } from '../../lib/subject-config';

export type LandingSubject = Pick<
  Database['public']['Tables']['subjects']['Row'],
  | 'id'
  | 'slug'
  | 'name_en'
  | 'name_vi'
  | 'icon'
  | 'accent_color'
  | 'status'
  | 'sort_order'
  | 'education_level'
>;

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
  try {
    catalogResult = await supabase
      .from('subjects')
      .select('id,slug,name_en,name_vi,icon,accent_color,status,sort_order,education_level')
      .order('education_level', { ascending: true })
      .order('sort_order', { ascending: true });
  } catch {
    return { catalog: { kind: 'error' }, informatics: { kind: 'error' } };
  }

  if (catalogResult.error) {
    return { catalog: { kind: 'error' }, informatics: { kind: 'error' } };
  }

  const subjects = catalogResult.data ?? [];
  const subject = subjects.find((item) => item.slug === 'informatics') ?? null;
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
      .eq('published', true)
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
