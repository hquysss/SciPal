import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Video' };

/** Just the trailer, edge to edge: the black layer sits over the site's nav and widgets. */
export default function VideoPage() {
  return (
    <main className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
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
