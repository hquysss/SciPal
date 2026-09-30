import type { MetadataRoute } from 'next';
import { APP_BACKGROUND_COLOR, APP_THEME_COLOR } from '@/lib/pwa/brand';

const shortcutIcon = [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }];

// The install card and home-screen app: SciPal opens full screen, in the brand green.
// A few newer members (launch_handler, edge_side_panel, handle_links) are not in Next's type yet.
export default function manifest(): MetadataRoute.Manifest {
  const extra = {
    // Opening SciPal again (or a SciPal link) reuses the open window instead of stacking new ones.
    launch_handler: { client_mode: ['navigate-existing', 'auto'] },
    handle_links: 'preferred',
    // Edge can pin SciPal to its side panel, next to a page the student is reading.
    edge_side_panel: { preferred_width: 420 },
  };
  return {
    ...(extra as object),
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
    prefer_related_applications: false,
    // Long-press the app icon (or right-click it on Windows) to jump straight in.
    shortcuts: [
      { name: 'Môn học · Subjects', short_name: 'Môn học', description: 'Chọn môn và học bài · Pick a subject and learn', url: '/subjects', icons: shortcutIcon },
      { name: 'Giáo sư SciPal · SciPal Professor', short_name: 'Giáo sư SciPal', description: 'Hỏi Giáo sư SciPal từng bước · Ask the SciPal Professor step by step', url: '/tutor', icons: shortcutIcon },
      { name: 'Từ điển · Glossary', short_name: 'Từ điển', description: 'Tra thuật ngữ Anh – Việt · Look up English–Vietnamese terms', url: '/glossary', icons: shortcutIcon },
      { name: 'Thi thử · Practice exams', short_name: 'Thi thử', description: 'Làm đề thi thử · Take a practice exam', url: '/exam', icons: shortcutIcon },
    ],
    screenshots: [
      { src: '/screenshots/wide-home.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Trang chủ SciPal' },
      { src: '/screenshots/wide-tutor.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Giáo sư SciPal gợi ý từng bước' },
      { src: '/screenshots/wide-pricing.png', sizes: '1280x720', type: 'image/png', form_factor: 'wide', label: 'Bảng giá' },
      { src: '/screenshots/narrow-home.png', sizes: '540x960', type: 'image/png', form_factor: 'narrow', label: 'SciPal trên điện thoại' },
      { src: '/screenshots/narrow-tutor.png', sizes: '540x960', type: 'image/png', form_factor: 'narrow', label: 'Giáo sư SciPal trên điện thoại' },
    ],
  };
}
