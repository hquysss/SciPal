import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { StaffTermsPage } from '@/features/glossary/staff/StaffTermsPage';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Glossary terms', 'Thuật ngữ') };

export const dynamic = 'force-dynamic';

export default async function AdminTermsPage() {
  const { role } = await getAuthoringSession('/admin/terms');
  if (role !== 'admin') redirect('/teacher/terms');
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <StaffTermsPage isAdmin />
    </main>
  );
}
