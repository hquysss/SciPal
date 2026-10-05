// Site switches set by admins at /admin/site (table site_settings, migration 20261003070000; the
// backend's backend/src/site/features.ts holds the same list). Everyone may read them: the web hides
// what is off, and the backend refuses it. A feature missing from the stored map is on.

export const SITE_FEATURES = ['glossary', 'exam', 'pricing', 'classes', 'tutor', 'guest_trial'] as const;
export type SiteFeature = (typeof SITE_FEATURES)[number];
export type SiteSettings = { signupEnabled: boolean; maintenance: boolean; features: Record<SiteFeature, boolean> };

export const ALL_ON: SiteSettings = {
  signupEnabled: true,
  maintenance: false,
  features: { glossary: true, exam: true, pricing: true, classes: true, tutor: true, guest_trial: true },
};

export function resolveSiteSettings(row: { signup_enabled?: unknown; features?: unknown; maintenance?: unknown } | null | undefined): SiteSettings {
  const stored = row?.features && typeof row.features === 'object' ? (row.features as Record<string, unknown>) : {};
  const features = Object.fromEntries(SITE_FEATURES.map((f) => [f, stored[f] !== false])) as Record<SiteFeature, boolean>;
  return { signupEnabled: row?.signup_enabled !== false, maintenance: row?.maintenance === true, features };
}

const under = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

/** The feature a page belongs to, if a switch guards it. */
export function featureOfPath(pathname: string): SiteFeature | null {
  if (under(pathname, '/glossary')) return 'glossary';
  if (under(pathname, '/exam')) return 'exam';
  if (under(pathname, '/pricing') || under(pathname, '/checkout')) return 'pricing';
  if (under(pathname, '/classes') || under(pathname, '/teacher/classes')) return 'classes';
  if (under(pathname, '/tutor')) return 'tutor';
  return null;
}

/** Whether `role` may see `feature` now: it is on, or the viewer is an admin. */
export const featureVisible = (settings: SiteSettings, feature: SiteFeature | null, role: string | null | undefined) =>
  feature === null || role === 'admin' || settings.features[feature];

export const FEATURE_LABEL: Record<SiteFeature, { vi: string; en: string }> = {
  glossary: { vi: 'Từ điển', en: 'Glossary' },
  exam: { vi: 'Thi thử', en: 'Exams' },
  pricing: { vi: 'Bảng giá và thanh toán', en: 'Pricing and payments' },
  classes: { vi: 'Lớp học', en: 'Classes' },
  tutor: { vi: 'Giáo sư SciPal', en: 'SciPal Professor' },
  guest_trial: { vi: 'Dùng thử cho khách', en: 'Guest trials' },
};

const COLUMNS = 'signup_enabled,features,maintenance';

/** The switches, read with the public key (server or edge); everything on when they cannot be read. */
export async function fetchSiteSettings(): Promise<SiteSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return ALL_ON;
  try {
    const res = await fetch(`${url}/rest/v1/site_settings?id=eq.1&select=${COLUMNS}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2000),
      next: { revalidate: 30 },
    } as RequestInit);
    if (!res.ok) return ALL_ON;
    const rows = (await res.json()) as unknown[];
    return resolveSiteSettings(Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : null);
  } catch {
    return ALL_ON;
  }
}
