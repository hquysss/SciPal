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
    expect(html).toContain('không cần CH Play hay App Store');
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
});
