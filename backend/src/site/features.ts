// Site switches (migration 20261003070000_site_settings.sql): sign-up open or closed, and which
// features are on. A feature missing from the stored map is on, so a new feature needs no data.

export const SITE_FEATURES = ['glossary', 'exam', 'pricing', 'classes', 'tutor', 'guest_trial'] as const;
export type SiteFeature = (typeof SITE_FEATURES)[number];

export interface SiteSettingsRow {
  signup_enabled: boolean | null;
  features: Record<string, unknown> | null;
  maintenance?: boolean | null;
}

export interface SiteSettings {
  signupEnabled: boolean;
  /** The whole site is closed to everyone but admins. */
  maintenance: boolean;
  features: Record<SiteFeature, boolean>;
}

export function resolveSiteSettings(row: SiteSettingsRow | null): SiteSettings {
  const stored = row?.features ?? {};
  const features = Object.fromEntries(SITE_FEATURES.map((f) => [f, stored[f] !== false])) as Record<SiteFeature, boolean>;
  return { signupEnabled: row?.signup_enabled !== false, maintenance: row?.maintenance === true, features };
}

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
