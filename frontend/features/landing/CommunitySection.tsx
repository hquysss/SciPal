'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ArrowRight, BellRing, MessageCircle, MessagesSquare, ShieldCheck, Trophy, Users, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@scipal/hooks';
import roleColors from '@/components/ui/roleColors.module.css';
import unread from '../community/unread.module.css';
import sections from './sections.module.css';
import styles from './community.module.css';

type Copy = { en: string; vi: string };

const POINTS: Array<{ Icon: LucideIcon; title: Copy; text: Copy }> = [
  {
    Icon: Users,
    title: { vi: 'Phòng theo khối và theo lớp', en: 'Rooms by grade and class' },
    text: { vi: 'Hỏi bài cùng các bạn khối 10, 11, 12, hoặc trao đổi riêng trong lớp với thầy cô.', en: 'Ask your grade 10, 11 or 12 peers, or talk with your teacher inside your class.' },
  },
  {
    Icon: MessageCircle,
    title: { vi: 'Kết bạn và nhắn riêng', en: 'Friends and direct messages' },
    text: { vi: 'Kết bạn từ hồ sơ hoặc ngay trong phòng chat, gửi tin và ảnh cho nhau.', en: 'Add friends from a profile or right in a room, and send messages and pictures.' },
  },
  {
    Icon: BellRing,
    title: { vi: 'Không bỏ lỡ tin mới', en: 'Never miss a message' },
    text: { vi: 'Số tin chưa đọc hiện trên thanh điều hướng và bong bóng chat, kèm thông báo có âm thanh.', en: 'Unread counts on the navigation bar and the chat bubble, with a pop-up and a chime.' },
  },
  {
    Icon: Trophy,
    title: { vi: 'Đua top, thành Thủ khoa tuần', en: 'Race for Top of the week' },
    text: { vi: 'Hồ sơ có vai trò, thứ hạng XP và cúp cho người dẫn đầu bảng xếp hạng tuần.', en: 'Profiles show the role, the XP rank and a trophy for the weekly leader.' },
  },
  {
    Icon: ShieldCheck,
    title: { vi: 'An toàn cho học sinh', en: 'Safe for students' },
    text: { vi: 'Lọc từ ngữ, chặn người làm phiền và báo cáo tin nhắn để admin xem xét.', en: 'Word filter, blocking, and message reports reviewed by an admin.' },
  },
];

/** Introduces the community: what it offers, beside a still picture of the messenger with unread counts and a pop-up. */
export function CommunitySection() {
  const { t } = useLanguage();
  const rooms: Array<{ label: string; name: Copy; count: number; tone: string; active?: boolean }> = [
    { label: '11', name: { vi: 'Khối 11', en: 'Grade 11' }, count: 0, tone: '--sky', active: true },
    { label: 'TC', name: { vi: 'Tất cả', en: 'Everyone' }, count: 12, tone: '--action' },
    { label: '11A', name: { vi: 'Lớp 11A2', en: 'Class 11A2' }, count: 3, tone: '--success' },
    { label: 'M', name: { vi: 'Minh Anh', en: 'Minh Anh' }, count: 1, tone: '--coral' },
  ];

  return (
    <section className={`${sections.section} ${styles.section}`} aria-labelledby="community-title">
      <div className={styles.stage} data-landing-reveal>
        <p className="sr-only">{t({ en: 'Example of the community chat.', vi: 'Hình minh họa phòng chat cộng đồng.' })}</p>
        <div className={styles.demo} aria-hidden="true">
          <div className={styles.list}>
            <span className={styles.listTitle}>{t({ en: 'Messages', vi: 'Tin nhắn' })}</span>
            {rooms.map((r) => (
              <span key={r.label} className={`${styles.row} ${r.active ? styles.rowActive : ''}`}>
                <span className={styles.room} style={{ '--tone': `var(${r.tone})` } as CSSProperties}>{r.label}</span>
                <span className={`${styles.rowName} ${r.count ? styles.rowNameUnread : ''}`}>{t(r.name)}</span>
                {r.count > 0 ? <span className={`${styles.count} ${unread.badge}`}>{r.count}</span> : <span />}
              </span>
            ))}
          </div>
          <div className={styles.chat}>
            <div className={styles.chatHead}>
              <span className={styles.room} style={{ '--tone': 'var(--sky)' } as CSSProperties}><MessagesSquare size={14} /></span>
              <span>
                <span className={styles.chatTitle}>{t({ en: 'Grade 11', vi: 'Khối 11' })}</span>
                <span className={`${styles.chatSub} block`}>{t({ en: 'Students in grade 11', vi: 'Học sinh khối 11' })}</span>
              </span>
            </div>
            <div className={styles.log}>
              <div className={styles.msg}>
                <span className={styles.avatar}>H</span>
                <span>
                  <span className={styles.who}>{t({ en: 'Huy', vi: 'Huy' })}</span>
                  <span className={styles.bubble}>{t({ en: 'How do I balance this redox equation?', vi: 'Cân bằng phương trình oxi hóa khử này kiểu gì nhỉ?' })}</span>
                </span>
              </div>
              <div className={styles.msg}>
                <span className={styles.avatar}>L</span>
                <span>
                  <span className={styles.who}>
                    {t({ en: 'Ms Lan', vi: 'Cô Lan' })}
                    <span className={`${styles.role} ${roleColors.teacher}`}>{t({ en: 'Teacher', vi: 'Giáo viên' })}</span>
                  </span>
                  <span className={styles.bubble}>{t({ en: 'Start with the electrons each atom gives or takes.', vi: 'Em viết số electron cho và nhận của từng nguyên tử trước nhé.' })}</span>
                  <span className={styles.reactions}>👍 ❤️</span>
                </span>
              </div>
              <div className={`${styles.msg} ${styles.msgMine}`}>
                <span className={`${styles.bubble} ${styles.bubbleMine}`}>{t({ en: 'Got it, thank you!', vi: 'Em hiểu rồi, cảm ơn cô!' })}</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.toast} aria-hidden="true">
          <span className={styles.toastIcon}><MessageCircle size={16} /></span>
          <span className="min-w-0">
            <span className={styles.toastTitle}>Minh Anh</span>
            <span className={styles.toastText}>{t({ en: 'Shall we do the mock exam tonight?', vi: 'Tối nay luyện đề thi thử cùng không?' })}</span>
          </span>
        </div>
      </div>

      <div className={styles.intro} data-landing-reveal>
        <h2 id="community-title" className={sections.sectionTitle}>
          {t({ en: 'Learn together', vi: 'Học cùng nhau' })}
        </h2>
        <p className={sections.sectionLead}>
          {t({ en: 'A community for students and teachers: ask, explain and keep each other going.', vi: 'Cộng đồng của học sinh và thầy cô: hỏi bài, giảng cho nhau và cùng giữ chuỗi học.' })}
        </p>
        <ul className={styles.points}>
          {POINTS.map(({ Icon, title, text }) => (
            <li key={title.en} className={styles.point}>
              <span className={styles.pointIcon} aria-hidden="true"><Icon size={18} /></span>
              <span>
                <span className={styles.pointTitle}>{t(title)}</span>
                <span className={styles.pointText}>{t(text)}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link prefetch={false} href="/community" className={sections.primaryAction}>
          {t({ en: 'Join the community', vi: 'Vào cộng đồng' })}
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
