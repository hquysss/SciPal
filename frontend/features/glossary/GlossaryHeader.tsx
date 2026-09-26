'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export function GlossaryHeader() {
  const { t } = useLanguage();
  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/"
          className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ en: 'Home', vi: 'Trang chủ' })}
        </Link>
      </nav>
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t({ en: 'Glossary', vi: 'Từ điển thuật ngữ' })}</h1>
      <p className="mt-2 max-w-prose text-base text-ink-muted">
        {t({
          en: 'Look up English–Vietnamese definitions and how each term is used in lessons.',
          vi: 'Tra định nghĩa Anh – Việt và cách dùng từng thuật ngữ trong bài học.',
        })}
      </p>
    </header>
  );
}
