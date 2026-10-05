import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/20261005100000_exam_formats.sql', import.meta.url), 'utf8').toLowerCase();

describe('exam formats migration contract', () => {
  it('adds the exam format to blueprints, defaulting existing exams to generic', () => {
    expect(sql).toMatch(/add column if not exists format text not null default 'generic'/);
    expect(sql).toMatch(/check \(format in \('generic', 'thptqg', 'dgnl_hcm'\)\)/);
    expect(sql).toMatch(/drop constraint if exists exam_blueprints_format_check/);
  });

  it('adds the section layout as jsonb', () => {
    expect(sql).toMatch(/add column if not exists layout jsonb/);
  });

  it('adds max_score and per-section scores to attempts', () => {
    expect(sql).toMatch(/alter table public\.exam_attempts[\s\S]*add column if not exists max_score numeric\(7, 2\)/);
    expect(sql).toMatch(/add column if not exists section_scores jsonb/);
  });

  it('widens the attempt score so 1200 fits (numeric(4, 2) tops out at 99.99)', () => {
    expect(sql).toMatch(/alter column score type numeric\(7, 2\)/);
  });
});
