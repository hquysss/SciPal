'use client';

import { useLanguage } from '@scipal/hooks';

export function ReviewHeader() {
  const { t } = useLanguage();
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-3xl font-bold text-ink">{t({ en: 'Review words', vi: 'Ôn từ' })}</h1>
      <p className="text-ink-muted">
        {t({ en: 'Words from your list that are due. Each one you remember earns 2 XP.', vi: 'Các từ trong sổ đã đến hạn ôn. Mỗi từ bạn nhớ được +2 XP.' })}
      </p>
    </header>
  );
}
