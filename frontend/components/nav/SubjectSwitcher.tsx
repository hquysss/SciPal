'use client';

import type React from 'react';
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
          data-subject-scope=""
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_14%,var(--surface))] text-xs font-black text-accent-ink"
          style={{ '--accent': subject.accentColor } as React.CSSProperties}
          aria-hidden="true"
        >
          {subject.icon}
        </span>
        <span className="min-w-0 flex-1 font-semibold">
          {lang === 'en' ? subject.nameEn : subject.nameVi}
        </span>
        {subject.status === 'upcoming' && (
          <span className="rounded-md bg-surface-sunken px-2 py-0.5 font-mono text-[11px] text-ink-muted">
            {lang === 'en' ? 'Soon' : 'Sắp ra'}
          </span>
        )}
        {active && <span className="h-2 w-2 rounded-full bg-action" aria-hidden="true" />}
      </>
    );

    return subject.status === 'active' ? (
      <Link
        key={subject.slug}
        href={`/${subject.slug}`}
        prefetch={pathname !== '/'}
        onClick={() => {
          setOpen(false);
          onNavigate?.();
        }}
        aria-current={active ? 'page' : undefined}
        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus ${active ? 'bg-surface-sunken text-action' : 'text-ink'}`}
      >
        {content}
      </Link>
    ) : (
      <div key={subject.slug} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-muted opacity-65">
        {content}
      </div>
    );
  });

  if (mobile) {
    return (
      <div className="rounded-2xl border border-line bg-surface-sunken p-2">
        <p className="px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider text-action">
          {lang === 'en' ? 'Subjects' : 'Môn học'}
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
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-nav-ink transition hover:bg-[color-mix(in_srgb,var(--nav-ink)_12%,transparent)] hover:text-nav-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nav-ink"
      >
        <span>{lang === 'en' ? 'Subjects' : 'Môn học'}</span>
        <span className={`text-xs text-nav-ink transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} aria-hidden="true">▼</span>
      </button>

      <div
        id="subject-switcher-list"
        aria-hidden={!open}
        className={`absolute left-0 top-full z-50 mt-2 w-64 origin-top rounded-2xl border border-line bg-surface p-2 text-ink shadow-xl transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none ${open ? 'visible scale-y-100 opacity-100' : 'invisible pointer-events-none scale-y-0 opacity-0'}`}
      >
        {subjects}
      </div>
    </div>
  );
}
