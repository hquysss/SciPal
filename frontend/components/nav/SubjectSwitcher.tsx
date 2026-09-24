'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import { SUBJECT_CONFIG, type SubjectSlug } from '@/lib/subject-config';

interface SubjectSwitcherProps {
  current?: SubjectSlug;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function SubjectSwitcher({ current, mobile = false, onNavigate }: SubjectSwitcherProps) {
  const params = useParams();
  const pathname = usePathname();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const activeSlug = current ?? (params?.subject as SubjectSlug | undefined);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open || mobile) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        rootRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open, mobile]);

  const subjects = Object.values(SUBJECT_CONFIG).map((subject) => {
    const active = subject.slug === activeSlug;
    const content = (
      <>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
          style={{ backgroundColor: subject.accentColor }}
          aria-hidden="true"
        >
          {subject.icon}
        </span>
        <span className="min-w-0 flex-1 font-semibold">
          {lang === 'en' ? subject.nameEn : subject.nameVi}
        </span>
        {subject.status === 'upcoming' && (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-[11px] text-gray-500">
            {lang === 'en' ? 'Soon' : 'Sắp ra'}
          </span>
        )}
        {active && <span className="h-2 w-2 rounded-full bg-emerald-600" aria-hidden="true" />}
      </>
    );

    return subject.status === 'active' ? (
      <Link
        key={subject.slug}
        href={`/${subject.slug}`}
        onClick={() => {
          setOpen(false);
          onNavigate?.();
        }}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 ${active ? 'bg-emerald-50 text-emerald-950' : 'text-gray-800'}`}
      >
        {content}
      </Link>
    ) : (
      <div key={subject.slug} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-500 opacity-65">
        {content}
      </div>
    );
  });

  if (mobile) {
    return (
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-2">
        <p className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-emerald-900">
          {lang === 'en' ? 'Explore subjects' : 'Khám phá môn học'}
        </p>
        {subjects}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="subject-switcher-list"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-white/95 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <span>{lang === 'en' ? 'Explore Subjects' : 'Khám phá môn học'}</span>
        <span className={`text-xs text-white/70 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      {open && (
        <div
          id="subject-switcher-list"
          className="absolute left-0 top-full z-50 w-64 rounded-2xl border border-gray-100 bg-white p-2 text-gray-900 shadow-xl"
        >
          <p className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-gray-500">
            {lang === 'en' ? 'Natural Sciences' : 'Môn khoa học tự nhiên'}
          </p>
          {subjects}
        </div>
      )}
    </div>
  );
}
