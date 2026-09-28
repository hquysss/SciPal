import Link from 'next/link';
import { Bi } from '@/components/ui/bilingual';

const TABS = [
  { id: 'settings', href: '/admin/ai', label: { en: 'Settings', vi: 'Cài đặt' } },
  { id: 'chats', href: '/admin/ai?tab=chats', label: { en: 'Conversations', vi: 'Hội thoại' } },
] as const;

/** The two tabs of /admin/ai: settings of every AI feature, and students' tutor conversations. */
export function AdminAiTabs({ active }: { active: 'settings' | 'chats' }) {
  return (
    <nav aria-label="AI" className="flex gap-1 border-b border-line">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={active === tab.id ? 'page' : undefined}
          className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${
            active === tab.id ? 'border-action text-ink' : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          <Bi en={tab.label.en} vi={tab.label.vi} />
        </Link>
      ))}
    </nav>
  );
}
