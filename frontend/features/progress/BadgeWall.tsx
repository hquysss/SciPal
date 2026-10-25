'use client';

import { BadgeShowcase } from '../profile/BadgeShowcase';

/** The Progress page's badge collection: the same server list as the profile, with your progress. Nothing while it cannot load. */
export function BadgeWall() {
  return <BadgeShowcase userId="me" className="rounded-3xl border border-line bg-surface p-5 sm:p-6" />;
}
