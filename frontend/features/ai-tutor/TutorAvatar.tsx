import type { CSSProperties } from 'react';
import styles from './tutor.module.css';

/** The tutor's face, still, in a warm ring. Decorative (names go in text). */
export function TutorAvatar({ size = '2.5rem' }: { size?: string }) {
  return <span className={styles.avatar} style={{ '--avatar-size': size } as CSSProperties} aria-hidden="true" />;
}

/** The face with a green "online" dot that gently pings. The dot is decorative: say "online" in text. */
export function TutorAvatarOnline({ size = '2.5rem' }: { size?: string }) {
  return (
    <span className="relative inline-flex shrink-0">
      <TutorAvatar size={size} />
      <span aria-hidden="true" className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-surface">
        <span className="absolute h-2.5 w-2.5 rounded-full bg-success opacity-70 motion-safe:animate-ping" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-success" />
      </span>
    </span>
  );
}
