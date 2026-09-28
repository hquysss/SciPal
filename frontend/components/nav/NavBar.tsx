'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LanguageToggle } from './LanguageToggle';
import { ThemeToggle } from './ThemeToggle';
import { OnlinePill } from './OnlinePill';
import navStyles from './navbar.module.css';
import type { SubjectSlug } from '@/lib/subject-config';
import { createBrowserClient } from '@/lib/supabase';
import { adoptAccountLevel, forgetAccountLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';
import { countOpenSimulationRequests } from '@/features/authoring/simulationRequests/api';

/** The admin menu entry, with the number of requests still waiting. */
export function requestsLinkLabel(lang: 'en' | 'vi', open: number): string {
  const label = lang === 'en' ? 'Simulation requests' : 'Đề xuất mô phỏng';
  return open > 0 ? `${label} (${open})` : label;
}

interface NavBarProps {
  currentSubject?: SubjectSlug;
}

type AppRole = 'student' | 'teacher' | 'admin';

type AuthUser = {
  id?: string;
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

/** "Gia sư AI" in the main links, for signed-in users only (the tutor needs an account). */
export function tutorLink(signedIn: boolean, lang: 'en' | 'vi') {
  return signedIn ? { href: '/tutor', label: lang === 'en' ? 'AI tutor' : 'Gia sư AI' } : null;
}

/**
 * The main links after Home and Subjects. On the desktop bar Profile is the account button (the
 * avatar), which keeps a full admin bar from overflowing at 1366px; the mobile menu lists it.
 */
export function primaryLinks(lang: 'en' | 'vi', signedIn: boolean, place: 'desktop' | 'mobile') {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  return [
    { href: '/glossary', label: label('Glossary', 'Từ điển') },
    { href: '/exam', label: label('Exams', 'Thi thử') },
    ...(signedIn
      ? [
          tutorLink(true, lang)!,
          { href: '/progress', label: label('Progress', 'Tiến trình') },
          ...(place === 'mobile' ? [{ href: '/profile', label: label('Profile', 'Hồ sơ') }] : []),
        ]
      : []),
  ];
}

/** The teacher and admin menus for a role (empty for others). */
export function roleLinks(role: string | null, lang: 'en' | 'vi', openRequests: number) {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  const teacherLinks = role === 'teacher' ? [
    { href: '/teacher/classes', label: label('Classes', 'Lớp học') },
    { href: '/teacher/lessons', label: label('Lesson Studio', 'Soạn bài') },
    { href: '/teacher/exams', label: label('Exams', 'Đề thi') },
    { href: '/teacher/simulation-requests', label: label('Simulation requests', 'Đề xuất mô phỏng') },
  ] : [];
  const adminLinks = role === 'admin' ? [
    { href: '/admin/accounts', label: label('Accounts', 'Quản lý tài khoản') },
    { href: '/admin/billing', label: label('Payment reconciliation', 'Đối soát thanh toán') },
    { href: '/teacher/lessons', label: label('Lesson Studio', 'Soạn bài') },
    { href: '/teacher/exams', label: label('Exams', 'Đề thi') },
    { href: '/admin/lessons/review', label: label('Review Queue', 'Duyệt bài') },
    { href: '/admin/topics', label: label('Topics', 'Chủ đề') },
    { href: '/admin/ai', label: label('AI settings', 'Cài đặt AI') },
    { href: '/admin/simulation-requests', label: requestsLinkLabel(lang, openRequests) },
  ] : [];
  return { teacherLinks, adminLinks };
}

export function NavBar({ currentSubject }: NavBarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<'admin' | 'teacher' | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [openRequests, setOpenRequests] = useState(0);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const openNavTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenNavGroup(null);
    setSigningOut(false);
  }, [pathname]);

  // Admins see how many simulation requests wait; refreshed on navigation and after the queue acts.
  useEffect(() => {
    if (appRole !== 'admin') return;
    let live = true;
    const refresh = () =>
      void countOpenSimulationRequests().then((result) => {
        if (live && result.ok) setOpenRequests(result.data.open);
      });
    refresh();
    window.addEventListener('scipal:simulation-requests-changed', refresh);
    return () => {
      live = false;
      window.removeEventListener('scipal:simulation-requests-changed', refresh);
    };
  }, [appRole, pathname]);

  useEffect(() => {
    if (!mobileOpen && !openNavGroup) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openNavGroup) {
        setOpenNavGroup(null);
        openNavTriggerRef.current?.focus();
      } else {
        setMobileOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
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
          if (user?.id) {
            void supabase
              .from('profiles')
              .select('preferred_education_level')
              .eq('id', user.id)
              .maybeSingle()
              .then(({ data: profile, error: profileError }) => {
                if (!mounted || profileError) return;
                adoptAccountLevel(profile?.preferred_education_level, safeSessionStorage(), getShell());
              });
          }
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
      forgetAccountLevel(safeSessionStorage(), getShell());
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

  const homeLinkLabel = lang === 'en' ? 'Home' : 'Trang chủ';
  const subjectsLabel = lang === 'en' ? 'Subjects' : 'Môn học';
  // The Subjects tab stays marked inside any subject or lesson, not only on /subjects.
  const subjectsActive = pathname === '/subjects' || Boolean(currentSubject ?? params?.subject);
  const accountName = displayName ?? (lang === 'en' ? 'Account' : 'Tài khoản');
  const navLang = lang === 'en' ? 'en' : 'vi';
  const links = primaryLinks(navLang, Boolean(appRole), 'desktop');
  const mobileLinks = primaryLinks(navLang, Boolean(appRole), 'mobile');
  const { teacherLinks, adminLinks } = roleLinks(appRole, lang === 'en' ? 'en' : 'vi', openRequests);
  const teacherMenuOpen = openNavGroup === 'teacher';
  const adminMenuOpen = openNavGroup === 'admin';
  const teacherRouteActive = teacherLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const adminRouteActive = adminLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const toggleNavGroup = (group: 'admin' | 'teacher', trigger: HTMLButtonElement) => {
    openNavTriggerRef.current = trigger;
    setOpenNavGroup((current) => current === group ? null : group);
  };

  return (
    <header className={`${navStyles.header} sticky top-0 z-40 w-full bg-nav text-nav-ink`}>
      <div className="relative z-10 mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" prefetch={pathname !== '/'} className={`${navStyles.rise} group flex shrink-0 items-center gap-3 font-bold text-nav-ink`}>
          <Image
            src="/logo.svg"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl shadow-inner transition duration-150 group-hover:scale-105"
            priority
          />
          <span className="text-xl font-black leading-tight tracking-tight">SciPal</span>
        </Link>

        <nav aria-label={lang === 'en' ? 'Main navigation' : 'Điều hướng chính'} className={`${navStyles.navList} hidden items-center gap-1 xl:ml-4 xl:flex`}>
          <Link
            href="/"
            prefetch={pathname !== '/'}
            aria-current={pathname === '/' ? 'page' : undefined}
            className={navStyles.navLink}
          >
            {homeLinkLabel}
          </Link>
          <Link
            href="/subjects"
            prefetch={pathname !== '/'}
            aria-current={pathname === '/subjects' ? 'page' : undefined}
            data-active={subjectsActive || undefined}
            className={navStyles.navLink}
          >
            {subjectsLabel}
          </Link>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={pathname !== '/'}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={navStyles.navLink}
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
                onClick={(event) => toggleNavGroup('teacher', event.currentTarget)}
                data-active={teacherRouteActive || undefined}
                className={navStyles.navLink}
              >
                {lang === 'en' ? 'Teacher' : 'Giáo viên'}
                <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${teacherMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                id="desktop-teacher-navigation"
                aria-hidden={!teacherMenuOpen}
                className={`${navStyles.dropdown} ${teacherMenuOpen ? navStyles.dropdownOpen : ''}`}
              >
                {teacherLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={pathname !== '/'}
                    onClick={() => setOpenNavGroup(null)}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === link.href ? 'bg-surface-sunken text-action' : 'text-ink'}`}
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
                onClick={(event) => toggleNavGroup('admin', event.currentTarget)}
                data-active={adminRouteActive || undefined}
                className={navStyles.navLink}
              >
                Admin
                <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${adminMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                id="desktop-admin-navigation"
                aria-hidden={!adminMenuOpen}
                className={`${navStyles.dropdown} ${adminMenuOpen ? navStyles.dropdownOpen : ''}`}
              >
                {adminLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch={pathname !== '/'}
                    onClick={() => setOpenNavGroup(null)}
                    aria-current={pathname === link.href ? 'page' : undefined}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === link.href ? 'bg-surface-sunken text-action' : 'text-ink'}`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className={`${navStyles.rise} ml-auto hidden shrink-0 items-center justify-end gap-3 xl:flex`} style={{ '--i': 8 } as React.CSSProperties}>
          <OnlinePill />
          <LanguageToggle />
          <ThemeToggle />
          <span aria-hidden="true" className={navStyles.divider} />
          {appRole ? (
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/profile"
                className={navStyles.account}
                title={displayName ?? undefined}
                aria-label={`${lang === 'en' ? 'Profile' : 'Hồ sơ'} · ${accountName}`}
                aria-current={pathname === '/profile' ? 'page' : undefined}
              >
                <span aria-hidden="true" className={navStyles.avatar}>{accountName.trim().charAt(0).toUpperCase()}</span>
                {/* Below 1536px the avatar stands in for the name so a full admin bar still fits at 1280px. */}
                <span aria-hidden="true" className="max-w-36 truncate max-2xl:hidden">{accountName}</span>
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className={navStyles.ghostButton}
              >
                {signingOut
                  ? (lang === 'en' ? 'Signing out…' : 'Đang đăng xuất…')
                  : (lang === 'en' ? 'Sign out' : 'Đăng xuất')}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={pathname !== '/'}
              className={navStyles.primaryPill}
            >
              <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          )}
        </div>

        <div className={`${navStyles.rise} flex shrink-0 items-center gap-2 xl:hidden`} style={{ '--i': 1 } as React.CSSProperties}>
          <LanguageToggle />
          <button
            type="button"
            aria-label={mobileOpen ? (lang === 'en' ? 'Close menu' : 'Đóng menu') : (lang === 'en' ? 'Open menu' : 'Mở menu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            ref={mobileMenuButtonRef}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--nav-ink)_30%,transparent)] bg-transparent text-nav-ink text-xl transition hover:bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-nav-ink"
          >
            {mobileOpen ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        aria-label={lang === 'en' ? 'Mobile navigation' : 'Điều hướng di động'}
        aria-hidden={!mobileOpen}
        className={`${navStyles.mobilePanel} xl:hidden ${mobileOpen ? navStyles.mobilePanelOpen : ''}`}
      >
          <div className="mx-auto max-w-xl space-y-2">
            <div className="flex justify-end pb-2">
              <ThemeToggle tone="surface" />
            </div>
            <Link
              href="/"
              prefetch={pathname !== '/'}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === '/' ? 'page' : undefined}
              className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === '/' ? 'bg-surface-sunken text-action' : 'text-ink'}`}
            >
              {homeLinkLabel}
            </Link>
            <Link
              href="/subjects"
              prefetch={pathname !== '/'}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === '/subjects' ? 'page' : undefined}
              className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${subjectsActive ? 'bg-surface-sunken text-action' : 'text-ink'}`}
            >
              {subjectsLabel}
            </Link>
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch={pathname !== '/'}
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === link.href ? 'page' : undefined}
                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === link.href ? 'bg-surface-sunken text-action' : 'text-ink'}`}
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
                  onClick={(event) => toggleNavGroup('teacher', event.currentTarget)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${teacherRouteActive ? 'bg-surface-sunken text-action' : 'text-ink'}`}
                >
                  {lang === 'en' ? 'Teacher' : 'Giáo viên'}
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${teacherMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  id="mobile-teacher-navigation"
                  aria-hidden={!teacherMenuOpen}
                  className={`ml-3 mt-1 overflow-hidden border-l border-line transition-[max-height,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${teacherMenuOpen ? 'visible max-h-80 opacity-100' : 'invisible max-h-0 opacity-0'}`}
                >
                  <div className="space-y-1 pl-3">
                    {teacherLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={pathname !== '/'}
                        onClick={() => { setOpenNavGroup(null); setMobileOpen(false); }}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === link.href ? 'bg-surface-sunken text-action' : 'text-ink'}`}
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
                  onClick={(event) => toggleNavGroup('admin', event.currentTarget)}
                  className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-bold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${adminRouteActive ? 'bg-surface-sunken text-action' : 'text-ink'}`}
                >
                  Admin
                  <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${adminMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  id="mobile-admin-navigation"
                  aria-hidden={!adminMenuOpen}
                  className={`ml-3 mt-1 overflow-hidden border-l border-line transition-[max-height,opacity,visibility] duration-200 ease-out motion-reduce:transition-none ${adminMenuOpen ? 'visible max-h-80 opacity-100' : 'invisible max-h-0 opacity-0'}`}
                >
                  <div className="space-y-1 pl-3">
                    {adminLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={pathname !== '/'}
                        onClick={() => { setOpenNavGroup(null); setMobileOpen(false); }}
                        aria-current={pathname === link.href ? 'page' : undefined}
                        className={`block rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${pathname === link.href ? 'bg-surface-sunken text-action' : 'text-ink'}`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {appRole && (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line px-2 pt-4">
                <span className="min-w-0 truncate text-sm font-bold text-ink" title={displayName ?? undefined}>
                  {displayName ?? (lang === 'en' ? 'Account' : 'Tài khoản')}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="min-h-11 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-danger-surface px-4 py-2.5 text-sm font-bold text-danger transition hover:bg-[color-mix(in_srgb,var(--danger-surface),var(--danger)_10%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger disabled:cursor-wait disabled:opacity-60"
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
                prefetch={pathname !== '/'}
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sun to-coral px-4 py-3 text-sm font-extrabold text-ink shadow-[0_10px_24px_-12px_var(--coral)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                {lang === 'en' ? 'Sign In' : 'Đăng nhập'} <ArrowRight aria-hidden="true" size={16} />
              </Link>
            )}
          </div>
      </nav>
    </header>
  );
}
