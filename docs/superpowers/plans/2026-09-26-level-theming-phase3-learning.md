# Level Theming — Giai đoạn 3: Luồng học (chỉ giao diện)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang môn, trang bài ("trang vở"), 7 khối nội dung, thanh hoàn thành, AI Tutor và glossary dùng token cấp học, song ngữ, vùng chạm 44px; mọi file luồng học về 0 màu thô.

**Architecture:** Không đổi dữ liệu hay API. Trang bài bọc `LevelScope` theo `levelOfGrade(lesson.grade)` bên ngoài `SubjectProvider`; nội dung nằm trên một tờ `surface` có dải lề màu môn; khối lý thuyết tự kẻ dòng (ô li cho Tiểu học). Markdown được gán kiểu bằng `components` của `react-markdown` (không cài plugin typography). Chuỗi của trang server chuyển vào component client dùng `useLanguage`.

**Tech Stack:** Next.js 15.5, React 19, Tailwind CSS 3.4.19, `react-markdown` 10 + `remark-gfm`, KaTeX, Monaco, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-26-app-wide-level-theming-design.md` (§2.3 trang vở, §3.3 accent là "nhãn vở", §7 giai đoạn 3). Bảng màu đúng là `packages/ui/src/theme/palettes.ts` hiện tại.

## Phạm vi đã chốt (26/09)

- **Chỉ giao diện.** Không làm quiz thật, không nối thẻ thuật ngữ/tài liệu với dữ liệu, không làm API AI Tutor (ghi Next Steps).
- Khối `quiz`: thay ô `[Câu hỏi trắc nghiệm <id>]` bằng trạng thái "Câu hỏi luyện tập sắp có". **Xoá `components/blocks/QuizBlock.tsx`** (không ai import; nếu nối vào sẽ lộ `data.answer` xuống client — vi phạm invariant 4).
- `ResourceRefCard`/`TermRefCard` giữ nguồn dữ liệu hiện tại (placeholder), chỉ đổi giao diện.
- Nút "Bài tiếp theo →" (thực chất về trang môn) đổi tên "Về danh sách bài".

## Global Constraints

- Không gắn theme/level/biến màu lên `:root`/`<html>`.
- File `.tsx` trong phạm vi về **0 màu thô**; ratchet chỉ giảm. Cập nhật baseline: Bash `UPDATE_THEME_BASELINE=1 pnpm --filter @scipal/web test -- lib/theme/rawColors`; PowerShell `$env:UPDATE_THEME_BASELINE='1'; pnpm --filter @scipal/web test -- lib/theme/rawColors; Remove-Item Env:UPDATE_THEME_BASELINE`.
- Accent môn chỉ là **nhãn vở** (dải lề, nhãn, icon, gạch chân tab, thanh tiến độ): chữ màu môn dùng `text-accent-ink`; nền dùng `bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))]`. Không tô nền đặc accent với chữ trắng; nút chính dùng `bg-action`.
- `LevelScope` đặt **ngoài** `SubjectProvider`; `--accent-ink` chỉ có trong `[data-subject-scope]`.
- Tailwind 3.4: không opacity modifier với token; không cú pháp v4.
- Chuỗi hiển thị song ngữ qua `useLanguage().t({ en, vi })`; tên bài/chủ đề/môn hiển thị theo `lang` (`title_en`/`title_vi`…), ngôn ngữ còn lại là dòng phụ `text-ink-muted`.
- Không `font-mono` cho nhãn/số (mono chỉ cho code); không nhãn IN HOA; không "→" trong nút.
- Vùng chạm ≥ 44px (`min-h-11`), focus `outline-focus`; tôn trọng `prefers-reduced-motion`.
- File được test import dùng import tương đối (vitest không có alias `@/`).
- Không thêm dependency.

## Bảng đổi màu dùng chung

| Class thô | Token |
|---|---|
| `text-gray-950/900/800` | `text-ink` |
| `text-gray-700/600/500/400` | `text-ink-muted` |
| `bg-white`, `bg-white/90…` | `bg-surface` |
| `bg-gray-50…`, `bg-gray-100`, `bg-emerald-50` | `bg-surface-sunken` |
| viền thẻ, vạch chia (`border-gray-100/200…`) | `border-line` |
| viền ô nhập, nút viền (`border-gray-300…`) | `border-edge` |
| `focus:border-emerald-600 focus:ring-…` | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus` |
| `text-emerald-700/800`, `hover:text-emerald-700` | `text-action`, `hover:text-action` |
| `bg-emerald-*`/`style={{ backgroundColor: 'var(--accent…)' }}` trên nút | `bg-action text-action-ink hover:bg-action-hover` |
| `style={{ color: 'var(--accent…)' }}` trên chữ | `text-accent-ink` |
| `style={{ borderColor: 'var(--accent…)' }}` | `border-accent` |
| `text-red-700` | `text-danger` |
| `text-white` trên nền accent/action | `text-action-ink` (và đổi nền sang `bg-action`) |
| mọi `dark:…`, `shadow-*` trang trí, `backdrop-blur-*` | xoá |

## Review Focus

1. **Bài lớp 5 mở bởi học sinh THPT**: vùng bài tông Tiểu học (ô li), navbar vẫn tông THPT. → Task 2 Step 6.
2. **Markdown có bảng rộng/code dài trên 375px**: không cuộn ngang cả trang, chỉ cuộn trong khối. → Task 1 test (`overflow-x-auto` trên bảng và `pre`) + Task 2 Step 6.
3. **Accent sáng (vd `#65a30d`, `#d97706`) làm chữ nhãn môn**: phải đọc được (dùng `text-accent-ink`, không chữ trắng trên accent). → test Task 4/5 (không còn `text-white` + `var(--accent` làm nền) + kiểm trình duyệt với môn có accent sáng.
4. **Đổi EN/VI trên trang bài và trang môn**: tiêu đề, breadcrumb, số chủ đề/bài đổi theo. → test Task 2 và Task 4.
5. **Khối quiz trong bài đã xuất bản**: hiển thị trạng thái "sắp có", không lộ `question_id`, không ném lỗi. → test Task 3.

---

### Task 1: Tờ vở và kiểu chữ markdown cho khối lý thuyết

**Files:**
- Create: `frontend/components/blocks/notebook.module.css`
- Modify (thay toàn bộ): `frontend/components/blocks/TheoryRenderer.tsx`
- Test: `frontend/components/blocks/TheoryRenderer.test.tsx`

