import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_SIMULATION_KINDS, defaultSimulationConfig } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { simulationModules } from './registry';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

describe.each(BUILT_IN_SIMULATION_KINDS)('%s', (kind) => {
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

describe('physics views', () => {
  it('motion shows the path, a time slider and the readings with units', () => {
    const { Renderer } = simulationModules.motion!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('motion')} lang="vi" />);
    expect(html).toContain('<path');
    expect(html).toContain('type="range"');
    expect(html).toContain('m/s');
    expect(html).toContain('aria-label="Chạy"');
  });

  it('pendulum shows the period formula and value', () => {
    const { Renderer } = simulationModules.pendulum!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('pendulum')} lang="vi" />);
    expect(html).toContain('T = 2π√(L/g)');
    expect(html).toContain('2.01 s');
  });

  it('circuit lists each resistor with its voltage and current', () => {
    const { Renderer } = simulationModules['ohm-circuit']!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('ohm-circuit')} lang="en" />);
    expect(html).toContain('R1');
    expect(html).toContain('R2');
    expect(html).toContain('1.00 A');
    expect(html).toContain('I = U / R');
  });
});

describe('biology views', () => {
  const image = 'https://proj.supabase.co/storage/v1/object/public/lesson-media/t/cell.png';
  const labels = [
    { id: 'a', x: 0.2, y: 0.3, text: { vi: 'Nhân', en: 'Nucleus' } },
    { id: 'b', x: 0.7, y: 0.6, text: { vi: 'Màng', en: 'Membrane' } },
  ];

  it('Punnett square shows the offspring and the ratios', () => {
    const { Renderer } = simulationModules.punnett!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('punnett')} lang="vi" />);
    expect(html).toContain('<table');
    expect(html).toContain('<th scope="col"');
    expect(html).toContain('>AA<');
    expect(html).toContain('3 : 1');
    expect(html).toContain('Hạt vàng');
  });

  it('diagram without an image says so in both languages', () => {
    const { Renderer } = simulationModules['labeled-diagram']!;
    expect(renderToStaticMarkup(<Renderer config={defaultSimulationConfig('labeled-diagram')} lang="vi" />)).toContain('Chưa có ảnh');
    expect(renderToStaticMarkup(<Renderer config={defaultSimulationConfig('labeled-diagram')} lang="en" />)).toContain('No image yet');
  });

  it('diagram places labels as buttons in explore mode and asks in quiz mode', () => {
    const { Renderer } = simulationModules['labeled-diagram']!;
    const explore = renderToStaticMarkup(<Renderer config={{ ...defaultSimulationConfig('labeled-diagram'), image_url: image, labels }} lang="vi" />);
    expect(explore).toContain('left:20%;top:30%');
    expect(explore).toContain('Nhân');
    expect(explore).toContain('Hiện tất cả nhãn');
    const quiz = renderToStaticMarkup(<Renderer config={{ ...defaultSimulationConfig('labeled-diagram'), image_url: image, labels, mode: 'quiz' }} lang="vi" />);
    expect(quiz).toContain('Chỉ vào');
    expect(quiz).not.toContain('>Màng<');
  });

  it('diagram editor offers the upload and lists the labels', () => {
    const { Editor } = simulationModules['labeled-diagram']!;
    const empty = renderToStaticMarkup(<Editor config={defaultSimulationConfig('labeled-diagram')} onChange={() => {}} lang="vi" />);
    expect(empty).toContain('Kéo ảnh vào đây');
    const filled = renderToStaticMarkup(<Editor config={{ ...defaultSimulationConfig('labeled-diagram'), image_url: image, labels }} onChange={() => {}} lang="vi" />);
    expect(filled).toContain('value="Nhân"');
    expect(filled).toContain('Bấm lên ảnh để thêm nhãn');
  });
});
