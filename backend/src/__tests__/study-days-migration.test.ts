import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/20261025090000_study_days.sql', import.meta.url), 'utf8').toLowerCase();

describe('study days migration contract', () => {
  it('lets learners only read their own study days', () => {
    expect(sql).toContain('alter table public.study_days enable row level security');
    expect(sql).toContain('revoke insert, update, delete on public.study_days from anon, authenticated');
    expect(sql).toMatch(/create policy[^;]*on public\.study_days for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/);
    expect(sql).not.toMatch(/create policy[^;]*on public\.study_days for (insert|update|delete|all)/);
  });

  it('bounds the goal and the freezes, and keeps them out of client updates', () => {
    expect(sql).toContain('check (daily_goal_xp in (20, 50, 100))');
    expect(sql).toContain('check (streak_freezes between 0 and 2)');
    expect(sql).not.toMatch(/grant update[^;]*(daily_goal_xp|streak_freezes)/);
  });

  it('lets only the service role bump a day', () => {
    expect(sql).toContain('revoke execute on function public.bump_study_day(uuid, date, int) from public, anon, authenticated');
    expect(sql).toContain('grant execute on function public.bump_study_day(uuid, date, int) to service_role');
  });

  it('backfills from xp_log by Vietnam day', () => {
    expect(sql).toContain("at time zone 'asia/ho_chi_minh'");
    expect(sql).toContain('from public.xp_log');
  });
});
