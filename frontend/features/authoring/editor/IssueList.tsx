'use client';

import { useLanguage } from '@scipal/hooks';
import { PART_LABEL } from '@/features/lessons/lessonParts';
import type { LessonIssue } from './lessonIssues';

type Bilingual = { en: string; vi: string };

/** Names of the fields the editor and the API report (lessonIssues.ts, backend blockIssues.ts). */
const FIELD_LABEL: Record<string, Bilingual> = {
  'content.vi': { en: 'Vietnamese text', vi: 'Nội dung tiếng Việt' },
  'content.en': { en: 'English text', vi: 'Nội dung tiếng Anh' },
  katex: { en: 'Formula', vi: 'Công thức' },
  'caption.vi': { en: 'Vietnamese caption', vi: 'Chú thích tiếng Việt' },
  'caption.en': { en: 'English caption', vi: 'Chú thích tiếng Anh' },
  'alt.vi': { en: 'Vietnamese image description', vi: 'Mô tả ảnh tiếng Việt' },
  'alt.en': { en: 'English image description', vi: 'Mô tả ảnh tiếng Anh' },
  url: { en: 'Image', vi: 'Ảnh' },
  'heading.vi': { en: 'Vietnamese heading', vi: 'Tiêu đề tiếng Việt' },
  'heading.en': { en: 'English heading', vi: 'Tiêu đề tiếng Anh' },
  config: { en: 'Simulation settings', vi: 'Thông số mô phỏng' },
  tabs: { en: 'Code', vi: 'Mã nguồn' },
  question_id: { en: 'Question', vi: 'Câu hỏi' },
};

/** What still needs fixing; each line names the block and field and jumps to it. */
export function IssueList({ issues, onJump }: { issues: LessonIssue[]; onJump: (issue: LessonIssue) => void }) {
  const { t } = useLanguage();
  if (issues.length === 0) return null;
  return (
    <section role="alert" className="rounded-lg border border-warning bg-surface p-4">
      <h3 className="text-sm font-bold text-ink">{t({ en: `Fix ${issues.length} thing(s)`, vi: `Cần sửa ${issues.length} chỗ` })}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {issues.map((issue, i) => {
          const field = issue.field ? FIELD_LABEL[issue.field] : undefined;
          return (
            <li key={`${issue.part}-${issue.index}-${issue.field ?? ''}-${i}`}>
              <button
                type="button"
                onClick={() => onJump(issue)}
                className="min-h-9 text-left text-sm text-ink underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="font-semibold">
                  {t(PART_LABEL[issue.part])} · {t({ en: `Block ${issue.index + 1}`, vi: `Khối ${issue.index + 1}` })}
                  {field ? ` · ${t(field)}` : ''}
                </span>
                : {t(issue.message)}
              </button>
              {issue.hint && <p className="mt-0.5 text-xs text-ink-muted">{t(issue.hint)}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
