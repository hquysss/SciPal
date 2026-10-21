import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

const PUBLIC_PAGES = ['/', '/pricing', '/help', '/privacy', '/terms'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_PAGES.map((path) => ({ url: `${SITE_URL}${path === '/' ? '' : path}` }));
}
