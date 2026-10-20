'use client';

import Image from 'next/image';
import { useLanguage } from '@scipal/hooks';

type Copy = { en: string; vi: string };

export const REFERENCE_ANCHOR = 'nguon-tham-khao';

/** The printed dictionary the glossary terms are checked against. Volume 3 is not on file yet. */
export const REFERENCE_VOLUMES: Array<{ src: string; width: number; height: number; volume: Copy }> = [
  {
    src: '/images/sources/tu-dien-khtn-tap-1.webp',
    width: 600,
    height: 821,
    volume: { vi: 'Tập 1: Toán – Cơ – Tin học', en: 'Vol. 1: Mathematics, Mechanics, Informatics' },
  },
  {
    src: '/images/sources/tu-dien-khtn-tap-2.webp',
    width: 600,
    height: 808,
    volume: { vi: 'Tập 2: Vật lý', en: 'Vol. 2: Physics' },
  },
  {
    src: '/images/sources/tu-dien-khtn-tap-4.webp',
    width: 600,
    height: 896,
    volume: { vi: 'Tập 4: Sinh học', en: 'Vol. 4: Biology' },
  },
];

export function ReferenceSources() {
  const { t } = useLanguage();
  return (
    <section id={REFERENCE_ANCHOR} aria-labelledby="reference-sources-title" className="mt-16 scroll-mt-24 border-t border-edge pt-10">
      <h2 id="reference-sources-title" className="text-2xl font-bold text-ink">
        {t({ en: 'References', vi: 'Nguồn tham khảo' })}
      </h2>
      <p className="mt-3 max-w-prose text-base text-ink-muted">
        {t({
          en: 'Terms on SciPal are checked against the English–Vietnamese Dictionary of Natural Sciences (VNU University of Science, Hanoi; Vietnam Education Publishing House).',
          vi: 'Thuật ngữ trên SciPal được đối chiếu với bộ Từ điển Anh – Việt Khoa học Tự nhiên (Trường Đại học Khoa học Tự nhiên, Đại học Quốc gia Hà Nội; Nhà xuất bản Giáo dục).',
        })}
      </p>
      <ul className="mt-6 flex snap-x gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {REFERENCE_VOLUMES.map(({ src, width, height, volume }) => (
          <li key={src} className="w-40 shrink-0 snap-start sm:w-auto">
            <figure>
              <Image
                src={src}
                width={width}
                height={height}
                sizes="(min-width: 640px) 240px, 160px"
                alt={t({
                  en: `Cover of the English–Vietnamese Dictionary of Natural Sciences, ${volume.en}`,
                  vi: `Bìa Từ điển Anh – Việt Khoa học Tự nhiên, ${volume.vi}`,
                })}
                className="h-auto w-full rounded-lg border border-edge bg-paper"
              />
              <figcaption className="mt-2 text-sm font-medium text-ink">{t(volume)}</figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
