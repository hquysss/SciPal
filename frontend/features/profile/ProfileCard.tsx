'use client';

import Link from 'next/link';
import { useEffect, useState, type ComponentType } from 'react';
import {
  BookmarkCheck,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Gauge,
  GraduationCap,
  LineChart,
  MessageCircleQuestion,
  NotebookPen,
  Pencil,
  PlayCircle,
  Repeat,
  School,
} from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { ProfileBadges } from './RoleBadge';
import { buttonVariants } from '../../components/ui/button';
import { BadgeShowcase } from './BadgeShowcase';
import { ProfileEditor } from './ProfileEditor';
import { ProfileHero, ProfileTabs, pill, roundAction } from './ProfileHero';
import { getProfile, type PublicProfile } from './profileApi';

interface ProfileCardProps {
  displayName: string;
  role: 'student' | 'teacher' | 'admin';
  email?: string | null;
  /** ISO date the account was created. */
  joinedAt?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  stats: { totalXP: number; completedLessons: number; longestStreak: number };
}

type Copy = { en: string; vi: string };
type Shortcut = { href: string; label: Copy; hint: Copy; Icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }> };

const LEARNING: Shortcut[] = [
  { href: '/subjects', label: { vi: 'Tiếp tục học', en: 'Keep learning' }, hint: { vi: 'Chọn môn và bài', en: 'Pick a subject' }, Icon: PlayCircle },
  { href: '/progress', label: { vi: 'Tiến trình', en: 'Progress' }, hint: { vi: 'XP và bài đã xong', en: 'XP and lessons done' }, Icon: LineChart },
  { href: '/glossary?filter=saved', label: { vi: 'Sổ từ của tôi', en: 'My words' }, hint: { vi: 'Thuật ngữ đã tra', en: 'Terms you looked up' }, Icon: BookmarkCheck },
  { href: '/review', label: { vi: 'Ôn từ', en: 'Review words' }, hint: { vi: 'Thẻ đến hạn hôm nay', en: 'Cards due today' }, Icon: Repeat },
  { href: '/tutor', label: { vi: 'Giáo sư AI', en: 'AI Professor' }, hint: { vi: 'Hỏi khi bí bài', en: 'Ask when stuck' }, Icon: MessageCircleQuestion },
  { href: '/profile/plan', label: { vi: 'Gói của tôi', en: 'My plan' }, hint: { vi: 'Lượt còn lại', en: 'Turns left' }, Icon: Gauge },
];

const TEACHING: Shortcut[] = [
  { href: '/teacher/classes', label: { vi: 'Quản lý lớp học', en: 'Classes' }, hint: { vi: 'Mở lớp, giao bài', en: 'Open classes, set work' }, Icon: School },
  { href: '/teacher/lessons', label: { vi: 'Soạn bài học', en: 'Lesson studio' }, hint: { vi: 'Viết và gửi duyệt', en: 'Write and submit' }, Icon: NotebookPen },
];

const REVIEWING: Shortcut[] = [
  { href: '/admin', label: { vi: 'Trang quản trị', en: 'Admin' }, hint: { vi: 'Mọi công cụ quản trị', en: 'Every admin tool' }, Icon: ClipboardCheck },
  { href: '/teacher/lessons', label: { vi: 'Studio bài học', en: 'Lesson studio' }, hint: { vi: 'Soạn và sửa bài', en: 'Write and edit' }, Icon: NotebookPen },
];

