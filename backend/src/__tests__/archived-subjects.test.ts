import { describe, expect, it } from 'vitest';
import { isSubjectArchived, SUBJECT_ARCHIVED } from '../subjects/archived.js';

describe('isSubjectArchived', () => {
  it('is true only for a subject row with an archived_at time', () => {
    expect(isSubjectArchived({ archived_at: '2026-10-05T01:00:00.000Z' })).toBe(true);
    expect(isSubjectArchived({ archived_at: null })).toBe(false);
    expect(isSubjectArchived({})).toBe(false);
    expect(isSubjectArchived(null)).toBe(false);
    expect(isSubjectArchived(undefined)).toBe(false);
  });

  it('keeps the bilingual refusal for creates', () => {
    expect(SUBJECT_ARCHIVED).toEqual({ error: 'Môn học này đã bị xóa.', error_en: 'This subject was removed.' });
  });
});
