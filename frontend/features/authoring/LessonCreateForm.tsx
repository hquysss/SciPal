'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@scipal/supabase';
import { useLanguage } from '@scipal/hooks';
import { EDUCATION_LEVEL_LABELS } from '../landing/educationLevel';
import type { AuthoringSubjectOption, AuthoringTopicOption, AuthoringTrackOption } from './authoringQueries';
import { buildSubjectChoices, topicsFor, tracksFor } from './lessonFormOptions';
import { createAuthoringTopic } from './topicApi';

interface LessonCreateFormProps {
  subjects: AuthoringSubjectOption[];
  topics: AuthoringTopicOption[];
  tracks: AuthoringTrackOption[];
}

const NEW_TOPIC = '__new__';

const FIELD_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-normal text-gray-900 outline-none focus:border-purple-500 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white';
const LABEL_CLASS = 'block space-y-1.5 text-sm font-semibold text-gray-700 dark:text-gray-300';

async function getAccessToken(): Promise<string | null> {
  const { data: { session } } = await createBrowserClient().auth.getSession();
  return session?.access_token ?? null;
}

export function LessonCreateForm({ subjects, topics, tracks }: LessonCreateFormProps) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const choiceGroups = useMemo(() => buildSubjectChoices(subjects), [subjects]);
  const choices = useMemo(() => choiceGroups.flatMap((group) => group.items), [choiceGroups]);

  const [choiceKey, setChoiceKey] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [trackId, setTrackId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [localTopics, setLocalTopics] = useState(topics);
  const [newTopicEn, setNewTopicEn] = useState('');
  const [newTopicVi, setNewTopicVi] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [topicNotice, setTopicNotice] = useState<string | null>(null);
  const [titleVi, setTitleVi] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choice = choices.find((item) => item.key === choiceKey) ?? null;
  const availableTracks = choice && grade !== null ? tracksFor(tracks, choice.subjectId, grade) : [];
  const availableTopics = choice && grade !== null ? topicsFor(localTopics, choice.subjectId, grade) : [];
  const name = (item: { name_en: string; name_vi: string }) => (lang === 'en' ? item.name_en : item.name_vi);

  const canSubmit = Boolean(
    choice && grade !== null && topicId && topicId !== NEW_TOPIC && titleVi.trim() && titleEn.trim(),
  );

  const handleChoiceChange = (value: string) => {
    setChoiceKey(value);
    setGrade(null);
    setTrackId('');
    setTopicId('');
    setTopicNotice(null);
  };

  const handleGradeChange = (value: string) => {
    setGrade(value ? Number(value) : null);
    setTrackId('');
    setTopicId('');
    setTopicNotice(null);
  };

  const handleCreateTopic = async () => {
    if (!choice || grade === null) return;
    setError(null);
    setTopicNotice(null);
    setCreatingTopic(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent('/teacher/lessons/new-lesson')}`);
        return;
      }
      const result = await createAuthoringTopic(token, {
        subject_id: choice.subjectId,
        grade,
        name_en: newTopicEn.trim(),
        name_vi: newTopicVi.trim(),
      });
      setLocalTopics((prev) => (prev.some((topic) => topic.id === result.topic.id) ? prev : [...prev, result.topic]));
      setTopicId(result.topic.id);
      setNewTopicEn('');
      setNewTopicVi('');
      if (result.kind === 'existing') {
        setTopicNotice(t({ en: 'This topic already exists; it has been selected.', vi: 'Chủ đề này đã có; đã chọn sẵn.' }));
      }
    } catch (topicError) {
      setError(topicError instanceof Error ? topicError.message : t({ en: 'The topic could not be created.', vi: 'Không tạo được chủ đề.' }));
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || grade === null) return;
    setError(null);
    setSaving(true);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.push(`/login?redirect=${encodeURIComponent('/teacher/lessons/new-lesson')}`);
        return;
      }

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://sci-pal-backend.vercel.app';
      const response = await fetch(`${apiBase}/api/authoring/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title_vi: titleVi,
          title_en: titleEn,
          topic_id: topicId,
          grade,
          ...(trackId ? { track_id: trackId } : {}),
        }),
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
        <label className={LABEL_CLASS}>
          <span>{t({ en: 'Subject', vi: 'Môn học' })}</span>
          <select value={choiceKey} onChange={(event) => handleChoiceChange(event.target.value)} required className={FIELD_CLASS}>
            <option value="">{t({ en: 'Select a subject', vi: 'Chọn môn học' })}</option>
            {choiceGroups.map((group) => (
              <optgroup key={group.level} label={t(EDUCATION_LEVEL_LABELS[group.level])}>
                {group.items.map((item) => (
                  <option key={item.key} value={item.key}>{name(item)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <label className={LABEL_CLASS}>
          <span>{t({ en: 'Grade', vi: 'Lớp' })}</span>
          <select
            value={grade ?? ''}
            onChange={(event) => handleGradeChange(event.target.value)}
            required
            disabled={!choice}
            className={FIELD_CLASS}
          >
            <option value="">{t({ en: 'Select a grade', vi: 'Chọn lớp' })}</option>
            {choice?.grades.map((value) => (
              <option key={value} value={value}>{t({ en: `Grade ${value}`, vi: `Lớp ${value}` })}</option>
            ))}
          </select>
        </label>

        {availableTracks.length > 0 && (
          <label className={LABEL_CLASS}>
            <span>{t({ en: 'Track', vi: 'Định hướng' })}</span>
            <select value={trackId} onChange={(event) => setTrackId(event.target.value)} className={FIELD_CLASS}>
              <option value="">{t({ en: 'None', vi: 'Không chọn' })}</option>
              {availableTracks.map((track) => (
                <option key={track.id} value={track.id}>{name(track)}</option>
              ))}
            </select>
          </label>
        )}

        <label className={LABEL_CLASS}>
          <span>{t({ en: 'Topic', vi: 'Chủ đề' })}</span>
          <select
            value={topicId}
            onChange={(event) => {
              setTopicId(event.target.value);
              setTopicNotice(null);
            }}
            required
            disabled={!choice || grade === null}
            className={FIELD_CLASS}
          >
            <option value="">{t({ en: 'Select a topic', vi: 'Chọn chủ đề' })}</option>
            {availableTopics.map((topic) => (
              <option key={topic.id} value={topic.id}>{name(topic)}</option>
            ))}
            <option value={NEW_TOPIC}>{t({ en: '+ Create a new topic', vi: '+ Tạo chủ đề mới' })}</option>
          </select>
          {topicNotice && <span className="block text-xs font-normal text-emerald-700">{topicNotice}</span>}
        </label>
      </div>

      {topicId === NEW_TOPIC && (
        <div className="grid gap-4 rounded-2xl border border-purple-200/70 bg-purple-50/50 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end dark:border-purple-900/50 dark:bg-purple-950/20">
          <label className={LABEL_CLASS}>
            <span>{t({ en: 'Topic name (Vietnamese)', vi: 'Tên chủ đề tiếng Việt' })}</span>
            <input value={newTopicVi} onChange={(event) => setNewTopicVi(event.target.value)} maxLength={200} className={FIELD_CLASS} />
          </label>
          <label className={LABEL_CLASS}>
            <span>{t({ en: 'Topic name (English)', vi: 'Tên chủ đề tiếng Anh' })}</span>
            <input value={newTopicEn} onChange={(event) => setNewTopicEn(event.target.value)} maxLength={200} className={FIELD_CLASS} />
          </label>
          <button
            type="button"
            onClick={handleCreateTopic}
            disabled={creatingTopic || !newTopicVi.trim() || !newTopicEn.trim()}
            className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {creatingTopic ? t({ en: 'Creating…', vi: 'Đang tạo…' }) : t({ en: 'Create topic', vi: 'Tạo chủ đề' })}
          </button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className={LABEL_CLASS}>
          <span>{t({ en: 'Vietnamese title', vi: 'Tiêu đề tiếng Việt' })}</span>
          <input
            value={titleVi}
            onChange={(event) => setTitleVi(event.target.value)}
            maxLength={200}
            required
            placeholder={t({ en: 'e.g. Introduction to algorithms', vi: 'Ví dụ: Nhập môn thuật toán' })}
            className={FIELD_CLASS}
          />
        </label>
        <label className={LABEL_CLASS}>
          <span>{t({ en: 'English title', vi: 'Tiêu đề tiếng Anh' })}</span>
          <input
            value={titleEn}
            onChange={(event) => setTitleEn(event.target.value)}
            maxLength={200}
            required
            placeholder={t({ en: 'e.g. Introduction to Algorithms', vi: 'Ví dụ: Introduction to Algorithms' })}
            className={FIELD_CLASS}
          />
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
            disabled={saving || !canSubmit}
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
