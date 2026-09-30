import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OfflineBannerView } from './OfflineBanner';
import { SaveOfflineView } from '@/features/lessons/SaveOfflineButton';

vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ lang: 'vi', t: (o: { vi: string }) => o.vi }) }));

const noop = () => {};

describe('offline banner', () => {
  it('shows only while offline, and says what still works', () => {
    expect(renderToStaticMarkup(<OfflineBannerView online />)).toBe('');
    const html = renderToStaticMarkup(<OfflineBannerView online={false} />);
    expect(html).toContain('role="status"');
    expect(html).toContain('Bạn đang offline');
    expect(html).toContain('Giáo sư SciPal, thi thử và thanh toán cần có mạng');
  });
});

describe('save a subject for offline', () => {
  it('offers the lesson count, shows progress, then the result', () => {
    expect(renderToStaticMarkup(<SaveOfflineView state={{ kind: 'idle' }} count={12} online onSave={noop} />)).toContain('Tải 12 bài để học offline');
    const saving = renderToStaticMarkup(<SaveOfflineView state={{ kind: 'saving', done: 3, total: 12 }} count={12} online onSave={noop} />);
    expect(saving).toContain('Đang lưu 3/12…');
    expect(saving).toMatch(/<button[^>]*disabled=""/);
    expect(renderToStaticMarkup(<SaveOfflineView state={{ kind: 'done', saved: 12, failed: 0 }} count={12} online onSave={noop} />)).toContain('Đã lưu 12 bài để học offline.');
    expect(renderToStaticMarkup(<SaveOfflineView state={{ kind: 'done', saved: 10, failed: 2 }} count={12} online onSave={noop} />)).toContain('2 bài chưa lưu được');
  });

  it('cannot start without a connection', () => {
    expect(renderToStaticMarkup(<SaveOfflineView state={{ kind: 'idle' }} count={12} online={false} onSave={noop} />)).toMatch(/<button[^>]*disabled=""/);
  });
});
