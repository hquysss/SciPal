'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, BookOpen, House, Users, ReceiptText, ChevronDown, ChevronUp, CircleHelp, ClipboardCheck, FlaskConical, Gauge, Library, LineChart, Menu, MessageCircleQuestion, School, Tag, Trophy, UserRound, X } from 'lucide-react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LanguageToggle } from './LanguageToggle';
import { NotificationBell } from '@/features/games/NotificationBell';
import { ThemeToggle } from './ThemeToggle';
import { LogoutButton, LogoutConfirm } from './LogoutButton';
import { OnlinePill } from './OnlinePill';
import navStyles from './navbar.module.css';
import type { SubjectSlug } from '@/lib/subject-config';
import { createBrowserClient } from '@/lib/supabase';
import { adoptAccountLevel, forgetAccountLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';
import { countOpenSimulationRequests } from '@/features/authoring/simulationRequests/api';
import { FRIENDS_CHANGED_EVENT, listFriends } from '@/features/friends/friendsApi';
import { fetchMyPlan, PLAN_NAME } from '@/features/billing/billingApi';
import type { BillingAccount } from '@scipal/types';

/** The admin entry: one link to the page with every admin tool, with the requests still waiting. */
export function adminLinkLabel(lang: 'en' | 'vi', open: number): string {
  const label = lang === 'en' ? 'Admin' : 'Quản trị';
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

/** The account's own avatar (set on the profile page), or null for the initial. */
export function getAvatarUrl(user: AuthUser | null): string | null {
  const url = user?.user_metadata?.avatar_url;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/** "Giáo sư AI" in the main links, for everyone: a visitor gets a trial question, then signs in. */
export function tutorLink(lang: 'en' | 'vi') {
  return { href: '/tutor', label: lang === 'en' ? 'Professor' : 'Giáo sư' };
}

/** Pricing sits in the "More" menu, for everyone (admins keep it to check the page). */
export function pricingLink(lang: 'en' | 'vi') {
  return { href: '/pricing', label: lang === 'en' ? 'Pricing' : 'Bảng giá' };
}

/** "Cộng đồng (2)": friend requests waiting for an answer. */
export function communityLabel(lang: 'en' | 'vi', pending: number) {
  const base = lang === 'en' ? 'Community' : 'Cộng đồng';
  return pending > 0 ? `${base} (${pending})` : base;
}

/** Learn: what a student opens to study, as a category with a line saying what each page is for. */
export function learnLinks(lang: 'en' | 'vi') {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  return [
    { href: '/subjects', label: label('Subjects', 'Môn học'), hint: label('Lessons by subject', 'Bài học theo môn') },
    { href: '/lab', label: label('Simulations', 'Mô phỏng'), hint: label('Try it, see it move', 'Thử nghiệm trực quan') },
    { href: '/exam', label: label('Exams', 'Thi thử'), hint: label('Practise with graded tests', 'Luyện đề có chấm điểm') },
    { ...tutorLink(lang), hint: label('Ask when you are stuck', 'Hỏi khi bí bài') },
  ];
}

/** Community is its own category, for members: chat, grade rooms, friends. */
export function communityLink(lang: 'en' | 'vi') {
  return { href: '/community', label: lang === 'en' ? 'Community' : 'Cộng đồng' };
}

/** The reference menu: pages to look things up in, the same for everyone. Personal pages live in the account menu. */
export function moreLinks(lang: 'en' | 'vi') {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  return [
    { href: '/glossary', label: label('Glossary', 'Từ điển'), hint: label('Scientific terms, EN and VI', 'Thuật ngữ khoa học song ngữ') },
    { ...pricingLink(lang), hint: label('Plans and what they include', 'Các gói và quyền lợi') },
    { href: '/help', label: label('Help', 'Hướng dẫn'), hint: label('How to use SciPal', 'Cách dùng SciPal') },
  ];
}

/** The account menu (and the mobile "Mine" group): everything personal, in two sections. */
export function accountLinks(lang: 'en' | 'vi', role: string | null) {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  // Teachers and admins reach classes from their own menu, and have no plan quota page.
  const isStudent = role !== null && role !== 'teacher' && role !== 'admin';
  return [
    { href: '/progress', label: label('Progress', 'Tiến trình'), group: 'study' as const },
    { href: '/games', label: label('Gamification', 'Gamification'), group: 'study' as const },
    ...(isStudent ? [{ href: '/classes', label: label('My classes', 'Lớp của em'), group: 'study' as const }] : []),
    { href: '/profile', label: label('Profile', 'Hồ sơ'), group: 'account' as const },
    ...(isStudent ? [{ href: '/profile/plan', label: label('My plan', 'Gói của tôi'), group: 'account' as const }] : []),
    ...(role !== 'admin' ? [{ href: '/profile/orders', label: label('Orders', 'Đơn hàng'), group: 'account' as const }] : []),
  ];
}

/**
 * The teacher and admin menus for a role (empty for others). Lesson and exam authoring open from the Subjects and Exams pages,
 * plan prices from Pricing (features/nav/StaffLinks), so they are not repeated here.
 */
export function roleLinks(role: string | null, lang: 'en' | 'vi', openRequests: number) {
  const label = (en: string, vi: string) => (lang === 'en' ? en : vi);
  const teacherLinks = role === 'teacher' ? [
    { href: '/teacher/classes', label: label('Classes', 'Lớp học') },
    { href: '/teacher/simulation-requests', label: label('Simulation requests', 'Đề xuất mô phỏng') },
  ] : [];
  const adminLinks = role === 'admin' ? [{ href: '/admin', label: adminLinkLabel(lang, openRequests) }] : [];
  return { teacherLinks, adminLinks };
}

/** Remembers that the reader folded the bar away, for a full-bleed page like the landing hero. */
const NAV_HIDDEN_KEY = 'scipal_nav_hidden';

export function NavBar({ currentSubject }: NavBarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [barHidden, setBarHidden] = useState(false);
  const [wideBar, setWideBar] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<'admin' | 'teacher' | 'account' | 'more' | 'learn' | null>(null);
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<BillingAccount | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [openRequests, setOpenRequests] = useState(0);
  const [pendingFriends, setPendingFriends] = useState(0);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const openNavTriggerRef = useRef<HTMLButtonElement>(null);

  // The fold-away toggle exists only where the full bar shows (matches the 1280px rule in the stylesheet).
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1280px)');
    const sync = () => setWideBar(wide.matches);
    sync();
    wide.addEventListener('change', sync);
    return () => wide.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    try {
      setBarHidden(window.localStorage.getItem(NAV_HIDDEN_KEY) === '1');
    } catch {}
  }, []);

  const toggleBar = () => {
    setBarHidden((hidden) => {
      try {
        window.localStorage.setItem(NAV_HIDDEN_KEY, hidden ? '0' : '1');
      } catch {}
      return !hidden;
    });
    setMobileOpen(false);
  };

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

  // Friend requests waiting for an answer; recounted on navigation and after the friends page acts.
  useEffect(() => {
    if (!appRole) {
      setPendingFriends(0);
      return;
    }
    let live = true;
    const refresh = () =>
      void listFriends().then((result) => {
        if (live && result.ok) setPendingFriends(result.data.incoming.length);
      });
    refresh();
    window.addEventListener(FRIENDS_CHANGED_EVENT, refresh);
    return () => {
      live = false;
      window.removeEventListener(FRIENDS_CHANGED_EVENT, refresh);
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
          setAvatarUrl(getAvatarUrl(user));
          setEmail(user?.email ?? null);
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
          setAvatarUrl(null);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) {
          const user = session?.user ?? null;
          setAppRole(getAppRole(user));
          setDisplayName(getDisplayName(user));
          setAvatarUrl(getAvatarUrl(user));
          setEmail(user?.email ?? null);
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
          setAvatarUrl(null);
    }
  }, [pathname]);

  // The plan line in the account menu: who pays through when. Admins have no plan; a failed lookup just hides the line.
  useEffect(() => {
    if (!appRole || appRole === 'admin') {
      setPlan(null);
      return;
    }
    let live = true;
    void fetchMyPlan().then((result) => {
      if (!result.ok) console.warn('Plan lookup failed', result.status, result.error.en);
      if (live) setPlan(result.ok ? result.data : null);
    });
    return () => {
      live = false;
    };
  }, [appRole]);

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
          setAvatarUrl(null);
      setSigningOut(false);
      setMobileOpen(false);
      setOpenNavGroup(null);
      router.push('/login');
      router.refresh();
    }
  };

  if (pathname === '/login') return null;

  const navLang = lang === 'en' ? 'en' : 'vi';
  const t = (en: string, vi: string) => (lang === 'en' ? en : vi);
  const accountName = displayName ?? t('Account', 'Tài khoản');
  const signedIn = Boolean(appRole);
  // Categories, each with one place: Learn and Resources are menus, Community a link, My stuff is the avatar menu, staff after a divider.
  const learn = learnLinks(navLang);
  // The Subjects entry stays marked inside any subject or lesson, not only on /subjects.
  const subjectsActive = pathname === '/subjects' || Boolean(currentSubject ?? params?.subject);
  const inSection = (href: string) => (href === '/subjects' ? subjectsActive : pathname === href || pathname.startsWith(`${href}/`));
  const learnActive = learn.some((link) => inSection(link.href));
  const community = communityLink(navLang);
  const communityActive = pathname === community.href;
  const communityText = communityLabel(navLang, pendingFriends);
  const more = moreLinks(navLang);
  const moreActive = more.some((link) => pathname === link.href);
  const mine = accountLinks(navLang, appRole);
  const study = mine.filter((link) => link.group === 'study');
  const accountItems = mine.filter((link) => link.group === 'account');
  const { teacherLinks, adminLinks } = roleLinks(appRole, navLang, openRequests);
  const hasStaff = teacherLinks.length > 0 || adminLinks.length > 0;
  const teacherRouteActive = teacherLinks.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
  const adminRouteActive = pathname === '/admin' || pathname.startsWith('/admin/');
  const accountMenuOpen = openNavGroup === 'account';
  // A loaded account with no plan on record is on the free plan of its role.
  const planCode = plan ? plan.plan ?? (plan.role === 'teacher' ? 'teacher_free' : 'student_free') : null;
  const planName = planCode ? t(PLAN_NAME[planCode]?.en ?? planCode, PLAN_NAME[planCode]?.vi ?? planCode) : null;
  // The plan and its end date; until it loads (or when it cannot), the role, so the line never goes missing.
  const roleLabel = appRole === 'admin' ? 'Admin' : appRole === 'teacher' ? t('Teacher', 'Giáo viên') : t('Student', 'Học sinh');
  const planDetail = appRole === 'admin'
    ? t('no limits', 'không giới hạn')
    : planName
    ? plan?.paidThrough
      ? `${planName} · ${t('until', 'đến')} ${new Date(plan.paidThrough).toLocaleDateString(lang === 'en' ? 'en-GB' : 'vi-VN')}`
      : planName
    : null;
  const roleClass = appRole === 'admin' ? navStyles.roleAdmin : appRole === 'teacher' ? navStyles.roleTeacher : navStyles.roleStudent;
  const teacherMenuOpen = openNavGroup === 'teacher';
  const toggleNavGroup = (group: 'admin' | 'teacher' | 'account' | 'more' | 'learn', trigger: HTMLButtonElement) => {
    openNavTriggerRef.current = trigger;
    setOpenNavGroup((current) => current === group ? null : group);
  };
  const countBadge = pendingFriends > 0 ? (
    <span aria-hidden="true" className="ml-0.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-danger-surface px-1 text-xs font-bold leading-none text-danger ring-1 ring-danger">{pendingFriends}</span>
  ) : null;

  const icons: Record<string, ReactNode> = {
    '/subjects': <Library aria-hidden="true" size={16} />,
    '/lab': <FlaskConical aria-hidden="true" size={16} />,
    '/exam': <ClipboardCheck aria-hidden="true" size={16} />,
    '/tutor': <MessageCircleQuestion aria-hidden="true" size={16} />,
    '/glossary': <BookOpen aria-hidden="true" size={16} />,
    '/pricing': <Tag aria-hidden="true" size={16} />,
    '/help': <CircleHelp aria-hidden="true" size={16} />,
    '/profile': <UserRound aria-hidden="true" size={16} />,
    '/progress': <LineChart aria-hidden="true" size={16} />,
    '/games': <Trophy aria-hidden="true" size={16} />,
    '/classes': <School aria-hidden="true" size={16} />,
    '/profile/plan': <Gauge aria-hidden="true" size={16} />,
    '/': <House aria-hidden="true" size={16} />,
    '/community': <Users aria-hidden="true" size={16} />,
    '/profile/orders': <ReceiptText aria-hidden="true" size={16} />,
  };
  const accountHeader = (
  <div className={navStyles.menuHeader}>
    <span aria-hidden="true" className={navStyles.menuAvatar}>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- media store image
        <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        accountName.trim().charAt(0).toUpperCase()
      )}
    </span>
    <span className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-bold text-ink">{accountName}</span>
      {email && <span className="truncate text-xs text-ink-muted">{email}</span>}
      {appRole && (
        <span className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-success" />
          <span className="truncate">
            <span className={roleClass}>{roleLabel}</span>
            {planDetail && ` · ${planDetail}`}
          </span>
        </span>
      )}
    </span>
  </div>
  );
  const themeRow = (
    <div className={`${navStyles.menuGroup} flex items-center justify-between gap-3 px-3 py-3`}>
      <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{t('Theme', 'Giao diện')}</span>
      <ThemeToggle />
    </div>
  );
  const closeMenus = () => setOpenNavGroup(null);
  const heading = (title: string) => <p className="px-3 pb-1 pt-2 text-xs font-extrabold uppercase tracking-wider text-action">{title}</p>;
  const menuLink = (link: { href: string; label: string; hint?: string }, icon: ReactNode = icons[link.href]) => (
    <Link key={link.href} href={link.href} prefetch={false} onClick={closeMenus} aria-current={pathname === link.href ? 'page' : undefined} className={navStyles.menuItem}>
      {icon}
      <span className="flex min-w-0 flex-col">
        <span>{link.label}</span>
        {link.hint && <span className="text-xs font-medium text-ink-muted">{link.hint}</span>}
      </span>
    </Link>
  );
  /** A bar category that opens a short list; the active one stays marked while you are inside it. */
  const barMenu = (id: 'learn' | 'more' | 'teacher', label: string, active: boolean, children: ReactNode) => {
    const open = openNavGroup === id;
    return (
      <div className="relative" data-nav-group={id}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`desktop-${id}-navigation`}
          onClick={(event) => toggleNavGroup(id, event.currentTarget)}
          data-active={active || undefined}
          className={navStyles.navLink}
        >
          {label}
          <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
        </button>
        <div id={`desktop-${id}-navigation`} inert={!open} className={`${navStyles.dropdown} ${navStyles.dropdownWide} ${open ? navStyles.dropdownOpen : ''}`}>
          {children}
        </div>
      </div>
    );
  };

  const mobileSection = (title: string, children: ReactNode) => (
    <div role="group" aria-label={title} className={navStyles.menuGroup}>
      {heading(title)}
      {children}
    </div>
  );

  return (
    <header className={`${navStyles.header} sticky top-0 z-40 w-full text-nav-ink`} data-bar-hidden={barHidden && wideBar ? '' : undefined}>
      <button
        type="button"
        className={navStyles.barToggle}
        onClick={toggleBar}
        aria-pressed={barHidden}
        aria-label={barHidden ? t('Show navigation bar', 'Hiện thanh điều hướng') : t('Hide navigation bar', 'Ẩn thanh điều hướng')}
        title={barHidden ? t('Show navigation bar', 'Hiện thanh điều hướng') : t('Hide navigation bar', 'Ẩn thanh điều hướng')}
      >
        {barHidden ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronUp size={14} aria-hidden="true" />}
      </button>
      <div inert={barHidden && wideBar} className={`${navStyles.bar} relative z-10 mx-auto flex h-14 max-w-5xl xl:max-w-[90rem] items-center justify-between gap-3 px-3 sm:px-4`}>
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

        <nav aria-label={t('Main navigation', 'Điều hướng chính')} className={`${navStyles.navList} hidden items-center gap-1 xl:ml-4 xl:flex`}>
          <Link href="/" prefetch={pathname !== '/'} aria-current={pathname === '/' ? 'page' : undefined} className={navStyles.navLink}>
            {t('Home', 'Trang chủ')}
          </Link>
          {barMenu('learn', t('Learn', 'Học tập'), learnActive, (
            <>
              {heading(t('Learn', 'Học tập'))}
              {learn.map((link) => menuLink(link))}
            </>
          ))}
          {signedIn && (
            <Link href={community.href} prefetch={pathname !== '/'} aria-current={communityActive ? 'page' : undefined} aria-label={communityText} className={navStyles.navLink}>
              {community.label}
              {countBadge}
            </Link>
          )}
          {barMenu('more', t('Resources', 'Tra cứu'), moreActive, (
            <>
              {heading(t('Resources', 'Tra cứu'))}
              {more.map((link) => menuLink(link))}
            </>
          ))}
          {hasStaff && <span aria-hidden="true" className={`${navStyles.divider} mx-1`} />}
          {teacherLinks.length > 0 && barMenu('teacher', t('Teacher', 'Giáo viên'), teacherRouteActive, (
            <>
              {heading(t('Teaching', 'Giảng dạy'))}
              {teacherLinks.map((link) => menuLink(link, <School aria-hidden="true" size={16} />))}
            </>
          ))}
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={pathname !== '/'}
              aria-current={pathname === link.href ? 'page' : undefined}
              data-active={adminRouteActive || undefined}
              className={navStyles.navLink}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={`${navStyles.rise} ml-auto hidden shrink-0 items-center justify-end gap-2 xl:gap-3 xl:flex`} style={{ '--i': 8 } as React.CSSProperties}>
          <OnlinePill />
          {signedIn && <NotificationBell className={navStyles.navLink} />}
          <LanguageToggle />
          {!signedIn && <ThemeToggle />}
          {signedIn ? (
            <div className="relative" data-nav-group="account">
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                aria-controls="desktop-account-menu"
                aria-label={`${t('Account menu', 'Menu tài khoản')} · ${accountName}`}
                title={displayName ?? undefined}
                onClick={(event) => toggleNavGroup('account', event.currentTarget)}
                className={navStyles.account}
              >
                <span aria-hidden="true" className={navStyles.avatar}>
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- media store image
                    <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    accountName.trim().charAt(0).toUpperCase()
                  )}
                </span>
                <span aria-hidden="true" className="max-w-32 truncate max-2xl:hidden">{accountName}</span>
                <ChevronDown aria-hidden="true" className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${accountMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              <div
                id="desktop-account-menu"
                inert={!accountMenuOpen}
                className={`${navStyles.dropdown} ${navStyles.dropdownEnd} ${accountMenuOpen ? navStyles.dropdownOpen : ''}`}
              >
                {accountHeader}
                <div className={navStyles.menuGroup}>{accountItems.map((link) => menuLink(link))}</div>
                <div className={navStyles.menuGroup}>{study.map((link) => menuLink(link))}</div>
                <div className={`${navStyles.menuGroup} flex items-center justify-between gap-3 px-3 py-3`}>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">{t('Theme', 'Giao diện')}</span>
                  <ThemeToggle />
                </div>
                <div className={`${navStyles.menuGroup} px-3 pb-2 pt-3`}>
                  <LogoutButton onClick={() => setConfirmSignOut(true)} busy={signingOut} />
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" prefetch={pathname !== '/'} className={navStyles.primaryPill}>
              <span>{t('Sign In', 'Đăng nhập')}</span>
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          )}
        </div>

        <div className={`${navStyles.rise} flex shrink-0 items-center gap-2 xl:hidden`} style={{ '--i': 1 } as React.CSSProperties}>
          {signedIn && <NotificationBell />}
          <LanguageToggle />
          <button
            type="button"
            aria-label={mobileOpen ? t('Close menu', 'Đóng menu') : t('Open menu', 'Mở menu')}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            ref={mobileMenuButtonRef}
            onClick={() => setMobileOpen((value) => !value)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] text-nav-ink text-xl transition hover:bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-nav-ink"
          >
            {mobileOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        aria-label={t('Mobile navigation', 'Điều hướng di động')}
        inert={!mobileOpen}
        className={`${navStyles.mobilePanel} xl:hidden ${mobileOpen ? navStyles.mobilePanelOpen : ''}`}
      >
        <div className="pb-20">
          {signedIn && <div className="-mx-4 -mt-4 mb-1 overflow-hidden rounded-t-[1.25rem]">{accountHeader}</div>}
          <div className={navStyles.menuGroup}>{menuLink({ href: '/', label: t('Home', 'Trang chủ') })}</div>
          {signedIn && <div className={navStyles.menuGroup}>{accountItems.map((link) => menuLink(link))}</div>}
          {signedIn && <div className={navStyles.menuGroup}>{study.map((link) => menuLink(link))}</div>}
          {mobileSection(t('Learn', 'Học tập'), learn.map((link) => menuLink(link)))}
          {signedIn && mobileSection(t('Connect', 'Kết nối'), menuLink({ href: community.href, label: communityText }))}
          {mobileSection(t('Resources', 'Tra cứu'), more.map((link) => menuLink(link)))}
          {hasStaff && mobileSection(t('Manage', 'Quản lý'), (
            <>
              {teacherLinks.map((link) => menuLink(link, <School aria-hidden="true" size={16} />))}
              {adminLinks.map((link) => menuLink(link, null))}
            </>
          ))}
          {themeRow}
          {signedIn ? (
            <div className={`${navStyles.menuGroup} px-3 pb-2 pt-3`}>
              <LogoutButton onClick={() => setConfirmSignOut(true)} busy={signingOut} />
            </div>
          ) : (
            <Link
              href="/login"
              prefetch={pathname !== '/'}
              onClick={() => setMobileOpen(false)}
              className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-sun to-coral px-4 py-2 text-sm font-extrabold text-ink shadow-[0_10px_24px_-12px_var(--coral)] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              {t('Sign In', 'Đăng nhập')} <ArrowRight aria-hidden="true" size={16} />
            </Link>
          )}
        </div>
      </nav>
      <LogoutConfirm open={confirmSignOut} onClose={() => setConfirmSignOut(false)} onConfirm={() => void handleSignOut()} />
    </header>
  );
}
