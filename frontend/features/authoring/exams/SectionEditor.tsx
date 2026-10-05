'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { layoutQuestionIds, MAX_PASSAGE_TEXT, type ExamSection } from '@scipal/types';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { LessonStatusBadge } from '../lessonStatusBadge';
import type { AuthorQuestion } from '../practice/api';
import { QUESTION_TYPE_LABEL } from '../practice/questionDraft';
import { BankBrowser } from './BankBrowser';
import { addGroup, addToSection, moveInGroup, removeFromLayout, removeGroup, setPassage } from './examDraft';
import { DIFFICULTY_LABEL, questionStem } from './QuestionBank';

type Bilingual = { en: string; vi: string };

const TEXTAREA = 'min-h-20 w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-ink disabled:opacity-60';

interface SectionEditorProps {
  layout: ExamSection[];
  /** Questions the builder has loaded, by id. */
  rows: Record<string, AuthorQuestion>;
  /** Sections short of or over the template (`sectionProblems`). */
  problems: Array<{ key: string; message: Bilingual }>;
  /** The exam's subject; empty until one is chosen, which hides the bank. */
  subjectId: string;
  readOnly?: boolean;
  /** What to say for a question whose row has not loaded (loading, failed or gone). */
  missingLabel?: Bilingual;
  onChange: (layout: ExamSection[]) => void;
  /** Questions picked from the bank, so the builder can show them. */
  onKnown: (rows: AuthorQuestion[]) => void;
}

/**
 * The sections of a structured exam (THPTQG, ĐGNL): one tab per section with its "x / count"
 * counter, the questions of each group with an optional shared passage, and the bank filtered to
 * the section's question type.
 */
