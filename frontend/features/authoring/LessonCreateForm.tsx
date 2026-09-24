'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import { useLanguage } from '@scipal/hooks';
import type { AuthoringSubjectOption, AuthoringTopicOption } from './authoringQueries';

interface LessonCreateFormProps {
  subjects: AuthoringSubjectOption[];
  topics: AuthoringTopicOption[];
}

export function LessonCreateForm({ subjects, topics }: LessonCreateFormProps) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [topicId, setTopicId] = useState('');
  const [grade, setGrade] = useState(10);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { data: { session } } = await createBrowserClient().auth.getSession();
      if (!session) {
        router.push(`/login?redirect=${encodeURIComponent('/teacher/lessons/new-lesson')}`);
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
      const response = await fetch(`${apiBase}/api/authoring/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title_vi: titleVi, title_en: titleEn, topic_id: topicId, grade }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? t({ en: 'The lesson could not be created.', vi: 'Không tạo được bài học.' }));
        return;
      }

      if (typeof data.lesson?.id !== 'string') {
        setError(t({ en: 'The server returned an invalid lesson.', vi: 'Máy chủ trả về dữ liệu bài học không hợp lệ.' }));
        return;
      }

      router.push(`/teacher/lessons/${data.lesson.id}`);
      router.refresh();
    } catch {
      setError(t({
        en: 'Cannot connect to the lesson service. Your lesson was not created.',
        vi: 'Không kết nối được máy chủ. Bài học chưa được tạo.',
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-gray-200/80 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-white/10 dark:bg-card/90 sm:p-7">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {t({ en: 'Lesson details', vi: 'Thông tin bài học' })}
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {t({
            en: 'New lessons start as drafts. After adding content, submit them for admin review; students see them only after approval.',
            vi: 'Bài mới được tạo thành bản nháp. Sau khi hoàn thiện nội dung, bạn gửi admin duyệt; học sinh chỉ thấy bài đã được thông qua.',
          })}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>{t({ en: 'Vietnamese title', vi: 'Tiêu đề tiếng Việt' })}</span>
          <input
            value={titleVi}
            onChange={(event) => setTitleVi(event.target.value)}
            maxLength={200}
            required
            placeholder={t({ en: 'e.g. Introduction to algorithms', vi: 'Ví dụ: Nhập môn thuật toán' })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>{t({ en: 'English title', vi: 'Tiêu đề tiếng Anh' })}</span>
          <input
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            maxLength={200}
            required
            placeholder={t({ en: 'e.g. Introduction to Algorithms', vi: 'Ví dụ: Introduction to Algorithms' })}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
        </label>

        <label className="block space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>{t({ en: 'Subject and topic', vi: 'Môn học và chủ đề' })}</span>
          <select
            value={topicId}
            onChange={(event) => setTopicId(event.target.value)}
            required
            disabled={topics.length === 0}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-purple-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">{t({ en: 'Select a topic', vi: 'Chọn chủ đề' })}</option>
            {subjects.map((subject) =>
              topics
                .filter((topic) => topic.subject_id === subject.id)
                .map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {lang === 'en' ? subject.name_en : subject.name_vi} · {lang === 'en' ? topic.name_en : topic.name_vi}
                  </option>
                )),
            )}
          </select>
          {topics.length === 0 && (
            <span className="block text-xs font-normal text-amber-700">
              {t({ en: 'No active subject topics are available.', vi: 'Chưa có chủ đề thuộc môn học đang hoạt động.' })}
            </span>
          )}
        </label>

        <label className="block space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <span>{t({ en: 'Grade', vi: 'Khối lớp' })}</span>
          <select
            value={grade}
            onChange={(event) => setGrade(Number(event.target.value))}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {[10, 11, 12].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <p className="text-xs text-gray-500">
          {t({ en: 'The lesson will be saved as a draft. You can submit it after adding content.', vi: 'Bài học được tạo ở trạng thái bản nháp. Bạn có thể gửi duyệt sau khi thêm nội dung.' })}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => router.push('/teacher/lessons')}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            {t({ en: 'Cancel', vi: 'Hủy' })}
          </button>
          <button
            type="submit"
            disabled={saving || topics.length === 0}
            className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? t({ en: 'Submitting…', vi: 'Đang gửi…' })
              : t({ en: 'Create draft', vi: 'Tạo bản nháp' })}
          </button>
        </div>
      </div>
    </form>
  );
}
