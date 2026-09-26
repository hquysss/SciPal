'use client';

import { useEffect, useRef, useState } from 'react';
import { Sun, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './landing.module.css';

export function TutorDemoCard() {
  const { t } = useLanguage();
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
    }, { threshold: 0.05 });

    observer.observe(conversation);
    return () => observer.disconnect();
  }, []);

  return (
    <article className={styles.tutorCard} aria-labelledby="tutor-demo-title">
      <header className={styles.tutorHeader}>
        <div className={styles.tutorHeading}>
          <span className={styles.tutorMark} aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.2} />
          </span>
          <div>
            <p className={styles.tutorKicker}>
              {t({ en: 'AI Tutor', vi: 'Gia sư AI' })}
            </p>
            <h2 id="tutor-demo-title" className={styles.tutorTitle}>
              {t({ en: 'A small idea, made clear', vi: 'Gỡ rối một hiện tượng nhỏ' })}
            </h2>
          </div>
        </div>
      </header>

      <div className={styles.tutorBody}>
        <div className={styles.lessonContext}>
          <span className={styles.contextIcon} aria-hidden="true">
            <Sun size={17} />
          </span>
          <span className={styles.contextText}>
            <span>{t({ en: 'SCIENCE INQUIRY', vi: 'CÂU HỎI KHOA HỌC' })}</span>
            <strong>{t({ en: 'Changing shadows', vi: 'Bóng thay đổi' })}</strong>
          </span>
        </div>

        <div
          className={styles.inquiryVisual}
          role="img"
          aria-label={t({
            en: 'A vertical object casts a longer shadow when the Sun appears low and a shorter shadow when it appears higher.',
            vi: 'Một vật thẳng đứng tạo bóng dài hơn khi Mặt Trời ở thấp và bóng ngắn hơn khi Mặt Trời lên cao.',
          })}
        >
          <div className={styles.inquiryVisualTop}>
            <span>{t({ en: 'Compare the Sun’s height', vi: 'So sánh độ cao Mặt Trời' })}</span>
            <span>{t({ en: 'Same object', vi: 'Cùng một vật' })}</span>
          </div>
          <ol className={styles.inquiryNotes}>
            <li className={styles.inquiryStep}>
              <span>{t({ en: 'Sun appears low', vi: 'Mặt Trời ở thấp' })}</span>
              <strong>{t({ en: 'Longer shadow', vi: 'Bóng dài hơn' })}</strong>
            </li>
            <li className={styles.inquiryStep + ' ' + styles.inquiryObservation}>
              <span>{t({ en: 'Sun appears higher', vi: 'Mặt Trời lên cao' })}</span>
              <strong>{t({ en: 'Shorter shadow', vi: 'Bóng ngắn hơn' })}</strong>
            </li>
          </ol>
          <div className={styles.inquiryCaption}>
            <span className={styles.observationMarker} aria-hidden="true" />
            <span>{t({ en: 'Observe before explaining', vi: 'Quan sát trước khi giải thích' })}</span>
            <span className={styles.inquiryConclusion}>
              {t({ en: 'Sun higher → shadow shorter', vi: 'Mặt Trời cao → bóng ngắn' })}
            </span>
          </div>
        </div>

        <div
          className={styles.conversation}
          ref={conversationRef}
          data-playing={isPlaying ? 'true' : 'false'}
        >
          <div className={styles.studentMessage}>
            <span className={styles.studentAvatar} aria-hidden="true">
              <UserRound size={16} />
            </span>
            <div className={styles.studentBubble}>
              <span className={styles.messageRole}>
                {t({ en: 'You', vi: 'Bạn' })}
              </span>
              <p>
                {t({
                  en: 'Why does a vertical object cast a shorter shadow as the Sun rises?',
                  vi: 'Vì sao bóng của một vật thẳng đứng ngắn lại khi Mặt Trời lên cao?',
                })}
              </p>
            </div>
          </div>

          <div className={styles.tutorMessage}>
            <span className={styles.tutorAvatar} aria-hidden="true">
              <Sparkles size={15} />
            </span>
            <div className={styles.tutorBubble}>
              <span className={styles.messageRole}>
                {t({ en: 'AI Tutor', vi: 'Gia sư AI' })}
              </span>
              <p>
                {t({
                  en: 'Light travels in straight lines. When sunlight reaches the same upright object from a higher angle, the shadow on level ground becomes shorter.',
                  vi: 'Ánh sáng truyền theo đường thẳng. Khi ánh nắng chiếu vào cùng một vật thẳng đứng từ góc cao hơn, bóng trên mặt đất sẽ ngắn lại.',
                })}
              </p>
            </div>
          </div>

          <p className={styles.followupPrompt}>
            <span>{t({ en: 'Try this', vi: 'Thử nghĩ xem' })}</span>
            {t({
              en: 'How could you compare the shadow at two different times?',
              vi: 'Em có thể so sánh bóng ở hai thời điểm khác nhau như thế nào?',
            })}
          </p>
        </div>
      </div>

      <footer className={styles.tutorFooter}>
        <p>
          {t({
            en: 'This preview uses a prepared answer; live AI tutoring is not connected here yet.',
            vi: 'Câu trả lời trong bản xem trước được chuẩn bị sẵn; gia sư AI trực tiếp chưa kết nối ở đây.',
          })}
        </p>
      </footer>
    </article>
  );
}
