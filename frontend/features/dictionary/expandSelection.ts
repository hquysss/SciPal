const LETTER = /[\p{L}\p{M}]/u;

/**
 * What to look up for the selection [start, end) of `text`: the longest lesson term that covers it
 * as whole words ("vòng" in "vòng lặp" → "vòng lặp"), as written in the text; else the selection.
 */
export function expandSelection(text: string, start: number, end: number, terms: string[]): string {
  const lower = text.toLowerCase();
  let best: [number, number] = [start, end];
  for (const term of terms) {
    const needle = term.trim().toLowerCase();
    if (!needle || needle.length <= best[1] - best[0]) continue;
    for (let i = lower.indexOf(needle); i >= 0; i = lower.indexOf(needle, i + 1)) {
      const j = i + needle.length;
      if (i > start || j < end) continue;
      if (LETTER.test(text[i - 1] ?? '') || LETTER.test(text[j] ?? '')) continue;
      best = [i, j];
      break;
    }
  }
  return text.slice(best[0], best[1]).trim();
}
