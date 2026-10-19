'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { MAX_CODE_CHARS, type CodeLanguage, type PracticeCheckResult, type PracticeResponse, type PublicPracticeQuestion } from '@scipal/types';
import { buttonVariants } from '@/components/ui/button';
import { MathText } from '@/components/math/MathText';
import { LANG_LABEL } from '@/components/code/CodePanel';
import { runCode, submitCode, type CodeRunOutput } from './practiceApi';
import { CodeEditor } from './CodeEditor';
import { CodeResults, VERDICT_TEXT } from './CodeResults';

type Bilingual = { en: string; vi: string };
type CodeData = Extract<PublicPracticeQuestion['data'], { samples: unknown }>;

const LANGUAGES: CodeLanguage[] = ['python', 'cpp'];
const LABEL = 'text-sm font-semibold text-ink';
const PRE = 'mt-1 overflow-auto whitespace-pre-wrap break-words rounded-md bg-surface-sunken px-3 py-2 font-mono text-sm text-ink';
const TOO_BIG: Bilingual = { en: 'That file is too large (64 KB at most).', vi: 'File quá lớn (tối đa 64 KB).' };

interface CodeAnswerProps {
  question: PublicPracticeQuestion;
  answer: PracticeResponse | undefined;
  result?: PracticeCheckResult;
  onAnswer: (answer: PracticeResponse) => void;
  /** `checked` is the answer object the verdict is for. */
  onResult: (result: PracticeCheckResult, checked: PracticeResponse | undefined) => void;
  t: (text: Bilingual) => string;
}

/** A programming question: statement on top, then the code box, a trial run, and the judged result. */
export function CodeAnswer({ question, answer, result, onAnswer, onResult, t }: CodeAnswerProps) {
  const id = useId();
  const data = question.data as CodeData;
  const language: CodeLanguage = answer?.code?.language ?? 'python';
  const source = answer?.code?.source ?? data.starter[language] ?? '';
  // What the learner wrote in the language they left, so switching back loses nothing.
  const drafts = useRef<Partial<Record<CodeLanguage, string>>>({});
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

  return (
    <div className="mt-3 flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-sm text-ink">
        <p>
          <span className={LABEL}>{t({ en: 'Input', vi: 'Dữ liệu vào' })}: </span>
          <MathText text={t(data.input_spec)} />
        </p>
        <p>
          <span className={LABEL}>{t({ en: 'Output', vi: 'Kết quả ra' })}: </span>
          <MathText text={t(data.output_spec)} />
        </p>
        <p className="tabular-nums text-ink-muted">
          {t({ en: `Time limit ${data.time_limit_ms} ms · memory ${data.memory_limit_mb} MB`, vi: `Giới hạn thời gian ${data.time_limit_ms} ms · bộ nhớ ${data.memory_limit_mb} MB` })}
        </p>
      </div>
      {data.samples.map((sample, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className={LABEL}>{t({ en: `Example ${i + 1}: input`, vi: `Ví dụ ${i + 1}: vào` })}</p>
            <pre className={PRE}>{sample.input}</pre>
          </div>
          <div>
            <p className={LABEL}>{t({ en: 'Output', vi: 'Kết quả ra' })}</p>
            <pre className={PRE}>{sample.expected}</pre>
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label={t({ en: 'Language', vi: 'Ngôn ngữ' })} className="flex gap-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                role="tab"
                aria-selected={lang === language}
                onClick={() => chooseLanguage(lang)}
                className={`min-h-11 rounded-full border px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${lang === language ? 'border-accent bg-surface-sunken text-ink' : 'border-line text-ink-muted hover:bg-surface-sunken'}`}
              >
                {LANG_LABEL[lang]}
              </button>
            ))}
          </div>
          <label className={`${buttonVariants({ variant: 'outline' })} cursor-pointer`}>
            {t({ en: 'Upload file', vi: 'Tải file lên' })}
            <input
              type="file"
              accept=".py,.cpp,.cc,.txt"
              aria-label={t({ en: 'Upload a code file', vi: 'Tải file code' })}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
                e.target.value = '';
              }}
            />
          </label>
          <button type="button" onClick={() => write({ source: data.starter[language] ?? '' })} className={buttonVariants({ variant: 'outline' })}>
            {t({ en: 'Reset starter code', vi: 'Đặt lại code mẫu' })}
          </button>
        </div>
        <CodeEditor value={source} onChange={(next) => write({ source: next })} language={language} label={t({ en: 'Your code', vi: 'Code của em' })} describedBy={`${id}-keys`} />
        <p id={`${id}-keys`} className="text-xs text-ink-muted">
          {t({ en: 'Tab inserts spaces. Press Esc, then Tab, to leave the box.', vi: 'Phím Tab thụt lề. Nhấn Esc rồi Tab để rời khỏi khung.' })}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`${id}-stdin`} className={LABEL}>
          {t({ en: 'Input to try', vi: 'Dữ liệu vào để chạy thử' })}
        </label>
        <textarea
          id={`${id}-stdin`}
          value={stdin}
          rows={3}
          maxLength={MAX_CODE_CHARS}
          onChange={(e) => setStdin(e.target.value)}
          className="w-full rounded-lg border border-edge bg-surface px-3 py-2 font-mono text-base text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={!!busy || !source.trim()} onClick={trial} className={buttonVariants({ variant: 'outline' })}>
            {busy === 'run' ? t({ en: 'Running…', vi: 'Đang chạy…' }) : t({ en: 'Try it', vi: 'Chạy thử' })}
          </button>
          <button type="button" disabled={!!busy || !source.trim()} onClick={submit} className={buttonVariants()}>
            {busy === 'submit' ? t({ en: 'Judging…', vi: 'Đang chấm…' }) : t({ en: 'Submit', vi: 'Nộp bài' })}
          </button>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-3">
        {problem && (
          <p role="alert" className="text-sm text-danger">
            {t(problem.error)}{' '}
            {problem.signIn && (
              <Link href="/login" className="font-semibold underline">
                {t({ en: 'Sign in', vi: 'Đăng nhập' })}
              </Link>
            )}
          </p>
        )}
        {run && (
          <div>
            <p className={LABEL}>
              {run.status === 'AC' ? t({ en: 'Ran fine', vi: 'Chạy xong' }) : t(VERDICT_TEXT[run.status])}
              <span className="ml-2 font-normal tabular-nums text-ink-muted">
                {run.time_ms} ms · {Math.round(run.memory_kb / 1024)} MB
              </span>
            </p>
            <pre className={PRE}>{run.stdout || run.stderr || ' '}</pre>
            {run.stdout && run.stderr && <pre className={PRE}>{run.stderr}</pre>}
          </div>
        )}
        {result?.code && <CodeResults result={result.code} t={t} />}
        {result?.correct && (
          <p className="text-sm font-semibold text-success">{t({ en: 'Correct! Every test passed.', vi: 'Đúng rồi! Mọi test đều đạt.' })}</p>
        )}
      </div>
    </div>
  );
}
