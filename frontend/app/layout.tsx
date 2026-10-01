import type { Metadata, Viewport } from 'next';
import Script from "next/script";
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { TabTitle } from '@/components/nav/TabTitle';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { PwaRegister } from '@/components/pwa/PwaRegister';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { APP_THEME_COLOR } from '@/lib/pwa/brand';
import { NavBar } from '@/components/nav/NavBar';
import { GuestTrialBanner } from '@/features/guest/GuestTrialBanner';
import { renderThemeCss } from '@scipal/ui';
import { buildBootScript, DARK_MODE_ENABLED } from '@/lib/theme/shellTheme';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-be-vietnam',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  // A page sets its English name; the home and sign-in pages show SciPal alone.
  title: { default: 'SciPal', template: '%s | SciPal' },
  description: 'Học song ngữ Anh–Việt theo Chương trình GDPT 2018, lớp 1–12.',
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
        {process.env.NODE_ENV === "development" && (
          <>
            <Script
              src="//unpkg.com/react-grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
            <Script
              src="https://unpkg.com/react-scan/dist/auto.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
          </>
        )}
      </head>
      <body className={`${jetbrainsMono.variable} ${beVietnamPro.variable} font-sans antialiased`}>
        <div data-app-shell="" data-level="neutral" suppressHydrationWarning className="flex min-h-screen flex-col">
          <script dangerouslySetInnerHTML={{ __html: buildBootScript({ darkMode: DARK_MODE_ENABLED }) }} />
          <TabTitle />
          <PwaRegister />
          <SmoothScroll />
          <NavBar />
          <OfflineBanner />
          <GuestTrialBanner />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
