import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageTitle } from '@/lib/pageTitle';

// The privacy page is a client component, so its tab title lives here.
export const metadata: Metadata = { ...pageTitle('Privacy policy', 'Chính sách quyền riêng tư') };

export default function PrivacyLayout({ children }: { children: ReactNode }) {
  return children;
}
