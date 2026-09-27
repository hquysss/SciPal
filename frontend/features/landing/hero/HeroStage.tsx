import type { EducationLevel } from '../educationLevel';
import { HeroFallback } from './HeroFallback';
import styles from './hero.module.css';

export function HeroStage({ level }: { level: EducationLevel }) {
  return (
    <div className={styles.stage} data-hero-art>
      <HeroFallback level={level} />
    </div>
  );
}
