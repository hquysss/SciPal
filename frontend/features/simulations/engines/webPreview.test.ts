import { describe, expect, it } from 'vitest';
import { annotateHtml, cssRules, webSteps } from './webPreview';

describe('annotateHtml', () => {
  it('marks every opening tag with the line it starts on', () => {
    const { html, lines } = annotateHtml('<ul>\n  <li>a</li>\n  <li>b</li>\n</ul>');
    expect(lines).toEqual([1, 2, 3]);
    expect(html).toContain('<ul data-sp-line="1">');
    expect(html).toContain('<li data-sp-line="3">b</li>');
  });

  it('multiline attributes: the tag belongs to the line holding "<"', () => {
    const { html, lines } = annotateHtml('<p>x</p>\n<img\n  src="a.png"\n  alt="x > y">');
    expect(lines).toEqual([1, 2]);
    expect(html).toContain('<img data-sp-line="2"\n  src="a.png"');
  });

  it('ignores comments and closing tags', () => {
    const { lines } = annotateHtml('<!-- <p> -->\n<h1>t</h1>');
    expect(lines).toEqual([2]);
  });

  it('drops scripts and on* handlers', () => {
    const { html } = annotateHtml('<button onclick="boom()" class="b">go</button>\n<script>alert(1)</script>');
    expect(html).not.toMatch(/onclick|<script|alert/);
    expect(html).toContain('class="b"');
  });
});

describe('cssRules', () => {
  it('gives each rule the line of its selector; @media is one rule', () => {
    const rules = cssRules('h1, p {\n color: red }\n@media (max-width: 600px) { p { margin: 0 } }');
    expect(rules.map((r) => [r.line, r.selector])).toEqual([[1, 'h1, p'], [3, '@media (max-width: 600px)']]);
    expect(rules[0]!.text).toBe('h1, p {\n color: red }');
  });

  it('skips comments', () => {
    expect(cssRules('/* a { b } */\np { margin: 0 }').map((r) => r.selector)).toEqual(['p']);
  });
});

describe('webSteps', () => {
  it('lists HTML lines first, then CSS rules', () => {
    const steps = webSteps('<h1>a</h1>\n<p>b</p>', 'p { color: red }');
    expect(steps).toEqual([
      { panel: 'html', line: 1, select: '[data-sp-line="1"]' },
      { panel: 'html', line: 2, select: '[data-sp-line="2"]' },
      { panel: 'css', line: 1, select: 'p' },
    ]);
  });
});
