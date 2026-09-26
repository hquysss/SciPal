'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { Alert } from '@/components/ui/alert';
import {
  readSessionEducationLevel,
  resolveEducationLevel,
  writeSessionEducationLevel,
  type EducationLevel,
} from '@/features/landing/educationLevel';
import { adoptAccountLevel, applyShellLevel, getShell, safeSessionStorage } from '@/lib/theme/shellTheme';

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
        applyShellLevel(getShell(), level);
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
      adoptAccountLevel(level, safeSessionStorage(), getShell());
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
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface-sunken p-4" aria-labelledby="education-level-title">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id="education-level-title" className="text-sm font-bold text-ink">
            {t({ en: 'Exploration level', vi: 'Cấp học khi khám phá' })}
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            {t({ en: 'Choose the subject catalog shown on the home page.', vi: 'Chọn danh mục môn học hiển thị ở trang chủ.' })}
          </p>
        </div>
        <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-sm font-semibold text-ink-muted" aria-live="polite">
          {sourceLabel}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {levelOptions.map((option) => {
          const selected = selectedLevel === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              disabled={saveState === 'saving'}
              onClick={() => void handleSelect(option.value)}
              className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60 ${
                selected ? 'border-action bg-action text-action-ink' : 'border-edge bg-surface text-ink hover:bg-surface-sunken'
              }`}
            >
              <span className="flex flex-1 flex-col">
                <span className="text-sm font-bold">{t(option.name)}</span>
                <span className="text-sm">{t(option.grades)}</span>
              </span>
              {selected && <Check aria-hidden="true" className="h-5 w-5 shrink-0" />}
            </button>
          );
        })}
      </div>

      {saveState === 'saving' && (
        <p className="text-sm text-ink-muted" role="status">
          {t({ en: 'Saving your level…', vi: 'Đang lưu cấp học…' })}
        </p>
      )}
      {saveState === 'saved' && (
        <Alert tone="success">
          {t({ en: 'Your home page will use this level.', vi: 'Trang chủ sẽ hiển thị theo cấp học này.' })}
        </Alert>
      )}
      {saveState === 'error' && (
        <Alert tone="danger">
          {t({ en: 'Could not save this level. Your previous choice is unchanged; choose it again to retry.', vi: 'Chưa lưu được cấp học. Lựa chọn cũ vẫn được giữ; hãy chọn lại để thử lại.' })}
        </Alert>
      )}
    </section>
  );
}
