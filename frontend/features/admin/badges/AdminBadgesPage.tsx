'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { INPUT_CLASS as INPUT } from '@/components/ui/input';
import { getBadges, type CommunityBadge } from '../../profile/profileApi';
import { listAccounts, type Account } from '../accountsApi';
import { awardBadge, revokeBadge } from './adminBadgesApi';

type Bilingual = { vi: string; en: string };
const MATCHES = 8;
const REASON_MAX = 300;

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').toLowerCase();

/** Picks a student, then shows the honor badges that can be given by hand: Give (with a reason) or Take back. */
export function AdminBadgesPage() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Account | null>(null);
  const [badges, setBadges] = useState<CommunityBadge[] | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<Bilingual | null>(null);

  useEffect(() => {
    let live = true;
    listAccounts()
      .then((list) => live && setAccounts(list))
      .catch(() => live && setError({ en: 'Could not load the accounts.', vi: 'Không tải được danh sách tài khoản.' }));
    return () => {
      live = false;
    };
  }, []);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!accounts || q.length < 2) return [];
    return accounts.filter((a) => normalize(`${a.display_name ?? ''} ${a.email ?? ''}`).includes(q)).slice(0, MATCHES);
  }, [accounts, query]);

  const load = async (id: string) => {
    const result = await getBadges(id);
    if (!result.ok) return setError(result.error);
    setBadges(result.data.badges.filter((b) => !b.is_system));
  };

  const pick = (account: Account) => {
    setPicked(account);
    setBadges(null);
    setError(null);
    setReasons({});
    void load(account.id);
  };

  const act = async (badge: CommunityBadge) => {
    if (!picked) return;
    setBusy(badge.id);
    setError(null);
    const result = badge.unlocked ? await revokeBadge(picked.id, badge.id) : await awardBadge(picked.id, badge.id, (reasons[badge.id] ?? '').trim());
    setBusy(null);
    if (!result.ok) return setError(result.error);
    setReasons((prev) => ({ ...prev, [badge.id]: '' }));
    await load(picked.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="badge-user-search" className="text-sm font-semibold text-ink">{t({ en: 'Find a student', vi: 'Tìm học sinh' })}</label>
        <input
          id="badge-user-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t({ en: 'Name or e-mail, at least 2 letters', vi: 'Tên hoặc email, ít nhất 2 ký tự' })}
          className={INPUT}
          disabled={!accounts}
        />
        {matches.length > 0 && (
          <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {matches.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => pick(a)} className="flex min-h-11 w-full flex-col items-start px-3 py-2 text-left hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                  <span className="text-sm font-semibold text-ink">{a.display_name ?? t({ en: 'No name', vi: 'Chưa đặt tên' })}</span>
                  <span className="text-xs text-ink-muted">{a.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <Alert tone="danger">{t(error)}</Alert>}

      {picked && (
        <section aria-labelledby="honor-title" className="flex flex-col gap-3">
          <h2 id="honor-title" className="text-lg font-bold text-ink">
            {t({ en: 'Honor badges of', vi: 'Danh hiệu danh dự của' })} {picked.display_name ?? picked.email}
          </h2>
          {!badges && <p role="status" className="text-sm text-ink-muted">{t({ en: 'Loading…', vi: 'Đang tải…' })}</p>}
          {badges && badges.length === 0 && <p className="text-sm text-ink-muted">{t({ en: 'No honor badges yet.', vi: 'Chưa có danh hiệu danh dự nào.' })}</p>}
          <ul className="flex flex-col gap-3">
            {(badges ?? []).map((b) => (
              <li key={b.id} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-3">
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-2xl">{b.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">{t({ en: b.name_en, vi: b.name_vi })}</p>
                    <p className="text-xs text-ink-muted">
                      {b.unlocked ? `${t({ en: 'Given', vi: 'Đã trao' })}: ${b.reason ?? ''}` : t({ en: b.description_en, vi: b.description_vi })}
                    </p>
                  </div>
                </div>
                {b.unlocked ? (
                  <Button type="button" variant="outline" className="self-start" disabled={busy === b.id} onClick={() => void act(b)}>
                    {t({ en: 'Take back', vi: 'Thu hồi' })}
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <input
                      aria-label={`${t({ en: 'Reason for', vi: 'Lý do trao' })} ${t({ en: b.name_en, vi: b.name_vi })}`}
                      value={reasons[b.id] ?? ''}
                      maxLength={REASON_MAX}
                      onChange={(e) => setReasons((prev) => ({ ...prev, [b.id]: e.target.value }))}
                      placeholder={t({ en: 'Reason (required)', vi: 'Lý do (bắt buộc)' })}
                      className={`${INPUT} min-w-0 flex-1`}
                    />
                    <Button type="button" disabled={busy === b.id || !(reasons[b.id] ?? '').trim()} onClick={() => void act(b)}>
                      {t({ en: 'Give', vi: 'Trao' })}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
