import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_QUESTION_TEXT, questionIncomplete, toPublicPracticeQuestion, validateQuestionInput } from '../schemas/questions.js';

// Tests run from backend/ (pnpm --filter @scipal/api test); the fixtures live with @scipal/types.
const SHARED = '../packages/types/src';
const fixtures = JSON.parse(
  readFileSync(`${SHARED}/__fixtures__/questions.json`, 'utf8').replace(/"OVERSIZED"/g, JSON.stringify('x'.repeat(MAX_QUESTION_TEXT + 1))),
) as {
  inputs: Array<{ name: string; ok: boolean; complete?: boolean; input: unknown }>;
  public: Array<{ name: string; row: never; expected: unknown }>;
};

describe('backend mirror of the question contract', () => {
  it('is the same source as @scipal/types (Vercel cannot load the sibling package)', () => {
    expect(readFileSync('src/schemas/questions.ts', 'utf8').replace(/\r\n/g, '\n')).toBe(
      readFileSync(`${SHARED}/question.ts`, 'utf8').replace(/\r\n/g, '\n'),
    );
  });

  it.each(fixtures.inputs.map((row) => [row.name, row] as const))('agrees on: %s', (_name, row) => {
    const result = validateQuestionInput(row.input);
    expect(result.ok).toBe(row.ok);
    if (result.ok) expect(questionIncomplete(result.value) === null).toBe(row.complete);
  });

  it.each(fixtures.public.map((row) => [row.name, row] as const))('agrees on the learner view: %s', (_name, row) => {
    expect(toPublicPracticeQuestion(row.row)).toEqual(row.expected);
  });
});

const sql = readFileSync('../supabase/migrations/20260927150000_practice_questions.sql', 'utf8').toLowerCase();

describe('practice questions migration contract', () => {
  it('separates practice from exam questions and keeps existing rows as exam', () => {
    expect(sql).toMatch(/add column if not exists usage text not null default 'exam'/);
    expect(sql).toMatch(/check \(usage in \('practice', 'exam'\)\)/);
    expect(sql).toMatch(/grade is null or grade between 1 and 12/);
    expect(sql).toMatch(/check \(status in \('draft', 'pending_review', 'published'\)\)/);
  });

  it('keeps a question when the lesson it came from is deleted', () => {
    expect(sql).toMatch(/foreign key \(lesson_id\) references public\.lessons\(id\) on delete set null/);
  });

  it('indexes the pool and lesson lookups', () => {
    expect(sql).toMatch(/on public\.questions \(usage, subject_id, status, difficulty, id\)/);
    expect(sql).toMatch(/on public\.questions \(lesson_id, usage\)/);
  });

  it('keeps questions private to the backend', () => {
    expect(sql).toContain('revoke all on public.questions from anon, authenticated');
    expect(sql).not.toMatch(/grant [^;]* on public\.questions/);
  });

  it('moves linked practice questions with the lesson status in the same statement', () => {
    expect(sql).toMatch(/after update of status on public\.lessons/);
    expect(sql).toMatch(/when \(old\.status is distinct from new\.status\)/);
    expect(sql).toMatch(/set search_path = ''/);
    // Only practice rows attached to this lesson and referenced by its quiz blocks.
    expect(sql).toContain("usage = 'practice'");
    expect(sql).toContain('lesson_id = new.id');
    expect(sql).toContain("b ->> 'type' = 'quiz'");
    // A reused published question is never demoted.
    expect(sql).not.toMatch(/set status = 'draft'[^;]*status = 'published'/);
    expect(sql).toContain('revoke execute on function public.sync_lesson_practice_questions() from public, anon, authenticated');
  });
});
