'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Flame, GraduationCap, School } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { sendRequest } from '../friends/friendsApi';
import { BadgeShowcase } from './BadgeShowcase';
import { getProfile, type PublicProfile as Profile } from './profileApi';

type Bilingual = { en: string; vi: string };

/** Someone's profile as other students see it: cover, name, grade, school, bio, streak and how to reach them. */
export function PublicProfile({ userId }: { userId: string }) {
  const { t } = useLanguage();
  const [state, setState] = useState<{ profile: Profile } | { error: Bilingual } | null>(null);
  const [notice, setNotice] = useState<Bilingual | null>(null);

  useEffect(() => {
    let live = true;
    void getProfile(userId).then((result) => {
      if (live) setState(result.ok ? { profile: result.data } : { error: result.error });
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!state) return <p className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>;
  if ('error' in state) return <Alert tone="danger">{t(state.error)}</Alert>;
  const p = state.profile;
  const name = p.display_name ?? t({ en: 'Student', vi: 'Học sinh' });

  const add = async () => {
    const result = await sendRequest(p.user_id);
    if (!result.ok) return setNotice(result.error);
    setNotice(null);
    setState({ profile: { ...p, relation: result.data.status === 'accepted' ? 'friend' : 'pending_out', friendship_id: result.data.id } });
  };

  const action =
    p.relation === 'me' ? <Link href="/profile" className={buttonVariants({ variant: 'outline' })}>{t({ en: 'Edit profile', vi: 'Sửa hồ sơ' })}</Link>
    : p.relation === 'friend' && p.friendship_id ? <Link href={`/community?tab=friends&dm=${encodeURIComponent(p.friendship_id)}`} className={buttonVariants()}>{t({ en: 'Message', vi: 'Nhắn tin' })}</Link>
    : p.relation === 'none' ? <Button type="button" onClick={() => void add()}>{t({ en: 'Add friend', vi: 'Kết bạn' })}</Button>
    : p.relation === 'pending_out' ? <Button type="button" variant="outline" disabled>{t({ en: 'Request sent', vi: 'Đã gửi lời mời' })}</Button>
    : p.relation === 'pending_in' ? <Link href="/community?tab=friends" className={buttonVariants()}>{t({ en: 'Answer request', vi: 'Trả lời lời mời' })}</Link>
    : null;

  return (
    <section aria-labelledby="public-profile-name" className="overflow-hidden rounded-2xl border border-line bg-surface">
      {p.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- media store image
        <img src={p.cover_url} alt="" aria-hidden="true" className="h-24 w-full bg-surface-sunken object-cover sm:h-28" />
      ) : (
        <div aria-hidden="true" className="h-24 bg-surface-sunken sm:h-28" />
      )}
      <div className="flex flex-col gap-4 px-5 pb-6 sm:px-7">
        <div className="-mt-10 flex flex-col gap-3 sm:-mt-12">
          <div className="relative z-10 grid h-20 w-20 place-items-center overflow-hidden rounded-2xl border-4 border-surface bg-surface-sunken text-2xl font-extrabold text-ink sm:h-24 sm:w-24">
            {p.avatar_url
              // eslint-disable-next-line @next/next/no-img-element -- media store image
              ? <img src={p.avatar_url} alt={name} className="h-full w-full object-cover" />
              : <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 id="public-profile-name" className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{name}</h1>
            {p.role === 'teacher' && <Badge variant="outline">{t({ en: 'Teacher', vi: 'Giáo viên' })}</Badge>}
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            {p.grade && <span className="inline-flex items-center gap-1"><GraduationCap aria-hidden="true" className="size-4" />{t({ en: `Grade ${p.grade}`, vi: `Lớp ${p.grade}` })}</span>}
            {p.school && <span className="inline-flex items-center gap-1"><School aria-hidden="true" className="size-4" />{p.school}</span>}
            <span className="inline-flex items-center gap-1"><Flame aria-hidden="true" className="size-4" />{t({ en: `${p.streak.current}-day streak · best ${p.streak.best}`, vi: `Chuỗi ${p.streak.current} ngày · kỉ lục ${p.streak.best}` })}</span>
          </p>
          {p.bio && <p className="max-w-prose whitespace-pre-wrap text-sm text-ink">{p.bio}</p>}
        </div>
        <BadgeShowcase userId={p.user_id} />
        {notice && <Alert tone="danger">{t(notice)}</Alert>}
        {action && <div className="flex">{action}</div>}
      </div>
    </section>
  );
}
