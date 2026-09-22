import Link from 'next/link';
import { LanguageToggle } from './LanguageToggle';
import { OnlinePill } from './OnlinePill';
import { SubjectSwitcher } from './SubjectSwitcher';
import type { SubjectSlug } from '@/lib/subject-config';

interface NavBarProps {
  currentSubject?: SubjectSlug;
}

export function NavBar({ currentSubject }: NavBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-600/30 bg-emerald-700/95 backdrop-blur-md text-white shadow-xs">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 sm:gap-6 px-4 sm:px-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-white group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800/80 border border-emerald-400/30 text-lg shadow-inner group-hover:scale-105 transition duration-150">
            🍀
          </span>
          <div className="flex flex-col">
            <span className="text-base font-extrabold tracking-tight leading-tight">
              SciPal
            </span>
            <span className="text-[9px] uppercase tracking-wider text-emerald-200/80 font-mono hidden sm:block">
              Khoa học tự nhiên
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 sm:gap-3">
          <SubjectSwitcher current={currentSubject} />
          <Link
            href="/glossary"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition"
          >
            Từ điển
          </Link>
          <Link
            href="/progress"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/90 hover:text-white hover:bg-white/10 transition hidden md:block"
          >
            Tiến trình
          </Link>
        </nav>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <OnlinePill />
          <LanguageToggle />
          <Link
            href="/informatics"
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition duration-150"
            style={{
              backgroundColor: 'var(--accent, #16a34a)',
              boxShadow: '0 2px 8px -2px rgba(0, 0, 0, 0.25)',
            }}
          >
            <span>Học ngay</span>
            <span className="text-[10px]" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
