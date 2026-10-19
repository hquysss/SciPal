'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Code2, Copy, Cpu, LoaderCircle, LogIn, LogOut, Play, RotateCcw, Send, Terminal, Timer, Upload } from 'lucide-react';
import { MAX_CODE_CHARS, type CodeLanguage, type PracticeCheckResult, type PracticeResponse, type PublicPracticeQuestion } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import { runCode, submitCode, type CodeRunOutput } from './practiceApi';
import { CodeEditor, ToolbarSelect, toolbarControl } from './CodeEditor';
import { CodeResults, VERDICT_TEXT } from './CodeResults';

type Bilingual = { en: string; vi: string };
type CodeData = Extract<PublicPracticeQuestion['data'], { samples: unknown }>;

const LANGUAGE_OPTIONS: Array<{ value: CodeLanguage; label: string }> = [
  { value: 'python', label: 'Python 3' },
  { value: 'cpp', label: 'C++' },
];
const TOO_BIG: Bilingual = { en: 'That file is too large (64 KB at most).', vi: 'File quá lớn (tối đa 64 KB).' };
const SECTION = 'flex flex-col gap-2 rounded-2xl bg-surface-sunken p-3 sm:p-4';
const HEADING = 'flex items-center gap-2 text-sm font-bold text-ink';
const ICON = 'h-4 w-4 shrink-0 text-accent';
const PRE = 'min-h-11 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface px-3 py-2 font-mono text-sm text-ink';

interface CodeAnswerProps {
  question: PublicPracticeQuestion;
  answer: PracticeResponse | undefined;
  result?: PracticeCheckResult;
  onAnswer: (answer: PracticeResponse) => void;
  /** `checked` is the answer object the verdict is for. */
  onResult: (result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
}

/** A small "copy" button for an example block. */
function CopyButton({ text, label, t }: { text: string; label: Bilingual; t: (text: Bilingual) => string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          window.setTimeout(() => setDone(false), 1500);
        })
      }
      className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
    >
      {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
      <span aria-live="polite">{done ? t({ en: 'Copied', vi: 'Đã chép' }) : t(label)}</span>
    </button>
  );
}

