import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Reset password', 'Đặt lại mật khẩu') };

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
