'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';

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
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-gradient-to-br from-emerald-950 to-emerald-900">
        <p className="animate-pulse text-sm text-emerald-300">
          {t({ en: 'Verifying session…', vi: 'Đang xác thực phiên…' })}
        </p>
      </main>
    );
  }

  if (appRole !== 'admin') {
    return (
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center bg-science-grid px-5">
        <section className="w-full max-w-md rounded-3xl border border-red-200/30 bg-white/90 p-8 text-center shadow-2xl dark:bg-card/90">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-red-100 text-2xl dark:bg-red-950/40" aria-hidden="true">
            🔒
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {t({ en: 'Access Denied', vi: 'Không có quyền truy cập' })}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {t({ en: 'This page is restricted to administrators only.', vi: 'Trang này chỉ dành cho quản trị viên.' })}
          </p>
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              className="mt-6 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700 dark:bg-white dark:text-gray-900"
            >
              {t({ en: 'Sign Out', vi: 'Đăng xuất' })}
            </button>
          )}
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
