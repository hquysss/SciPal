// backend/src/__tests__/v19-drop-legacy-migration.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260927090200_v19_drop_legacy_columns.sql', import.meta.url),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ');

describe('v1.9 legacy column removal', () => {
  it('drops the legacy lesson and subject columns', () => {
    expect(sql).toContain('alter table public.lessons drop column published, drop column review_status');
    expect(sql).toContain('alter table public.subjects drop column status, drop column education_level');
  });

  it('drops the indexes that depended on them', () => {
    expect(sql).toContain('drop index if exists public.lessons_pending_review_idx');
    expect(sql).toContain('drop index if exists public.lessons_author_review_idx');
    expect(sql).toContain('drop index if exists public.subjects_education_level_sort_order_idx');
  });

  it('keeps an author index on the new status column', () => {
    expect(sql).toContain('create index lessons_author_status_idx on public.lessons (created_by, status, updated_at desc)');
  });
});
