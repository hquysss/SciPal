'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { LanguageToggle } from './LanguageToggle';
import { OnlinePill } from './OnlinePill';
import { SubjectSwitcher } from './SubjectSwitcher';
import type { SubjectSlug } from '@/lib/subject-config';

interface NavBarProps {
  currentSubject?: SubjectSlug;
}

export function NavBar({ currentSubject }: NavBarProps) {
  const { lang } = useLanguage();
  const pathname = usePathname();

  // Hide global navbar on full-screen login portal
  if (pathname === '/login') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-600/30 bg-emerald-700/95 backdrop-blur-md text-white shadow-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 sm:gap-6 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3 font-bold text-white group">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-800/80 border border-emerald-400/30 text-xl shadow-inner group-hover:scale-105 transition duration-150">
            🍀
          </span>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight leading-tight">
              SciPal
            </span>
            <span className="text-xs uppercase tracking-wider text-emerald-200/90 font-mono font-semibold hidden sm:block">
              {lang === 'en' ? 'Natural Sciences' : 'Khoa học tự nhiên'}
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <SubjectSwitcher current={currentSubject} />
          <Link
            href="/glossary"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            {lang === 'en' ? 'Glossary' : 'Từ điển'}
          </Link>
          <Link
            href="/exam"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            {lang === 'en' ? 'Exams' : 'Thi thử'}
          </Link>
          <Link
            href="/progress"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition hidden md:block"
          >
            {lang === 'en' ? 'Progress' : 'Tiến trình'}
          </Link>
          <Link
            href="/profile"
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            {lang === 'en' ? 'Profile' : 'Hồ sơ'}
          </Link>
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2.5 sm:gap-3.5">
          <OnlinePill />
          <LanguageToggle />
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition duration-150"
            style={{
              backgroundColor: 'var(--accent, #16a34a)',
              boxShadow: '0 2px 10px -2px rgba(0, 0, 0, 0.3)',
            }}
          >
            <span>{lang === 'en' ? 'Sign In' : 'Đăng nhập'}</span>
            <span className="text-xs" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
