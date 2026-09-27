import { getAuthoringSession } from '@/features/authoring/serverAuth';
import { TeacherRequestsPage } from '@/features/authoring/simulationRequests/TeacherRequestsPage';

export const dynamic = 'force-dynamic';

export default async function SimulationRequestsPage() {
  // Teachers and admins only; others are redirected by the session check.
  await getAuthoringSession('/teacher/simulation-requests');
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <TeacherRequestsPage />
    </main>
  );
}
