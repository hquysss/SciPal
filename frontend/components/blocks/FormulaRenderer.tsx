import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { FormulaBlock } from '@scipal/types';

export function FormulaRenderer({ block, lang }: { block: FormulaBlock; lang: 'en' | 'vi' }) {
  // KaTeX's own HTML is safe (trust is off). When it cannot draw the formula at all (it still
  // throws on some input, e.g. very deep nesting, despite throwOnError: false) the source is
  // shown as plain text: the author's string is never inserted as HTML.
  let html: string | null = null;
  try {
    html = katex.renderToString(block.katex, { displayMode: true, throwOnError: false });
  } catch {
    html = null;
  }

  return (
    <div className="rounded-lg border border-line bg-surface-sunken p-4 text-center text-ink">
      {html === null ? (
        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-sm">{block.katex}</pre>
      ) : (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      {block.caption && (
        <p className="mt-2 text-sm text-ink-muted">
          {lang === 'en' ? block.caption.en : block.caption.vi}
        </p>
      )}
    </div>
  );
}