**Interfaces:**
- Produces: `TheoryRenderer({ block: TheoryBlock; lang: 'en' | 'vi' })` (API giữ nguyên); CSS module `notebook.module.css` export `rules` (dòng kẻ theo cấp) và `sheet` (tờ vở có dải lề) — Task 2 dùng `sheet`.

- [ ] **Step 1: Viết test thất bại**

`frontend/components/blocks/TheoryRenderer.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { TheoryRenderer } from './TheoryRenderer';

const markdown = [
  '## Thuật toán tìm kiếm',
  '',
  'Đoạn văn có **chữ đậm**, `mã` và [liên kết](https://example.com).',
  '',
  '- Tuần tự',
  '- Nhị phân',
  '',
  '| Cách | Độ phức tạp |',
  '|---|---|',
  '| Tuần tự | O(n) |',
  '',
  '```',
  'for i in range(n): pass',
  '```',
].join('\n');

const block = { type: 'theory' as const, content: { en: 'English body', vi: markdown } };

describe('TheoryRenderer', () => {
  const html = renderToStaticMarkup(<TheoryRenderer block={block} lang="vi" />);

  it('renders the selected language', () => {
    expect(html).toContain('Thuật toán tìm kiếm');
    expect(renderToStaticMarkup(<TheoryRenderer block={block} lang="en" />)).toContain('English body');
  });

  it('styles markdown with tokens instead of the missing typography plugin', () => {
    expect(html).not.toContain('prose');
    expect(html).toMatch(/<h2 class="[^"]*text-ink/);
    expect(html).toMatch(/<ul class="[^"]*list-disc/);
    expect(html).toMatch(/<a [^>]*class="[^"]*text-action/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('keeps wide tables and code inside their own scroll area', () => {
    expect(html).toMatch(/<div class="[^"]*overflow-x-auto[^"]*"><table/);
    expect(html).toMatch(/<pre class="[^"]*overflow-x-auto/);
  });

  it('opens external links safely', () => {
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- TheoryRenderer`
Expected: FAIL — HTML có `prose`, `h2` không có class.

- [ ] **Step 3: CSS tờ vở**

`frontend/components/blocks/notebook.module.css`:

```css
/* Notebook sheet: a surface page with the subject accent as the margin strip. */
.sheet {
  position: relative;
  border: 1px solid var(--line);
  border-radius: 0.75rem;
  background-color: var(--surface);
  padding: 1.75rem 1.25rem 1.75rem 2rem;
}

.sheet::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0.75rem;
  width: 3px;
  border-radius: 2px;
  background-color: var(--accent, var(--action));
}

@media (min-width: 640px) {
  .sheet {
    padding: 2.625rem 2.5rem 2.625rem 3.25rem;
  }

  .sheet::before {
    left: 1.5rem;
  }
}

/* Ruled lines every 1.75rem, starting at the top of each theory block so text sits on them. */
.rules {
  background-image: repeating-linear-gradient(
    to bottom,
    transparent 0,
    transparent calc(1.75rem - 1px),
    var(--line) calc(1.75rem - 1px),
    var(--line) 1.75rem
  );
  background-position: 0 0;
}

/* Primary: squared "ô li" paper. */
:global([data-level='primary']) .rules {
  background-image:
    repeating-linear-gradient(to bottom, transparent 0, transparent calc(1.75rem - 1px), var(--line) calc(1.75rem - 1px), var(--line) 1.75rem),
    repeating-linear-gradient(to right, transparent 0, transparent calc(1.75rem - 1px), var(--line) calc(1.75rem - 1px), var(--line) 1.75rem);
}

@media print {
  .rules {
    background-image: none;
  }
}
```

- [ ] **Step 4: Viết lại `TheoryRenderer.tsx`**

Mọi khoảng cách dọc trong khối là bội của `1.75rem` (`leading-7`, `mt-7`, `mb-7`, `h2` `leading-[3.5rem]`) để chữ khớp dòng kẻ.

```tsx
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { TheoryBlock } from '@scipal/types';
import styles from './notebook.module.css';

const components: Components = {
  h1: ({ children }) => <h2 className="text-2xl font-bold leading-[3.5rem] text-ink">{children}</h2>,
  h2: ({ children }) => <h2 className="text-xl font-bold leading-[3.5rem] text-ink">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold leading-7 text-ink">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold leading-7 text-ink">{children}</h4>,
  p: ({ children }) => <p className="mb-7 leading-7 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-7 list-disc pl-6 leading-7 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-7 list-decimal pl-6 leading-7 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-ink">{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-action underline underline-offset-4 hover:text-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-7 border-l-4 border-line bg-surface pl-4 italic text-ink-muted last:mb-0">{children}</blockquote>
  ),
  code: ({ className, children }) =>
    className ? (
      <code className={`${className} font-mono text-sm`}>{children}</code>
    ) : (
      <code className="rounded bg-surface-sunken px-1.5 py-0.5 font-mono text-[0.9em] text-ink">{children}</code>
    ),
  pre: ({ children }) => (
    <pre className="mb-7 overflow-x-auto rounded-lg border border-line bg-surface-sunken p-4 leading-7 last:mb-0">{children}</pre>
  ),
  table: ({ children }) => (
    <div className="mb-7 overflow-x-auto rounded-lg border border-line bg-surface last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border-b border-line bg-surface-sunken px-3 py-2 font-semibold text-ink">{children}</th>,
  td: ({ children }) => <td className="border-b border-line px-3 py-2">{children}</td>,
  hr: () => <hr className="my-7 border-line" />,
};

export function TheoryRenderer({ block, lang }: { block: TheoryBlock; lang: 'en' | 'vi' }) {
  const text = lang === 'en' ? block.content.en : block.content.vi;
  return (
    <div className={`${styles.rules} text-base text-ink`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
```

- [ ] **Step 5: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- TheoryRenderer` — Expected: PASS.
Nếu vitest báo không import được `.module.css`, thêm vào `frontend/vitest.config.mts` trong `test`: `css: { modules: { classNameStrategy: 'non-scoped' } },` rồi chạy lại.

- [ ] **Step 6: Typecheck, baseline, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — Expected: PASS.

```bash
git add frontend/components/blocks/notebook.module.css frontend/components/blocks/TheoryRenderer.tsx frontend/components/blocks/TheoryRenderer.test.tsx frontend/theme-baseline.json frontend/vitest.config.mts
git commit -m "feat(web): notebook ruling and token typography for theory blocks"
```

---

### Task 2: Trang bài học dạng trang vở

**Files:**
- Create: `frontend/features/lessons/LessonHeader.tsx`
- Test: `frontend/features/lessons/LessonHeader.test.tsx`
- Modify: `frontend/app/[subject]/[lesson]/page.tsx`

**Interfaces:**
- Consumes: `LevelScope({ level, className?, children })` từ `@scipal/ui`; `levelOfGrade(grade: number): EducationLevel` từ `features/landing/educationLevel.ts`; `styles.sheet` từ `components/blocks/notebook.module.css`; `LessonDetail` từ `features/lessons/lessonDetailQuery.ts`.
- Produces: `LessonHeader(props: { lesson: Pick<LessonDetail, 'title_en' | 'title_vi' | 'grade' | 'topics' | 'subjects'> })` — breadcrumb + nhãn vở + tiêu đề, song ngữ.

- [ ] **Step 1: Viết test thất bại**

`frontend/features/lessons/LessonHeader.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonHeader } from './LessonHeader';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const lesson = {
  title_en: 'Search algorithms',
  title_vi: 'Thuật toán tìm kiếm',
  grade: 10,
  topics: { name_en: 'Algorithms', name_vi: 'Thuật toán' },
  subjects: { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', icon: '</>', accent_color: '#16a34a' },
};

describe('LessonHeader', () => {
  it('shows Vietnamese first with the English title as a secondary line', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(html).toMatch(/<h1[^>]*>Thuật toán tìm kiếm<\/h1>/);
    expect(html).toContain('Search algorithms');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('href="/informatics"');
    expect(html).toContain('Tin học, lớp 10');
  });

  it('switches every label to English', () => {
    lang = 'en';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(html).toMatch(/<h1[^>]*>Search algorithms<\/h1>/);
    expect(html).toContain('Home');
    expect(html).toContain('Informatics, grade 10');
    expect(html).toContain('aria-label="Breadcrumb"');
  });

  it('uses tokens and the accent only as a label', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<LessonHeader lesson={lesson} />);
    expect(countRawColors(html).total).toBe(0);
    expect(html).toContain('text-accent-ink');
    expect(html).not.toContain('font-mono');
    expect(html).not.toContain('uppercase');
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- LessonHeader` — Expected: FAIL (không resolve `./LessonHeader`).

- [ ] **Step 3: Viết `LessonHeader.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { LessonDetail } from './lessonDetailQuery';

type HeaderLesson = Pick<LessonDetail, 'title_en' | 'title_vi' | 'grade' | 'topics' | 'subjects'>;

export function LessonHeader({ lesson }: { lesson: HeaderLesson }) {
  const { lang, t } = useLanguage();
  const subjectName = lang === 'en' ? lesson.subjects.name_en : lesson.subjects.name_vi;
  const topicName = lang === 'en' ? lesson.topics.name_en : lesson.topics.name_vi;
  const title = lang === 'en' ? lesson.title_en : lesson.title_vi;
  const otherTitle = lang === 'en' ? lesson.title_vi : lesson.title_en;
  const crumbLink =
    'rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <li>
            <Link href="/" className={crumbLink}>
              {t({ en: 'Home', vi: 'Trang chủ' })}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li>
            <Link href={`/${lesson.subjects.slug}`} className={crumbLink}>
              {subjectName}
            </Link>
          </li>
          <li aria-hidden="true" className="text-ink-muted">/</li>
          <li className="text-ink-muted">{topicName}</li>
        </ol>
      </nav>

      <p className="inline-flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] px-2.5 py-1 text-sm font-semibold text-accent-ink">
        <span aria-hidden="true">{lesson.subjects.icon}</span>
        <span>{t({ en: `${lesson.subjects.name_en}, grade ${lesson.grade}`, vi: `${lesson.subjects.name_vi}, lớp ${lesson.grade}` })}</span>
      </p>

      <h1 className="mt-4 text-3xl font-bold leading-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mt-2 text-base text-ink-muted">{otherTitle}</p>
    </header>
  );
}
```

- [ ] **Step 4: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- LessonHeader` — Expected: PASS.

- [ ] **Step 5: Viết lại trang bài**

`frontend/app/[subject]/[lesson]/page.tsx` — giữ phần import/`getLessonDetail`/`notFound`; thay phần render:

```tsx
import { notFound } from 'next/navigation';
import { LevelScope, SubjectProvider } from '@scipal/ui';
import { LoadErrorNotice } from '@/components/feedback/LoadErrorNotice';
import { getLessonDetail } from '@/features/lessons/lessonDetailQuery';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { AiTutorButton } from '@/features/ai-tutor/AiTutorButton';
import { LessonCompletionBar } from '@/features/lessons/LessonCompletionBar';
import { LessonHeader } from '@/features/lessons/LessonHeader';
import { levelOfGrade } from '@/features/landing/educationLevel';
import styles from '@/components/blocks/notebook.module.css';

export const dynamic = 'force-dynamic';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ subject: string; lesson: string }>;
}) {
  const { subject: subjectSlug, lesson: lessonSlug } = await params;
  const result = await getLessonDetail(subjectSlug, lessonSlug);
  if (result.kind === 'not_found') notFound();
  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <LoadErrorNotice
          message={{ en: 'Could not load this lesson.', vi: 'Chưa tải được bài học.' }}
          retryHref={`/${subjectSlug}/${lessonSlug}`}
        />
      </main>
    );
  }

  const { lesson } = result;
  const subject = lesson.subjects;

  return (
    <LevelScope level={levelOfGrade(lesson.grade)} className="flex-1">
      <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-8 sm:px-6 sm:pt-12">
          <LessonHeader lesson={lesson} />

          <article className={styles.sheet} data-pattern="off">
            <div className="flex flex-col gap-7">
              {lesson.blocks.map((block, i) => (
                <BlockRenderer key={i} block={block} />
              ))}
            </div>
          </article>

          <LessonCompletionBar lessonId={lesson.id} subjectSlug={subjectSlug} />
          <AiTutorButton lessonId={lesson.id} subjectSlug={subjectSlug} token={null} />
        </main>
      </SubjectProvider>
    </LevelScope>
  );
}
```

- [ ] **Step 6: Kiểm trình duyệt**

`pnpm --filter @scipal/web dev`, mở một bài đã xuất bản (Tin học lớp 10):
- Nền trang có hoạ tiết; tờ vở trắng che hoạ tiết, dải lề màu môn ở mép trái; khối lý thuyết có dòng kẻ ngang, chữ ngồi trên dòng.
- Đổi EN/VI: tiêu đề, breadcrumb, nhãn đổi theo.
- Là khách đã chọn THPT: navbar xanh lá. Nếu có bài lớp ≤ 5 trên DB local: vùng bài tông nâu, khối lý thuyết kẻ ô li; navbar vẫn xanh lá.
- 375px: không cuộn ngang trang; bảng/code dài cuộn trong khối.

- [ ] **Step 7: Typecheck, baseline, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — Expected: PASS; baseline không còn `app/[subject]/[lesson]/page.tsx`.

```bash
git add "frontend/app/[subject]/[lesson]/page.tsx" frontend/features/lessons/LessonHeader.tsx frontend/features/lessons/LessonHeader.test.tsx frontend/theme-baseline.json
git commit -m "feat(web): lesson page as a level-scoped notebook sheet with a bilingual header"
```

---

### Task 3: Các khối nội dung còn lại và trạng thái quiz "sắp có"

**Files:**
- Modify: `frontend/components/blocks/BlockRenderer.tsx`, `CodeRenderer.tsx`, `FormulaRenderer.tsx`, `InteractiveRenderer.tsx`, `TermRefCard.tsx`, `ResourceRefCard.tsx`
- Delete: `frontend/components/blocks/QuizBlock.tsx`
- Test: `frontend/components/blocks/BlockRenderer.test.tsx`

- [ ] **Step 1: Viết test thất bại**

`frontend/components/blocks/BlockRenderer.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Block } from '@scipal/types';
import { countRawColors } from '../../lib/theme/rawColors';
import { BlockRenderer } from './BlockRenderer';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'vi', t: (o: { en: string; vi: string }) => o.vi }),
}));
vi.mock('next/dynamic', () => ({ default: () => () => null }));

