import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BUILT_IN_SIMULATION_KINDS } from '@scipal/types';
import { LAB_ITEMS, LAB_SUBJECTS, labItem } from './catalog';
import { usagesOf } from './labQuery';
import { LabIndex } from './LabIndex';
import { embedTitle, readEmbeds } from './LabEmbeds';

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));

describe('the Lab catalogue', () => {
  it('lists only built-in simulations, once each, with every Lab subject filled', () => {
    const kinds = LAB_ITEMS.map((i) => i.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) expect(BUILT_IN_SIMULATION_KINDS).toContain(kind);
    for (const s of LAB_SUBJECTS) expect(LAB_ITEMS.some((i) => i.subject === s.slug)).toBe(true);
  });

  it('has a chemistry experiment and leaves biology templates out', () => {
    expect(labItem('titration')?.subject).toBe('chemistry');
    expect(labItem('punnett')).toBeNull();
    expect(labItem('nope')).toBeNull();
  });
});

describe('usagesOf', () => {
  it('links every interactive block to its lesson, lowest grade first, and skips the rest', () => {
    const rows = [
      {
        slug: 'chuan-do',
        title_en: 'Titration',
        title_vi: 'Chuẩn độ',
        grade: 11,
        subjects: [{ slug: 'chemistry' }],
        blocks: [{ type: 'text' }, { type: 'interactive', kind: 'titration', heading: { vi: 'Chuẩn độ HCl', en: 'HCl' } }],
      },
      { slug: 'ham-so', title_en: 'Functions', title_vi: 'Hàm số', grade: 10, subjects: { slug: 'math' }, blocks: [{ type: 'interactive', kind: 'function-graph' }] },
      { slug: 'broken', title_en: 'x', title_vi: 'x', grade: 12, subjects: { slug: 'math' }, blocks: 'not an array' },
    ];
    expect(usagesOf(rows)).toEqual([
      { kind: 'function-graph', heading: { en: '', vi: '' }, lesson: { en: 'Functions', vi: 'Hàm số' }, href: '/math/ham-so', grade: 10 },
      { kind: 'titration', heading: { vi: 'Chuẩn độ HCl', en: 'HCl' }, lesson: { en: 'Titration', vi: 'Chuẩn độ' }, href: '/chemistry/chuan-do', grade: 11 },
    ]);
  });
});

describe('LabIndex', () => {
  it('links to every simulation and says how many lessons use it', () => {
    const html = renderToStaticMarkup(<LabIndex counts={{ titration: 2 }} />);
    for (const item of LAB_ITEMS) expect(html).toContain(`href="/lab/${item.kind}"`);
    expect(html).toContain('Có trong 2 bài học');
    expect(html).toContain('Chưa có trong bài học');
  });

  it('stays quiet about lessons when they could not be loaded', () => {
    const html = renderToStaticMarkup(<LabIndex counts={null} />);
    expect(html).not.toContain('bài học</span>');
    expect(html).not.toContain('Chưa có trong bài học');
  });
});

describe('LabEmbeds', () => {
  const phet = 'https://phet.colorado.edu/sims/html/projectile-motion/latest/projectile-motion_all.html';

  it('keeps only approved embeds from storage, each in its subject', () => {
    const stored = [{ url: phet, subject: 'physics' }, { url: 'https://evil.test/x', subject: 'math' }, { url: 'https://www.geogebra.org/m/abc123', subject: 'nonsense' }, 5, 'not a url'];
    expect(readEmbeds(JSON.stringify(stored))).toEqual([
      { url: phet, subject: 'physics' },
      { url: 'https://www.geogebra.org/m/abc123', subject: 'math' },
    ]);
    expect(readEmbeds('{broken')).toEqual([]);
    expect(readEmbeds(null)).toEqual([]);
  });

  it('files links saved as plain strings by their site, and drops repeats', () => {
    expect(readEmbeds(JSON.stringify([phet, 'https://www.desmos.com/calculator/abc', phet]))).toEqual([
      { url: phet, subject: 'physics' },
      { url: 'https://www.desmos.com/calculator/abc', subject: 'math' },
    ]);
  });

  it('titles a link by its site and sim name', () => {
    expect(embedTitle(new URL(phet))).toBe('phet.colorado.edu · projectile motion all');
  });

  it('puts the add form on the Lab page with a subject choice', () => {
    const html = renderToStaticMarkup(<LabIndex counts={null} />);
    expect(html).toContain('Thêm mô phỏng ngoài vào một môn');
    expect(html).toContain('type="url"');
  });
});
