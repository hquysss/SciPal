'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export interface BreadcrumbItem {
  href?: string;
  label: { en: string; vi: string } | string;
}

/** Bilingual breadcrumb for server pages; the last item is the current page. */
export function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const { t } = useLanguage();
  const text = (label: BreadcrumbItem['label']) => (typeof label === 'string' ? label : t(label));
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={index} className="flex min-w-0 items-center gap-2">
              {last || !item.href ? (
                <span aria-current={last ? 'page' : undefined} className="max-w-[18rem] truncate font-semibold text-ink">
                  {text(item.label)}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    {text(item.label)}
                  </Link>
                  <span aria-hidden="true" className="text-ink-muted">/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
