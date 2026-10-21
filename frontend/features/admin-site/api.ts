import { authoringCall } from '../authoring/apiClient';
import type { SiteFeature, SiteSettings } from '@/lib/siteSettings';

// Admin site switches (backend/src/routes/siteSettings.ts).
export const getSiteSettings = () => authoringCall<SiteSettings>('/api/admin/site-settings', 'GET');
export const saveSiteSettings = (input: {
  signup_enabled: boolean;
  maintenance: boolean;
  free_access: boolean;
  sales_open: boolean;
  sales_note: { vi: string; en: string };
  features: Record<SiteFeature, boolean>;
}) =>
  authoringCall<SiteSettings>('/api/admin/site-settings', 'PATCH', input);
