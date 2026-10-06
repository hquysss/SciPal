'use client';
import { useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useLanguage } from '@scipal/hooks';
import type { WebsiteFeedbackInput } from '@scipal/types';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FeedbackStar } from './FeedbackStar';
import { submitWebsiteFeedback } from './api';
import styles from './feedback.module.css';
const EASE = { easy: { vi: 'Dễ dùng', en: 'Easy to use' }, okay: { vi: 'Khá ổn', en: 'Mostly fine' }, hard: { vi: 'Còn khó dùng', en: 'Hard to use' } } as const;
const RATINGS = [
  { vi: 'Rất chưa hài lòng', en: 'Very dissatisfied' }, { vi: 'Chưa hài lòng', en: 'Dissatisfied' },
  { vi: 'Bình thường', en: 'Neutral' }, { vi: 'Hài lòng', en: 'Satisfied' }, { vi: 'Rất hài lòng', en: 'Very satisfied' },
];
export function WebsiteFeedbackForm({ onSaved }: { onSaved?: () => void }) {
  const { t } = useLanguage(); const id = useId();
  const [rating, setRating] = useState(0);
  const [ease, setEase] = useState<WebsiteFeedbackInput['usability'] | null>(null);
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const locked = useRef(false);
  const submission = useRef<{ id: string; signature: string } | null>(null);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (locked.current || !rating || !ease) return;
    locked.current = true; setStatus('sending');
    const content = { rating, usability: ease, feedback: feedback.trim() };
    const signature = JSON.stringify(content);
    if (submission.current?.signature !== signature) submission.current = { id: crypto.randomUUID(), signature };
    try {
      await submitWebsiteFeedback({ ...content, submission_id: submission.current.id });
      setStatus('sent'); onSaved?.();
    } catch { setStatus('error'); } finally { locked.current = false; }
  }
  if (status === 'sent') return <section className={`${styles.form} ${styles.thanks}`} aria-live="polite">
    <div className={styles.celebrate} aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <span key={i} style={{ '--i': i } as CSSProperties}><FeedbackStar /></span>)}</div>
    <div className={styles.thanksStar}><FeedbackStar /></div>
    <h2>{t({ vi: 'Cảm ơn bạn đã góp ý!', en: 'Thank you for your feedback!' })}</h2>
    <p>{t({ vi: 'Đánh giá đã được lưu. Ý kiến của bạn giúp SciPal tốt hơn mỗi ngày.', en: 'Your review has been saved. Your suggestions help SciPal improve every day.' })}</p>
    <a href="#reviews" className={styles.reviewLink}>{t({ vi: 'Xem bảng đánh giá', en: 'View the reviews' })} ↓</a>
  </section>;
  return <form className={styles.form} onSubmit={send} aria-label={t({ vi: 'Đánh giá website', en: 'Website review' })}>
    <fieldset disabled={status === 'sending'}><legend><span>1</span>{t({ vi: 'Bạn hài lòng với SciPal ở mức nào?', en: 'How satisfied are you with SciPal?' })}</legend>
      <div className={styles.starChoices}>{[1, 2, 3, 4, 5].map(s => <label key={s} className={styles.starChoice}>
        <input type="radio" name={`${id}-rating`} value={s} required checked={rating === s} onChange={() => setRating(s)} aria-label={t({ vi: `${s} trên 5 sao`, en: `${s} out of 5 stars` })} />
        <span key={rating} className={s <= rating ? styles.chosenStar : ''} style={{ '--i': s } as CSSProperties}><FeedbackStar dim={s > rating} /></span>
      </label>)}</div>
      <p className={styles.ratingHint} aria-live="polite">{rating ? t(RATINGS[rating - 1]!) : t({ vi: '1 = Rất chưa hài lòng · 5 = Rất hài lòng', en: '1 = Very dissatisfied · 5 = Very satisfied' })}</p>
    </fieldset>
    <fieldset disabled={status === 'sending'}><legend><span>2</span>{t({ vi: 'Bạn thấy website có dễ sử dụng không?', en: 'How easy is the website to use?' })}</legend>
      <div className={styles.easeChoices}>{(Object.keys(EASE) as Array<keyof typeof EASE>).map(value => <label key={value}>
        <input type="radio" name={`${id}-ease`} value={value} required checked={ease === value} onChange={() => setEase(value)} />
        <span>{t(EASE[value])}</span></label>)}</div>
    </fieldset>
    <label className={styles.commentLabel} htmlFor={`${id}-comment`}><span className={styles.questionNumber}>3</span>{t({ vi: 'Bạn muốn SciPal cải thiện điều gì?', en: 'What could SciPal improve?' })}<small>{t({ vi: 'Không bắt buộc', en: 'Optional' })}</small></label>
    <textarea aria-label={t({ vi: 'Bạn muốn SciPal cải thiện điều gì?', en: 'What could SciPal improve?' })} id={`${id}-comment`} maxLength={500} rows={3} value={feedback} disabled={status === 'sending'} onChange={e => setFeedback(e.target.value)} placeholder={t({ vi: 'Ví dụ: tìm bài nhanh hơn, chữ dễ đọc hơn…', en: 'For example: faster search, more readable text…' })} />
    <p className={styles.counter}>{feedback.length} / 500</p>
    {status === 'error' && <Alert tone="danger">{t({ vi: 'Chưa gửi được đánh giá. Kiểm tra kết nối hoặc thử lại sau nhé.', en: 'Could not send your review. Check your connection or try again later.' })}</Alert>}
    <div className={styles.formFooter}><p>{t({ vi: 'Không cần đăng nhập. Đánh giá hiển thị công khai, ẩn danh; chỉ admin xem được tài khoản gửi.', en: 'No sign-in needed. Reviews are public and anonymous; only admins can see the sending account.' })}</p><Button type="submit" disabled={!rating || !ease || status === 'sending'}>{t(status === 'sending' ? { vi: 'Đang gửi…', en: 'Sending…' } : { vi: 'Gửi đánh giá', en: 'Send review' })}</Button></div>
  </form>;
}
