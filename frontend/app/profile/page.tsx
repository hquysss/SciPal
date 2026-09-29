import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { getUserProfile } from '@/features/profile/profileQueries';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { parseEducationLevel, resolveEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { ProfileBreadcrumb } from '@/features/profile/ProfileBreadcrumb';
import { AccountSettings } from '@/features/profile/AccountSettings';
import { FeatureRequestBoard } from '@/features/survey/FeatureRequestBoard';
import { TeacherRequestCard } from '@/features/teacherRequests/TeacherRequestCard';
import { ReportProblemCard } from '@/features/problemReports/ReportProblem';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Profile', 'Hồ sơ') };

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  let user: { id: string; email?: string; created_at?: string } | null = null;
  let appRole: string | undefined;
  let accountLevel: EducationLevel | null = null;
  const cookieStore = await cookies();
  let supabase: ReturnType<typeof createServerClient> | null = null;

  try {
    supabase = createServerClient(cookieStore);
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (!authError && authUser) {
      user = authUser;
      const role = authUser.app_metadata?.app_role;
      if (typeof role === 'string') appRole = role;

      const { data, error } = await supabase
        .from('profiles')
        .select('preferred_education_level')
        .eq('id', authUser.id)
        .maybeSingle();
      if (!error) accountLevel = parseEducationLevel(data?.preferred_education_level);
    }
  } catch (err) {
    console.warn('Profile auth check warning:', err);
  }

  const educationPreference = resolveEducationLevel(accountLevel, null);

  if (!user) redirect('/login?redirect=%2Fprofile');
  const { profile, stats, loadFailed } = await getUserProfile(user.id);

  const displayName = profile?.display_name ?? user?.email?.split('@')[0] ?? 'Học viên SciPal';
  const role = appRole === 'admin'
    ? 'admin'
    : appRole === 'teacher'
      ? 'teacher'
      : ((profile?.role as 'student' | 'teacher') ?? 'student');

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <ProfileBreadcrumb />

      {loadFailed && (
        <LoadErrorNotice
          message={{
            en: 'We could not load your learning stats. The numbers below may be incomplete — please reload.',
            vi: 'Chưa tải được số liệu học tập. Số liệu bên dưới có thể chưa đầy đủ — vui lòng tải lại trang.',
          }}
        />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Who and where to go: stays in view beside the settings on wide screens. */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <ProfileCard
            displayName={displayName}
            role={role}
            email={user.email ?? null}
            joinedAt={user.created_at ?? null}
            avatarUrl={profile?.avatar_url}
            stats={stats}
          />
        </div>

        <div className="flex flex-col gap-6">
          {role === 'student' && <TeacherRequestCard />}
          <AccountSettings currentRole={role} educationPreference={educationPreference} isAuthenticated />
        </div>
      </div>

      <FeatureRequestBoard />

      <ReportProblemCard />
    </main>
  );
}
