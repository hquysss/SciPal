// Question text with formulas: `$…$` or `\(…\)` inline, `$$…$$` or `\[…\]` on its own line.
// Only formulas are special; everything else stays plain text (a `*` or `1.` in a question is not
// Markdown), and `\$` is a literal dollar sign.

export type MathPart = { kind: 'text'; value: string } | { kind: 'math'; value: string; display: boolean };

const OPENERS: Array<{ open: string; close: string; display: boolean }> = [
  { open: '$$', close: '$$', display: true },
  { open: '\\[', close: '\\]', display: true },
  { open: '\\(', close: '\\)', display: false },
  { open: '$', close: '$', display: false },
];

/**
 * Where `close` next appears unescaped at or after `from`, or −1. A single `$` follows the usual
 * rule that tells money from maths: no space just inside it, and no digit just after the closing one.
 */
function findClose(text: string, close: string, from: number): number {
  if (close === '$' && /\s/.test(text[from] ?? ' ')) return -1;
  for (let i = text.indexOf(close, from); i !== -1; i = text.indexOf(close, i + 1)) {
    if (close.startsWith('\\')) return i;
    if (text[i - 1] === '\\') continue;
    if (close === '$' && (text[i + 1] === '$' || /\s/.test(text[i - 1]!) || /\d/.test(text[i + 1] ?? ''))) continue;
    return i;
  }
  return -1;
}

export function splitMath(text: string): MathPart[] {
  const parts: MathPart[] = [];
  let plain = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === '\\' && text[i + 1] === '$') {
      plain += '$';
      i += 2;
      continue;
    }
    const opener = OPENERS.find((o) => text.startsWith(o.open, i));
    if (opener) {
      const start = i + opener.open.length;
      const end = findClose(text, opener.close, start);
      const body = end === -1 ? '' : text.slice(start, end);
      // An unclosed or empty `$` is just a dollar sign.
      if (end !== -1 && body.trim() && !(opener.open === '$' && body.includes('\n\n'))) {
        if (plain) parts.push({ kind: 'text', value: plain });
        plain = '';
        parts.push({ kind: 'math', value: body.trim(), display: opener.display });
        i = end + opener.close.length;
        continue;
      }
    }
    plain += text[i];
    i += 1;
  }
  if (plain) parts.push({ kind: 'text', value: plain });
  return parts;
}

export const hasMath = (text: string) => splitMath(text).some((p) => p.kind === 'math');
