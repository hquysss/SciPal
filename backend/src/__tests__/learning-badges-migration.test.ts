import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONDITION_TYPES } from '../badges/evaluate.js';

const sql = readFileSync(new URL('../../../supabase/migrations/20261025100000_learning_badges.sql', import.meta.url), 'utf8');

describe('learning badges migration contract', () => {
  it('adds learning to the category check', () => {
    expect(sql).toContain("check (category in ('streak', 'exam', 'excellence', 'community', 'honor', 'learning'))");
  });

  it('seeds the 12 learning badges with known condition types', () => {
    const slugs = [...sql.matchAll(/^ {2}\('([a-z0-9_]+)', '/gm)].map((m) => m[1]);
    expect(slugs).toEqual([
      'lessons_1', 'lessons_10', 'lessons_50', 'practice_right_50', 'practice_right_250', 'practice_right_1000',
      'level_5', 'level_10', 'level_20', 'goal_days_7', 'goal_days_30', 'code_ac_10',
    ]);
    for (const [, json] of sql.matchAll(/'(\{"type"[^']+\})'/g)) {
      const condition = JSON.parse(json!) as { type: string; min?: number };
      expect(CONDITION_TYPES).toContain(condition.type);
      expect(condition.min).toBeGreaterThan(0);
    }
  });
});
