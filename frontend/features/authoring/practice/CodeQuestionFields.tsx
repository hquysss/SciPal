'use client';

import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { MAX_CODE_TESTS, type CodeLanguage, type CodeResult, type CodeTest } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { CodeResults } from '@/features/lessons/CodeResults';
import { LABEL, SMALL_BUTTON, TEXTAREA } from '../editor/editors/styles';
import { AutoTranslatedNote } from '../translation/AutoTranslateContext';
import { verifyCode } from './api';
import type { QuestionDraft } from './questionDraft';

type Bilingual = { en: string; vi: string };
type Data = QuestionDraft['data'];

const INPUT = TEXTAREA.replace('py-2', 'py-1.5');
const MONO = `${TEXTAREA} font-mono text-sm`;
const LANGUAGES: Array<{ id: CodeLanguage; label: string }> = [{ id: 'python', label: 'Python' }, { id: 'cpp', label: 'C++' }];

interface CodeQuestionFieldsProps {
  data: Data;
  lang: 'vi' | 'en';
  onData: (patch: Partial<Data>) => void;
}

/** The part of the question editor that is specific to programming questions: statement, limits, starter code and tests. */
export function CodeQuestionFields({ data, lang, onData }: CodeQuestionFieldsProps) {
  const { t } = useLanguage();
  const ids = useId();
  const tests = data.tests ?? [];
  const [solutionLang, setSolutionLang] = useState<CodeLanguage>('python');
  const [solution, setSolution] = useState('');
  const [checking, setChecking] = useState(false);
  const [report, setReport] = useState<{ result: CodeResult } | { error: Bilingual } | null>(null);

  const setTest = (i: number, patch: Partial<CodeTest>) => onData({ tests: tests.map((test, j) => (j === i ? { ...test, ...patch } : test)) });
  const spec = (key: 'input_spec' | 'output_spec', label: Bilingual) => {
    const text = data[key];
    const write = (value: string) => onData({ [key]: { ...(text ?? { vi: '', en: '' }), [lang]: value } });
    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={`${ids}-${key}`} className={LABEL}>{t(label)}</label>
        <textarea id={`${ids}-${key}`} rows={2} value={text?.[lang] ?? ''} onChange={(e) => write(e.target.value)} className={TEXTAREA} />
        {lang === 'en' && text && <AutoTranslatedNote text={text} onEnglish={write} />}
      </div>
    );
  };
  const limit = (key: 'time_limit_ms' | 'memory_limit_mb', label: Bilingual, min: number, max: number) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${ids}-${key}`} className={LABEL}>{t(label)}</label>
      <input
        id={`${ids}-${key}`}
        type="number"
        min={min}
        max={max}
        value={data[key] ?? ''}
        onChange={(e) => onData({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })}
        className={`${INPUT} w-32`}
      />
    </div>
  );

  const check = async () => {
    if (checking || !solution.trim()) return;
    setChecking(true);
    setReport(null);
    const res = await verifyCode({ language: solutionLang, source: solution, tests, time_limit_ms: data.time_limit_ms ?? 2000, memory_limit_mb: data.memory_limit_mb ?? 128 });
    setChecking(false);
    setReport(res.ok ? { result: res.data } : { error: res.error });
  };

  return (
    <>
      {spec('input_spec', { en: 'Input description', vi: 'Mô tả dữ liệu vào' })}
      {spec('output_spec', { en: 'Output description', vi: 'Mô tả kết quả ra' })}
      <div className="flex flex-wrap gap-4">
        {limit('time_limit_ms', { en: 'Time limit (ms, 500–5000)', vi: 'Giới hạn thời gian (ms, 500–5000)' }, 500, 5000)}
        {limit('memory_limit_mb', { en: 'Memory limit (MB, 16–256)', vi: 'Giới hạn bộ nhớ (MB, 16–256)' }, 16, 256)}
      </div>

      {LANGUAGES.map(({ id, label }) => (
        <div key={id} className="flex flex-col gap-1">
          <label htmlFor={`${ids}-starter-${id}`} className={LABEL}>{t({ en: `Starter code, ${label} (optional)`, vi: `Code mẫu ${label} (không bắt buộc)` })}</label>
          <textarea
            id={`${ids}-starter-${id}`}
            rows={4}
            spellCheck={false}
            value={data.starter?.[id] ?? ''}
            onChange={(e) => onData({ starter: { ...data.starter, [id]: e.target.value } })}
            className={MONO}
          />
        </div>
      ))}

      <fieldset className="flex flex-col gap-3">
        <legend className={LABEL}>{t({ en: 'Tests — learners see the examples only', vi: 'Bộ test — học sinh chỉ thấy các ví dụ mẫu' })}</legend>
        {tests.map((test, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-line p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-bold text-ink">Test {i + 1}</span>
              <label className="flex min-h-9 items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={test.sample}
                  onChange={(e) => setTest(i, { sample: e.target.checked })}
                  aria-label={t({ en: `Test ${i + 1} is an example`, vi: `Test ${i + 1} là ví dụ mẫu` })}
                  className="h-5 w-5 accent-[var(--action)]"
                />
                {t({ en: 'Example (shown to learners)', vi: 'Ví dụ mẫu (học sinh thấy)' })}
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                {t({ en: 'Points', vi: 'Điểm' })}
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={test.points}
                  onChange={(e) => setTest(i, { points: Number(e.target.value) || 1 })}
                  className={`${INPUT} w-20`}
                />
              </label>
              <button
                type="button"
                disabled={tests.length <= 1}
                onClick={() => onData({ tests: tests.filter((_, j) => j !== i) })}
                aria-label={t({ en: `Remove test ${i + 1}`, vi: `Bỏ test ${i + 1}` })}
                className={`${SMALL_BUTTON} ml-auto`}
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <textarea
                rows={3}
                spellCheck={false}
                value={test.input}
                onChange={(e) => setTest(i, { input: e.target.value })}
                aria-label={t({ en: `Test ${i + 1} input`, vi: `Test ${i + 1}: dữ liệu vào` })}
                className={MONO}
              />
              <textarea
                rows={3}
                spellCheck={false}
                value={test.expected}
                onChange={(e) => setTest(i, { expected: e.target.value })}
                aria-label={t({ en: `Test ${i + 1} expected output`, vi: `Test ${i + 1}: kết quả đúng` })}
                className={MONO}
              />
            </div>
          </div>
        ))}
        {tests.length < MAX_CODE_TESTS && (
          <button type="button" onClick={() => onData({ tests: [...tests, { input: '', expected: '', sample: false, points: 1 }] })} className={`${SMALL_BUTTON} self-start`}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            {t({ en: 'Add test', vi: 'Thêm test' })}
          </button>
        )}
      </fieldset>

      <section aria-label={t({ en: 'Check the tests', vi: 'Kiểm tra bộ test' })} className="flex flex-col gap-2 rounded-lg border border-line bg-surface-sunken p-3">
        <p className="text-sm text-ink-muted">
          {t({ en: 'Paste a model solution and run it on every test, hidden ones included, before you save.', vi: 'Dán một lời giải mẫu và chạy trên mọi test (cả test ẩn) trước khi lưu.' })}
        </p>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t({ en: 'Language', vi: 'Ngôn ngữ' })}>
          {LANGUAGES.map(({ id, label }) => (
            <button key={id} type="button" role="tab" aria-selected={solutionLang === id} onClick={() => setSolutionLang(id)} className={`${SMALL_BUTTON} ${solutionLang === id ? 'border-accent' : ''}`}>
              {label}
            </button>
          ))}
        </div>
        <textarea
          rows={5}
          spellCheck={false}
          value={solution}
          onChange={(e) => setSolution(e.target.value)}
          aria-label={t({ en: 'Model solution', vi: 'Lời giải mẫu' })}
          className={MONO}
        />
        <button type="button" disabled={checking || !solution.trim()} onClick={check} className={`${buttonVariants({ variant: 'outline' })} self-start`}>
          {checking ? t({ en: 'Checking…', vi: 'Đang kiểm tra…' }) : t({ en: 'Check the tests', vi: 'Kiểm tra bộ test' })}
        </button>
        <div aria-live="polite">
          {report && ('error' in report ? <p role="alert" className="text-sm text-danger">{t(report.error)}</p> : <CodeResults result={report.result} t={t} />)}
        </div>
      </section>
    </>
  );
}
