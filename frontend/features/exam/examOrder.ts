// The order an exam is served in: sections stay where they are, the questions inside each section are
// shuffled, and the order is fixed by a seed kept on this device, so reloading the page or closing it
// and coming back shows the same order (the saved answers go by position). Passage groups stay together.

import type { ExamSection } from '@scipal/types';

export const EXAM_ORDER_PREFIX = 'scipal-exam-order:';

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const defaultStore = (): Store | undefined => {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
};
const key = (blueprintId: string) => `${EXAM_ORDER_PREFIX}${blueprintId}`;

/** The seed of this exam's order, made on the first call and kept until `dropOrderSeed`. */
export function loadOrderSeed(blueprintId: string, store: Store | undefined = defaultStore()): string {
  try {
    const kept = store?.getItem(key(blueprintId));
    if (kept) return kept;
  } catch {
    // Storage blocked: the order holds for this visit only.
  }
  const seed = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    store?.setItem(key(blueprintId), seed);
  } catch {
    // Not kept.
  }
  return seed;
}

/** After the result is shown, the next attempt gets a new order. */
export function dropOrderSeed(blueprintId: string, store: Store | undefined = defaultStore()): void {
  try {
    store?.removeItem(key(blueprintId));
  } catch {
    // Nothing was kept.
  }
}

/** A small seeded generator (mulberry32) over a string seed. */
function random(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i += 1) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A copy in an order fixed by `seed` (Fisher–Yates). */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = random(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const hasText = (text: { vi: string; en: string } | undefined) => Boolean(text && (text.vi.trim() || text.en.trim()));

/**
 * The questions in the order they are served: each section in place, its groups shuffled, and the
 * questions of a group shuffled unless it has a passage (those read as a set, in their own order).
 * Questions outside the layout follow, shuffled. Without a layout everything is shuffled.
 */
export function arrangeQuestions<T extends { id: string }>(questions: readonly T[], layout: ExamSection[] | null | undefined, seed: string): T[] {
  if (!layout?.length) return seededShuffle(questions, seed);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const used = new Set<string>();
  const out: T[] = [];
  layout.forEach((section, s) => {
    const groups = section.groups
      .map((group, g) => {
        const own = group.question_ids.flatMap((id) => {
          const q = byId.get(id);
          if (!q || used.has(id)) return [];
          used.add(id);
          return [q];
        });
        return hasText(group.passage) ? own : seededShuffle(own, `${seed}:${s}:${g}`);
      })
      .filter((own) => own.length > 0);
    for (const own of seededShuffle(groups, `${seed}:${s}`)) out.push(...own);
  });
  const rest = questions.filter((q) => !used.has(q.id));
  return [...out, ...seededShuffle(rest, `${seed}:rest`)];
}
