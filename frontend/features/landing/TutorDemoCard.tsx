'use client';

import { useEffect, useRef, useState } from 'react';
import { Code2, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './landing.module.css';

export function TutorDemoCard() {
  const { t } = useLanguage();
  const conversationRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (!conversation) return;

    if (!('IntersectionObserver' in window)) {
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
              {t({ en: 'A small idea, made clear', vi: 'Gỡ rối một khái niệm nhỏ' })}
            </h2>
          </div>
        </div>
      </header>

      <div className={styles.tutorBody}>
        <div className={styles.lessonContext}>
          <span className={styles.contextIcon} aria-hidden="true">
            <Code2 size={17} />
          </span>
          <span className={styles.contextText}>
            <span>{t({ en: 'INFORMATICS · GRADE 11', vi: 'TIN HỌC · LỚP 11' })}</span>
            <strong>{t({ en: 'Binary search', vi: 'Tìm kiếm nhị phân' })}</strong>
          </span>
        </div>

        <div
          className={styles.binaryVisual}
          role="img"
          aria-label={t({
            en: 'Sorted numbers used in binary search',
            vi: 'Dãy số được dùng trong tìm kiếm nhị phân',
          })}
        >
          <div className={styles.binaryVisualTop}>
            <span>{t({ en: 'Sorted list', vi: 'Dãy đã sắp xếp' })}</span>
            <span>{t({ en: 'Find 23', vi: 'Tìm số 23' })}</span>
          </div>
          <ol className={styles.binaryList}>
            {[4, 9, 12, 18, 23, 31, 42].map((value, index) => {
              const cellClass = index < 3
                ? styles.arrayCellDiscarded
                : index === 3
                  ? styles.arrayCellMiddle
                  : styles.arrayCellSearch;

              return (
                <li className={styles.arrayCell + ' ' + cellClass} key={value}>
                  {value}
                </li>
              );
            })}
          </ol>
          <div className={styles.binaryCaption}>
            <span className={styles.middleMarker} aria-hidden="true" />
            <span>{t({ en: 'Middle value: 18', vi: 'Giá trị ở giữa: 18' })}</span>
            <span className={styles.binaryConclusion}>
              {t({ en: '18 < 23 · keep the right half', vi: '18 < 23 · xét nửa bên phải' })}
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
                  en: 'Why must binary search use a sorted list?',
                  vi: 'Vì sao tìm kiếm nhị phân cần dãy đã sắp xếp?',
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
                  en: 'At each step, we compare the middle element with the target. The order tells us which half can be discarded; without a sorted list, that conclusion is not valid.',
                  vi: 'Mỗi bước ta so sánh với phần tử ở giữa. Thứ tự của dãy cho biết có thể bỏ nửa nào; nếu dãy chưa sắp xếp, kết luận đó không còn đúng.',
                })}
              </p>
            </div>
          </div>

          <p className={styles.followupPrompt}>
            <span>{t({ en: 'Try this', vi: 'Thử nghĩ xem' })}</span>
            {t({
              en: 'If the middle element is smaller than your target, which half would you search next?',
              vi: 'Nếu phần tử ở giữa nhỏ hơn giá trị cần tìm, em sẽ tìm tiếp ở nửa nào?',
            })}
          </p>
        </div>
      </div>

      <footer className={styles.tutorFooter}>
        <p>
          {t({
            en: 'Preview: replies are prepared in advance and do not connect to live AI.',
            vi: 'Bản xem trước: câu trả lời được chuẩn bị sẵn, chưa kết nối AI trực tiếp.',
          })}
        </p>
      </footer>
    </article>
  );
}
