// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSimulationConfig } from '@scipal/types';
import { BeforeAfterView, beforeAfterModule } from './beforeAfter';

vi.mock('@/features/authoring/editor/editors/ImageEditor', () => ({ ImageDropZone: () => null }));

const picture = (image_url: string, label: string) => ({
  image_url,
  label: { vi: label, en: label },
  alt: { vi: `Ảnh ${label}`, en: `Picture ${label}` },
  caption: { vi: `Bãi cọc ${label}`, en: `Stakes ${label}` },
  source: { vi: `Nguồn ${label}`, en: `Source ${label}` },
});
const pair = { before: picture('https://media.example/t/1288.jpg', '1288'), after: picture('https://media.example/t/nay.jpg', 'Ngày nay') };

afterEach(cleanup);

describe('the then-and-now comparison', () => {
  it('asks for pictures until both are there', () => {
    const html = renderToStaticMarkup(<BeforeAfterView config={defaultSimulationConfig('before-after')} lang="vi" />);
    expect(html).toContain('Chưa có ảnh');
    expect(html).not.toContain('type="range"');
  });

  it('stacks both pictures with their labels, captions and sources', () => {
    const html = renderToStaticMarkup(<BeforeAfterView config={pair} lang="vi" />);
    expect(html).toContain('alt="Ảnh 1288"');
    expect(html).toContain('alt="Ảnh Ngày nay"');
    expect(html).toContain('clip-path:inset(0 50% 0 0)');
    expect(html).toContain('Nguồn: Nguồn 1288');
    expect(html).toContain('Ngày nay: Bãi cọc Ngày nay');
  });

  it('moves the divider with the slider and the shortcut buttons', () => {
    const { container } = render(<BeforeAfterView config={pair} lang="vi" />);
    const slider = screen.getByRole('slider', { name: 'So sánh 1288 và Ngày nay' });
    const then = () => (container.querySelectorAll('img')[1] as HTMLImageElement).style.clipPath;
    fireEvent.change(slider, { target: { value: '80' } });
    expect(then()).toBe('inset(0 20% 0 0)');
    expect(slider.getAttribute('aria-valuetext')).toBe('80% ảnh 1288, 20% ảnh Ngày nay');
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ ảnh Ngày nay' }));
    expect(then()).toBe('inset(0 100% 0 0)');
    fireEvent.click(screen.getByRole('button', { name: 'Chỉ ảnh 1288' }));
    expect(then()).toBe('inset(0 0% 0 0)');
  });

  it('says it cannot load a broken picture', () => {
    const { container } = render(<BeforeAfterView config={pair} lang="vi" />);
    fireEvent.error(container.querySelector('img')!);
    expect(screen.getByRole('note').textContent).toContain('Không tải được ảnh');
  });

  it('asks the teacher for a source before passing a picture on', () => {
    const onChange = vi.fn();
    const { Editor } = beforeAfterModule;
    render(<Editor config={defaultSimulationConfig('before-after')} onChange={onChange} lang="vi" />);
    const box = screen.getByLabelText('Dữ liệu (JSON)');
    const unsourced = { ...pair, after: { ...pair.after, source: { vi: '', en: '' } } };
    fireEvent.change(box, { target: { value: JSON.stringify(unsourced) } });
    expect(screen.getByRole('alert').textContent).toContain('after.source.vi: cần ghi nguồn ảnh.');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(box, { target: { value: JSON.stringify(pair) } });
    expect(onChange).toHaveBeenCalledWith(pair);
  });
});
