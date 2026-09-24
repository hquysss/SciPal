'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LanguageToggle } from './LanguageToggle';
import { OnlinePill } from './OnlinePill';
import { SubjectSwitcher } from './SubjectSwitcher';
import type { SubjectSlug } from '@/lib/subject-config';
import { createBrowserClient } from '@/lib/supabase';

interface NavBarProps {
  currentSubject?: SubjectSlug;
}

export function NavBar({ currentSubject }: NavBarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [mobileOpen]);

  useEffect(() => {
    if (pathname === '/login') return;
    let mounted = true;
    try {
      const supabase = createBrowserClient();
      void supabase.auth.getUser().then(({ data }) => {
        if (mounted) setSignedIn(Boolean(data.user));
      }).catch(() => {
        if (mounted) setSignedIn(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (mounted) setSignedIn(Boolean(session));
      });
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } catch {
      setSignedIn(false);
    }
  }, [pathname]);

  if (pathname === '/login') return null;

  const links = [
    { href: '/glossary', label: lang === 'en' ? 'Glossary' : 'Từ điển' },
    { href: '/exam', label: lang === 'en' ? 'Exams' : 'Thi thử' },
    { href: '/progress', label: lang === 'en' ? 'Progress' : 'Tiến trình' },
    { href: '/profile', label: lang === 'en' ? 'Profile' : 'Hồ sơ' },
  ];

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
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex xl:gap-3">
          <div className="hidden xl:block"><OnlinePill /></div>
          <LanguageToggle />
          {!signedIn && (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-900 px-4 py-2 text-sm font-bold text-white shadow-md transition duration-150 hover:bg-emerald-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label={lang === 'en' ? 'Mobile navigation' : 'Điều hướng di động'}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-emerald-200 bg-white p-4 text-gray-900 shadow-xl lg:hidden"
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
            {!signedIn && (
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
      )}
    </header>
  );
}
