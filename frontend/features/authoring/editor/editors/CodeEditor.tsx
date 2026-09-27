'use client';

import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { CodeBlock } from '@scipal/types';
import { SMALL_BUTTON, TEXTAREA } from './styles';

type CodeLang = CodeBlock['tabs'][number]['lang'];
const LANG_NAME: Record<CodeLang, string> = { python: 'Python', cpp: 'C++', javascript: 'JavaScript' };
const ALL_LANGS: CodeLang[] = ['python', 'cpp', 'javascript'];

export function CodeEditor({ block, onChange }: { block: CodeBlock; onChange: (block: CodeBlock) => void }) {
  const { t } = useLanguage();
  const [active, setActive] = useState(0);
  const index = Math.min(active, block.tabs.length - 1);
  const tab = block.tabs[index]!;
  const unused = ALL_LANGS.filter((l) => !block.tabs.some((x) => x.lang === l));

  const setCode = (code: string) => onChange({ ...block, tabs: block.tabs.map((x, i) => (i === index ? { ...x, code } : x)) });

  // Tab indents inside the editor; Shift+Tab keeps its usual job so keyboard users can leave.
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Tab' || event.shiftKey) return;
    event.preventDefault();
    const area = event.currentTarget;
    const { selectionStart: start, selectionEnd: end } = area;
    setCode(area.value.slice(0, start) + '    ' + area.value.slice(end));
    requestAnimationFrame(() => area.setSelectionRange(start + 4, start + 4));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
        <div role="tablist" aria-label={t({ en: 'Languages', vi: 'Ngôn ngữ lập trình' })} className="flex flex-wrap items-center gap-1">
          {block.tabs.map((x, i) => (
            <button
              key={x.lang}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setActive(i)}
              className={`min-h-9 rounded-md px-3 text-sm font-semibold ${i === index ? 'bg-surface-sunken text-ink' : 'text-ink-muted hover:text-ink'}`}
            >
              {LANG_NAME[x.lang]}
            </button>
          ))}
        </div>
        {block.tabs.length > 1 && (
          <button
            type="button"
            aria-label={t({ en: `Remove ${LANG_NAME[tab.lang]}`, vi: `Bỏ ${LANG_NAME[tab.lang]}` })}
            onClick={() => {
              onChange({ ...block, tabs: block.tabs.filter((_, j) => j !== index) });
              setActive(0);
            }}
            className={SMALL_BUTTON}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            {t({ en: 'Remove', vi: 'Bỏ' })}
          </button>
        )}
        {unused.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              onChange({ ...block, tabs: [...block.tabs, { lang: l, code: '' }] });
              setActive(block.tabs.length);
            }}
            className={SMALL_BUTTON}
          >
            + {LANG_NAME[l]}
          </button>
        ))}
      </div>
      <textarea
        rows={10}
        spellCheck={false}
        value={tab.code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label={t({ en: `${LANG_NAME[tab.lang]} code`, vi: `Mã ${LANG_NAME[tab.lang]}` })}
        className={`${TEXTAREA} font-mono text-sm`}
      />
    </div>
  );
}
