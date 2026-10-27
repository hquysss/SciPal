import type { Metadata } from 'next';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Video', 'Video') };

/** Just the trailer, edge to edge. A dark color scheme keeps the letterbox dark in both themes. */
export default function VideoPage() {
  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center bg-[Canvas] [color-scheme:dark]">
      <video
        className="h-full w-full object-contain"
        src="/video/scipal-vi-wide.mp4"
        poster="/video/scipal-vi-wide-poster.jpg"
        controls
        playsInline
        preload="metadata"
      />
    </main>
  );
}
