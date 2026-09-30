import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { AdminHub } from '@/features/admin/AdminHub';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Admin', 'Quản trị') };

export const dynamic = 'force-dynamic';

export default async function AdminHubPage() {
  const { role } = await getAuthoringSession('/admin');
  if (role !== 'admin') redirect('/profile');
  return <AdminHub />;
}
