import type { TextColor } from '@/components/blocks/remarkColor';

export type MarkdownFormat = 'bold' | 'italic' | 'heading' | 'list' | 'math';

/** Wrap the selection in `{color:…}` (see remarkColor). */
export function applyColor(text: string, start: number, end: number, color: TextColor) {
  const open = `{${color}:`;
  const inner = (start === end ? 'chữ màu' : text.slice(start, end)).replace(/[{}\n]/g, ' ');
  return { text: text.slice(0, start) + open + inner + '}' + text.slice(end), start: start + open.length, end: start + open.length + inner.length };
}

/** Tag the selection as a glossary term, `{term:<id>:…}` (see remarkTerm); no selection, no change. */
export function applyTerm(text: string, start: number, end: number, termId: string, kind: 'term' | 'note' = 'term') {
  if (start === end) return { text, start, end };
  const open = `{${kind}:${termId}:`;
  // Inline Markdown would split the tag's text node and show the raw marker, so only plain words go in.
  const inner = text.slice(start, end).replace(/[{}\n]/g, ' ').replace(/[*_`$~[\]]/g, '');
  return { text: text.slice(0, start) + open + inner + '}' + text.slice(end), start: start + open.length, end: start + open.length + inner.length };
}

/** A new key for a note: short, lowercase, and not already used in the block. */
export function newNoteKey(used: readonly string[]): string {
  let key = '';
  do key = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  while (used.includes(key));
  return key;
}

/** The notes still tagged in either language's text; a removed tag takes its note with it. */
export function pruneNotes<N>(notes: Record<string, N> | undefined, ...texts: string[]): Record<string, N> | undefined {
  if (!notes) return notes;
  const kept = Object.entries(notes).filter(([key]) => texts.some((text) => text.includes(`{note:${key}:`)));
  return kept.length ? Object.fromEntries(kept) : undefined;
}

const WRAP: Record<'bold' | 'italic' | 'math', { mark: string; placeholder: string }> = {
  bold: { mark: '**', placeholder: 'chữ đậm' },
  italic: { mark: '*', placeholder: 'chữ nghiêng' },
  math: { mark: '$', placeholder: 'x^2' },
};

/** Apply a toolbar format to a textarea's text and selection; returns the new text and selection. */
export function applyFormat(text: string, start: number, end: number, format: MarkdownFormat) {
  if (format === 'heading' || format === 'list') {
    const prefix = format === 'heading' ? '## ' : '- ';
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    const nextBreak = text.indexOf('\n', end);
    const lineEnd = nextBreak === -1 ? text.length : nextBreak;
    const lines = text
      .slice(lineStart, lineEnd)
      .split('\n')
      .map((line) => (line.startsWith(prefix) ? line : prefix + line))
      .join('\n');
    return { text: text.slice(0, lineStart) + lines + text.slice(lineEnd), start: lineStart, end: lineStart + lines.length };
  }
  const { mark, placeholder } = WRAP[format];
  const inner = start === end ? placeholder : text.slice(start, end);
  return {
    text: text.slice(0, start) + mark + inner + mark + text.slice(end),
    start: start + mark.length,
    end: start + mark.length + inner.length,
  };
}
