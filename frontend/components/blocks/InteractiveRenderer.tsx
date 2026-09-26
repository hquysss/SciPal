'use client';
import type { InteractiveBlock } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';

export function InteractiveRenderer({ block }: { block: InteractiveBlock }) {
  const { lang } = useLanguage();

  if (!block.offline && typeof window !== 'undefined' && !navigator.onLine) {
    return (
      <div role="note" className="rounded-lg border border-dashed border-edge bg-surface p-6 text-center text-sm text-ink-muted">
        {lang === 'en' ? 'Requires internet connection' : 'Cần kết nối mạng để sử dụng mô phỏng'}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <p className="mb-1 font-semibold text-ink">
        {lang === 'en' ? block.heading.en : block.heading.vi}
      </p>
      {block.caption && (
        <p className="mb-4 text-sm text-ink-muted">
          {lang === 'en' ? block.caption.en : block.caption.vi}
        </p>
      )}
      <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg bg-surface-sunken text-sm text-ink-muted">
        <p>
          {lang === 'en' ? 'Interactive widget available in practice mode' : 'Mô phỏng tương tác sẵn sàng trong chế độ luyện tập'}
        </p>
      </div>
    </div>
  );
}
