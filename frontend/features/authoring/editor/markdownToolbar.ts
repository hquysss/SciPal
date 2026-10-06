import type { TextColor } from '@/components/blocks/remarkColor';

export type MarkdownFormat = 'bold' | 'italic' | 'heading' | 'list' | 'math';

/** Wrap the selection in `{color:…}` (see remarkColor). */
export function applyColor(text: string, start: number, end: number, color: TextColor) {
  const open = `{${color}:`;
  const inner = (start === end ? 'chữ màu' : text.slice(start, end)).replace(/[{}\n]/g, ' ');
  return { text: text.slice(0, start) + open + inner + '}' + text.slice(end), start: start + open.length, end: start + open.length + inner.length };
}

/** Tag the selection as a glossary term, `{term:<id>:…}` (see remarkTerm); no selection, no change. */
export function applyTerm(text: string, start: number, end: number, termId: string) {
  if (start === end) return { text, start, end };
  const open = `{term:${termId}:`;
  // Inline Markdown would split the tag's text node and show the raw marker, so only plain words go in.
  const inner = text.slice(start, end).replace(/[{}\n]/g, ' ').replace(/[*_`$~[\]]/g, '');
  return { text: text.slice(0, start) + open + inner + '}' + text.slice(end), start: start + open.length, end: start + open.length + inner.length };
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
