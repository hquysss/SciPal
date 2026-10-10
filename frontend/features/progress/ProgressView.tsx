'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, Award, BookOpenCheck, CircleCheck, Clock, GraduationCap, PartyPopper, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { LoadErrorNotice } from '../../components/feedback/LoadErrorNotice';
import { StreakCalendar } from './StreakCalendar';
import { BadgeWall } from './BadgeWall';
import { Leaderboard } from './Leaderboard';
import { Roadmap } from './Roadmap';
import { ProgressHero } from './ProgressHero';
import { continueTarget, passed, recentMilestones, type ExamResult, type Milestone } from './progressModel';
import type { ProgressSummary } from './progressQueries';

const LEVEL_XP = 500;

const CARD = 'rounded-3xl border border-line bg-surface p-5 sm:p-6';
const FOCUS = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

function ContinueCard({ roadmaps, minutes }: Pick<ProgressSummary, 'roadmaps'> & { minutes: number | null }) {
  const { t } = useLanguage();
  if (!roadmaps || roadmaps.length === 0) return null;
  const next = continueTarget(roadmaps);

  if (!next) {
    return (
      <section className={`${CARD} flex items-center gap-4`}>
        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-success-surface text-success"><PartyPopper className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink">{t({ en: 'Every started subject is complete', vi: 'Bạn đã học hết các môn đã bắt đầu' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Pick a new subject to keep the streak going.', vi: 'Chọn một môn mới để giữ chuỗi ngày học.' })}</p>
        </div>
        <Link href="/subjects" className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-action px-4 text-sm font-semibold text-action-ink ${FOCUS}`}>
          {t({ en: 'Subjects', vi: 'Môn học' })}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const { roadmap, chapter, chapterNumber, lessonNumber, lesson } = next;
  const href = `/${roadmap.subject.slug}/${lesson.slug}`;
  return (
    <section
      aria-labelledby="continue-title"
      data-subject-scope=""
      style={{ '--accent': roadmap.subject.accent } as CSSProperties}
      className="relative isolate overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] bg-surface p-5 shadow-[0_24px_48px_-32px_var(--accent)] sm:p-7"
    >
      <span aria-hidden="true" className="absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_70%)]" />
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
            {t({ en: 'Continue where you left off', vi: 'Học tiếp từ chỗ bạn dừng' })}
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            {t(roadmap.subject.name)} · {t({ en: `Chapter ${chapterNumber}: `, vi: `Chủ đề ${chapterNumber}: ` })}{t(chapter.title)}
          </p>
          <h2 id="continue-title" className="mt-1 text-2xl font-bold tracking-tight text-ink [overflow-wrap:anywhere] sm:text-3xl">
            <span className="text-ink-muted">{t({ en: `Lesson ${lessonNumber} · `, vi: `Bài ${lessonNumber} · ` })}</span>
            {t(lesson.title)}
          </h2>
          {minutes != null && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-3 py-1 text-sm text-ink-muted">
              <Clock aria-hidden="true" className="h-4 w-4" />
              {t({ en: `About ${minutes} min`, vi: `Khoảng ${minutes} phút` })}
            </p>
          )}
        </div>
        <Link
          href={href}
          className={`group inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-action px-6 text-base font-semibold text-action-ink shadow-[0_10px_24px_-14px_var(--action)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS}`}
        >
          {t({ en: 'Resume lesson', vi: 'Học tiếp' })}
          <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
        </Link>
      </div>
    </section>
  );
}

/** Each exam's latest result; it needs review when that latest result is below the pass mark. */
function examsToRetake(exams: ExamResult[]): ExamResult[] {
  const latest = new Map<string, ExamResult>();
  for (const e of exams) if (!latest.has(e.blueprintId) || e.submittedAt > latest.get(e.blueprintId)!.submittedAt) latest.set(e.blueprintId, e);
  return [...latest.values()].filter((e) => !passed(e));
}

const fmtScore = (e: Pick<ExamResult, 'score' | 'maxScore'>) => `${Number(e.score.toFixed(2))}/${Number(e.maxScore)}`;

function ReviewCard({ exams }: { exams: ExamResult[] | null }) {
  const { t } = useLanguage();
  if (!exams) return null;
  const retake = examsToRetake(exams);
  return (
    <section aria-labelledby="review-title" className={CARD}>
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-2xl ${retake.length ? 'bg-warning-surface text-warning' : 'bg-success-surface text-success'}`}>
          {retake.length ? <TriangleAlert className="h-5 w-5" /> : <CircleCheck className="h-5 w-5" />}
        </span>
        <div>
          <h2 id="review-title" className="text-lg font-bold text-ink">{t({ en: 'Needs review', vi: 'Cần ôn lại' })}</h2>
          <p className="text-sm text-ink-muted">{t({ en: 'Exams below half marks', vi: 'Bài thi dưới nửa số điểm' })}</p>
        </div>
      </div>
      {retake.length === 0 ? (
        <p className="text-sm text-ink-muted">
          {exams.length
            ? t({ en: 'Your latest try on every exam passed. Nice work.', vi: 'Lần làm gần nhất của mọi đề đều đạt. Làm tốt lắm.' })
            : t({ en: 'No exams taken yet.', vi: 'Bạn chưa làm bài thi nào.' })}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {retake.map((e) => (
            <li key={e.blueprintId} className="flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_35%,var(--line))] bg-warning-surface p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink" title={e.name ?? undefined}>{e.name ?? t({ en: 'Exam', vi: 'Bài thi' })}</p>
                <p className="text-sm text-warning">{t({ en: `Score ${fmtScore(e)} · retake`, vi: `Điểm ${fmtScore(e)} · nên làm lại` })}</p>
              </div>
              <Link
                href={`/exam/${encodeURIComponent(e.blueprintId)}`}
                className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-surface-sunken ${FOCUS}`}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                {t({ en: 'Retake', vi: 'Làm lại' })}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Milestones({ items }: { items: Milestone[] }) {
  const { lang, t } = useLanguage();
  const fmt = new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'vi-VN', { day: 'numeric', month: 'short' });
  return (
    <section aria-labelledby="milestones-title" className={CARD}>
      <div className="mb-4 flex items-center gap-3">
        <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-2xl bg-surface-sunken text-ink"><Sparkles className="h-5 w-5" /></span>
        <h2 id="milestones-title" className="text-lg font-bold text-ink">{t({ en: 'Recent milestones', vi: 'Cột mốc gần đây' })}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">{t({ en: 'Lessons, exams and badges you finish show up here.', vi: 'Bài học, bài thi và huy hiệu bạn đạt được sẽ hiện ở đây.' })}</p>
      ) : (
        <ol className="relative ml-2 border-l-2 border-line">
          {items.map((m, i) => {
            const Icon = m.kind === 'lesson' ? BookOpenCheck : m.kind === 'badge' ? Award : GraduationCap;
            const tone = m.kind === 'exam' && !m.passed ? 'bg-warning-surface text-warning' : m.kind === 'badge' ? 'bg-[color-mix(in_srgb,var(--sun)_45%,var(--surface))] text-ink' : 'bg-success-surface text-success';
            const title = m.kind === 'exam' ? m.title : t(m.title);
            const what = m.kind === 'lesson'
              ? t({ en: 'Lesson completed', vi: 'Hoàn thành bài' })
              : m.kind === 'badge'
                ? t({ en: 'Badge unlocked', vi: 'Mở khoá huy hiệu' })
                : t({ en: `Exam · ${fmtScore(m)}`, vi: `Bài thi · ${fmtScore(m)}` });
            return (
              <li key={i} className="relative pb-4 pl-6 last:pb-0">
                <span aria-hidden="true" className={`absolute -left-[13px] top-0 grid h-6 w-6 place-items-center rounded-full ring-4 ring-surface ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-semibold text-ink [overflow-wrap:anywhere]">{title}</p>
                <p className="text-sm text-ink-muted">{what} · {fmt.format(new Date(m.at))}</p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function ProgressView(props: ProgressSummary) {
  const { completedLessons, streaks, totalXP, badges, leaderboard, continueMinutes, exams, loadFailed } = props;
  // Most recently studied subject first, so the roadmap opens where the student left off.
  const roadmaps = props.roadmaps && [...props.roadmaps].sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''));
  const { t } = useLanguage();
  const level = Math.floor(totalXP / LEVEL_XP) + 1;
  const done = roadmaps?.reduce((n, r) => n + r.done, 0) ?? 0;
  const total = roadmaps?.reduce((n, r) => n + r.total, 0) ?? 0;
  const percent = total ? Math.round((done / total) * 100) : 0;
  const bestStreak = streaks.reduce((max, s) => Math.max(max, s.current_streak), 0);
  const passedCount = exams?.filter(passed).length;

  const milestones = recentMilestones([
    ...completedLessons.flatMap((p): Milestone[] => (p.completed_at && p.lessons ? [{ kind: 'lesson', at: p.completed_at, title: { en: p.lessons.title_en ?? p.lessons.title_vi, vi: p.lessons.title_vi } }] : [])),
    ...badges.flatMap((b): Milestone[] => (b.badges ? [{ kind: 'badge', at: b.earned_at, icon: b.badges.icon, title: { en: b.badges.name_en ?? b.badges.name_vi, vi: b.badges.name_vi } }] : [])),
    ...(exams ?? []).map((e): Milestone => ({ kind: 'exam', at: e.submittedAt, title: e.name ?? t({ en: 'Exam', vi: 'Bài thi' }), score: e.score, maxScore: e.maxScore, passed: passed(e) })),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={`rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline ${FOCUS}`}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li aria-current="page" className="font-semibold text-ink">{t({ en: 'Learning progress', vi: 'Tiến trình học tập' })}</li>
        </ol>
      </nav>

      {loadFailed && (
        <LoadErrorNotice message={{ en: 'We could not load your progress. Please reload the page.', vi: 'Chưa tải được tiến trình học tập. Tải lại trang nhé.' }} />
      )}

      <ProgressHero
        stats={{ percent, done, total, streak: bestStreak, lessons: completedLessons.length, examsPassed: passedCount ?? null, examsTaken: exams?.length ?? 0, xp: totalXP, level }}
      />

      <ContinueCard roadmaps={roadmaps} minutes={continueMinutes} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <Roadmap roadmaps={roadmaps} />
          <BadgeWall badges={badges} />
        </div>
        <aside className="flex min-w-0 flex-col gap-5">
          <ReviewCard exams={exams} />
          <Leaderboard board={leaderboard} />
          <Milestones items={milestones} />
          <StreakCalendar streaks={streaks} />
        </aside>
      </div>
    </main>
  );
}
