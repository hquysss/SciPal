'use client';

import { useLanguage } from '@scipal/hooks';
import { ChatPane } from './ChatPane';

/** The one room everyone shares, whatever subject they study. */
export function CommunityRoom() {
  const { t } = useLanguage();
  return (
    <ChatPane
      target={{ community: true }}
      title={t({ en: 'Community', vi: 'Cộng đồng' })}
      subtitle={t({ en: 'Everyone on SciPal, all subjects', vi: 'Mọi người trên SciPal, mọi môn học' })}
    />
  );
}
