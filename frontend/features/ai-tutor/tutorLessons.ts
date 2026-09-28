import type { createServerClient } from '@scipal/supabase';
import type { TutorLesson } from './tutorLessonTypes';

type Row = {
  id: string;
  title_vi: string;
  title_en: string;
  grade: number;
  subject_id: string;
  sort_order: number | null;
  subjects: { name_vi: string; name_en: string; sort_order: number | null } | Array<{ name_vi: string; name_en: string; sort_order: number | null }> | null;
};

/** Published lessons for the tutor's lesson picker, by subject, grade and lesson order. Empty on error. */
export async function getTutorLessons(supabase: ReturnType<typeof createServerClient>): Promise<TutorLesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('id, title_vi, title_en, grade, subject_id, sort_order, subjects(name_vi, name_en, sort_order)')
    .eq('status', 'published');
  if (error) {
    console.error('Could not load lessons for the tutor picker:', error.message);
    return [];
  }
  const rows = ((data ?? []) as Row[]).map((row) => ({ row, subject: Array.isArray(row.subjects) ? row.subjects[0] : row.subjects }));
  rows.sort(
    (a, b) =>
      (a.subject?.sort_order ?? 0) - (b.subject?.sort_order ?? 0) ||
      a.row.subject_id.localeCompare(b.row.subject_id) ||
      a.row.grade - b.row.grade ||
      (a.row.sort_order ?? 0) - (b.row.sort_order ?? 0),
  );
  return rows.map(({ row, subject }) => ({
    id: row.id,
    title_vi: row.title_vi,
    title_en: row.title_en,
    grade: row.grade,
    subject_id: row.subject_id,
    subject_name_vi: subject?.name_vi ?? '',
    subject_name_en: subject?.name_en ?? '',
  }));
}
