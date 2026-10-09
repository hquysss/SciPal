'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const pickerRef = useRef<HTMLDivElement>(null);
  const selected = useRefRow<Record<string, string>>(source.table, `${source.vi}, ${source.en}`, selectedId ?? '');
  const listId = `${id}-list`;
  const isOpen = open && query.trim().length >= 2;
  const activeOption = options[activeIndex];

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setOptions([]);
      setSearching(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    let live = true;
    setSearching(true);
    const timer = setTimeout(async () => {
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
      setActiveIndex(-1);
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, subjectId, source]);

  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, [isOpen]);

  const choose = (option: Option) => {
    onPick(option.id, option.label);
    setChanging(false);
    setQuery('');
    setOptions([]);
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index < 0 || index === options.length - 1 ? 0 : index + 1));
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (index <= 0 ? options.length - 1 : index - 1));
    } else if (event.key === 'Enter' && isOpen && activeOption) {
      event.preventDefault();
      choose(activeOption);
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    } else if (event.key === 'Tab' && isOpen) {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

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
    <div ref={pickerRef} className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {t({ en: `Find a ${noun} by name`, vi: `Tìm ${noun} theo tên` })}
      </label>
      <Input
        id={id}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(event.target.value.trim().length >= 2);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onClick={() => { if (options.length > 0 && query.trim().length >= 2) setOpen(true); }}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder={t({ en: 'At least 2 letters', vi: 'Gõ ít nhất 2 chữ' })}
      />
      <ul id={listId} role="listbox" hidden={!isOpen} aria-busy={searching} className="flex max-h-60 flex-col overflow-y-auto rounded-lg border border-line bg-surface">
        {options.map((option, index) => (
          <li
            id={`${id}-option-${index}`}
            key={option.id}
            role="option"
            aria-selected={activeIndex === index}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => choose(option)}
            className={`flex min-h-11 cursor-pointer flex-col items-start justify-center px-3 py-1.5 text-left text-sm hover:bg-surface-sunken ${activeIndex === index ? 'bg-surface-sunken' : ''}`}
          >
            <span className="font-semibold text-ink">{option.label.vi}</span>
            {option.label.en && <span className="text-ink-muted">{option.label.en}</span>}
          </li>
        ))}
      </ul>
      {isOpen && searching && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Searching…', vi: 'Đang tìm…' })}</p>}
      {isOpen && !searching && options.length === 0 && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Nothing found in this subject.', vi: 'Không tìm thấy trong môn này.' })}</p>}
    </div>
  );
}
