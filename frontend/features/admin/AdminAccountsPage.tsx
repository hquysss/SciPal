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
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
    const variants = { admin: 'default', teacher: 'outline', student: 'secondary' } as const;
    const labels: Record<Account['app_role'], { en: string; vi: string }> = {
      admin: { en: 'Admin', vi: 'Quản trị' },
      teacher: { en: 'Teacher', vi: 'Giáo viên' },
      student: { en: 'Student', vi: 'Học sinh' },
    };

    return <Badge variant={variants[accountRole]}>{t(labels[accountRole])}</Badge>;
  }

  const clearFormMessages = () => { setFormError(null); setFormSuccess(null); };
  const textFields = [
    { id: 'account-display-name', label: { en: 'Display name', vi: 'Tên hiển thị' }, type: 'text', autoComplete: 'name', value: displayName, set: setDisplayName },
    { id: 'account-email', label: { en: 'Email', vi: 'Email' }, type: 'email', autoComplete: 'email', value: email, set: setEmail },
    { id: 'account-password', label: { en: 'Password', vi: 'Mật khẩu' }, type: 'password', autoComplete: 'new-password', value: password, set: setPassword },
    { id: 'account-password-confirm', label: { en: 'Confirm password', vi: 'Xác nhận mật khẩu' }, type: 'password', autoComplete: 'new-password', value: passwordConfirm, set: setPasswordConfirm },
  ];

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-sm font-semibold text-ink-muted">
          {t({ en: 'Administration', vi: 'Quản trị hệ thống' })}
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t({ en: 'Account management', vi: 'Quản lý tài khoản' })}
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {t({ en: 'Create accounts, manage roles, and remove learner or teacher accounts.', vi: 'Tạo tài khoản, phân quyền và xóa tài khoản học sinh hoặc giáo viên.' })}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.4fr)]">
        <Card className="gap-0 py-0" aria-labelledby="create-account-heading">
          <div className="border-b border-line bg-surface-sunken px-5 py-4 sm:px-7">
            <h2 id="create-account-heading" className="text-base font-semibold text-ink">
              {t({ en: 'New account', vi: 'Tạo tài khoản mới' })}
            </h2>
            <div className="mt-2 flex items-center gap-2">
              {roleBadge(role)}
              <span className="min-w-0 truncate text-sm text-ink-muted">
                {displayName.trim() || t({ en: 'Unnamed account', vi: 'Chưa đặt tên' })}
              </span>
            </div>
          </div>

          <form className="flex flex-col gap-4 p-5 sm:p-7" onSubmit={handleCreate} noValidate>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">
                {t({ en: 'Role', vi: 'Vai trò' })}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['student', 'teacher'] as const).map((option) => (
                  <label
                    key={option}
                    className={`flex min-h-11 cursor-pointer items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${role === option ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'}`}
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

            {textFields.map((field) => (
              <Field key={field.id} id={field.id} label={t(field.label)}>
                {(control) => (
                  <Input
                    {...control}
                    type={field.type}
                    required
                    autoComplete={field.autoComplete}
                    value={field.value}
                    onChange={(event) => { field.set(event.target.value); clearFormMessages(); }}
                    disabled={submitting}
                  />
                )}
              </Field>
            ))}

            {formError && <Alert tone="danger">{formError}</Alert>}
            {formSuccess && <Alert tone="success">{formSuccess}</Alert>}

            <Button type="submit" size="lg" disabled={submitting} className="w-full">
              {submitting ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : t({ en: 'Create account', vi: 'Tạo tài khoản' })}
            </Button>
          </form>
        </Card>

        <Card className="gap-0 py-0" aria-labelledby="account-list-heading">
          <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-7">
            <h2 id="account-list-heading" className="text-base font-semibold text-ink">
              {t({ en: 'All accounts', vi: 'Danh sách tài khoản' })}
              {listState === 'ready' && <span className="ml-2 font-normal text-ink-muted">({accounts.length})</span>}
            </h2>
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setFeedback(null); void loadAccounts(); }}
              disabled={listState === 'loading'}
            >
              {listState === 'loading' ? t({ en: 'Loading…', vi: 'Đang tải…' }) : t({ en: 'Refresh', vi: 'Tải lại' })}
            </Button>
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {feedback && <Alert tone="success">{feedback}</Alert>}
            {listError && <Alert tone="danger">{listError}</Alert>}

            {listState === 'loading' && (
              <p role="status" className="py-12 text-center text-sm text-ink-muted">
                {t({ en: 'Loading accounts…', vi: 'Đang tải danh sách tài khoản…' })}
              </p>
            )}

            {listState === 'error' && (
              <EmptyState
                title={t({ en: 'The account list is unavailable.', vi: 'Danh sách tài khoản hiện chưa khả dụng.' })}
                action={
                  <Button type="button" variant="outline" onClick={() => void loadAccounts()}>
                    {t({ en: 'Try again', vi: 'Thử lại' })}
                  </Button>
                }
              />
            )}

            {listState === 'ready' && accounts.length === 0 && (
              <EmptyState
                title={t({ en: 'No accounts yet', vi: 'Chưa có tài khoản nào' })}
                description={t({ en: 'Create the first account with the form.', vi: 'Tạo tài khoản đầu tiên bằng biểu mẫu bên cạnh.' })}
              />
            )}

            {listState === 'ready' && accounts.length > 0 && (
              <Table label={t({ en: 'Accounts', vi: 'Danh sách tài khoản' })}>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t({ en: 'Account', vi: 'Tài khoản' })}</TableHead>
                    <TableHead>{t({ en: 'Role', vi: 'Vai trò' })}</TableHead>
                    <TableHead>{t({ en: 'Created', vi: 'Tạo ngày' })}</TableHead>
                    <TableHead>{t({ en: 'Last active', vi: 'Hoạt động gần nhất' })}</TableHead>
                    <TableHead><span className="sr-only">{t({ en: 'Actions', vi: 'Thao tác' })}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <p className="max-w-[16rem] truncate font-semibold text-ink">
                          {account.display_name ?? t({ en: 'Unnamed account', vi: 'Chưa đặt tên' })}
                        </p>
                        <p className="max-w-[16rem] truncate text-ink-muted">{account.email ?? '—'}</p>
                      </TableCell>
                      <TableCell>{roleBadge(account.app_role)}</TableCell>
                      <TableCell className="whitespace-nowrap text-ink-muted">{formatDate(account.created_at, lang)}</TableCell>
                      <TableCell className="whitespace-nowrap text-ink-muted">{formatDate(account.last_sign_in_at, lang)}</TableCell>
                      <TableCell>
                        {account.app_role !== 'admin' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleRoleToggle(account)}
                              disabled={Boolean(updatingId || deletingId)}
                            >
                              {updatingId === account.id
                                ? t({ en: 'Saving…', vi: 'Đang lưu…' })
                                : account.app_role === 'student'
                                  ? t({ en: 'Make teacher', vi: 'Đổi thành giáo viên' })
                                  : t({ en: 'Make student', vi: 'Đổi thành học sinh' })}
                            </Button>
                            <Button
                              type="button"
                              variant="destructive"
                              onClick={() => setConfirmDelete(account)}
                              disabled={Boolean(updatingId || deletingId)}
                            >
                              {deletingId === account.id ? t({ en: 'Deleting…', vi: 'Đang xóa…' }) : t({ en: 'Delete', vi: 'Xóa' })}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description" className="w-full max-w-sm rounded-xl border border-line bg-surface p-6">
            <h2 id="delete-account-title" className="text-lg font-semibold text-ink">
              {t({ en: 'Delete account?', vi: 'Xóa tài khoản?' })}
            </h2>
            <p id="delete-account-description" className="mt-2 text-sm text-ink-muted">
              {t({ en: `This will permanently remove ${confirmDelete.email ?? confirmDelete.display_name ?? 'this account'}.`, vi: `Thao tác này sẽ xóa vĩnh viễn ${confirmDelete.email ?? confirmDelete.display_name ?? 'tài khoản này'}.` })}
            </p>
            <div className="mt-5 flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                {t({ en: 'Cancel', vi: 'Hủy' })}
              </Button>
              <Button type="button" variant="destructive" className="flex-1" onClick={() => void handleDelete()}>
                {t({ en: 'Delete account', vi: 'Xóa tài khoản' })}
              </Button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
