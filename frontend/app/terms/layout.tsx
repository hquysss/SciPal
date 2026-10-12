import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageTitle } from '@/lib/pageTitle';

// The terms page is a client component, so its tab title lives here.
export const metadata: Metadata = { ...pageTitle('Terms of use', 'Điều khoản sử dụng') };

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children;
}
