import { ImageResponse } from 'next/og';
import { APP_BACKGROUND_COLOR, APP_THEME_COLOR } from '@/lib/pwa/brand';

// The picture shown when a link is shared on Facebook, Zalo or Messenger. The default font has no
// Vietnamese letters, so the text here is plain ASCII.
export const alt = 'SciPal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: APP_THEME_COLOR, color: APP_BACKGROUND_COLOR }}>
        <div style={{ fontSize: 160, fontWeight: 800 }}>SciPal</div>
        <div style={{ fontSize: 48, marginTop: 16 }}>Bilingual learning, English + Vietnamese</div>
        <div style={{ fontSize: 36, marginTop: 12, opacity: 0.85 }}>GDPT 2018 - Grades 1-12</div>
      </div>
    ),
    size,
  );
}
