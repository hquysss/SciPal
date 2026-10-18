import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { parseEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { getLandingData } from '@/features/landing/getLandingData';
import { SubjectsPage } from '@/features/subjects/SubjectsPage';
import { pageTitle } from '@/lib/pageTitle';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  ...pageTitle('Subjects', 'Môn học'),
  description: 'Các môn học song ngữ theo Chương trình GDPT 2018, chia theo cấp học.',
};

/** The navbar's "Subjects" tab: every subject of a level, opening on the reader's own level. */
export default async function SubjectsRoute() {
  const cookieStore = await cookies();
  let supabase: ReturnType<typeof createServerClient> | null = null;
  try {
    supabase = createServerClient(cookieStore);
  } catch {
    supabase = null;
  }

  const landingData = await getLandingData(cookieStore, supabase ?? undefined);

  let accountLevel: EducationLevel | null = null;
  let accountGrade: number | null = null;
  if (supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // The generated profile types do not list `grade` (10–12, set on the profile page) yet.
        const { data, error } = await supabase
          .from('profiles')
          .select('preferred_education_level, grade')
          .eq('id', user.id)
          .maybeSingle() as { data: { preferred_education_level?: string | null; grade?: number | null } | null; error: unknown };
        if (!error) {
          accountLevel = parseEducationLevel(data?.preferred_education_level);
          accountGrade = typeof data?.grade === 'number' ? data.grade : null;
        }
      }
    } catch {
      accountLevel = null;
      accountGrade = null;
    }
  }

  return <SubjectsPage accountLevel={accountLevel} accountGrade={accountGrade} catalog={landingData.catalog} informatics={landingData.informatics} />;
}
