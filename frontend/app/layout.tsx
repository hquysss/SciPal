import type { Metadata } from 'next';
import Script from "next/script";
import { Be_Vietnam_Pro, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/nav/NavBar';
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
  title: 'SciPal — Học khoa học tự nhiên',
  description: 'Nền tảng học tập song ngữ cho học sinh THPT Việt Nam',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

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
          <NavBar />
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </body>
    </html>
  );
}
