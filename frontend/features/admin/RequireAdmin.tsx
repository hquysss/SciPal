'use client';

import { useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '../../components/ui/alert';
import { Button, buttonVariants } from '../../components/ui/button';

interface RequireAdminProps {
  children: ReactNode;
  authStatus: 'loading' | 'authenticated' | 'unauthenticated';
  appRole: string | undefined;
  onSignOut?: () => void;
}

export function RequireAdmin({ children, authStatus, appRole, onSignOut }: RequireAdminProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [authStatus, pathname, router]);

  if (authStatus === 'loading' || authStatus === 'unauthenticated') {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <p role="status" className="text-sm text-ink-muted">
          {t({ en: 'Verifying session…', vi: 'Đang xác thực phiên…' })}
        </p>
      </main>
    );
  }

  if (appRole !== 'admin') {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-5">
        <section className="flex w-full max-w-md flex-col gap-4">
          <Alert tone="danger" title={t({ en: 'Access denied', vi: 'Không có quyền truy cập' })}>
            {t({ en: 'This page is restricted to administrators only.', vi: 'Trang này chỉ dành cho quản trị viên.' })}
          </Alert>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className={buttonVariants({ variant: 'outline' })}>
              {t({ en: 'Back to home', vi: 'Về trang chủ' })}
            </Link>
            {onSignOut && (
              <Button type="button" variant="ghost" onClick={onSignOut}>
                {t({ en: 'Sign out', vi: 'Đăng xuất' })}
              </Button>
            )}
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
