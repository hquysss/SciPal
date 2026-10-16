import type { CodeTraceStep } from '@scipal/types';

export type TraceStep = CodeTraceStep;
type Bilingual = { en: string; vi: string };

/** Variables of the innermost frame, `name = repr`, in the order they were declared. */
const top = (step: TraceStep) => step.frames[step.frames.length - 1]!;

/** What the previous line did to the variables, in words, for the step announced to screen readers. */
export function stepNote(prev: TraceStep | undefined, step: TraceStep): Bilingual {
  if (step.error) return { en: `Error on line ${step.line}: ${step.error}`, vi: `Lỗi ở dòng ${step.line}: ${step.error}` };
  if (!prev) return { en: `About to run line ${step.line}.`, vi: `Sắp chạy dòng ${step.line}.` };
  const before = top(prev);
  const now = top(step);
  // A new frame (a call) has no earlier values, so all of its variables count as new.
  const same = before.name === now.name;
  const changed = Object.entries(now.vars)
    .filter(([name, v]) => !same || before.vars[name]?.repr !== v.repr)
    .map(([name, v]) => `${name} = ${v.repr}`);
  return changed.length
    ? { en: `Line ${prev.line} ran: ${changed.join(', ')}. Next: line ${step.line}.`, vi: `Dòng ${prev.line} vừa chạy: ${changed.join(', ')}. Tiếp theo: dòng ${step.line}.` }
    : { en: `Line ${prev.line} ran, no variable changed. Next: line ${step.line}.`, vi: `Dòng ${prev.line} vừa chạy, biến không đổi. Tiếp theo: dòng ${step.line}.` };
}

/** What the program has printed when step `at` is on show. */
export function screenText(steps: TraceStep[], at: number): string {
  const upTo = at === steps.length - 1 ? at + 1 : at;
  return steps.slice(0, upTo).map((s) => s.out ?? '').join('');
}