const QUESTION_ID = '5f0c2f7e-2a39-4a8e-9b1b-3a7f0d6c1e11';

const blocks: Block[] = [
  { type: 'quiz', question_id: QUESTION_ID },
  { type: 'formula', katex: 'a^2+b^2=c^2', caption: { en: 'Pythagoras', vi: 'Định lí Pythagoras' } },
  { type: 'code', tabs: [{ lang: 'python', code: 'print(1)' }] },
  { type: 'term-ref', term_id: '0b6f9c1a-7d2e-4f3a-8c5b-1e2d3c4b5a69' },
  { type: 'resource-ref', resource_id: '1c7a0d2b-8e3f-4a4b-9d6c-2f3e4d5c6b7a' },
  {
    type: 'interactive',
    kind: 'algorithm-sim',
    heading: { en: 'Binary search', vi: 'Tìm kiếm nhị phân' },
    offline: true,
    config: {},
  } as Block,
];

describe('BlockRenderer', () => {
  it('shows the practice quiz as coming soon without leaking the question id', () => {
    const html = renderToStaticMarkup(<BlockRenderer block={blocks[0]} />);
    expect(html).toContain('Câu hỏi luyện tập sắp có');
    expect(html).not.toContain(QUESTION_ID);
    expect(html).toContain('role="note"');
  });

  it.each(blocks.map((block) => [block.type, block] as const))('%s uses tokens only', (_type, block) => {
    const html = renderToStaticMarkup(<BlockRenderer block={block} />);
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('uppercase');
  });

  it('gives code tabs a 44px target and marks the active tab', () => {
    const html = renderToStaticMarkup(
      <BlockRenderer block={{ type: 'code', tabs: [{ lang: 'python', code: 'x' }, { lang: 'cpp', code: 'y' }] }} />,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/aria-selected="true"[^>]*>python|>python<\/button>/);
    expect(html).toContain('min-h-11');
  });
});
```

(Nếu `InteractiveBlock` trong `@scipal/types` bắt buộc thêm trường khác, bổ sung đúng trường đó vào object test theo `packages/types/src/block.ts`.)

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- BlockRenderer` — Expected: FAIL (HTML chứa `question_id`, màu thô, `uppercase`).

