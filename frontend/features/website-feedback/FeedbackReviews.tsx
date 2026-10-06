'use client';
import type { CSSProperties } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { WebsiteFeedbackPage, PrivateWebsiteFeedbackPage } from '@scipal/types';
import { Button } from '@/components/ui/button';
import { FeedbackStar } from './FeedbackStar';
import styles from './feedback.module.css';
const EASE = { easy: { vi: 'Dễ dùng', en: 'Easy to use' }, okay: { vi: 'Khá ổn', en: 'Mostly fine' }, hard: { vi: 'Còn khó dùng', en: 'Hard to use' } } as const;
const DATES = { vi: new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }), en: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh' }) };
export function FeedbackReviews({ data, identities = false, onPage }: { data: WebsiteFeedbackPage | PrivateWebsiteFeedbackPage; identities?: boolean; onPage: (page: number) => void }) {
  const { lang, t } = useLanguage();
  const pages = Math.max(1, Math.ceil(data.total / data.page_size));
  return <div className={styles.reviewLayout}>
    <section className={styles.summary} aria-label={t({ vi: 'Điểm đánh giá trung bình', en: 'Average website rating' })}>
      <div className={styles.average}><strong>{data.average === null ? '—' : data.average.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><span>/ 5</span><div className={styles.averageStar}><FeedbackStar dim={data.total === 0} /></div></div>
      <p className={styles.total}>{data.total === 0 ? t({ vi: 'Chưa có đánh giá', en: 'No reviews yet' }) : t({ vi: `Từ ${data.total.toLocaleString('vi-VN')} đánh giá đã lưu`, en: `From ${data.total.toLocaleString('en-GB')} saved reviews` })}</p>
      <div className={styles.distribution}>{[5, 4, 3, 2, 1].map(s => { const count = data.distribution[s - 1] ?? 0; return <div key={s} className={styles.distributionRow} aria-label={t({ vi: `${s} sao: ${count} đánh giá`, en: `${s} stars: ${count} reviews` })}><span>{s} <span aria-hidden="true">★</span></span><span className={styles.barTrack}><span style={{ width: `${data.total ? count / data.total * 100 : 0}%` } as CSSProperties} /></span><span>{count}</span></div>; })}</div>
      <p className={styles.summaryNote}>{t({ vi: 'Tính trên toàn bộ đánh giá, không chỉ trang đang xem.', en: 'Based on all reviews, not just the current page.' })}</p>
    </section>
    <section className={styles.reviewTable} aria-label={t({ vi: 'Bảng đánh giá website', en: 'Website reviews table' })}>
      {data.reviews.length === 0 ? <div className={styles.empty}><div className={styles.emptyStar}><FeedbackStar /></div><h3>{t({ vi: 'Đánh giá đầu tiên có thể là của bạn.', en: 'The first review could be yours.' })}</h3><p>{t({ vi: 'Chọn vài ngôi sao và kể SciPal nghe trải nghiệm của bạn nhé.', en: 'Choose a few stars and tell us about your experience.' })}</p></div> : <div className={styles.tableScroll}>
        <table><thead><tr><th>{t({ vi: 'Người gửi', en: 'Reviewer' })}</th><th>{t({ vi: 'Đánh giá', en: 'Rating' })}</th><th>{t({ vi: 'Góp ý', en: 'Comment' })}</th><th>{t({ vi: 'Ngày gửi', en: 'Date' })}</th></tr></thead>
          <tbody>{data.reviews.map(review => <tr key={review.id}>
            <td>{identities && 'sender' in review ? review.sender ? <><strong>{review.sender.name || t({ vi: 'Tài khoản', en: 'Account' })}</strong><small className={styles.senderId}>{review.sender.id}</small></> : t({ vi: 'Khách chưa đăng nhập', en: 'Guest' }) : t({ vi: 'Ẩn danh', en: 'Anonymous' })}</td>
            <td><span className={styles.ratingNumber} aria-hidden="true">{review.rating}/5</span><span className={styles.rowStars} role="img" aria-label={t({ vi: `${review.rating} trên 5 sao`, en: `${review.rating} out of 5 stars` })}>{[1, 2, 3, 4, 5].map(s => <span key={s}><FeedbackStar dim={s > review.rating} /></span>)}</span><span className={styles.easeBadge}>{t(EASE[review.usability])}</span></td>
            <td className={styles.commentCell}>{review.feedback || <span className="text-ink-muted">{t({ vi: 'Không có góp ý thêm', en: 'No additional comment' })}</span>}</td>
            <td className={styles.date}>{DATES[lang].format(new Date(review.created_at))}</td>
          </tr>)}</tbody></table></div>}
      {data.total > 10 && <nav className={styles.pagination} aria-label={t({ vi: 'Phân trang đánh giá', en: 'Review pagination' })}><Button variant="outline" onClick={() => onPage(data.page - 1)} disabled={data.page <= 1}>{t({ vi: 'Trước', en: 'Previous' })}</Button><span>{t({ vi: `Trang ${data.page} / ${pages}`, en: `Page ${data.page} / ${pages}` })}</span><Button variant="outline" onClick={() => onPage(data.page + 1)} disabled={data.page >= pages}>{t({ vi: 'Sau', en: 'Next' })}</Button></nav>}
    </section>
  </div>;
}
