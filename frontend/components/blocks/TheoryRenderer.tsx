import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TheoryBlock } from '@scipal/types';
import styles from './notebook.module.css';

const components: Components = {
  h1: ({ children }) => <h2 className="text-2xl font-bold leading-[3.5rem] text-ink">{children}</h2>,
  h2: ({ children }) => <h2 className="text-xl font-bold leading-[3.5rem] text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold leading-7 text-ink">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold leading-7 text-ink">{children}</h4>,
  p: ({ children }) => <p className="mb-7 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-7 list-disc pl-6 leading-7 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-7 list-decimal pl-6 leading-7 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-action underline underline-offset-4 hover:text-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-7 border-l-4 border-line bg-surface pl-4 italic text-ink-muted last:mb-0">{children}</blockquote>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={`${className} font-mono text-sm`}>{children}</code>
    ) : (
      <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-7 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-4 leading-7 last:mb-0">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-7 overflow-x-auto rounded-lg border border-line bg-surface last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line bg-surface-sunken px-3 py-2 font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2">{children}</td>,
  hr: () => <hr className="my-7 border-line" />,
};

export function TheoryRenderer({ block, lang }: { block: TheoryBlock; lang: 'en' | 'vi' }) {
  const text = lang === 'en' ? block.content.en : block.content.vi;
  return (
    <div className={`${styles.rules} text-base text-ink`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