- [ ] **Step 3: `BlockRenderer` — quiz "sắp có", xoá `QuizBlock`**

Trong `BlockRenderer.tsx`: đổi `const { lang } = useLanguage();` thành `const { lang, t } = useLanguage();`, xoá `import { QuizBlock } from './QuizBlock';`, và thay case `quiz`:

```tsx
    case 'quiz':
      return (
        <div role="note" className="rounded-lg border border-dashed border-edge bg-surface p-4 text-sm text-ink-muted">
          <p className="font-semibold text-ink">{t({ en: 'Practice question coming soon', vi: 'Câu hỏi luyện tập sắp có' })}</p>
          <p className="mt-1">
            {t({
              en: 'This question will appear here once practice checking is ready.',
              vi: 'Câu hỏi sẽ hiện ở đây khi phần chấm luyện tập sẵn sàng.',
            })}
          </p>
        </div>
      );
```

Xoá file `frontend/components/blocks/QuizBlock.tsx`.

- [ ] **Step 4: `CodeRenderer`**

- Khung: `className="overflow-hidden rounded-lg border border-line bg-surface"` (bỏ `my-4`, `shadow-sm`).
- Thanh tab: `<div role="tablist" aria-label={t({ en: 'Code language', vi: 'Ngôn ngữ mã' })} className="flex border-b border-line bg-surface-sunken">` (thêm `const { t } = useLanguage();` và import `useLanguage` từ `@scipal/hooks`).
- Mỗi nút tab: thêm `type="button" role="tab" aria-selected={i === activeTab}`, bỏ `style`, `className`:

```tsx
            className={`min-h-11 px-4 font-mono text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus ${
              i === activeTab ? 'border-b-2 border-accent bg-surface text-ink' : 'text-ink-muted hover:text-ink'
            }`}
```

- Loading của Monaco: `<div className="flex h-[280px] items-center justify-center bg-surface-sunken text-sm text-ink-muted">Đang tải mã nguồn…</div>` — chuỗi này nằm ngoài component nên giữ tiếng Việt và thêm tiếng Anh: `Đang tải mã nguồn… / Loading code…`.

- [ ] **Step 5: `FormulaRenderer`, `InteractiveRenderer`, `TermRefCard`, `ResourceRefCard`**

