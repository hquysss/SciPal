'use client';

import Link from 'next/link';
import { BookOpen, Home } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Mascot } from '@/components/mascot/Mascot';
import { buttonVariants } from '@/components/ui/button';

// No such page: the owl looks around (it follows the pointer) over a big 404, with two ways back.
export default function NotFound() {
  const { t } = useLanguage();
  return (
    <main className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-6 px-4 py-12 text-center">
      <div className="flex items-end justify-center gap-2 sm:gap-4" aria-hidden="true">
        <span className="bg-gradient-to-br from-[var(--sun)] to-[var(--coral)] bg-clip-text text-[6rem] font-black leading-none tracking-tighter text-transparent sm:text-[9rem]">4</span>
        <Mascot
          directions="/mascots/owl-directions-324.webp"
          reactions="/mascots/owl-reactions-324.webp"
          size={128}
          label={t({ en: 'SciPal owl', vi: 'Cú SciPal' })}
        />
        <span className="bg-gradient-to-br from-[var(--coral)] to-[var(--sky)] bg-clip-text text-[6rem] font-black leading-none tracking-tighter text-transparent sm:text-[9rem]">4</span>
      </div>
      <div className="max-w-md">
        <p className="sr-only">404</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          {t({ en: 'This page got lost', vi: 'Trang này đi lạc rồi' })}
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          {t({
            en: 'The link may be mistyped or the page has moved. Head home, or pick up a lesson.',
            vi: 'Đường dẫn có thể gõ sai hoặc trang đã được chuyển. Về trang chủ, hoặc vào học một bài nhé.',
          })}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonVariants({})}>
          <Home aria-hidden="true" size={18} />
          {t({ en: 'Go to home page', vi: 'Về trang chủ' })}
        </Link>
        <Link href="/subjects" className={buttonVariants({ variant: 'secondary' })}>
          <BookOpen aria-hidden="true" size={18} />
          {t({ en: 'Browse subjects', vi: 'Xem các môn học' })}
        </Link>
      </div>
    </main>
  );
}
