import type { Metadata, Viewport } from 'next';
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TabTitle } from '@/components/nav/TabTitle';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { PendingSync } from '@/components/pwa/PendingSync';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { APP_THEME_COLOR } from '@/lib/pwa/brand';
import { TutorProvider } from '@/features/ai-tutor/TutorSession';
import { TutorWidget } from '@/features/ai-tutor/TutorWidget';
import { LiveToasts } from '@/features/notify/LiveToasts';
import { NavBar } from '@/components/nav/NavBar';
import { SkipLink } from '@/components/nav/SkipLink';
import { renderThemeCss } from '@scipal/ui';
import { SITE_URL } from '@/lib/siteUrl';
import { buildBootScript, DARK_MODE_ENABLED } from '@/lib/theme/shellTheme';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // A page sets its English name; the home and sign-in pages show SciPal alone.
  title: { default: 'SciPal', template: '%s | SciPal' },
  description: 'SciPal - Học song ngữ Việt–Anh, hướng đến việc tiếng Anh trở thành ngôn ngữ thứ hai của bạn.',
  openGraph: { siteName: 'SciPal', type: 'website', locale: 'vi_VN' },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'SciPal', statusBarStyle: 'default' },
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
};

// Installed on a phone: opens full screen, the status bar in the brand green.
export const viewport: Viewport = { themeColor: APP_THEME_COLOR };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <style id="scipal-theme" dangerouslySetInnerHTML={{ __html: renderThemeCss({ systemDark: DARK_MODE_ENABLED }) }} />
        <noscript>
          <style>
            {`body:has([data-scipal-level-gate], [data-scipal-level]) div[hidden][id^="S:"] {
              display: contents !important;
            }

            body:has([data-scipal-level-gate], [data-scipal-level]) main[role="status"][aria-busy="true"] {
              display: none !important;
            }`}
          </style>
        </noscript>
      </head>
      <body className={`${jetbrainsMono.variable} ${beVietnamPro.variable} font-sans antialiased`}>
        <div data-app-shell="" data-level="neutral" suppressHydrationWarning className="flex min-h-screen flex-col">
          <script dangerouslySetInnerHTML={{ __html: buildBootScript({ darkMode: DARK_MODE_ENABLED }) }} />
          <TutorProvider>
          <SkipLink />
          <TabTitle />
          <PwaRegister />
          <NavBar />
          <OfflineBanner />
          <PendingSync />
          <div className="flex flex-1 flex-col">{children}</div>
          <TutorWidget />
          <LiveToasts />
          </TutorProvider>
        </div>
      </body>
    </html>
  );
}
