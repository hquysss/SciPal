'use client';

import Link from 'next/link';
import { useState, type ComponentType, type CSSProperties } from 'react';
import {
  BookCheck,
  ChevronRight,
  ClipboardCheck,
  Flame,
  Gauge,
  LineChart,
  MessageCircleQuestion,
  NotebookPen,
  Pencil,
  PlayCircle,
  School,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Badge } from '../../components/ui/badge';
import { buttonVariants } from '../../components/ui/button';
import { ProfileEditor } from './ProfileEditor';

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
  { href: '/tutor', label: { vi: 'Giáo sư SciPal', en: 'SciPal Professor' }, hint: { vi: 'Hỏi khi bí bài', en: 'Ask when stuck' }, Icon: MessageCircleQuestion },
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

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'SP';

  const roleBadge =
    role === 'admin'
      ? { variant: 'default' as const, label: t({ en: 'Admin', vi: 'Quản trị viên' }) }
      : role === 'teacher'
        ? { variant: 'outline' as const, label: t({ en: 'Teacher', vi: 'Giáo viên' }) }
        : { variant: 'secondary' as const, label: t({ en: 'Student', vi: 'Học sinh' }) };

  const joined = joinedAt ? new Date(joinedAt) : null;
  const joinedText = joined && !Number.isNaN(joined.getTime())
    ? t({ vi: `Tham gia ${joined.getUTCMonth() + 1}/${joined.getUTCFullYear()}`, en: `Joined ${joined.toLocaleDateString('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })}` })
    : null;

  const numbers = [
    { value: stats.totalXP.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN'), label: { en: 'Total XP', vi: 'Tổng điểm XP' }, Icon: Sparkles, tone: 'var(--sun)' },
    { value: String(stats.completedLessons), label: { en: 'Lessons done', vi: 'Bài đã học' }, Icon: BookCheck, tone: 'var(--sky)' },
    { value: String(stats.longestStreak), label: { en: 'Best streak', vi: 'Chuỗi ngày kỉ lục' }, Icon: Flame, tone: 'var(--coral)' },
  ];

  return (
    <section aria-labelledby="profile-name" className="overflow-hidden rounded-2xl border border-line bg-surface">
      {/* The owner's cover photo, or a banner in the level's supporting colours; decoration only. */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- media store image
        <img src={coverUrl} alt="" aria-hidden="true" className="h-24 w-full bg-surface-sunken object-cover sm:h-28" />
      ) : (
      <div
        aria-hidden="true"
        className="relative h-24 sm:h-28"
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--sun) 55%, transparent), transparent 60%), radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--sky) 55%, transparent), transparent 60%), linear-gradient(120deg, color-mix(in srgb, var(--action) 30%, var(--surface)), color-mix(in srgb, var(--coral) 35%, var(--surface)))',
        }}
      />
      )}

      <div className="flex flex-col gap-6 px-5 pb-6 sm:px-7">
        <div className="-mt-10 flex flex-col gap-3 sm:-mt-12">
          <div className="relative z-10 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-sunken text-2xl font-extrabold text-ink shadow-md sm:h-24 sm:w-24">
            {avatarUrl ? <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" /> : <span aria-hidden="true">{initials}</span>}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 id="profile-name" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{displayName}</h1>
              <Badge variant={roleBadge.variant}>{roleBadge.label}</Badge>
            </div>
            <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-muted">
              {email && <span className="break-all">{email}</span>}
              {joinedText && <span>{joinedText}</span>}
            </p>
          </div>
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={`${buttonVariants({ variant: 'outline' })} self-start`}>
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {t({ en: 'Edit profile', vi: 'Sửa hồ sơ' })}
            </button>
          )}
        </div>

        {editing && <ProfileEditor displayName={displayName} avatarUrl={avatarUrl ?? null} coverUrl={coverUrl ?? null} onClose={() => setEditing(false)} />}

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          {numbers.map(({ value, label, Icon, tone }) => (
            <div key={label.en} className="flex flex-col gap-1 rounded-xl border border-line bg-surface-sunken p-3 sm:p-4" style={{ '--stat-tone': tone } as CSSProperties}>
              <Icon aria-hidden="true" className="h-5 w-5 text-[color:var(--stat-tone)]" />
              <dt className="order-last text-xs text-ink-muted sm:text-sm">{t(label)}</dt>
              <dd className="text-xl font-extrabold tabular-nums text-ink sm:text-2xl">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t({ vi: 'Đi nhanh', en: 'Shortcuts' })}</h2>
          <ShortcutGrid items={LEARNING} />
        </div>

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
      </div>
    </section>
  );
}
