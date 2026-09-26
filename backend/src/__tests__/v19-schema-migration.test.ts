// backend/src/__tests__/v19-schema-migration.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  new URL('../../../supabase/migrations/20260927090000_v19_content_schema.sql', import.meta.url),
  'utf8',
).toLowerCase().replace(/\s+/g, ' ');

describe('v1.9 content schema migration', () => {
  it('creates the catalog tables with the locked keys and checks', () => {
    expect(sql).toContain('create table public.curriculum_versions');
    expect(sql).toContain('create table public.subject_grade_catalog');
    expect(sql).toContain('unique (curriculum_version_id, subject_id, grade)');
    expect(sql).toContain("curriculum_role in ('required', 'elective_choice', 'optional', 'required_activity')");
    expect(sql).toContain('create table public.subject_tracks');
    expect(sql).toContain('unique (subject_id, slug)');
  });

  it('widens lesson grades to 1–12 and adds the four-state status', () => {
    expect(sql).toContain('drop constraint if exists lessons_grade_check');
    expect(sql).toContain('check (grade between 1 and 12)');
    expect(sql).toContain("status in ('draft', 'pending_review', 'published', 'rejected')");
  });

  it('backfills status so approved-but-unpublished lessons become drafts', () => {
    expect(sql).toContain("when published then 'published'");
    expect(sql).toContain("when review_status = 'pending' then 'pending_review'");
    expect(sql).toContain("when review_status = 'rejected' then 'rejected'");
    expect(sql).toContain("else 'draft'");
  });

  it('serves only published lessons to clients through status', () => {
    expect(sql).toContain('drop policy if exists "lessons: published read" on public.lessons');
    expect(sql).toContain(
      "create policy \"lessons: published read\" on public.lessons for select to anon, authenticated using (status = 'published')",
    );
  });

  it('makes the new reference tables public-read and server-write', () => {
    for (const table of ['curriculum_versions', 'subject_grade_catalog', 'subject_tracks']) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
      expect(sql).toContain(`on public.${table} for select to anon, authenticated using (true)`);
      expect(sql).toContain(`revoke insert, update, delete on public.${table} from anon, authenticated`);
    }
  });

  it('lets users choose their code language but nothing else new', () => {
    expect(sql).toContain("preferred_code_language in ('python', 'cpp')");
    expect(sql).toContain('grant update (preferred_code_language) on public.profiles to authenticated');
  });
});
