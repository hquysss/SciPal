import type { Metadata } from 'next';
import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { Bi } from '@/components/ui/bilingual';
import { buttonVariants } from '@/components/ui/button';
import { pageTitle } from '@/lib/pageTitle';

export const metadata: Metadata = { ...pageTitle('Offline', 'Offline') };

// Shown by the service worker when a page was never saved and there is no connection.
export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-sunken text-ink-muted" aria-hidden="true">
        <WifiOff className="h-8 w-8" />
      </span>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        <Bi vi="Trang này chưa được lưu" en="This page is not saved yet" />
      </h1>
      <p className="text-base text-ink-muted">
        <Bi
          vi="Em đang offline và trang này chưa từng mở khi có mạng. Những bài em đã mở hoặc đã tải về vẫn đọc được bình thường."
          en="You are offline and this page was never opened online. Lessons you opened or saved still read as usual."
        />
      </p>
      <Link href="/" className={buttonVariants()}>
        <Bi vi="Về trang chủ" en="Back to home" />
      </Link>
    </main>
  );
}
