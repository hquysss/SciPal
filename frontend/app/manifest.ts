import type { MetadataRoute } from 'next';
import { APP_BACKGROUND_COLOR, APP_THEME_COLOR } from '@/lib/pwa/brand';

// The install card and home-screen app: SciPal opens full screen, in the brand green.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SciPal',
    short_name: 'SciPal',
    description: 'Học khoa học tự nhiên song ngữ theo Chương trình GDPT 2018 · Bilingual science lessons for Vietnam’s 2018 curriculum.',
    lang: 'vi',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: APP_BACKGROUND_COLOR,
    theme_color: APP_THEME_COLOR,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
