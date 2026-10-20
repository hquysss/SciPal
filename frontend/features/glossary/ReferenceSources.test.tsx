import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '@/lib/theme/rawColors';
import { REFERENCE_ANCHOR, REFERENCE_VOLUMES, ReferenceSources } from './ReferenceSources';

let lang: 'vi' | 'en' = 'vi';
vi.mock('@scipal/hooks', () => ({ useLanguage: () => ({ t: (o: { en: string; vi: string }) => o[lang] }) }));
vi.mock('next/image', () => ({ default: (props: ComponentProps<'img'>) => <img {...props} /> }));

const PUBLIC = fileURLToPath(new URL('../../public', import.meta.url));

describe('ReferenceSources', () => {
  it('cites the dictionary with each cover, captioned and described, in both languages', () => {
    lang = 'vi';
    const vi = renderToStaticMarkup(<ReferenceSources />);
    expect(vi).toContain(`id="${REFERENCE_ANCHOR}"`);
    expect(vi).toContain('Nguồn tham khảo');
    expect(vi).toContain('được đối chiếu với bộ Từ điển Anh – Việt Khoa học Tự nhiên');
    expect(vi.match(/<img /g)).toHaveLength(3);
    for (const caption of ['Tập 1: Toán – Cơ – Tin học', 'Tập 2: Vật lý', 'Tập 4: Sinh học']) {
      expect(vi).toContain(`alt="Bìa Từ điển Anh – Việt Khoa học Tự nhiên, ${caption}"`);
    }
    expect(countRawColors(vi).total).toBe(0);
    lang = 'en';
    expect(renderToStaticMarkup(<ReferenceSources />)).toContain('References');
  });

  it('points at cover images that ship with the app', () => {
    for (const { src } of REFERENCE_VOLUMES) expect(existsSync(join(PUBLIC, src))).toBe(true);
  });
});
