'use client';

import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { SubjectProvider } from '@scipal/ui';
import { embedUrl } from '@scipal/types';
import { EmbedRenderer } from '@/features/simulations/EmbedRenderer';
import { LAB_SUBJECTS } from './catalog';
import { embedTitle } from './LabEmbeds';

const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** An outside simulation on its own page, under its subject. A link that is not approved shows a notice, never a frame. */
export function LabEmbedView({ link, subject }: { link: string; subject: string }) {
  const { t, lang } = useLanguage();
  const url = embedUrl(link);
  const found = LAB_SUBJECTS.find((s) => s.slug === subject) ?? LAB_SUBJECTS[0]!;

  return (
    <SubjectProvider slug={found.slug}>
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <Link href="/lab" className={`rounded underline-offset-4 hover:text-ink hover:underline ${FOCUS}`}>
            {t({ en: 'Lab', vi: 'Phòng thí nghiệm' })}
          </Link>
          <span aria-hidden="true">/</span>
          <span>{t(found.name)}</span>
        </nav>
        {url ? (
          <>
            <h1 className="mb-4 flex items-center gap-3 text-2xl font-bold text-ink">
              <span aria-hidden="true" className="h-6 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span className="min-w-0 break-words">{embedTitle(url)}</span>
            </h1>
            <EmbedRenderer url={url.href} title={embedTitle(url)} lang={lang === 'en' ? 'en' : 'vi'} />
            <p className="mt-3 flex items-center gap-1 text-sm text-ink-muted">
              <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
              {t({ en: 'An outside simulation from', vi: 'Mô phỏng ngoài từ' })} {url.hostname.replace(/^www\./, '')}
            </p>
          </>
        ) : (
          <p role="note" className="rounded-lg border border-dashed border-line p-6 text-center text-ink-muted">
            {t({ en: 'This link is not allowed to be embedded.', vi: 'Link này không được phép nhúng.' })}
          </p>
        )}
      </main>
    </SubjectProvider>
  );
}
