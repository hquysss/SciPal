import { describe, expect, it } from 'vitest';
import { highlight, type CodeLang } from './highlight';

const SAMPLES: readonly { readonly lang: CodeLang; readonly code: string }[] = [
  { lang: 'python', code: 'for i in range(n):\n  print(i)' },
  { lang: 'cpp', code: 'for (int i = 0; i < n; i++) {\n  sum += i;\n}' },
  { lang: 'javascript', code: 'for (let i = 0; i < n; i++) {\n  console.log(i);\n}' },
  { lang: 'html', code: '<a href="lesson.html">\n  Learn\n</a>' },
  { lang: 'css', code: 'h1 {\n  color: red;\n}' },
];

const texts = (code: string, lang: CodeLang) => highlight(code, lang).map((line) => line.map((token) => token.text).join(''));
const firstLine = (code: string, lang: CodeLang) => highlight(code, lang)[0] ?? [];

describe('highlight', () => {
  it('round-trips every line', () => {
    for (const sample of SAMPLES) {
      expect(texts(sample.code, sample.lang)).toEqual(sample.code.split(/\r?\n/));
    }
  });

  it('keeps blank lines and CRLF', () => {
    const code = 'first\r\n\r\n\tsecond\r\n';

    expect(highlight(code, 'python')).toHaveLength(code.split(/\r?\n/).length);
    expect(texts(code, 'python')).toEqual(['first', '', '\tsecond', '']);
  });

  it('marks Python keywords, functions, and numbers', () => {
    const tokens = firstLine('for i in range(n - 1):', 'python');

    expect(tokens).toContainEqual({ kind: 'keyword', text: 'for' });
    expect(tokens).toContainEqual({ kind: 'keyword', text: 'in' });
    expect(tokens).toContainEqual({ kind: 'function', text: 'range' });
    expect(tokens).toContainEqual({ kind: 'number', text: '1' });
  });

  it('marks C++ keywords', () => {
    expect(firstLine('for (int j = 0; j < n; j++)', 'cpp')).toContainEqual({ kind: 'keyword', text: 'int' });
  });

  it('does not turn a comment marker inside a string into a comment', () => {
    const tokens = firstLine('print("#1")  # chú thích', 'python');

    expect(tokens).toContainEqual({ kind: 'string', text: '"#1"' });
    expect(tokens).toContainEqual({ kind: 'comment', text: '# chú thích' });
  });

  it('marks HTML tags, attributes, and values', () => {
    const tokens = firstLine('<a href="x.html">', 'html');

    expect(tokens).toContainEqual({ kind: 'function', text: 'a' });
    expect(tokens).toContainEqual({ kind: 'keyword', text: 'href' });
    expect(tokens).toContainEqual({ kind: 'string', text: '"x.html"' });
  });

  it('marks CSS selectors, properties, and unit values', () => {
    const tokens = firstLine('h1 { color: red; margin: 8px }', 'css');

    expect(tokens).toContainEqual({ kind: 'function', text: 'h1' });
    expect(tokens).toContainEqual({ kind: 'keyword', text: 'color' });
    expect(tokens).toContainEqual({ kind: 'number', text: '8px' });
  });

  it('carries multiline comment state across lines', () => {
    const cpp = highlight('/* first\nsecond */ int count;', 'cpp');
    const html = highlight('<!-- first\nsecond --> <p>', 'html');
    const python = highlight('"""first\nsecond"""\nfor', 'python');

    expect(cpp[1] ?? []).toContainEqual({ kind: 'comment', text: 'second */' });
    expect(cpp[1] ?? []).toContainEqual({ kind: 'keyword', text: 'int' });
    expect(html[1] ?? []).toContainEqual({ kind: 'comment', text: 'second -->' });
    expect(html[1] ?? []).toContainEqual({ kind: 'function', text: 'p' });
    expect(python[1] ?? []).toContainEqual({ kind: 'string', text: 'second"""' });
    expect(python[2] ?? []).toContainEqual({ kind: 'keyword', text: 'for' });
  });
});
