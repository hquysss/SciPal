'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { REFERENCE_ANCHOR } from '@/features/glossary/ReferenceSources';
import { useLanguage } from '@scipal/hooks';
import styles from './sections.module.css';

type Copy = { en: string; vi: string };

export const FAQ: Array<{ q: Copy; a: Copy; link?: { href: string; label: Copy } }> = [
  {
    q: { vi: 'Học trên SciPal có mất phí không?', en: 'Does learning on SciPal cost anything?' },
    a: {
      vi: 'Mọi bài học đều miễn phí. Gói trả phí chỉ thêm lượt hỏi Giáo sư AI, chấm đề thi thử và công cụ cho giáo viên.',
      en: 'Every lesson is free. A paid plan only adds AI Professor questions, graded practice exams and teacher tools.',
    },
  },
  {
    q: { vi: 'Tôi có cần đăng nhập không?', en: 'Do I need to sign in?' },
    a: {
      vi: 'Bạn học thử được khi chưa đăng nhập. Đăng nhập để lưu tiến độ, điểm XP, tham gia lớp học và dùng đầy đủ các tính năng.',
      en: 'You can try lessons without signing in. Sign in to save progress and XP, join classes and use every feature.',
    },
  },
  {
    q: { vi: 'Hiện có những môn nào?', en: 'Which subjects are available now?' },
    a: {
      vi: 'Hiện mở cấp THPT, bắt đầu với Tin học. Môn nào chưa có bài sẽ hiện “Đang biên soạn”.',
      en: 'Upper secondary is open now, starting with Informatics. Subjects without lessons show “In preparation”.',
    },
  },
  {
    q: { vi: 'Bài học có theo chương trình GDPT 2018 không?', en: 'Do the lessons follow the 2018 national curriculum?' },
    a: {
      vi: 'Có. Mỗi bài bám sát Chương trình GDPT 2018, kèm thuật ngữ và lời giải thích bằng cả tiếng Việt lẫn tiếng Anh.',
      en: 'Yes. Every lesson follows Vietnam’s 2018 curriculum, with each term and explanation in both Vietnamese and English.',
    },
  },
  {
    q: { vi: 'Thuật ngữ trên SciPal lấy từ đâu?', en: 'Where do the terms on SciPal come from?' },
    a: {
      vi: 'Thuật ngữ được đối chiếu với bộ Từ điển Anh – Việt Khoa học Tự nhiên của Trường Đại học Khoa học Tự nhiên, Đại học Quốc gia Hà Nội (Nhà xuất bản Giáo dục).',
      en: 'Terms are checked against the English–Vietnamese Dictionary of Natural Sciences by VNU University of Science, Hanoi (Vietnam Education Publishing House).',
    },
    link: { href: `/glossary#${REFERENCE_ANCHOR}`, label: { vi: 'Xem nguồn tham khảo', en: 'See the references' } },
  },
  {
    q: { vi: 'Giáo sư AI trả lời như thế nào?', en: 'How does the AI Professor answer?' },
    a: {
      vi: 'Giáo sư AI gợi ý từng bước để bạn tự tìm ra lời giải, thay vì đưa đáp án ngay. Số lượt hỏi phụ thuộc vào gói của bạn.',
      en: 'AI Professor gives step-by-step hints so you work out the answer yourself instead of handing it over. How many questions you can ask depends on your plan.',
    },
  },
  {
    q: { vi: 'Tôi dùng SciPal như một ứng dụng được không?', en: 'Can I use SciPal like an app?' },
    a: {
      vi: 'Được. Bạn cài SciPal về điện thoại hoặc máy tính, và bài đã mở hoặc đã tải về vẫn đọc được khi mất mạng.',
      en: 'Yes. Install SciPal on your phone or computer, and lessons you opened or saved still read offline.',
    },
  },
];

/** Plain `<details>` list: keyboard and screen reader behaviour come from the browser. */
export function FaqSection() {
  const { t } = useLanguage();
  return (
    <section className={styles.section} id="hoi-dap" aria-labelledby="faq-title">
      <h2 id="faq-title" className={styles.sectionTitle} data-landing-reveal>
        {t({ en: 'Questions, answered', vi: 'Câu hỏi thường gặp' })}
      </h2>
      <div className={styles.faqList} data-landing-reveal>
        {FAQ.map(({ q, a, link }) => (
          <details key={q.en} className={styles.faqItem}>
            <summary className={styles.faqQuestion}>
              <span>{t(q)}</span>
              <ChevronDown size={20} aria-hidden="true" />
            </summary>
            <p className={styles.faqAnswer}>
              {t(a)}
              {link && (
                <>
                  {' '}
                  <Link href={link.href} className={styles.faqLink}>
                    {t(link.label)}
                  </Link>
                </>
              )}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
