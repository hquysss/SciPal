'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { LessonStatus } from '@scipal/supabase';

import { LessonDeleteActions } from './LessonDeleteActions';
import { LessonStatusBadge } from './lessonStatusBadge';
import type { AuthoringLessonData } from './authoringQueries';
import { Bi } from '@/components/ui/bilingual';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { INPUT_CLASS, Input } from '@/components/ui/input';

export type LessonListItem = Pick<
  AuthoringLessonData,
  | 'id'
  | 'subject_id'
  | 'subject_slug'
  | 'subject_name_en'
  | 'subject_name_vi'
  | 'topic_name_en'
  | 'topic_name_vi'
  | 'slug'
  | 'title_vi'
  | 'title_en'
  | 'grade'
  | 'status'
  | 'published_at'
  | 'delete_requested_at'
  | 'updated_at'
  | 'block_count'
>;

interface LessonListProps {
  lessons: LessonListItem[];
  role: 'teacher' | 'admin';
}

const STATUS_OPTIONS: Array<{ value: LessonStatus; en: string; vi: string }> = [
  { value: 'draft', en: 'Draft', vi: 'Bản nháp' },
  { value: 'pending_review', en: 'Pending review', vi: 'Chờ duyệt' },
  { value: 'published', en: 'Published', vi: 'Đã xuất bản' },
  { value: 'rejected', en: 'Changes requested', vi: 'Cần chỉnh sửa' },
];

function normalizeSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi')
    .trim();
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export function LessonList({ lessons, role }: LessonListProps) {
  const { lang, t } = useLanguage();
  const [query, setQuery] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [grade, setGrade] = useState('');
  const [status, setStatus] = useState<LessonStatus | ''>('');

  const subjects = useMemo(() => {
    const unique = new Map<string, { id: string; name_en: string; name_vi: string }>();
    for (const lesson of lessons) {
      unique.set(lesson.subject_id, {
        id: lesson.subject_id,
        name_en: lesson.subject_name_en,
        name_vi: lesson.subject_name_vi,
      });
    }
    return [...unique.values()].sort((a, b) =>
      (lang === 'en' ? a.name_en : a.name_vi).localeCompare(lang === 'en' ? b.name_en : b.name_vi, lang),
    );
  }, [lang, lessons]);

  const grades = useMemo(
    () => [...new Set(lessons.map((lesson) => lesson.grade))].sort((a, b) => a - b),
    [lessons],
  );

  const normalizedQuery = normalizeSearch(query);
  const filteredLessons = useMemo(
    () =>
      lessons.filter((lesson) => {
        const haystack = normalizeSearch(
          [
            lesson.title_vi,
            lesson.title_en,
            lesson.topic_name_vi,
            lesson.topic_name_en,
            lesson.subject_name_vi,
            lesson.subject_name_en,
          ].join(' '),
        );

        return (
          (!normalizedQuery || haystack.includes(normalizedQuery)) &&
          (!subjectId || lesson.subject_id === subjectId) &&
          (!grade || lesson.grade === Number(grade)) &&
          (!status || lesson.status === status)
        );
      }),
    [grade, lessons, normalizedQuery, status, subjectId],
  );

  const hasFilters = Boolean(normalizedQuery || subjectId || grade || status);

  function clearFilters() {
    setQuery('');
    setSubjectId('');
    setGrade('');
    setStatus('');
  }

  return (
    <div className="flex flex-col gap-4">
      <section aria-label={t({ en: 'Lesson filters', vi: 'Bộ lọc bài giảng' })} className="rounded-xl border border-edge bg-surface p-3 sm:p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <SlidersHorizontal aria-hidden="true" className="size-4 text-action" />
          <Bi en="Filter the list" vi="Lọc danh sách" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1.6fr)_repeat(3,minmax(0,0.8fr))]">
          <label className="relative block sm:col-span-2 lg:col-span-1">
            <span className="sr-only"><Bi en="Search lessons" vi="Tìm bài giảng" /></span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t({ en: 'Search title or topic…', vi: 'Tìm tên bài hoặc chủ đề…' })}
              aria-label={t({ en: 'Search lessons', vi: 'Tìm bài giảng' })}
              className="pl-9"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-muted">
            <Bi en="Subject" vi="Môn học" />
            <select className={INPUT_CLASS} value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>
              <option value="">{t({ en: 'All subjects', vi: 'Tất cả môn' })}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>{lang === 'en' ? subject.name_en : subject.name_vi}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-muted">
            <Bi en="Grade" vi="Lớp" />
            <select className={INPUT_CLASS} value={grade} onChange={(event) => setGrade(event.target.value)}>
              <option value="">{t({ en: 'All grades', vi: 'Tất cả lớp' })}</option>
              {grades.map((value) => (
                <option key={value} value={value}>{t({ en: `Grade ${value}`, vi: `Lớp ${value}` })}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-ink-muted">
            <Bi en="Status" vi="Trạng thái" />
            <select
              className={INPUT_CLASS}
              value={status}
              onChange={(event) => setStatus(event.target.value as LessonStatus | '')}
            >
              <option value="">{t({ en: 'All statuses', vi: 'Tất cả trạng thái' })}</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{t(option)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex min-h-9 flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <p aria-live="polite" className="text-sm text-ink-muted">
            {t({
              en: `Showing ${filteredLessons.length}/${lessons.length} lessons`,
              vi: `Đang xem ${filteredLessons.length}/${lessons.length} bài`,
            })}
          </p>
          {hasFilters ? (
            <button type="button" onClick={clearFilters} className={buttonVariants({ variant: 'ghost' })}>
              <X aria-hidden="true" className="size-4" />
              <Bi en="Clear filters" vi="Xóa bộ lọc" />
            </button>
          ) : null}
        </div>
      </section>

      {filteredLessons.length ? (
        <ul className="flex flex-col gap-3">
          {filteredLessons.map((item) => (
            <li key={item.id}>
              <Card className="flex-col gap-4 px-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold text-ink-muted">{lang === 'en' ? item.subject_name_en : item.subject_name_vi} · <Bi en={`Grade ${item.grade}`} vi={`Lớp ${item.grade}`} /></span>
                    <LessonStatusBadge status={item.status} />
                    <span className="text-ink-muted"><Bi en="Updated" vi="Cập nhật" /> {formatUpdatedAt(item.updated_at)}</span>
                    {item.delete_requested_at ? (
                      <Badge variant="warning">
                        {role === 'admin' ? <Bi en="Teacher asked to delete" vi="Giáo viên yêu cầu xóa" /> : <Bi en="Deletion requested" vi="Đã gửi yêu cầu xóa" />}
                      </Badge>
                    ) : null}
                  </div>
                  <h3 className="text-base font-semibold text-ink">{lang === 'en' ? item.title_en : item.title_vi}</h3>
                  <p className="text-sm text-ink-muted">
                    {lang === 'en' ? item.title_vi : item.title_en} · {item.block_count} <Bi en="blocks" vi="khối nội dung" /> · {lang === 'en' ? item.topic_name_en : item.topic_name_vi}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.status === 'published' ? (
                      <Link href={`/${item.subject_slug}/${item.slug}`} className={buttonVariants({ variant: 'outline' })}>
                        <Bi en="View as student" vi="Xem như học sinh" />
                      </Link>
                    ) : (
                      <span className="text-sm text-ink-muted"><Bi en="Not published yet" vi="Chưa xuất bản" /></span>
                    )}
                    <Link href={`/teacher/lessons/${item.id}`} className={buttonVariants()}>
                      <Bi en="Open in studio" vi="Mở trong studio" />
                    </Link>
                  </div>
                  <LessonDeleteActions
                    lessonId={item.id}
                    title={item.title_vi}
                    role={role}
                    status={item.status}
                    publishedAt={item.published_at}
                    deleteRequestedAt={item.delete_requested_at ?? null}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <section className="rounded-xl border border-dashed border-edge bg-surface p-6" aria-live="polite">
          <h3 className="text-base font-semibold text-ink"><Bi en="No matching lessons" vi="Không tìm thấy bài giảng phù hợp" /></h3>
          <p className="mt-1 text-sm text-ink-muted"><Bi en="Try another keyword or clear the filters." vi="Thử từ khóa khác hoặc xóa bộ lọc." /></p>
        </section>
      )}
    </div>
  );
}
