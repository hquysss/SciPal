'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@scipal/hooks';
import {
  readSessionEducationLevel,
  resolveEducationLevel,
  writeSessionEducationLevel,
  type EducationLevel,
} from '@/features/landing/educationLevel';

interface EducationLevelSettingProps {
  preference: ReturnType<typeof resolveEducationLevel>;
  isAuthenticated: boolean;
}

const levelOptions: {
  value: EducationLevel;
  name: { en: string; vi: string };
  grades: { en: string; vi: string };
}[] = [
  { value: 'primary', name: { en: 'Primary', vi: 'Tiểu học' }, grades: { en: 'Grades 1–5', vi: 'Lớp 1–5' } },
  { value: 'lower_secondary', name: { en: 'Lower secondary', vi: 'THCS' }, grades: { en: 'Grades 6–9', vi: 'Lớp 6–9' } },
  { value: 'upper_secondary', name: { en: 'Upper secondary', vi: 'THPT' }, grades: { en: 'Grades 10–12', vi: 'Lớp 10–12' } },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function EducationLevelSetting({ preference, isAuthenticated }: EducationLevelSettingProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState<EducationLevel | null>(preference.level);
  const [source, setSource] = useState(preference.source);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  useEffect(() => {
    if (isAuthenticated) return;
    try {
      const sessionLevel = readSessionEducationLevel(window.sessionStorage);
      if (sessionLevel !== null) {
        setSelectedLevel(sessionLevel);
        setSource('session');
      }
    } catch {
      setSelectedLevel(null);
      setSource('none');
    }
  }, [isAuthenticated]);

  const handleSelect = async (level: EducationLevel) => {
    if (saveState === 'saving' || (level === selectedLevel && saveState !== 'error')) return;
    setSaveState('saving');

    if (!isAuthenticated) {
      try {
        writeSessionEducationLevel(window.sessionStorage, level);
        setSelectedLevel(level);
        setSource('session');
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
      return;
    }

    try {
      const response = await fetch('/api/preferences/education-level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, scope: 'account' }),
      });
      if (!response.ok) throw new Error(`Preference save failed: ${response.status}`);

      setSelectedLevel(level);
      setSource('account');
      setSaveState('saved');
      router.refresh();
    } catch {
      setSaveState('error');
    }
  };

  const sourceLabel = saveState === 'saved'
    ? (isAuthenticated
      ? t({ en: 'Saved to account', vi: 'Đã lưu vào tài khoản' })
      : t({ en: 'Saved in this tab', vi: 'Đã lưu trong tab này' }))
    : source === 'account'
      ? t({ en: 'Saved to account', vi: 'Đã lưu vào tài khoản' })
      : source === 'session'
        ? t({ en: 'Saved in this tab', vi: 'Đã lưu trong tab này' })
        : t({ en: 'No level selected yet', vi: 'Chưa chọn cấp học' });

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/40" aria-labelledby="education-level-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 id="education-level-title" className="text-sm font-bold text-gray-900 dark:text-white">
            {t({ en: 'Exploration level', vi: 'Cấp học khi khám phá' })}
          </h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {t({ en: 'Choose the subject catalog shown on the home page.', vi: 'Chọn danh mục môn học hiển thị ở trang chủ.' })}
          </p>
        </div>
        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" aria-live="polite">
          {sourceLabel}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {levelOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selectedLevel === option.value}
            disabled={saveState === 'saving'}
            onClick={() => void handleSelect(option.value)}
            className={`flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60 ${selectedLevel === option.value
              ? 'border-emerald-700 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'} `}
          >
            <span className="text-sm font-bold">{t(option.name)}</span>
            <span className="text-xs opacity-75">{t(option.grades)}</span>
          </button>
        ))}
      </div>

      {saveState === 'saving' && (
        <p className="text-sm text-gray-600 dark:text-gray-300" role="status">
          {t({ en: 'Saving your level…', vi: 'Đang lưu cấp học…' })}
        </p>
      )}
      {saveState === 'saved' && (
        <p className="text-sm text-emerald-800 dark:text-emerald-300" role="status">
          {t({ en: 'Your home page will use this level.', vi: 'Trang chủ sẽ hiển thị theo cấp học này.' })}
        </p>
      )}
      {saveState === 'error' && (
        <p className="text-sm text-red-800 dark:text-red-300" role="alert">
          {t({ en: 'Could not save this level. Your previous choice is unchanged; choose it again to retry.', vi: 'Chưa lưu được cấp học. Lựa chọn cũ vẫn được giữ; hãy chọn lại để thử lại.' })}
        </p>
      )}
    </section>
  );
}
