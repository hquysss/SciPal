'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './sections.module.css';

const MAX_TILT_DEG = 5;

export function TutorDemoCard() {
  const { t } = useLanguage();
  const cardRef = useRef<HTMLElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;

    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !('IntersectionObserver' in window)
    ) {
      setIsPlaying(true);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsPlaying(true);
        observer.disconnect();
      }
    }, { threshold: 0.2 });

    observer.observe(conversation);
    return () => observer.disconnect();
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card || event.pointerType !== 'mouse') return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    card.style.setProperty('--tilt-y', `${(x * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
    card.style.setProperty('--tilt-x', `${(-y * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
  };

  const handlePointerLeave = () => {
    cardRef.current?.style.setProperty('--tilt-x', '0deg');
    cardRef.current?.style.setProperty('--tilt-y', '0deg');
  };

  return (
    <article
      ref={cardRef}
      className={styles.tutorCard}
      aria-labelledby="tutor-demo-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <header className={styles.tutorHeader}>
        <span className={styles.tutorMark} aria-hidden="true">
          <Sparkles size={18} strokeWidth={2.2} />
        </span>
        <h3 id="tutor-demo-title" className={styles.tutorTitle}>
          {t({ en: 'AI Tutor', vi: 'Gia sư AI' })}
        </h3>
      </header>

      <div className={styles.conversation} ref={conversationRef} data-playing={isPlaying ? 'true' : 'false'}>
        <div className={styles.studentMessage}>
          <span className={styles.avatar} aria-hidden="true"><UserRound size={15} /></span>
          <p className={styles.studentBubble}>
            {t({ en: 'Why does a shadow get shorter at noon?', vi: 'Vì sao buổi trưa bóng ngắn lại?' })}
          </p>
        </div>
        <div className={styles.tutorMessage}>
          <span className={styles.avatar} aria-hidden="true"><Sparkles size={14} /></span>
          <p className={styles.tutorBubble}>
            {t({
              en: 'Light travels in straight lines. The higher the Sun, the steeper the light — so the shadow shrinks.',
              vi: 'Ánh sáng truyền thẳng. Mặt Trời càng cao, tia sáng càng dốc — nên bóng ngắn lại.',
            })}
          </p>
        </div>
        <p className={styles.followupPrompt}>
          {t({ en: 'Try: compare shadows at 8 am and noon.', vi: 'Thử: so sánh bóng lúc 8 giờ và 12 giờ.' })}
        </p>
      </div>

      <p className={styles.tutorFooter}>
        {t({ en: 'Prepared example answer.', vi: 'Câu trả lời mẫu được chuẩn bị sẵn.' })}
      </p>
    </article>
  );
}
