import katex from 'katex';
import 'katex/dist/katex.min.css';
import { splitMath } from '@/lib/mathText';

/**
 * Plain text with its formulas typeset. KaTeX's HTML is safe (trust is off); a formula it cannot
 * draw at all shows its source as text, and the author's text is never inserted as HTML.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`whitespace-pre-line [&_.katex]:whitespace-normal [&_.katex-display]:my-2 [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden ${className ?? ''}`}>
      {splitMath(text).map((part, i) => {
        if (part.kind === 'text') return <span key={i}>{part.value}</span>;
        let html: string | null = null;
        try {
          html = katex.renderToString(part.value, { displayMode: part.display, throwOnError: false, strict: 'ignore' });
        } catch {
          html = null;
        }
        if (html === null) return <code key={i}>{part.value}</code>;
        return part.display ? (
          <span key={i} className="block" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <span key={i} dangerouslySetInnerHTML={{ __html: html }} />
        );
      })}
    </span>
  );
}
