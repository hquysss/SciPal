'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-xl border border-line bg-surface p-8">
        <p className="text-sm font-semibold text-ink-muted">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink">
          {t({ en: 'This page does not exist', vi: 'Không có trang này' })}
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          {t({
            en: 'The link may be mistyped or the page has moved. Go back to the home page to pick a subject.',
            vi: 'Đường dẫn có thể gõ sai hoặc trang đã được chuyển. Về trang chủ để chọn môn học.',
          })}
        </p>
        <Link href="/" className={buttonVariants({ className: 'mt-6' })}>
          {t({ en: 'Go to home page', vi: 'Về trang chủ' })}
        </Link>
      </section>
    </main>
  );
}
