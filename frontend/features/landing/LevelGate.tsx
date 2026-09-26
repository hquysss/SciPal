'use client';

import { useLanguage } from '@scipal/hooks';
import Image from 'next/image';
import type { EducationLevel } from './educationLevel';
import type { InformaticsAvailability } from './getLandingData';
import styles from './level-gate.module.css';

interface LevelGateProps {
  currentLevel: EducationLevel | null;
  isAuthenticated: boolean;
  informatics: InformaticsAvailability;
  saveError: boolean;
  onGuestSelect?: (level: EducationLevel) => void;
}

const levels: {
  value: EducationLevel;
  name: { en: string; vi: string };
  grades: { en: string; vi: string };
}[] = [
  {
    value: 'primary',
    name: { vi: 'Tiểu học', en: 'Primary' },
    grades: { vi: 'Lớp 1–5', en: 'Grades 1–5' },
  },
  {
    value: 'lower_secondary',
    name: { vi: 'THCS', en: 'Lower secondary' },
    grades: { vi: 'Lớp 6–9', en: 'Grades 6–9' },
  },
  {
    value: 'upper_secondary',
    name: { vi: 'THPT', en: 'Upper secondary' },
    grades: { vi: 'Lớp 10–12', en: 'Grades 10–12' },
  },
];

function InformaticsStatus({
  state,
  lang,
}: {
  state: InformaticsAvailability;
  lang: 'en' | 'vi';
}) {
  if (state.kind === 'available') {
    return (
      <span className={styles.statusAvailable}>
        {lang === 'en' ? 'Available' : 'Sẵn sàng'}
      </span>
    );
  }

  if (state.kind === 'error') {
    return (
      <span className={styles.statusError}>
        {lang === 'en' ? 'Could not load lesson status' : 'Không tải được trạng thái học liệu'}
      </span>
    );
  }

  return <span className={styles.statusUpcoming}>{lang === 'en' ? 'No published lessons yet' : 'Chưa có bài học đã xuất bản'}</span>;
}

export function LevelGate({
  currentLevel,
  isAuthenticated,
  informatics,
  saveError,
  onGuestSelect,
}: LevelGateProps) {
  const { lang, t } = useLanguage();

  return (
    <main className={styles.gate} data-scipal-level-gate lang={lang}>
      <div className={styles.pageFrame}>
        <header className={styles.brandRow}>
          <Image src="/logo.svg" alt="" width={42} height={42} priority />
          <span className={styles.brandName}>SciPal</span>
          <span className={styles.brandDescriptor}>
            {t({ en: 'FIELD NOTES · SCIENCE NOTEBOOK', vi: 'SỔ TAY KHOA HỌC' })}
          </span>
        </header>

        <section className={styles.sheet} aria-labelledby="level-gate-title">
          <div className={styles.kicker}>
            <span>01</span>
            <span>{t({ en: 'CHOOSE YOUR LEARNING PATH', vi: 'CHỌN LỐI VÀO HỌC TẬP' })}</span>
          </div>

          <div className={styles.introduction}>
            <h1 id="level-gate-title">
              {t({ en: 'Which school level are you in?', vi: 'Bạn đang học ở cấp nào?' })}
            </h1>
            <p className={styles.introDescription}>
              {t({
                en: 'Choose a level to see its learning materials and availability.',
                vi: 'Chọn cấp học để xem đúng học liệu và trạng thái nội dung.',
              })}
            </p>
          </div>

          {saveError && (
            <div className={styles.saveError} role="alert">
              <strong>
                {t({ en: 'Your selection could not be saved.', vi: 'Chưa lưu được lựa chọn của bạn.' })}
              </strong>
              <span>
                {t({
                  en: 'Your previous choice is unchanged. Please try again.',
                  vi: 'Lựa chọn trước đó vẫn được giữ. Hãy thử lại.',
                })}
              </span>
            </div>
          )}

          <form method="post" action="/api/preferences/education-level" className={styles.form}>
            {isAuthenticated && <input type="hidden" name="scope" value="account" />}
            <fieldset className={styles.fieldset} aria-describedby="level-gate-note">
              <legend>
                {t({ en: 'Choose one level', vi: 'Chọn một cấp học' })}
              </legend>
              <div className={styles.choices}>
                {levels.map((level) => {
                  const isCurrent = level.value === currentLevel;

                  return (
                    <button
                      className={styles.choice}
                      data-current={isCurrent ? 'true' : undefined}
                      key={level.value}
                      type={isAuthenticated ? 'submit' : 'button'}
                      name="level"
                      value={level.value}
                      onClick={isAuthenticated ? undefined : () => onGuestSelect?.(level.value)}
                    >
                      <span className={styles.choiceTopline}>
                        <span className={styles.grade}>{t(level.grades)}</span>
                        {isCurrent && (
                          <span className={styles.current}>
                            {t({ en: 'Current', vi: 'Đang chọn' })}
                          </span>
                        )}
                      </span>
                      <span className={styles.levelNames}>
                        {t(level.name)}
                      </span>
                      {level.value === 'upper_secondary' ? (
                        <InformaticsStatus state={informatics} lang={lang} />
                      ) : (
                        <span className={styles.statusUpcoming}>
                          {t({ en: 'Coming soon', vi: 'Sắp ra mắt' })}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </form>

          {informatics.kind === 'error' && (
            <p className={styles.retryNote}>
              <a href="/?chooseLevel=1">
                {t({ en: 'Reload lesson status', vi: 'Tải lại trạng thái học liệu' })}
              </a>
            </p>
          )}

          <p className={styles.preferenceNote} id="level-gate-note">
            {isAuthenticated
              ? t({
                  en: 'Your choice will sync with your account.',
                  vi: 'Lựa chọn sẽ đồng bộ theo tài khoản của bạn.',
                })
              : t({
                  en: 'Your choice stays in this tab until you close it.',
                  vi: 'Lựa chọn được giữ trong tab này đến khi bạn đóng tab.',
                })}
          </p>
        </section>

        <footer className={styles.pageFooter}>
          {t({
            en: 'You can change your level later in Profile.',
            vi: 'Bạn có thể đổi cấp học sau này trong hồ sơ.',
          })}
        </footer>
      </div>
    </main>
  );
}
