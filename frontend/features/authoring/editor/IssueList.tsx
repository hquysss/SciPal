'use client';

import { useLanguage } from '@scipal/hooks';
import { PART_LABEL } from '@/features/lessons/lessonParts';
import type { LessonIssue } from './lessonIssues';

/** What still stops the lesson from being sent for review; each line jumps to its block. */
export function IssueList({ issues, onJump }: { issues: LessonIssue[]; onJump: (issue: LessonIssue) => void }) {
  const { t } = useLanguage();
  if (issues.length === 0) return null;
  return (
    <section role="alert" className="rounded-lg border border-warning bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">
        {t({ en: `Fix ${issues.length} thing(s) before sending for review`, vi: `Cần sửa ${issues.length} chỗ trước khi gửi duyệt` })}
      </h3>
      <ul className="mt-2 flex flex-col gap-1">
        {issues.map((issue, i) => (
          <li key={`${issue.part}-${issue.index}-${i}`}>
            <button
              type="button"
              onClick={() => onJump(issue)}
              className="min-h-9 text-left text-sm text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <span className="font-semibold">
                {t(PART_LABEL[issue.part])} · {t({ en: `Block ${issue.index + 1}`, vi: `Khối ${issue.index + 1}` })}
              </span>
              : {t(issue.message)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