`FormulaRenderer`: khung `className="rounded-lg border border-line bg-surface-sunken p-4 text-center text-ink"`; caption `className="mt-2 text-sm text-ink-muted"`.

`InteractiveRenderer`:
- Offline: `<div role="note" className="rounded-lg border border-dashed border-edge bg-surface p-6 text-center text-sm text-ink-muted">` và bỏ emoji 🔌.
- Khung chính: `className="rounded-lg border border-line bg-surface p-5"` (bỏ `border-2` + `style` accent); tiêu đề `className="mb-1 font-semibold text-ink"`; caption `text-ink-muted`.
- Ô giả lập: `className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg bg-surface-sunken text-sm text-ink-muted"`; bỏ emoji ⚙️ và dòng `[{block.kind} simulation]` (mono, IN HOA); giữ câu song ngữ hiện có.

`TermRefCard`:

```tsx
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-accent px-4 text-sm font-semibold text-accent-ink transition-colors hover:bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
```

(xoá `style`; giữ emoji 📖 với `aria-hidden`.)

`ResourceRefCard`: link `className="block rounded-lg border border-line bg-surface p-4 transition-colors hover:border-edge focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"`; tiêu đề `text-sm font-semibold text-ink group-hover:text-action`; URL `mt-1 block truncate pl-6 text-sm text-ink-muted`.

- [ ] **Step 6: Chạy test để thấy qua**

Run: `pnpm --filter @scipal/web test -- BlockRenderer` — Expected: PASS.

- [ ] **Step 7: Typecheck, baseline, commit**

Run: `pnpm turbo typecheck` — Expected: 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — Expected: PASS; baseline không còn file nào trong `components/blocks/`.

```bash
git add -A frontend/components/blocks frontend/theme-baseline.json
git commit -m "feat(web): content blocks on tokens; practice quiz shows a coming-soon note"
```

---

### Task 4: Trang môn, danh sách chủ đề, nhóm lớp theo cấp

**Files:**
- Create: `frontend/features/lessons/SubjectHeader.tsx`
- Test: `frontend/features/lessons/SubjectHeader.test.tsx`
- Modify: `frontend/app/[subject]/page.tsx`, `frontend/features/lessons/TopicAccordion.tsx`, `frontend/features/lessons/SubjectPageNotices.tsx`

**Interfaces:**
- Consumes: `LevelScope`, `levelOfGrade`, `LevelLine({ levels })`, `GradeHeading({ grade })`, `InDevelopmentNotice()`.
- Produces: `SubjectHeader(props: { subject: { slug: string; name_en: string; name_vi: string; icon: string; levels: EducationLevel[] }; topicCount: number; lessonCount: number })`.

- [ ] **Step 1: Viết test thất bại**

`frontend/features/lessons/SubjectHeader.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { SubjectHeader } from './SubjectHeader';
import { TopicAccordion } from './TopicAccordion';

let lang: 'en' | 'vi' = 'vi';
vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang, t: (o: { en: string; vi: string }) => o[lang] }),
}));

const subject = { slug: 'informatics', name_en: 'Informatics', name_vi: 'Tin học', icon: '</>', levels: ['upper_secondary' as const] };

describe('SubjectHeader', () => {
  it('is bilingual with counts and a breadcrumb', () => {
    lang = 'vi';
    let html = renderToStaticMarkup(<SubjectHeader subject={subject} topicCount={4} lessonCount={12} />);
    expect(html).toMatch(/<h1[^>]*>Tin học<\/h1>/);
    expect(html).toContain('4 chủ đề, 12 bài học');
    expect(html).toContain('Trang chủ');
    lang = 'en';
    html = renderToStaticMarkup(<SubjectHeader subject={subject} topicCount={1} lessonCount={1} />);
    expect(html).toMatch(/<h1[^>]*>Informatics<\/h1>/);
    expect(html).toContain('1 topic, 1 lesson');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('TopicAccordion', () => {
  const topics = [
    {
      id: 't1',
      name_en: 'Algorithms',
      name_vi: 'Thuật toán',
      lessons: [{ id: 'l1', slug: 'tim-kiem', title_en: 'Search', title_vi: 'Tìm kiếm', sort_order: 1 }],
    },
  ];

  it('links the whole lesson row and uses tokens only', () => {
    lang = 'vi';
    const html = renderToStaticMarkup(<TopicAccordion topics={topics} subjectSlug="informatics" />);
    expect(html).toContain('href="/informatics/tim-kiem"');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('1 bài học');
    expect(html).not.toContain('Học ngay');
    expect(html).not.toContain('→');
    expect(countRawColors(html).total).toBe(0);
  });
});
```

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- SubjectHeader` — Expected: FAIL.

- [ ] **Step 3: Viết `SubjectHeader.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from '../landing/educationLevel';
import { LevelLine } from './SubjectPageNotices';

interface SubjectHeaderProps {
  subject: { slug: string; name_en: string; name_vi: string; icon: string; levels: EducationLevel[] };
  topicCount: number;
  lessonCount: number;
}

