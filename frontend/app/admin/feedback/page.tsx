import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Bi } from '@/components/ui/bilingual';
import { WebsiteFeedbackBoard } from '@/features/website-feedback/WebsiteFeedbackBoard';
import { pageTitle } from '@/lib/pageTitle';
export const metadata: Metadata = { ...pageTitle('Website reviews', 'Đánh giá website') };
export const dynamic = 'force-dynamic';
export default async function AdminFeedbackPage() {
  const { role } = await getAuthoringSession('/admin/feedback'); if (role !== 'admin') redirect('/profile');
  return <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-20 sm:px-6"><PageBreadcrumb items={[{ href: '/admin', label: { vi: 'Quản trị', en: 'Admin' } }, { label: { vi: 'Đánh giá website', en: 'Website reviews' } }]} /><h1 className="mt-6 text-3xl font-extrabold text-ink"><Bi vi="Đánh giá website" en="Website reviews" /></h1><WebsiteFeedbackBoard identities /></main>;
}
