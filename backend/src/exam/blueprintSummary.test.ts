import { describe, expect, it } from 'vitest';
import { toBlueprintSummary, type BlueprintRow } from './blueprintSummary.js';

const layout = [
  {
    key: 'mc',
    title: { vi: 'Phần I', en: 'Part I' },
    kind: 'mc' as const,
    count: 1,
    max_points: 6,
    groups: [{ question_ids: ['11111111-1111-4111-8111-111111111111'] }],
  },
];
const base: BlueprintRow = { id: 'bp', name: 'Đề', grade: 12, subject_id: null, sections: [], subjects: null };

describe('toBlueprintSummary format and layout', () => {
  it('carries the format and layout of a laid-out exam', () => {
    const summary = toBlueprintSummary({ ...base, format: 'thptqg', layout });
    expect(summary.format).toBe('thptqg');
    expect(summary.layout).toEqual(layout);
  });

  it('treats a row without them as a generic exam with no layout', () => {
    const summary = toBlueprintSummary(base);
    expect(summary.format).toBe('generic');
    expect(summary.layout).toBeNull();
  });

  it('falls back to generic for an unknown format or a malformed layout', () => {
    const summary = toBlueprintSummary({ ...base, format: 'mystery' as never, layout: 'oops' as never });
    expect(summary.format).toBe('generic');
    expect(summary.layout).toBeNull();
  });
});
