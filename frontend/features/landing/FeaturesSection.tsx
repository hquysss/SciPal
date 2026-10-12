'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardList, FlaskConical, Gamepad2, School, TrendingUp, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './sections.module.css';

type Copy = { en: string; vi: string };

const FEATURES: Array<{ href: string; Icon: LucideIcon; title: Copy; text: Copy }> = [
  {
    href: '/exam',
    Icon: ClipboardList,
    title: { vi: 'Luyện đề thi thử', en: 'Practice exams' },
    text: { vi: 'Làm đề thi thử, được chấm điểm ngay và xem lại từng câu.', en: 'Take practice exams, get scored right away and review every question.' },
  },
  {
    href: '/lab',
    Icon: FlaskConical,
    title: { vi: 'Mô phỏng tương tác', en: 'Interactive simulations' },
    text: { vi: 'Xoay, phóng to và đổi thông số trên mô hình 3D, như hệ tuần hoàn máu.', en: 'Rotate, zoom and change parameters on 3D models, like the blood circulation.' },
  },
  {
    href: '/games',
    Icon: Gamepad2,
    title: { vi: 'Trò chơi ôn bài', en: 'Review games' },
    text: { vi: 'Đố vui và ghép thuật ngữ Anh–Việt để nhớ lâu hơn.', en: 'Quizzes and English–Vietnamese term matching to remember more.' },
  },
  {
    href: '/progress',
    Icon: TrendingUp,
    title: { vi: 'Theo dõi tiến độ', en: 'Track your progress' },
    text: { vi: 'Xem điểm XP, chuỗi ngày học và huy hiệu của bạn.', en: 'See your XP, learning streak and badges.' },
  },
  {
    href: '/teacher',
    Icon: School,
    title: { vi: 'Dành cho giáo viên', en: 'For teachers' },
    text: { vi: 'Tạo lớp, giao bài, soạn bài và đề cho học sinh của bạn.', en: 'Create classes, assign work, and write lessons and exams for your students.' },
  },
];

/** What SciPal offers beyond the lessons; each card opens that feature's own page. */
export function FeaturesSection() {
  const { t } = useLanguage();
  return (
    <section className={styles.section} id="tinh-nang" aria-labelledby="features-title">
      <h2 id="features-title" className={styles.sectionTitle} data-landing-reveal>
        {t({ en: 'More than lessons', vi: 'Hơn cả bài học' })}
      </h2>
      <ul className={styles.featureGrid}>
        {FEATURES.map(({ href, Icon, title, text }) => (
          <li key={href} data-landing-reveal>
            <Link prefetch={false} href={href} className={styles.featureCard}>
              <span className={styles.featureLogo} aria-hidden="true">
                <span className={styles.featureCircle} />
                <span className={styles.featureCircle} />
                <span className={styles.featureCircle} />
                <span className={styles.featureCircle} />
                <span className={styles.featureCircle}>
                  <Icon size={22} strokeWidth={2} />
                </span>
              </span>
              <span className={styles.featureGlass} aria-hidden="true" />
              <span className={styles.featureContent}>
                <span className={styles.featureTitle}>{t(title)}</span>
                <span className={styles.featureText}>{t(text)}</span>
              </span>
              <span className={styles.featureMore} aria-hidden="true">
                {t({ vi: 'Xem thêm', en: 'View more' })}
                <ArrowRight size={14} strokeWidth={3} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
