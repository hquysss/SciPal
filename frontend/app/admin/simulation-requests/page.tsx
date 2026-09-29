import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { AdminQueue } from '@/features/authoring/simulationRequests/AdminQueue';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Simulation requests', 'Đề xuất mô phỏng') };

export const dynamic = 'force-dynamic';

export default async function AdminSimulationRequestsPage() {
  const { role } = await getAuthoringSession('/admin/simulation-requests');
  if (role !== 'admin') redirect('/teacher/simulation-requests');
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <AdminQueue />
    </main>
  );
}
