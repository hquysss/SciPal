// A badge's rule is data (badges.condition); this turns the rules and a student's numbers into the
// badges they have earned. Honor badges (`manual`) are never earned here: an admin awards them.

export type BadgeCondition =
  | { type: 'streak'; min: number }
  | { type: 'exam_count'; min: number }
  | { type: 'perfect_score' }
  | { type: 'friends'; min: number }
  | { type: 'manual' };

export type BadgeStats = { bestStreak: number; examCount: number; bestExamScore: number; friends: number };

const PERFECT = 10;

export function isEarned(condition: unknown, stats: BadgeStats): boolean {
  const c = condition as Partial<BadgeCondition> & { min?: unknown } | null;
  if (!c || typeof c !== 'object') return false;
  const min = typeof c.min === 'number' ? c.min : Infinity;
  switch (c.type) {
    case 'streak': return stats.bestStreak >= min;
    case 'exam_count': return stats.examCount >= min;
    case 'perfect_score': return stats.bestExamScore >= PERFECT;
    case 'friends': return stats.friends >= min;
    default: return false;
  }
}

/** The ids of the badges whose rule the numbers meet. */
export function earnedBadgeIds(badges: Array<{ id: string; condition: unknown }>, stats: BadgeStats): string[] {
  return badges.filter((b) => isEarned(b.condition, stats)).map((b) => b.id);
}
