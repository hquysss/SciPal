import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { pageTitle, tabText } from '../lib/pageTitle';

// Browser tab titles: "SciPal" on the home and sign-in pages, "<page name> | SciPal" elsewhere, in the
// viewer's language (TabTitle picks it from the English and Vietnamese names each page declares).

const APP = join(__dirname);
const SHOWS_SCIPAL_ALONE = ['page.tsx', 'login/page.tsx'];

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === 'dev' ? [] : pages(path);
    return name === 'page.tsx' ? [path] : [];
  });
}

const namesItself = (source: string) => source.includes('pageTitle(');

describe('tab titles', () => {
  it('adds "| SciPal" after a page name and shows SciPal alone without one', () => {
    expect(readFileSync(join(APP, 'layout.tsx'), 'utf8')).toContain("title: { default: 'SciPal', template: '%s | SciPal' }");
    expect(readFileSync(join(APP, 'layout.tsx'), 'utf8')).toContain('<TabTitle />');
    expect(readFileSync(join(APP, 'page.tsx'), 'utf8')).toContain("title: { absolute: 'SciPal' }");
    expect(tabText('Bảng giá')).toBe('Bảng giá | SciPal');
    expect(tabText(null)).toBe('SciPal');
  });

  it('carries both names for the language switch', () => {
    expect(pageTitle('Pricing', 'Bảng giá')).toEqual({ title: 'Pricing', other: { 'scipal-title-en': 'Pricing', 'scipal-title-vi': 'Bảng giá' } });
  });

  it('names every other page in both languages, in the page or its own layout', () => {
    const unnamed = pages(APP)
      .filter((path) => !SHOWS_SCIPAL_ALONE.includes(relative(APP, path).split(sep).join('/')))
      .filter((path) => {
        const layout = join(dirname(path), 'layout.tsx');
        return !namesItself(readFileSync(path, 'utf8')) && !(existsSync(layout) && namesItself(readFileSync(layout, 'utf8')));
      })
      .map((path) => relative(APP, path));
    expect(unnamed).toEqual([]);
  });
});
