import Image from 'next/image';
import styles from './feedback.module.css';
export function FeedbackStar({ dim = false }: { dim?: boolean }) {
  return <Image src="/icons/feedback-star.svg" alt="" aria-hidden="true" width={128} height={128} unoptimized className={`${styles.starImage} ${dim ? styles.dimStar : ''}`} />;
}
