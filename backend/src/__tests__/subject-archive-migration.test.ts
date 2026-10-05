import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/20261005200000_subject_archive.sql', import.meta.url), 'utf8').toLowerCase();

describe('subject archive migration contract', () => {
  it('adds a nullable archived_at timestamptz to subjects, idempotently', () => {
    expect(sql).toMatch(/alter table public\.subjects\s+add column if not exists archived_at timestamptz\s*;/);
  });

  it('drops the public read policy before recreating it so archived subjects are hidden from anon and authenticated', () => {
    const drop = sql.indexOf('drop policy if exists "subjects: public read" on public.subjects');
    const create = sql.search(/create policy "subjects: public read" on public\.subjects\s+for select to anon, authenticated\s+using \(archived_at is null\)/);
    expect(drop).toBeGreaterThanOrEqual(0);
    expect(create).toBeGreaterThan(drop);
  });
});
