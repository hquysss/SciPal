'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { createBrowserClient } from '@scipal/supabase';
import {
  createExamWorkbookTemplate,
  missingEnglish,
  parseExamWorkbookFile,
  sectionShortfalls,
  setEnglish,
  unresolvedQuizRefs,
  quizRefConflicts,
  WorkbookError,
  type ContentImportDraft,
  type DraftBlueprint,
  type DraftQuestion,
  type Text,
} from './examWorkbook';
import { readLessonPackageFile, type DraftLesson } from './lessonDocument';

// Ported from the content import studio of the codex/scipal-existing-web-remediation branch,
// on today's schema and theme tokens: Word/PDF lessons and an Excel workbook are read in the
// browser, reviewed card by card with English filled in, then saved in one request.

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
const LESSON_TEMPLATE_URL = '/templates/scipal-lesson-import-template.docx';

type Path = Array<string | number>;
type Notice = { tone: 'neutral' | 'error' | 'success'; text: string } | null;
type SaveResult =
  | { status: 'success'; lessons: number; questions: number; blueprints: number; published: boolean }
  | { status: 'error'; message: string };

const enId = (path: Path) => `en-${path.join('-')}`;

function bytesLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const FIELD =
  'mt-1 block w-full rounded-xl border px-3 py-2.5 text-sm text-ink outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const REMOVE =
  'rounded-lg px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus';
const CARD = 'rounded-2xl border border-line bg-surface p-4 sm:p-5';
const NOTICE_TONE = {
  neutral: 'bg-surface-sunken text-ink',
  error: 'bg-danger-surface text-danger',
  success: 'bg-success-surface text-success',
} as const;

function BilingualField({
  label,
  value,
  path,
  multiline = false,
  onEnglish,
}: {
  label: string;
  value: Text;
  path: Path;
  multiline?: boolean;
  onEnglish: (path: Path, en: string) => void;
}) {
  const { t } = useLanguage();
  const missing = !value.en.trim();
  const vi = t({ en: 'Vietnamese', vi: 'Tiếng Việt' });
  const en = t({ en: 'English', vi: 'Tiếng Anh' });
  const placeholder = t({ en: 'Add the English version…', vi: 'Bổ sung nội dung tiếng Anh…' });
  const readOnly = `${FIELD} border-line bg-surface-sunken text-ink-muted`;
  const editable = `${FIELD} bg-surface ${missing ? 'border-warning' : 'border-edge'}`;

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="block min-w-0 text-xs font-semibold text-ink-muted">
        <span>{label} · {vi}</span>
        {multiline ? (
          <textarea className={`${readOnly} min-h-20 resize-y`} value={value.vi} readOnly />
        ) : (
          <input className={readOnly} value={value.vi} readOnly />
        )}
      </label>
      <label htmlFor={enId(path)} className="block min-w-0 text-xs font-semibold text-ink-muted">
        <span>
          {label} · {en} <span className="text-danger" aria-hidden="true">*</span>
        </span>
        {multiline ? (
          <textarea
            id={enId(path)}
            lang="en"
            className={`${editable} min-h-20 resize-y`}
            value={value.en}
            onChange={(e) => onEnglish(path, e.currentTarget.value)}
            placeholder={placeholder}
            aria-invalid={missing}
          />
        ) : (
          <input
            id={enId(path)}
            lang="en"
            className={editable}
            value={value.en}
            onChange={(e) => onEnglish(path, e.currentTarget.value)}
            placeholder={placeholder}
            aria-invalid={missing}
          />
        )}
      </label>
    </div>
  );
}

