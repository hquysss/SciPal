'use client';

import { useEffect, useRef, useState } from 'react';

export type MediaKind = 'image' | 'video' | 'lottie';

/** What a stored lesson file is, from its address: the backend names each one by its real type. */
export function mediaKind(url: string): MediaKind {
  const ext = url.split(/[?#]/)[0]!.split('.').pop()?.toLowerCase();
  return ext === 'webm' ? 'video' : ext === 'json' ? 'lottie' : 'image';
}

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    setReduced(query.matches);
    const on = () => setReduced(query.matches);
    query.addEventListener?.('change', on);
    return () => query.removeEventListener?.('change', on);
  }, []);
  return reduced;
};

/** A Lottie animation. The light player has no expression engine, so a file cannot run code. */
function LottiePlayer({ url, alt, className }: { url: string; alt: string; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let animation: { destroy: () => void } | undefined;
    let live = true;
    void import('lottie-web/build/player/lottie_light').then((module) => {
      if (!live || !host.current) return;
      const lottie = module.default;
      const instance = lottie.loadAnimation({ container: host.current, renderer: 'svg', loop: !reduced, autoplay: !reduced, path: url });
      instance.addEventListener('data_failed', () => live && setFailed(true));
      // With reduced motion the first frame stays still.
      if (reduced) instance.addEventListener('DOMLoaded', () => instance.goToAndStop(0, true));
      animation = instance;
    });
    return () => {
      live = false;
      animation?.destroy();
    };
  }, [url, reduced]);

  if (failed) return <p role="note" className="rounded-md border border-dashed border-line p-3 text-sm text-ink-muted">{alt || url}</p>;
  return <div ref={host} role="img" aria-label={alt} className={className} />;
}

/**
 * A lesson picture, SVG, WebM clip or Lottie animation, by its address. Moving media play on a loop
 * without sound, and stand still (a video gets its controls) for a reader who asked for less motion.
 */
export function Media({ url, alt, className, loading = 'lazy' }: { url: string; alt: string; className?: string; loading?: 'lazy' | 'eager' }) {
  const kind = mediaKind(url);
  const reduced = useReducedMotion();
  if (kind === 'video') {
    return (
      <video
        src={url}
        aria-label={alt}
        muted
        loop={!reduced}
        autoPlay={!reduced}
        controls={reduced}
        playsInline
        preload="metadata"
        className={className}
      />
    );
  }
  if (kind === 'lottie') return <LottiePlayer url={url} alt={alt} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element -- lesson media from SciPal's own storage, any size
  return <img src={url} alt={alt} loading={loading} decoding="async" className={className} />;
}
