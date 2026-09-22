import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TheoryBlock } from '@scipal/types';

export function TheoryRenderer({ block, lang }: { block: TheoryBlock; lang: 'en' | 'vi' }) {
  const text = lang === 'en' ? block.content.en : block.content.vi;
  return (
    <div className="prose prose-gray max-w-none text-gray-800 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
