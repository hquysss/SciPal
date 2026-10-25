// A badge's rule is data (badges.condition); this turns the rules and a student's numbers into the
// badges they have earned. Honor badges (`manual`) are never earned here: an admin awards them.

export type BadgeCondition =
  | { type: 'streak'; min: number }
  | { type: 'exam_count'; min: number }
  | { type: 'perfect_score' }
  | { type: 'friends'; min: number }
  | { type: 'lessons_done'; min: number }
  | { type: 'practice_right'; min: number }
  | { type: 'level'; min: number }
  | { type: 'goal_days'; min: number }
  | { type: 'code_ac'; min: number }
  | { type: 'challenge_wins'; min: number }
  | { type: 'manual' };

export const CONDITION_TYPES: Array<BadgeCondition['type']> = [
  'streak', 'exam_count', 'perfect_score', 'friends', 'lessons_done', 'practice_right', 'level', 'goal_days', 'code_ac', 'challenge_wins', 'manual',
];

export type BadgeStats = {
  bestStreak: number;
  examCount: number;
  bestExamScore: number;
  friends: number;
  lessonsDone: number;
  practiceRight: number;
  level: number;
  goalDays: number;
  codeAc: number;
  challengeWins: number;
};

const PERFECT = 10;

/** The number a counted rule compares with its `min`. */
const COUNTED: Partial<Record<BadgeCondition['type'], keyof BadgeStats>> = {
  streak: 'bestStreak',
  exam_count: 'examCount',
  friends: 'friends',
  lessons_done: 'lessonsDone',
  practice_right: 'practiceRight',
  level: 'level',
  goal_days: 'goalDays',
  code_ac: 'codeAc',
  challenge_wins: 'challengeWins',
};

function parse(condition: unknown): { type?: BadgeCondition['type']; min: number } | null {
  const c = condition as { type?: BadgeCondition['type']; min?: unknown } | null;
  if (!c || typeof c !== 'object') return null;
  return { type: c.type, min: typeof c.min === 'number' ? c.min : Infinity };
}

export function isEarned(condition: unknown, stats: BadgeStats): boolean {
  const c = parse(condition);
  if (!c?.type) return false;
  if (c.type === 'perfect_score') return stats.bestExamScore >= PERFECT;
  const key = COUNTED[c.type];
  return key ? stats[key] >= c.min : false;
}

/** How far a counted rule is ({current, target}), or null for rules without a count. */
export function progressOf(condition: unknown, stats: BadgeStats): { current: number; target: number } | null {
  const c = parse(condition);
  const key = c?.type ? COUNTED[c.type] : undefined;
  if (!c || !key || !Number.isFinite(c.min)) return null;
  return { current: Math.min(stats[key], c.min), target: c.min };
}

/** The ids of the badges whose rule the numbers meet. */
export function earnedBadgeIds(badges: Array<{ id: string; condition: unknown }>, stats: BadgeStats): string[] {
  return badges.filter((b) => isEarned(b.condition, stats)).map((b) => b.id);
}
