import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react';

type Bilingual = { vi: string; en: string };
export type AnnouncementTone = 'info' | 'good' | 'warn' | 'urgent';

/** `bar` colours a decorative edge only (tokens, readable in both themes); the label and icon carry the meaning. */
export const TONES: Record<AnnouncementTone, { label: Bilingual; icon: LucideIcon; bar: string; chip: string }> = {
  info: { label: { vi: 'Thông tin', en: 'Info' }, icon: Info, bar: 'border-sky', chip: 'bg-sky' },
  good: { label: { vi: 'Tin vui', en: 'Good news' }, icon: CircleCheck, bar: 'border-success', chip: 'bg-success' },
  warn: { label: { vi: 'Lưu ý', en: 'Heads up' }, icon: TriangleAlert, bar: 'border-warning', chip: 'bg-warning' },
  urgent: { label: { vi: 'Khẩn', en: 'Urgent' }, icon: CircleAlert, bar: 'border-danger', chip: 'bg-danger' },
};
export const TONE_ORDER: AnnouncementTone[] = ['info', 'good', 'warn', 'urgent'];

/** The tone of a bell notice: only the coloured announcements (`announcement:warn`) have one; the plain `announcement` and every other kind keep their usual look. */
export function toneOfKind(kind: string): AnnouncementTone | null {
  const [base, tone] = kind.split(':');
  return base === 'announcement' && tone && tone in TONES ? (tone as AnnouncementTone) : null;
}
