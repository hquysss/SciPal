// backend/src/__tests__/remove-demo-content.test.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const raw = readFileSync(new URL('../../../supabase/manual/remove_demo_content.sql', import.meta.url), 'utf8');
const sql = raw.toLowerCase().replace(/\s+/g, ' ');

describe('manual demo cleanup script', () => {
  it('previews every target and the lessons deleted with the demo topic', () => {
    expect(sql).toContain("where slug = 'binary-search'");
    expect(sql).toContain("slug = 'topic-f-algorithms'");
    expect(sql).toContain("term_en = 'algorithm'");
    expect(sql).toContain('from public.exam_blueprints');
    expect(sql).toMatch(/select .* from public\.lessons l join public\.topics t on t\.id = l\.topic_id .* 'topic-f-algorithms'/);
  });

  it('clears every non-cascading reference to the demo lessons before deleting them', () => {
    const detach = sql.indexOf("c.confrelid = 'public.lessons'::regclass and c.confdeltype in ('a', 'r')");
    const nullOut = sql.indexOf("update %s set %i = null where %i in (select id from demo_lessons)");
    const del = sql.indexOf('delete from public.lessons');
    expect(detach).toBeGreaterThan(-1);
    expect(nullOut).toBeGreaterThan(detach);
    expect(del).toBeGreaterThan(nullOut);
    expect(sql).not.toContain('public.xp_log');
  });

  it('runs deletes inside a transaction that rolls back by default', () => {
    const begin = sql.indexOf('begin;');
    expect(begin).toBeGreaterThan(-1);
    expect(sql.indexOf('delete from')).toBeGreaterThan(begin);
    expect(sql.trimEnd().endsWith('rollback;')).toBe(true);
    expect(sql).not.toMatch(/^\s*commit;/m);
  });
});
