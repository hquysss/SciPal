'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { FriendsTab } from '../friends/FriendsTab';
import { ClassesTab } from './ClassesTab';
import { CommunityRoom } from './CommunityRoom';

type Tab = 'community' | 'classes' | 'friends';

/** Two tabs, kept in the URL (`?tab=friends&dm=<friendship id>`, `?tab=classes&class=<class id>`) so a chat can be linked and survives a reload. */
export function CommunityPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = requested === 'friends' || requested === 'classes' ? requested : 'community';
  const dm = tab === 'friends' ? params.get('dm') : null;
  const classId = tab === 'classes' ? params.get('class') : null;

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'community', label: t({ en: 'Community', vi: 'Cộng đồng' }) },
    { id: 'classes', label: t({ en: 'Classes', vi: 'Lớp học' }) },
    { id: 'friends', label: t({ en: 'Friends', vi: 'Bạn bè' }) },
  ];
  const openClass = (id: string | null) => router.replace(id ? `/community?tab=classes&class=${encodeURIComponent(id)}` : '/community?tab=classes');
  const openDm = (friendshipId: string | null) =>
    router.replace(friendshipId ? `/community?tab=friends&dm=${encodeURIComponent(friendshipId)}` : '/community?tab=friends');

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label={t({ en: 'Community', vi: 'Cộng đồng' })} className="flex gap-1 border-b border-line">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`community-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="community-panel"
            onClick={() => router.replace(item.id === 'community' ? '/community' : `/community?tab=${item.id}`)}
            className={`min-h-11 border-b-2 px-4 text-sm font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${tab === item.id ? 'border-action text-action' : 'border-transparent text-ink-muted hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="community-panel" aria-labelledby={`community-tab-${tab}`}>
        {tab === 'community' ? <CommunityRoom /> : tab === 'classes' ? <ClassesTab classId={classId} onOpen={openClass} /> : <FriendsTab dm={dm} onDm={openDm} />}
      </div>
    </div>
  );
}
