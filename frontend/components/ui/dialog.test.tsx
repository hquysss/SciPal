import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Dialog, wrapFocusIndex } from './dialog';

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    expect(renderToStaticMarkup(<Dialog open={false} onClose={() => {}} title="Tạo lớp" closeLabel="Đóng">x</Dialog>)).toBe('');
  });

  it('is a labelled modal dialog with a close button and tokens only', () => {
    const html = renderToStaticMarkup(
      <Dialog open onClose={() => {}} title="Tạo lớp" closeLabel="Đóng">
        <p>nội dung</p>
      </Dialog>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="([^"]+)"[\s\S]*id="\1"/);
    expect(html).toContain('aria-label="Đóng"');
    expect(html).toContain('nội dung');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('wrapFocusIndex', () => {
  it('wraps Tab from the last control to the first', () => expect(wrapFocusIndex(2, 3, false)).toBe(0));
  it('wraps Shift+Tab from the first control to the last', () => expect(wrapFocusIndex(0, 3, true)).toBe(2));
  it('pulls focus back in when it is outside the dialog', () => {
    expect(wrapFocusIndex(-1, 3, false)).toBe(0);
    expect(wrapFocusIndex(-1, 3, true)).toBe(2);
  });
  it('lets the browser move focus inside the dialog', () => {
    expect(wrapFocusIndex(1, 3, false)).toBeNull();
    expect(wrapFocusIndex(1, 3, true)).toBeNull();
  });
});
