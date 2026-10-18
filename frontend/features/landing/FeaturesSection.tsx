'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardList, FlaskConical, Gamepad2, MessagesSquare, School, Trophy, type LucideIcon } from 'lucide-react';
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
    Icon: Trophy,
    title: { vi: 'Tiến độ và bảng xếp hạng', en: 'Progress and leaderboard' },
    text: { vi: 'Tích XP, giữ chuỗi ngày học, mở huy hiệu và đua top tuần để thành Thủ khoa tuần.', en: 'Earn XP, keep your streak, unlock badges and race for Top of the week.' },
  },
  {
    href: '/community',
    Icon: MessagesSquare,
    title: { vi: 'Cộng đồng học tập', en: 'Study community' },
    text: { vi: 'Phòng chat theo khối và lớp, kết bạn, nhắn riêng, có thông báo tin mới ngay khi đến.', en: 'Chat rooms by grade and class, friends and direct messages, with new messages announced as they arrive.' },
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
