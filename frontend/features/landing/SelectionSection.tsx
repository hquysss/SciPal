'use client';

import { useRef } from 'react';
import { Bookmark, MousePointer2, Volume2 } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import { useInView } from './countUp';
import type { EducationLevel } from './educationLevel';
import styles from './sections.module.css';

type Copy = { en: string; vi: string };

/** A prepared lesson line with one term picked out, pitched per level; the card says it is an example. */
const EXAMPLES: Record<EducationLevel, { sentence: Record<keyof Copy, [string, string, string]>; term: Copy; definition: Copy }> = {
  primary: {
    sentence: {
      vi: ['Mỗi bức ảnh trên màn hình được ghép từ hàng triệu ', 'điểm ảnh', ' nhỏ.'],
      en: ['Every picture on a screen is built from millions of tiny ', 'pixels', '.'],
    },
    term: { vi: 'điểm ảnh', en: 'pixel' },
    definition: {
      vi: 'Điểm nhỏ nhất của một bức ảnh số, mỗi điểm mang một màu.',
      en: 'The smallest dot of a digital picture; each one holds a single colour.',
    },
  },
  lower_secondary: {
    sentence: {
      vi: ['Trong Python, ', 'biến', ' giống chiếc hộp có nhãn để cất một giá trị.'],
      en: ['In Python, a ', 'variable', ' is like a labelled box that holds one value.'],
    },
    term: { vi: 'biến', en: 'variable' },
    definition: {
      vi: 'Tên gọi gắn với một giá trị trong bộ nhớ; giá trị này có thể đổi khi chương trình chạy.',
      en: 'A name attached to a value in memory; the value can change while the program runs.',
    },
  },
  upper_secondary: {
    sentence: {
      vi: ['Với dãy đã sắp xếp, ', 'tìm kiếm nhị phân', ' loại một nửa số phần tử sau mỗi lần so sánh.'],
      en: ['On a sorted list, ', 'binary search', ' discards half of the items after every comparison.'],
    },
    term: { vi: 'tìm kiếm nhị phân', en: 'binary search' },
    definition: {
      vi: 'Thuật toán tìm phần tử bằng cách liên tục chia đôi khoảng còn phải xét.',
      en: 'An algorithm that finds an item by repeatedly halving the range left to check.',
    },
  },
};

const WAYS: Copy[] = [
  { en: 'Double-click', vi: 'Nhấp đúp' },
  { en: 'Long-press', vi: 'Nhấn giữ' },
  { en: 'Drag to select', vi: 'Kéo để chọn' },
];

/** Showcase of the lesson word lookup: select any word, get its Vietnamese–English card in place. */
export function SelectionSection({ level = 'upper_secondary' }: { level?: EducationLevel }) {
  const { t, lang } = useLanguage();
  const demoRef = useRef<HTMLDivElement>(null);
  const playing = useInView(demoRef);
  const example = EXAMPLES[level];
  const [before, picked, after] = example.sentence[lang];
  const other = lang === 'en' ? 'vi' : 'en';

  return (
    <section className={`${styles.section} ${styles.selectionSection}`} aria-labelledby="selection-title">
      <div className={styles.selectionStage} data-landing-reveal>
        <article className={styles.lessonCard} aria-label={t({ en: 'Example lesson', vi: 'Bài học mẫu' })}>
          <div className={styles.lessonDemo} ref={demoRef} data-playing={playing ? 'true' : 'false'}>
            <p className={styles.lessonText}>
              {before}
              <mark className={styles.pickedText}>
                {picked}
                <MousePointer2 className={styles.pointer} size={20} fill="currentColor" aria-hidden="true" />
              </mark>
              {after}
            </p>
            <div className={styles.lookupCard} role="note">
              <div className={styles.lookupHead}>
                <span className={styles.lookupName}>{example.term[lang]}</span>
                <span lang={other} className={styles.lookupOther}>{example.term[other]}</span>
                <Volume2 size={16} className={styles.lookupIcon} aria-hidden="true" />
                <Bookmark size={16} className={styles.lookupIcon} aria-hidden="true" />
              </div>
              <p className={styles.lookupDefinition}>{example.definition[lang]}</p>
            </div>
          </div>
          <p className={styles.tutorFooter}>{t({ en: 'Prepared example.', vi: 'Ví dụ mẫu được chuẩn bị sẵn.' })}</p>
        </article>
      </div>
      <div className={styles.tutorIntro} data-landing-reveal>
        <h2 id="selection-title" className={styles.sectionTitle}>
          {t({ en: 'Select a word, get its meaning', vi: 'Bôi đen một từ, hiểu ngay nghĩa' })}
        </h2>
        <p className={styles.sectionLead}>
          {t({
            en: 'Hit an unfamiliar term mid-lesson? Select it and a card with the Vietnamese and English meaning opens right there.',
            vi: 'Gặp từ lạ giữa bài học? Bôi đen là hiện ngay thẻ nghĩa Việt–Anh ngay tại chỗ, không phải rời trang.',
          })}
        </p>
        <ul className={styles.waysList}>
          {WAYS.map((way) => (
            <li key={way.en}>{t(way)}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
