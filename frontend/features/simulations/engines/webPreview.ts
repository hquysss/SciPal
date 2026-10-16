// Splits a lesson's HTML and CSS into the steps the web-preview simulation plays. Pure string work
// (no DOMParser) so it runs the same in tests and in the browser.

export interface WebStep {
  panel: 'html' | 'css';
  line: number;
  select: string;
}

export interface CssRule {
  line: number;
  selector: string;
  text: string;
}

const lineAt = (source: string, index: number) => source.slice(0, index).split('\n').length;

/** Walks the HTML once: copies it to `html` while stamping opening tags and removing scripts and on* handlers. */
export function annotateHtml(source: string): { html: string; lines: number[] } {
  const lines: number[] = [];
  let html = '';
  let i = 0;
  while (i < source.length) {
    if (source.startsWith('<!--', i)) {
      const end = source.indexOf('-->', i + 4);
      const stop = end < 0 ? source.length : end + 3;
      html += source.slice(i, stop);
      i = stop;
      continue;
    }
    if (source[i] !== '<' || !/[A-Za-z/]/.test(source[i + 1] ?? '')) {
      html += source[i];
      i += 1;
      continue;
    }
    let j = i + 1;
    let quote = '';
    while (j < source.length) {
      const c = source[j]!;
      if (quote) {
        if (c === quote) quote = '';
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '>') {
        break;
      }
      j += 1;
    }
    const tag = source.slice(i, j + 1);
    const name = /^<\/?([A-Za-z][\w-]*)/.exec(tag)?.[1]?.toLowerCase() ?? '';
    if (tag.startsWith('</') || name === '') {
      html += tag;
    } else if (name === 'script') {
      const close = source.toLowerCase().indexOf('</script', j);
      const closeEnd = close < 0 ? source.length : source.indexOf('>', close) + 1 || source.length;
      j = closeEnd - 1;
    } else {
      const clean = tag.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      lines.push(lineAt(source, i));
      html += clean.replace(/^<([A-Za-z][\w-]*)/, `<$1 data-sp-line="${lineAt(source, i)}"`);
      if (name === 'style') {
        const close = source.toLowerCase().indexOf('</style', j);
        const stop = close < 0 ? source.length : close;
        html += source.slice(j + 1, stop);
        j = stop - 1;
      }
    }
    i = j + 1;
  }
  return { html, lines: [...new Set(lines)] };
}

/** Top-level CSS rules; an @media block is one rule. */
export function cssRules(source: string): CssRule[] {
  const rules: CssRule[] = [];
  let i = 0;
  while (i < source.length) {
    if (source.startsWith('/*', i)) {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (/\s/.test(source[i]!)) {
      i += 1;
      continue;
    }
    const open = source.indexOf('{', i);
    if (open < 0) break;
    let depth = 0;
    let j = open;
    for (; j < source.length; j += 1) {
      if (source[j] === '{') depth += 1;
      else if (source[j] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const selector = source.slice(i, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    rules.push({ line: lineAt(source, i), selector, text: source.slice(i, j + 1) });
    i = j + 1;
  }
  return rules;
}

/** HTML lines first (the page grows), then the CSS rules (the styling lands on it). */
export function webSteps(html: string, css: string): WebStep[] {
  return [
    ...annotateHtml(html).lines.map((line): WebStep => ({ panel: 'html', line, select: `[data-sp-line="${line}"]` })),
    ...cssRules(css).map((r): WebStep => ({ panel: 'css', line: r.line, select: r.selector })),
  ];
}
