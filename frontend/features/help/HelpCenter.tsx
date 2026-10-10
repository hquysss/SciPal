'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, ChevronDown, CircleHelp, Compass, GraduationCap, Search, Settings2, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HELP_CATEGORIES, searchHelp, type HelpCategory, type HelpGuide } from './helpContent';
import { GuideIllustration } from './GuideIllustration';

const CATEGORY_ICONS = { all: CircleHelp, start: Compass, learn: BookOpen, account: Settings2, teach: GraduationCap } as const;
const QUICK_START = [
  { title: { en: 'Choose your level', vi: 'Chọn cấp học' }, text: { en: 'Start from your grade.', vi: 'Bắt đầu từ khối lớp của bạn.' } },
  { title: { en: 'Open a lesson', vi: 'Mở một bài học' }, text: { en: 'Read, explore, then practise.', vi: 'Đọc, khám phá rồi tự luyện.' } },
  { title: { en: 'Save your progress', vi: 'Lưu tiến trình' }, text: { en: 'Sign in and mark it complete.', vi: 'Đăng nhập và đánh dấu hoàn thành.' } },
] as const;

function GuideCard({ guide }: { readonly guide: HelpGuide }) {
  const { t } = useLanguage();
  const Icon = CATEGORY_ICONS[guide.category];
  return (
    <article id={`guide-${guide.id}`} className="flex scroll-mt-24 flex-col rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <GuideIllustration guide={guide} />
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-action">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <h4 className="text-lg font-bold leading-snug text-ink">{t(guide.title)}</h4>
      </div>
      <p className="mb-5 text-sm leading-relaxed text-ink-muted">{t(guide.description)}</p>
      <ol className="flex flex-col gap-4">
        {guide.steps.map((step, index) => (
          <li key={step.en} className="flex gap-3 text-sm leading-relaxed text-ink">
            <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-sunken text-xs font-bold text-action">{index + 1}</span>
            <span>{t(step)}</span>
          </li>
        ))}
      </ol>
      {guide.note && <p className="mt-5 rounded-lg bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-ink-muted">{t(guide.note)}</p>}
      <div className="mt-auto pt-5">
        <Link href={guide.href} prefetch={false} className={buttonVariants({ variant: 'link', className: 'whitespace-normal text-left' })}>
          {t(guide.action)}<ArrowRight aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

function GuideGroup({ audience, guides }: { readonly audience: HelpGuide['audience']; readonly guides: readonly HelpGuide[] }) {
  const { t } = useLanguage();
  if (guides.length === 0) return null;
  const isStudent = audience === 'student';
  const title = isStudent
    ? t({ en: 'For students', vi: 'Dành cho học sinh' })
    : t({ en: 'For teachers', vi: 'Dành cho giáo viên' });
  const description = isStudent
    ? t({ en: 'Learn with lessons, simulations and the Professor; practise, play and track progress.', vi: 'Học bài, mô phỏng, hỏi Giáo sư, tự luyện, chơi game và theo dõi tiến trình.' })
    : t({ en: 'Create learning materials, manage classes and games, add terms and request simulations.', vi: 'Soạn học liệu, quản lý lớp và game, thêm thuật ngữ, đề xuất mô phỏng.' });
  const headingId = `${audience}-guides-title`;

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-5">
        <h3 id={headingId} className="text-lg font-bold text-ink">{title}</h3>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-ink-muted">{description}</p>
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        {guides.map((guide) => <GuideCard key={guide.id} guide={guide} />)}
      </div>
    </section>
  );
}

export function HelpCenter() {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HelpCategory>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const { guides, faqs } = searchHelp(query, category);
  const studentGuides = guides.filter((guide) => guide.audience === 'student');
  const teacherGuides = guides.filter((guide) => guide.audience === 'teacher');
  const resultCount = guides.length + faqs.length;
  const filtered = Boolean(query.trim()) || category !== 'all';
  const reset = () => { setQuery(''); setCategory('all'); searchRef.current?.focus(); };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <PageBreadcrumb items={[{ href: '/', label: { en: 'Home', vi: 'Trang chủ' } }, { label: { en: 'Help', vi: 'Hướng dẫn' } }]} />
      <header className="my-8 grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-center lg:gap-12">
        <div>
          <h1 className="text-balance text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl">
            {t({ en: 'How to use SciPal', vi: 'Hướng dẫn sử dụng SciPal' })}
          </h1>
          <p className="mt-4 max-w-prose text-base leading-relaxed text-ink-muted">
            {t({ en: 'Clear steps for students and teachers, from the first lesson to creating class materials.', vi: 'Hướng dẫn cho học sinh và giáo viên, từ bài học đầu tiên đến soạn học liệu cho lớp.' })}
          </p>
          <div className="relative mt-6">
            <label htmlFor="help-search" className="sr-only">{t({ en: 'Search guides and questions', vi: 'Tìm hướng dẫn và câu hỏi' })}</label>
            <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-4 size-5 text-ink-muted" />
            <Input ref={searchRef} id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)}
              placeholder={t({ en: 'Try “exam”, “class” or “progress”…', vi: 'Thử “thi thử”, “lớp học”, “tiến trình”…' })}
              className="min-h-14 rounded-xl pl-12 pr-12" aria-controls="help-results" />
            {query && <button type="button" aria-label={t({ en: 'Clear search', vi: 'Xóa tìm kiếm' })} onClick={() => { setQuery(''); searchRef.current?.focus(); }}
              className="absolute right-1 top-1 flex size-12 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-focus">
              <X aria-hidden="true" className="size-4" />
            </button>}
          </div>
        </div>
        <section aria-labelledby="quick-start-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="quick-start-title" className="text-lg font-bold text-ink">{t({ en: 'Your first steps', vi: 'Lần đầu dùng SciPal?' })}</h2>
            <Compass aria-hidden="true" className="size-5 shrink-0 text-action" />
          </div>
          <ol className="flex flex-col gap-4">
            {QUICK_START.map((step, index) => (
              <li key={step.title.en} className="flex items-start gap-3">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action text-sm font-bold text-action-ink">{index + 1}</span>
                <div><p className="text-sm font-bold text-ink">{t(step.title)}</p><p className="mt-1 text-sm text-ink-muted">{t(step.text)}</p></div>
              </li>
            ))}
          </ol>
          <Link href="/subjects" prefetch={false} className={buttonVariants({ className: 'mt-6 w-fit max-w-full whitespace-normal text-left' })}>
            {t({ en: 'Browse subjects', vi: 'Xem môn học' })}<ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </header>
      <div className="grid items-start gap-6 border-t border-line pt-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-8">
        <aside className="lg:sticky lg:top-24">
          <h2 className="mb-3 text-sm font-semibold text-ink-muted">{t({ en: 'Browse by topic', vi: 'Chọn chủ đề' })}</h2>
          <div role="group" aria-label={t({ en: 'Help topics', vi: 'Chủ đề hướng dẫn' })} className="flex flex-wrap gap-2 lg:flex-col">
            {HELP_CATEGORIES.map((item) => {
              const Icon = CATEGORY_ICONS[item.id];
              return <button key={item.id} type="button" aria-pressed={category === item.id} aria-controls="help-results" onClick={() => setCategory(item.id)}
                className={`flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors motion-reduce:transition-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${category === item.id ? 'bg-action text-action-ink' : 'bg-surface text-ink hover:bg-surface-sunken'}`}>
                <Icon aria-hidden="true" className="size-4 shrink-0" />{t(item.label)}
              </button>;
            })}
          </div>
          <p className="mt-5 hidden text-sm leading-relaxed text-ink-muted lg:block">{t({ en: 'This guide is always available, even before you sign in.', vi: 'Bạn luôn đọc được hướng dẫn, kể cả khi chưa đăng nhập.' })}</p>
        </aside>
        <div id="help-results" className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-ink">{t({ en: filtered ? 'Search results' : 'Step-by-step guides', vi: filtered ? 'Kết quả tra cứu' : 'Hướng dẫn từng bước' })}</h2>
            <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-ink-muted">{t({ en: `${guides.length} guides · ${faqs.length} questions`, vi: `${guides.length} hướng dẫn · ${faqs.length} câu hỏi` })}</p>
          </div>
          {resultCount === 0 && <div className="rounded-2xl border border-line bg-surface p-6 text-center sm:p-10">
            <Search aria-hidden="true" className="mx-auto mb-4 size-8 text-ink-muted" />
            <h3 className="text-lg font-bold text-ink">{t({ en: 'No matching guides yet', vi: 'Chưa tìm thấy hướng dẫn phù hợp' })}</h3>
            <p className="mt-2 text-sm text-ink-muted">{t({ en: 'Try a shorter keyword in English or Vietnamese, or browse all topics.', vi: 'Thử từ khóa ngắn hơn bằng tiếng Anh hoặc tiếng Việt, hoặc xem tất cả chủ đề.' })}</p>
            <Button type="button" variant="outline" onClick={reset} className="mt-5">{t({ en: 'Show all topics', vi: 'Xem tất cả chủ đề' })}</Button>
          </div>}
          <div className="space-y-10">
            <GuideGroup audience="student" guides={studentGuides} />
            <GuideGroup audience="teacher" guides={teacherGuides} />
          </div>
          {faqs.length > 0 && <section aria-labelledby="faq-title" className="mt-10">
            <h2 id="faq-title" className="mb-4 text-xl font-bold text-ink">{t({ en: 'Frequently asked questions', vi: 'Câu hỏi thường gặp' })}</h2>
            <div className="overflow-hidden rounded-2xl border border-line bg-surface">
              {faqs.map((faq) => <details key={faq.id} open={query.trim() ? true : undefined} className="group border-b border-line last:border-b-0">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-ink hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
                  {t(faq.question)}<ChevronDown aria-hidden="true" className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <p className="max-w-prose px-5 pb-5 text-sm leading-relaxed text-ink-muted">{t(faq.answer)}</p>
              </details>)}
            </div>
          </section>}
          <section aria-labelledby="help-next-title" className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-surface-sunken p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div><h2 id="help-next-title" className="font-bold text-ink">{t({ en: 'Ready to put it into practice?', vi: 'Sẵn sàng thử ngay?' })}</h2>
              <p className="mt-1 text-sm text-ink-muted">{t({ en: 'Choose a lesson and learn at your own pace.', vi: 'Chọn một bài học và học theo nhịp của bạn.' })}</p></div>
            <Link href="/subjects" prefetch={false} className={buttonVariants({ variant: 'outline' })}>{t({ en: 'Explore subjects', vi: 'Khám phá môn học' })}<ArrowRight aria-hidden="true" /></Link>
          </section>
          <Link href="/feedback" className="mt-6 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">{t({ vi: 'Góp ý để SciPal tốt hơn', en: 'Help make SciPal better' })}</Link>
        </div>
      </div>
    </main>
  );
}
