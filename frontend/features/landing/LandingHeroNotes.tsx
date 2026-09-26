'use client';

import { BookOpen } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './landing-hero-notes.module.css';

export function LandingHeroNotes() {
  const { t } = useLanguage();

  return (
    <div className={styles.heroNotes}>
      <span>
        <BookOpen size={16} aria-hidden="true" />
        {t({ en: 'Materials shown by level', vi: 'Học liệu theo cấp học' })}
      </span>
    </div>
  );
}
