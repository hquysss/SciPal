import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { Dialog } from './dialog';

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
