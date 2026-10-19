import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../../supabase/migrations/20261020170000_code_quota_in_plans.sql', import.meta.url), 'utf8');

describe('code quota migration', () => {
  it('allows both new metrics wherever metrics are listed, keeping every older one', () => {
    const list = sql.match(/metrics text := \$m\$(.+?)\$m\$/s)![1]!;
    for (const metric of ['tutor_requests', 'tutor_tokens', 'graded_exam_attempts', 'active_classes', 'students_per_class', 'import_files', 'active_authored_exams', 'author_ai_requests', 'voice_minutes', 'code_submits', 'code_runs']) {
      expect(list).toContain(`'${metric}'`);
    }
    for (const table of ['billing_plan_limits', 'account_quota_overrides', 'quota_usage', 'quota_operations']) expect(sql).toContain(`'${table}'`);
  });

  it('counts code runs per day only, and seeds every plan with both', () => {
    expect(sql).toMatch(/metric in \('code_submits', 'code_runs'\) and kind = 'daily'/);
    for (const plan of ['student_free', 'student_plus', 'teacher_free', 'teacher_pro']) {
      expect(sql).toContain(`('${plan}', 'code_submits', 'daily'`);
      expect(sql).toContain(`('${plan}', 'code_runs', 'daily'`);
    }
  });

  it('says it must be applied after the backend that knows the metrics, and drops the person columns it replaces', () => {
    expect(sql).toMatch(/APPLY AFTER the backend/);
    expect(sql).toMatch(/drop column if exists person_submits_per_day/);
    expect(sql).toMatch(/drop column if exists person_runs_per_day/);
  });
});
