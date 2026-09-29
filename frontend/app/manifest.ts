import type { MetadataRoute } from 'next';
import { APP_BACKGROUND_COLOR, APP_THEME_COLOR } from '@/lib/pwa/brand';

// The install card and home-screen app: SciPal opens full screen, in the brand green.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable identity: the installed app and its Store package stay the same app if start_url changes.
    id: '/',
    name: 'SciPal',
    short_name: 'SciPal',
    description: 'Học khoa học tự nhiên song ngữ theo Chương trình GDPT 2018 · Bilingual science lessons for Vietnam’s 2018 curriculum.',
    lang: 'vi',
    dir: 'ltr',
    categories: ['education'],
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
    // Shown on install cards and the Microsoft Store listing (sizes match the files in public/screenshots).
    screenshots: [
      { src: '/screenshots/wide-home.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Trang chủ SciPal' },
      { src: '/screenshots/wide-tutor.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Gia sư AI gợi ý từng bước' },
      { src: '/screenshots/wide-pricing.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Bảng giá' },
      { src: '/screenshots/narrow-home.png', sizes: '540x960', type: 'image/png', form_factor: 'narrow', label: 'SciPal trên điện thoại' },
      { src: '/screenshots/narrow-tutor.png', sizes: '540x960', type: 'image/png', form_factor: 'narrow', label: 'Gia sư AI trên điện thoại' },
    ],
  };
}
