'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import type { EducationLevel } from './educationLevel';
import styles from './sections.module.css';

type Copy = { en: string; vi: string };

/** Prepared Informatics exchanges, pitched per level; the card says they are prepared examples. */
const EXCHANGES: Record<EducationLevel, { question: Copy; answer: Copy; next: Copy }> = {
  primary: {
    question: { vi: 'Vì sao máy tính cần làm theo từng bước?', en: 'Why does a computer need step-by-step instructions?' },
    answer: {
      vi: 'Máy tính không tự đoán được ý em. Em chỉ dẫn rõ từng bước, đúng thứ tự, thì máy mới làm đúng.',
      en: "A computer can't guess what you mean. Give clear steps in the right order and it does the job right.",
    },
    next: { vi: 'Thử: hướng dẫn một người bạn vẽ ngôi nhà trong 3 bước.', en: 'Try: tell a friend how to draw a house in 3 steps.' },
  },
  lower_secondary: {
    question: { vi: 'Thuật toán khác chương trình máy tính thế nào?', en: 'How is an algorithm different from a program?' },
    answer: {
      vi: 'Thuật toán là các bước giải bài toán. Chương trình là thuật toán được viết bằng ngôn ngữ máy tính hiểu, ví dụ Python.',
      en: 'An algorithm is the steps that solve a problem. A program is that algorithm written in a language the computer understands, like Python.',
    },
    next: { vi: 'Thử: viết các bước pha một cốc nước chanh.', en: 'Try: write the steps for making lemonade.' },
  },
  upper_secondary: {
    question: { vi: 'Vì sao tìm kiếm nhị phân cần dãy đã sắp xếp?', en: 'Why does binary search need a sorted list?' },
    answer: {
      vi: 'So với phần tử giữa, ta phải biết mục tiêu nằm bên trái hay bên phải. Dãy chưa sắp xếp thì không bỏ được nửa nào.',
      en: 'After comparing with the middle item, you must know whether the target is left or right. In an unsorted list you cannot drop either half.',
    },
    next: { vi: 'Thử: đếm số lần so sánh để tìm 26 trong dãy 8 số.', en: 'Try: count the comparisons to find 26 among 8 numbers.' },
  },
};

const MAX_TILT_DEG = 5;

export function TutorDemoCard({ level = 'upper_secondary' }: { level?: EducationLevel }) {
  const { t } = useLanguage();
  const exchange = EXCHANGES[level];
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
          {t({ en: 'Professor Quys', vi: 'Giáo sư Quý' })}
        </h3>
      </header>

      <div className={styles.conversation} ref={conversationRef} data-playing={isPlaying ? 'true' : 'false'}>
        <div className={styles.studentMessage}>
          <span className={styles.avatar} aria-hidden="true"><UserRound size={15} /></span>
          <p className={styles.studentBubble}>{t(exchange.question)}</p>
        </div>
        <div className={styles.tutorMessage}>
          <span className={styles.avatar} aria-hidden="true"><Sparkles size={14} /></span>
          <p className={styles.tutorBubble}>
            {/* The tutor "types" first: three dots, then the answer fades in over them. */}
            <span className={styles.typingDots} aria-hidden="true"><span /><span /><span /></span>
            <span className={styles.tutorText}>{t(exchange.answer)}</span>
          </p>
        </div>
        <p className={styles.followupPrompt}>{t(exchange.next)}</p>
      </div>

      <p className={styles.tutorFooter}>
        {t({ en: 'Prepared example answer.', vi: 'Câu trả lời mẫu được chuẩn bị sẵn.' })}
      </p>
    </article>
  );
}
