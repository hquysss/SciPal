'use client';

import { useEffect, useRef, useState } from 'react';
import LetterGlitch from './LetterGlitch';

const TOKENS = ['--ink', '--sun', '--coral', '--sky'];

/**
 * Canvas cannot read CSS variables, so resolve the theme tokens to real colours. The tokens live on
 * the app shell (`[data-app-shell]`), not on :root, so read them from inside it and re-read when the
 * level, the light/dark toggle or the system scheme changes.
 */
function useTokenColors(host: React.RefObject<HTMLElement | null>, names: string[]) {
  const [colors, setColors] = useState<string[] | undefined>();
  const key = names.join(',');
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const read = () => {
      const cs = getComputedStyle(el);
      setColors(key.split(',').map((n) => cs.getPropertyValue(n).trim()));
    };
    read();
    const shell = el.closest('[data-app-shell]');
    const mo = new MutationObserver(read);
    if (shell) mo.observe(shell, { attributes: true, attributeFilter: ['data-theme', 'data-level'] });
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    media?.addEventListener?.('change', read);
    return () => {
      mo.disconnect();
      media?.removeEventListener?.('change', read);
    };
  }, [host, key]);
  return colors;
}

/**
 * A faint field of glitching letters in the theme's ink, for the back of a hero card. Place it as the
 * first child of an `isolate`d, `overflow-hidden` container; it fills it and fades out downward.
 */
export function GlitchBackdrop() {
  const host = useRef<HTMLDivElement>(null);
  const ink = useTokenColors(host, TOKENS);
  return (
    <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 [mask-image:linear-gradient(to_bottom,black,transparent_85%)]">
      {ink && <LetterGlitch baseColor={ink[0]} glitchColors={ink.slice(1)} baseOpacity={0.1} glitchAmount={0.35} fontSize={13} clickEffect="none" />}
    </div>
  );
}
