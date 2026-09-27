'use client';

import { useEffect, useId, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import { Input } from '@/components/ui/input';
import { useRefRow } from '@/components/blocks/useRefRow';
import { LABEL, SMALL_BUTTON } from './styles';

type Kind = 'term' | 'resource';
type Bilingual = { en: string; vi: string };
interface Option {
  id: string;
  label: Bilingual;
}

const SOURCE = {
  term: { table: 'terms', vi: 'term_vi', en: 'term_en' },
  resource: { table: 'resources', vi: 'title_vi', en: 'title_en' },
} as const;

/** PostgREST filter text: drop the characters that change the `or=(…)` grammar or act as wildcards. */
export function searchPattern(query: string): string {
  return `%${query.replace(/[%_,()\\*]/g, ' ').trim()}%`;
}

/** Find a glossary term or a resource of this subject by name. */
export function RefPicker({
  kind,
  subjectId,
  selectedId,
  onPick,
}: {
  kind: Kind;
  subjectId: string;
  selectedId?: string;
  onPick: (id: string, label: Bilingual) => void;
}) {
  const { t, lang } = useLanguage();
  const id = useId();
  const source = SOURCE[kind];
  const [changing, setChanging] = useState(!selectedId);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [searching, setSearching] = useState(false);
  const selected = useRefRow<Record<string, string>>(source.table, `${source.vi}, ${source.en}`, selectedId ?? '');

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    let live = true;
    const timer = setTimeout(async () => {
      setSearching(true);
      const pattern = searchPattern(q);
      const { data } = await createBrowserClient()
        .from(source.table)
        .select(`id, ${source.vi}, ${source.en}`)
        .eq('subject_id', subjectId)
        .or(`${source.vi}.ilike.${pattern},${source.en}.ilike.${pattern}`)
        .limit(10);
      if (!live) return;
      setSearching(false);
      const rows = (data ?? []) as unknown as Array<Record<string, string>>;
      setOptions(rows.map((row) => ({ id: row.id!, label: { vi: row[source.vi] ?? '', en: row[source.en] ?? '' } })));
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, subjectId, source]);

  const noun = kind === 'term' ? t({ en: 'glossary term', vi: 'thuật ngữ' }) : t({ en: 'resource', vi: 'tài nguyên' });

  if (selectedId && !changing) {
    const name = selected ? (lang === 'en' ? selected[source.en] : selected[source.vi]) : t({ en: 'Loading…', vi: 'Đang tải…' });
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface-sunken p-3">
        <span className="text-sm text-ink">
          <span className="text-ink-muted">{kind === 'term' ? t({ en: 'Term', vi: 'Thuật ngữ' }) : t({ en: 'Resource', vi: 'Tài nguyên' })}: </span>
          <span className="font-semibold">{name}</span>
        </span>
        <button type="button" onClick={() => setChanging(true)} className={SMALL_BUTTON}>
          {t({ en: 'Change', vi: 'Đổi' })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {t({ en: `Find a ${noun} by name`, vi: `Tìm ${noun} theo tên` })}
      </label>
      <Input
        id={id}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        role="combobox"
        aria-expanded={options.length > 0}
        aria-controls={`${id}-list`}
        autoComplete="off"
        placeholder={t({ en: 'At least 2 letters', vi: 'Gõ ít nhất 2 chữ' })}
      />
      {options.length > 0 ? (
        <ul id={`${id}-list`} role="listbox" className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface">
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === selectedId}>
              <button
                type="button"
                onClick={() => {
                  onPick(option.id, option.label);
                  setChanging(false);
                  setQuery('');
                }}
                className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-1.5 text-left text-sm hover:bg-surface-sunken"
              >
                <span className="font-semibold text-ink">{option.label.vi}</span>
                {option.label.en && <span className="text-ink-muted">{option.label.en}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        query.trim().length >= 2 &&
        !searching && <p className="text-sm text-ink-muted">{t({ en: 'Nothing found in this subject.', vi: 'Không tìm thấy trong môn này.' })}</p>
      )}
    </div>
  );
}