function UploadPanel({
  kind,
  files,
  busy,
  notice,
  onSelect,
  onDownload,
}: {
  kind: 'lesson' | 'exam';
  files: string[];
  busy: boolean;
  notice: Notice;
  onSelect: (selected: File[]) => void;
  onDownload: (format?: 'generic' | 'thptqg' | 'dgnl_hcm') => void;
}) {
  const { t } = useLanguage();
  const isLesson = kind === 'lesson';
  const [dragging, setDragging] = useState(false);
  const [templateFormat, setTemplateFormat] = useState<'generic' | 'thptqg' | 'dgnl_hcm'>('generic');

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg text-ink ${isLesson ? 'bg-[color-mix(in_srgb,var(--sky)_30%,var(--surface))]' : 'bg-[color-mix(in_srgb,var(--sun)_35%,var(--surface))]'}`}
          aria-hidden="true"
        >
          {isLesson ? '▤' : '▦'}
        </span>
        <div className="min-w-0">
          <h2 className="font-bold text-ink">{isLesson ? t({ en: 'Lessons', vi: 'Bài học' }) : t({ en: 'Exams', vi: 'Đề thi' })}</h2>
          <p className="mt-0.5 text-xs leading-5 text-ink-muted">
            {isLesson
              ? t({ en: 'Word .docx or text-selectable PDF · max 10 MB', vi: 'Word .docx hoặc PDF có thể chọn chữ · tối đa 10 MB' })
              : t({ en: 'Excel .xlsx · max 10 MB', vi: 'Excel .xlsx · tối đa 10 MB' })}
          </p>
        </div>
      </div>

      <label
        className={`mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed px-4 py-5 text-center transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus ${
          dragging ? 'border-action bg-[color-mix(in_srgb,var(--action)_8%,var(--surface))]' : 'border-edge bg-surface-sunken hover:border-action'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (event.dataTransfer.files.length) onSelect(Array.from(event.dataTransfer.files));
        }}
      >
        <input
          type="file"
          accept={isLesson ? '.docx,.pdf' : '.xlsx'}
          multiple={isLesson}
          className="sr-only"
          aria-label={isLesson ? t({ en: 'Choose Word or PDF lesson files', vi: 'Chọn tệp bài học Word hoặc PDF' }) : t({ en: 'Choose an Excel exam workbook', vi: 'Chọn tệp Excel đề thi' })}
          onChange={(event) => {
            if (event.currentTarget.files?.length) onSelect(Array.from(event.currentTarget.files));
            event.currentTarget.value = '';
          }}
        />
        <span className="text-2xl text-ink-muted" aria-hidden="true">⇧</span>
        <span className="mt-1 text-sm font-semibold text-ink">{t({ en: 'Drop files here or choose from your device', vi: 'Kéo tệp vào đây hoặc chọn từ thiết bị' })}</span>
        <span className="mt-2 inline-flex min-h-9 items-center rounded-lg border border-edge bg-surface px-3 text-xs font-bold text-ink">
          {busy ? t({ en: 'Reading…', vi: 'Đang đọc…' }) : t({ en: 'Choose file', vi: 'Chọn tệp' })}
        </span>
      </label>

      {!isLesson && (
        <label className="mt-3 block text-sm font-semibold text-ink">
          {t({ en: 'Excel template format', vi: 'Dạng mẫu Excel' })}
          <select
            value={templateFormat}
            onChange={(e) => {
              const value = e.currentTarget.value;
              if (value === 'generic' || value === 'thptqg' || value === 'dgnl_hcm') setTemplateFormat(value);
            }}
            className="mt-1 min-h-11 w-full rounded-lg border border-edge bg-surface px-3 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
          >
            <option value="generic">{t({ en: 'Standard exam', vi: 'Đề thường' })}</option>
            <option value="thptqg">THPTQG</option>
            <option value="dgnl_hcm">{t({ en: 'VNU-HCM assessment', vi: 'ĐGNL ĐHQG-HCM' })}</option>
          </select>
        </label>
      )}
      <button
        type="button"
        onClick={() => onDownload(templateFormat)}
        className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-action underline underline-offset-4 hover:text-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span aria-hidden="true">↓</span>
        {isLesson ? t({ en: 'Download lesson template', vi: 'Tải mẫu bài học' }) : t({ en: 'Download Excel template', vi: 'Tải mẫu Excel đề thi' })}
      </button>

      {files.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label={t({ en: 'Files read', vi: 'Tệp đã đọc' })}>
          {files.map((file) => (
            <li key={file} className="truncate text-xs text-ink-muted">✓ {file}</li>
          ))}
        </ul>
      )}
      {notice && (
        <p className={`mt-3 rounded-lg px-3 py-2 text-xs leading-5 ${NOTICE_TONE[notice.tone]}`} role={notice.tone === 'error' ? 'alert' : 'status'}>
          {notice.text}
        </p>
      )}
      <p className="mt-3 text-[11px] leading-5 text-ink-muted">
        {t({
          en: 'Files are read in this browser. Only the reviewed content is sent when you save.',
          vi: 'Tệp được đọc ngay trên trình duyệt. Chỉ nội dung đã xem lại được gửi khi bạn lưu.',
        })}
      </p>
    </section>
  );
}

const BLOCK_LABELS: Record<string, { en: string; vi: string }> = {
  theory: { en: 'Theory', vi: 'Lý thuyết' },
  code: { en: 'Code', vi: 'Mã nguồn' },
  formula: { en: 'Formula', vi: 'Công thức' },
  interactive: { en: 'Interactive', vi: 'Mô phỏng' },
  quiz_ref: { en: 'Question from the workbook', vi: 'Câu hỏi trong tệp Excel' },
  quiz: { en: 'Quiz', vi: 'Câu hỏi' },
  'term-ref': { en: 'Glossary term', vi: 'Thuật ngữ' },
  'resource-ref': { en: 'Resource', vi: 'Tài nguyên' },
};

