import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { InstallActionView, InstallAppSection } from './InstallAppSection';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const noop = () => {};

describe('install section', () => {
  it('sells the app without a store and starts with the menu steps before the browser speaks', () => {
    const html = renderToStaticMarkup(<InstallAppSection />);
    expect(html).toContain('id="tai-ung-dung"');
    expect(html).toContain('Mang SciPal theo bên mình');
    expect(html).toContain('cài thẳng từ trình duyệt');
    expect(html).toContain('vẫn đọc được khi mất mạng');
    expect(html).toContain('Mở menu của trình duyệt');
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
});
