'use client';

import { useMemo, type KeyboardEvent } from 'react';
import { highlight } from '@/components/code/highlight';
import { useShellDark } from '../../lib/theme/useShellDark';
import type { CodeLanguage } from '@scipal/types';
import styles from './codeEditor.module.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  label: string;
  /** The id of the text that says Tab inserts spaces and Escape leaves the box. */
  describedBy?: string;
}

/** A code box with syntax colours: a transparent textarea laid over the same text coloured by `highlight`. */
export function CodeEditor({ value, onChange, language, label, describedBy }: CodeEditorProps) {
  const dark = useShellDark();
  // A trailing newline would collapse in the coloured copy and push the last line out of step with the caret.
  const lines = useMemo(() => highlight(`${value}\n`, language), [value, language]);

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = event.currentTarget;
    if (event.key === 'Escape') {
      el.blur();
      return;
    }
    if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
    event.preventDefault();
    const { selectionStart: start, selectionEnd: end } = el;
    onChange(`${value.slice(0, start)}    ${value.slice(end)}`);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + 4;
    });
  };

  return (
    <div className={styles.box} data-dark={dark}>
      <div className={styles.scroll}>
        <div className={styles.gutter} aria-hidden="true">
          {lines.slice(1).map((_, i) => `${i + 1}\n`).join('')}
        </div>
        <div className={styles.code}>
          <pre className={styles.shown} aria-hidden="true">
            {lines.map((tokens, i) => (
              <span key={i}>
                {tokens.map((tk, k) => (tk.kind === 'text' ? tk.text : <span key={k} className={styles[tk.kind]}>{tk.text}</span>))}
                {'\n'}
              </span>
            ))}
          </pre>
          <textarea
            className={styles.input}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            aria-label={label}
            aria-describedby={describedBy}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            wrap="off"
          />
        </div>
      </div>
    </div>
  );
}
