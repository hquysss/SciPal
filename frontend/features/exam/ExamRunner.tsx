'use client';

import { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Award, Check, CircleHelp, Send, ChevronLeft, ChevronRight, CircleCheck, CircleX, CloudOff, LogOut, RotateCcw, ThumbsUp, Timer, Zap } from 'lucide-react';
import resultStyles from './examResult.module.css';
import { useLanguage } from '@scipal/hooks';
import type { ExamSection } from '@scipal/types';
import { AnswerPalette, type AnswerPaletteSection } from './AnswerPalette';
import { forgetExamAttempt, startExamAttempt } from './examAttempt';
import { arrangeQuestions, loadOrderSeed } from './examOrder';
import { ExamStart } from './ExamStart';
import { scoreOffline } from './offlineExam';
import { SaveExamOffline } from './SaveExamOffline';
import { dropExam, lastOfflineUser, loadDraft, loadExamPack, saveDraft, saveExamPack, type ExamPack } from '../../lib/pwa/examPacks';
import { SwipeToast } from '../../components/ui/swipe-toast';
import { useConfirmDialog } from '../../components/ui/confirm-dialog';
import { addLeave, dropRun, ensureRun, MAX_LEAVES, secondsLeft } from '../../lib/pwa/examRun';
import { EXAM_SYNCED, PENDING_CHANGED, queueExam, type ExamSyncResult } from '../../lib/pwa/pendingPractice';
import { useShuffledOptions } from '../../lib/useShuffledOptions';
import { createBrowserClient } from '../../lib/supabase';
import { Alert } from '../../components/ui/alert';
import { buttonVariants } from '../../components/ui/button';
import { MathText } from '../../components/math/MathText';
import { QuestionFigure, QuestionSource } from '../../components/math/QuestionFigure';

type Bilingual = { en: string; vi: string };

export interface ExamQuestionItem {
  id: string;
  /** mc: pick one option; truefalse: judge each statement; short: type the answer. */
  type: string;
  /** 1 (easy) to 3 (hard) from the API; older data used words. */
  difficulty?: number | 'easy' | 'medium' | 'hard';
  data: {
    stem: Bilingual;
    options?: Array<{ id: string; text: Bilingual }>;
    items?: Array<{ id: string; text: Bilingual }>;
    image?: { url: string; alt?: Bilingual };
    source?: string;
  };
}

/** What the student has entered for one question so far. */
export interface DraftAnswer {
  option?: string;
  items?: Record<string, boolean>;
  text?: string;
}

export function isAnswered(answer: DraftAnswer | undefined): boolean {
  if (!answer) return false;
  return Boolean(answer.option) || Object.keys(answer.items ?? {}).length > 0 || Boolean(answer.text?.trim());
}

export interface SubmittedAnswer {
  question_id: string;
  selected_option?: string;
  items?: Array<{ id: string; selected: boolean }>;
  short_answer?: string;
}

/** The body POST /api/score/exam expects, one entry per answered question. */
export function toSubmission(questions: ExamQuestionItem[], answers: Record<number, DraftAnswer>): SubmittedAnswer[] {
  return questions.flatMap((question, index): SubmittedAnswer[] => {
    const answer = answers[index];
    if (!isAnswered(answer)) return [];
    if (question.type === 'truefalse') {
      return [{
        question_id: question.id,
        items: Object.entries(answer!.items ?? {}).map(([id, selected]) => ({ id, selected })),
      }];
    }
    if (question.type === 'short') return [{ question_id: question.id, short_answer: answer!.text!.trim() }];
    return [{ question_id: question.id, selected_option: answer!.option }];
  });
}

export function difficultyKey(value: ExamQuestionItem['difficulty']): 'easy' | 'medium' | 'hard' {
  if (value === 1 || value === 'easy') return 'easy';
  if (value === 3 || value === 'hard') return 'hard';
  return 'medium';
}

export type TimerTone = 'normal' | 'warning' | 'danger';

/** Timer colour band: warning under five minutes, danger in the last minute. */
export function timerTone(secondsLeft: number): TimerTone {
  if (secondsLeft <= 60) return 'danger';
  if (secondsLeft <= 300) return 'warning';
  return 'normal';
}

/** Where one served question sits in a sectioned exam. */
export interface QuestionPlace {
  section: { key: string; title: Bilingual };
  /** The first served question of its section. */
  sectionStart: boolean;
  /** The group's shared passage, or null when it has none. */
  passage: Bilingual | null;
  /** Indexes of the first and last served questions of the group. */
  group: { first: number; last: number };
}

const hasText = (text: Bilingual | undefined): text is Bilingual => Boolean(text && (text.vi.trim() || text.en.trim()));

/**
 * Each question's section and group, by index. Questions are served in layout order, so indexes
 * match; an id the server could not load is simply absent, and a question outside the layout
 * (or every question of an exam without one) is null.
 */
export function questionPlaces(
  layout: ExamSection[] | null | undefined,
  questions: ReadonlyArray<{ id: string }>,
): Array<QuestionPlace | null> {
  if (!layout?.length) return questions.map(() => null);
  const where = new Map<string, { s: number; g: number }>();
  layout.forEach((section, s) => section.groups.forEach((group, g) => {
    for (const id of group.question_ids) if (!where.has(id)) where.set(id, { s, g });
  }));
  const spots = questions.map((question) => where.get(question.id) ?? null);
  const firstOfSection = new Map<number, number>();
  const groupRange = new Map<string, { first: number; last: number }>();
  spots.forEach((spot, index) => {
    if (!spot) return;
    if (!firstOfSection.has(spot.s)) firstOfSection.set(spot.s, index);
    const key = `${spot.s}:${spot.g}`;
    const range = groupRange.get(key);
    if (range) range.last = index;
    else groupRange.set(key, { first: index, last: index });
  });
  return spots.map((spot, index) => {
    if (!spot) return null;
    const section = layout[spot.s]!;
    const passage = section.groups[spot.g]!.passage;
    return {
      section: { key: section.key, title: section.title },
      sectionStart: firstOfSection.get(spot.s) === index,
      passage: hasText(passage) ? passage : null,
      group: { ...groupRange.get(`${spot.s}:${spot.g}`)! },
    };
  });
}

