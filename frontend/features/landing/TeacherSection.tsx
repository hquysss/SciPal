'use client';

import Link from 'next/link';
import { ArrowRight, BookA, ClipboardList, FileUp, School, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import styles from './teacher.module.css';

// What a teacher gets, for visitors who teach. Only what the teacher pages already do; a new
// account starts as a student and asks to become a teacher from the Profile.

type Copy = { en: string; vi: string };
const FEATURES: Array<{ Icon: LucideIcon; title: Copy; text: Copy }> = [
  {
    Icon: School,
    title: { en: 'Classes with a join code', vi: 'Lớp học bằng mã mời' },
    text: { en: 'Open a class and share a 6-character code; students join in one step.', vi: 'Mở lớp và gửi mã 6 ký tự; học sinh vào lớp chỉ với một bước.' },
  },
  {
    Icon: ClipboardList,
    title: { en: 'Set work, see who has done it', vi: 'Giao bài, biết em nào đã làm' },
    text: { en: 'Assign a lesson or an exam with a due date and follow how many have finished.', vi: 'Giao bài học hoặc đề thi kèm hạn nộp, theo dõi bao nhiêu em đã hoàn thành.' },
  },
  {
    Icon: FileUp,
    title: { en: 'Bring your own material', vi: 'Đưa tài liệu sẵn có vào' },
    text: { en: 'Import lessons from Word or PDF and exams from Excel, then edit both languages.', vi: 'Nhập bài từ Word hoặc PDF, đề thi từ Excel, rồi chỉnh cả hai ngôn ngữ.' },
  },
  {
    Icon: BookA,
    title: { en: 'Grow the glossary', vi: 'Góp thuật ngữ cho từ điển' },
    text: { en: 'Add terms one by one or a whole spreadsheet at once; an admin reviews them.', vi: 'Thêm từng thuật ngữ hoặc cả bảng Excel một lượt; admin duyệt trước khi hiện.' },
  },
];

export function TeacherSection() {
  const { t } = useLanguage();
  return (
    <section className={styles.teacher} aria-labelledby="teacher-title">
      <div className={styles.intro} data-landing-reveal>
        <p className={styles.eyebrow}>{t({ en: 'For teachers', vi: 'Dành cho giáo viên' })}</p>
        <h2 id="teacher-title" className={styles.title}>
          {t({ en: 'Teach with the same lessons your students read', vi: 'Dạy trên chính bài học học sinh đang đọc' })}
        </h2>
        <p className={styles.lead}>
          {t({
            en: 'Create an account, then ask to become a teacher from your Profile. Classes and imports are free to start.',
            vi: 'Tạo tài khoản, rồi gửi yêu cầu làm giáo viên ở trang Hồ sơ. Mở lớp và nhập tài liệu đều bắt đầu miễn phí.',
          })}
        </p>
        <div className={styles.actions}>
          <Link href="/login?mode=signup&redirect=%2Fprofile" className={styles.primary}>
            {t({ en: 'Create a teacher account', vi: 'Tạo tài khoản giáo viên' })}
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/pricing" className={styles.secondary}>
            {t({ en: 'Teacher plans', vi: 'Xem gói Giáo viên' })}
          </Link>
        </div>
      </div>
      <ul className={styles.features} data-landing-reveal>
        {FEATURES.map(({ Icon, title, text }) => (
          <li key={title.en} className={styles.feature}>
            <Icon aria-hidden="true" size={22} strokeWidth={1.75} className={styles.icon} />
            <div>
              <h3 className={styles.featureTitle}>{t(title)}</h3>
              <p className={styles.featureText}>{t(text)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
