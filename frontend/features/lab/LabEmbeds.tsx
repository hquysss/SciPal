'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { embedUrl } from '@scipal/types';
import { BUTTON, FIELD, Field, PRIMARY_BUTTON, SelectField } from '@/features/simulations/controls';
import { EmbedRenderer } from '@/features/simulations/EmbedRenderer';
import { LAB_SUBJECTS, type LabSubject } from './catalog';

const KEY = 'scipal-lab-embeds';
const MAX = 24;

/** An outside simulation filed under the subject it belongs to. */
export interface LabEmbed {
  url: string;
  subject: LabSubject;
}

const isSubject = (value: unknown): value is LabSubject => LAB_SUBJECTS.some((s) => s.slug === value);

/** The subject a link most likely belongs to, for links saved before subjects existed. */
const guessSubject = (url: URL): LabSubject => (url.hostname === 'phet.colorado.edu' ? 'physics' : 'math');

/** What a link points at, as a short title: the site and the sim's name in its address. */
export function embedTitle(url: URL): string {
  const last = url.pathname.split('/').filter(Boolean).pop() ?? url.hostname;
  return `${url.hostname.replace(/^www\./, '')} · ${decodeURIComponent(last).replace(/[-_]/g, ' ').replace(/\.html?$/, '')}`;
}

/** The saved embeds that are still approved; anything else (edited storage, a removed site) is dropped. */
export function readEmbeds(raw: string | null): LabEmbed[] {
  let list: unknown;
  try {
    list = JSON.parse(raw ?? '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];
  const out: LabEmbed[] = [];
  for (const entry of list) {
    // The first version stored bare links.
    const url = typeof entry === 'string' ? entry : (entry as { url?: unknown } | null)?.url;
    const parsed = typeof url === 'string' ? embedUrl(url) : null;
    if (!parsed || out.some((e) => e.url === parsed.href)) continue;
    const stored = typeof entry === 'object' && entry ? (entry as { subject?: unknown }).subject : undefined;
    out.push({ url: parsed.href, subject: isSubject(stored) ? stored : guessSubject(parsed) });
  }
  return out.slice(0, MAX);
}

/** The embeds saved in this browser, and how to add or remove one. */
export function useLabEmbeds() {
  const [embeds, setEmbeds] = useState<LabEmbed[]>([]);
  useEffect(() => {
    try {
      setEmbeds(readEmbeds(localStorage.getItem(KEY)));
    } catch {
      // Storage blocked: the list simply starts empty.
    }
  }, []);
  const save = (next: LabEmbed[]) => {
    setEmbeds(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // Not saved, but it still shows for this visit.
    }
  };
  return {
    embeds,
    /** False when the link is not an approved one. */
    add(link: string, subject: LabSubject): boolean {
      const url = embedUrl(link.trim());
      if (!url) return false;
      if (!embeds.some((e) => e.url === url.href) && embeds.length < MAX) save([{ url: url.href, subject }, ...embeds]);
      return true;
    },
    remove: (url: string) => save(embeds.filter((e) => e.url !== url)),
  };
}

/** Add an outside simulation (PhET, GeoGebra, Desmos) by its link, into the subject chosen. */
export function AddEmbedForm({ onAdd, defaultSubject }: { onAdd: (link: string, subject: LabSubject) => boolean; defaultSubject: LabSubject }) {
  const { t } = useLanguage();
  const [text, setText] = useState('');
  const [subject, setSubject] = useState<LabSubject>(defaultSubject);
  const [error, setError] = useState(false);

  // The subject follows the filter above, so adding from the Physics view files it under Physics.
  useEffect(() => setSubject(defaultSubject), [defaultSubject]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (onAdd(text, subject)) {
      setError(false);
      setText('');
    } else setError(true);
  };

  return (
    <details className="mb-8 rounded-lg border border-line bg-surface p-4 open:pb-5">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md font-semibold text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        <Plus aria-hidden="true" className="h-4 w-4" />
        {t({ en: 'Add an outside simulation to a subject', vi: 'Thêm mô phỏng ngoài vào một môn' })}
      </summary>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        {t({
          en: 'Paste the link of a PhET, GeoGebra or Desmos simulation. It appears with that subject’s other simulations and stays in this browser.',
          vi: 'Dán link mô phỏng PhET, GeoGebra hoặc Desmos. Nó hiện cùng các mô phỏng khác của môn đã chọn và được lưu trong trình duyệt này.',
        })}
      </p>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto] sm:items-end">
        <SelectField label={t({ en: 'Subject', vi: 'Môn' })} value={subject} options={LAB_SUBJECTS.map((s) => ({ value: s.slug, label: t(s.name) }))} onChange={setSubject} />
        <Field
          label={t({ en: 'Link', vi: 'Đường dẫn' })}
          error={error ? t({ en: 'Only phet.colorado.edu/sims/html/…, geogebra.org/m/… and desmos.com/calculator/… links work.', vi: 'Chỉ nhận link dạng phet.colorado.edu/sims/html/…, geogebra.org/m/… và desmos.com/calculator/….' }) : undefined}
        >
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
        <button type="submit" disabled={!text.trim()} className={PRIMARY_BUTTON}>
          <Plus aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Add', vi: 'Thêm' })}
        </button>
      </form>
    </details>
  );
}

/** The outside simulations of one subject, shown under its own. */
export function SubjectEmbeds({ embeds, onRemove }: { embeds: LabEmbed[]; onRemove: (url: string) => void }) {
  const { t, lang } = useLanguage();
  if (embeds.length === 0) return null;
  return (
    <ul className="mt-6 grid gap-6 lg:grid-cols-2">
      {embeds.map(({ url }) => {
        const title = embedTitle(new URL(url));
        return (
          <li key={url} className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate font-semibold text-ink">{title}</h3>
              <button type="button" className={BUTTON} onClick={() => onRemove(url)} aria-label={`${t({ en: 'Remove', vi: 'Bỏ' })}: ${title}`}>
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <EmbedRenderer url={url} title={title} lang={lang === 'en' ? 'en' : 'vi'} />
          </li>
        );
      })}
    </ul>
  );
}
