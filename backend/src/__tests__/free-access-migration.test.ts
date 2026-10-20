import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Behaviour in both states runs on PGlite: supabase/tests/free_access_cases.sql.
const sql = readFileSync(new URL('../../../supabase/migrations/20261020180000_free_access.sql', import.meta.url), 'utf8');

describe('free access migration', () => {
  it('adds the switch off by default', () => {
    expect(sql).toMatch(/add column if not exists free_access boolean not null default false/);
  });

  it('lifts only the metrics that call no AI', () => {
    const list = sql.match(/v_free and l\.metric in \(([^)]+)\)/)![1]!;
    const metrics = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]).sort();
    expect(metrics).toEqual(['active_authored_exams', 'active_classes', 'code_runs', 'code_submits', 'graded_exam_attempts', 'import_files', 'students_per_class']);
    for (const ai of ['tutor_tokens', 'tutor_requests', 'voice_minutes', 'author_ai_requests']) expect(list).not.toContain(ai);
  });

  it('says it is applied before the backend that reads the column', () => {
    expect(sql).toMatch(/APPLY BEFORE the backend/);
  });
});