/** A programming question as an online judge shows it: the brief, the examples, a code window, a console and the verdict. */
export function CodeAnswer({ question, answer, result, onAnswer, onResult, t }: CodeAnswerProps) {
  const id = useId();
  const data = question.data as CodeData;
  const language: CodeLanguage = answer?.code?.language ?? 'python';
  const source = answer?.code?.source ?? data.starter[language] ?? '';
  // What the learner wrote in the language they left, so switching back loses nothing.
  const drafts = useRef<Partial<Record<CodeLanguage, string>>>({});
  const fileInput = useRef<HTMLInputElement>(null);
  const [stdin, setStdin] = useState(data.samples[0]?.input ?? '');
  const [run, setRun] = useState<CodeRunOutput | null>(null);
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [problem, setProblem] = useState<{ error: Bilingual; signIn: boolean } | null>(null);
  const latest = useRef(answer);
  useEffect(() => {
    latest.current = answer;
  });

  const write = (next: { language?: CodeLanguage; source: string }) => {
    setProblem(null);
    onAnswer({ code: { language: next.language ?? language, source: next.source } });
  };
  const chooseLanguage = (next: CodeLanguage) => {
    if (next === language) return;
    drafts.current[language] = source;
    setRun(null);
    write({ language: next, source: drafts.current[next] ?? data.starter[next] ?? '' });
  };
  const readFile = (file: File) => {
    if (file.size > MAX_CODE_CHARS) return setProblem({ error: TOO_BIG, signIn: false });
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      if (text.length > MAX_CODE_CHARS) return setProblem({ error: TOO_BIG, signIn: false });
      const name = file.name.toLowerCase();
      const fromName: CodeLanguage = /\.(cpp|cc|cxx)$/.test(name) ? 'cpp' : /\.py$/.test(name) ? 'python' : language;
      write({ language: fromName, source: text });
    };
    reader.readAsText(file);
  };

  const trial = async () => {
    if (busy || !source.trim()) return;
    setBusy('run');
    setProblem(null);
    const res = await runCode(question.id, { language, source }, stdin);
    setBusy(null);
    if (res.ok) setRun(res.run);
    else setProblem({ error: res.error, signIn: res.signIn });
  };
  const submit = async () => {
    if (busy || !source.trim()) return;
    setBusy('submit');
    setProblem(null);
    const checked = answer;
    const res = await submitCode(question.id, { language, source });
    setBusy(null);
    // The code changed while it was being judged: that verdict belongs to the old code.
    if (latest.current !== checked) return;
    if (res.ok) onResult(res.result, checked);
    else setProblem({ error: res.error, signIn: res.signIn });
  };

  const lineCount = source === '' ? 0 : source.replace(/\n$/, '').split('\n').length;
  const chip = 'inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-xs font-semibold text-ink';

  return (
    <div className="mt-3 flex flex-col gap-4">
      <ul className="flex flex-wrap gap-2" aria-label={t({ en: 'About this problem', vi: 'Thông tin bài' })}>
        <li className={chip}>
          <Code2 aria-hidden="true" className={ICON} />
          {t({ en: 'Programming', vi: 'Bài lập trình' })}
        </li>
        <li className={`${chip} tabular-nums`}>
          <Timer aria-hidden="true" className={ICON} />
          {t({ en: `Time ${data.time_limit_ms / 1000} s`, vi: `Thời gian ${data.time_limit_ms / 1000} giây` })}
          <span className="sr-only">({data.time_limit_ms} ms)</span>
        </li>
        <li className={`${chip} tabular-nums`}>
          <Cpu aria-hidden="true" className={ICON} />
          {t({ en: `Memory ${data.memory_limit_mb} MB`, vi: `Bộ nhớ ${data.memory_limit_mb} MB` })}
        </li>
      </ul>

      <div className="grid gap-3 sm:grid-cols-2">
        <section className={SECTION} aria-labelledby={`${id}-in`}>
          <h4 id={`${id}-in`} className={HEADING}>
            <LogIn aria-hidden="true" className={ICON} />
            {t({ en: 'Input', vi: 'Dữ liệu vào' })}
          </h4>
          <MathText text={t(data.input_spec)} className="text-sm leading-relaxed text-ink" />
        </section>
        <section className={SECTION} aria-labelledby={`${id}-out`}>
          <h4 id={`${id}-out`} className={HEADING}>
            <LogOut aria-hidden="true" className={ICON} />
            {t({ en: 'Output', vi: 'Kết quả ra' })}
          </h4>
          <MathText text={t(data.output_spec)} className="text-sm leading-relaxed text-ink" />
        </section>
      </div>

      {data.samples.map((sample, i) => (
        <section key={i} className={SECTION} aria-label={t({ en: `Example ${i + 1}`, vi: `Ví dụ ${i + 1}` })}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className={HEADING}>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-surface px-2 text-xs font-bold text-ink">{i + 1}</span>
              {t({ en: `Example ${i + 1}`, vi: `Ví dụ ${i + 1}` })}
            </h4>
            <button
              type="button"
              onClick={() => setStdin(sample.input)}
              className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-ink underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus"
            >
              <Terminal aria-hidden="true" className="h-3.5 w-3.5" />
              {t({ en: 'Use as trial input', vi: 'Dùng để chạy thử' })}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink">{t({ en: 'Input', vi: 'Vào' })}</p>
                <CopyButton text={sample.input} label={{ en: 'Copy', vi: 'Chép' }} t={t} />
              </div>
              <pre className={PRE}>{sample.input}</pre>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink">{t({ en: 'Output', vi: 'Ra' })}</p>
                <CopyButton text={sample.expected} label={{ en: 'Copy', vi: 'Chép' }} t={t} />
              </div>
              <pre className={PRE}>{sample.expected}</pre>
            </div>
          </div>
        </section>
      ))}

      <div className="flex flex-col gap-2">
        <CodeEditor
          value={source}
          onChange={(next) => write({ source: next })}
          language={language}
          label={t({ en: 'Your code', vi: 'Code của em' })}
          describedBy={`${id}-keys`}
          tools={
            <>
              <ToolbarSelect label={t({ en: 'Programming language', vi: 'Ngôn ngữ lập trình' })} value={language} options={LANGUAGE_OPTIONS} onChange={chooseLanguage} />
              <button type="button" onClick={() => fileInput.current?.click()} className={toolbarControl}>
                <Upload aria-hidden="true" className="h-4 w-4" />
                {t({ en: 'Upload', vi: 'Tải file' })}
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".py,.cpp,.cc,.txt"
                aria-label={t({ en: 'Upload a code file', vi: 'Tải file code' })}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                  e.target.value = '';
                }}
              />
              <button type="button" onClick={() => write({ source: data.starter[language] ?? '' })} className={toolbarControl}>
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {t({ en: 'Reset', vi: 'Đặt lại' })}
              </button>
            </>
          }
          status={
            <>
              <span>
                {LANGUAGE_OPTIONS.find((o) => o.value === language)!.label} · {t({ en: `${lineCount} lines`, vi: `${lineCount} dòng` })}
              </span>
              <span id={`${id}-keys`}>{t({ en: 'Tab: indent · Esc then Tab: leave', vi: 'Tab: thụt lề · Esc rồi Tab: thoát khung' })}</span>
            </>
          }
        />
      </div>

      <section className={SECTION} aria-labelledby={`${id}-console`}>
        <h4 id={`${id}-console`} className={HEADING}>
          <Terminal aria-hidden="true" className={ICON} />
          {t({ en: 'Try it before you submit', vi: 'Chạy thử trước khi nộp' })}
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-stdin`} className="text-xs font-bold uppercase tracking-wide text-ink">
              {t({ en: 'Input to try', vi: 'Dữ liệu vào để chạy thử' })}
            </label>
            <textarea
              id={`${id}-stdin`}
              value={stdin}
              rows={4}
              maxLength={MAX_CODE_CHARS}
              spellCheck={false}
              onChange={(e) => setStdin(e.target.value)}
              className="w-full flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          </div>
          <div className="flex flex-col gap-1" aria-live="polite">
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink">
              {t({ en: 'Program output', vi: 'Chương trình in ra' })}
              {run && (
                <span className={`rounded-full px-2 py-0.5 normal-case tracking-normal ${run.status === 'AC' ? 'bg-success-surface text-success' : 'bg-danger-surface text-danger'}`}>
                  {run.status === 'AC' ? t({ en: 'Ran fine', vi: 'Chạy xong' }) : t(VERDICT_TEXT[run.status])} · {run.time_ms} ms
                </span>
              )}
            </p>
            <pre className={`${PRE} flex-1`}>{run ? run.stdout || run.stderr || ' ' : <span className="font-sans text-ink-muted">{t({ en: 'Press Try it to see what your program prints.', vi: 'Bấm Chạy thử để xem chương trình in ra gì.' })}</span>}</pre>
            {run?.stdout && run.stderr && <pre className={`${PRE} text-danger`}>{run.stderr}</pre>}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl bg-surface-sunken p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <p className="text-sm text-ink">
          {t({ en: 'Submitting runs your code on every test, hidden ones too.', vi: 'Nộp bài sẽ chạy code của em trên mọi test, kể cả test ẩn.' })}
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" disabled={!!busy || !source.trim()} onClick={trial} className={`${buttonVariants({ variant: 'ghost' })} gap-2 bg-surface`}>
            {busy === 'run' ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Play aria-hidden="true" className="h-4 w-4" />}
            {busy === 'run' ? t({ en: 'Running…', vi: 'Đang chạy…' }) : t({ en: 'Try it', vi: 'Chạy thử' })}
          </button>
          <button type="button" disabled={!!busy || !source.trim()} onClick={submit} className={`${buttonVariants()} gap-2 px-6`}>
            {busy === 'submit' ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="h-4 w-4" />}
            {busy === 'submit' ? t({ en: 'Judging…', vi: 'Đang chấm…' }) : t({ en: 'Submit', vi: 'Nộp bài' })}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {problem && (
          <p role="alert" className="rounded-xl bg-danger-surface px-3 py-2 text-sm font-medium text-danger">
            {t(problem.error)}{' '}
            {problem.signIn && (
              <Link href="/login" className="font-bold underline">
                {t({ en: 'Sign in', vi: 'Đăng nhập' })}
              </Link>
            )}
          </p>
        )}
        {result?.code && <CodeResults key={JSON.stringify(result.code.tests.map((x) => x.verdict))} result={result.code} xpEarned={result.xp_earned} t={t} />}
      </div>
    </div>
  );
}
