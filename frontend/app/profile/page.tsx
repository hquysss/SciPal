import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient } from '@scipal/supabase';
import { getUserProfile } from '@/features/profile/profileQueries';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { parseEducationLevel, resolveEducationLevel, type EducationLevel } from '@/features/landing/educationLevel';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { AccountSettings } from '@/features/profile/AccountSettings';
import { FeatureRequestBoard } from '@/features/survey/FeatureRequestBoard';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  let user: { id: string; email?: string } | null = null;
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
    <div className="relative min-h-[calc(100vh-3.5rem)] bg-science-grid pb-20">
      <main className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 space-y-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-xs font-mono text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition dark:hover:text-white">
            Trang chủ
          </Link>
          <span>/</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
            Hồ sơ cá nhân
          </span>
        </nav>

        {loadFailed && (
          <LoadErrorNotice
            message={{
              en: 'We could not load your learning stats. The numbers below may be incomplete — please reload.',
              vi: 'Chưa tải được số liệu học tập. Số liệu bên dưới có thể chưa đầy đủ — vui lòng tải lại trang.',
            }}
          />
        )}

        {/* Profile Stats Card */}
        <ProfileCard
          displayName={displayName}
          role={role}
          avatarUrl={profile?.avatar_url}
          stats={stats}
        />

        {/* Account & Learning Settings */}
        <AccountSettings
          currentRole={role}
          educationPreference={educationPreference}
          isAuthenticated
        />

        {/* Feature Request & Innovation Board (§9.7) */}
        <FeatureRequestBoard />
      </main>
    </div>
  );
}
