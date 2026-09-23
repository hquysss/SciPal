/**
 * SciPal Mascot Configuration
 * ============================================================
 * Bạn có thể dễ dàng chỉnh sửa nội dung tin nhắn song ngữ (VI/EN),
 * thay đổi nhân vật mascot (nhà khoa học, cú mèo, robot bánh răng)
 * hoặc tùy chỉnh thời gian hiển thị bong bóng chat tại đây.
 * ============================================================
 */

export type MascotCharacter = 'scientist' | 'owl' | 'gearbot';

export interface MascotCharacterAssets {
  name: string;
  label: {
    vi: string;
    en: string;
  };
  directions: string;
  reactions: string;
}

export const MASCOT_CHARACTERS: Record<MascotCharacter, MascotCharacterAssets> = {
  scientist: {
    name: 'scientist',
    label: {
      vi: 'Tiến sĩ Chibi SciPal',
      en: 'SciPal Chibi Scientist',
    },
    directions: '/mascots/scientist-directions.webp',
    reactions: '/mascots/scientist-reactions.webp',
  },
  owl: {
    name: 'owl',
    label: {
      vi: 'Cú Mèo Tri thức SciPal',
      en: 'SciPal Knowledge Owl',
    },
    directions: '/mascots/owl-directions.webp',
    reactions: '/mascots/owl-reactions.webp',
  },
  gearbot: {
    name: 'gearbot',
    label: {
      vi: 'Robot Trợ lý Tin học',
      en: 'Informatics Assistant Robot',
    },
    directions: '/mascots/gearbot-directions.webp',
    reactions: '/mascots/gearbot-reactions.webp',
  },
};

/**
 * Danh sách câu thoại / lời nhắn song ngữ của Mascot
 * Chỉnh sửa hoặc thêm bớt các câu thoại tùy thích bên dưới!
 */
export const SCIPAL_MASCOT_MESSAGES = {
  vi: [
    'Chào mừng bạn đến với phòng Lab Khoa học Tự nhiên SciPal! 🍀✨',
    'Cùng khám phá Tin học và KHTN song ngữ: code chuẩn, lý thuyết sâu! 💻🔬',
    'Học mỗi ngày một thuật ngữ để nhớ thật lâu và hiểu bản chất! 💡',
    'Từ đệ quy, cây nhị phân đến bảng tuần hoàn — SciPal đồng hành cùng bạn! 🧬⚡',
    'Chạm vào tớ thêm lần nữa để nhận thêm mẹo học hay nhé! 🌟',
    'Chúc bạn một buổi học tràn đầy cảm hứng và đạt điểm số tối đa! 📚🎯',
  ],
  en: [
    'Welcome to the SciPal Natural Sciences & Informatics Lab! 🍀✨',
    'Explore bilingual sciences: clean code, rigorous theory! 💻🔬',
    'Master one scientific term a day for deep retention and mastery! 💡',
    'From recursion and binary trees to periodic tables — SciPal is with you! 🧬⚡',
    'Boop me again for another study tip or encouraging thought! 🌟',
    'Wishing you an inspiring session and top academic results! 📚🎯',
  ],
};

export const SCIPAL_MASCOT_CONFIG = {
  /** Nhân vật mặc định: 'scientist' | 'owl' | 'gearbot' */
  defaultCharacter: 'scientist' as MascotCharacter,
  /** Kích thước mascot mặc định (px) */
  defaultSize: 92,
  /** Thời gian tự động ẩn bong bóng thoại (ms) */
  bubbleAutoCloseMs: 6000,
  /** Danh sách câu thoại */
  messages: SCIPAL_MASCOT_MESSAGES,
};
