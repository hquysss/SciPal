'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@scipal/hooks';
import type { CodeBlock } from '@scipal/types';
import { useShellDark } from '../../lib/theme/useShellDark';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center bg-surface-sunken text-sm text-ink-muted">
      Đang tải mã nguồn… / Loading code…
    </div>
  ),
});

export function CodeRenderer({ block }: { block: CodeBlock }) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(0);
  const tab = block.tabs[activeTab];
  const dark = useShellDark();

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div role="tablist" aria-label={t({ en: 'Code language', vi: 'Ngôn ngữ mã' })} className="flex border-b border-line bg-surface-sunken">
        {block.tabs.map((codeTab, i) => (
          <button
            key={codeTab.lang}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            onClick={() => setActiveTab(i)}
            className={`min-h-11 px-4 font-mono text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
              i === activeTab ? 'border-b-2 border-accent bg-surface text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {codeTab.lang}
          </button>
        ))}
      </div>
      <MonacoEditor
        height="280px"
        language={tab?.lang ?? 'plaintext'}
        value={tab?.code ?? ''}
        theme={dark ? 'vs-dark' : 'light'}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
