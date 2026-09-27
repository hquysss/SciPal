import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { defaultSimulationConfig, type InteractiveBlock } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { newSimulationBlock, SimulationEditor } from './SimulationEditor';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));
vi.mock('@scipal/supabase', () => ({ createBrowserClient: () => ({}) }));

const render = (block: InteractiveBlock) =>
  renderToStaticMarkup(<SimulationEditor block={block} onChange={() => {}} lang="vi" onLangChange={() => {}} />);

describe('newSimulationBlock', () => {
  it('starts a built-in template offline with its defaults and bilingual heading', () => {
    expect(newSimulationBlock('motion')).toEqual({
      type: 'interactive',
      kind: 'motion',
      heading: { vi: 'Chuyển động', en: 'Motion' },
      offline: true,
      config: defaultSimulationConfig('motion'),
    });
  });

  it('starts an embed online, without settings', () => {
    expect(newSimulationBlock('embed')).toMatchObject({ kind: 'embed', offline: false, config: {} });
  });
});

describe('SimulationEditor', () => {
  it('edits the heading and the template settings', () => {
    const html = render(newSimulationBlock('pendulum'));
    expect(html).toContain('Tiêu đề');
    expect(html).toContain('Chiều dài L');
    expect(countRawColors(html).total).toBe(0);
  });

  it('explains which links can be embedded', () => {
    const html = render({ ...newSimulationBlock('embed'), embed_url: 'https://evil.example/x' });
    expect(html).toContain('PhET');
    expect(html).toContain('aria-invalid="true"');
  });

  it('keeps older kinds read-only', () => {
    const html = render({ type: 'interactive', kind: 'bio-diagram', heading: { vi: 'Sơ đồ', en: '' }, offline: true, config: {} });
    expect(html).toContain('mẫu cũ');
  });

  it('keeps settings that do not validate yet and says what to fix, instead of showing defaults', () => {
    const html = render({ type: 'interactive', kind: 'function-graph', heading: { vi: 'Đồ thị', en: 'Graph' }, offline: true, config: { expression: 'm*x + k', parameters: [] } });
    expect(html).toContain('value="m*x + k"');
    expect(html).toContain('Thêm tham số m');
    expect(html).toContain('Thêm tham số k');
    expect(html).toContain('role="alert"');
  });

  it('does not let a teacher remove a parameter the expression still uses', () => {
    const html = render(newSimulationBlock('function-graph'));
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>).)*Bỏ tham số a/s);
  });
});
