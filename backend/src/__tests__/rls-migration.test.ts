import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260926090000_security_hardening_rls.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('security hardening migration contract', () => {
  it('revokes client writes on server-authoritative tables', () => {
    for (const table of ['progress', 'xp_log', 'streaks', 'user_badges']) {
      expect(sql).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
  });

  it('only lets users update safe profile columns', () => {
    expect(sql).toContain('revoke insert, update, delete on public.profiles from anon, authenticated');
    expect(sql).toContain(
      'grant update (display_name, avatar_url, preferred_education_level) on public.profiles to authenticated',
    );
  });

  it('hides questions and exam blueprints from clients', () => {
    expect(sql).toContain('revoke all on public.questions from anon, authenticated');
    expect(sql).toContain('revoke all on public.exam_blueprints from anon, authenticated');
  });

  it('no longer uses command-less policies on user tables', () => {
    expect(sql).not.toMatch(/create policy[^;]*on public\.(progress|xp_log|streaks|user_badges|profiles)\s+using/);
  });

  it('removes every client insert policy on surveys regardless of name', () => {
    expect(sql).toContain("tablename = 'surveys'");
    expect(sql).toContain("cmd = 'insert'");
  });
});
