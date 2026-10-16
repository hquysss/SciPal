import { describe, expect, it } from 'vitest';
import { screenText, stepNote, type TraceStep } from './codeTraceNotes';

const step = (line: number, vars: Record<string, string>, extra: Partial<TraceStep> = {}): TraceStep => ({
  line,
  frames: [{ name: '<module>', vars: Object.fromEntries(Object.entries(vars).map(([k, repr]) => [k, { repr }])) }],
  ...extra,
});

describe('stepNote', () => {
  it('announces the line about to run on the first step', () => {
    expect(stepNote(undefined, step(1, {}))).toEqual({ en: 'About to run line 1.', vi: 'Sắp chạy dòng 1.' });
  });

  it('names the variables the previous line changed', () => {
    const note = stepNote(step(1, {}), step(2, { s: '5', t: '0' }));
    expect(note.vi).toBe('Dòng 1 vừa chạy: s = 5, t = 0. Tiếp theo: dòng 2.');
    expect(note.en).toBe('Line 1 ran: s = 5, t = 0. Next: line 2.');
  });

  it('says nothing changed when the line only tested a condition', () => {
    const note = stepNote(step(1, { x: '3' }), step(2, { x: '3' }));
    expect(note.vi).toBe('Dòng 1 vừa chạy, biến không đổi. Tiếp theo: dòng 2.');
  });

  it('reports a function call and its return by frame', () => {
    const inner: TraceStep = { line: 2, frames: [{ name: '<module>', vars: {} }, { name: 'f', vars: { a: { repr: '3' } } }] };
    expect(stepNote(step(4, {}), inner).vi).toContain('a = 3');
  });

  it('puts the error first on the last step', () => {
    const note = stepNote(step(1, { x: '1' }), step(2, { x: '1' }, { error: 'ZeroDivisionError: division by zero' }));
    expect(note.vi).toBe('Lỗi ở dòng 2: ZeroDivisionError: division by zero');
    expect(note.en).toBe('Error on line 2: ZeroDivisionError: division by zero');
  });
});

describe('screenText', () => {
  const steps = [step(1, {}, { out: 'a\n' }), step(2, {}, { out: 'b\n' }), step(3, {})];
  it('shows only what earlier lines printed, since a step shows the state before its line runs', () => {
    expect(screenText(steps, 0)).toBe('');
    expect(screenText(steps, 1)).toBe('a\n');
    expect(screenText(steps, 2)).toBe('a\nb\n');
  });
  it('includes the last step’s own output once the program ends', () => {
    expect(screenText([step(1, {}), step(2, {}, { out: 'end\n' })], 1)).toBe('end\n');
  });
});