const OTHER_QUESTIONS: Bilingual = { vi: 'Câu khác', en: 'Other questions' };

/** Consecutive question indexes per section for the answer palette; undefined without a layout. */
export function sectionsForPalette(
  layout: ExamSection[] | null | undefined,
  questions: ReadonlyArray<{ id: string }>,
): AnswerPaletteSection[] | undefined {
  if (!layout?.length) return undefined;
  const runs: AnswerPaletteSection[] = [];
  questionPlaces(layout, questions).forEach((place, index) => {
    const key = place?.section.key ?? 'other';
    const last = runs.at(-1);
    if (last && last.key === key && last.start + last.count === index) last.count += 1;
    else runs.push({ key, title: place?.section.title ?? OTHER_QUESTIONS, start: index, count: 1 });
  });
  return runs;
}

export interface SectionScore {
  key: string;
  score: number;
  max_score: number;
  correct: number;
  total: number;
}

/** What POST /api/score/exam answers, read defensively so an older server's result still shows. */
export interface ExamResult {
  score: number;
  max_score: number;
  correct_count: number;
  total_questions: number;
  xp_earned: number;
  /** ĐGNL results are a reference conversion, not the official IRT-weighted score. */
  estimated: boolean;
  sections: SectionScore[];
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function toSectionScore(value: unknown): SectionScore | null {
  const s = value as Partial<SectionScore> | null;
  if (!s || typeof s.key !== 'string' || ![s.score, s.max_score, s.correct, s.total].every(finite)) return null;
  return { key: s.key, score: s.score!, max_score: s.max_score!, correct: s.correct!, total: s.total! };
}

export function normalizeResult(data: unknown): ExamResult | null {
  const d = data as Record<string, unknown> | null;
  if (!d || !finite(d.score) || !finite(d.xp_earned)) return null;
  return {
    score: d.score,
    max_score: finite(d.max_score) && d.max_score > 0 ? d.max_score : 10,
    correct_count: finite(d.correct_count) ? d.correct_count : 0,
    total_questions: finite(d.total_questions) ? d.total_questions : 0,
    xp_earned: d.xp_earned,
    estimated: d.estimated === true,
    sections: Array.isArray(d.sections) ? d.sections.map(toSectionScore).filter((s): s is SectionScore => s !== null) : [],
  };
}

export type ScoreBand = 'high' | 'medium' | 'low';

/** The result message band, by the share of the maximum (8/10 and 5/10 on the old 10-point scale). */
export function scoreBand(score: number, maxScore: number): ScoreBand {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'medium';
  return 'low';
}

/** Scores up to two decimals, without trailing zeros (7.5, 6.25, 1000). */
const formatScore = (value: number) => String(Math.round(value * 100) / 100);

/** Teacher-written text (section titles, passages) may be filled in one language only. */
const pickText = (text: Bilingual, lang: string) => (lang === 'en' ? text.en.trim() || text.vi : text.vi.trim() || text.en);

const TIMER_CLASS: Record<TimerTone, string> = {
  normal: 'border-line bg-surface text-ink',
  warning: 'border-transparent bg-warning-surface text-warning',
  danger: 'border-transparent bg-danger-surface text-danger',
};

const DIFFICULTY_LABEL = {
  easy: { en: 'Easy', vi: 'Dễ' },
  medium: { en: 'Medium', vi: 'Trung bình' },
  hard: { en: 'Hard', vi: 'Khó' },
} as const;

/** The pop-up at the top of the page: a warning about leaving the page, or that the exam was submitted. */
type Notice = { id: number; tone: 'info' | 'warning' | 'success'; title: string; description?: string; pips?: { filled: number; total: number } };

interface ExamRunnerProps {
  blueprintId: string;
  blueprintTitle?: { en: string; vi: string };
  questions: ExamQuestionItem[];
  durationMinutes?: number;
  token?: string;
  /** Sections and passage groups of a THPTQG or ĐGNL exam; null or absent for a generic exam. */
  layout?: ExamSection[] | null;
  /** Open on the page before the exam; the clock and the graded attempt begin at its button. */
  showIntro?: boolean;
  /** The exam's title block: shown before and after the exam, hidden while it runs to save room. */
  header?: ReactNode;
}

export function ExamRunner({
  blueprintId,
  blueprintTitle,
  questions: served,
  durationMinutes = 45,
  token,
  layout = null,
  showIntro = false,
  header,
}: ExamRunnerProps) {
  const { lang, t } = useLanguage();
  // The order of this attempt, fixed on this device: set after mount so the server's markup matches.
  const [orderSeed, setOrderSeed] = useState<string | null>(null);
  useEffect(() => setOrderSeed(loadOrderSeed(blueprintId)), [blueprintId]);
  const questions = useMemo(() => (orderSeed ? arrangeQuestions(served, layout, orderSeed) : served), [served, layout, orderSeed]);
  const places = useMemo(() => questionPlaces(layout, questions), [layout, questions]);
  const paletteSections = useMemo(() => sectionsForPalette(layout, questions), [layout, questions]);
  const pathname = usePathname();
  const router = useRouter();
  const autoSubmitAttempted = useRef(false);
  const [started, setStarted] = useState(!showIntro);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, DraftAnswer>>({});
  const answeredIndexes = Object.fromEntries(
    Object.entries(answers).filter(([, answer]) => isAnswered(answer)).map(([index]) => [index, true]),
  );
  const answeredCount = Object.keys(answeredIndexes).length;
  const updateAnswer = (index: number, next: DraftAnswer) => setAnswers((prev) => ({ ...prev, [index]: next }));
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [result, setResult] = useState<ExamResult | null>(null);
  // The graded attempt (created before the exam for a signed-in student; guests sign in at submit).
  const [attempt, setAttempt] = useState<{ id: string; remaining: number | null; period: 'day' | 'month' | null } | null>(null);
  const [attemptProblem, setAttemptProblem] = useState<{ error: Bilingual; blocked: boolean } | null>(null);
  // An exam saved for offline: its attempt is used instead of starting one, and a submission made
  // without a connection is scored here (provisional) until the server's result arrives.
  const [userId, setUserId] = useState<string | null>(null);
  const [pack, setPack] = useState<ExamPack | null>(null);
  const [provisional, setProvisional] = useState(false);
  // The plan had no graded attempt left when the exam was sent: the score here is for reference only.
  const [notCounted, setNotCounted] = useState(false);
  // Times the learner left the page during this attempt (kept on the device, so a reload does not reset it).
  const [leaves, setLeaves] = useState(0);
  const leftRef = useRef(false);
  const { ask, dialog } = useConfirmDialog();
  const [notice, setNotice] = useState<Notice | null>(null);
  const noticeId = useRef(0);
  // Why the exam submits itself, for the pop-up that says so.
  const autoReason = useRef<'time' | 'leaves' | null>(null);
  // Read from effects and callbacks that must not re-run when the language or the pop-up changes.
  const tRef = useRef(t);
  tRef.current = t;
  const announce = (next: Omit<Notice, 'id'>) => setNotice({ id: ++noticeId.current, ...next });
  const announceRef = useRef(announce);
  announceRef.current = announce;

  const currentSession = useCallback(async () => {
    const session = (await createBrowserClient().auth.getSession().catch(() => ({ data: { session: null } }))).data.session;
    const authToken = token ?? session?.access_token;
    // Offline an expired session cannot be refreshed; the learner who saved the exam is still known.
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return { token: authToken, userId: session?.user.id ?? (offline ? lastOfflineUser() : null) };
  }, [token]);

  const reloadPack = useCallback(async () => {
    const { userId: id } = await currentSession().catch(() => ({ userId: null }));
    setUserId(id);
    setPack(id ? loadExamPack(id, blueprintId) : null);
  }, [blueprintId, currentSession]);

  useEffect(() => {
    void reloadPack();
  }, [reloadPack]);

  const begin = useCallback(async (authToken: string) => {
    const res = await startExamAttempt(blueprintId, authToken);
    if (res.ok) {
      setAttempt({ id: res.attemptId, remaining: res.remaining, period: res.period });
      setAttemptProblem(null);
      return res.attemptId;
    }
    setAttemptProblem({ error: res.error, blocked: res.blocked });
    return null;
  }, [blueprintId]);

  useEffect(() => {
    if (!started) return;
    let active = true;
    void (async () => {
      const session = await currentSession();
      if (!active) return;
      const saved = session.userId ? loadExamPack(session.userId, blueprintId) : null;
      if (saved) {
        // The clock runs from the first start of this attempt, so reopening the page gives no extra time.
        const run = ensureRun(saved.attempt_id, saved.started_at);
        const startedAt = run.started_at;
        if (!saved.started_at) saveExamPack({ ...saved, started_at: startedAt });
        setTimeLeft(secondsLeft(run, durationMinutes));
        setLeaves(run.leaves);
        setUserId(session.userId);
        setPack({ ...saved, started_at: startedAt });
        setAttempt({ id: saved.attempt_id, remaining: null, period: null });
        const draft = loadDraft(saved.attempt_id);
        if (draft) setAnswers(draft);
        return;
      }
      if (session.token) {
        let id = await begin(session.token);
        if (!active || !id) return;
        let run = ensureRun(id);
        let draft = loadDraft(id);
        // Time ran out while the page was closed. What was written is submitted below (the timer sees
        // no time left); with nothing written there is nothing to submit, so a fresh attempt opens.
        if (secondsLeft(run, durationMinutes) === 0 && !draft) {
          dropRun(id);
          forgetExamAttempt(blueprintId);
          setOrderSeed(loadOrderSeed(blueprintId));
          id = await begin(session.token);
          if (!active || !id) return;
          run = ensureRun(id);
          draft = null;
        }
        setTimeLeft(secondsLeft(run, durationMinutes));
        setLeaves(run.leaves);
        if (draft) setAnswers(draft);
      }
    })();
    return () => {
      active = false;
    };
  }, [begin, blueprintId, currentSession, durationMinutes, started]);

  // The answers being written survive closing the tab (offline above all).
  useEffect(() => {
    if (attempt && !result && Object.keys(answers).length > 0) saveDraft(attempt.id, answers);
  }, [answers, attempt, result]);

  // An exam taken offline was synced: the server's result replaces the provisional one.
  useEffect(() => {
    const onSynced = (event: Event) => {
      const mine = ((event as CustomEvent<ExamSyncResult[]>).detail ?? []).find((r) => r.attempt_id === attempt?.id);
      if (!mine) return;
      if (mine.not_counted) {
        setNotCounted(true);
        setProvisional(false);
        announceRef.current({ tone: 'warning', title: tRef.current({ en: 'Exam not counted', vi: 'Bài thi chưa được tính' }), description: tRef.current({ en: 'You had no graded attempts left.', vi: 'Bạn đã hết lượt thi chấm điểm.' }) });
        return;
      }
      const server = mine.result ? normalizeResult(mine.result) : null;
      if (server) {
        setResult(server);
        setProvisional(false);
        announceRef.current({
          tone: 'success',
          title: tRef.current({ en: 'Exam synced', vi: 'Đã đồng bộ bài thi' }),
          description: tRef.current({ en: `Score ${formatScore(server.score)} / ${formatScore(server.max_score)} from the server.`, vi: `Điểm ${formatScore(server.score)} / ${formatScore(server.max_score)} theo máy chủ.` }),
        });
      }
    };
    window.addEventListener(EXAM_SYNCED, onSynced);
    return () => window.removeEventListener(EXAM_SYNCED, onSynced);
  }, [attempt]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmissionError(null);
    setSubmitting(true);

    const formatted = toSubmission(questions, answers);
    const finishedAt = new Date().toISOString();
    // Says the exam went in: on its own after the time or the third leave, or by the learner's hand.
    const announceSubmitted = (line: string, kept: boolean) => {
      const reason = autoReason.current;
      const say = tRef.current;
      const why = reason === 'time' ? say({ en: 'Time was up.', vi: 'Đã hết giờ làm bài.' }) : reason === 'leaves' ? say({ en: `You left the page ${MAX_LEAVES} times.`, vi: `Bạn đã rời trang ${MAX_LEAVES} lần.` }) : '';
      announceRef.current({
        tone: 'success',
        title: reason ? say({ en: 'The exam was submitted for you', vi: 'Bài đã tự nộp' }) : kept ? say({ en: 'Exam saved', vi: 'Đã lưu bài thi' }) : say({ en: 'Exam submitted', vi: 'Đã nộp bài thi' }),
        description: [why, line].filter(Boolean).join(' '),
      });
    };
    // Without a connection: score on this device from the saved exam and queue it for the server.
    const submitOffline = () => {
      if (!pack || !userId) {
        setSubmissionError(t({ en: 'Save this exam while online to take it offline.', vi: 'Tải đề này khi có mạng để thi offline.' }));
        return;
      }
      const queued = queueExam({ user_id: userId, attempt_id: pack.attempt_id, blueprint_id: blueprintId, answers: formatted, started_at: pack.started_at, finished_at: finishedAt });
      if (queued === 'kept') {
        setSubmissionError(t({ en: 'This exam was already submitted and waits to sync.', vi: 'Bài thi này đã nộp và đang chờ đồng bộ.' }));
        return;
      }
      if (queued === 'failed') {
        setSubmissionError(t({ en: 'This device is out of storage, so the exam could not be kept. Clear some site data and try again.', vi: 'Máy hết chỗ lưu nên chưa giữ được bài thi. Xoá bớt dữ liệu trang rồi thử lại.' }));
        return;
      }
      window.dispatchEvent(new Event(PENDING_CHANGED));
      setResult(scoreOffline(pack, formatted));
      setProvisional(true);
      announceSubmitted(tRef.current({ en: 'The exam will be sent to the server when you are back online. The score is provisional.', vi: 'Bài sẽ được nộp lên máy chủ khi có mạng. Điểm hiện là tạm tính.' }), true);
      // Submitted: the attempt is not taken again from this device; the queue holds the answers.
      dropExam(userId, blueprintId, pack.attempt_id);
      forgetExamAttempt(blueprintId);
    };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      submitOffline();
      setSubmitting(false);
      return;
    }

      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
    try {
      const authToken = token ?? (await createBrowserClient().auth.getSession()).data.session?.access_token;
      if (!authToken) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const attemptId = attempt?.id ?? (await begin(authToken));
      if (!attemptId) return;

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/api/score/exam`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          // A saved exam has no attempt on the server yet: it opens from when the exam was started.
          body: JSON.stringify({ blueprint_id: blueprintId, attempt_id: attemptId, answers: formatted, ...(pack && pack.attempt_id === attemptId && pack.started_at ? { started_at: pack.started_at } : {}) }),
        });
      } catch (error) {
        // The connection dropped while submitting: a saved exam is scored here instead.
        if (pack && pack.attempt_id === attemptId) {
          submitOffline();
          return;
        }
        throw error;
      }

      if (res.status === 409) {
        setSubmissionError(t({
          en: 'This exam was not counted: you have no graded attempts left. Your answers are still on the page.',
          vi: 'Bài thi chưa được tính vì bạn đã hết lượt thi chấm điểm. Câu trả lời vẫn còn trên trang.',
        }));
        return;
      }
      if (!res.ok) throw new Error(`Exam scoring failed: ${res.status}`);
      const data = normalizeResult(await res.json());
      if (!data) throw new Error('Invalid exam score response');
      setResult(data);
      announceSubmitted(tRef.current({ en: `Score ${formatScore(data.score)} / ${formatScore(data.max_score)} · +${data.xp_earned} XP`, vi: `Điểm ${formatScore(data.score)} / ${formatScore(data.max_score)} · +${data.xp_earned} XP` }), false);
      forgetExamAttempt(blueprintId);
      if (userId) dropExam(userId, blueprintId, attemptId);
      dropRun(attemptId);
    } catch {
      setSubmissionError(t({
        en: 'Your exam could not be submitted. Your answers are still on the page; press Submit to try again.',
        vi: 'Chưa nộp được bài thi. Câu trả lời vẫn còn trên trang, bấm Nộp bài để thử lại.',
      }));
    } finally {
      setSubmitting(false);
    }
  }, [answers, attempt, begin, blueprintId, pack, pathname, questions, router, submitting, t, token, userId]);

  // The Submit button asks first: a submitted exam cannot be changed. (Time up and the third leave submit on their own.)
  const confirmSubmit = async () => {
    const left = questions.length - answeredCount;
    const confirmed = await ask({
      title: t({ en: 'Submit the exam?', vi: 'Nộp bài thi?' }),
      description: left > 0
        ? t({ en: `You still have ${left} unanswered ${left === 1 ? 'question' : 'questions'}. You cannot change your answers after submitting.`, vi: `Bạn còn ${left} câu chưa làm. Nộp rồi không sửa được.` })
        : t({ en: 'You answered every question. You cannot change your answers after submitting.', vi: 'Bạn đã làm hết các câu. Nộp rồi không sửa được.' }),
      confirmLabel: t({ en: 'Submit', vi: 'Nộp bài' }),
      cancelLabel: t({ en: 'Keep going', vi: 'Làm tiếp' }),
      danger: true,
      icon: <Send className="h-5 w-5" />,
      details: (
        <div className="mt-4 rounded-lg bg-surface-sunken p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
              <CircleCheck aria-hidden="true" className="h-4 w-4 text-success" />
              {t({ en: `Answered ${answeredCount} / ${questions.length}`, vi: `Đã làm ${answeredCount} / ${questions.length} câu` })}
            </span>
            {left > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-danger-surface px-2 py-0.5 text-xs font-bold text-danger">
                <CircleHelp aria-hidden="true" className="h-3.5 w-3.5" />
                {t({ en: `${left} blank`, vi: `${left} câu trống` })}
              </span>
            )}
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
            <div className="h-full rounded-full bg-success" style={{ width: `${questions.length ? Math.round((answeredCount / questions.length) * 100) : 0}%` }} />
          </div>
        </div>
      ),
    });
    if (confirmed) void handleSubmit();
  };
  const toast = notice ? (
    <SwipeToast
      key={notice.id}
      tone={notice.tone}
      title={notice.title}
      description={notice.description}
      pips={notice.pips}
      duration={6000}
      onClose={() => setNotice((current) => (current?.id === notice.id ? null : current))}
    />
  ) : null;

  // Closing or reloading the page while the exam is running asks first.
  useEffect(() => {
    if (!started || result) return;
    const ask = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', ask);
    return () => window.removeEventListener('beforeunload', ask);
  }, [started, result]);

  // Leaving the page (another tab or window in front) counts; the third time submits the exam. The
  // browser cannot stop it, only tell: a lost focus alone (the address bar, DevTools) is not counted.
  useEffect(() => {
    if (!started || result || !attempt) return;
    const attemptId = attempt.id;
    const onVisibility = () => {
      if (document.hidden) {
        leftRef.current = true;
        return;
      }
      if (!leftRef.current) return;
      leftRef.current = false;
      const count = addLeave(attemptId);
      setLeaves(count);
      if (count < MAX_LEAVES) {
        const say = tRef.current;
        announceRef.current({
          tone: 'warning',
          pips: { filled: count, total: MAX_LEAVES },
          title: say({ en: `You left the page ${count}/${MAX_LEAVES} times.`, vi: `Bạn đã rời trang ${count}/${MAX_LEAVES} lần.` }),
          description: say({ en: `The ${MAX_LEAVES}rd time the exam is submitted.`, vi: `Rời lần thứ ${MAX_LEAVES} bài sẽ tự nộp.` }),
        });
      } else if (!autoSubmitAttempted.current) {
        autoSubmitAttempted.current = true;
        autoReason.current = 'leaves';
        void handleSubmit();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [started, result, attempt, handleSubmit]);

  // Countdown timer with auto-submit
  useEffect(() => {
    if (result || !started) return;
    if (timeLeft <= 0) {
      if (!autoSubmitAttempted.current) {
        autoSubmitAttempted.current = true;
        autoReason.current = 'time';
        void handleSubmit();
      }
      return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, result, started, handleSubmit]);

  const currentQ = questions[currentIndex];
  const shuffledOptions = useShuffledOptions(currentQ?.id ?? '', currentQ && currentQ.type !== 'truefalse' && currentQ.type !== 'short' ? (currentQ.data.options ?? []) : [], orderSeed);
  const place = places[currentIndex] ?? null;
  const pick = (text: Bilingual) => pickText(text, lang);
  const minutes = Math.floor(Math.max(0, timeLeft) / 60);
  const seconds = Math.max(0, timeLeft) % 60;
  const tone = timerTone(timeLeft);

  if (result) {
    const title = blueprintTitle
      ? lang === 'en'
        ? blueprintTitle.en
        : blueprintTitle.vi
      : t({ en: 'Informatics evaluation', vi: 'Khảo sát chất lượng Tin học' });
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {toast}
        {header}
        <ExamResultView result={result} title={title} layout={layout} provisional={provisional} notCounted={notCounted} leaves={leaves} />
      </div>
    );
  }

  if (!started) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        {header}
        <ExamStart
          title={blueprintTitle}
          questionCount={questions.length}
          durationMinutes={durationMinutes}
          layout={layout}
          onStart={() => setStarted(true)}
          offline={userId ? <SaveExamOffline blueprintId={blueprintId} saved={pack !== null} onSaved={() => void reloadPack()} /> : null}
        />
      </div>
    );
  }

  if (attemptProblem?.blocked) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-col items-start gap-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
        <h2 className="text-xl font-bold text-ink">{t({ en: 'No graded attempts left', vi: 'Đã hết lượt thi chấm điểm' })}</h2>
        <p className="text-base text-ink-muted">{t(attemptProblem.error)}</p>
        <Link href="/exam" className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'Back to exams', vi: 'Về danh sách đề' })}
        </Link>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {toast}
      {dialog}
      {attemptProblem && (
        <Alert tone="warning">
          {t(attemptProblem.error)}{' '}
          {t({ en: 'Your answers are still on this page. When you submit, SciPal tries again.', vi: 'Câu trả lời vẫn còn trên trang này. Khi bạn nộp bài, SciPal sẽ thử lại.' })}
        </Alert>
      )}
      {/* Top sticky timer bar */}
      <div className="sticky top-20 z-30 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 overflow-hidden rounded-xl border border-line bg-surface px-3 py-2 sm:px-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <div
            role="timer"
            aria-label={t({ en: 'Time remaining', vi: 'Thời gian còn lại' })}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1 text-base font-bold tabular-nums ${TIMER_CLASS[tone]}`}
          >
            <Timer aria-hidden="true" className="h-5 w-5" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
          {attempt?.remaining != null && (
            <span className="text-sm text-ink-muted">
              {attempt.period === 'day'
                ? t({ en: `${attempt.remaining} graded attempts left today`, vi: `Còn ${attempt.remaining} lượt thi chấm điểm hôm nay` })
                : t({ en: `${attempt.remaining} graded attempts left this month`, vi: `Còn ${attempt.remaining} lượt thi chấm điểm tháng này` })}
            </span>
          )}
          <span aria-live="polite" className="text-sm font-semibold text-ink-muted">
            {tone === 'danger'
              ? t({ en: 'Under 1 minute left', vi: 'Còn dưới 1 phút' })
              : tone === 'warning'
                ? t({ en: 'Under 5 minutes left', vi: 'Còn dưới 5 phút' })
                : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-ink">
            {answeredCount} / {questions.length}
            <span className="ml-1 hidden font-normal text-ink-muted sm:inline">{t({ en: 'answered', vi: 'đã làm' })}</span>
          </span>
          <button type="button" onClick={() => void confirmSubmit()} disabled={submitting} className={buttonVariants({ variant: 'danger' })}>
            {submitting ? t({ en: 'Submitting…', vi: 'Đang nộp bài…' }) : t({ en: 'Submit exam', vi: 'Nộp bài thi' })}
          </button>
        </div>
        {/* How far through the exam: grows with every answered question. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-surface-sunken">
          <div className="h-full bg-action transition-[width] duration-300 ease-out" style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} />
        </div>
      </div>

      {submissionError && <Alert tone="danger">{submissionError}</Alert>}

      {/* Question on the left, the question grid beside it on a wide screen (a strip above on a phone). */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <div className="order-2 lg:order-1">
      {currentQ && (
        <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:p-5">
          {place?.passage && (
            <div className="flex max-h-48 flex-col gap-2 overflow-y-auto rounded-lg border border-line bg-surface-sunken p-3 sm:p-4">
              <p className="text-sm font-semibold text-ink-muted">
                {place.group.first === place.group.last
                  ? t({
                      en: `Read the passage, then answer question ${place.group.first + 1}.`,
                      vi: `Đọc đoạn sau rồi trả lời câu ${place.group.first + 1}.`,
                    })
                  : t({
                      en: `Read the passage, then answer questions ${place.group.first + 1} to ${place.group.last + 1}.`,
                      vi: `Đọc đoạn sau rồi trả lời câu ${place.group.first + 1} đến ${place.group.last + 1}.`,
                    })}
              </p>
              <MathText text={pick(place.passage)} className="block text-base leading-relaxed text-ink" />
            </div>
          )}
          <fieldset className="flex min-w-0 flex-col gap-4">
            <legend className="flex w-full flex-col gap-3">
              <span className="flex flex-wrap items-center gap-2 border-b border-line pb-2">
                <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-bold text-ink">
                  {t({ en: 'Question', vi: 'Câu' })} {currentIndex + 1} / {questions.length}
                </span>
                <span className="rounded-md bg-surface-sunken px-3 py-1 text-sm font-semibold text-ink-muted">
                  {t(DIFFICULTY_LABEL[difficultyKey(currentQ.difficulty)])}
                </span>
                {place && <h2 className="text-sm font-semibold text-ink-muted">{pick(place.section.title)}</h2>}
              </span>
              <MathText text={lang === 'en' ? currentQ.data.stem.en : currentQ.data.stem.vi} className="block text-base font-bold leading-relaxed text-ink sm:text-lg" />
            </legend>
            {/* A legend takes no part in the fieldset's gap, so the figure keeps its own distance from it. */}
            {currentQ.data.image && (
              <div className="mt-4">
                <QuestionFigure compact image={currentQ.data.image} lang={lang === 'en' ? 'en' : 'vi'} />
              </div>
            )}

            {currentQ.type === 'truefalse' && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-ink-muted">
                  {t({ en: 'Mark each statement true or false.', vi: 'Chọn Đúng hoặc Sai cho từng nhận định.' })}
                </p>
                {currentQ.data.items?.map((item, itemIndex) => {
                  const chosen = answers[currentIndex]?.items?.[item.id];
                  return (
                    <div
                      key={item.id}
                      role="radiogroup"
                      aria-label={`${String.fromCharCode(97 + itemIndex)}) ${lang === 'en' ? item.text.en : item.text.vi}`}
                      className={`flex flex-col gap-2 rounded-lg border-2 p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        chosen === undefined ? 'border-edge bg-surface' : 'border-action/60 bg-[color-mix(in_srgb,var(--action)_6%,var(--surface))]'
                      }`}
                    >
                      <span className="text-base font-semibold leading-normal text-ink">
                        {String.fromCharCode(97 + itemIndex)}) <MathText text={lang === 'en' ? item.text.en : item.text.vi} />
                      </span>
                      <span className="flex shrink-0 gap-2">
                        {([true, false] as const).map((value) => (
                          <label
                            key={String(value)}
                            className={`flex min-h-11 min-w-20 cursor-pointer items-center justify-center rounded-lg border px-4 text-sm font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                              chosen === value ? 'answer-pop border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${currentQ.id}-${item.id}`}
                              checked={chosen === value}
                              onChange={() =>
                                updateAnswer(currentIndex, {
                                  items: { ...(answers[currentIndex]?.items ?? {}), [item.id]: value },
                                })
                              }
                              className="sr-only"
                            />
                            {value ? t({ en: 'True', vi: 'Đúng' }) : t({ en: 'False', vi: 'Sai' })}
                          </label>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {currentQ.type === 'short' && (
              <label className="flex flex-col gap-2 text-sm font-semibold text-ink">
                {t({ en: 'Your answer', vi: 'Câu trả lời của bạn' })}
                <input
                  type="text"
                  value={answers[currentIndex]?.text ?? ''}
                  onChange={(e) => updateAnswer(currentIndex, { text: e.target.value })}
                  maxLength={500}
                  autoComplete="off"
                  className="min-h-11 rounded-lg border border-edge bg-surface px-4 py-3 text-base font-normal text-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
              </label>
            )}

            {/* Options list */}
            <div className="grid gap-2 md:grid-cols-2">
              {shuffledOptions.map((opt, optIndex) => {
                const letter = String.fromCharCode(65 + optIndex);
                const isSelected = answers[currentIndex]?.option === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border-2 p-3 text-left text-base font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                      isSelected
                        ? 'answer-pop border-action bg-[color-mix(in_srgb,var(--action)_14%,var(--surface))] text-ink shadow-sm'
                        : 'border-edge bg-surface text-ink hover:border-action/50 hover:bg-surface-sunken'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQ.id}`}
                      value={opt.id}
                      checked={isSelected}
                      onChange={() => updateAnswer(currentIndex, { option: opt.id })}
                      className="sr-only"
                    />
                    <span
                      aria-hidden="true"
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors ${
                        isSelected ? 'bg-action text-action-ink' : 'border border-edge bg-surface-sunken text-ink'
                      }`}
                    >
                      {letter}
                    </span>
                    <MathText text={lang === 'en' ? opt.text.en : opt.text.vi} className="min-w-0 flex-1 leading-normal" />
                    {isSelected && <Check aria-hidden="true" className="h-5 w-5 shrink-0 text-action" />}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <QuestionSource source={currentQ.data.source} lang={lang === 'en' ? 'en' : 'vi'} />

          {/* Bottom question step buttons */}
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
              className={buttonVariants({ variant: 'outline' })}
            >
              <ChevronLeft aria-hidden="true" />
              {t({ en: 'Previous', vi: 'Câu trước' })}
            </button>
            <button
              type="button"
              disabled={currentIndex === questions.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
              className={buttonVariants({ variant: 'secondary' })}
            >
              {t({ en: 'Next question', vi: 'Câu tiếp theo' })}
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </section>
      )}
      </div>

      <div className="order-1 lg:sticky lg:top-40 lg:order-2">
      <AnswerPalette
        total={questions.length}
        currentIndex={currentIndex}
        answers={answeredIndexes}
        onSelect={(i) => setCurrentIndex(i)}
        {...(paletteSections ? { sections: paletteSections } : {})}
      />
      </div>
      </div>
    </div>
  );
}

/** The scored result: score out of the exam's maximum, the estimate note and a per-section table. */
export function ExamResultView({
  result,
  title,
  layout = null,
  provisional = false,
  notCounted = false,
  leaves = 0,
}: {
  result: ExamResult;
  title: string;
  layout?: ExamSection[] | null;
  /** Scored on this device without a connection; the server's result replaces it. */
  provisional?: boolean;
  /** The server did not count it (no graded attempt left): the score is for reference only. */
  notCounted?: boolean;
  /** Times the learner left the page while taking the exam. */
  leaves?: number;
}) {
  const { lang, t } = useLanguage();
  const band = scoreBand(result.score, result.max_score);
  const wrongCount = Math.max(0, result.total_questions - result.correct_count);
  const titles = new Map((layout ?? []).map((section) => [section.key, section.title]));
  // The ring fills to the share of the score; its length is the circle's circumference (r = 46).
  const RING = 2 * Math.PI * 46;
  const share = result.max_score > 0 ? Math.min(1, Math.max(0, result.score / result.max_score)) : 0;
  const VerdictIcon = band === 'high' ? Award : band === 'medium' ? ThumbsUp : RotateCcw;

  return (
    <section data-band={band} className={`${resultStyles.result} rounded-xl border border-line bg-surface p-8 text-center sm:p-12`}>
      <h2 className="text-2xl font-bold text-ink sm:text-3xl">{t({ en: 'Exam result', vi: 'Kết quả bài thi thử' })}</h2>
      <p className="mt-1 text-sm text-ink-muted">{title}</p>
      {leaves > 0 && (
        <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-ink-muted">
          <LogOut aria-hidden="true" className="h-4 w-4" />
          {t({ en: `Times you left the page: ${leaves}`, vi: `Số lần rời trang: ${leaves}` })}
        </p>
      )}
      {notCounted && (
        <p role="status" className="mt-3 text-sm font-semibold text-ink-muted">
          {t({ en: 'This exam was not counted: you had no graded attempts left. The score is for reference; no XP.', vi: 'Bài thi chưa được tính vì bạn đã hết lượt thi chấm điểm. Điểm chỉ để tham khảo, không có XP.' })}
        </p>
      )}
      {provisional && (
        <p role="status" className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-ink-muted">
          <CloudOff aria-hidden="true" className="h-4 w-4" />
          {t({ en: 'Provisional · waiting to sync. XP is an estimate.', vi: 'Kết quả tạm · chờ đồng bộ. XP là tạm tính.' })}
        </p>
      )}

      <div className="my-6 flex flex-col items-center">
        <div className={resultStyles.gauge}>
          <svg viewBox="0 0 108 108" aria-hidden="true">
            <circle className={resultStyles.track} cx="54" cy="54" r="46" />
            <circle
              className={resultStyles.fill}
              cx="54"
              cy="54"
              r="46"
              style={{ '--len': RING, '--off': RING * (1 - share) } as CSSProperties}
            />
          </svg>
          <span data-testid="exam-score" className={`${resultStyles.score} text-5xl font-bold tabular-nums`}>
            {formatScore(result.score)}
            <span className="block text-base font-semibold text-ink-muted"> / {formatScore(result.max_score)}</span>
          </span>
        </div>
        <span className={`${resultStyles.verdict} mt-4 text-sm`}>
          <VerdictIcon aria-hidden="true" className="h-4 w-4" />
          {band === 'high'
            ? t({ en: 'Good result.', vi: 'Đạt mức tốt.' })
            : band === 'medium'
              ? t({ en: 'Passed.', vi: 'Đạt.' })
              : t({ en: 'Not passed yet. Revise before the next try.', vi: 'Chưa đạt. Nên ôn lại trước khi thi tiếp.' })}
        </span>
        {result.estimated && (
          <p className="mt-3 max-w-md text-sm text-ink-muted">
            {t({
              en: 'This is an estimated score for reference. SciPal counts every question equally; the official VNU-HCM score weights each question by its difficulty.',
              vi: 'Đây là điểm quy đổi tham khảo. SciPal tính mỗi câu ngang nhau, còn điểm chính thức của ĐHQG-HCM có trọng số theo độ khó từng câu.',
            })}
          </p>
        )}
      </div>

      {result.sections.length > 0 && (
        <table className="mx-auto mb-6 w-full max-w-xl text-left text-sm">
          <caption className="mb-2 text-base font-bold text-ink">{t({ en: 'Score by part', vi: 'Điểm từng phần' })}</caption>
          <thead>
            <tr className="border-b border-line text-ink-muted">
              <th scope="col" className="py-2 pr-3 font-semibold">{t({ en: 'Part', vi: 'Phần' })}</th>
              <th scope="col" className="px-3 py-2 text-right font-semibold">{t({ en: 'Score', vi: 'Điểm' })}</th>
              <th scope="col" className="py-2 pl-3 text-right font-semibold">{t({ en: 'Correct', vi: 'Câu đúng' })}</th>
            </tr>
          </thead>
          <tbody>
            {result.sections.map((section) => {
              const sectionTitle = titles.get(section.key);
              return (
                <tr key={section.key} className="border-b border-line last:border-b-0">
                  <th scope="row" className="py-2 pr-3 font-semibold text-ink">{sectionTitle ? pickText(sectionTitle, lang) : section.key}</th>
                  <td className="px-3 py-2 text-right tabular-nums text-ink">
                    {formatScore(section.score)} / {formatScore(section.max_score)}
                    <span className={resultStyles.bar} aria-hidden="true">
                      <i style={{ width: `${section.max_score > 0 ? Math.round((section.score / section.max_score) * 100) : 0}%` }} />
                    </span>
                  </td>
                  <td className="py-2 pl-3 text-right tabular-nums text-ink">{section.correct} / {section.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <dl className="mx-auto grid max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
        {[
          { tone: 'success', Icon: CircleCheck, label: t({ en: 'Correct', vi: 'Câu đúng' }), value: `${result.correct_count} / ${result.total_questions}` },
          { tone: 'danger', Icon: CircleX, label: t({ en: 'Wrong or blank', vi: 'Sai hoặc bỏ trống' }), value: String(wrongCount) },
          { tone: 'warning', Icon: Zap, label: t({ en: 'XP earned', vi: 'Phần thưởng XP' }), value: `+${result.xp_earned} XP` },
        ].map(({ tone, Icon, label, value }) => (
          <div key={tone} className={resultStyles.stat}>
            <span className={resultStyles.statIcon} data-tone={tone} aria-hidden="true">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
              <dd className="text-lg font-bold tabular-nums text-ink">{value}</dd>
            </span>
          </div>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/exam" className={buttonVariants({ variant: 'outline' })}>
          {t({ en: 'Exam list', vi: 'Danh sách đề thi' })}
        </Link>
        <Link href="/progress" className={buttonVariants()}>
          {t({ en: 'View learning progress', vi: 'Xem tiến trình & huy hiệu' })}
        </Link>
      </div>
    </section>
  );
}
