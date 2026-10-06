import { Media } from '@/components/media/Media';
import type { ImageBlock } from '@scipal/types';

export function ImageRenderer({ block, lang }: { block: ImageBlock; lang: 'en' | 'vi' }) {
  const alt = block.alt[lang] || block.alt.vi;
  const caption = block.caption ? block.caption[lang] || block.caption.vi : '';
  return (
    <figure className="flex flex-col items-center gap-2">
      <Media url={block.url} alt={alt} className="h-auto max-h-[32rem] w-auto max-w-full rounded-lg border border-line bg-surface" />
      {caption && <figcaption className="text-center text-sm text-ink-muted">{caption}</figcaption>}
    </figure>
  );
}
