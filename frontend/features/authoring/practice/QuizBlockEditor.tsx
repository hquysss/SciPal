'use client';

import { useLanguage } from '@scipal/hooks';
import { QuestionEditor, QuestionView } from './QuestionEditor';
import { usePracticeQuestions } from './PracticeQuestionsContext';

const NOTE = 'rounded-lg border border-dashed border-edge bg-surface-sunken p-3 text-sm text-ink-muted';

/** The editor of a quiz block: the question it points to, editable when the teacher may change it. */
export function QuizBlockEditor({ questionId }: { questionId: string }) {
  const { t } = useLanguage();
  const practice = usePracticeQuestions();
  const row = practice?.rows[questionId];
  if (!practice) return <p className={NOTE}>{t({ en: 'The question editor is not available here.', vi: 'Không mở được trình soạn câu hỏi ở đây.' })}</p>;
  if (!row) {
    if (practice.failed) return <p className={NOTE}>{t({ en: 'Could not load the question. Reload the page.', vi: 'Không tải được câu hỏi. Hãy tải lại trang.' })}</p>;
    if (!practice.loaded) return <p className={NOTE}>{t({ en: 'Loading the question…', vi: 'Đang tải câu hỏi…' })}</p>;
    return <p className={NOTE}>{t({ en: 'The question was not found. Remove this block.', vi: 'Không tìm thấy câu hỏi. Hãy xóa khối này.' })}</p>;
  }
  if (!row.editable) return <QuestionView question={row} />;
  return <QuestionEditor key={row.id} context={{ usage: 'practice', subjectId: practice.subjectId, lessonId: practice.lessonId }} question={row} onSaved={practice.upsert} />;
}
