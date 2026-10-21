import { useEffect, useMemo, useRef, useState } from 'react';
import { seededShuffle } from '../features/exam/examOrder';

/** Fisher–Yates copy. */
export function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Options in a random order that stays the same for a question during the visit (coming back to it
 * does not reshuffle). Shuffled after mount so server and client markup agree; answers go by option
 * id, so grading is unaffected. With a `seed` the order is fixed by it (and the question), so it also
 * stays the same after a reload.
 */
export function useShuffledOptions<T extends { id: string }>(questionId: string, options: T[], seed?: string | null): T[] {
  const orders = useRef(new Map<string, string[]>());
  const [, bump] = useState(0);
  useEffect(() => {
    if (!seed && options.length > 0 && !orders.current.has(questionId)) {
      orders.current.set(questionId, shuffled(options.map((o) => o.id)));
      bump((n) => n + 1);
    }
  }, [questionId, options, seed]);
  const fixed = useMemo(() => (seed ? seededShuffle(options, `${seed}:${questionId}`) : null), [seed, questionId, options]);
  if (fixed) return fixed;
  const order = orders.current.get(questionId);
  return order ? order.flatMap((id) => options.filter((o) => o.id === id)) : options;
}
