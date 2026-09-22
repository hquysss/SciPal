'use client';
import type { InteractiveBlock } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';

export function InteractiveRenderer({ block }: { block: InteractiveBlock }) {
  const { lang } = useLanguage();

  if (!block.offline && typeof window !== 'undefined' && !navigator.onLine) {
    return (
      <div className="my-4 rounded-xl border-2 border-dashed border-gray-200 p-8 text-center text-gray-400">
        🔌 {lang === 'en' ? 'Requires internet connection' : 'Cần kết nối mạng để sử dụng mô phỏng'}
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border-2 p-5 bg-white shadow-sm" style={{ borderColor: 'var(--accent, #16a34a)' }}>
      <p className="font-semibold text-gray-800 mb-1">
        {lang === 'en' ? block.heading.en : block.heading.vi}
      </p>
      {block.caption && (
        <p className="text-sm text-gray-500 mb-4">
          {lang === 'en' ? block.caption.en : block.caption.vi}
        </p>
      )}
      <div className="h-44 flex flex-col items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-500 text-sm gap-2">
        <span className="text-2xl" aria-hidden="true">⚙️</span>
        <span className="font-mono text-xs font-semibold uppercase tracking-wider text-gray-400">
          [{block.kind} simulation]
        </span>
        <p className="text-xs text-gray-400">
          {lang === 'en' ? 'Interactive widget available in practice mode' : 'Mô phỏng tương tác sẵn sàng trong chế độ luyện tập'}
        </p>
      </div>
    </div>
  );
}