export function SectionEditor({ layout, rows, problems, subjectId, readOnly = false, missingLabel, onChange, onKnown }: SectionEditorProps) {
  const { t } = useLanguage();
  const ids = useId();
  const [activeKey, setActiveKey] = useState(layout[0]?.key ?? '');
  const [bankFor, setBankFor] = useState<{ key: string; group: number } | null>(null);
  const active = layout.find((s) => s.key === activeKey) ?? layout[0];
  const allIds = layoutQuestionIds(layout);

  if (!active) return null;

  const tabId = (key: string) => `${ids}-tab-${key}`;
  const select = (key: string) => {
    setActiveKey(key);
    setBankFor(null);
  };
  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = layout[(index + step + layout.length) % layout.length]!;
    select(next.key);
    document.getElementById(tabId(next.key))?.focus();
  };

  const editPassage = (groupIndex: number, lang: 'vi' | 'en', value: string) => {
    const old = active.groups[groupIndex]?.passage ?? { vi: '', en: '' };
    const next = { ...old, [lang]: value };
    onChange(setPassage(layout, active.key, groupIndex, next.vi || next.en ? next : undefined));
  };

  const dropGroup = (groupIndex: number) => {
    const group = active.groups[groupIndex];
    if (group?.passage && !window.confirm(t({ en: 'Remove this group and its passage? Its questions move to the group next to it.', vi: 'Bỏ nhóm này cùng đoạn văn? Các câu của nhóm sẽ chuyển sang nhóm bên cạnh.' }))) return;
    setBankFor(null);
    onChange(removeGroup(layout, active.key, groupIndex));
  };

  // Question numbers run on across the groups of a section.
  const starts = active.groups.reduce<number[]>((acc, g, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + active.groups[i - 1]!.question_ids.length], []);
  const several = active.groups.length > 1;

  return (
    <div className="flex flex-col gap-4">
      {problems.length > 0 ? (
        <ul aria-label={t({ en: 'Structure check', vi: 'Kiểm tra cấu trúc' })} className="flex flex-col gap-1 rounded-lg bg-warning-surface px-3 py-2 text-sm text-warning">
          {problems.map((p) => (
            <li key={p.key}>{t(p.message)}</li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-success-surface px-3 py-2 text-sm text-success">
          {t({ en: 'Every section has the number of questions the structure asks for.', vi: 'Các phần đã đủ số câu theo cấu trúc.' })}
        </p>
      )}

      <div role="tablist" aria-label={t({ en: 'Exam sections', vi: 'Các phần của đề' })} className="flex flex-wrap gap-2">
        {layout.map((s, i) => {
          const n = layoutQuestionIds([s]).length;
          const selected = s.key === active.key;
          return (
            <button
              key={s.key}
              id={tabId(s.key)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${ids}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(s.key)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                'flex min-h-11 flex-col items-start rounded-lg border px-3 py-1.5 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus',
                selected ? 'border-action bg-surface-sunken text-ink' : 'border-line bg-surface text-ink-muted',
              )}
            >
              <span className="font-semibold">{t(s.title)}</span>
              <span className={cn('text-xs tabular-nums', n === s.count ? 'text-success' : 'text-ink-muted')}>
                {n} / {s.count}
              </span>
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id={`${ids}-panel`} aria-labelledby={tabId(active.key)} className="flex flex-col gap-4">
        <div>
          <h3 className="text-base font-bold text-ink">{t(active.title)}</h3>
          <p className="text-sm text-ink-muted">
            {t({
              en: `${QUESTION_TYPE_LABEL[active.kind].en} · ${active.count} questions · ${active.max_points} points`,
              vi: `${QUESTION_TYPE_LABEL[active.kind].vi} · ${active.count} câu · ${active.max_points} điểm`,
            })}
          </p>
        </div>

        {active.groups.map((group, gi) => {
          const groupName = { en: `Group ${gi + 1}`, vi: `Nhóm ${gi + 1}` };
          const bankOpen = bankFor?.key === active.key && bankFor.group === gi;
          return (
            <div key={gi} className={cn('flex flex-col gap-3', several && 'rounded-lg border border-line p-3')}>
              {several && (
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-ink">{t(groupName)}</h4>
                  {!readOnly && (
                    <Button type="button" variant="ghost" aria-label={t({ en: `Remove group ${gi + 1}`, vi: `Bỏ nhóm ${gi + 1}` })} onClick={() => dropGroup(gi)}>
                      {t({ en: 'Remove group', vi: 'Bỏ nhóm' })}
                    </Button>
                  )}
                </div>
              )}

              {(!readOnly || group.passage) && (
                <details open={!!group.passage} className="rounded-lg border border-line p-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink">
                    {t({ en: 'Shared passage (optional)', vi: 'Đoạn văn dùng chung (không bắt buộc)' })}
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {(['vi', 'en'] as const).map((lang) => (
                      <div key={lang} className="flex flex-col gap-1">
                        <label htmlFor={`${ids}-${active.key}-${gi}-${lang}`} className="text-sm font-semibold text-ink">
                          {lang === 'vi'
                            ? t({ en: 'Shared passage (Vietnamese)', vi: 'Đoạn văn dùng chung (tiếng Việt)' })
                            : t({ en: 'Shared passage (English)', vi: 'Đoạn văn dùng chung (tiếng Anh)' })}
                        </label>
                        <textarea
                          id={`${ids}-${active.key}-${gi}-${lang}`}
                          value={group.passage?.[lang] ?? ''}
                          maxLength={MAX_PASSAGE_TEXT}
                          disabled={readOnly}
                          onChange={(e) => editPassage(gi, lang, e.target.value)}
                          className={TEXTAREA}
                        />
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {group.question_ids.length === 0 ? (
                <p className="rounded-lg border border-dashed border-edge p-4 text-center text-sm text-ink-muted">
                  {several ? t({ en: 'No questions in this group yet.', vi: 'Nhóm chưa có câu hỏi.' }) : t({ en: 'No questions in this section yet.', vi: 'Phần này chưa có câu hỏi.' })}
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {group.question_ids.map((id, qi) => {
                    const row = rows[id];
                    const n = starts[gi]! + qi + 1;
                    return (
                      <li key={id} className="flex flex-col gap-2 rounded-lg border border-line p-3 sm:flex-row sm:items-center">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-surface-sunken text-sm font-bold tabular-nums text-ink-muted">{n}</span>
                        <div className="min-w-0 flex-1">
                          {row ? (
                            <>
                              <p className="line-clamp-2 text-sm text-ink">{questionStem(row, t)}</p>
                              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                                <span>{t(QUESTION_TYPE_LABEL[row.type])}</span>
                                <span>· {t(DIFFICULTY_LABEL[row.difficulty] ?? DIFFICULTY_LABEL[1]!)}</span>
                                {row.status !== 'published' && <LessonStatusBadge status={row.status} />}
                              </p>
                              {row.type !== active.kind && (
                                <p className="mt-1 text-xs font-semibold text-danger">{t({ en: 'This question’s type does not fit the section.', vi: 'Câu này không đúng dạng của phần.' })}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-sm text-ink-muted">{t(missingLabel ?? { en: 'Loading…', vi: 'Đang tải…' })}</p>
                          )}
                        </div>
                        {!readOnly && (
                          <div className="flex shrink-0 flex-wrap items-center gap-1">
                            <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Move question ${n} up`, vi: `Đưa câu ${n} lên` })} disabled={qi === 0} onClick={() => onChange(moveInGroup(layout, active.key, gi, qi, qi - 1))}>
                              <ArrowUp aria-hidden="true" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={t({ en: `Move question ${n} down`, vi: `Đưa câu ${n} xuống` })}
                              disabled={qi === group.question_ids.length - 1}
                              onClick={() => onChange(moveInGroup(layout, active.key, gi, qi, qi + 1))}
                            >
                              <ArrowDown aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label={t({ en: `Remove question ${n}`, vi: `Bỏ câu ${n}` })} onClick={() => onChange(removeFromLayout(layout, id))}>
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}

              {!readOnly && subjectId && (
                <div className="flex flex-col gap-3">
                  <div>
                    <Button
                      type="button"
                      variant={bankOpen ? 'secondary' : 'outline'}
                      aria-expanded={bankOpen}
                      aria-label={several ? t({ en: `Add questions from the bank to group ${gi + 1}`, vi: `Thêm câu từ ngân hàng vào nhóm ${gi + 1}` }) : undefined}
                      onClick={() => setBankFor(bankOpen ? null : { key: active.key, group: gi })}
                    >
                      {t({ en: 'Add questions from the bank', vi: 'Thêm câu từ ngân hàng' })}
                    </Button>
                  </div>
                  {bankOpen && (
                    <div className="rounded-lg border border-line p-3">
                      <BankBrowser
                        subjectId={subjectId}
                        type={active.kind}
                        excludeIds={allIds}
                        onAdd={(added) => {
                          onKnown(added);
                          onChange(addToSection(layout, active.key, gi, added.map((q) => q.id)));
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!readOnly && (
          <div className="flex flex-col items-start gap-1">
            <Button type="button" variant="outline" onClick={() => onChange(addGroup(layout, active.key))}>
              {t({ en: 'Add a question group', vi: 'Thêm nhóm câu' })}
            </Button>
            <p className="text-xs text-ink-muted">
              {t({ en: 'Use a group when several questions share one passage or chart.', vi: 'Dùng nhóm khi nhiều câu dùng chung một đoạn văn hoặc biểu đồ.' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
