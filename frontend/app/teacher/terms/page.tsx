import type { Metadata } from 'next';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { TeacherAreaTabs } from '@/components/nav/TeacherAreaTabs';
import { StaffTermsPage } from '@/features/glossary/staff/StaffTermsPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Glossary terms', 'Thuật ngữ') };

export const dynamic = 'force-dynamic';

export default async function TeacherTermsPage() {
  // Teachers and admins only; others are redirected by the session check.
  const { role } = await getAuthoringSession('/teacher/terms');
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <TeacherAreaTabs active="terms" />
      <div className="mt-6">
        <StaffTermsPage isAdmin={role === 'admin'} />
      </div>
    </main>
  );
}
