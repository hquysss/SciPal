'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { embedUrl } from '@scipal/types';
import { Field, FIELD, PRIMARY_BUTTON, BUTTON } from '@/features/simulations/controls';
import { EmbedRenderer } from '@/features/simulations/EmbedRenderer';

const KEY = 'scipal-lab-embeds';
const MAX = 12;

/** What a link points at, as a short title: the sim's name in its address. */
export function embedTitle(url: URL): string {
  const last = url.pathname.split('/').filter(Boolean).pop() ?? url.hostname;
  return `${url.hostname.replace(/^www\./, '')} · ${decodeURIComponent(last).replace(/[-_]/g, ' ').replace(/\.html?$/, '')}`;
}

/** The saved links that are still approved; anything else (edited storage, a removed site) is dropped. */
export function readEmbeds(raw: string | null): string[] {
  try {
    const list: unknown = JSON.parse(raw ?? '[]');
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string' && embedUrl(v) !== null).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/**
 * Add an outside simulation (PhET, GeoGebra, Desmos) by its link. Only those sites are accepted
 * (the same check as a lesson's embed block); the list stays in this browser.
 */
export function LabEmbeds() {
  const { t, lang } = useLanguage();
  const [links, setLinks] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    try {
      setLinks(readEmbeds(localStorage.getItem(KEY)));
    } catch {
      // Storage blocked: the list simply starts empty.
    }
  }, []);

  const save = (next: string[]) => {
    setLinks(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not saved, but it still shows for this visit.
    }
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    const url = embedUrl(text.trim());
    if (!url) return setError(true);
    setError(false);
    if (!links.includes(url.href) && links.length < MAX) save([url.href, ...links]);
    setText('');
  };

  return (
    <section aria-labelledby="lab-embeds" className="mt-12 border-t border-line pt-8">
      <h2 id="lab-embeds" className="text-xl font-bold text-ink">
        {t({ en: 'Add an outside simulation', vi: 'Nhúng mô phỏng ngoài' })}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-ink-muted">
        {t({
          en: 'Paste the link of a PhET, GeoGebra or Desmos simulation to open it here. It stays in this browser.',
          vi: 'Dán link mô phỏng PhET, GeoGebra hoặc Desmos để mở ngay tại đây. Danh sách được lưu trong trình duyệt này.',
        })}
      </p>
      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label={t({ en: 'Link', vi: 'Đường dẫn' })} error={error ? t({ en: 'Only phet.colorado.edu/sims/html/…, geogebra.org/m/… and desmos.com/calculator/… links work.', vi: 'Chỉ nhận link dạng phet.colorado.edu/sims/html/…, geogebra.org/m/… và desmos.com/calculator/….' }) : undefined}>
            {(id) => (
              <input
                id={id}
                type="url"
                inputMode="url"
                value={text}
                aria-invalid={error || undefined}
                placeholder="https://phet.colorado.edu/sims/html/…"
                onChange={(e) => {
                  setText(e.target.value);
                  setError(false);
                }}
                className={FIELD}
              />
            )}
          </Field>
        </div>
        <button type="submit" disabled={!text.trim()} className={PRIMARY_BUTTON}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add', vi: 'Thêm' })}
        </button>
      </form>

      {links.length > 0 && (
        <ul className="mt-6 grid gap-6 lg:grid-cols-2">
          {links.map((href) => {
            const title = embedTitle(new URL(href));
            return (
              <li key={href} className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="min-w-0 truncate font-semibold text-ink">{title}</h3>
                  <button type="button" className={BUTTON} onClick={() => save(links.filter((l) => l !== href))} aria-label={`${t({ en: 'Remove', vi: 'Bỏ' })}: ${title}`}>
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
                <EmbedRenderer url={href} title={title} lang={lang === 'en' ? 'en' : 'vi'} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
