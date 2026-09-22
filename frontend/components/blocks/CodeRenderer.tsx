'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { CodeBlock } from '@scipal/types';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[280px] flex items-center justify-center bg-gray-50 text-xs text-gray-400 font-mono">
      Đang tải trình xem mã nguồn...
    </div>
  ),
});

export function CodeRenderer({ block }: { block: CodeBlock }) {
  const [activeTab, setActiveTab] = useState(0);
  const tab = block.tabs[activeTab];

  return (
    <div className="my-4 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex gap-0 border-b border-gray-200 bg-gray-50">
        {block.tabs.map((t, i) => (
          <button
            key={t.lang}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 text-xs font-mono font-semibold transition ${
              i === activeTab
                ? 'bg-white text-gray-900 border-b-2'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ borderBottomColor: i === activeTab ? 'var(--accent, #16a34a)' : undefined }}
          >
            {t.lang}
          </button>
        ))}
      </div>
      <MonacoEditor
        height="280px"
        language={tab?.lang ?? 'plaintext'}
        value={tab?.code ?? ''}
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
