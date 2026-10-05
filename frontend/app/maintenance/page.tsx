import type { Metadata } from 'next';
import { MaintenanceNotice } from '@/features/site/MaintenanceNotice';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Under maintenance', 'Đang bảo trì'), robots: { index: false } };

/** Shown (by the middleware, at the page's own address) while an admin has the whole site under maintenance. */
export default function MaintenancePage() {
  return <MaintenanceNotice />;
}
