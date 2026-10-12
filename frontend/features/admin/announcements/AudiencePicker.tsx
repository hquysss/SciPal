'use client';

import { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Input } from '@/components/ui/input';
import type { Account } from '@/features/admin/accountsApi';

export type Role = Account['app_role'];
export type Target = { mode: 'all' | 'role' | 'users'; roles: Role[]; picked: Account[] };
export const ALL_ACCOUNTS: Target = { mode: 'all', roles: [], picked: [] };

const ROLE_LABEL: Record<Role, { vi: string; en: string }> = {
  student: { vi: 'Học sinh', en: 'Students' },
  teacher: { vi: 'Giáo viên', en: 'Teachers' },
  admin: { vi: 'Quản trị', en: 'Admins' },
};
const MAX_PICKED = 200;
const SHOWN = 8;

export const nameOf = (a: Account) => a.display_name || a.email || a.id;

/** How many accounts the target reaches; `total` is the account count the server reported. */
export function targetCount(target: Target, accounts: Account[] | null, total: number): number {
  if (target.mode === 'users') return target.picked.length;
  if (target.mode === 'role') return (accounts ?? []).filter((a) => target.roles.includes(a.app_role)).length;
  return total;
}

/** Who gets the in-app notice: everyone, some roles, or accounts picked by name or e-mail. */
export function AudiencePicker({ target, onChange, accounts, total }: { target: Target; onChange: (next: Target) => void; accounts: Account[] | null; total: number }) {
  const { t } = useLanguage();
  const id = useId();
  const [query, setQuery] = useState('');
  const counts = useMemo(() => {
    const result: Record<Role, number> = { student: 0, teacher: 0, admin: 0 };
    for (const a of accounts ?? []) result[a.app_role] += 1;
    return result;
  }, [accounts]);
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || !accounts) return [];
    const taken = new Set(target.picked.map((a) => a.id));
    return accounts
      .filter((a) => !taken.has(a.id) && `${a.display_name ?? ''} ${a.email ?? ''}`.toLowerCase().includes(needle))
      .slice(0, SHOWN);
  }, [accounts, query, target.picked]);

  const modes: Array<{ value: Target['mode']; label: string }> = [
    { value: 'all', label: t({ vi: `Tất cả tài khoản (${total})`, en: `All accounts (${total})` }) },
    { value: 'role', label: t({ vi: 'Theo vai trò', en: 'By role' }) },
    { value: 'users', label: t({ vi: 'Chọn tài khoản', en: 'Pick accounts' }) },
  ];
  const toggleRole = (role: Role) =>
    onChange({ ...target, roles: target.roles.includes(role) ? target.roles.filter((r) => r !== role) : [...target.roles, role] });
  const pick = (account: Account) => {
    if (target.picked.length >= MAX_PICKED) return;
    onChange({ ...target, picked: [...target.picked, account] });
    setQuery('');
  };

  return (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{t({ vi: 'Thông báo trong app gửi tới', en: 'In-app notice goes to' })}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t({ vi: 'Người nhận thông báo trong app', en: 'In-app recipients' })}>
        {modes.map(({ value, label }) => (
          <label key={value} className="relative cursor-pointer">
            <input type="radio" name={`${id}-mode`} className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={target.mode === value} onChange={() => onChange({ ...target, mode: value })} />
            <span className="flex min-h-11 items-center rounded-full border border-edge px-4 text-sm font-semibold text-ink peer-checked:border-action peer-checked:bg-action peer-checked:text-action-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus">
              {label}
            </span>
          </label>
        ))}
      </div>

      {target.mode === 'role' && (
        <div className="flex flex-wrap gap-x-5">
          {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
            <label key={role} className="flex min-h-11 items-center gap-2 text-sm text-ink">
              <input type="checkbox" className="h-5 w-5" checked={target.roles.includes(role)} onChange={() => toggleRole(role)} />
              {t(ROLE_LABEL[role])} ({counts[role]})
            </label>
          ))}
        </div>
      )}

      {target.mode === 'users' && (
        <div className="flex flex-col gap-2">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!accounts}
            aria-label={t({ vi: 'Tìm tài khoản theo tên hoặc email', en: 'Search accounts by name or e-mail' })}
            placeholder={accounts ? t({ vi: 'Tìm theo tên hoặc email…', en: 'Search by name or e-mail…' }) : t({ vi: 'Đang tải danh sách tài khoản…', en: 'Loading accounts…' })}
          />
          {matches.length > 0 && (
            <ul className="flex flex-col rounded-lg border border-line bg-surface" aria-label={t({ vi: 'Kết quả tìm', en: 'Search results' })}>
              {matches.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => pick(a)} className="flex min-h-11 w-full flex-col items-start justify-center px-3 py-1 text-left text-sm hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                    <span className="font-semibold text-ink">{nameOf(a)}</span>
                    <span className="text-xs text-ink-muted">{[a.email, t(ROLE_LABEL[a.app_role])].filter(Boolean).join(' · ')}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {query.trim() && accounts && matches.length === 0 && <p className="text-sm text-ink-muted">{t({ vi: 'Không có tài khoản phù hợp.', en: 'No matching account.' })}</p>}
          {target.picked.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t({ vi: 'Tài khoản đã chọn', en: 'Chosen accounts' })}>
              {target.picked.map((a) => (
                <li key={a.id} className="flex items-center gap-1 rounded-full bg-surface-sunken py-1 pl-3 pr-1 text-sm text-ink">
                  {nameOf(a)}
                  <button type="button" onClick={() => onChange({ ...target, picked: target.picked.filter((p) => p.id !== a.id) })} aria-label={t({ vi: `Bỏ ${nameOf(a)}`, en: `Remove ${nameOf(a)}` })} className="grid h-8 w-8 place-items-center rounded-full text-ink-muted hover:bg-line hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-ink-muted">{t({ vi: `Đã chọn ${target.picked.length}/${MAX_PICKED} tài khoản.`, en: `${target.picked.length}/${MAX_PICKED} accounts chosen.` })}</p>
        </div>
      )}
    </fieldset>
  );
}
