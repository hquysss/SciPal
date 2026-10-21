'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Clock, ListChecks, LogOut, Play, Timer } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { ExamSection } from '@scipal/types';
import { buttonVariants } from '../../components/ui/button';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';

type Bilingual = { en: string; vi: string };

const pickText = (text: Bilingual, lang: string) => (lang === 'en' ? text.en.trim() || text.vi : text.vi.trim() || text.en);

/**
 * The page before the exam: what it contains and the rules, with the clock still stopped.
 * The timer and the graded attempt begin only when the learner presses the button and confirms.
 */
export function ExamStart({
  title,
  questionCount,
  durationMinutes,
  layout,
  onStart,
  offline,
}: {
  title?: Bilingual;
  questionCount: number;
  durationMinutes: number;
  layout: ExamSection[] | null;
  onStart: () => void;
  /** Saving the exam to take it without a connection. */
  offline?: ReactNode;
}) {
  const { lang, t } = useLanguage();
  const { ask, dialog } = useConfirmDialog();
  // The clock cannot be paused, so pressing Start asks first.
  const confirmStart = async () => {
    const confirmed = await ask({
      title: t({ en: 'Start the exam?', vi: 'Vào thi?' }),
      description: t({
        en: `The ${durationMinutes}-minute clock starts now and cannot be paused. If you leave the page 3 times, the exam is submitted.`,
        vi: `Đồng hồ ${durationMinutes} phút bắt đầu chạy ngay và không tạm dừng được. Rời trang 3 lần bài sẽ tự nộp.`,
      }),
      confirmLabel: t({ en: 'Start', vi: 'Vào thi' }),
      cancelLabel: t({ en: 'Not yet', vi: 'Chưa, quay lại' }),
      tone: 'warning',
      icon: <Play className="h-5 w-5" />,
      details: (
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2.5 rounded-lg bg-surface-sunken p-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-warning-surface text-warning" aria-hidden="true"><Timer className="h-4 w-4" /></span>
            <span className="font-semibold text-ink">{t({ en: `${durationMinutes} minutes, no pause`, vi: `${durationMinutes} phút, không tạm dừng` })}</span>
          </li>
          <li className="flex items-center gap-2.5 rounded-lg bg-surface-sunken p-2.5">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-md bg-danger-surface text-danger" aria-hidden="true"><LogOut className="h-4 w-4" /></span>
            <span className="font-semibold text-ink">{t({ en: 'Leave the page 3 times: auto-submit', vi: 'Rời trang 3 lần: tự nộp bài' })}</span>
          </li>
        </ul>
      ),
    });
    if (confirmed) onStart();
  };
  const sections = (layout ?? []).filter((s) => s.count > 0);
  const total = sections.reduce((sum, s) => sum + (s.max_points ?? 0), 0);
  const rules: Bilingual[] = [
    { en: `The clock starts when you press Start and cannot be paused: ${durationMinutes} minutes.`, vi: `Đồng hồ bắt đầu chạy khi bạn bấm Bắt đầu và không tạm dừng được: ${durationMinutes} phút.` },
    { en: 'The exam is submitted by itself when time runs out. You can also submit earlier.', vi: 'Hết giờ bài tự động nộp. Bạn cũng có thể nộp sớm.' },
    { en: 'Use the question grid to jump between questions. Unanswered ones have their own colour on the grid.', vi: 'Dùng bảng câu hỏi để chuyển câu. Câu chưa trả lời có màu riêng trên bảng câu hỏi.' },
    { en: 'Your score appears right after you submit. Each submit uses 1 graded attempt; the attempts left show at the top of the exam.', vi: 'Điểm có ngay khi nộp bài. Mỗi lần nộp bài trừ 1 lượt thi chấm điểm. Số lượt còn lại hiện ở đầu bài thi.' },
    { en: 'Your answers are kept on this device while you work, so a reload or a lost connection loses nothing.', vi: 'Câu trả lời được giữ trên máy trong lúc làm, nên tải lại trang hay mất mạng cũng không mất.' },
  ];

  return (
    <section aria-labelledby="exam-start" className="flex flex-col gap-6 rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div>
        <p className="text-sm font-semibold text-ink-muted">{t({ en: 'Before you start', vi: 'Trước khi bắt đầu' })}</p>
        <h2 id="exam-start" className="mt-1 text-2xl font-bold text-ink">
          {title ? pickText(title, lang) : t({ en: 'Practice exam', vi: 'Bài thi thử' })}
        </h2>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-3 rounded-lg bg-surface-sunken p-3">
          <ListChecks aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
          <div>
            <dt className="text-xs text-ink-muted">{t({ en: 'Questions', vi: 'Số câu' })}</dt>
            <dd className="font-bold tabular-nums text-ink">{questionCount}</dd>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg bg-surface-sunken p-3">
          <Clock aria-hidden="true" className="h-5 w-5 shrink-0 text-ink-muted" />
          <div>
            <dt className="text-xs text-ink-muted">{t({ en: 'Time', vi: 'Thời gian' })}</dt>
            <dd className="font-bold tabular-nums text-ink">{t({ en: `${durationMinutes} min`, vi: `${durationMinutes} phút` })}</dd>
          </div>
        </div>
      </dl>

      {sections.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">{t({ en: 'Parts of the exam', vi: 'Các phần của đề thi' })}</caption>
            <thead>
              <tr className="bg-surface-sunken text-ink-muted">
                <th scope="col" className="px-3 py-2 font-semibold">{t({ en: 'Part', vi: 'Phần' })}</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">{t({ en: 'Questions', vi: 'Số câu' })}</th>
                {total > 0 && <th scope="col" className="px-3 py-2 text-right font-semibold">{t({ en: 'Points', vi: 'Điểm' })}</th>}
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.key} className="border-t border-line">
                  <th scope="row" className="px-3 py-2 font-medium text-ink">{pickText(s.title, lang)}</th>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">{s.count}</td>
                  {total > 0 && <td className="px-3 py-2 text-right tabular-nums text-ink">{s.max_points ?? ''}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-base font-bold text-ink">{t({ en: 'Good to know', vi: 'Lưu ý' })}</h3>
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink">
          {rules.map((rule) => (
            <li key={rule.en}>{t(rule)}</li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        <button type="button" onClick={() => void confirmStart()} className={buttonVariants({ size: 'lg' })}>
          <Play aria-hidden="true" />
          {t({ en: 'Start the exam', vi: 'Bắt đầu làm bài' })}
        </button>
        <Link href="/exam" className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'Back to the list', vi: 'Quay lại danh sách' })}
        </Link>
      </div>
      {offline}
      {dialog}
    </section>
  );
}
