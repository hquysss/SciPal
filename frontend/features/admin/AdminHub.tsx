'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  BookA, Bot, ClipboardCheck, FlaskConical, FolderTree, Library, NotebookPen, ReceiptText, Settings2, ToggleRight, Users, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { countOpenSimulationRequests } from '@/features/authoring/simulationRequests/api';

// Every admin tool in one place. The navbar and the profile link here instead of listing each tool;
// each tool page still checks the role itself.

type Copy = { vi: string; en: string };
type Tool = { href: string; label: Copy; hint: Copy; Icon: LucideIcon; badge?: 'simulation' };
type Group = { title: Copy; tools: Tool[] };

export const ADMIN_GROUPS: Group[] = [
  {
    title: { vi: 'Người dùng', en: 'People' },
    tools: [
      { href: '/admin/accounts', label: { vi: 'Tài khoản', en: 'Accounts' }, hint: { vi: 'Vai trò, hạn mức riêng, yêu cầu làm giáo viên', en: 'Roles, own limits, teacher requests' }, Icon: Users },
    ],
  },
  {
    title: { vi: 'Nội dung', en: 'Content' },
    tools: [
      { href: '/admin/lessons/review', label: { vi: 'Duyệt bài', en: 'Review lessons' }, hint: { vi: 'Bài giáo viên gửi chờ xuất bản', en: 'Lessons waiting to publish' }, Icon: ClipboardCheck },
      { href: '/teacher/lessons', label: { vi: 'Soạn bài', en: 'Lesson studio' }, hint: { vi: 'Viết và sửa bài học', en: 'Write and edit lessons' }, Icon: NotebookPen },
      { href: '/admin/subjects', label: { vi: 'Môn học', en: 'Subjects' }, hint: { vi: 'Xóa hoặc khôi phục môn, môn có bài xếp trước', en: 'Delete or restore subjects, those with lessons first' }, Icon: Library },
      { href: '/admin/topics', label: { vi: 'Chủ đề', en: 'Topics' }, hint: { vi: 'Chủ đề theo môn và lớp', en: 'Topics by subject and grade' }, Icon: FolderTree },
      { href: '/admin/terms', label: { vi: 'Thuật ngữ', en: 'Glossary terms' }, hint: { vi: 'Thêm và duyệt từ điển', en: 'Add and review terms' }, Icon: BookA },
      { href: '/admin/simulation-requests', label: { vi: 'Đề xuất mô phỏng', en: 'Simulation requests' }, hint: { vi: 'Giáo viên đề xuất mô phỏng mới', en: 'New simulations teachers ask for' }, Icon: FlaskConical, badge: 'simulation' },
    ],
  },
  {
    title: { vi: 'Gói & thanh toán', en: 'Plans & payments' },
    tools: [
      { href: '/admin/plans', label: { vi: 'Hạn mức & giá gói', en: 'Plans & prices' }, hint: { vi: 'Lượt dùng, giá, quyền lợi', en: 'Limits, prices, benefits' }, Icon: Settings2 },
      { href: '/admin/billing', label: { vi: 'Đối soát thanh toán', en: 'Payment reconciliation' }, hint: { vi: 'Giao dịch payOS, xử lý sai lệch', en: 'payOS payments, mismatches' }, Icon: ReceiptText },
    ],
  },
  {
    title: { vi: 'Hệ thống', en: 'System' },
    tools: [
      { href: '/admin/ai', label: { vi: 'Cài đặt AI', en: 'AI settings' }, hint: { vi: 'Giáo sư SciPal, dịch tự động, hội thoại', en: 'Professor, translation, conversations' }, Icon: Bot },
      { href: '/admin/feedback', label: { vi: 'Đánh giá website', en: 'Website reviews' }, hint: { vi: 'Sao trung bình, góp ý và tài khoản gửi', en: 'Average stars, comments and sending accounts' }, Icon: ClipboardCheck },
      { href: '/admin/site', label: { vi: 'Bật/tắt tính năng', en: 'Site switches' }, hint: { vi: 'Đăng ký, từ điển, thi thử, bảng giá…', en: 'Sign-up, glossary, exams, pricing…' }, Icon: ToggleRight },
    ],
  },
];

export function AdminHub() {
  const { t } = useLanguage();
  const [openRequests, setOpenRequests] = useState(0);

  useEffect(() => {
    let live = true;
    void countOpenSimulationRequests().then((result) => {
      if (live && result.ok) setOpenRequests(result.data.open);
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-20 pt-8 sm:px-6 sm:pt-10">
      <header className="max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight text-ink">{t({ vi: 'Quản trị', en: 'Admin' })}</h1>
        <p className="mt-2 text-base text-ink-muted">
          {t({ vi: 'Mọi công cụ quản trị SciPal ở một chỗ.', en: 'Every SciPal admin tool in one place.' })}
        </p>
      </header>

      {ADMIN_GROUPS.map((group) => (
        <section key={group.title.en} aria-labelledby={`admin-${group.title.en}`} className="flex flex-col gap-3">
          <h2 id={`admin-${group.title.en}`} className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t(group.title)}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.tools.map(({ href, label, hint, Icon, badge }) => {
              const count = badge === 'simulation' ? openRequests : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex h-full items-start gap-3 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-edge hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-action">
                      <Icon aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex items-center gap-2 font-bold text-ink">
                        {t(label)}
                        {count > 0 && (
                          <span className="rounded-full bg-action px-2 py-0.5 text-xs font-bold tabular-nums text-action-ink">
                            {t({ vi: `${count} chờ`, en: `${count} open` })}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-ink-muted">{t(hint)}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

    </main>
  );
}
