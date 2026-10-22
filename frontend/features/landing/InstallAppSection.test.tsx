import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { InstallActionView, InstallAppSection } from './InstallAppSection';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const noop = () => {};

describe('install section', () => {
  it('sells the app without a store and shows no menu steps before the browser speaks', () => {
    const html = renderToStaticMarkup(<InstallAppSection />);
    expect(html).toContain('id="tai-ung-dung"');
    expect(html).toContain('Mang SciPal theo bên mình');
    expect(html).toContain('cài thẳng từ trình duyệt');
    expect(html).toContain('vẫn đọc được khi mất mạng');
    expect(html).not.toContain('Mở menu của trình duyệt');
    expect(html).toContain('Tải SciPal về máy');
    expect(countRawColors(html).total).toBe(0);
  });

  it('shows the one-tap button, the iPhone steps, or that it is installed', () => {
    expect(renderToStaticMarkup(<InstallActionView mode="prompt" onInstall={noop} />)).toContain('Tải SciPal về máy');
    const ios = renderToStaticMarkup(<InstallActionView mode="ios" onInstall={noop} />);
    expect(ios).toContain('bấm nút Chia sẻ');
    expect(ios).toContain('Thêm vào MH chính');
    const done = renderToStaticMarkup(<InstallActionView mode="installed" onInstall={noop} />);
    expect(done).toContain('SciPal đã có trên máy này');
    expect(done).toContain('role="status"');
  });

  it('offers the Microsoft Store on Windows once SciPal is listed there', () => {
    const store = 'https://apps.microsoft.com/detail/9ABCDEF12345';
    const html = renderToStaticMarkup(<InstallActionView mode="prompt" onInstall={noop} storeUrl={store} />);
    expect(html).toContain(`href="${store}"`);
    expect(html).toContain('Tải từ Microsoft Store');
    expect(html).toContain('Tải SciPal về máy');
    expect(renderToStaticMarkup(<InstallActionView mode="prompt" onInstall={noop} storeUrl={null} />)).not.toContain('Microsoft Store');
    expect(renderToStaticMarkup(<InstallActionView mode="installed" onInstall={noop} storeUrl={store} />)).not.toContain('Microsoft Store');
  });

  it('lets visitors choose phone or Windows once the Store link exists', () => {
    const html = renderToStaticMarkup(<InstallAppSection />);
    expect(html).toContain('Điện thoại');
    expect(html).toContain('Windows');
    expect(html).toContain('aria-pressed="true"');
  });

  it('gives Windows only the Store button, with no steps and no browser install', () => {
    const store = 'https://apps.microsoft.com/detail/9ABCDEF12345';
    for (const mode of ['manual', 'prompt'] as const) {
      const html = renderToStaticMarkup(<InstallActionView mode={mode} onInstall={noop} storeUrl={store} desktop />);
      expect(html).toContain(`href="${store}"`);
      expect(html).not.toContain('<details');
      expect(html).not.toContain('Tải SciPal về máy');
      expect(html).not.toContain('màn hình chính');
    }
  });
});

describe('install button without a browser prompt', () => {
  it('shows the Share steps on iPhone, where a page cannot open an install prompt', () => {
    const html = renderToStaticMarkup(<InstallActionView mode="ios" onInstall={noop} />);
    expect(html).toContain('<details');
    expect(html).toContain('Tải SciPal về máy');
    expect(html).toContain('màn hình chính');
    expect(renderToStaticMarkup(<InstallActionView mode="installed" onInstall={noop} />)).not.toContain('<summary');
  });

  it('is a plain button on other phones, with no steps', () => {
    const html = renderToStaticMarkup(<InstallActionView mode="manual" onInstall={noop} />);
    expect(html).toContain('<button');
    expect(html).toContain('Tải SciPal về máy');
    expect(html).not.toContain('<details');
    expect(html).not.toContain('Mở menu của trình duyệt');
  });
});
