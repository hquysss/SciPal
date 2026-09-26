import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({ createBrowserClient: vi.fn() }));

import { timerTone } from './ExamRunner';

describe('timerTone', () => {
  it('is normal above five minutes', () => {
    expect(timerTone(301)).toBe('normal');
    expect(timerTone(45 * 60)).toBe('normal');
  });

  it('warns from five minutes down to 61 seconds', () => {
    expect(timerTone(300)).toBe('warning');
    expect(timerTone(61)).toBe('warning');
  });

  it('is urgent in the last minute', () => {
    expect(timerTone(60)).toBe('danger');
    expect(timerTone(0)).toBe('danger');
    expect(timerTone(-5)).toBe('danger');
  });
});
