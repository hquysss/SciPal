import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BlockSchema } from '../block';
import { evaluateGraph, graphNames, parseGraphExpression, undeclaredNames } from '../graphExpression';
import {
  BUILT_IN_SIMULATION_KINDS,
  defaultSimulationConfig,
  embedUrl,
  isLessonMediaUrl,
  simulationConfig,
  simulationDraft,
  validateSimulationBlock,
} from '../simulations';

// Tests run from the package folder (pnpm --filter @scipal/types test).
const fixtures = JSON.parse(readFileSync('src/__fixtures__/simulations.json', 'utf8')) as {
  mediaBase: string;
  blocks: Array<{ name: string; ok: boolean; block: unknown }>;
  expressions: Array<{ source: string; names: string[]; ok: boolean }>;
};

describe('validateSimulationBlock (shared fixture table)', () => {
  it.each(fixtures.blocks.map((row) => [row.name, row] as const))('%s', (_name, row) => {
    const parsed = BlockSchema.safeParse(row.block);
    const result = parsed.success && parsed.data.type === 'interactive'
      ? validateSimulationBlock(parsed.data, { mediaBase: fixtures.mediaBase })
      : { ok: false as const, message: { en: 'not a block', vi: 'không phải khối' } };
    expect(result.ok).toBe(row.ok);
    if (!result.ok) {
      expect(result.message.vi).toBeTruthy();
      expect(result.message.en).toBeTruthy();
    }
  });
});

describe('defaults', () => {
  it('every built-in kind has a valid default', () => {
    for (const kind of BUILT_IN_SIMULATION_KINDS) {
      const block = { type: 'interactive' as const, kind, heading: { vi: 'A', en: 'A' }, offline: true, config: defaultSimulationConfig(kind) };
      expect(validateSimulationBlock(block).ok, kind).toBe(true);
    }
  });

  it('fills missing and obsolete settings from the defaults when reading a stored block', () => {
    const config = simulationConfig('algorithm-sim', { speed: 1, algorithm: 'binary-search' });
    expect(config).toMatchObject({ algorithm: 'binary-search', values: expect.any(Array) });
    expect(config).not.toHaveProperty('speed');
    expect(simulationConfig('algorithm-sim', { algorithm: 'quick-sort' })).toBeNull();
  });

  it("reads the seed lesson's older `data` key as the values", () => {
    expect(simulationConfig('algorithm-sim', { data: [4, 8, 15, 16, 23, 42], target: 23 })).toMatchObject({ values: [4, 8, 15, 16, 23, 42], target: 23 });
  });

  it('keeps what a teacher typed when the stored config does not validate yet', () => {
    const draft = simulationDraft('function-graph', { expression: 'k*x', xMin: 1, parameters: [] });
    expect(draft).toMatchObject({ expression: 'k*x', xMin: 1, parameters: [] });
    expect(draft.samples).toBe(300);
  });
});

describe('embedUrl', () => {
  it('accepts only the exact approved origins and embed paths', () => {
    expect(embedUrl('https://phet.colorado.edu/sims/html/x/latest/x_all.html')?.hostname).toBe('phet.colorado.edu');
    expect(embedUrl('https://www.geogebra.org/m/abc')).not.toBeNull();
    expect(embedUrl('https://www.desmos.com/calculator/abc')).not.toBeNull();
    for (const bad of [
      'https://phet.colorado.edu.evil.example/sims/html/x.html',
      'https://evil.example/https://www.desmos.com/calculator/x',
      'https://user:pw@www.desmos.com/calculator/x',
      'http://www.desmos.com/calculator/x',
      'https://www.desmos.com:8443/calculator/x',
      'https://www.geogebra.org/redirect?url=https://evil.example',
      'https://www.geogebra.org/m/../redirect',
      'javascript:alert(1)',
      'not a url',
    ]) {
      expect(embedUrl(bad), bad).toBeNull();
    }
  });
});

describe('isLessonMediaUrl', () => {
  const base = 'https://pub-test.r2.dev';
  it('checks the parsed origin and path, not a string prefix', () => {
    expect(isLessonMediaUrl(`${base}/t/1.png`, base)).toBe(true);
    expect(isLessonMediaUrl(`${base}/`, base)).toBe(false);
    expect(isLessonMediaUrl(`${base}/t/1.png?x=1`, base)).toBe(false);
    expect(isLessonMediaUrl('https://other.r2.dev/t/1.png', base)).toBe(false);
    expect(isLessonMediaUrl('http://pub-test.r2.dev/t/1.png', base)).toBe(false);
    expect(isLessonMediaUrl(`${base}/t/1.png`)).toBe(false);
  });
  it('cannot climb out of a base path', () => {
    const scoped = 'https://cdn.example.com/media';
    expect(isLessonMediaUrl('https://cdn.example.com/media/t/1.png', scoped)).toBe(true);
    expect(isLessonMediaUrl('https://cdn.example.com/media/../other/1.png', scoped)).toBe(false);
    expect(isLessonMediaUrl('https://cdn.example.com/media/%2e%2e/other/1.png', scoped)).toBe(false);
  });
});

describe('parseGraphExpression (shared fixture table)', () => {
  it.each(fixtures.expressions.map((row) => [row.source, row] as const))('%s', (_source, row) => {
    const result = parseGraphExpression(row.source, row.names);
    expect(result.ok).toBe(row.ok);
    if (!result.ok) {
      expect(result.error.message.vi).toBeTruthy();
      expect(result.error.at).toBeGreaterThanOrEqual(0);
    }
  });

  it('lists the names an expression uses', () => {
    const result = parseGraphExpression('a*sin(b x) + c', ['a', 'b', 'c']);
    expect(result.ok && graphNames(result.ast)).toEqual(['a', 'b', 'c']);
  });
});

describe('evaluateGraph', () => {
  const at = (source: string, x: number, params: Record<string, number> = {}) => {
    const result = parseGraphExpression(source, Object.keys(params));
    if (!result.ok) throw new Error(result.error.message.en);
    return evaluateGraph(result.ast, x, params);
  };

  it('follows the usual precedence', () => {
    expect(at('-x^2', 2)).toBe(-4);
    expect(at('2^3^2', 0)).toBe(512);
    expect(at('2x + 1', 3)).toBe(7);
    expect(at('a x + b', 2, { a: 3, b: 1 })).toBe(7);
    expect(at('1 + 2 * 3', 0)).toBe(7);
    expect(at('(1 + 2) * 3', 0)).toBe(9);
  });

  it('knows its functions and constants', () => {
    expect(at('sin(pi/2)', 0)).toBeCloseTo(1);
    expect(at('ln(e)', 0)).toBeCloseTo(1);
    expect(at('log(100)', 0)).toBeCloseTo(2);
    expect(at('sqrt(abs(x))', -9)).toBe(3);
  });

  it('returns null where the function is undefined, so the plot shows a gap', () => {
    expect(at('ln(x)', -1)).toBeNull();
    expect(at('1/x', 0)).toBeNull();
  });
});

describe('undeclaredNames', () => {
  it('lists the single-letter names an expression needs declared', () => {
    expect(undeclaredNames('m*x + k', [])).toEqual(['m', 'k']);
    expect(undeclaredNames('a sin(b x) + pi + e', ['a'])).toEqual(['b']);
    expect(undeclaredNames('exp(x)', [])).toEqual([]);
  });
});
