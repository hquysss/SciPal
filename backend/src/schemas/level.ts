/** Total XP needed to reach level n (level 1 starts at 0). */
export function xpForLevel(n: number): number {
  return 50 * n * (n - 1);
}

export type LevelInfo = { level: number; intoLevel: number; toNext: number };

/** Level derived from a server-issued XP total. Display only. */
export function levelOfXp(xp: number): LevelInfo {
  const total = Number.isFinite(xp) && xp > 0 ? Math.floor(xp) : 0;
  // Inverse of 50n(n−1): n = (1 + sqrt(1 + 8·xp/100)) / 2
  let level = Math.max(1, Math.floor((1 + Math.sqrt(1 + total / 12.5)) / 2));
  while (xpForLevel(level + 1) <= total) level++;
  while (level > 1 && xpForLevel(level) > total) level--;
  return { level, intoLevel: total - xpForLevel(level), toNext: xpForLevel(level + 1) - total };
}
