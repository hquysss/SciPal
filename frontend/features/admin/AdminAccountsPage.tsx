'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import {
  AccountsApiError,
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccountRole,
  type Account,
} from './accountsApi';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type ListState = 'loading' | 'ready' | 'error';
type ManagedRole = 'student' | 'teacher';

function formatDate(value: string | null, lang: 'en' | 'vi') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
  }).format(date);
}

export function AdminAccountsPage() {
  const { lang, t } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [role, setRole] = useState<ManagedRole>('student');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [listState, setListState] = useState<ListState>('loading');
  const [listError, setListError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null);

  const loadAccounts = useCallback(async (signal?: AbortSignal) => {
    setListState('loading');
    setListError(null);
    try {
      const result = await listAccounts(signal);
      if (signal?.aborted) return;
      setAccounts(result);
      setListState('ready');
    } catch (error) {
      if (signal?.aborted) return;
      setListError(error instanceof AccountsApiError && (error.status === 401 || error.status === 403)
        ? t({ en: 'Admin access is required. Sign in with an administrator account.', vi: 'Cần đăng nhập bằng tài khoản quản trị viên để xem danh sách.' })
        : t({ en: 'Could not load accounts. Check the server connection and try again.', vi: 'Không tải được tài khoản. Hãy kiểm tra kết nối máy chủ rồi thử lại.' }));
      setListState('error');
    }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    void loadAccounts(controller.signal);
    return () => controller.abort();
  }, [loadAccounts]);

  function validateForm() {
    if (!displayName.trim()) return t({ en: 'Name is required.', vi: 'Vui lòng nhập tên hiển thị.' });
    if (!email.trim()) return t({ en: 'Email is required.', vi: 'Vui lòng nhập email.' });
    if (!EMAIL_RE.test(email.trim())) return t({ en: 'Enter a valid email address.', vi: 'Email chưa đúng định dạng.' });
    if (!password) return t({ en: 'Password is required.', vi: 'Vui lòng nhập mật khẩu.' });
    if (password.length < 8) return t({ en: 'Password must be at least 8 characters.', vi: 'Mật khẩu cần có ít nhất 8 ký tự.' });
    if (password !== passwordConfirm) return t({ en: 'Passwords do not match.', vi: 'Hai mật khẩu không khớp.' });
    return null;
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const account = await createAccount({
        display_name: displayName.trim(),
        email: email.trim(),
        password,
        app_role: role,
      });
      setAccounts((current) => [account, ...current.filter((item) => item.id !== account.id)]);
      setFormSuccess(t({ en: `Account created: ${account.email ?? email.trim()}`, vi: `Đã tạo tài khoản: ${account.email ?? email.trim()}` }));
      setDisplayName('');
      setEmail('');
      setPassword('');
      setPasswordConfirm('');
      setRole('student');
    } catch (error) {
      if (error instanceof AccountsApiError && error.status === 409) {
        setFormError(t({ en: 'An account already uses this email.', vi: 'Email này đã được dùng cho tài khoản khác.' }));
      } else if (error instanceof AccountsApiError && error.status === 400) {
        setFormError(t({ en: 'Some account details are invalid. Review the form and try again.', vi: 'Thông tin tài khoản chưa hợp lệ. Hãy kiểm tra lại biểu mẫu.' }));
      } else {
        setFormError(t({ en: 'Could not create the account. Check the server connection and try again.', vi: 'Không tạo được tài khoản. Hãy kiểm tra kết nối máy chủ rồi thử lại.' }));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleToggle(account: Account) {
    if (updatingId || deletingId || account.app_role === 'admin') return;
    const nextRole: ManagedRole = account.app_role === 'student' ? 'teacher' : 'student';
    setUpdatingId(account.id);
    setFeedback(null);
    setListError(null);
    try {
      const updated = await updateAccountRole(account.id, nextRole);
      setAccounts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setFeedback(t({ en: `Role updated for ${account.email ?? account.display_name ?? 'account'}.`, vi: `Đã cập nhật vai trò cho ${account.email ?? account.display_name ?? 'tài khoản'}.` }));
    } catch {
      setListError(t({ en: 'Could not update this role. Refresh the list and try again.', vi: 'Không đổi được vai trò. Hãy tải lại danh sách rồi thử lại.' }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete || deletingId || updatingId) return;
    const account = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(account.id);
    setFeedback(null);
    setListError(null);
    try {
      await deleteAccount(account.id);
      setAccounts((current) => current.filter((item) => item.id !== account.id));
      setFeedback(t({ en: `Deleted ${account.email ?? account.display_name ?? 'account'}.`, vi: `Đã xóa ${account.email ?? account.display_name ?? 'tài khoản'}.` }));
    } catch {
      setListError(t({ en: 'Could not delete this account. Refresh the list and try again.', vi: 'Không xóa được tài khoản. Hãy tải lại danh sách rồi thử lại.' }));
    } finally {
      setDeletingId(null);
    }
  }

  function roleBadge(accountRole: Account['app_role']) {
    const styles: Record<Account['app_role'], string> = {
      admin: 'border-purple-300/60 bg-purple-100 text-purple-800 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300',
      teacher: 'border-blue-300/60 bg-blue-100 text-blue-800 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
      student: 'border-emerald-300/60 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    };
    const labels: Record<Account['app_role'], { en: string; vi: string }> = {
      admin: { en: 'Admin', vi: 'Quản trị' },
      teacher: { en: 'Teacher', vi: 'Giáo viên' },
      student: { en: 'Student', vi: 'Học sinh' },
    };

    return (
      <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${styles[accountRole]}`}>
        {t(labels[accountRole])}
      </span>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-400">
          {t({ en: 'Administration', vi: 'Quản trị hệ thống' })}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white sm:text-4xl">
          {t({ en: 'Account Management', vi: 'Quản lý tài khoản' })}
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t({ en: 'Create accounts, manage roles, and remove learner or teacher accounts.', vi: 'Tạo tài khoản, phân quyền và xóa tài khoản học sinh hoặc giáo viên.' })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.4fr)]">
        <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/90" aria-labelledby="create-account-heading">
          <div className="border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/10 dark:bg-white/5 sm:px-7">
            <h2 id="create-account-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {t({ en: 'New Account', vi: 'Tạo tài khoản mới' })}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {roleBadge(role)}
              <span className="min-w-0 truncate text-xs text-gray-500">
                {displayName.trim() || t({ en: 'Unnamed account', vi: 'Chưa đặt tên' })}
              </span>
            </div>
          </div>

          <form className="space-y-4 p-5 sm:p-7" onSubmit={handleCreate} noValidate>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Role', vi: 'Vai trò' })}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as const).map((option) => (
                  <label
                    key={option}
                    className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-bold transition ${role === option ? 'border-emerald-400 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 dark:border-white/10 dark:bg-white/5'}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="account-role"
                      value={option}
                      checked={role === option}
                      onChange={() => setRole(option)}
                    />
                    {t(option === 'student'
                      ? { en: 'Student', vi: 'Học sinh' }
                      : { en: 'Teacher', vi: 'Giáo viên' })}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="account-display-name" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Display name', vi: 'Tên hiển thị' })}
              </label>
              <input
                id="account-display-name"
                required
                autoComplete="name"
                value={displayName}
                onChange={(event) => { setDisplayName(event.target.value); setFormError(null); setFormSuccess(null); }}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="account-email" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Email', vi: 'Email' })}
              </label>
              <input
                id="account-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setFormError(null); setFormSuccess(null); }}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="account-password" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Password', vi: 'Mật khẩu' })}
              </label>
              <input
                id="account-password"
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(event) => { setPassword(event.target.value); setFormError(null); setFormSuccess(null); }}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="account-password-confirm" className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-gray-300">
                {t({ en: 'Confirm password', vi: 'Xác nhận mật khẩu' })}
              </label>
              <input
                id="account-password-confirm"
                type="password"
                required
                autoComplete="new-password"
                value={passwordConfirm}
                onChange={(event) => { setPasswordConfirm(event.target.value); setFormError(null); setFormSuccess(null); }}
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-xs transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </div>

            {formError && <p role="alert" className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</p>}
            {formSuccess && <p role="status" className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{formSuccess}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[0.99] disabled:cursor-wait disabled:opacity-50"
            >
              {submitting ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : t({ en: 'Create account', vi: 'Tạo tài khoản' })}
            </button>
          </form>
        </section>

        <section className="overflow-hidden rounded-3xl border border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-card/90" aria-labelledby="account-list-heading">
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4 dark:border-white/10 sm:px-7">
            <h2 id="account-list-heading" className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              {t({ en: 'All accounts', vi: 'Danh sách tài khoản' })}
              {listState === 'ready' && <span className="ml-2 text-emerald-600">({accounts.length})</span>}
            </h2>
            <button
              type="button"
              onClick={() => { setFeedback(null); void loadAccounts(); }}
              disabled={listState === 'loading'}
              className="min-h-10 rounded-lg px-3 py-1 text-xs font-bold text-gray-600 transition hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10"
            >
              {listState === 'loading' ? t({ en: 'Loading…', vi: 'Đang tải…' }) : t({ en: 'Refresh', vi: 'Tải lại' })}
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {feedback && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{feedback}</p>}
            {listError && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{listError}</p>}

            {listState === 'loading' && (
              <p className="animate-pulse py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                {t({ en: 'Loading accounts…', vi: 'Đang tải danh sách tài khoản…' })}
              </p>
            )}

            {listState === 'error' && (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t({ en: 'The account list is unavailable.', vi: 'Danh sách tài khoản hiện chưa khả dụng.' })}
                </p>
                <button type="button" onClick={() => void loadAccounts()} className="mt-3 rounded-lg px-3 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40">
                  {t({ en: 'Try again', vi: 'Thử lại' })}
                </button>
              </div>
            )}

            {listState === 'ready' && accounts.length === 0 && (
              <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                {t({ en: 'No accounts yet.', vi: 'Chưa có tài khoản nào.' })}
              </p>
            )}

            {listState === 'ready' && accounts.length > 0 && (
              <ul className="divide-y divide-gray-100 dark:divide-white/10">
                {accounts.map((account) => {
                  const avatarText = account.display_name?.trim() || account.email?.trim() || '?';
                  return (
                    <li key={account.id} className="flex flex-wrap items-center gap-3 py-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" aria-hidden="true">
                        {avatarText.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                          {account.display_name ?? t({ en: 'Unnamed account', vi: 'Chưa đặt tên' })}
                        </p>
                        <p className="truncate text-xs text-gray-500">{account.email ?? '—'}</p>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {t({ en: 'Created', vi: 'Tạo ngày' })}: {formatDate(account.created_at, lang)}
                          <span className="px-1.5" aria-hidden="true">·</span>
                          {t({ en: 'Last active', vi: 'Hoạt động gần nhất' })}: {formatDate(account.last_sign_in_at, lang)}
                        </p>
                      </div>
                      {roleBadge(account.app_role)}
                      {account.app_role !== 'admin' && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleRoleToggle(account)}
                            disabled={Boolean(updatingId || deletingId)}
                            className="min-h-10 rounded-lg px-2.5 py-1 text-xs font-bold text-blue-700 transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-40 dark:text-blue-300 dark:hover:bg-blue-950/40"
                          >
                            {updatingId === account.id
                              ? '…'
                              : account.app_role === 'student'
                                ? t({ en: '→ Teacher', vi: '→ Giáo viên' })
                                : t({ en: '→ Student', vi: '→ Học sinh' })}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(account)}
                            disabled={Boolean(updatingId || deletingId)}
                            className="min-h-10 rounded-lg px-2.5 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:opacity-40 dark:text-red-400 dark:hover:bg-red-950/40"
                          >
                            {deletingId === account.id ? '…' : t({ en: 'Delete', vi: 'Xóa' })}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl dark:bg-card">
            <h2 id="delete-account-title" className="text-lg font-bold text-gray-900 dark:text-white">
              {t({ en: 'Delete account?', vi: 'Xóa tài khoản?' })}
            </h2>
            <p id="delete-account-description" className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t({ en: `This will permanently remove ${confirmDelete.email ?? confirmDelete.display_name ?? 'this account'}.`, vi: `Thao tác này sẽ xóa vĩnh viễn ${confirmDelete.email ?? confirmDelete.display_name ?? 'tài khoản này'}.` })}
            </p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-11 flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300">
                {t({ en: 'Cancel', vi: 'Hủy' })}
              </button>
              <button type="button" onClick={() => void handleDelete()} className="min-h-11 flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                {t({ en: 'Delete', vi: 'Xóa' })}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
