'use client';
import { useLanguage } from '@scipal/hooks';
import type { CodeBlock } from '@scipal/types';
import { CodePanel } from '../code/CodePanel';

export function CodeRenderer({ block }: { block: CodeBlock }) {
  const { lang } = useLanguage();
  return <CodePanel tabs={block.tabs} lang={lang} copy />;
}
