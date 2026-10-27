import { Megaphone, PartyPopper, Siren, TriangleAlert, type LucideIcon } from 'lucide-react';

type Bilingual = { vi: string; en: string };
export type AnnouncementTone = 'info' | 'good' | 'warn' | 'urgent';

/** `bar` colours a decorative edge only and `color` feeds `--tone` for tints (tokens, readable in both themes); the label and icon carry the meaning. */
export const TONES: Record<AnnouncementTone, { label: Bilingual; icon: LucideIcon; bar: string; chip: string; color: string }> = {
  info: { label: { vi: 'Thông tin', en: 'Info' }, icon: Megaphone, bar: 'border-sky', chip: 'bg-sky', color: 'var(--sky)' },
  good: { label: { vi: 'Tin vui', en: 'Good news' }, icon: PartyPopper, bar: 'border-success', chip: 'bg-success', color: 'var(--success)' },
  warn: { label: { vi: 'Lưu ý', en: 'Heads up' }, icon: TriangleAlert, bar: 'border-warning', chip: 'bg-warning', color: 'var(--warning)' },
  urgent: { label: { vi: 'Khẩn', en: 'Urgent' }, icon: Siren, bar: 'border-danger', chip: 'bg-danger', color: 'var(--danger)' },
};
export const TONE_ORDER: AnnouncementTone[] = ['info', 'good', 'warn', 'urgent'];

/** The tone of a bell notice: only the coloured announcements (`announcement:warn`) have one; the plain `announcement` and every other kind keep their usual look. */
export function toneOfKind(kind: string): AnnouncementTone | null {
  const [base, tone] = kind.split(':');
  return base === 'announcement' && tone && tone in TONES ? (tone as AnnouncementTone) : null;
}
