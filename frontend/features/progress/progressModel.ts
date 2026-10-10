import { groupTopicsByGrade, type TopicRow } from '../lessons/groupTopics';

// Pure shaping for /progress: the roadmap per subject, the lesson to continue, exam outcomes and
// recent milestones. Everything here derives from real rows; nothing is invented when data is missing.

export type Bilingual = { en: string; vi: string };
export type LessonState = 'done' | 'current' | 'todo';

export interface RoadmapLesson { id: string; slug: string; title: Bilingual; state: LessonState; completedAt: string | null }
export interface RoadmapChapter { id: string; grade: number; title: Bilingual; lessons: RoadmapLesson[]; done: number }
export interface SubjectRoadmap {
  subject: { id: string; slug: string; name: Bilingual; accent: string };
  chapters: RoadmapChapter[];
  done: number;
  total: number;
  /** Most recent completion in this subject, to pick where the student left off. */
  lastActive: string | null;
}

export interface ExamResult { blueprintId: string; name: string | null; score: number; maxScore: number; submittedAt: string }

export type Milestone =
  | { kind: 'lesson'; at: string; title: Bilingual }
  | { kind: 'badge'; at: string; title: Bilingual; icon: string }
  | { kind: 'exam'; at: string; title: string; score: number; maxScore: number; passed: boolean };

export const PASS_RATIO = 0.5;
export const passed = (e: Pick<ExamResult, 'score' | 'maxScore'>) => e.maxScore > 0 && e.score / e.maxScore >= PASS_RATIO;

export type SubjectInfo = SubjectRoadmap['subject'];

/** Chapters in grade then topic order; the first unfinished lesson of the subject is "current". */
export function buildRoadmap(
  subject: SubjectInfo,
  topics: TopicRow[],
  completed: Map<string, string | null>,
): SubjectRoadmap {
  let currentSet = false;
  let done = 0;
  let total = 0;
  let lastActive: string | null = null;
  const chapters = groupTopicsByGrade(topics).flatMap((group) =>
    group.topics.map((topic) => {
      const lessons = topic.lessons.map((l): RoadmapLesson => {
        total += 1;
        const isDone = completed.has(l.id);
        const completedAt = completed.get(l.id) ?? null;
        if (isDone) done += 1;
        if (completedAt && (!lastActive || completedAt > lastActive)) lastActive = completedAt;
        const state: LessonState = isDone ? 'done' : currentSet ? 'todo' : 'current';
        if (state === 'current') currentSet = true;
        return { id: l.id, slug: l.slug, title: { en: l.title_en, vi: l.title_vi }, state, completedAt };
      });
      return {
        id: topic.id,
        grade: group.grade,
        title: { en: topic.name_en, vi: topic.name_vi },
        lessons,
        done: lessons.filter((l) => l.state === 'done').length,
      };
    }),
  );
  return { subject, chapters, done, total, lastActive };
}

/** The subject studied most recently (ties: listed first), and its current lesson if any. */
export function continueTarget(roadmaps: SubjectRoadmap[]) {
  const ordered = [...roadmaps].sort((a, b) => (b.lastActive ?? '').localeCompare(a.lastActive ?? ''));
  for (const r of ordered) {
    for (const [index, chapter] of r.chapters.entries()) {
      const lesson = chapter.lessons.find((l) => l.state === 'current');
      if (lesson) {
        return {
          roadmap: r,
          chapter,
          chapterNumber: index + 1,
          lessonNumber: chapter.lessons.indexOf(lesson) + 1,
          lesson,
        };
      }
    }
  }
  return null;
}

const WORDS_PER_MINUTE = 200;

/**
 * Rough reading time of a lesson from its blocks: words in every string / 200 wpm, plus a minute per
 * quiz. ponytail: a word count heuristic; store an authored duration on lessons if this misleads.
 */
export function estimateMinutes(blocks: unknown): number {
  let words = 0;
  let quizzes = 0;
  const walk = (v: unknown) => {
    if (typeof v === 'string') words += v.split(/\s+/).filter(Boolean).length;
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') {
      if ((v as { type?: unknown }).type === 'quiz') quizzes += 1;
      // Bilingual blocks hold each text twice: count one language only.
      for (const [k, child] of Object.entries(v)) if (k !== 'en' && k !== 'url' && k !== 'src') walk(child);
    }
  };
  walk(blocks);
  return Math.max(3, Math.round(words / WORDS_PER_MINUTE) + quizzes);
}

/** Newest first, at most `limit`. */
export function recentMilestones(items: Milestone[], limit = 6): Milestone[] {
  return [...items].sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
