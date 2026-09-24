import type { Metadata } from 'next';
import { Be_Vietnam_Pro, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { NavBar } from '@/components/nav/NavBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
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
      <body className={`${inter.variable} ${jetbrainsMono.variable} ${beVietnamPro.variable} font-sans antialiased min-h-screen flex flex-col bg-white text-gray-900`}>
        <NavBar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}
