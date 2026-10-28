import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BUILT_IN_SIMULATION_KINDS, defaultSimulationConfig } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { EmbedRenderer } from './EmbedRenderer';
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

  it('counts comparisons, and swaps only when sorting', () => {
    const { Renderer } = simulationModules['algorithm-sim']!;
    const sort = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('algorithm-sim')} lang="vi" />);
    expect(sort).toContain('So sánh');
    expect(sort).toContain('Đổi chỗ');
    const search = renderToStaticMarkup(
      <Renderer config={{ ...defaultSimulationConfig('algorithm-sim'), algorithm: 'linear-search' }} lang="vi" />,
    );
    expect(search).toContain('So sánh');
    expect(search).not.toContain('Đổi chỗ');
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
    // Readings change every frame while playing: never a live region.
    expect(html).not.toMatch(/<dl[^>]*aria-live/);
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

  it('ripple tank offers both drives and shows λ = v/f for the default settings', () => {
    const { Renderer } = simulationModules['wave-3d']!;
    const html = renderToStaticMarkup(<Renderer config={defaultSimulationConfig('wave-3d')} lang="vi" />);
    expect(html).toContain('Motor tự quay');
    expect(html).toContain('Tự quay tay');
    expect(html).toContain('0,4 m'); // λ = 0.4 m/s ÷ 1 Hz
    expect(html).toContain('λ = v·T = v/f');
    const manual = renderToStaticMarkup(<Renderer config={{ ...defaultSimulationConfig('wave-3d'), mode: 'manual' }} lang="en" />);
    expect(manual).toContain('Crank angle θ');
  });
});

describe('informatics views', () => {
  const { Renderer } = simulationModules['logic-gates']!;
  const config = defaultSimulationConfig('logic-gates');

  it('logic gates show the switches, the expression and a 4-row truth table', () => {
    const html = renderToStaticMarkup(<Renderer config={config} lang="vi" />);
    expect(html).toContain('Bảng chân lí của AND');
    expect(html).toContain('Q = A AND B = 0');
    expect(html.match(/<tr/g)).toHaveLength(5); // header + 4 rows
    expect(html).toContain('aria-pressed="false"');
    const not = renderToStaticMarkup(<Renderer config={{ ...config, gate: 'not' }} lang="vi" />);
    expect(not).toContain('Q = NOT A = 1');
    expect(not.match(/<tr/g)).toHaveLength(3);
  });

  it('logic gates add two bits and write a binary number out', () => {
    expect(renderToStaticMarkup(<Renderer config={{ ...config, mode: 'half-adder' }} lang="vi" />)).toContain('S = A XOR B = 0 · C = A AND B = 0');
    const binary = renderToStaticMarkup(<Renderer config={{ ...config, mode: 'binary' }} lang="vi" />);
    expect(binary).toContain('00001101₂ = 13₁₀');
    expect(binary).toContain('8 + 4 + 1 = 13');
    expect(binary).toContain('13 : 2 = 6 dư');
    const fixed = renderToStaticMarkup(<Renderer config={{ ...config, mode: 'binary', bits: 4, value: 20, adjustable: false }} lang="vi" />);
    expect(fixed).toContain('0100₂ = 4₁₀');
    expect(fixed).not.toContain('Chế độ');
  });
});

describe('chemistry views', () => {
  const { Renderer } = simulationModules['chemical-equilibrium']!;
  const config = defaultSimulationConfig('chemical-equilibrium');

  it('equilibrium shows the reaction, Kc and every control the reaction allows, in Vietnamese', () => {
    const html = renderToStaticMarkup(<Renderer config={config} lang="vi" />);
    expect(html).toContain('2NO₂ (g) ⇌ N₂O₄ (g)');
    expect(html).toContain('Thêm NO₂');
    expect(html).toContain('Nén (giảm thể tích)');
    expect(html).toContain('Đun nóng (+25 °C)');
    expect(html).toContain('L/mol');
    // NO₂ ⇌ N₂O₄ needs no catalyst control.
    expect(html).not.toContain('Thêm chất xúc tác');
  });

  it('equilibrium hides what the reaction or the teacher turned off', () => {
    const solution = renderToStaticMarkup(<Renderer config={{ ...config, reaction: 'fescn' }} lang="vi" />);
    expect(solution).toContain('Thêm SCN⁻');
    expect(solution).not.toContain('Nén (giảm thể tích)');
    expect(solution).not.toContain('Đun nóng');
    const locked = renderToStaticMarkup(<Renderer config={{ ...config, reaction: 'haber', adjustable: false, controls: { concentration: false, pressure: true, temperature: false, catalyst: true } }} lang="vi" />);
    expect(locked).toContain('Thêm chất xúc tác');
    expect(locked).not.toContain('Thêm NH₃');
    expect(locked).not.toContain('Đun nóng');
    expect(locked).not.toContain('Phản ứng</label>');
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
    // Keyboard and screen-reader users answer with numbered points instead of a click.
    expect(quiz.match(/aria-label="Điểm \d"/g)).toHaveLength(2);
  });

  it('diagram editor offers the upload and lists the labels', () => {
    const { Editor } = simulationModules['labeled-diagram']!;
    const empty = renderToStaticMarkup(<Editor config={defaultSimulationConfig('labeled-diagram')} onChange={() => {}} lang="vi" />);
    expect(empty).toContain('Kéo ảnh vào đây');
    const filled = renderToStaticMarkup(<Editor config={{ ...defaultSimulationConfig('labeled-diagram'), image_url: image, labels }} onChange={() => {}} lang="vi" />);
    expect(filled).toContain('value="Nhân"');
    expect(filled).toContain('Chạm lên ảnh để thêm nhãn');
    expect(filled).toContain('Thêm nhãn');
  });
});

describe('Sketchfab embed', () => {
  const uid = '0123456789abcdef0123456789abcdef';
  it('frames the embed page when given a share link, and refuses other sketchfab paths', () => {
    const html = renderToStaticMarkup(<EmbedRenderer url={`https://sketchfab.com/3d-models/knee-joint-${uid}`} title="Knee" lang="en" />);
    expect(html).toContain(`src="https://sketchfab.com/models/${uid}/embed"`);
    expect(html).toContain('sandbox="allow-scripts allow-same-origin"');
    const refused = renderToStaticMarkup(<EmbedRenderer url="https://sketchfab.com/settings" title="x" lang="en" />);
    expect(refused).not.toContain('<iframe');
  });
});