function LessonReviewCard({
  lesson,
  index,
  questions,
  onEnglish,
  onRemove,
}: {
  lesson: DraftLesson;
  index: number;
  questions: DraftQuestion[];
  onEnglish: (path: Path, en: string) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const at = (...rest: Path): Path => ['lessons', index, ...rest];

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-sunken px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-md bg-surface px-2 py-1 font-mono text-[11px] font-bold text-ink">
            {lesson.subject_slug} · {t({ en: 'Grade', vi: 'Lớp' })} {lesson.grade}
          </span>
          <span className="truncate text-xs text-ink-muted">{lesson.source}</span>
        </div>
        <button type="button" onClick={onRemove} className={REMOVE}>
          {t({ en: 'Remove lesson', vi: 'Bỏ bài học này' })}
        </button>
      </header>
      <div className="space-y-4 p-4 sm:p-5">
        <BilingualField label={t({ en: 'Lesson title', vi: 'Tên bài học' })} value={lesson.title} path={at('title')} onEnglish={onEnglish} />
        <BilingualField label={t({ en: 'Topic', vi: 'Chủ đề' })} value={lesson.topic} path={at('topic')} onEnglish={onEnglish} />

        <div className="space-y-3 border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">
            {t({ en: 'Lesson blocks', vi: 'Các khối nội dung' })} <span className="text-xs font-medium text-ink-muted">({lesson.blocks.length})</span>
          </h3>
          {lesson.blocks.map((block, blockIndex) => {
            const found = block.type === 'quiz_ref' && questions.some((q) => q.subject_slug === lesson.subject_slug && q.key === block.key);
            return (
              <section key={`${block.type}-${blockIndex}`} className="rounded-xl border border-line p-3 sm:p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-bold text-ink">{blockIndex + 1}</span>
                  <h4 className="text-sm font-bold text-ink">{t(BLOCK_LABELS[block.type] ?? { en: block.type, vi: block.type })}</h4>
                  {block.type === 'interactive' && <code className="rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] text-ink-muted">{block.kind}</code>}
                </div>
                {block.type === 'theory' && (
                  <BilingualField label={t({ en: 'Content', vi: 'Nội dung' })} value={block.content} multiline path={at('blocks', blockIndex, 'content')} onEnglish={onEnglish} />
                )}
                {block.type === 'interactive' && (
                  <div className="space-y-3">
                    <BilingualField label={t({ en: 'Simulation heading', vi: 'Tiêu đề mô phỏng' })} value={block.heading} path={at('blocks', blockIndex, 'heading')} onEnglish={onEnglish} />
                    {block.caption && <BilingualField label={t({ en: 'Caption', vi: 'Chú thích' })} value={block.caption} path={at('blocks', blockIndex, 'caption')} onEnglish={onEnglish} />}
                  </div>
                )}
                {block.type === 'formula' && (
                  <div className="space-y-3">
                    <pre className="overflow-x-auto rounded-lg bg-surface-sunken px-3 py-2 font-mono text-sm text-ink"><code>{block.katex}</code></pre>
                    {block.caption && <BilingualField label={t({ en: 'Caption', vi: 'Chú thích' })} value={block.caption} path={at('blocks', blockIndex, 'caption')} onEnglish={onEnglish} />}
                  </div>
                )}
                {block.type === 'code' && (
                  <div className="space-y-2">
                    {block.tabs.map((tab) => (
                      <details key={tab.lang} className="rounded-lg bg-surface-sunken text-ink">
                        <summary className="cursor-pointer px-3 py-2 text-xs font-bold">{tab.lang}</summary>
                        <pre className="overflow-x-auto px-3 pb-3 font-mono text-xs leading-5"><code>{tab.code}</code></pre>
                      </details>
                    ))}
                    <p className="text-xs text-ink-muted">{t({ en: 'Code is kept exactly as in the document.', vi: 'Mã nguồn được giữ nguyên từ tài liệu gốc.' })}</p>
                  </div>
                )}
                {block.type === 'quiz_ref' && (
                  <p className={`rounded-lg px-3 py-2 text-sm ${found ? 'bg-success-surface text-success' : 'bg-danger-surface text-danger'}`}>
                    {t({ en: 'Question key', vi: 'Mã câu hỏi' })}: <code>{block.key}</code>
                    {!found && ` · ${t({ en: 'not in the Excel file', vi: 'chưa có trong tệp Excel' })}`}
                  </p>
                )}
                {block.type === 'quiz' && <p className="text-sm text-ink-muted">{t({ en: 'Question ID', vi: 'Mã câu hỏi' })}: {block.question_id}</p>}
                {block.type === 'term-ref' && <p className="text-sm text-ink-muted">{t({ en: 'Glossary term ID', vi: 'Mã thuật ngữ' })}: {block.term_id}</p>}
                {block.type === 'resource-ref' && <p className="text-sm text-ink-muted">{t({ en: 'Resource ID', vi: 'Mã tài nguyên' })}: {block.resource_id}</p>}
              </section>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function QuestionReviewCard({
  question,
  index,
  onEnglish,
  onChange,
  onRemove,
}: {
  question: DraftQuestion;
  index: number;
  onEnglish: (path: Path, en: string) => void;
  onChange: (question: DraftQuestion) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const at = (...rest: Path): Path => ['questions', index, ...rest];
  const kindLabel = question.type === 'mc'
    ? t({ en: 'Multiple choice', vi: 'Trắc nghiệm' })
    : question.type === 'truefalse'
      ? t({ en: 'True / False', vi: 'Đúng / Sai' })
      : t({ en: 'Short answer', vi: 'Trả lời ngắn' });

  return (
    <article className={CARD}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-edge font-mono text-xs font-bold text-ink">{index + 1}</span>
          <span className="rounded-full bg-[color-mix(in_srgb,var(--action)_12%,var(--surface))] px-2.5 py-1 text-[11px] font-semibold text-ink">{kindLabel}</span>
          <span className="truncate text-[11px] text-ink-muted">
            {question.subject_slug} · {question.key} · {t({ en: 'Level', vi: 'Độ khó' })} {question.difficulty}
          </span>
        </div>
        <button type="button" onClick={onRemove} className={REMOVE}>{t({ en: 'Remove question', vi: 'Bỏ câu hỏi này' })}</button>
      </div>

      <div className="space-y-3">
        <BilingualField label={t({ en: 'Question', vi: 'Câu hỏi' })} value={question.stem} multiline path={at('stem')} onEnglish={onEnglish} />

        {question.type === 'mc' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink">{t({ en: 'Options · select the correct answer', vi: 'Lựa chọn · chọn đáp án đúng' })}</p>
            {question.options.map((option, optionIndex) => (
              <div key={option.id} className="rounded-xl border border-line p-3">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-sunken text-[11px] font-bold text-ink">{option.id}</span>
                  <label className="flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
                    <input
                      type="radio"
                      name={`correct-${index}`}
                      checked={question.answer === option.id}
                      onChange={() => onChange({ ...question, answer: option.id })}
                      className="accent-[var(--action)]"
                    />
                    {t({ en: 'Correct answer', vi: 'Đáp án đúng' })}
                  </label>
                </div>
                <BilingualField label={t({ en: `Option ${option.id}`, vi: `Lựa chọn ${option.id}` })} value={option.text} path={at('options', optionIndex, 'text')} onEnglish={onEnglish} />
              </div>
            ))}
          </div>
        )}

        {question.type === 'truefalse' && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-ink">{t({ en: 'Statements', vi: 'Các nhận định' })}</p>
            {question.items.map((item, itemIndex) => (
              <div key={item.id} className="rounded-xl border border-line p-3">
                <label className="mb-2 flex min-h-8 cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={item.correct}
                    onChange={(e) => onChange({ ...question, items: question.items.map((entry, i) => (i === itemIndex ? { ...entry, correct: e.currentTarget.checked } : entry)) })}
                    className="accent-[var(--action)]"
                  />
                  {item.id} · {item.correct ? t({ en: 'Statement is true', vi: 'Nhận định đúng' }) : t({ en: 'Statement is false', vi: 'Nhận định sai' })}
                </label>
                <BilingualField label={t({ en: 'Statement', vi: 'Nhận định' })} value={item.text} multiline path={at('items', itemIndex, 'text')} onEnglish={onEnglish} />
              </div>
            ))}
          </div>
        )}

        {question.type === 'short' && (
          <p className="rounded-xl bg-warning-surface px-3 py-2 text-xs leading-5 text-warning">
            {t({ en: 'Answer key', vi: 'Đáp án chấm' })}: <strong>{question.answer}</strong> ·{' '}
            {t({ en: 'kept on the server only.', vi: 'chỉ lưu phía máy chủ.' })}
          </p>
        )}
        {question.type === 'short' && question.rubric && (
          <BilingualField label={t({ en: 'Grading rubric', vi: 'Hướng dẫn chấm' })} value={question.rubric} multiline path={at('rubric')} onEnglish={onEnglish} />
        )}
        {question.explanation && (
          <BilingualField label={t({ en: 'Explanation', vi: 'Giải thích' })} value={question.explanation} multiline path={at('explanation')} onEnglish={onEnglish} />
        )}
      </div>
    </article>
  );
}

function BlueprintReviewCard({
  blueprint,
  index,
  shortfalls,
  onEnglish,
  onRemove,
}: {
  blueprint: DraftBlueprint;
  index: number;
  shortfalls: Array<{ index: number; need: number; have: number }>;
  onEnglish: (path: Path, en: string) => void;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const total = (blueprint.layout ?? blueprint.sections).reduce((sum, section) => sum + section.count, 0);
  return (
    <article className={CARD}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-muted">
            {blueprint.subject_slug} · {t({ en: 'Grade', vi: 'Lớp' })} {blueprint.grade} · {blueprint.duration_minutes} {t({ en: 'minutes', vi: 'phút' })} · {total}{' '}
            {t({ en: 'questions', vi: 'câu' })}
          </p>
          <p className="truncate font-mono text-[11px] text-ink-muted">{blueprint.code}</p>
        </div>
        <button type="button" onClick={onRemove} className={REMOVE}>{t({ en: 'Remove exam', vi: 'Bỏ đề này' })}</button>
      </div>
      <BilingualField label={t({ en: 'Exam title', vi: 'Tên đề thi' })} value={blueprint.title} path={['blueprints', index, 'title']} onEnglish={onEnglish} />
      {blueprint.layout && (
        <div className="mt-4 space-y-4">
          <p className="text-sm font-semibold text-ink">
            {blueprint.format === 'thptqg' ? 'THPTQG' : t({ en: 'VNU-HCM assessment', vi: 'ĐGNL ĐHQG-HCM' })}
            {' · '}{blueprint.layout.reduce((sum, s) => sum + s.max_points, 0)} {t({ en: 'points', vi: 'điểm' })}
          </p>
          {blueprint.layout.map((section, j) => (
            <section key={section.key} className="space-y-3 rounded-xl border border-line bg-surface-sunken p-3">
              <BilingualField label={t({ en: 'Section title', vi: 'Tên phần thi' })} value={section.title} path={['blueprints', index, 'layout', j, 'title']} onEnglish={onEnglish} />
              <p className="text-sm text-ink-muted">{section.count} {t({ en: 'questions', vi: 'câu' })} · {section.kind} · {section.max_points} {t({ en: 'points', vi: 'điểm' })}</p>
              {shortfalls.some((s) => s.index === j) && <p role="alert" className="text-sm font-semibold text-danger">{t({ en: 'Referenced exam questions are missing.', vi: 'Thiếu câu thi được tham chiếu trong phần này.' })}</p>}
              {section.groups.map((group, k) => (
                <div key={k} className="space-y-2 border-t border-line pt-3">
                  <p className="break-words text-sm text-ink-muted">{t({ en: 'Group', vi: 'Nhóm' })} {k + 1}: {group.question_keys.join(', ')}</p>
                  {group.passage && <BilingualField label={t({ en: 'Passage', vi: 'Đoạn dẫn' })} value={group.passage} path={['blueprints', index, 'layout', j, 'groups', k, 'passage']} onEnglish={onEnglish} multiline />}
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
      {!blueprint.layout && <ul className="mt-3 flex flex-wrap gap-2">
        {blueprint.sections.map((section, sectionIndex) => {
          const short = shortfalls.find((s) => s.index === sectionIndex);
          return (
            <li
              key={`${section.type}-${section.difficulty}-${sectionIndex}`}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] ${short ? 'bg-danger-surface font-semibold text-danger' : 'bg-surface-sunken text-ink-muted'}`}
            >
              {section.count} × {section.type} · {t({ en: 'Level', vi: 'Độ khó' })} {section.difficulty}
              {short && ` · ${t({ en: `only ${short.have} in the file`, vi: `tệp chỉ có ${short.have}` })}`}
            </li>
          );
        })}
      </ul>}
    </article>
  );
}

const EMPTY: ContentImportDraft = { lessons: [], questions: [], blueprints: [] };

export function ContentImportStudio({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<ContentImportDraft>(EMPTY);
  const [publish, setPublish] = useState(false);
  const [lessonFiles, setLessonFiles] = useState<string[]>([]);
  const [examFiles, setExamFiles] = useState<string[]>([]);
  const [lessonNotice, setLessonNotice] = useState<Notice>(null);
  const [examNotice, setExamNotice] = useState<Notice>(null);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [examBusy, setExamBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SaveResult | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const missing = useMemo(() => missingEnglish(draft), [draft]);
  const unresolved = useMemo(() => unresolvedQuizRefs(draft), [draft]);
  const shortfalls = useMemo(() => sectionShortfalls(draft), [draft]);
  const conflicts = useMemo(() => quizRefConflicts(draft), [draft]);
  const hasContent = draft.lessons.length + draft.questions.length + draft.blueprints.length > 0;
  const canSave = hasContent && missing.length === 0 && unresolved.length === 0 && conflicts.length === 0 && shortfalls.size === 0;
  const success = result?.status === 'success';

  const updateDraft = (update: (previous: ContentImportDraft) => ContentImportDraft) => {
    setDraft(update);
    setResult(null);
  };
  const onEnglish = (path: Path, en: string) => updateDraft((previous) => setEnglish(previous, path, en));

  const addLessonFiles = async (files: File[]) => {
    setLessonBusy(true);
    setLessonNotice({ tone: 'neutral', text: t({ en: 'Reading lesson files in this browser…', vi: 'Đang đọc tệp bài học trên trình duyệt…' }) });
    const lessons: DraftLesson[] = [];
    const read: string[] = [];
    const failures: string[] = [];
    for (const file of files) {
      const parsed = await readLessonPackageFile(file).catch(() => null);
      if (parsed?.ok) {
        lessons.push(parsed.lesson);
        read.push(`${file.name} · ${bytesLabel(file.size)}`);
      } else {
        failures.push(`${file.name}: ${parsed ? t(parsed.error) : t({ en: 'Could not read this file.', vi: 'Không đọc được tệp này.' })}`);
      }
    }
    if (lessons.length) {
      updateDraft((previous) => ({ ...previous, lessons: [...previous.lessons, ...lessons] }));
      setLessonFiles((previous) => [...previous, ...read]);
    }
    setLessonNotice(
      failures.length
        ? { tone: 'error', text: failures.join(' · ') }
        : lessons.length
          ? {
              tone: 'success',
              text: t({
                en: `${lessons.length} lesson file(s) added to the preview. Complete the English text below.`,
                vi: `Đã thêm ${lessons.length} tệp bài học vào bản xem trước. Bạn bổ sung tiếng Anh bên dưới.`,
              }),
            }
          : null,
    );
    setLessonBusy(false);
  };

  const addExamFile = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setExamBusy(true);
    setExamNotice({ tone: 'neutral', text: t({ en: 'Reading the workbook in this browser…', vi: 'Đang đọc bảng tính trên trình duyệt…' }) });
    try {
      const parsed = await parseExamWorkbookFile(file);
      // One workbook at a time: a new file replaces the previous questions and exams.
      updateDraft((previous) => ({ ...previous, questions: parsed.questions, blueprints: parsed.blueprints }));
      setExamFiles([`${file.name} · ${bytesLabel(file.size)}`]);
      setExamNotice({
        tone: 'success',
        text: t({
          en: `${parsed.questions.length} question(s) and ${parsed.blueprints.length} exam(s) added to the preview.`,
          vi: `Đã thêm ${parsed.questions.length} câu hỏi và ${parsed.blueprints.length} đề thi vào bản xem trước.`,
        }),
      });
    } catch (error) {
      setExamNotice({
        tone: 'error',
        text: error instanceof WorkbookError ? error.message : t({ en: 'Could not read this workbook.', vi: 'Không đọc được bảng tính này.' }),
      });
    } finally {
      setExamBusy(false);
    }
  };

  const downloadExamTemplate = async (format: 'generic' | 'thptqg' | 'dgnl_hcm' = 'generic') => {
    try {
      const buffer = await createExamWorkbookTemplate(format);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `scipal-mau-nhap-de-thi-${format}.xlsx`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExamNotice({ tone: 'error', text: t({ en: 'The template could not be generated. Reload and try again.', vi: 'Không tạo được mẫu Excel. Hãy tải lại trang rồi thử lại.' }) });
    }
  };

  const goToMissing = () => {
    const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    first?.focus({ preventScroll: true });
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setResult(null);
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        setResult({ status: 'error', message: t({ en: 'Your session expired. Sign in again; your preview is still here.', vi: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại; bản xem trước vẫn được giữ.' }) });
        return;
      }
      const response = await fetch(`${API_BASE}/api/authoring/content-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ ...draft, publish: isAdmin && publish }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        imported?: { lessons?: number; questions?: number; blueprints?: number };
        status?: string;
      };
      if (!response.ok) {
        setResult({ status: 'error', message: body.error ?? t({ en: 'The content was not saved. Please retry.', vi: 'Nội dung chưa được lưu. Hãy thử lại.' }) });
        return;
      }
      setResult({
        status: 'success',
        lessons: body.imported?.lessons ?? 0,
        questions: body.imported?.questions ?? 0,
        blueprints: body.imported?.blueprints ?? 0,
        published: body.status === 'published',
      });
    } catch {
      setResult({ status: 'error', message: t({ en: 'The server could not be reached. Your preview was kept and nothing was saved.', vi: 'Không kết nối được máy chủ. Bản xem trước vẫn được giữ và chưa có nội dung nào được lưu.' }) });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setDraft(EMPTY);
    setLessonFiles([]);
    setExamFiles([]);
    setLessonNotice(null);
    setExamNotice(null);
    setResult(null);
    setPublish(false);
  };

  return (
    <div className="pb-40 sm:pb-28">
      <div ref={mainRef} aria-busy={saving} className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:gap-6">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pb-2">
          <UploadPanel
            kind="lesson"
            files={lessonFiles}
            busy={lessonBusy}
            notice={lessonNotice}
            onSelect={(files) => void addLessonFiles(files)}
            onDownload={() => window.open(LESSON_TEMPLATE_URL, '_blank', 'noopener,noreferrer')}
          />
          <UploadPanel kind="exam" files={examFiles} busy={examBusy} notice={examNotice} onSelect={(files) => void addExamFile(files)} onDownload={(format) => void downloadExamTemplate(format)} />
          <div className="rounded-xl bg-[color-mix(in_srgb,var(--sky)_16%,var(--surface))] px-4 py-3 text-xs leading-5 text-ink">
            <p className="font-bold">{t({ en: 'Before you begin', vi: 'Trước khi bắt đầu' })}</p>
            <p className="mt-1">
              {t({
                en: 'Use the SciPal templates so subjects, topics, questions and blocks keep a predictable structure. Scanned PDFs without selectable text cannot be imported. For any other document, open a lesson in the Studio and use "Import Word / PDF".',
                vi: 'Dùng mẫu SciPal để môn, chủ đề, câu hỏi và khối nội dung đúng cấu trúc. PDF scan không có lớp chữ sẽ không nhập được. Tài liệu không theo mẫu thì mở bài trong Studio và dùng "Nhập từ Word / PDF".',
              })}
            </p>
          </div>
        </aside>

        <section aria-labelledby="preview-title" className="min-w-0 space-y-5">
          <div className={CARD}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 id="preview-title" className="text-lg font-bold text-ink">{t({ en: 'Review extracted content', vi: 'Xem trước nội dung' })}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {t({ en: 'Vietnamese text stays as entered. Fill each required English field below.', vi: 'Giữ nguyên phần tiếng Việt; bổ sung các trường tiếng Anh bắt buộc bên dưới.' })}
                </p>
              </div>
              <span className="rounded-full bg-surface-sunken px-3 py-1.5 text-xs font-semibold text-ink">
                {draft.lessons.length} {t({ en: 'lessons', vi: 'bài học' })} · {draft.questions.length} {t({ en: 'questions', vi: 'câu hỏi' })} ·{' '}
                {draft.blueprints.length} {t({ en: 'exams', vi: 'đề thi' })}
              </span>
            </div>

            {!hasContent && (
              <div className="mt-5 rounded-xl border border-dashed border-edge bg-surface-sunken px-5 py-10 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-surface text-xl text-ink-muted" aria-hidden="true">⌁</span>
                <p className="mt-3 font-semibold text-ink">{t({ en: 'Your preview will appear here', vi: 'Nội dung xem trước sẽ xuất hiện ở đây' })}</p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-ink-muted">
                  {t({ en: 'Choose a lesson document or an exam workbook. Source files stay in this browser.', vi: 'Chọn tệp bài học hoặc bảng tính đề thi. Tệp gốc chỉ được đọc trong trình duyệt.' })}
                </p>
              </div>
            )}

            {hasContent && (
              <div className="mt-5 space-y-5">
                {draft.lessons.length > 0 && (
                  <section className="space-y-3" aria-labelledby="lessons-title">
                    <div className="flex items-center justify-between gap-2">
                      <h3 id="lessons-title" className="text-sm font-bold text-ink">{t({ en: 'Lesson content', vi: 'Nội dung bài học' })}</h3>
                      <span className="text-xs text-ink-muted">{t({ en: 'blocks in lesson order', vi: 'khối theo thứ tự bài' })}</span>
                    </div>
                    {draft.lessons.map((lesson, index) => (
                      <LessonReviewCard
                        key={`${lesson.source}:${index}`}
                        lesson={lesson}
                        index={index}
                        questions={draft.questions}
                        onEnglish={onEnglish}
                        onRemove={() => updateDraft((previous) => ({ ...previous, lessons: previous.lessons.filter((_, i) => i !== index) }))}
                      />
                    ))}
                  </section>
                )}

                {draft.questions.length > 0 && (
                  <section className="space-y-3" aria-labelledby="questions-title">
                    <div className="flex items-center justify-between gap-2">
                      <h3 id="questions-title" className="text-sm font-bold text-ink">{t({ en: 'Exam questions', vi: 'Câu hỏi trong ngân hàng đề' })}</h3>
                      <span className="text-xs text-ink-muted">{draft.questions.length}</span>
                    </div>
                    {draft.questions.map((question, index) => (
                      <QuestionReviewCard
                        key={`${question.subject_slug}:${question.key}`}
                        question={question}
                        index={index}
                        onEnglish={onEnglish}
                        onChange={(value) => updateDraft((previous) => ({ ...previous, questions: previous.questions.map((q, i) => (i === index ? value : q)) }))}
                        onRemove={() => updateDraft((previous) => ({ ...previous, questions: previous.questions.filter((_, i) => i !== index) }))}
                      />
                    ))}
                  </section>
                )}

                {draft.blueprints.length > 0 && (
                  <section className="space-y-3" aria-labelledby="exams-title">
                    <div className="flex items-center justify-between gap-2">
                      <h3 id="exams-title" className="text-sm font-bold text-ink">{t({ en: 'Exam blueprints', vi: 'Cấu trúc đề thi' })}</h3>
                      <span className="text-xs text-ink-muted">{draft.blueprints.length}</span>
                    </div>
                    {draft.blueprints.map((blueprint, index) => (
                      <BlueprintReviewCard
                        key={blueprint.code}
                        blueprint={blueprint}
                        index={index}
                        shortfalls={shortfalls.get(blueprint.code) ?? []}
                        onEnglish={onEnglish}
                        onRemove={() => updateDraft((previous) => ({ ...previous, blueprints: previous.blueprints.filter((_, i) => i !== index) }))}
                      />
                    ))}
                  </section>
                )}
              </div>
            )}
          </div>

          <section className={CARD} aria-labelledby="validation-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="validation-title" className="font-bold text-ink">{t({ en: 'Validation', vi: 'Kiểm tra nội dung' })}</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {!hasContent
                    ? t({ en: 'Choose a source file to begin.', vi: 'Hãy chọn tệp nguồn để bắt đầu.' })
                    : missing.length > 0
                      ? t({ en: `${missing.length} required English field(s) still need review.`, vi: `Còn ${missing.length} trường tiếng Anh bắt buộc cần bổ sung.` })
                      : t({ en: 'Required English fields are complete.', vi: 'Các trường tiếng Anh bắt buộc đã đủ.' })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {missing.length > 0 && (
                  <button type="button" onClick={goToMissing} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-action underline underline-offset-4 hover:text-action-hover">
                    {t({ en: 'Go to the next empty field', vi: 'Tới ô còn trống' })}
                  </button>
                )}
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${canSave ? 'bg-success-surface text-success' : 'bg-warning-surface text-warning'}`}>
                  {!hasContent
                    ? t({ en: 'Waiting for files', vi: 'Chờ tệp nguồn' })
                    : canSave
                      ? t({ en: 'Ready to save', vi: 'Có thể lưu' })
                      : t({ en: 'Review needed', vi: 'Cần hoàn thiện' })}
                </span>
              </div>
            </div>
            {unresolved.length > 0 && (
              <div className="mt-3 rounded-xl bg-danger-surface px-3 py-2 text-sm text-danger" role="alert">
                <p className="font-bold">{t({ en: 'Unresolved question references', vi: 'Tham chiếu câu hỏi chưa khớp' })}</p>
                <ul className="mt-1 list-inside list-disc">
                  {unresolved.map((ref) => (
                    <li key={`${ref.lesson}:${ref.key}`}>{ref.lesson} → <code>{ref.key}</code></li>
                  ))}
                </ul>
              </div>
            )}
            {conflicts.length > 0 && (
              <div className="mt-3 rounded-xl bg-danger-surface px-3 py-2 text-sm text-danger" role="alert">
                <p className="font-bold">{t({ en: 'A practice question belongs to one lesson, once', vi: 'Mỗi câu tự luyện chỉ thuộc một bài, dùng một lần' })}</p>
                <ul className="mt-1 list-inside list-disc">
                  {conflicts.map((ref, i) => (
                    <li key={`${ref.lesson}:${ref.key}:${i}`}>{ref.lesson} → <code>{ref.key}</code></li>
                  ))}
                </ul>
              </div>
            )}
            {shortfalls.size > 0 && (
              <div className="mt-3 rounded-xl bg-danger-surface px-3 py-2 text-sm text-danger" role="alert">
                <p className="font-bold">{t({ en: 'Exams without enough questions', vi: 'Đề chưa đủ câu hỏi' })}</p>
                <ul className="mt-1 list-inside list-disc">
                  {[...shortfalls.keys()].map((code) => <li key={code}><code>{code}</code></li>)}
                </ul>
              </div>
            )}
          </section>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
            {isAdmin ? (
              <>
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={publish}
                    disabled={saving || success}
                    onChange={(e) => setPublish(e.currentTarget.checked)}
                    className="h-4 w-4 rounded accent-[var(--action)]"
                  />
                  {t({ en: 'Publish for learners', vi: 'Xuất bản cho học sinh' })}
                </label>
                <span className="hidden text-xs text-ink-muted sm:inline">
                  {t({
                    en: 'Default: lessons are drafts and exams wait in the review queue. Source files are not uploaded.',
                    vi: 'Mặc định: bài học là bản nháp, đề thi vào hàng chờ duyệt. Tệp gốc không được tải lên.',
                  })}
                </span>
              </>
            ) : (
              <span className="text-xs text-ink-muted">
                {t({
                  en: 'Lessons are saved as drafts you submit from the Studio; questions and exams go to an admin for review.',
                  vi: 'Bài học lưu thành bản nháp để bạn gửi duyệt trong Studio; câu hỏi và đề thi được gửi admin duyệt.',
                })}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            {result?.status === 'error' && <p role="alert" className="max-w-md text-xs leading-5 text-danger">{result.message}</p>}
            {success && (
              <p role="status" className="max-w-md text-xs font-semibold leading-5 text-success">
                {t({
                  en: `Saved ${result.lessons} lesson(s), ${result.questions} question(s), ${result.blueprints} exam(s).`,
                  vi: `Đã lưu ${result.lessons} bài học, ${result.questions} câu hỏi, ${result.blueprints} đề thi.`,
                })}{' '}
                {result.lessons > 0 && <Link href="/teacher/lessons" className="underline">{t({ en: 'Open lessons', vi: 'Mở danh sách bài' })}</Link>}
                {result.blueprints > 0 && result.published && (
                  <> · <Link href="/exam" className="underline">{t({ en: 'Exam room', vi: 'Phòng thi' })}</Link></>
                )}
                {result.blueprints + result.questions > 0 && !result.published && ` ${t({ en: 'Exams wait for admin review.', vi: 'Đề thi chờ admin duyệt.' })}`}
              </p>
            )}
            {success ? (
              <button type="button" onClick={reset} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-edge bg-surface px-5 text-sm font-bold text-ink hover:bg-surface-sunken">
                {t({ en: 'Import more', vi: 'Nhập tiếp' })}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void save()}
                disabled={!canSave || saving}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-action px-5 text-sm font-bold text-action-ink transition hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span aria-hidden="true">{saving ? '◌' : '▣'}</span>
                {saving
                  ? t({ en: 'Saving…', vi: 'Đang lưu…' })
                  : isAdmin
                    ? t({ en: 'Save content', vi: 'Lưu nội dung' })
                    : t({ en: 'Save and send for review', vi: 'Lưu và gửi duyệt' })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
