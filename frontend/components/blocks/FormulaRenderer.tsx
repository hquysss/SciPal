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
    <div className="my-6 rounded-xl bg-gray-50 border border-gray-100 p-4 text-center">
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {block.caption && (
        <p className="mt-2 text-sm text-gray-500 font-medium">
          {lang === 'en' ? block.caption.en : block.caption.vi}
        </p>
      )}
    </div>
  );
}
