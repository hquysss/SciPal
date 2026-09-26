'use client';

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import { LevelScope } from '@scipal/ui';
import type { EducationLevel } from './educationLevel';
import { createGateSelection } from './gateSelection';
import styles from './level-gate.module.css';

interface LevelGateProps {
  currentLevel: EducationLevel | null;
  isAuthenticated: boolean;
  saveError: boolean;
  onGuestSelect?: (level: EducationLevel) => void;
}

const levels: {
  value: EducationLevel;
  name: { en: string; vi: string };
  grades: { en: string; vi: string };
}[] = [
  { value: 'primary', name: { vi: 'Tiểu học', en: 'Primary' }, grades: { vi: 'Lớp 1–5', en: 'Grades 1–5' } },
  { value: 'lower_secondary', name: { vi: 'THCS', en: 'Lower secondary' }, grades: { vi: 'Lớp 6–9', en: 'Grades 6–9' } },
  { value: 'upper_secondary', name: { vi: 'THPT', en: 'Upper secondary' }, grades: { vi: 'Lớp 10–12', en: 'Grades 10–12' } },
];

const MAX_TILT_DEG = 8;
/** If an account POST leaves this page alive (Stop, slow network), the gate becomes choosable again. */
const ACCOUNT_REARM_MS = 3000;

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function LevelGate({ currentLevel, isAuthenticated, saveError, onGuestSelect }: LevelGateProps) {
  const { t } = useLanguage();
  const shelfRef = useRef<HTMLDivElement>(null);
  const [opening, setOpening] = useState<EducationLevel | null>(null);
  const onGuestSelectRef = useRef(onGuestSelect);
  onGuestSelectRef.current = onGuestSelect;
  const selectionRef = useRef<ReturnType<typeof createGateSelection> | null>(null);

  const getSelection = () => {
    selectionRef.current ??= createGateSelection({
      reducedMotion: prefersReducedMotion(),
      schedule: (fn, ms) => {
        const id = window.setTimeout(fn, ms);
        return () => window.clearTimeout(id);
      },
      // Accounts submit the form natively; the flip is cosmetic and never delays the POST.
      onSelect: (level) => {
        if (!isAuthenticated) onGuestSelectRef.current?.(level);
      },
      onReset: () => setOpening(null),
      rearmMs: isAuthenticated ? ACCOUNT_REARM_MS : 0,
    });
    return selectionRef.current;
  };

  useEffect(() => {
    // Back/forward cache can restore the page mid-flip; start from a closed shelf.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) selectionRef.current?.reset();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      selectionRef.current?.dispose();
    };
  }, []);

  const handleChoice = (event: MouseEvent<HTMLButtonElement>, level: EducationLevel) => {
    if (!getSelection().select(level)) {
      event.preventDefault();
      return;
    }
    setOpening(level);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const shelf = shelfRef.current;
    if (!shelf || event.pointerType !== 'mouse') return;
    const box = shelf.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    shelf.style.setProperty('--tilt-y', `${(x * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    shelf.style.setProperty('--tilt-x', `${(-y * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    shelfRef.current?.style.setProperty('--tilt-x', '0deg');
    shelfRef.current?.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <main className={styles.gate} data-scipal-level-gate data-opening={opening ?? undefined}>
      <section className={styles.stage} aria-labelledby="level-gate-title">
        <h1 id="level-gate-title" className={styles.title}>
          {t({ en: 'What grade are you in?', vi: 'Bạn học lớp mấy?' })}
        </h1>

        {saveError && (
          <p className={styles.saveError} role="alert">
            {t({
              en: 'Your selection could not be saved. Please try again.',
              vi: 'Chưa lưu được lựa chọn của bạn. Hãy thử lại.',
            })}
          </p>
        )}

        <form method="post" action="/api/preferences/education-level" className={styles.form}>
          {isAuthenticated && <input type="hidden" name="scope" value="account" />}
          <fieldset className={styles.fieldset} aria-describedby="level-gate-note">
            <legend className={styles.srOnly}>{t({ en: 'Choose one level', vi: 'Chọn một cấp học' })}</legend>
            <div
              ref={shelfRef}
              className={styles.shelf}
              onPointerMove={handlePointerMove}
              onPointerLeave={handlePointerLeave}
            >
              {levels.map((level) => {
                const isCurrent = level.value === currentLevel;
                return (
                  <LevelScope key={level.value} level={level.value} className={styles.slot}>
                    <button
                      className={styles.book}
                      data-current={isCurrent ? 'true' : undefined}
                      data-opening={opening === level.value ? 'true' : undefined}
                      type={isAuthenticated ? 'submit' : 'button'}
                      name="level"
                      value={level.value}
                      onClick={(event) => handleChoice(event, level.value)}
                    >
                      <span className={styles.pages} aria-hidden="true" />
                      <span className={styles.cover}>
                        <span className={styles.coverPattern} aria-hidden="true" />
                        <span className={styles.label}>
                          <span className={styles.levelName}>{t(level.name)}</span>
                          <span className={styles.grades}>{t(level.grades)}</span>
                        </span>
                        {isCurrent && (
                          <span className={styles.current}>{t({ en: 'Current', vi: 'Đang chọn' })}</span>
                        )}
                      </span>
                      <span className={styles.spine} aria-hidden="true" />
                    </button>
                  </LevelScope>
                );
              })}
            </div>
          </fieldset>
        </form>

        <p className={styles.srOnly} id="level-gate-note">
          {isAuthenticated
            ? t({ en: 'Your choice will sync with your account.', vi: 'Lựa chọn sẽ đồng bộ theo tài khoản của bạn.' })
            : t({
                en: 'Your choice stays in this tab until you close it.',
                vi: 'Lựa chọn được giữ trong tab này đến khi bạn đóng tab.',
              })}
        </p>
        <p className={styles.footnote}>
          {t({ en: 'You can change this later in Profile.', vi: 'Đổi được sau trong Hồ sơ.' })}
        </p>
      </section>
    </main>
  );
}
