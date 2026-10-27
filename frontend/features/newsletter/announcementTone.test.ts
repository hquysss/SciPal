import { describe, expect, it } from 'vitest';
import { toneOfKind } from './announcementTone';

describe('toneOfKind', () => {
  it('reads the tone of a coloured announcement', () => {
    expect(toneOfKind('announcement:warn')).toBe('warn');
    expect(toneOfKind('announcement:urgent')).toBe('urgent');
  });
  it('leaves the plain announcement and other notices alone', () => {
    expect(toneOfKind('announcement')).toBeNull();
    expect(toneOfKind('announcement:purple')).toBeNull();
    expect(toneOfKind('badge')).toBeNull();
  });
});
