import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultSimulationConfig, type BuiltInSimulationKind } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { simulationModules } from './registry';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const KINDS_SO_FAR: BuiltInSimulationKind[] = ['algorithm-sim', 'function-graph', 'probability'];

describe.each(KINDS_SO_FAR)('%s', (kind) => {
  const module = simulationModules[kind]!;
  const config = defaultSimulationConfig(kind);

  it('renders for learners in both languages with theme tokens only', () => {
    for (const lang of ['vi', 'en'] as const) {
      const html = renderToStaticMarkup(<module.Renderer config={config as never} lang={lang} />);
      expect(html.length).toBeGreaterThan(50);
      expect(countRawColors(html).total).toBe(0);
    }
  });

  it('gives teachers labelled controls', () => {
    const html = renderToStaticMarkup(<module.Editor config={config as never} onChange={() => {}} lang="vi" />);
    expect(html).toMatch(/<label/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('has a bilingual name', () => {
    expect(module.label.vi && module.label.en).toBeTruthy();
  });
});

describe('algorithm view', () => {
  it('shows the first step with step controls', () => {
    const { Renderer } = simulationModules['algorithm-sim']!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('algorithm-sim')} lang="vi" />);
    expect(html).toContain('aria-label="Bước tiếp"');
    expect(html).toContain('aria-label="Bước trước"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Bước 1/');
  });
});

describe('function graph view', () => {
  it('draws the curve and a slider per parameter', () => {
    const { Renderer } = simulationModules['function-graph']!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('function-graph')} lang="en" />);
    expect(html).toContain('<svg');
    expect(html).toContain('<polyline');
    expect(html.match(/type="range"/g)).toHaveLength(2);
  });

  it('explains a broken expression in the editor', () => {
    const { Editor } = simulationModules['function-graph']!;
    const html = renderToStaticMarkup(<Editor config={{ ...defaultSimulationConfig('function-graph'), expression: '2*(x+' }} onChange={() => {}} lang="vi" />);
    expect(html).toContain('Biểu thức bị thiếu ở cuối');
  });
});

describe('probability view', () => {
  it('offers batches of 1, 10, 100 and 1000 throws and the theoretical probability', () => {
    const { Renderer } = simulationModules.probability!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('probability')} lang="vi" />);
    for (const n of ['1', '10', '100', '1000']) expect(html).toContain(`Tung ${n} lần`);
    expect(html).toContain('1/6');
  });
});
