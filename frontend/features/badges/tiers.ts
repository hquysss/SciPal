import type { NewBadge } from '@scipal/types';

type Bilingual = { en: string; vi: string };

export const TIER_TEXT: Record<NewBadge['tier'], Bilingual> = {
  bronze: { en: 'Bronze', vi: 'Hạng Đồng' },
  silver: { en: 'Silver', vi: 'Hạng Bạc' },
  gold: { en: 'Gold', vi: 'Hạng Vàng' },
  platinum: { en: 'Platinum', vi: 'Hạng Bạch kim' },
  special: { en: 'Honor', vi: 'Danh dự' },
};

export const CATEGORY_TEXT: Record<string, Bilingual> = {
  learning: { en: 'Learning', vi: 'Học tập' },
  streak: { en: 'Streak', vi: 'Chuỗi ngày' },
  exam: { en: 'Exams', vi: 'Thi thử' },
  excellence: { en: 'Excellence', vi: 'Xuất sắc' },
  community: { en: 'Community', vi: 'Cộng đồng' },
  honor: { en: 'Honor', vi: 'Danh dự' },
};
