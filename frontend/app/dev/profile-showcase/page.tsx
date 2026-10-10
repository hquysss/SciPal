import { notFound } from 'next/navigation';
import { ProfileShowcase } from './ProfileShowcase';

// Dev only: the profile and the admin teacher-request panel with sample data, no account needed.
export default async function ProfileShowcasePage({ searchParams }: { searchParams: Promise<{ role?: string; request?: string; plan?: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const role = params.role === 'teacher' || params.role === 'admin' ? params.role : 'student';
  const request = params.request === 'pending' || params.request === 'rejected' || params.request === 'form' ? params.request : 'none';
  const renewalStatus = ['active', 'cancel_pending', 'failed', 'paused', 'cancelled'].includes(params.plan ?? '')
    ? params.plan as 'active' | 'cancel_pending' | 'failed' | 'paused' | 'cancelled'
    : 'manual';
  return <ProfileShowcase role={role} request={request} renewalStatus={renewalStatus} />;
}