function ShortcutGrid({ items }: { items: Shortcut[] }) {
  const { t } = useLanguage();
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map(({ href, label, hint, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            className="group flex min-h-14 items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:-translate-y-0.5 hover:border-edge hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-sunken text-action">
              <Icon aria-hidden className="h-[18px] w-[18px]" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-sm font-semibold text-ink">{t(label)}</span>
              <span className="truncate text-xs text-ink-muted">{t(hint)}</span>
            </span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-ink-muted transition group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The profile's summary: who, since when, the learning numbers and where to go next. */
export function ProfileCard({ displayName, role, email, joinedAt, avatarUrl, coverUrl, stats }: ProfileCardProps) {
  const { t, lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<'shortcuts' | 'badges'>('shortcuts');
  // Grade, school and bio come from the community profile; the card shows without them until they load.
  const [about, setAbout] = useState<Pick<PublicProfile, 'grade' | 'school' | 'bio' | 'rank'> | null>(null);

  useEffect(() => {
    let live = true;
    void getProfile('me').then((result) => {
      if (live && result.ok) setAbout(result.data);
    });
    return () => {
      live = false;
    };
  }, [editing]);

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'SP';

  const joined = joinedAt ? new Date(joinedAt) : null;
  const joinedText = joined && !Number.isNaN(joined.getTime())
    ? t({ vi: `Tham gia ${joined.getUTCMonth() + 1}/${joined.getUTCFullYear()}`, en: `Joined ${joined.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` })
    : null;

  const meta = [
    ...(about?.grade ? [{ Icon: GraduationCap, text: t({ en: `Grade ${about.grade}`, vi: `Lớp ${about.grade}` }) }] : []),
    ...(about?.school ? [{ Icon: School, text: about.school }] : []),
    ...(joinedText ? [{ Icon: CalendarDays, text: joinedText }] : []),
  ];
  const stats3 = [
    { value: stats.totalXP.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN'), label: t({ en: 'Total XP', vi: 'Tổng điểm XP' }) },
    { value: String(stats.completedLessons), label: t({ en: 'Lessons done', vi: 'Bài đã học' }) },
    { value: String(stats.longestStreak), label: t({ en: 'Best streak', vi: 'Chuỗi ngày kỉ lục' }) },
  ];

  return (
    <section aria-labelledby="profile-name" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <ProfileHero
        headingId="profile-name"
        name={displayName}
        initials={initials}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        badge={<ProfileBadges role={role} weekRank={about?.rank?.week} />}
        handle={email}
        bio={about?.bio}
        meta={meta}
        stats={stats3}
        actions={!editing && (
          <>
            <Link href="/community/u/me" aria-label={t({ en: 'See your public profile', vi: 'Xem hồ sơ công khai' })} title={t({ en: 'See your public profile', vi: 'Xem hồ sơ công khai' })} className={roundAction}>
              <Eye aria-hidden="true" />
            </Link>
            <button type="button" onClick={() => setEditing(true)} className={buttonVariants({ variant: 'outline', className: pill })}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Edit profile', vi: 'Sửa hồ sơ' })}
            </button>
          </>
        )}
      />

      {editing && <div className="px-4 pb-6 sm:px-6"><ProfileEditor displayName={displayName} avatarUrl={avatarUrl ?? null} coverUrl={coverUrl ?? null} onClose={() => setEditing(false)} /></div>}

      <ProfileTabs
        label={t({ en: 'Profile sections', vi: 'Các mục hồ sơ' })}
        idPrefix="profile"
        tabs={[{ id: 'shortcuts', label: t({ vi: 'Đi nhanh', en: 'Shortcuts' }) }, { id: 'badges', label: t({ en: 'Badges', vi: 'Danh hiệu' }) }]}
        active={tab}
        onChange={setTab}
      />
      <div role="tabpanel" id="profile-panel" aria-labelledby={`profile-tab-${tab}`} className="flex flex-col gap-6 px-4 py-5 sm:px-6">
        {tab === 'badges' ? <BadgeShowcase userId="me" /> : (
          <>
            <ShortcutGrid items={LEARNING} />
            {role === 'teacher' && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t({ vi: 'Không gian giáo viên', en: 'Teaching' })}</h2>
                <ShortcutGrid items={TEACHING} />
              </div>
            )}
            {role === 'admin' && (
              <div className="flex flex-col gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t({ vi: 'Quản trị', en: 'Administration' })}</h2>
                <ShortcutGrid items={REVIEWING} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
