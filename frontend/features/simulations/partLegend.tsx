'use client';

import { useState, type ReactNode } from 'react';
import { Info, X } from 'lucide-react';
import { pick, type Bilingual, type Lang } from './types';

export type LegendItem = { readonly key: string; readonly icon: ReactNode; readonly name: Bilingual; readonly about: Bilingual };

/** What each thing in the 3D view stands for: a row of icon chips, and the one picked explained. */
export function PartLegend({ items, lang }: { readonly items: readonly LegendItem[]; readonly lang: Lang }) {
  const t = pick(lang);
  const [open, setOpen] = useState<string | null>(null);
  const shown = items.find((i) => i.key === open);
  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t({ vi: 'Chú thích', en: 'Key' })} className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted"><Info aria-hidden="true" className="h-3.5 w-3.5" />{t({ vi: 'Chú thích:', en: 'Key:' })}</span>
        {items.map((i) => (
          <button
            key={i.key}
            type="button"
            aria-pressed={open === i.key}
            onClick={() => setOpen(open === i.key ? null : i.key)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-xs font-semibold text-ink hover:bg-surface-sunken aria-pressed:border-ink aria-pressed:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            {i.icon}
            {t(i.name)}
          </button>
        ))}
      </div>
      {shown && (
        <div aria-live="polite" className="flex items-start gap-2 rounded-md border border-line bg-surface-sunken p-3 text-sm text-ink">
          <span className="mt-0.5 shrink-0">{shown.icon}</span>
          <p className="min-w-0 flex-1"><span className="font-semibold">{t(shown.name)}.</span> {t(shown.about)}</p>
          <button type="button" aria-label={t({ vi: 'Đóng', en: 'Close' })} onClick={() => setOpen(null)} className="-m-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
