'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookA, ClipboardCheck, FilePenLine, NotebookPen, Settings2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { buttonVariants } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase';

// Management entry points on the pages they manage, instead of more menu items: lesson authoring
// on Subjects, exam authoring on Exams, glossary terms on the Glossary (teachers and admins), plan
// limits and prices on Pricing (admins). Showing a button is only a convenience; the pages themselves check the role.

export type StaffPlace = 'subjects' | 'exams' | 'pricing' | 'glossary';
type Copy = { vi: string; en: string };
export type StaffLink = { href: string; label: Copy; Icon: typeof NotebookPen; primary?: boolean };

const AUTHOR_ROLES = new Set(['teacher', 'admin']);

export function staffLinks(place: StaffPlace, role: string | null): StaffLink[] {
  if (!role) return [];
  if (place === 'subjects' && AUTHOR_ROLES.has(role)) {
    return [
      { href: '/teacher/lessons', label: { vi: 'Soạn bài', en: 'Write lessons' }, Icon: NotebookPen, primary: true },
      ...(role === 'admin' ? [{ href: '/admin/lessons/review', label: { vi: 'Duyệt bài', en: 'Review lessons' }, Icon: ClipboardCheck }] : []),
    ];
  }
  if (place === 'exams' && AUTHOR_ROLES.has(role)) {
    return [{ href: '/exam/manage', label: { vi: 'Quản lý đề thi', en: 'Manage exams' }, Icon: FilePenLine, primary: true }];
  }
  if (place === 'glossary' && AUTHOR_ROLES.has(role)) {
    return role === 'admin'
      ? [{ href: '/admin/terms', label: { vi: 'Thêm & duyệt thuật ngữ', en: 'Add & review terms' }, Icon: BookA, primary: true }]
      : [{ href: '/teacher/terms', label: { vi: 'Thêm thuật ngữ', en: 'Add terms' }, Icon: BookA, primary: true }];
  }
  if (place === 'pricing' && role === 'admin') {
    return [{ href: '/admin/plans', label: { vi: 'Quản lý giá gói', en: 'Manage plans' }, Icon: Settings2, primary: true }];
  }
  return [];
}

export function StaffLinksView({ links }: { links: StaffLink[] }) {
  const { t } = useLanguage();
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {links.map(({ href, label, Icon, primary }) => (
        <Link key={href} href={href} className={buttonVariants({ variant: primary ? 'default' : 'outline' })}>
          <Icon aria-hidden="true" />
          {t(label)}
        </Link>
      ))}
    </div>
  );
}

/** The buttons for the signed-in role, read from the local session (no request). */
export function StaffLinks({ place }: { place: StaffPlace }) {
  const [role, setRole] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    createBrowserClient()
      .auth.getSession()
      .then(({ data }) => {
        const value = data.session?.user.app_metadata?.app_role;
        if (live) setRole(typeof value === 'string' ? value : null);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return <StaffLinksView links={staffLinks(place, role)} />;
}
