'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LanguageToggle } from './LanguageToggle';
import { OnlinePill } from './OnlinePill';
import { SubjectSwitcher } from './SubjectSwitcher';
import type { SubjectSlug } from '@/lib/subject-config';
import { createBrowserClient } from '@/lib/supabase';

interface NavBarProps {
  currentSubject?: SubjectSlug;
}

type AppRole = 'student' | 'teacher' | 'admin';

type AuthUser = {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
  email?: string | null;
};

function getAppRole(user: AuthUser | null): AppRole | null {
  if (!user) return null;

  const role = user.app_metadata?.app_role;
  if (role === 'teacher' || role === 'admin') return role;

  return 'student';
}

function getDisplayName(user: AuthUser | null): string | null {
  if (!user) return null;

  const displayName = user.user_metadata?.display_name;
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim();

  return user.email?.split('@')[0]?.trim() || null;
}

export function NavBar({ currentSubject }: NavBarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<'admin' | 'teacher' | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setOpenNavGroup(null);
    setSigningOut(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen && !openNavGroup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openNavGroup) setOpenNavGroup(null);
      else setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen, openNavGroup]);

  useEffect(() => {
    if (!openNavGroup) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('[data-nav-group]')) {
        setOpenNavGroup(null);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [openNavGroup]);

  useEffect(() => {
    if (pathname === '/login') return;
    let mounted = true;
    try {
      const supabase = createBrowserClient();
      void supabase.auth.getUser().then(({ data, error }) => {
        if (mounted) {
          const user = error ? null : data.user;
          setAppRole(getAppRole(user));
          setDisplayName(getDisplayName(user));
        }
      }).catch(() => {
        if (mounted) {
          setAppRole(null);
          setDisplayName(null);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          const user = session?.user ?? null;
          setAppRole(getAppRole(user));
          setDisplayName(getDisplayName(user));
          setSigningOut(false);
        }
      });
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      setAppRole(null);
      setDisplayName(null);
    }
  }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await createBrowserClient().auth.signOut();
    } catch (error) {
      console.warn('Sign out warning:', error);
    } finally {
      if (typeof document !== 'undefined') {
        document.cookie = 'scipal_session=; path=/; max-age=0; SameSite=Lax';
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('scipal_demo_user');
        localStorage.removeItem('scipal_demo_role');
      }
      setAppRole(null);
      setDisplayName(null);
      setSigningOut(false);
      setMobileOpen(false);
      setOpenNavGroup(null);
      router.push('/login');
      router.refresh();
    }
  };

  if (pathname === '/login') return null;

  const links = [
    { href: '/glossary', label: lang === 'en' ? 'Glossary' : 'Từ điển' },
    { href: '/exam', label: lang === 'en' ? 'Exams' : 'Thi thử' },
    ...(appRole ? [
      { href: '/progress', label: lang === 'en' ? 'Progress' : 'Tiến trình' },
      { href: '/profile', label: lang === 'en' ? 'Profile' : 'Hồ sơ' },
    ] : []),
  ];
  const teacherLinks = appRole === 'teacher' ? [
    { href: '/teacher/classes', label: lang === 'en' ? 'Classes' : 'Lớp học' },
    { href: '/teacher/lessons', label: lang === 'en' ? 'Lesson Studio' : 'Soạn bài' },
  ] : [];
  const adminLinks = appRole === 'admin' ? [
    { href: '/admin/accounts', label: lang === 'en' ? 'Accounts' : 'Quản lý tài khoản' },
    { href: '/teacher/lessons', label: lang === 'en' ? 'Lesson Studio' : 'Soạn bài' },
    { href: '/admin/lessons/review', label: lang === 'en' ? 'Review Queue' : 'Duyệt bài' },
  ] : [];
  const teacherMenuOpen = openNavGroup === 'teacher';
  const adminMenuOpen = openNavGroup === 'admin';
  const teacherRouteActive = teacherLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const adminRouteActive = adminLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const toggleNavGroup = (group: 'admin' | 'teacher') => {
    setOpenNavGroup((current) => current === group ? null : group);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-600/30 bg-emerald-700/95 text-white shadow-xs backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="group flex shrink-0 items-center gap-3 font-bold text-white">
          <Image
            src="/logo.svg"
            alt="SciPal Logo"
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-inner transition duration-150 group-hover:scale-105"
            priority
          />
          <span className="flex flex-col">
            <span className="text-xl font-black leading-tight tracking-tight">SciPal</span>
            <span className="hidden font-mono text-xs font-semibold uppercase tracking-wider text-emerald-200/90 sm:block">
              {lang === 'en' ? 'Natural Sciences' : 'Khoa học tự nhiên'}
            </span>
          </span>
        </Link>

        <nav aria-label={lang === 'en' ? 'Main navigation' : 'Điều hướng chính'} className="hidden items-center gap-1 lg:flex">
          <SubjectSwitcher current={currentSubject} />
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {link.label}
            </Link>
          ))}
          {teacherLinks.length > 0 && (
            <div className="relative" data-nav-group="teacher">
              <button
                type="button"
                aria-expanded={teacherMenuOpen}
                aria-controls="desktop-teacher-navigation"
                onClick={() => toggleNavGroup('teacher')}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${teacherRouteActive ? 'bg-white/10 text-white' : 'text-white/90'}`}
              >
                {lang === 'en' ? 'Teacher' : 'Giáo viên'}
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${teacherMenuOpen ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              <div
                id="desktop-teacher-navigation"
                aria-hidden={!teacherMenuOpen}
                className={`absolute left-0 top-full z-50 mt-2 w-56 origin-top rounded-xl border border-gray-200 bg-white p-1.5 text-gray-900 shadow-xl transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-card dark:text-white ${teacherMenuOpen ? 'visible scale-y-100 opacity-100' : 'invisible pointer-events-none scale-y-0 opacity-0'}`}
              >
                {teacherLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpenNavGroup(null)}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:hover:bg-white/10 ${pathname === link.href ? 'bg-emerald-50 text-emerald-900 dark:bg-white/10 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {adminLinks.length > 0 && (
            <div className="relative" data-nav-group="admin">
              <button
                type="button"
                aria-expanded={adminMenuOpen}
                aria-controls="desktop-admin-navigation"
                onClick={() => toggleNavGroup('admin')}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white ${adminRouteActive ? 'bg-white/10 text-white' : 'text-white/90'}`}
              >
                Admin
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${adminMenuOpen ? 'rotate-180' : ''}`}>
                  <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </button>
              <div
                id="desktop-admin-navigation"
                aria-hidden={!adminMenuOpen}
                className={`absolute left-0 top-full z-50 mt-2 w-56 origin-top rounded-xl border border-gray-200 bg-white p-1.5 text-gray-900 shadow-xl transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none dark:border-white/10 dark:bg-card dark:text-white ${adminMenuOpen ? 'visible scale-y-100 opacity-100' : 'invisible pointer-events-none scale-y-0 opacity-0'}`}
              >
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpenNavGroup(null)}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:hover:bg-white/10 ${pathname === link.href ? 'bg-emerald-50 text-emerald-900 dark:bg-white/10 dark:text-white' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="hidden min-w-0 flex-1 items-center gap-2 lg:flex xl:gap-3">
          <div className="hidden xl:block"><OnlinePill /></div>
          <LanguageToggle />
          {appRole ? (
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <span className="max-w-24 truncate text-sm font-semibold text-white xl:max-w-36" title={displayName ?? undefined}>
                {displayName ?? (lang === 'en' ? 'Account' : 'Tài khoản')}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex shrink-0 items-center rounded-full border border-white/25 bg-emerald-900/70 px-3 py-2 text-sm font-bold text-white transition hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"
              >
                {signingOut
                  ? (lang === 'en' ? 'Signing out…' : 'Đang đăng xuất…')
                  : (lang === 'en' ? 'Sign out' : 'Đăng xuất')}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white shadow-md transition duration-150 hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {lang === 'en' ? 'Sign In' : 'Đăng nhập'} <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <LanguageToggle />
          <button
            type="button"
            aria-label={mobileOpen ? (lang === 'en' ? 'Close menu' : 'Đóng menu') : (lang === 'en' ? 'Open menu' : 'Mở menu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/40 bg-emerald-900/60 text-xl transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            <span aria-hidden="true">{mobileOpen ? '×' : '☰'}</span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        aria-label={lang === 'en' ? 'Mobile navigation' : 'Điều hướng di động'}
        aria-hidden={!mobileOpen}
        className={`absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] origin-top overflow-y-auto border-b border-emerald-200 bg-white p-4 text-gray-900 shadow-xl transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none lg:hidden ${mobileOpen ? 'visible scale-y-100 opacity-100' : 'invisible pointer-events-none scale-y-0 opacity-0'}`}
      >
          <div className="mx-auto max-w-xl space-y-2">
            <SubjectSwitcher current={currentSubject} mobile onNavigate={() => setMobileOpen(false)} />
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${pathname === link.href ? 'bg-emerald-50 text-emerald-900' : 'text-gray-800'}`}
              >
                {link.label}
              </Link>
            ))}
            {teacherLinks.length > 0 && (
              <div data-nav-group="teacher">
                <button
                  type="button"
                  aria-expanded={teacherMenuOpen}
                  aria-controls="mobile-teacher-navigation"
                  onClick={() => toggleNavGroup('teacher')}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${teacherRouteActive ? 'bg-emerald-50 text-emerald-900' : 'text-gray-800'}`}
                >
                  {lang === 'en' ? 'Teacher' : 'Giáo viên'}
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${teacherMenuOpen ? 'rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                <div
                  id="mobile-teacher-navigation"
                  aria-hidden={!teacherMenuOpen}
                  className={`ml-3 mt-1 overflow-hidden border-l border-emerald-200 transition-[max-height,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${teacherMenuOpen ? 'visible max-h-80 opacity-100' : 'invisible max-h-0 opacity-0'}`}
                >
                  <div className="space-y-1 pl-3">
                    {teacherLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => { setOpenNavGroup(null); setMobileOpen(false); }}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${pathname === link.href ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700'}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {adminLinks.length > 0 && (
              <div data-nav-group="admin">
                <button
                  type="button"
                  aria-expanded={adminMenuOpen}
                  aria-controls="mobile-admin-navigation"
                  onClick={() => toggleNavGroup('admin')}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${adminRouteActive ? 'bg-emerald-50 text-emerald-900' : 'text-gray-800'}`}
                >
                  Admin
                  <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={`h-4 w-4 transition-transform motion-reduce:transition-none ${adminMenuOpen ? 'rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.22 7.47a.75.75 0 0 1 1.06 0L10 11.19l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 8.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>
                <div
                  id="mobile-admin-navigation"
                  aria-hidden={!adminMenuOpen}
                  className={`ml-3 mt-1 overflow-hidden border-l border-emerald-200 transition-[max-height,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${adminMenuOpen ? 'visible max-h-80 opacity-100' : 'invisible max-h-0 opacity-0'}`}
                >
                  <div className="space-y-1 pl-3">
                    {adminLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => { setOpenNavGroup(null); setMobileOpen(false); }}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${pathname === link.href ? 'bg-emerald-50 text-emerald-900' : 'text-gray-700'}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {appRole && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-200 px-2 pt-4">
                <span className="min-w-0 truncate text-sm font-bold text-gray-900" title={displayName ?? undefined}>
                  {displayName ?? (lang === 'en' ? 'Account' : 'Tài khoản')}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 transition hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {signingOut
                    ? (lang === 'en' ? 'Signing out…' : 'Đang đăng xuất…')
                    : (lang === 'en' ? 'Sign out' : 'Đăng xuất')}
                </button>
              </div>
            )}
            {!appRole && (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl bg-emerald-700 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                {lang === 'en' ? 'Sign In' : 'Đăng nhập'} →
              </Link>
            )}
          </div>
      </nav>
    </header>
  );
}
