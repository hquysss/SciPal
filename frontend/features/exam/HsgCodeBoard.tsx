'use client';

import Link from 'next/link';
import type { PublicPracticeQuestion } from '@scipal/types';
import { useLanguage } from '@scipal/hooks';
import { EmptyState } from '@/components/ui/empty-state';
import { CodePracticeBoard } from '@/features/lessons/CodePracticeBoard';
import { usePracticeState } from '@/features/lessons/PracticeSection';
import type { HsgSubject } from './hsgQueries';

const crumbLink =
  'rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** The programming problems of Bồi dưỡng HSG, shown and judged exactly as lesson practice does. */
export function HsgCodeBoard({ subject, questions }: { subject: HsgSubject; questions: PublicPracticeQuestion[] }) {
  const { lang, t } = useLanguage();
  const { state, onAnswer, onResult } = usePracticeState();
  const subjectName = lang === 'en' ? (subject.name_en ?? subject.name_vi) : subject.name_vi;
  const title = t({ en: `Gifted-student training · ${subjectName}`, vi: `Bồi dưỡng HSG ${subjectName}` });
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={crumbLink}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li>
            <Link href="/exam" className={crumbLink}>
              {t({ en: 'Practice exams', vi: 'Phòng thi thử' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li aria-current="page" className="font-semibold text-ink">
            {title}
          </li>
        </ol>
      </nav>
      <h1 className="text-3xl font-bold text-ink">{title}</h1>
      {questions.length === 0 ? (
        <EmptyState
          title={t({ en: 'No problems yet', vi: 'Chưa có bài' })}
          description={t({ en: 'Programming problems will appear here once they are published.', vi: 'Bài lập trình sẽ hiện ở đây khi được công bố.' })}
        />
      ) : (
        <CodePracticeBoard questions={questions} answers={state.answers} results={state.results} onAnswer={onAnswer} onResult={onResult} t={t} />
      )}
    </>
  );
}
