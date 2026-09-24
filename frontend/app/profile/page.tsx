import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@scipal/supabase';
import { getUserProfile } from '@/features/profile/profileQueries';
import { ProfileCard } from '@/features/profile/ProfileCard';
import { AccountSettings } from '@/features/profile/AccountSettings';
import { FeatureRequestBoard } from '@/features/survey/FeatureRequestBoard';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  let user: { id: string; email?: string } | null = null;
  let appRole: string | undefined;

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore as any);
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      user = authUser;
      const role = authUser.app_metadata?.app_role;
      if (typeof role === 'string') appRole = role;
    }
  } catch (err) {
    console.warn('Profile auth check warning:', err);
  }

  const userId = user?.id ?? 'demo-explorer-user';
  const { profile, stats } = await getUserProfile(userId);

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

        {!user && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-xs font-medium text-amber-800 shadow-xs dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-300">
            💡 <strong>Chế độ xem trước hồ sơ (Demo Explorer):</strong> Bạn đang trải nghiệm giao diện với dữ liệu học tập mẫu. Đăng nhập qua Supabase để đồng bộ tiến trình học tập cá nhân.
          </div>
        )}

        {/* Profile Stats Card */}
        <ProfileCard
          displayName={displayName}
          role={role}
          avatarUrl={profile?.avatar_url}
          stats={stats}
        />

        {/* Account & Learning Settings */}
        <AccountSettings currentRole={role} />

        {/* Feature Request & Innovation Board (§9.7) */}
        <FeatureRequestBoard />
      </main>
    </div>
  );
}
