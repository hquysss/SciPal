// Videos from other apps are stored as provider + id, never as a free URL, so the page can only
// ever frame an address this file builds.

export const EMBED_PROVIDERS = ['youtube', 'vimeo', 'drive', 'loom'] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];
export interface Embed { provider: EmbedProvider; id: string }

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube-nocookie.com', 'youtube-nocookie.com']);

export function parseEmbedUrl(input: string): Embed | null {
  let url: URL;
  try { url = new URL(input.trim()); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  const pick = (id: string | undefined, re: RegExp, provider: EmbedProvider): Embed | null => (id && re.test(id) ? { provider, id } : null);

  if (host === 'youtu.be') return pick(parts[0], /^[\w-]{11}$/, 'youtube');
  if (YOUTUBE_HOSTS.has(host)) {
    if (parts[0] === 'watch') return pick(url.searchParams.get('v') ?? undefined, /^[\w-]{11}$/, 'youtube');
    if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return pick(parts[1], /^[\w-]{11}$/, 'youtube');
    return null;
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com') return pick(parts[0], /^\d{5,}$/, 'vimeo');
  if (host === 'player.vimeo.com' && parts[0] === 'video') return pick(parts[1], /^\d{5,}$/, 'vimeo');
  if (host === 'drive.google.com' && parts[0] === 'file' && parts[1] === 'd') return pick(parts[2], /^[\w-]{10,64}$/, 'drive');
  if ((host === 'loom.com' || host === 'www.loom.com') && (parts[0] === 'share' || parts[0] === 'embed')) return pick(parts[1], /^[a-f0-9]{32}$/i, 'loom');
  return null;
}

export function embedSrc({ provider, id }: Embed): string {
  switch (provider) {
    case 'youtube': return `https://www.youtube-nocookie.com/embed/${id}`;
    case 'vimeo': return `https://player.vimeo.com/video/${id}`;
    case 'drive': return `https://drive.google.com/file/d/${id}/preview`;
    case 'loom': return `https://www.loom.com/embed/${id}`;
  }
}
