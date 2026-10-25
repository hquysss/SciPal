import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONDITION_TYPES } from '../badges/evaluate.js';

const raw = readFileSync(new URL('../../../supabase/migrations/20261025110000_social.sql', import.meta.url), 'utf8');
const sql = raw.toLowerCase();

describe('social migration contract', () => {
  it('lets the two people only read a challenge; the backend writes it', () => {
    expect(sql).toContain('alter table public.challenges enable row level security');
    expect(sql).toContain('revoke insert, update, delete on public.challenges from anon, authenticated');
    expect(sql).toMatch(/create policy[^;]*on public\.challenges for select to authenticated/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.challenges for (insert|update|delete|all)/);
    expect(sql).toContain('check (challenger <> opponent)');
    expect(sql).toMatch(/create unique index[^;]*challenges[^;]*where status in \('pending', 'active'\)/);
  });

  it('keeps the two privacy switches out of client writes', () => {
    expect(sql).toContain('leaderboard_public bool not null default false');
    expect(sql).toContain('leaderboard_enabled bool not null default true');
    expect(sql).not.toMatch(/grant (update|insert)[^;]*(leaderboard_public|leaderboard_enabled)/);
  });

  it('names someone on the global board only when they chose to be named or are the viewer', () => {
    expect(sql).toContain('case when p.leaderboard_public or r.user_id = (select auth.uid()) then p.display_name end');
  });

  it('answers a class board only for its members and teacher, and only while it is on', () => {
    const fn = sql.slice(sql.indexOf('function public.class_leaderboard'));
    expect(fn).toContain('c.leaderboard_enabled');
    expect(fn).toContain('c.teacher_id = (select auth.uid())');
    expect(fn).toContain('m.student_id = (select auth.uid())');
  });

  it('seeds the two challenge badges with a known condition type', () => {
    const slugs = [...raw.matchAll(/^ {2}\('([a-z0-9_]+)', '/gm)].map((m) => m[1]);
    expect(slugs).toEqual(['challenge_win_1', 'challenge_win_5']);
    for (const [, json] of raw.matchAll(/'(\{"type"[^']+\})'/g)) {
      expect(CONDITION_TYPES).toContain((JSON.parse(json!) as { type: string }).type);
    }
  });
});
