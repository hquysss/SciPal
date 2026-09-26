import katex from 'katex';
import 'katex/dist/katex.min.css';
import type { FormulaBlock } from '@scipal/types';

export function FormulaRenderer({ block, lang }: { block: FormulaBlock; lang: 'en' | 'vi' }) {
  let html = '';
  try {
    html = katex.renderToString(block.katex, { displayMode: true, throwOnError: false });
  } catch {
    html = block.katex;
  }

  return (
    <div className="rounded-lg border border-line bg-surface-sunken p-4 text-center text-ink">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {block.caption && (
        <p className="mt-2 text-sm text-ink-muted">
          {lang === 'en' ? block.caption.en : block.caption.vi}
        </p>
      )}
    </div>
  );
}
