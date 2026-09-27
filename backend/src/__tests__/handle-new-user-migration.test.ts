import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260927140000_harden_handle_new_user.sql', import.meta.url),
  'utf8',
).toLowerCase();

describe('handle_new_user hardening migration contract', () => {
  it('pins an empty search_path on the security definer trigger function', () => {
    expect(sql).toMatch(
      /create or replace function public\.handle_new_user\(\)[\s\S]*security definer[\s\S]*set search_path = ''/,
    );
  });

  it('schema-qualifies every object the body references', () => {
    expect(sql).toContain('insert into public.profiles');
    expect(sql).toContain('pg_catalog.split_part');
    expect(sql).not.toMatch(/insert into profiles/);
  });

  it('is not callable through /rest/v1/rpc by clients', () => {
    expect(sql).toContain('revoke execute on function public.handle_new_user() from public, anon, authenticated');
  });
});