export function SubjectHeader({ subject, topicCount, lessonCount }: SubjectHeaderProps) {
  const { lang, t } = useLanguage();
  const name = lang === 'en' ? subject.name_en : subject.name_vi;
  const counts = t({
    en: `${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}, ${lessonCount} ${lessonCount === 1 ? 'lesson' : 'lessons'}`,
    vi: `${topicCount} chủ đề, ${lessonCount} bài học`,
  });

  return (
    <header className="mb-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/"
          className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ en: 'Home', vi: 'Trang chủ' })}
        </Link>
      </nav>
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--accent)_12%,var(--surface))] text-2xl text-accent-ink"
        >
          {subject.icon}
        </span>
        <div>
          <h1 className="text-3xl font-bold text-ink">{name}</h1>
          <LevelLine levels={subject.levels} />
        </div>
      </div>
      <p className="mt-4 text-base text-ink-muted">{counts}</p>
    </header>
  );
}
```

- [ ] **Step 4: `SubjectPageNotices`**

- `LevelLine`: `className="mt-1 text-sm text-ink-muted"`.
- `GradeHeading`: `<h2 className="text-lg font-semibold text-ink">` (bỏ mono/IN HOA/tracking).
- `InDevelopmentNotice`: dùng `EmptyState`:

```tsx
import { EmptyState } from '../../components/ui/empty-state';
// …
export function InDevelopmentNotice() {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t({ en: 'In development', vi: 'Đang biên soạn' })}
      description={t({ en: 'Lessons for this subject are being written.', vi: 'Bài học của môn này đang được biên soạn.' })}
    />
  );
}
```

- [ ] **Step 5: Viết lại `TopicAccordion`**

Giữ state/logic; thay markup:

```tsx
  const { lang, t } = useLanguage();
  // …
  return (
    <div className="flex flex-col gap-3">
      {topics.map((topic, topicIdx) => {
        const isOpen = open === topic.id;
        const panelId = `topic-${topic.id}`;
        return (
          <section key={topic.id} className="overflow-hidden rounded-xl border border-line bg-surface">
            <h3>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                onClick={() => setOpen(isOpen ? null : topic.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-sm font-semibold text-ink-muted">
                  {topicIdx + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold text-ink">{lang === 'en' ? topic.name_en : topic.name_vi}</span>
                  <span className="block text-sm text-ink-muted">
                    {t({
                      en: `${topic.lessons.length} ${topic.lessons.length === 1 ? 'lesson' : 'lessons'}`,
                      vi: `${topic.lessons.length} bài học`,
                    })}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className={`h-5 w-5 text-ink-muted transition-transform motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h3>
            {isOpen && (
              <ol id={panelId} className="flex flex-col border-t border-line">
                {topic.lessons.map((lesson, lessonIdx) => (
                  <li key={lesson.id} className="border-b border-line last:border-0">
                    <Link
                      href={`/${subjectSlug}/${lesson.slug}`}
                      className="flex min-h-11 items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"
                    >
                      <span className="w-6 shrink-0 text-sm text-ink-muted">{lessonIdx + 1}.</span>
                      <span className="flex-1">
                        <span className="block text-sm font-semibold text-ink">{lang === 'en' ? lesson.title_en : lesson.title_vi}</span>
                        <span className="block text-sm text-ink-muted">{lang === 'en' ? lesson.title_vi : lesson.title_en}</span>
                      </span>
                      <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-action" />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
```

Thêm `import { ChevronDown, ChevronRight } from 'lucide-react';`.

- [ ] **Step 6: Viết lại trang môn**

`frontend/app/[subject]/page.tsx`, phần render nhánh lỗi và nhánh thành công:

```tsx
  if (result.kind === 'error') {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <LoadErrorNotice
          message={{ en: 'Could not load this subject.', vi: 'Chưa tải được dữ liệu môn học.' }}
          retryHref={`/${subjectSlug}`}
        />
      </main>
    );
  }
  // … topicCount, lessonCount giữ nguyên …
  return (
    <SubjectProvider slug={subject.slug} accentColor={subject.accent_color}>
      <main className="mx-auto w-full max-w-4xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <SubjectHeader subject={subject} topicCount={topicCount} lessonCount={lessonCount} />
        {gradeGroups.length === 0 ? (
          <InDevelopmentNotice />
        ) : (
          <div className="flex flex-col gap-10">
            {gradeGroups.map((group) => (
              <LevelScope key={group.grade} level={levelOfGrade(group.grade)} className="flex flex-col gap-3">
                <GradeHeading grade={group.grade} />
                <TopicAccordion topics={group.topics} subjectSlug={subject.slug} />
              </LevelScope>
            ))}
          </div>
        )}
      </main>
    </SubjectProvider>
  );
```

Import: `LevelScope` cùng `SubjectProvider` từ `@scipal/ui`; `SubjectHeader` từ `@/features/lessons/SubjectHeader`; `levelOfGrade` từ `@/features/landing/educationLevel`; bỏ `Link` nếu không còn dùng.

Lưu ý thứ tự: ở trang môn, `LevelScope` nằm **trong** `SubjectProvider`, nên `--accent-ink` bên trong mỗi nhóm lớp vẫn trộn với `--ink` của cấp shell (Global Constraints). Trong `TopicAccordion` không dùng `text-accent-ink`, nên không ảnh hưởng.

- [ ] **Step 7: Chạy test, kiểm trình duyệt, baseline, commit**

Run: `pnpm --filter @scipal/web test -- SubjectHeader` — Expected: PASS.
Trình duyệt `/informatics`: tiêu đề/đếm đổi theo EN/VI; nhóm lớp 10–12 tông THPT; mở/đóng chủ đề bằng bàn phím (Enter/Space), focus nhìn thấy; 375px không cuộn ngang. Mở một môn có accent sáng (vd Sinh học `#65a30d`): ô icon đọc rõ.
Run: `pnpm turbo typecheck` — 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — PASS; baseline không còn `app/[subject]/page.tsx`, `features/lessons/*`.

```bash
git add "frontend/app/[subject]/page.tsx" frontend/features/lessons frontend/theme-baseline.json
git commit -m "feat(web): bilingual subject page with level-scoped grade groups"
```

---

### Task 5: Thanh hoàn thành bài và AI Tutor

**Files:**
- Modify: `frontend/features/lessons/LessonCompletionBar.tsx`, `frontend/features/ai-tutor/AiTutorButton.tsx`, `frontend/features/ai-tutor/AiTutorPanel.tsx`
- Test: `frontend/features/lessons/LessonCompletionBar.test.tsx`

- [ ] **Step 1: Viết test thất bại**

`frontend/features/lessons/LessonCompletionBar.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { LessonCompletionBar } from './LessonCompletionBar';
import { AiTutorButton } from '../ai-tutor/AiTutorButton';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'en', t: (o: { en: string; vi: string }) => o.en }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/informatics/tim-kiem', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('../../lib/supabase', () => ({ createBrowserClient: vi.fn() }));
vi.mock('../../lib/api', () => ({ postScoreLesson: vi.fn() }));
vi.mock('../survey/PostLessonSurvey', () => ({ PostLessonSurvey: () => null }));

describe('LessonCompletionBar', () => {
  it('is bilingual, uses the action button and tokens only', () => {
    const html = renderToStaticMarkup(<LessonCompletionBar lessonId="l1" subjectSlug="informatics" />);
    expect(html).toContain('Mark as complete');
    expect(html).toContain('bg-action');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
  });
});

describe('AiTutorButton', () => {
  it('has an English label, a 44px target and tokens only', () => {
    const html = renderToStaticMarkup(<AiTutorButton lessonId="l1" subjectSlug="informatics" />);
    expect(html).toContain('aria-label="Open AI tutor"');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('var(--accent');
  });
});
```

`LessonCompletionBar` và `AiTutorPanel` phải import `lib/api`, `lib/supabase`, `survey/PostLessonSurvey` bằng đường dẫn tương đối để mock ở trên khớp (Global Constraints).

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- LessonCompletionBar` — Expected: FAIL.

- [ ] **Step 3: `LessonCompletionBar`**

- Import tương đối: `import { postScoreLesson } from '../../lib/api'; import { createBrowserClient } from '../../lib/supabase'; import { PostLessonSurvey } from '../survey/PostLessonSurvey';` và thêm `useLanguage`, `buttonVariants` (`../../components/ui/button`), `Alert` (`../../components/ui/alert`), `CircleCheck` (`lucide-react`).
- Mọi chuỗi qua `t`:

| VI hiện có | EN |
|---|---|
| Bạn đã nắm vững nội dung bài học này chưa? | Have you got the hang of this lesson? |
| Ghi nhận tiến trình để tích lũy XP và duy trì chuỗi học liên tục | Save your progress to earn XP and keep your streak |
| Đang ghi nhận... → `Đang lưu…` | Saving… |
| Đánh dấu hoàn thành | Mark as complete |
| Chưa thể lưu tiến trình. Vui lòng thử lại khi kết nối ổn định. | Could not save your progress. Check your connection and try again. |
| Xuất sắc! Bạn đã nhận được +{xp} XP → `Đã lưu bài. Bạn nhận +{xp} XP.` | Lesson saved. You earned {xp} XP. |
| Bài học đã được ghi nhận hoàn thành | This lesson was already saved as complete |
| Tiến trình đã được lưu lại trong hồ sơ cá nhân. | Your progress is saved in your profile. |
| Xem bảng tiến trình | View progress |
| Bài tiếp theo → | **Về danh sách bài / Back to lessons** |

- Khung: `className="mt-10 rounded-xl border border-line bg-surface p-6 text-center"`.
- Nút hoàn thành: `className={buttonVariants({ size: 'lg' })}`, bỏ `style`, bỏ `✓` và hiệu ứng `hover:scale`.
- Lỗi: `<Alert tone="danger" className="mt-3 text-left">{t(…)}</Alert>` thay cho `<p role="alert">`.
- Trạng thái xong: thay emoji 🎉 bằng `<CircleCheck aria-hidden="true" className="mx-auto h-10 w-10 text-success" />`; tiêu đề `text-lg font-bold text-ink`; bỏ `animate-in fade-in zoom-in-95`.
- Hai link: "Xem tiến trình" `buttonVariants({ variant: 'outline' })`; "Về danh sách bài" `buttonVariants()`.
- Vạch trên khảo sát: `border-t border-dashed border-line`.

- [ ] **Step 4: `AiTutorButton` và `AiTutorPanel`**

`AiTutorButton`: thêm `const { t } = useLanguage();` (import từ `@scipal/hooks`); nút:

```tsx
        type="button"
        disabled={!online}
        onClick={() => setOpen(true)}
        title={online ? t({ en: 'AI tutor', vi: 'Gia sư AI' }) : t({ en: 'Needs an internet connection', vi: 'Cần kết nối mạng' })}
        aria-label={t({ en: 'Open AI tutor', vi: 'Mở Gia sư AI' })}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-action text-2xl text-action-ink shadow-lg transition-colors hover:bg-action-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-40"
```

(bỏ `style` và `hover:scale`).

`AiTutorPanel`: chuyển theo **Bảng đổi màu dùng chung**; header panel `bg-action text-action-ink` (bỏ `style` accent); nút đóng `min-h-11 min-w-11` + `aria-label` song ngữ; tin nhắn người dùng `bg-action text-action-ink`, tin nhắn tutor `bg-surface-sunken text-ink`; ô nhập `min-h-11 rounded-full border border-edge bg-surface px-4 text-base text-ink focus-visible:outline …focus`; nút gửi `min-h-11 rounded-full bg-action px-4 text-sm font-semibold text-action-ink hover:bg-action-hover disabled:opacity-40`; nền danh sách `bg-surface-sunken`; khung `bg-surface border border-line`. Chuỗi hiển thị chưa song ngữ thì bọc `t({ en, vi })`. Không đổi logic gửi/nhận.

- [ ] **Step 5: Chạy test, typecheck, baseline, commit**

Run: `pnpm --filter @scipal/web test -- LessonCompletionBar` — PASS. `pnpm turbo typecheck` — 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — PASS; baseline không còn `features/lessons/LessonCompletionBar.tsx`, `features/ai-tutor/*`.

```bash
git add frontend/features/lessons frontend/features/ai-tutor frontend/theme-baseline.json
git commit -m "feat(web): bilingual completion bar and AI tutor on theme tokens"
```

---

### Task 6: Glossary

**Files:**
- Create: `frontend/features/glossary/GlossaryHeader.tsx`
- Modify: `frontend/app/glossary/page.tsx`, `frontend/features/glossary/GlossarySearch.tsx`
- Test: `frontend/features/glossary/GlossarySearch.test.tsx`

- [ ] **Step 1: Viết test thất bại**

`frontend/features/glossary/GlossarySearch.test.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { countRawColors } from '../../lib/theme/rawColors';
import { GlossaryHeader } from './GlossaryHeader';
import { GlossarySearch } from './GlossarySearch';

vi.mock('@scipal/hooks', () => ({
  useLanguage: () => ({ lang: 'en', t: (o: { en: string; vi: string }) => o.en }),
}));

describe('Glossary', () => {
  it('header is bilingual and uses tokens only', () => {
    const html = renderToStaticMarkup(<GlossaryHeader />);
    expect(html).toMatch(/<h1[^>]*>Glossary<\/h1>/);
    expect(countRawColors(html).total).toBe(0);
  });

  it('search has a labelled 44px input and tokens only', () => {
    const html = renderToStaticMarkup(<GlossarySearch terms={[]} />);
    expect(html).toMatch(/<label[^>]*for="glossary-search"/);
    expect(html).toContain('id="glossary-search"');
    expect(html).toContain('min-h-11');
    expect(countRawColors(html).total).toBe(0);
    expect(html).not.toContain('uppercase');
  });
});
```

(Nếu prop `terms` của `GlossarySearch` có kiểu yêu cầu khác mảng rỗng, giữ `[]` — mảng rỗng hợp lệ với mọi kiểu mảng.)

- [ ] **Step 2: Chạy test để thấy thất bại**

Run: `pnpm --filter @scipal/web test -- GlossarySearch` — Expected: FAIL.

- [ ] **Step 3: `GlossaryHeader.tsx` và trang**

```tsx
'use client';

import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';

export function GlossaryHeader() {
  const { t } = useLanguage();
  return (
    <header className="mb-8">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link
          href="/"
          className="rounded text-ink-muted underline-offset-4 hover:text-ink hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {t({ en: 'Home', vi: 'Trang chủ' })}
        </Link>
      </nav>
      <h1 className="text-3xl font-bold text-ink sm:text-4xl">{t({ en: 'Glossary', vi: 'Từ điển thuật ngữ' })}</h1>
      <p className="mt-2 max-w-prose text-base text-ink-muted">
        {t({
          en: 'Look up English–Vietnamese definitions and how each term is used in lessons.',
          vi: 'Tra định nghĩa Anh – Việt và cách dùng từng thuật ngữ trong bài học.',
        })}
      </p>
    </header>
  );
}
```

`frontend/app/glossary/page.tsx`:

```tsx
import { getAllTerms } from '@/features/glossary/termQueries';
import { GlossaryHeader } from '@/features/glossary/GlossaryHeader';
import { GlossarySearch } from '@/features/glossary/GlossarySearch';

export default async function GlossaryPage() {
  const terms = await getAllTerms();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
      <GlossaryHeader />
      <GlossarySearch terms={terms} />
    </main>
  );
}
```

- [ ] **Step 4: `GlossarySearch`**

- Ô tìm: thêm `<label htmlFor="glossary-search" className="sr-only">{t({ en: 'Search terms', vi: 'Tìm thuật ngữ' })}</label>`; input `id="glossary-search"`, `className="min-h-11 w-full rounded-xl border border-edge bg-surface py-3 pl-11 pr-12 text-base text-ink placeholder:text-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"`; icon `text-ink-muted`; nút xoá `min-h-11 min-w-11` + `aria-label` song ngữ, `text-ink-muted hover:text-ink`.
- Chip lọc: nút `type="button"` + `aria-pressed`, `min-h-11 rounded-full px-4 text-sm font-semibold`, chọn → `bg-action text-action-ink`, chưa chọn → `border border-edge bg-surface text-ink hover:bg-surface-sunken`.
- Dòng đếm kết quả: `text-sm text-ink-muted` (bỏ mono).
- Thẻ thuật ngữ: `rounded-xl border border-line bg-surface p-6` (bỏ shadow/hover viền emerald); tên `text-xl font-bold text-ink`; tên ngôn ngữ còn lại `text-sm font-medium text-ink-muted` (bỏ mono); nhãn loại từ `rounded-md bg-surface-sunken px-2 py-0.5 text-sm text-ink-muted` (bỏ mono/IN HOA); định nghĩa `text-base text-ink`; dòng phụ `text-sm text-ink-muted`; ví dụ `rounded-lg bg-surface-sunken p-3 text-sm text-ink-muted`, chữ "Ví dụ:" `font-semibold text-ink`.
- Trạng thái trống: `EmptyState` (`../../components/ui/empty-state`) với `title={t({ en: 'No matching terms', vi: 'Không có thuật ngữ phù hợp' })}` và mô tả song ngữ gợi ý đổi từ khoá hoặc bỏ bộ lọc; bỏ emoji 🔍.
- Mọi chuỗi cứng còn lại bọc `t({ en, vi })`.

- [ ] **Step 5: Chạy test, kiểm trình duyệt, baseline, commit**

Run: `pnpm --filter @scipal/web test -- GlossarySearch` — PASS.
Trình duyệt `/glossary`: gõ tìm, lọc, trạng thái trống, EN/VI, 375px, Tab qua chip.
`pnpm turbo typecheck` — 7/7. Cập nhật baseline; `pnpm --filter @scipal/web test` — PASS; baseline không còn `app/glossary/page.tsx`, `features/glossary/*`.

```bash
git add frontend/app/glossary frontend/features/glossary frontend/theme-baseline.json
git commit -m "feat(web): bilingual glossary on theme tokens"
```

---

### Task 7: Nghiệm thu và cập nhật trạng thái

**Files:**
- Modify: `PROJECT_STATE.md`, `DESIGN.md`

- [ ] **Step 1: Nghiệm thu**

Run: `pnpm turbo typecheck` — 7/7. `pnpm turbo test` — PASS. `pnpm turbo build` — thành công.
Mở `frontend/theme-baseline.json`: không còn mục nào dưới `app/[subject]/`, `app/glossary/`, `components/blocks/`, `features/lessons/`, `features/glossary/`, `features/ai-tutor/`.
Grep `QuizBlock` trong `frontend/` — 0 kết quả. Grep `SERVICE_ROLE` trong `frontend/ mobile/ packages/` — 0.

- [ ] **Step 2: `DESIGN.md`**

Thêm mục "Trang bài học": tờ vở `surface` + dải lề accent (`components/blocks/notebook.module.css`), dòng kẻ 1.75rem (Tiểu học ô li), khoảng cách dọc bội 1.75rem, markdown gán kiểu trong `TheoryRenderer`, `LevelScope` theo lớp của bài đặt ngoài `SubjectProvider`, trang môn bọc từng nhóm lớp.

- [ ] **Step 3: `PROJECT_STATE.md`**

Đầu "Recent Decisions":

```markdown
- **26/09 — Giao diện theo cấp học, giai đoạn 3 (luồng học):** Trang bài là tờ vở theo cấp của bài (dải lề màu môn, dòng kẻ/ô li), markdown có kiểu chữ (trước đó `prose` không có plugin nên không có tác dụng); trang môn, danh sách chủ đề, khối nội dung, thanh hoàn thành, AI Tutor, glossary dùng token và song ngữ. Khối quiz hiện "Câu hỏi luyện tập sắp có"; xoá `QuizBlock` (chưa dùng, sẽ lộ `data.answer`). Chưa làm: quiz thật, nối thẻ thuật ngữ/tài liệu với dữ liệu, API AI Tutor.
```

Trong "Known Issues / Blockers" thêm: "`ResourceRefCard` vẫn trỏ cứng tới visualgo.net và `TermRefCard` chưa đọc bảng `terms` — khối `resource-ref`/`term-ref` chưa hiển thị dữ liệu thật."

- [ ] **Step 4: Commit**

```bash
git add PROJECT_STATE.md DESIGN.md
git commit -m "docs: record level theming phase 3 completion"
```
