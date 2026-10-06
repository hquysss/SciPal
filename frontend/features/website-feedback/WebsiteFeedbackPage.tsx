'use client';
import { useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useLanguage } from '@scipal/hooks';
import { PageBreadcrumb } from '@/components/nav/PageBreadcrumb';
import { FeedbackStar } from './FeedbackStar';
import { WebsiteFeedbackForm } from './WebsiteFeedbackForm';
import { WebsiteFeedbackBoard } from './WebsiteFeedbackBoard';
import styles from './feedback.module.css';
export function WebsiteFeedbackPage() {
  const { t } = useLanguage(); const [version, setVersion] = useState(0);
  return <main className={styles.page}>
    <PageBreadcrumb items={[{ href: '/', label: { vi: 'Trang chủ', en: 'Home' } }, { label: { vi: 'Đánh giá SciPal', en: 'Review SciPal' } }]} />
    <header className={styles.intro}><div className={styles.heroStars} aria-hidden="true">{[0, 1, 2, 3, 4].map(i => <span key={i} style={{ '--i': i } as CSSProperties}><FeedbackStar /></span>)}</div>
      <span className={styles.meta}>{t({ vi: '3 câu hỏi · khoảng 30 giây', en: '3 questions · about 30 seconds' })}</span>
      <h1>{t({ vi: 'Bạn chấm SciPal mấy sao?', en: 'How many stars would you give SciPal?' })}</h1>
      <p>{t({ vi: 'Một đánh giá nhỏ, một thay đổi tốt hơn. Kể SciPal nghe trải nghiệm thật của bạn nhé.', en: 'One small review can make a big difference. Tell us about your experience.' })}</p>
    </header>
    <WebsiteFeedbackForm onSaved={() => setVersion(v => v + 1)} />
    <WebsiteFeedbackBoard key={version} />
    <Link href="/help" className={styles.helpLink}>{t({ vi: 'Cần hỗ trợ với một lỗi cụ thể? Xem Hướng dẫn', en: 'Need help with a specific issue? Visit Help' })}</Link>
  </main>;
}
