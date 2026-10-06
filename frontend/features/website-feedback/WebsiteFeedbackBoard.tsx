'use client';
import { useEffect, useState } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { WebsiteFeedbackPage, PrivateWebsiteFeedbackPage } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { fetchWebsiteFeedback } from './api';
import { FeedbackReviews } from './FeedbackReviews';
import styles from './feedback.module.css';
export function WebsiteFeedbackBoard({ identities = false }: { identities?: boolean }) {
  const { t } = useLanguage(); const [page, setPage] = useState(1); const [version, setVersion] = useState(0);
  const [data, setData] = useState<WebsiteFeedbackPage | PrivateWebsiteFeedbackPage | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  useEffect(() => {
    const controller = new AbortController(); setState('loading');
    fetchWebsiteFeedback(page, identities, controller.signal).then(result => { if (!controller.signal.aborted) { setData(result); setState('ready'); } }).catch(() => { if (!controller.signal.aborted) setState('error'); });
    return () => controller.abort();
  }, [page, identities, version]);
  return <section id="reviews" className={styles.board}>
    <header className={styles.boardHeader}><div><h2>{t(identities ? { vi: 'Đánh giá & người gửi', en: 'Reviews & senders' } : { vi: 'Mọi người đánh giá SciPal thế nào?', en: 'How do people rate SciPal?' })}</h2><p>{t(identities ? { vi: 'Chỉ admin thấy tài khoản gửi. Khách không có danh tính tài khoản.', en: 'Only admins see sending accounts. Guests do not have an account identity.' } : { vi: 'Ý kiến thật, hiển thị ẩn danh.', en: 'Real feedback, displayed anonymously.' })}</p></div><Button variant="outline" onClick={() => setVersion(v => v + 1)} disabled={state === 'loading'}>{t({ vi: 'Làm mới', en: 'Refresh' })}</Button></header>
    {state === 'loading' && <p role="status" className={styles.loading}>{t({ vi: 'Đang tải đánh giá…', en: 'Loading reviews…' })}</p>}
    {state === 'error' && <Alert tone="danger">{t({ vi: 'Chưa tải được bảng đánh giá. Bạn thử làm mới nhé.', en: 'Could not load reviews. Please try refreshing.' })}</Alert>}
    {state === 'ready' && data && <FeedbackReviews data={data} identities={identities} onPage={setPage} />}
  </section>;
}
