import { useEffect, useRef, useState } from 'react';

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
 * id, so grading is unaffected.
 */
export function useShuffledOptions<T extends { id: string }>(questionId: string, options: T[]): T[] {
  const orders = useRef(new Map<string, string[]>());
  const [, bump] = useState(0);
  useEffect(() => {
    if (options.length > 0 && !orders.current.has(questionId)) {
      orders.current.set(questionId, shuffled(options.map((o) => o.id)));
      bump((n) => n + 1);
    }
  }, [questionId, options]);
  const order = orders.current.get(questionId);
  return order ? order.flatMap((id) => options.filter((o) => o.id === id)) : options;
}
