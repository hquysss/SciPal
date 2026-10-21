import { isValidElement, useState, type ReactNode } from 'react';
import { useLanguage } from '@scipal/hooks';
import { sendProblemReport } from '@/features/problemReports/problemReportsApi';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import type { TutorMessage as Message } from './api';
import styles from './tutor.module.css';

// The tutor's answers are written on the page like a teacher's note, not boxed in a bubble;
// the student's own questions sit in a bubble on the right, as plain text.
// react-markdown escapes raw HTML (no rehype-raw) and its default urlTransform drops
// `javascript:` links; KaTeX's `trust` stays off, as in TheoryRenderer.

const components: Components = {
  p: ({ children }) => <p className="my-3 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  h1: ({ children }) => <p className="mt-4 font-bold text-ink">{children}</p>,
  h2: ({ children }) => <p className="mt-4 font-bold text-ink">{children}</p>,
  h3: ({ children }) => <p className="mt-4 font-semibold text-ink">{children}</p>,
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
  blockquote: ({ children }) => <blockquote className="my-3 border-l-2 border-line pl-3 text-ink-muted">{children}</blockquote>,
  // Inline code only: fenced blocks are unwrapped by `pre` below.
  code: ({ children }) => <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>,
  pre: ({ children }) => {
    const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : null;
    return (
      <pre className="my-3 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-3 font-mono text-sm leading-6">
        <code className={code?.className}>{code ? code.children : children}</code>
      </pre>
    );
  },
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-line">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line bg-surface-sunken px-3 py-2 font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2">{children}</td>,
};

const REMARK = [remarkGfm, remarkMath];
const REHYPE: NonNullable<Parameters<typeof ReactMarkdown>[0]['rehypePlugins']> = [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]];

/** Lets a student flag an answer that looks wrong; it goes to the admins' problem reports as "wrong content". */
function ReportWrongAnswer({ content }: { content: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const report = async () => {
    setState('sending');
    const result = await sendProblemReport({
      category: 'content',
      message: `[Giáo sư AI] Câu trả lời bị báo sai:
${content.slice(0, 1500)}`,
      page_url: window.location.href,
    });
    setState(result.ok ? 'sent' : 'failed');
  };
  if (state === 'sent') return <p role="status" className="mt-2 text-sm text-ink-muted">{t({ vi: 'Đã gửi báo cáo, cảm ơn bạn.', en: 'Report sent, thank you.' })}</p>;
  return (
    <button
      type="button"
      onClick={() => void report()}
      disabled={state === 'sending'}
      className="mt-2 text-sm text-ink-muted underline underline-offset-4 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:opacity-60"
    >
      {state === 'failed' ? t({ vi: 'Chưa gửi được, thử lại', en: 'Could not send, try again' }) : t({ vi: 'Báo câu trả lời sai', en: 'Report wrong answer' })}
    </button>
  );
}

export function TutorMessage({ message, streaming = false }: { message: Message; streaming?: boolean }) {
  if (message.role === 'user') {
    return (
      <p className={`${styles.question} whitespace-pre-wrap break-words text-base leading-relaxed`}>
        {message.content}
      </p>
    );
  }
  return (
    <div className="min-w-0 max-w-[70ch] break-words text-base leading-relaxed text-ink [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-1">
      <ReactMarkdown remarkPlugins={REMARK} rehypePlugins={REHYPE} components={components}>
        {message.content}
      </ReactMarkdown>
      {!streaming && message.content.trim().length >= 10 && <ReportWrongAnswer content={message.content} />}
      {streaming && <span aria-hidden="true" className="tutor-caret ml-0.5 inline-block h-[1.1em] w-[0.5ch] translate-y-[0.2em] bg-action motion-safe:animate-pulse" />}
    </div>
  );
}
