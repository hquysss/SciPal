'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { useShellDark } from '../../lib/theme/useShellDark';
import { highlight, type CodeLang } from './highlight';
import styles from './CodePanel.module.css';

type Lang = 'vi' | 'en';

export const LANG_LABEL: Record<CodeLang, string> = { python: 'Python', cpp: 'C++', javascript: 'JavaScript', html: 'HTML', css: 'CSS' };

export interface CodePanelProps {
  tabs: { lang: CodeLang; code: string }[];
  /** Controlled tab; leave out to let the panel keep it. */
  tab?: number;
  onTab?: (index: number) => void;
  /** 1-based line of the tab on show that the program is running now; its text lifts and glows. */
  activeLine?: number;
  /** Shown at the end of the running line, e.g. the result of a comparison. */
  lineExtra?: ReactNode;
  lang: Lang;
  /** A copy button in the tab row. */
  copy?: boolean;
  /** Below the code: the variable chips or a screen. */
  children?: ReactNode;
}

/** Dark code panel with syntax colours, line numbers and tabs, shared by lessons and simulations. */
export function CodePanel({ tabs, tab, onTab, activeLine, lineExtra, lang, copy, children }: CodePanelProps) {
  const [own, setOwn] = useState(0);
  const [copied, setCopied] = useState(false);
  const dark = useShellDark();
  const index = Math.min(tab ?? own, tabs.length - 1);
  const current = tabs[index];
  const lines = useMemo(() => (current ? highlight(current.code, current.lang) : []), [current]);
  const vi = lang === 'vi';

  const choose = (i: number) => {
    setOwn(i);
    onTab?.(i);
  };
  const doCopy = () => {
    if (!current) return;
    void navigator.clipboard?.writeText(current.code).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <div className={styles.panel} data-dark={dark}>
      <div className={styles.bar}>
        <div role="tablist" aria-label={vi ? 'Ngôn ngữ mã' : 'Code language'} className={styles.tabs}>
          {tabs.map((t, i) => (
            <button key={`${t.lang}-${i}`} type="button" role="tab" aria-selected={i === index} className={styles.tab} onClick={() => choose(i)}>
              {LANG_LABEL[t.lang]}
            </button>
          ))}
        </div>
        {copy && (
          <button type="button" className={styles.copy} onClick={doCopy}>
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            <span aria-live="polite">{copied ? (vi ? 'Đã chép' : 'Copied') : vi ? 'Chép mã' : 'Copy'}</span>
          </button>
        )}
      </div>
      <div className={styles.src} role="region" aria-label={vi ? 'Mã nguồn' : 'Source code'} tabIndex={0}>
        {lines.map((tokens, i) => {
          const on = activeLine === i + 1;
          return (
            <div key={i} className={styles.ln} data-on={on || undefined} data-dim={activeLine !== undefined && !on ? true : undefined} aria-current={on ? 'step' : undefined}>
              <span className={styles.num} aria-hidden="true">
                {i + 1}
              </span>
              <span className={styles.txt}>
                {tokens.length === 0 ? ' ' : tokens.map((tk, k) => (tk.kind === 'text' ? tk.text : <span key={k} className={styles[tk.kind]}>{tk.text}</span>))}
              </span>
              {on && lineExtra}
            </div>
          );
        })}
      </div>
      {children}
    </div>
  );
}
