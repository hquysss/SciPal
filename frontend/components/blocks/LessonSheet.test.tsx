import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LessonSheet } from './LessonSheet';

const NOTEBOOK_CSS = readFileSync(fileURLToPath(new URL('./notebook.module.css', import.meta.url)), 'utf8');

describe('LessonSheet', () => {
  it('picks squared paper from the lesson, not from any primary ancestor', () => {
    expect(renderToStaticMarkup(<LessonSheet squared>x</LessonSheet>)).toContain('data-paper="squared"');
    expect(renderToStaticMarkup(<LessonSheet squared={false}>x</LessonSheet>)).toContain('data-paper="ruled"');
    expect(NOTEBOOK_CSS).toMatch(/\.sheet\[data-paper='squared'\] \.rules/);
    expect(NOTEBOOK_CSS).not.toMatch(/data-level/);
  });

  it('keeps its surface colour (the theme paints [data-pattern="off"] with paper)', () => {
    const html = renderToStaticMarkup(<LessonSheet squared={false}>x</LessonSheet>);
    expect(html).toMatch(/^<article /);
    expect(html).not.toContain('data-pattern');
  });
});
