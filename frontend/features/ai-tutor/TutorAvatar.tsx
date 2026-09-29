import type { CSSProperties } from 'react';
import styles from './tutor.module.css';

/** The tutor's face: the SciPal owl, still, in a warm ring. Decorative (names go in text). */
export function TutorAvatar({ size = '2.5rem' }: { size?: string }) {
  return <span className={styles.avatar} style={{ '--avatar-size': size } as CSSProperties} aria-hidden="true" />;
}
