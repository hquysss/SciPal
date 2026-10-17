import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BUILT_IN_SIMULATION_KINDS, defaultSimulationConfig } from '@scipal/types';
import { LAB_ITEMS, LAB_SUBJECTS, labItem, labVariants } from './catalog';
import { usagesOf } from './labQuery';
import { LabIndex } from './LabIndex';
import { embedHref, embedTitle, readEmbeds } from './LabEmbeds';
import { LabEmbedView } from './LabEmbedView';

vi.mock('next/headers', () => ({ cookies: async () => ({ getAll: () => [] }) }));

describe('the Lab catalogue', () => {
  it('offers native 3D harmonic motion in the physics lab', () => {
    expect(labItem('harmonic-3d')?.subject).toBe('physics');
  });
  it('offers the damped pendulum in the physics lab', () => {
    expect(labItem('damped-pendulum')?.subject).toBe('physics');
  });
  it('offers the 3D ripple tank in the physics lab', () => {
    expect(labItem('wave-3d')?.subject).toBe('physics');
  });
  it('lists only built-in simulations, once each, with every Lab subject filled', () => {
    const kinds = LAB_ITEMS.map((i) => i.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) expect(BUILT_IN_SIMULATION_KINDS).toContain(kind);
    for (const s of LAB_SUBJECTS) expect(LAB_ITEMS.some((i) => i.subject === s.slug)).toBe(true);
  });

  it('has a chemistry experiment and the knee reflex in biology, and leaves the other biology templates out', () => {
    expect(labItem('titration')?.subject).toBe('chemistry');
    expect(labItem('knee-reflex')?.subject).toBe('biology');
    expect(labItem('circulation-3d')?.subject).toBe('biology');
    expect(labItem('skin-senses')?.subject).toBe('biology');
    expect(labItem('punnett')).toBeNull();
    expect(labItem('nope')).toBeNull();
  });

  it('files the history maps and the complexity simulation under their subjects', () => {
    expect(labItem('history-world')?.subject).toBe('history');
    expect(labItem('history-map')?.subject).toBe('history');
    expect(labItem('complexity-sim')?.subject).toBe('informatics');
  });
});

describe('labVariants', () => {
  const usage = (config: unknown, vi: string) => ({ kind: 'history-map', heading: { en: '', vi }, lesson: { en: 'L', vi: 'Bài' }, href: '/history/x', grade: 11, config });

  it('offers both built-in world maps', () => {
    expect(labVariants(labItem('history-world')!, null).map((v) => v.config)).toEqual([{ map: 'empires-1914' }, { map: 'latin-america' }]);
  });

  it('offers every campaign map a published lesson has, named by its heading, skipping broken ones', () => {
    const variants = labVariants(labItem('history-map')!, [usage(defaultSimulationConfig('history-map'), 'Khởi nghĩa Lam Sơn'), usage({ steps: 'broken' }, 'Hỏng')]);
    expect(variants.map((v) => v.name.vi)).toEqual(['Khởi nghĩa Lam Sơn']);
    expect(labVariants(labItem('history-map')!, null)).toEqual([]);
  });

  it('names a map in English even when its heading was written in Vietnamese only', () => {
    const [variant] = labVariants(labItem('history-map')!, [{ ...usage(defaultSimulationConfig('history-map'), 'Khởi nghĩa Lam Sơn'), lesson: { en: 'Lam Son', vi: 'Bài' } }]);
    expect(variant!.name).toEqual({ en: 'Lam Son', vi: 'Khởi nghĩa Lam Sơn' });
  });

  it('gives every other simulation its default settings', () => {
    expect(labVariants(labItem('titration')!, null)).toEqual([{ id: 'default', name: labItem('titration')!.name, config: defaultSimulationConfig('titration') }]);
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
        blocks: [{ type: 'text' }, { type: 'interactive', kind: 'titration', heading: { vi: 'Chuẩn độ HCl', en: 'HCl' }, config: { acid: 1 } }],
      },
      { slug: 'ham-so', title_en: 'Functions', title_vi: 'Hàm số', grade: 10, subjects: { slug: 'math' }, blocks: [{ type: 'interactive', kind: 'function-graph' }] },
      { slug: 'broken', title_en: 'x', title_vi: 'x', grade: 12, subjects: { slug: 'math' }, blocks: 'not an array' },
    ];
    expect(usagesOf(rows)).toEqual([
      { kind: 'function-graph', heading: { en: '', vi: '' }, lesson: { en: 'Functions', vi: 'Hàm số' }, href: '/math/ham-so', grade: 10, config: {} },
      { kind: 'titration', heading: { vi: 'Chuẩn độ HCl', en: 'HCl' }, lesson: { en: 'Titration', vi: 'Chuẩn độ' }, href: '/chemistry/chuan-do', grade: 11, config: { acid: 1 } },
    ]);
  });
});

describe('LabIndex', () => {
  it('links to every simulation and says how many lessons use it', () => {
    const html = renderToStaticMarkup(<LabIndex counts={{ titration: 2 }} />);
    for (const item of LAB_ITEMS) expect(html).toContain(`href="/lab/${item.kind}"`);
    expect(html).toContain('Có trong 2 bài học');
    expect(html).toContain('Chưa có trong bài học');
    expect(html).toContain('>Mô phỏng</h1>');
    expect(html).toContain('Lịch sử');
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

  it('opens a card on its own page, and never frames a link that is not approved', () => {
    const href = embedHref({ url: phet, subject: 'physics' });
    expect(href).toBe(`/lab/embed?u=${encodeURIComponent(phet)}&s=physics`);
    const ok = renderToStaticMarkup(<LabEmbedView link={phet} subject="physics" />);
    expect(ok).toContain('<iframe');
    expect(ok).toContain('Vật lí');
    const bad = renderToStaticMarkup(<LabEmbedView link="https://evil.test/x" subject="math" />);
    expect(bad).not.toContain('<iframe');
    expect(bad).toContain('không được phép nhúng');
  });
});
