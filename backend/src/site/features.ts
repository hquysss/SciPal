// Site switches (migration 20261003070000_site_settings.sql): sign-up open or closed, and which
// features are on. A feature missing from the stored map is on, so a new feature needs no data.

export const SITE_FEATURES = ['glossary', 'exam', 'pricing', 'classes', 'tutor'] as const;
export type SiteFeature = (typeof SITE_FEATURES)[number];

export interface SiteSettingsRow {
  signup_enabled: boolean | null;
  features: Record<string, unknown> | null;
  maintenance?: boolean | null;
  free_access?: boolean | null;
  sales_open?: boolean | null;
  sales_note?: Record<string, unknown> | null;
}

export interface SiteSettings {
  signupEnabled: boolean;
  /** The whole site is closed to everyone but admins. */
  maintenance: boolean;
  /** Paid features that call no AI are free for every signed-in account (the quotas live in SQL). */
  freeAccess: boolean;
  /** Plans may be bought; while false they stay visible and the backend refuses new orders. */
  salesOpen: boolean;
  /** What the admin says under the "coming soon" button; empty means the default wording. */
  salesNote: { en: string; vi: string };
  features: Record<SiteFeature, boolean>;
}

const noteText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

export function resolveSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  const stored = row?.features ?? {};
  const features = Object.fromEntries(SITE_FEATURES.map((f) => [f, stored[f] !== false])) as Record<SiteFeature, boolean>;
  return {
    signupEnabled: row?.signup_enabled !== false,
    maintenance: row?.maintenance === true,
    freeAccess: row?.free_access === true,
    // Closed unless an admin opened it: an unreadable row must not let anyone buy.
    salesOpen: row?.sales_open === true,
    salesNote: { en: noteText(row?.sales_note?.en), vi: noteText(row?.sales_note?.vi) },
    features,
  };
}

/** The bilingual refusal when new orders are closed. */
export const salesClosed = {
  code: 'SALES_CLOSED',
  error: 'SciPal chưa mở bán gói. Bạn quay lại sau nhé.',
  error_en: 'Plans are not on sale yet. Please come back later.',
};

/** The bilingual refusal when a feature is off. */
export const featureOff = (code: SiteFeature) => ({
  code: 'FEATURE_OFF',
  feature: code,
  error: 'Tính năng này đang bảo trì. Bạn quay lại sau nhé.',
  error_en: 'This feature is under maintenance. Please come back later.',
});

type Guarded = {
  siteSettings?: { get(): Promise<SiteSettings> };
};

/**
 * Whether a request may use `feature`: on, or the caller is an admin (who may check a feature while
 * it is off for everyone else).
 */
export async function featureAllowed(app: Guarded, feature: SiteFeature, user?: { app_metadata?: { app_role?: string } }): Promise<boolean> {
  if (user?.app_metadata?.app_role === 'admin') return true;
  const settings = app.siteSettings ? await app.siteSettings.get() : null;
  return settings ? settings.features[feature] : true;
}

/** Whether a request may start a purchase: sales are open, or the caller is an admin (to test checkout). */
export async function salesAllowed(app: Guarded, user?: { app_metadata?: { app_role?: string } }): Promise<boolean> {
  if (user?.app_metadata?.app_role === 'admin') return true;
  const settings = app.siteSettings ? await app.siteSettings.get() : null;
  return settings ? settings.salesOpen : true;
}
