'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Mail, School, UserPlus } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { sendRequest } from '../friends/friendsApi';
import { BadgeShowcase } from './BadgeShowcase';
import { ProfileHero, pill } from './ProfileHero';
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

  const primary = buttonVariants({ className: pill });
  const action =
    p.relation === 'me' ? <Link href="/profile" className={buttonVariants({ variant: 'outline', className: pill })}>{t({ en: 'Edit profile', vi: 'Sửa hồ sơ' })}</Link>
    : p.relation === 'friend' && p.friendship_id ? <Link href={`/community?tab=friends&dm=${encodeURIComponent(p.friendship_id)}`} className={primary}><Mail aria-hidden="true" />{t({ en: 'Message', vi: 'Nhắn tin' })}</Link>
    : p.relation === 'none' ? <Button type="button" className={pill} onClick={() => void add()}><UserPlus aria-hidden="true" />{t({ en: 'Add friend', vi: 'Kết bạn' })}</Button>
    : p.relation === 'pending_out' ? <Button type="button" variant="outline" className={pill} disabled>{t({ en: 'Request sent', vi: 'Đã gửi lời mời' })}</Button>
    : p.relation === 'pending_in' ? <Link href="/community?tab=friends" className={primary}>{t({ en: 'Answer request', vi: 'Trả lời lời mời' })}</Link>
    : null;

  return (
    <section aria-labelledby="public-profile-name" className="overflow-hidden rounded-2xl border border-line bg-surface">
      <ProfileHero
        headingId="public-profile-name"
        name={name}
        initials={name.slice(0, 1).toUpperCase()}
        avatarUrl={p.avatar_url}
        coverUrl={p.cover_url}
        badge={p.role === 'teacher' && <Badge variant="outline">{t({ en: 'Teacher', vi: 'Giáo viên' })}</Badge>}
        handle={p.grade ? t({ en: `Grade ${p.grade}`, vi: `Lớp ${p.grade}` }) : null}
        bio={p.bio}
        meta={p.school ? [{ Icon: School, text: p.school }] : []}
        stats={[
          { value: String(p.streak.current), label: t({ en: 'day streak', vi: 'ngày liên tiếp' }) },
          { value: String(p.streak.best), label: t({ en: 'best streak', vi: 'ngày kỉ lục' }) },
        ]}
        actions={action}
      />
      {notice && <div className="px-4 pb-4 sm:px-6"><Alert tone="danger">{t(notice)}</Alert></div>}
      <div className="border-t border-line px-4 py-5 sm:px-6">
        <BadgeShowcase userId={p.user_id} />
      </div>
    </section>
  );
}
